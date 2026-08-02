/**
 * Shared helper functions for Convex backend.
 *
 * Centralizes common patterns like authentication checks, permission
 * verification, storage URL lookups, and user name formatting to
 * eliminate boilerplate across mutation/query handlers.
 */
import { ConvexError } from "convex/values";
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
  if (!userId) throw new ConvexError("Not authenticated");

  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();

  if (!profile) throw new ConvexError("Profile not found");

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
    throw new ConvexError(`Missing required permission: ${permission}`);
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
    throw new ConvexError(
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
 * Resolve the playable/downloadable URL for a content row, transparently
 * handling both the single-file path (content.fileId in _storage) and the
 * chunked-upload path (content.chunks served via /api/serve-chunked).
 *
 * Frontend code can treat the returned URL uniformly — for chunked content
 * the HTTP action translates Range requests to the right underlying chunk(s).
 */
export async function getContentFileUrl(
  ctx: QueryCtx,
  content: {
    _id: Id<"content">;
    fileId?: Id<"_storage"> | null;
    chunks?: Array<{ storageId: Id<"_storage">; size: number }> | null;
  } | null | undefined
): Promise<string | null> {
  if (!content) return null;
  if (content.fileId) return await ctx.storage.getUrl(content.fileId);
  if (content.chunks && content.chunks.length > 0) {
    const siteUrl = process.env.CONVEX_SITE_URL;
    if (!siteUrl) return null;
    return `${siteUrl}/api/serve-chunked/${content._id}`;
  }
  return null;
}

/**
 * Get storage URLs for file and thumbnail IDs.
 * Returns null for any missing ID.
 *
 * For chunked content, prefer `getContentFileUrl` since this helper only knows
 * about direct storage ids — it has no contentId/chunks context.
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

/**
 * Check whether a user has access to a content group (bundle) through any
 * of the three access patterns: direct user, role-based, or user-group.
 *
 * This is the single canonical copy (like checkContentAccess above) — do
 * not duplicate it in feature modules.
 */
export async function checkGroupAccess(
  ctx: QueryCtx,
  groupId: Id<"contentGroups">,
  userId: Id<"users">,
  userRole: string
): Promise<boolean> {
  const now = Date.now();

  // Check direct user access
  const userAccess = await ctx.db
    .query("contentGroupAccess")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .filter((q) => q.eq(q.field("groupId"), groupId))
    .first();

  if (userAccess && (!userAccess.expiresAt || userAccess.expiresAt > now)) {
    return true;
  }

  // Check role-based access
  const roleAccess = await ctx.db
    .query("contentGroupAccess")
    .withIndex("by_group", (q) => q.eq("groupId", groupId))
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
      .query("contentGroupAccess")
      .withIndex("by_group", (q) => q.eq("groupId", groupId))
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
    throw new ConvexError("Invalid email address");
  }
}

/**
 * Validate a phone number in E.164 format.
 */
export function validatePhoneNumber(phone: string): void {
  const phoneRegex = /^\+[1-9]\d{1,14}$/;
  if (!phoneRegex.test(phone)) {
    throw new ConvexError(
      "Invalid phone number format. Please use E.164 format (e.g., +14155551234)"
    );
  }
}

/**
 * Validate that a price is a positive integer (cents).
 */
export function validatePrice(price: number): void {
  if (!Number.isInteger(price) || price <= 0) {
    throw new ConvexError("Price must be a positive integer (in cents)");
  }
}

// ─── Org branding helpers (C1) ──────────────────────────────────────
//
// This platform is deployed once per organization — its own Convex project,
// its own domain (see docs/DEPLOYMENTS.md) — rather than as a shared
// multi-tenant backend. That means any hardcoded first-organization name or
// domain baked into this codebase would leak into *every other* org's
// deployment the moment its own siteSettings/SITE_URL weren't configured
// yet. These two helpers exist so every notification-building function
// degrades to a neutral value instead.

/**
 * Get the organization's display name, never an org-specific hardcoded one.
 *
 * Most callers (the email/SMS actions in emails.ts/sms.ts) already fetch
 * the `siteSettings` row via an internalQuery — actions don't have direct
 * `ctx.db` access — so this takes that row (or null/undefined before setup
 * has run) rather than a ctx, and falls back to the neutral "Content
 * Portal" label.
 */
export function getOrgName(
  settings: { organizationName?: string | null } | null | undefined
): string {
  return settings?.organizationName || "Content Portal";
}

/**
 * Get the configured SITE_URL for this deployment, with any trailing
 * slash stripped so callers can concatenate paths safely (`${url}/path`).
 *
 * Throws a ConvexError when SITE_URL is unset or empty instead of falling
 * back to a default domain. Every deployment belongs to exactly one
 * organization, so a missing SITE_URL is a misconfiguration, not something
 * to paper over — silently emitting a password-reset/invite/verification
 * link to some other organization's domain is worse than failing loudly.
 */
export function requireSiteUrl(): string {
  const siteUrl = process.env.SITE_URL?.trim();
  if (!siteUrl) {
    throw new ConvexError(
      "SITE_URL is not configured for this deployment. Set the SITE_URL " +
        "environment variable (see docs/DEPLOYMENTS.md) before sending " +
        "notifications that contain links."
    );
  }
  return siteUrl.replace(/\/+$/, "");
}

// ─── Signed media URL helpers (A3) ──────────────────────────────────
//
// Media tags (<video src>, <audio src>) can't send an Authorization header,
// so entitlement for the /api/serve-chunked HTTP action is proven with a
// short-lived HMAC-signed URL instead: `sig` = HMAC-SHA256 over
// `${contentId}:${exp}` keyed by MEDIA_URL_SECRET. Signing happens in the
// `getSignedMediaUrl` action (content.ts); verification happens in the
// `/api/serve-chunked` HTTP action (router.ts). Both run in the Convex
// action runtime, which — unlike queries/mutations — exposes `crypto.subtle`.

/**
 * Compute the hex-encoded HMAC-SHA256 signature for a media URL.
 */
export async function computeMediaSignature(
  contentId: string,
  exp: number,
  secret: string
): Promise<string> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"]
  );
  const sigBuffer = await crypto.subtle.sign(
    "HMAC",
    key,
    new TextEncoder().encode(`${contentId}:${exp}`)
  );
  return Array.from(new Uint8Array(sigBuffer), (b) =>
    b.toString(16).padStart(2, "0")
  ).join("");
}

/**
 * Constant-time-style comparison of two equal-length-checked strings. Never
 * early-returns on the first differing byte, so it doesn't leak timing
 * information about how many leading characters matched.
 */
export function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}

/**
 * Map the stored `attachmentType` to the `type` discriminator the viewer
 * components switch on ("video" | "audio" | "document" | "article").
 *
 * The database stores `attachmentType`; `content.type` is a derived field that
 * queries attach on the way out. Any query whose result is rendered by
 * PublicContentViewer / SharedContentViewer / RecommendedContent MUST run its
 * content through this, or those components fall through every `type === ...`
 * branch and render the metadata with no player at all — which is exactly the
 * bug this was extracted to fix. Previously the mapping was duplicated inline
 * in two `content.ts` queries and simply missing from the other three.
 */
export function deriveContentType(
  attachmentType?: string | null,
  existingType?: string | null
): string {
  if (!attachmentType) return existingType || "article";
  switch (attachmentType) {
    case "video":
      return "video";
    case "audio":
      return "audio";
    case "pdf":
      return "document";
    case "image":
      return "document";
    case "richtext":
      return "article";
    default:
      return "article";
  }
}
