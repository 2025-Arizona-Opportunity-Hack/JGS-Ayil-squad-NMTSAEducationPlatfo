import { useState, useRef, useEffect, useMemo } from "react";
import { useOutlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ClientHeader } from "./ClientHeader";
import { BottomNav } from "./BottomNav";
import { MoreDrawer } from "./MoreDrawer";
import { SkipToContent } from "../SkipToContent";
import { ProfileEditModal } from "../ProfileEditModal";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { getGuidesFor } from "../guides/guideContent";
import { useGuides } from "../guides/useGuides";
import { GuidesLauncher } from "../guides/GuidesLauncher";
import { WrittenGuide } from "../guides/WrittenGuide";
import { GuidedTour } from "../guides/GuidedTour";
import { TourActiveProvider } from "../guides/TourActiveContext";
import { ClientHelpPrompt } from "../guides/ClientHelpPrompt";

export function ClientLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const outlet = useOutlet();
  const shouldReduceMotion = useReducedMotion();
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  const clientGuides = useMemo(
    () => getGuidesFor("client", userProfile?.effectivePermissions),
    [userProfile?.effectivePermissions],
  );
  const guides = useGuides(clientGuides);

  // Focus management: move focus to main content on route change
  useEffect(() => {
    const heading = mainRef.current?.querySelector("h1");
    if (heading instanceof HTMLElement) {
      heading.setAttribute("tabindex", "-1");
      heading.focus({ preventScroll: true });
    } else {
      mainRef.current?.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  return (
    /* Forward-looking: nothing in the client portal consumes this yet — its
       only consumers today are admin surfaces. It is here so client-side
       modals and popovers can opt into tour-aware behaviour (standing aside
       while a tour runs) without rewiring the shell. Additive by design; not
       dead code. */
    <TourActiveProvider active={guides.tourGuide !== null}>
    <div className="min-h-screen bg-client-surface text-client-text">
      <SkipToContent />
      <ClientHeader
        onProfileClick={() => setProfileOpen(true)}
        onHelpClick={guides.openLauncher}
      />

      <main
        ref={mainRef}
        id="main-content"
        tabIndex={-1}
        className="pb-20 md:pb-6 px-4 md:px-6 lg:px-8 max-w-7xl mx-auto py-6 outline-none"
      >
        <motion.div
          key={location.pathname}
          initial={shouldReduceMotion ? false : { opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.15 }}
        >
          {outlet}
        </motion.div>
      </main>

      <BottomNav onMoreClick={() => setMoreOpen(true)} />
      <MoreDrawer
        open={moreOpen}
        onOpenChange={setMoreOpen}
        onHelpClick={guides.openLauncher}
      />

      {userProfile && (
        <ProfileEditModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
          onProfileUpdated={() => {}}
          currentProfile={{
            firstName: userProfile.firstName,
            lastName: userProfile.lastName,
            profilePictureId: userProfile.profilePictureId,
            profilePictureUrl: userProfile.profilePictureUrl || undefined,
          }}
        />
      )}

      <GuidesLauncher
        guides={clientGuides}
        open={guides.launcherOpen}
        onClose={guides.closeLauncher}
        onReadSteps={guides.readSteps}
        onStartTour={guides.startTour}
      />
      <WrittenGuide
        guide={guides.writtenGuide}
        open={guides.writtenGuide !== null}
        onClose={guides.closeWritten}
        onStartTour={
          guides.writtenGuide && guides.writtenGuide.tourStops.length > 0
            ? () => guides.startTour(guides.writtenGuide!.id)
            : undefined
        }
      />
      {guides.tourGuide && (
        <GuidedTour stops={guides.tourGuide.tourStops} onClose={guides.closeTour} />
      )}
      {userProfile && (
        <ClientHelpPrompt
          userId={userProfile._id}
          onOpenGuides={guides.openLauncher}
          guidesOpened={guides.launcherOpen}
        />
      )}
    </div>
    </TourActiveProvider>
  );
}
