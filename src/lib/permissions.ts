/**
 * Frontend permission utilities
 * 
 * This mirrors the permission constants from the backend for use in the frontend.
 * All permission checks should use these constants and helper functions.
 */

// All available permissions in the system
export const PERMISSIONS = {
  // Content permissions
  VIEW_ALL_CONTENT: "view_all_content",
  CREATE_CONTENT: "create_content",
  EDIT_CONTENT: "edit_content",
  DELETE_CONTENT: "delete_content",
  ARCHIVE_CONTENT: "archive_content",
  PUBLISH_CONTENT: "publish_content",
  REVIEW_CONTENT: "review_content",
  SUBMIT_FOR_REVIEW: "submit_for_review",
  
  // Content sharing permissions
  SHARE_CONTENT: "share_content",
  SHARE_WITH_THIRD_PARTY: "share_with_third_party",
  MANAGE_CONTENT_ACCESS: "manage_content_access",
  SET_CONTENT_PRICING: "set_content_pricing",
  
  // Content groups/bundles
  MANAGE_CONTENT_GROUPS: "manage_content_groups",
  
  // User management permissions
  VIEW_USERS: "view_users",
  MANAGE_USERS: "manage_users",
  UPDATE_USER_ROLES: "update_user_roles",
  PROMOTE_TO_ADMIN: "promote_to_admin", // Owner-only by default
  
  // User groups
  MANAGE_USER_GROUPS: "manage_user_groups",
  
  // Analytics & Orders
  VIEW_ANALYTICS: "view_analytics",
  VIEW_ORDERS: "view_orders",
  MANAGE_ORDERS: "manage_orders",
  
  // Purchase requests
  VIEW_PURCHASE_REQUESTS: "view_purchase_requests",
  MANAGE_PURCHASE_REQUESTS: "manage_purchase_requests",
  
  // Archived content
  VIEW_ARCHIVED_CONTENT: "view_archived_content",
  RESTORE_ARCHIVED_CONTENT: "restore_archived_content",
  
  // Site settings
  MANAGE_SITE_SETTINGS: "manage_site_settings",
  
  // Invite codes
  GENERATE_INVITE_CODES: "generate_invite_codes",
  
  // Recommendations (professional feature)
  RECOMMEND_CONTENT: "recommend_content",
} as const;

export type Permission = typeof PERMISSIONS[keyof typeof PERMISSIONS];

/**
 * Check if a user has a specific permission
 * @param userPermissions - The user's effectivePermissions array from their profile
 * @param permission - The permission to check
 */
export function hasPermission(userPermissions: string[] | undefined, permission: Permission): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes(permission);
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userPermissions: string[] | undefined, permissions: Permission[]): boolean {
  if (!userPermissions) return false;
  return permissions.every(p => userPermissions.includes(p));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userPermissions: string[] | undefined, permissions: Permission[]): boolean {
  if (!userPermissions) return false;
  return permissions.some(p => userPermissions.includes(p));
}

// Permission display names for UI
export const PERMISSION_LABELS: Record<Permission, string> = {
  [PERMISSIONS.VIEW_ALL_CONTENT]: "View All Content",
  [PERMISSIONS.CREATE_CONTENT]: "Create Content",
  [PERMISSIONS.EDIT_CONTENT]: "Edit Content",
  [PERMISSIONS.DELETE_CONTENT]: "Delete Content",
  [PERMISSIONS.ARCHIVE_CONTENT]: "Archive Content",
  [PERMISSIONS.PUBLISH_CONTENT]: "Publish Content",
  [PERMISSIONS.REVIEW_CONTENT]: "Review Content",
  [PERMISSIONS.SUBMIT_FOR_REVIEW]: "Submit for Review",
  [PERMISSIONS.SHARE_CONTENT]: "Share Content",
  [PERMISSIONS.SHARE_WITH_THIRD_PARTY]: "Share with Third Party",
  [PERMISSIONS.MANAGE_CONTENT_ACCESS]: "Manage Content Access",
  [PERMISSIONS.SET_CONTENT_PRICING]: "Set Content Pricing",
  [PERMISSIONS.MANAGE_CONTENT_GROUPS]: "Manage Content Bundles",
  [PERMISSIONS.VIEW_USERS]: "View Users",
  [PERMISSIONS.MANAGE_USERS]: "Manage Users",
  [PERMISSIONS.UPDATE_USER_ROLES]: "Update User Roles",
  [PERMISSIONS.PROMOTE_TO_ADMIN]: "Promote to Admin",
  [PERMISSIONS.MANAGE_USER_GROUPS]: "Manage User Groups",
  [PERMISSIONS.VIEW_ANALYTICS]: "View Analytics",
  [PERMISSIONS.VIEW_ORDERS]: "View Orders",
  [PERMISSIONS.MANAGE_ORDERS]: "Manage Orders",
  [PERMISSIONS.VIEW_PURCHASE_REQUESTS]: "View Purchase Requests",
  [PERMISSIONS.MANAGE_PURCHASE_REQUESTS]: "Manage Purchase Requests",
  [PERMISSIONS.VIEW_ARCHIVED_CONTENT]: "View Archived Content",
  [PERMISSIONS.RESTORE_ARCHIVED_CONTENT]: "Restore Archived Content",
  [PERMISSIONS.MANAGE_SITE_SETTINGS]: "Manage Site Settings",
  [PERMISSIONS.GENERATE_INVITE_CODES]: "Generate Invite Codes",
  [PERMISSIONS.RECOMMEND_CONTENT]: "Recommend Content",
};

// Permission categories for organized display
export const PERMISSION_CATEGORIES = {
  "Content Management": [
    PERMISSIONS.VIEW_ALL_CONTENT,
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.ARCHIVE_CONTENT,
    PERMISSIONS.PUBLISH_CONTENT,
    PERMISSIONS.REVIEW_CONTENT,
    PERMISSIONS.SUBMIT_FOR_REVIEW,
  ],
  "Content Sharing": [
    PERMISSIONS.SHARE_CONTENT,
    PERMISSIONS.SHARE_WITH_THIRD_PARTY,
    PERMISSIONS.MANAGE_CONTENT_ACCESS,
    PERMISSIONS.SET_CONTENT_PRICING,
    PERMISSIONS.MANAGE_CONTENT_GROUPS,
  ],
  "User Management": [
    PERMISSIONS.VIEW_USERS,
    PERMISSIONS.MANAGE_USERS,
    PERMISSIONS.UPDATE_USER_ROLES,
    PERMISSIONS.PROMOTE_TO_ADMIN,
    PERMISSIONS.MANAGE_USER_GROUPS,
  ],
  "Analytics & Orders": [
    PERMISSIONS.VIEW_ANALYTICS,
    PERMISSIONS.VIEW_ORDERS,
    PERMISSIONS.MANAGE_ORDERS,
    PERMISSIONS.VIEW_PURCHASE_REQUESTS,
    PERMISSIONS.MANAGE_PURCHASE_REQUESTS,
  ],
  "Administration": [
    PERMISSIONS.VIEW_ARCHIVED_CONTENT,
    PERMISSIONS.RESTORE_ARCHIVED_CONTENT,
    PERMISSIONS.MANAGE_SITE_SETTINGS,
    PERMISSIONS.GENERATE_INVITE_CODES,
  ],
  "Professional Features": [
    PERMISSIONS.RECOMMEND_CONTENT,
  ],
};
