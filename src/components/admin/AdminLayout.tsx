import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { AdminHeader } from "./AdminHeader";
import { AdminSidebar } from "./AdminSidebar";
import { SkipToContent } from "../SkipToContent";
import { ProfileEditModal } from "../ProfileEditModal";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  children: React.ReactNode;
}

export function AdminLayout({ activeTab, onTabChange, children }: AdminLayoutProps) {
  const [profileOpen, setProfileOpen] = useState(false);
  const userProfile = useQuery(api.users.getCurrentUserProfile);

  const permissions = userProfile?.effectivePermissions;
  const sidebarPermissions = {
    canManageContentGroups: hasPermission(permissions, PERMISSIONS.MANAGE_CONTENT_GROUPS),
    canViewUsers: hasPermission(permissions, PERMISSIONS.VIEW_USERS),
    canManageUserGroups: hasPermission(permissions, PERMISSIONS.MANAGE_USER_GROUPS),
    canViewAnalytics: hasPermission(permissions, PERMISSIONS.VIEW_ANALYTICS),
    canViewPurchaseRequests: hasPermission(permissions, PERMISSIONS.VIEW_PURCHASE_REQUESTS),
    canViewOrders: hasPermission(permissions, PERMISSIONS.VIEW_ORDERS),
    canViewArchivedContent: hasPermission(permissions, PERMISSIONS.VIEW_ARCHIVED_CONTENT),
    canManageSiteSettings: hasPermission(permissions, PERMISSIONS.MANAGE_SITE_SETTINGS),
  };

  return (
    <div className="min-h-screen bg-background text-foreground">
      <SkipToContent />
      <AdminHeader
        onProfileClick={() => setProfileOpen(true)}
        activeTab={activeTab}
        onTabChange={onTabChange}
        sidebarPermissions={sidebarPermissions}
      />

      <div className="flex">
        {/* Desktop sidebar — sticky, full height below header */}
        <div className="hidden md:block sticky top-14 h-[calc(100vh-3.5rem)]">
          <AdminSidebar
            activeTab={activeTab}
            onTabChange={onTabChange}
            permissions={sidebarPermissions}
          />
        </div>

        {/* Main content */}
        <main id="main-content" tabIndex={-1} className="flex-1 p-6 outline-none min-w-0">
          {children}
        </main>
      </div>

      {userProfile && (
        <ProfileEditModal
          isOpen={profileOpen}
          onClose={() => setProfileOpen(false)}
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
