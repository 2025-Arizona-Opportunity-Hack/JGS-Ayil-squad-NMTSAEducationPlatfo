import { v } from "convex/values";
import { mutation, query, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Id } from "./_generated/dataModel";
import {
  requireAuth,
  checkContentAccess,
  getUserProfile,
  formatUserName,
  getStorageUrls,
} from "./helpers";
import {
  getEffectivePermissions,
  hasPermission,
  hasAnyPermission,
  PERMISSIONS,
} from "./permissions";

// ─── Helpers ────────────────────────────────────────────────────────

function generateAccessToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Evaluate whether a user can share a specific content item.
 * Used by both canShareContent (query) and createThirdPartyShare (mutation).
 */
async function evaluateSharePermission(
  ctx: QueryCtx,
  contentId: Id<"content">,
  content: { createdBy: Id<"users">; isPublic?: boolean; status?: string },
  userId: Id<"users">,
  userProfile: { role: string; permissions?: string[] }
): Promise<{ canShare: boolean; reason: string | null }> {
  const perms = getEffectivePermissions(userProfile);

  const hasSharePerm = hasAnyPermission(perms, [
    PERMISSIONS.SHARE_CONTENT,
    PERMISSIONS.SHARE_WITH_THIRD_PARTY,
  ]);
  const isContentCreator = content.createdBy === userId;
  const isPublicContent = content.isPublic && content.status === "published";

  const activePricing = await ctx.db
    .query("contentPricing")
    .withIndex("by_content", (q) => q.eq("contentId", contentId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();
  const isPurchaseable = !!activePricing;

  const hasAccess = await checkContentAccess(
    ctx,
    contentId,
    userId,
    userProfile.role
  );

  const canShareAsPrivileged = hasSharePerm || isContentCreator || hasAccess;
  const canShareAsNormal = isPublicContent && !isPurchaseable;

  if (canShareAsPrivileged || canShareAsNormal) {
    return { canShare: true, reason: null };
  }
  if (isPurchaseable)
    return { canShare: false, reason: "Cannot share purchaseable content" };
  if (!isPublicContent)
    return { canShare: false, reason: "Cannot share private content" };
  return { canShare: false, reason: "No permission to share" };
}

// ─── Queries ────────────────────────────────────────────────────────

export const canShareContent = query({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { canShare: false, reason: "Not authenticated" };

    const content = await ctx.db.get(args.contentId);
    if (!content) return { canShare: false, reason: "Content not found" };

    const userProfile = await getUserProfile(ctx, userId);
    if (!userProfile)
      return { canShare: false, reason: "User profile not found" };

    return evaluateSharePermission(
      ctx,
      args.contentId,
      content,
      userId,
      userProfile
    );
  },
});

export const getContentByShareToken = query({
  args: { accessToken: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("contentShares")
      .withIndex("by_token", (q) => q.eq("accessToken", args.accessToken))
      .unique();

    if (!share) return { error: "Invalid share link", content: null };

    if (share.expiresAt && share.expiresAt < Date.now()) {
      return { error: "This share link has expired", content: null, expired: true };
    }

    const content = await ctx.db.get(share.contentId);
    if (!content) return { error: "Content not found", content: null };

    if (content.status !== "published")
      return { error: "This content is not published", content: null };
    if (!content.active)
      return { error: "This content is not currently active", content: null };

    const now = Date.now();
    if (content.startDate && content.startDate > now)
      return { error: "This content is not yet available", content: null };
    if (content.endDate && content.endDate < now)
      return { error: "This content is no longer available", content: null };

    const urls = await getStorageUrls(ctx, {
      fileId: content.fileId,
      thumbnailId: content.thumbnailId,
    });

    const creatorName = await (async () => {
      const p = await getUserProfile(ctx, content.createdBy);
      return formatUserName(p);
    })();

    const sharerName = await (async () => {
      const p = await getUserProfile(ctx, share.sharedBy);
      return formatUserName(p);
    })();

    return {
      error: null,
      content: {
        ...content,
        ...urls,
        creatorName,
        password: undefined,
      },
      shareInfo: {
        sharedBy: sharerName,
        message: share.message,
        expiresAt: share.expiresAt,
      },
    };
  },
});

export const listMyShares = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const shares = await ctx.db
      .query("contentShares")
      .withIndex("by_sharer", (q) => q.eq("sharedBy", userId))
      .collect();

    return Promise.all(
      shares.map(async (share) => {
        const content = await ctx.db.get(share.contentId);
        return {
          ...share,
          contentTitle: content?.title || "Unknown",
          contentType: content?.attachmentType || "unknown",
          isExpired: share.expiresAt ? share.expiresAt < Date.now() : false,
        };
      })
    );
  },
});

