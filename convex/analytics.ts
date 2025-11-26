import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Track a content view
export const trackView = mutation({
  args: {
    contentId: v.id("content"),
    sessionId: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    await ctx.db.insert("contentViews", {
      contentId: args.contentId,
      userId: userId || undefined,
      viewedAt: Date.now(),
      sessionId: args.sessionId,
    });
  },
});

// Get analytics for a specific content item
export const getContentAnalytics = query({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "owner")) {
      throw new Error("Only admins or the owner can view analytics");
    }

    // Get all views for this content
    const allViews = await ctx.db
      .query("contentViews")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();

    // Calculate metrics
    const totalViews = allViews.length;
    const uniqueUsers = new Set(
      allViews.filter((v) => v.userId).map((v) => v.userId)
    ).size;

    // Get viewer details (who viewed)
    const viewerDetails = await Promise.all(
      allViews
        .filter((v) => v.userId)
        .map(async (view) => {
          const profile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user_id", (q) => q.eq("userId", view.userId!))
            .first();

          return {
            userId: view.userId,
            viewedAt: view.viewedAt,
            userName: profile
              ? `${profile.firstName} ${profile.lastName}`
              : "Unknown User",
          };
        })
    );

    // Group views by user
    const viewsByUser = new Map<
      string,
      { userName: string; viewCount: number; lastViewed: number }
    >();

    for (const detail of viewerDetails) {
      const existing = viewsByUser.get(detail.userId!);
      if (existing) {
        existing.viewCount += 1;
        existing.lastViewed = Math.max(existing.lastViewed, detail.viewedAt);
      } else {
        viewsByUser.set(detail.userId!, {
          userName: detail.userName,
          viewCount: 1,
          lastViewed: detail.viewedAt,
        });
      }
    }

    const viewersList = Array.from(viewsByUser.entries()).map(
      ([userId, data]) => ({
        userId,
        ...data,
      })
    );

    return {
      totalViews,
      uniqueUsers,
      viewersList,
    };
  },
});

// Get analytics for all content (admin overview)
export const getAllContentAnalytics = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "owner")) {
      throw new Error("Only admins or the owner can view analytics");
    }

    // Get all content
    const allContent = await ctx.db.query("content").collect();

    // Get analytics for each content item
    const contentAnalytics = await Promise.all(
      allContent.map(async (content) => {
        const views = await ctx.db
          .query("contentViews")
          .withIndex("by_content", (q) => q.eq("contentId", content._id))
          .collect();

        const totalViews = views.length;
        const uniqueUsers = new Set(
          views.filter((v) => v.userId).map((v) => v.userId)
        ).size;

        return {
          contentId: content._id,
          contentTitle: content.title,
          contentType: content.type,
          totalViews,
          uniqueUsers,
        };
      })
    );

    // Sort by total views descending
    contentAnalytics.sort((a, b) => b.totalViews - a.totalViews);

    return contentAnalytics;
  },
});

// Get view counts for all content (admin only)
export const getContentViewCounts = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "owner")) {
      throw new Error("Only admins or the owner can view analytics");
    }

    // Get all content views
    const allViews = await ctx.db.query("contentViews").collect();

    // Group by content ID and count
    const viewCounts: Record<string, number> = {};
    for (const view of allViews) {
      const contentId = view.contentId;
      viewCounts[contentId] = (viewCounts[contentId] || 0) + 1;
    }

    return viewCounts;
  },
});
