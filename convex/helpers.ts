/**
 * Shared helper functions for Convex backend.
 *
 * Centralizes common patterns like authentication checks, permission
 * verification, storage URL lookups, and user name formatting to
 * eliminate boilerplate across mutation/query handlers.
 */
import { QueryCtx, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import {
  getEffectivePermissions,
  hasPermission,
  Permission,
} from "./permissions";

// ─── Authentication & Authorization ─────────────────────────────────

type AuthContext = QueryCtx | MutationCtx;

interface AuthResult {
  userId: Id<"users">;
  profile: {
    _id: Id<"userProfiles">;
    userId: Id<"users">;
    role: string;
    firstName: string;
    lastName: string;
    permissions?: string[];
    isActive: boolean;
    [key: string]: unknown;
  };
  permissions: Permission[];
}

/**
 * Verify the caller is authenticated and has a profile.
 * Returns userId, profile, and effective permissions.
 *
 * @example
 * const { userId, profile, permissions } = await requireAuth(ctx);
 */
export async function requireAuth(ctx: AuthContext): Promise<AuthResult> {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) throw new Error("Profile not found");

  const permissions = getEffectivePermissions(profile);

  return { userId, profile: profile as AuthResult["profile"], permissions };
}

/**
 * Verify the caller is authenticated AND has a specific permission.
 *
 * @example
 * const { userId, profile } = await requirePermission(ctx, PERMISSIONS.CREATE_CONTENT);
 */
export async function requirePermission(
  ctx: AuthContext,
  permission: Permission
): Promise<AuthResult> {
  const auth = await requireAuth(ctx);
  if (!hasPermission(auth.permissions, permission)) {
    throw new Error(`Missing required permission: ${permission}`);
  }
  return auth;
}

/**
 * Verify the caller has ANY of the listed permissions.
 *
 * @example
 * await requireAnyPermission(ctx, [PERMISSIONS.MANAGE_USERS, PERMISSIONS.VIEW_USERS]);
 */
export async function requireAnyPermission(
  ctx: AuthContext,
  permissions: Permission[]
): Promise<AuthResult> {
  const auth = await requireAuth(ctx);
  const hasSome = permissions.some((p) => hasPermission(auth.permissions, p));
  if (!hasSome) {
    throw new Error(
      `Missing required permission: one of ${permissions.join(", ")}`
    );
  }
  return auth;
}

// ─── Data Enrichment Helpers ────────────────────────────────────────

/**
 * Format a user's full name from a profile.
 */
export function formatUserName(profile: {
  firstName: string;
  lastName: string;
} | null): string {
  if (!profile) return "Unknown";
  return `${profile.firstName} ${profile.lastName}`;
}

/**
 * Get a user profile by userId, returning null if not found.
 */
export async function getUserProfile(ctx: QueryCtx, userId: Id<"users">) {
  return ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();
}

/**
 * Get the display name for a user by their userId.
 */
export async function getUserName(
  ctx: QueryCtx,
  userId: Id<"users">
): Promise<string> {
  const profile = await getUserProfile(ctx, userId);
  return formatUserName(profile);
}

/**
 * Get storage URLs for file and thumbnail IDs.
 * Returns null for any missing ID.
 */
export async function getStorageUrls(
  ctx: QueryCtx,
  ids: {
    fileId?: Id<"_storage"> | null;
    thumbnailId?: Id<"_storage"> | null;
  }
): Promise<{ fileUrl: string | null; thumbnailUrl: string | null }> {
  const [fileUrl, thumbnailUrl] = await Promise.all([
    ids.fileId ? ctx.storage.getUrl(ids.fileId) : null,
    ids.thumbnailId ? ctx.storage.getUrl(ids.thumbnailId) : null,
  ]);
  return { fileUrl, thumbnailUrl };
}

// ─── Content Access Helpers ─────────────────────────────────────────

/**
 * Check whether a user has access to a specific content item through any
 * of the three access patterns: direct user, role-based, or user-group.
 */
export async function checkContentAccess(
  ctx: QueryCtx,
  contentId: Id<"content">,
  userId: Id<"users">,
  userRole: string
): Promise<boolean> {
  const now = Date.now();

  // Check direct user access
  const userAccess = await ctx.db
    .query("contentAccess")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("contentId"), contentId))
    .first();

  if (userAccess && (!userAccess.expiresAt || userAccess.expiresAt > now)) {
    return true;
  }

  // Check role-based access
  const roleAccess = await ctx.db
    .query("contentAccess")
    .withIndex("by_content", (q) => q.eq("contentId", contentId))
    .filter((q) => q.eq(q.field("role"), userRole))
    .first();

  if (roleAccess && (!roleAccess.expiresAt || roleAccess.expiresAt > now)) {
    return true;
  }

  // Check user group access
  const userGroups = await ctx.db
    .query("userGroupMembers")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .collect();

  for (const membership of userGroups) {
    const groupAccess = await ctx.db
      .query("contentAccess")
      .withIndex("by_content", (q) => q.eq("contentId", contentId))
      .filter((q) => q.eq(q.field("userGroupId"), membership.groupId))
      .first();

    if (
      groupAccess &&
      (!groupAccess.expiresAt || groupAccess.expiresAt > now)
    ) {
      return true;
    }
  }

  return false;
}

// ─── Validation Helpers ─────────────────────────────────────────────

/**
 * Validate an email address format.
 */
export function validateEmail(email: string): void {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(email)) {
    throw new Error("Invalid email address");
  }
}

/**
 * Validate a phone number in E.164 format.
 */
export function validatePhoneNumber(phone: string): void {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new Error(
      "Invalid phone number format. Please use E.164 format (e.g., +14155551234)"
    );
  }
}

/**
 * Validate that a price is a positive integer (cents).
 */
export function validatePrice(price: number): void {
  if (!Number.isInteger(price) || price <= 0) {
    throw new Error("Price must be a positive integer (in cents)");
  }
}
