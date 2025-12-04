import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Check if user can share a specific content item
export const canShareContent = query({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { canShare: false, reason: "Not authenticated" };

    const content = await ctx.db.get(args.contentId);
    if (!content) return { canShare: false, reason: "Content not found" };

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) return { canShare: false, reason: "User profile not found" };

    // Check permissions
    const isAdminEditorContributor = 
      userProfile.role === "admin" || 
      userProfile.role === "owner" ||
      userProfile.role === "editor" ||
      userProfile.role === "contributor";
    
    const isContentCreator = content.createdBy === userId;
    const isPublicContent = content.isPublic && content.status === "published";

    // Check if content has active pricing (purchaseable content)
    const activePricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    
    const isPurchaseable = !!activePricing;

    // Check content access
    const hasContentAccess = await checkUserContentAccess(ctx, args.contentId, userId, userProfile.role);

    // Normal users can only share public, non-purchaseable content
    const canShareAsNormalUser = isPublicContent && !isPurchaseable;
    const canShareAsPrivilegedUser = isAdminEditorContributor || isContentCreator || hasContentAccess;
    
    const canShare = canShareAsPrivilegedUser || canShareAsNormalUser;

    if (!canShare) {
      if (isPurchaseable && !canShareAsPrivilegedUser) {
        return { canShare: false, reason: "Cannot share purchaseable content" };
      }
      if (!isPublicContent && !canShareAsPrivilegedUser) {
        return { canShare: false, reason: "Cannot share private content" };
      }
      return { canShare: false, reason: "No permission to share" };
    }

    return { canShare: true, reason: null };
  },
});

// Generate a random access token
function generateAccessToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Helper function to check if a user has access to content
async function checkUserContentAccess(ctx: any, contentId: any, userId: any, userRole: string): Promise<boolean> {
  // Check direct user access
  const userAccess = await ctx.db
    .query("contentAccess")
    .withIndex("by_content", (q: any) => q.eq("contentId", contentId))
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first();

  if (userAccess && (!userAccess.expiresAt || userAccess.expiresAt > Date.now())) {
    return true;
  }

  // Check role-based access
  const roleAccess = await ctx.db
    .query("contentAccess")
    .withIndex("by_content", (q: any) => q.eq("contentId", contentId))
    .filter((q: any) => q.eq(q.field("role"), userRole))
    .first();

  if (roleAccess && (!roleAccess.expiresAt || roleAccess.expiresAt > Date.now())) {
    return true;
  }

  // Check user group access
  const userGroups = await ctx.db
    .query("userGroupMembers")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  for (const membership of userGroups) {
    const groupAccess = await ctx.db
      .query("contentAccess")
      .withIndex("by_content", (q: any) => q.eq("contentId", contentId))
      .filter((q: any) => q.eq(q.field("userGroupId"), membership.groupId))
      .first();

    if (groupAccess && (!groupAccess.expiresAt || groupAccess.expiresAt > Date.now())) {
      return true;
    }
  }

  return false;
}

// Create a 3rd party share link
export const createThirdPartyShare = mutation({
  args: {
    contentId: v.id("content"),
    recipientEmail: v.optional(v.string()),
    recipientName: v.optional(v.string()),
    message: v.optional(v.string()),
    expiresInDays: v.number(), // Number of days until expiration
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has permission to share this content
    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) throw new Error("User profile not found");

    // Check permissions - admins, editors, contributors, content creators, or users with access can share
    const isAdminEditorContributor = 
      userProfile.role === "admin" || 
      userProfile.role === "owner" ||
      userProfile.role === "editor" ||
      userProfile.role === "contributor";
    
    const isContentCreator = content.createdBy === userId;

    // Check if content is public and published (anyone can share public content)
    const isPublicContent = content.isPublic && content.status === "published";

    // Check if content has active pricing (purchaseable content)
    const activePricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    
    const isPurchaseable = !!activePricing;

    // Use the comprehensive access check function
    const hasContentAccess = await checkUserContentAccess(ctx, args.contentId, userId, userProfile.role);

    // Normal users can only share public, non-purchaseable content
    // Admins/editors/contributors/creators can share any content they have access to
    const canShareAsNormalUser = isPublicContent && !isPurchaseable;
    const canShareAsPrivilegedUser = isAdminEditorContributor || isContentCreator || hasContentAccess;
    
    const canShare = canShareAsPrivilegedUser || canShareAsNormalUser;

    // Debug logging
    console.log("Share permission check:", {
      contentId: args.contentId,
      userId,
      userRole: userProfile.role,
      isAdminEditorContributor,
      isContentCreator,
      isPublicContent,
      isPurchaseable,
      hasContentAccess,
      canShareAsNormalUser,
      canShareAsPrivilegedUser,
      canShare,
      contentStatus: content.status,
      contentIsPublic: content.isPublic,
    });

    if (!canShare) {
      throw new Error("You don't have permission to share this content");
    }

    // Generate access token
    const accessToken = generateAccessToken();

    // Calculate expiration date
    const expiresAt = Date.now() + (args.expiresInDays * 24 * 60 * 60 * 1000);

    // Create share record
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

    return {
      shareId,
      accessToken,
      shareUrl: `/share/${accessToken}`,
      expiresAt,
    };
  },
});

