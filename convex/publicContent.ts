import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getUserProfile, getStorageUrls, formatUserName, checkContentAccess } from "./helpers";
import { getEffectivePermissions, hasPermission, PERMISSIONS } from "./permissions";

// Get public content by ID (no auth required for public content)
export const getPublicContent = query({
  args: {
    contentId: v.id("content"),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db.get(args.contentId);
    
    if (!content) {
      return {
        error: "Content not found",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }

    // Check if content is published and active
    if (content.status !== "published") {
      return {
        error: "This content is not published yet",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }

    if (!content.active) {
      return {
        error: "This content is not currently active",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }

    // Check availability dates
    const now = Date.now();
    if (content.startDate && content.startDate > now) {
      return {
        error: "This content is not yet available",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }
    if (content.endDate && content.endDate < now) {
      return {
        error: "This content is no longer available",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }

    // Try to get authenticated user
    const userId = await getAuthUserId(ctx);
    let hasAccess = false;

    if (content.isPublic) {
      hasAccess = true;
    } else if (userId) {
      const userProfile = await getUserProfile(ctx, userId);
      if (userProfile) {
        const perms = getEffectivePermissions(userProfile);
        // Users with VIEW_ALL_CONTENT, content creators, or users with content access
        if (
          content.createdBy === userId ||
          hasPermission(perms, PERMISSIONS.VIEW_ALL_CONTENT)
        ) {
          hasAccess = true;
        } else {
          hasAccess = await checkContentAccess(ctx, args.contentId, userId, userProfile.role);
        }
      }
    }

    // If still no access, check password
    if (!hasAccess) {
      if (content.password) {
        if (!args.password) {
          return { requiresPassword: true, requiresAuth: !userId, content: null };
        }
        if (args.password !== content.password) {
          return { error: "Incorrect password", requiresPassword: true, requiresAuth: false, content: null };
        }
        hasAccess = true;
      } else {
        return { requiresPassword: false, requiresAuth: true, content: null };
      }
    }

    if (!hasAccess) {
      return { error: "You don't have permission to view this content", requiresPassword: false, requiresAuth: true, content: null };
    }

    const urls = await getStorageUrls(ctx, { fileId: content.fileId, thumbnailId: content.thumbnailId });
    const creatorName = formatUserName(await getUserProfile(ctx, content.createdBy));

    return {
      requiresPassword: false,
      requiresAuth: false,
      content: {
        ...content,
        ...urls,
        creatorName,
        password: undefined,
      },
    };
  },
});

