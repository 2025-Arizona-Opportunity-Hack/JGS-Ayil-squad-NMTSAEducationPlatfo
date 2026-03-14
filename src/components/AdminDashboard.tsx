import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { UserManager } from "./UserManager";
import { UserGroupManager } from "./UserGroupManager";
import { ContentManager } from "./ContentManager";
import { ContentGroupManager } from "./ContentGroupManager";
import { ShareLinksManager } from "./ShareLinksManager";
import { InviteCodeModal } from "./InviteCodeModal";
import { ClientInviteModal } from "./ClientInviteModal";
import { SalesAnalytics } from "./admin/SalesAnalytics";
import { AdminOrders } from "./admin/AdminOrders";
import { ArchivedContent } from "./admin/ArchivedContent";
import { SiteSettings } from "./admin/SiteSettings";
import { PurchaseRequests } from "./admin/PurchaseRequests";
import { JoinRequests } from "./admin/JoinRequests";
import { DebugTools } from "./admin/DebugTools";
import { AdminLayout } from "./admin/AdminLayout";
import { OnboardingTour } from "./setup/OnboardingTour";
import { Button } from "@/components/ui/button";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export function AdminDashboard() {
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [clientInviteModalOpen, setClientInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    return localStorage.getItem("adminDashboardTab") || "content";
  });

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem("adminDashboardTab", value);
  };

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
    <AdminLayout activeTab={activeTab} onTabChange={handleTabChange}>
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
      {activeTab === "analytics" && canViewAnalytics && <SalesAnalytics />}
      {activeTab === "purchaseRequests" && canViewPurchaseRequests && <PurchaseRequests />}
      {activeTab === "orders" && canViewOrders && <AdminOrders />}
      {activeTab === "archived" && canViewArchivedContent && <ArchivedContent />}
      {activeTab === "settings" && canManageSiteSettings && <SiteSettings />}
      {activeTab === "debug" && canManageSiteSettings && <DebugTools />}

      {/* Modals */}
      <InviteCodeModal open={inviteModalOpen} onOpenChange={setInviteModalOpen} />
      <ClientInviteModal open={clientInviteModalOpen} onOpenChange={setClientInviteModalOpen} />

      {/* Onboarding tour — auto-shows on first visit */}
      <OnboardingTour />
    </AdminLayout>
  );
}