// Get content by share token
export const getContentByShareToken = query({
  args: {
    accessToken: v.string(),
  },
  handler: async (ctx, args) => {
    // Find the share record
    const share = await ctx.db
      .query("contentShares")
      .withIndex("by_token", (q) => q.eq("accessToken", args.accessToken))
      .unique();

    if (!share) {
      return {
        error: "Invalid share link",
        content: null,
      };
    }

    // Check if expired
    if (share.expiresAt && share.expiresAt < Date.now()) {
      return {
        error: "This share link has expired",
        content: null,
        expired: true,
      };
    }

    // Get the content
    const content = await ctx.db.get(share.contentId);
    if (!content) {
      return {
        error: "Content not found",
        content: null,
      };
    }

    // Check if content is active and published
    if (content.status !== "published") {
      return {
        error: "This content is not published",
        content: null,
      };
    }

    if (!content.active) {
      return {
        error: "This content is not currently active",
        content: null,
      };
    }

    // Check availability dates
    const now = Date.now();
    if (content.startDate && content.startDate > now) {
      return {
        error: "This content is not yet available",
        content: null,
      };
    }
    if (content.endDate && content.endDate < now) {
      return {
        error: "This content is no longer available",
        content: null,
      };
    }

    // Get file URLs
    let fileUrl = null;
    if (content.fileId) {
      fileUrl = await ctx.storage.getUrl(content.fileId);
    }

    let thumbnailUrl = null;
    if (content.thumbnailId) {
      thumbnailUrl = await ctx.storage.getUrl(content.thumbnailId);
    }

    // Get creator info
    const creator = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", content.createdBy))
      .unique();

    // Get sharer info
    const sharer = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", share.sharedBy))
      .unique();

    return {
      error: null,
      content: {
        ...content,
        fileUrl,
        thumbnailUrl,
        creatorName: creator
          ? `${creator.firstName} ${creator.lastName}`
          : "Unknown",
        password: undefined, // Don't expose password
      },
      shareInfo: {
        sharedBy: sharer ? `${sharer.firstName} ${sharer.lastName}` : "Unknown",
        message: share.message,
        expiresAt: share.expiresAt,
      },
    };
  },
});

// Track view of shared content
export const trackShareView = mutation({
  args: {
    accessToken: v.string(),
  },
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

// List shares created by current user
export const listMyShares = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const shares = await ctx.db
      .query("contentShares")
      .withIndex("by_sharer", (q) => q.eq("sharedBy", userId))
      .collect();

    // Get content info for each share
    const sharesWithContent = await Promise.all(
      shares.map(async (share) => {
        const content = await ctx.db.get(share.contentId);
        return {
          ...share,
          contentTitle: content?.title || "Unknown",
          contentType: content?.type || "unknown",
          isExpired: share.expiresAt ? share.expiresAt < Date.now() : false,
        };
      })
    );

    return sharesWithContent;
  },
});

// Delete a share
export const deleteShare = mutation({
  args: {
    shareId: v.id("contentShares"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const share = await ctx.db.get(args.shareId);
    if (!share) throw new Error("Share not found");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    // Only the sharer or an admin can delete
    if (share.sharedBy !== userId && userProfile?.role !== "admin") {
      throw new Error("You don't have permission to delete this share");
    }

    await ctx.db.delete(args.shareId);
  },
});

// List shares for a specific content (admin/creator only)
export const listContentShares = query({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const content = await ctx.db.get(args.contentId);
    if (!content) return [];

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    // Check permissions
    const canView = 
      userProfile?.role === "admin" || 
      content.createdBy === userId;

    if (!canView) return [];

    const shares = await ctx.db
      .query("contentShares")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();

    // Get sharer info for each share
    const sharesWithSharers = await Promise.all(
      shares.map(async (share) => {
        const sharer = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", share.sharedBy))
          .unique();

        return {
          ...share,
          sharedByName: sharer ? `${sharer.firstName} ${sharer.lastName}` : "Unknown",
          isExpired: share.expiresAt ? share.expiresAt < Date.now() : false,
        };
      })
    );

    return sharesWithSharers;
  },
});

