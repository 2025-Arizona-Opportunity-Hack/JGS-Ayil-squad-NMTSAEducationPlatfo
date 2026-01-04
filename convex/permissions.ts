/**
 * Permission-based access control system
 * 
 * All actions are controlled by permissions, not roles directly.
 * Roles determine the default set of permissions a user gets.
 * Admins and owners have all permissions by default.
 * Only owners can promote users to admin (PROMOTE_TO_ADMIN permission).
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

// All permissions as an array for validation
export const ALL_PERMISSIONS: Permission[] = Object.values(PERMISSIONS);

// Default permissions for each role
// Admins and owners get ALL permissions, but only owners get PROMOTE_TO_ADMIN
export const DEFAULT_PERMISSIONS: Record<string, Permission[]> = {
  owner: ALL_PERMISSIONS, // Owners have everything including PROMOTE_TO_ADMIN
  
  admin: ALL_PERMISSIONS.filter(p => p !== PERMISSIONS.PROMOTE_TO_ADMIN), // Admins have everything except PROMOTE_TO_ADMIN
  
  editor: [
    PERMISSIONS.VIEW_ALL_CONTENT,
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.REVIEW_CONTENT,
    PERMISSIONS.PUBLISH_CONTENT,
    PERMISSIONS.SHARE_CONTENT,
    PERMISSIONS.SHARE_WITH_THIRD_PARTY,
  ],
  
  contributor: [
    PERMISSIONS.VIEW_ALL_CONTENT,
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.DELETE_CONTENT,
    PERMISSIONS.SUBMIT_FOR_REVIEW,
    PERMISSIONS.SHARE_CONTENT,
    PERMISSIONS.SHARE_WITH_THIRD_PARTY,
  ],
  
  professional: [
    PERMISSIONS.VIEW_ALL_CONTENT,
    PERMISSIONS.SHARE_CONTENT,
    PERMISSIONS.RECOMMEND_CONTENT,
  ],
  
  parent: [
    PERMISSIONS.SHARE_CONTENT,
  ],
  
  client: [
    PERMISSIONS.SHARE_CONTENT,
  ],
};

/**
 * Get the default permissions for a role
 */
export function getDefaultPermissions(role: string): Permission[] {
  return DEFAULT_PERMISSIONS[role] || [];
}

/**
 * Check if a user has a specific permission
 * @param userPermissions - The user's permissions array
 * @param permission - The permission to check
 */
export function hasPermission(userPermissions: Permission[] | undefined, permission: Permission): boolean {
  if (!userPermissions) return false;
  return userPermissions.includes(permission);
}

/**
 * Check if a user has all of the specified permissions
 */
export function hasAllPermissions(userPermissions: Permission[] | undefined, permissions: Permission[]): boolean {
  if (!userPermissions) return false;
  return permissions.every(p => userPermissions.includes(p));
}

/**
 * Check if a user has any of the specified permissions
 */
export function hasAnyPermission(userPermissions: Permission[] | undefined, permissions: Permission[]): boolean {
  if (!userPermissions) return false;
  return permissions.some(p => userPermissions.includes(p));
}

/**
 * Get effective permissions for a user profile
 * If custom permissions are set, use those; otherwise use default permissions for the role
 */
export function getEffectivePermissions(profile: { role: string; permissions?: string[] }): Permission[] {
  // If custom permissions are set, use those
  if (profile.permissions && profile.permissions.length > 0) {
    return profile.permissions as Permission[];
  }
  // Otherwise, use default permissions for the role
  return getDefaultPermissions(profile.role);
}