export const listContentShares = query({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const content = await ctx.db.get(args.contentId);
    if (!content) return [];

    const userProfile = await getUserProfile(ctx, userId);
    const perms = userProfile ? getEffectivePermissions(userProfile) : [];

    // Permission-based check: MANAGE_CONTENT_ACCESS or content creator
    const canView =
      hasPermission(perms, PERMISSIONS.MANAGE_CONTENT_ACCESS) ||
      content.createdBy === userId;
    if (!canView) return [];

    const shares = await ctx.db
      .query("contentShares")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();

    return Promise.all(
      shares.map(async (share) => {
        const sharerName = await (async () => {
          const p = await getUserProfile(ctx, share.sharedBy);
          return formatUserName(p);
        })();
        return {
          ...share,
          sharedByName: sharerName,
          isExpired: share.expiresAt ? share.expiresAt < Date.now() : false,
        };
      })
    );
  },
});

// ─── Mutations ──────────────────────────────────────────────────────

export const createThirdPartyShare = mutation({
  args: {
    contentId: v.id("content"),
    recipientEmail: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    message: v.optional(v.string()),
    expiresInDays: v.number(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    const userProfile = await getUserProfile(ctx, userId);
    if (!userProfile) throw new Error("User profile not found");

    const { canShare } = await evaluateSharePermission(
      ctx,
      args.contentId,
      content,
      userId,
      userProfile
    );
    if (!canShare) {
      throw new Error("You don't have permission to share this content");
    }

    const accessToken = generateAccessToken();
    const expiresAt = Date.now() + args.expiresInDays * 24 * 60 * 60 * 1000;

    const shareId = await ctx.db.insert("contentShares", {
      contentId: args.contentId,
      sharedBy: userId,
      recipientEmail: args.recipientEmail || "",
      recipientName: args.recipientName,
      message: args.message,
      expiresAt,
      accessToken,
      viewCount: 0,
    });

    return { shareId, accessToken, shareUrl: `/share/${accessToken}`, expiresAt };
  },
});

export const trackShareView = mutation({
  args: { accessToken: v.string() },
  handler: async (ctx, args) => {
    const share = await ctx.db
      .query("contentShares")
      .withIndex("by_token", (q) => q.eq("accessToken", args.accessToken))
      .unique();

    if (share) {
      await ctx.db.patch(share._id, {
        viewCount: share.viewCount + 1,
        lastViewedAt: Date.now(),
      });
    }
  },
});

export const deleteShare = mutation({
  args: { shareId: v.id("contentShares") },
  handler: async (ctx, args) => {
    const { userId, permissions } = await requireAuth(ctx);

    const share = await ctx.db.get(args.shareId);
    if (!share) throw new Error("Share not found");

    // Sharer can always delete their own shares; otherwise need MANAGE_CONTENT_ACCESS
    if (
      share.sharedBy !== userId &&
      !hasPermission(permissions, PERMISSIONS.MANAGE_CONTENT_ACCESS)
    ) {
      throw new Error("You don't have permission to delete this share");
    }

    await ctx.db.delete(args.shareId);
  },
});
