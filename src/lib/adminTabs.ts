import { hasPermission, PERMISSIONS, type Permission } from "./permissions";

export const DEFAULT_ADMIN_TAB = "content";

// Maps each AdminDashboard tab to the permission required to view it. `null`
// means the tab is always accessible. Keep in sync with AdminDashboard's tab
// render conditionals and AdminSidebar.
const TAB_REQUIRED_PERMISSION: Record<string, Permission | null> = {
  content: null,
  shareLinks: null,
  contentGroups: PERMISSIONS.MANAGE_CONTENT_GROUPS,
  joinRequests: PERMISSIONS.VIEW_USERS,
  users: PERMISSIONS.VIEW_USERS,
  userGroups: PERMISSIONS.MANAGE_USER_GROUPS,
  analytics: PERMISSIONS.VIEW_ANALYTICS,
  purchaseRequests: PERMISSIONS.VIEW_PURCHASE_REQUESTS,
  orders: PERMISSIONS.VIEW_ORDERS,
  archived: PERMISSIONS.VIEW_ARCHIVED_CONTENT,
  settings: PERMISSIONS.MANAGE_SITE_SETTINGS,
  debug: PERMISSIONS.MANAGE_SITE_SETTINGS,
};

/**
 * Resolves the active admin tab against the current user's permissions.
 *
 * `adminDashboardTab` is persisted in localStorage and shared across every user
 * on the browser. Without validation, a user could land on a tab they can't
 * access (e.g. an admin left it on "Settings", then a contributor logs in),
 * showing an empty panel. Returns the stored tab when accessible, otherwise the
 * default ("content"), which is always available.
 */
export function resolveAdminTab(
  storedTab: string | null | undefined,
  permissions: string[] | undefined
): string {
  if (!storedTab || !(storedTab in TAB_REQUIRED_PERMISSION)) {
    return DEFAULT_ADMIN_TAB;
  }
  const required = TAB_REQUIRED_PERMISSION[storedTab];
  if (required === null) return storedTab;
  return hasPermission(permissions, required) ? storedTab : DEFAULT_ADMIN_TAB;
}
