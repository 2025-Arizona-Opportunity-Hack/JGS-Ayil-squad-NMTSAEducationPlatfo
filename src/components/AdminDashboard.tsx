import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../convex/_generated/api";
import { Folder, FolderTree, Users, UsersRound, ExternalLink, Mail, TrendingUp, ShoppingCart, Archive, Settings, ClipboardList } from "lucide-react";
import { UserManager } from "./UserManager";
import { UserGroupManager } from "./UserGroupManager";
import { ContentManager } from "./ContentManager";
import { ContentGroupManager } from "./ContentGroupManager";
import { ShareLinksManager } from "./ShareLinksManager";
import { InviteCodeModal } from "./InviteCodeModal";
import { SalesAnalytics } from "./admin/SalesAnalytics";
import { AdminOrders } from "./admin/AdminOrders";
import { ArchivedContent } from "./admin/ArchivedContent";
import { SiteSettings } from "./admin/SiteSettings";
import { PurchaseRequests } from "./admin/PurchaseRequests";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Logo } from "./Logo";
import { hasPermission, PERMISSIONS } from "@/lib/permissions";

export function AdminDashboard() {
  const userProfile = useQuery(api.users.getCurrentUserProfile);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [activeTab, setActiveTab] = useState(() => {
    // Load saved tab from localStorage or default to 'content'
    return localStorage.getItem('adminDashboardTab') || 'content';
  });

  // Save active tab to localStorage whenever it changes
  const handleTabChange = (value: string) => {
    setActiveTab(value);
    localStorage.setItem('adminDashboardTab', value);
  };

  // Wait for profile to load to avoid race conditions
  if (!userProfile) {
    return (
      <div className="container mx-auto py-6">
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
        </div>
      </div>
    );
  }

  // Permission-based access checks
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
  
  // Check if user has any admin-level permissions (for dashboard title)
  const hasAdminPermissions = canViewUsers || canManageSiteSettings || canViewAnalytics;

  return (
    <>
      {canGenerateInviteCodes && (
        <InviteCodeModal
          open={inviteModalOpen}
          onOpenChange={setInviteModalOpen}
        />
      )}
      
      <div className="w-full h-full flex">
        <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full flex">
          {/* Left Sidebar Navigation */}
          <div className="w-64 border-r bg-muted/30 flex-shrink-0">
            <div className="p-6 border-b space-y-3">
              <Logo size="lg" showText={false} className="mb-2" />
              <div>
                <h1 className="text-lg font-bold tracking-tight">
                  {hasAdminPermissions ? "Admin Dashboard" : "Dashboard"}
                </h1>
                <p className="text-xs text-muted-foreground mt-1">
                  {hasAdminPermissions 
                    ? "Manage your platform" 
                    : "Manage content"}
                </p>
              </div>
            </div>
            
            <div className="p-4 space-y-4">
              <TabsList className="flex flex-col h-auto bg-transparent p-0 space-y-1">
                <TabsTrigger 
                  value="content" 
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                >
                  <Folder className="w-4 h-4" />
                  Content
                </TabsTrigger>
                <TabsTrigger 
                  value="shareLinks" 
                  className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                >
                  <ExternalLink className="w-4 h-4" />
                  Share Links
                </TabsTrigger>
                {canManageContentGroups && (
                  <TabsTrigger 
                    value="contentGroups" 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                  >
                    <FolderTree className="w-4 h-4" />
                    Content Bundles
                  </TabsTrigger>
                )}
                {canViewUsers && (
                  <TabsTrigger 
                    value="users" 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                  >
                    <Users className="w-4 h-4" />
                    Users
                  </TabsTrigger>
                )}
                {canManageUserGroups && (
                  <TabsTrigger 
                    value="userGroups" 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                  >
                    <UsersRound className="w-4 h-4" />
                    User Groups
                  </TabsTrigger>
                )}
                {canViewAnalytics && (
                  <TabsTrigger 
                    value="analytics" 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                  >
                    <TrendingUp className="w-4 h-4" />
                    Analytics
                  </TabsTrigger>
                )}
                {canViewPurchaseRequests && (
                  <TabsTrigger 
                    value="purchaseRequests" 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                  >
                    <ClipboardList className="w-4 h-4" />
                    Purchase Requests
                  </TabsTrigger>
                )}
                {canViewOrders && (
                  <TabsTrigger 
                    value="orders" 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                  >
                    <ShoppingCart className="w-4 h-4" />
                    Orders
                  </TabsTrigger>
                )}
                {canViewArchivedContent && (
                  <TabsTrigger 
                    value="archived" 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                  >
                    <Archive className="w-4 h-4" />
                    Archived Content
                  </TabsTrigger>
                )}
                {canManageSiteSettings && (
                  <TabsTrigger 
                    value="settings" 
                    className="w-full flex items-center gap-3 px-3 py-2 text-sm font-medium rounded-md transition-colors data-[state=active]:bg-primary data-[state=active]:text-primary-foreground data-[state=inactive]:hover:bg-muted data-[state=inactive]:text-muted-foreground justify-start"
                  >
                    <Settings className="w-4 h-4" />
                    Site Settings
                  </TabsTrigger>
                )}
              </TabsList>

              {canGenerateInviteCodes && (
                <Button
                  onClick={() => setInviteModalOpen(true)}
                  className="w-full flex items-center gap-2"
                  variant="outline"
                >
                  <Mail className="w-4 h-4" />
                  Generate Invite Code
                </Button>
              )}
            </div>
          </div>

          {/* Main Content Area */}
          <div className="flex-1 overflow-auto">
            <TabsContent value="content" className="m-0 p-6 h-full">
              <ContentManager />
            </TabsContent>

            <TabsContent value="shareLinks" className="m-0 p-6 h-full">
              <ShareLinksManager />
            </TabsContent>

            {canManageContentGroups && (
              <TabsContent value="contentGroups" className="m-0 p-6 h-full">
                <ContentGroupManager />
              </TabsContent>
            )}

            {canViewUsers && (
              <TabsContent value="users" className="m-0 p-6 h-full">
                <UserManager />
              </TabsContent>
            )}

            {canManageUserGroups && (
              <TabsContent value="userGroups" className="m-0 p-6 h-full">
                <UserGroupManager />
              </TabsContent>
            )}

            {canViewAnalytics && (
              <TabsContent value="analytics" className="m-0 p-6 h-full">
                <SalesAnalytics />
              </TabsContent>
            )}

            {canViewPurchaseRequests && (
              <TabsContent value="purchaseRequests" className="m-0 p-6 h-full">
                <PurchaseRequests />
              </TabsContent>
            )}

            {canViewOrders && (
              <TabsContent value="orders" className="m-0 p-6 h-full">
                <AdminOrders />
              </TabsContent>
            )}

            {canViewArchivedContent && (
              <TabsContent value="archived" className="m-0 p-6 h-full">
                <ArchivedContent />
              </TabsContent>
            )}

            {canManageSiteSettings && (
              <TabsContent value="settings" className="m-0 p-6 h-full">
                <SiteSettings />
              </TabsContent>
            )}
          </div>
        </Tabs>
      </div>
    </>
  );
}
