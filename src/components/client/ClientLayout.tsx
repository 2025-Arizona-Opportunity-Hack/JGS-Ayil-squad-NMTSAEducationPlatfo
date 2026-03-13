import { useState, useRef, useEffect } from "react";
import { useOutlet, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ClientHeader } from "./ClientHeader";
import { BottomNav } from "./BottomNav";
import { MoreDrawer } from "./MoreDrawer";
import { SkipToContent } from "../SkipToContent";
import { ProfileEditModal } from "../ProfileEditModal";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";

export function ClientLayout() {
  const [moreOpen, setMoreOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const mainRef = useRef<HTMLElement>(null);
  const location = useLocation();
  const outlet = useOutlet();
  const shouldReduceMotion = useReducedMotion();
  const userProfile = useQuery(api.users.getCurrentUserProfile);

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
    <div className="min-h-screen bg-client-surface text-client-text">
      <SkipToContent />
      <ClientHeader onProfileClick={() => setProfileOpen(true)} />

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
      <MoreDrawer open={moreOpen} onOpenChange={setMoreOpen} />

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
    </div>
  );
}
