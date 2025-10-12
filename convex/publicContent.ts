import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

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

    // If public, allow access
    if (content.isPublic) {
      hasAccess = true;
    } else {
      // Check if user is authenticated
      if (userId) {
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", userId))
          .unique();

        if (userProfile) {
          // Check if user is creator or admin
          if (content.createdBy === userId || userProfile.role === "admin") {
            hasAccess = true;
          } else {
            // Check direct user access
            const allAccess = await ctx.db
              .query("contentAccess")
              .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
              .collect();

            for (const access of allAccess) {
              // Check if expired
              if (access.expiresAt && access.expiresAt < now) {
                continue;
              }

              // Check user access
              if (access.userId === userId) {
                hasAccess = true;
                break;
              }

              // Check role access
              if (access.role === userProfile.role) {
                hasAccess = true;
                break;
              }

              // Check group access
              if (access.userGroupId) {
                const membership = await ctx.db
                  .query("userGroupMembers")
                  .withIndex("by_user", (q) => q.eq("userId", userId))
                  .filter((q) => q.eq(q.field("groupId"), access.userGroupId))
                  .first();

                if (membership) {
                  hasAccess = true;
                  break;
                }
              }
            }
          }
        }
      }

      // If still no access, check password
      if (!hasAccess) {
        if (content.password) {
          if (!args.password) {
            return {
              requiresPassword: true,
              requiresAuth: !userId,
              content: null,
            };
          }
          
          // Validate password
          if (args.password !== content.password) {
            return {
              error: "Incorrect password",
              requiresPassword: true,
              requiresAuth: false,
              content: null,
            };
          }
          
          hasAccess = true;
        } else {
          // Private content without password - requires authentication
          return {
            requiresPassword: false,
            requiresAuth: true,
            content: null,
          };
        }
      }
    }

    if (!hasAccess) {
      return {
        error: "You don't have permission to view this content",
        requiresPassword: false,
        requiresAuth: true,
        content: null,
      };
    }

    // Get file URL if exists
    let fileUrl = null;
    if (content.fileId) {
      fileUrl = await ctx.storage.getUrl(content.fileId);
    }

    // Get thumbnail URL if exists
    let thumbnailUrl = null;
    if (content.thumbnailId) {
      thumbnailUrl = await ctx.storage.getUrl(content.thumbnailId);
    }

    // Get creator info
    const creator = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", content.createdBy))
      .unique();

    return {
      requiresPassword: false,
      requiresAuth: false,
      content: {
        ...content,
        fileUrl,
        thumbnailUrl,
        creatorName: creator
          ? `${creator.firstName} ${creator.lastName}`
          : "Unknown",
        // Don't expose password in response
        password: undefined,
      },
    };
  },
});

