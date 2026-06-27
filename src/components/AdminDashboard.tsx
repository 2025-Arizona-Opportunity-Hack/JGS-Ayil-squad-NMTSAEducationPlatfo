import { useState, useEffect } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserManager } from "./UserManager";
import { UserGroupManager } from "./UserGroupManager";
import { ContentManager } from "./ContentManager";
import { ContentGroupManager } from "./ContentGroupManager";
import { ShareLinksManager } from "./ShareLinksManager";
import { InviteCodeModal } from "./InviteCodeModal";
import { ClientInviteModal } from "./ClientInviteModal";
import { AnalyticsDashboard } from "./admin/AnalyticsDashboard";
import { AdminOrders } from "./admin/AdminOrders";
import { ArchivedContent } from "./admin/ArchivedContent";
import { SiteSettings } from "./admin/SiteSettings";
import { PurchaseRequests } from "./admin/PurchaseRequests";
import { JoinRequests } from "./admin/JoinRequests";
import { DebugTools } from "./admin/DebugTools";
import { AdminLayout } from "./admin/AdminLayout";
import { OnboardingTour } from "./setup/OnboardingTour";
import { useGuides } from "./guides/useGuides";
import { GuidesLauncher } from "./guides/GuidesLauncher";
import { WrittenGuide } from "./guides/WrittenGuide";
import { GuidedTour } from "./guides/GuidedTour";
import { NewStaffPrompt } from "./guides/NewStaffPrompt";
import { TourActiveProvider } from "./guides/TourActiveContext";
import { GuideDemoHost } from "./guides/GuideDemoHost";
import { Button } from "@/components/ui/button";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";
import { resolveAdminTab } from "@/lib/adminTabs";

export function AdminDashboard() {
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [clientInviteModalOpen, setClientInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("adminDashboardTab") || "content";
  });

  const guides = useGuides();

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem("adminDashboardTab", value);
  };

  // Close the tour and, on the next tick (after the tour overlay unmounts),
  // close any modal the tour opened by sending Escape to the top dialog layer.
  const handleTourClose = () => {
    guides.closeTour();
    requestAnimationFrame(() => {
      document.dispatchEvent(
        new KeyboardEvent("keydown", { key: "Escape", bubbles: true })
      );
    });
  };

  // The persisted tab is shared across all users on this browser. Once the
  // profile loads, drop back to an accessible tab if the stored one needs a
  // permission this user lacks (otherwise the panel renders empty).
  useEffect(() => {
    if (!userProfile) return;
    const resolved = resolveAdminTab(activeTab, userProfile.effectivePermissions);
    if (resolved !== activeTab) {
      setActiveTab(resolved);
      localStorage.setItem("adminDashboardTab", resolved);
    }
  }, [userProfile, activeTab]);

  if (!userProfile) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  const permissions = userProfile.effectivePermissions;
  const canManageContentGroups = hasPermission(permissions, PERMISSIONS.MANAGE_CONTENT_GROUPS);
  const canViewUsers = hasPermission(permissions, PERMISSIONS.VIEW_USERS);
  const canManageUserGroups = hasPermission(permissions, PERMISSIONS.MANAGE_USER_GROUPS);
  const canViewAnalytics = hasPermission(permissions, PERMISSIONS.VIEW_ANALYTICS);
  const canViewPurchaseRequests = hasPermission(permissions, PERMISSIONS.VIEW_PURCHASE_REQUESTS);
  const canViewOrders = hasPermission(permissions, PERMISSIONS.VIEW_ORDERS);
  const canViewArchivedContent = hasPermission(permissions, PERMISSIONS.VIEW_ARCHIVED_CONTENT);
  const canManageSiteSettings = hasPermission(permissions, PERMISSIONS.MANAGE_SITE_SETTINGS);
  const canGenerateInviteCodes = hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES);

  return (
    <TourActiveProvider active={guides.tourGuide !== null}>
    <AdminLayout activeTab={activeTab} onTabChange={handleTabChange} onHelpClick={guides.openLauncher}>
      {/* Action buttons */}
      {canGenerateInviteCodes && (
        <div className="flex gap-2 mb-4">
          <Button onClick={() => setClientInviteModalOpen(true)} data-tour="invite-client">Invite Client</Button>
          <Button variant="outline" onClick={() => setInviteModalOpen(true)}>Generate Staff Code</Button>
        </div>
      )}

      {/* Tab content — render based on activeTab */}
      {activeTab === "content" && <ContentManager />}
      {activeTab === "shareLinks" && <ShareLinksManager />}
      {activeTab === "contentGroups" && canManageContentGroups && <ContentGroupManager />}
      {activeTab === "joinRequests" && canViewUsers && <JoinRequests />}
      {activeTab === "users" && canViewUsers && <UserManager />}
      {activeTab === "userGroups" && canManageUserGroups && <UserGroupManager />}
      {activeTab === "analytics" && canViewAnalytics && <AnalyticsDashboard />}
      {activeTab === "purchaseRequests" && canViewPurchaseRequests && <PurchaseRequests />}
      {activeTab === "orders" && canViewOrders && <AdminOrders />}
      {activeTab === "archived" && canViewArchivedContent && <ArchivedContent />}
      {activeTab === "settings" && canManageSiteSettings && <SiteSettings />}
      {activeTab === "debug" && canManageSiteSettings && <DebugTools />}

      {/* Modals — only mounted for users who can generate invite codes. These
          modals run privileged queries (listInviteCodes / listClientInvites)
          on mount that throw for users without GENERATE_INVITE_CODES, which
          would otherwise blank the whole dashboard for contributors/editors. */}
      {canGenerateInviteCodes && (
        <>
          <InviteCodeModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
          <ClientInviteModal open={clientInviteModalOpen} onOpenChange={setClientInviteModalOpen} />
        </>
      )}

      {/* Onboarding tour — auto-shows on first visit */}
      <OnboardingTour />

      {/* Help & Guides */}
      <GuidesLauncher
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
          guides.writtenGuide
            ? () => guides.startTour(guides.writtenGuide!.id)
            : undefined
        }
      />
      {guides.tourGuide && (
        <GuidedTour stops={guides.tourGuide.tourStops} onClose={handleTourClose} />
      )}
      <GuideDemoHost activeTourId={guides.tourGuide?.id ?? null} />
      <NewStaffPrompt onOpenGuides={guides.openLauncher} />
    </AdminLayout>
    </TourActiveProvider>
  );
}
