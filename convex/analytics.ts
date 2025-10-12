import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Track a content view
export const trackView = mutation({
  args: {
    contentId: v.id("content"),
    sessionId: v.string(),
    timeSpent: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);

    await ctx.db.insert("contentViews", {
      contentId: args.contentId,
      userId: userId || undefined,
      viewedAt: Date.now(),
      timeSpent: args.timeSpent,
      sessionId: args.sessionId,
    });
  },
});

// Update time spent on a view
export const updateTimeSpent = mutation({
  args: {
    contentId: v.id("content"),
    sessionId: v.string(),
    timeSpent: v.number(),
  },
  handler: async (ctx, args) => {
    // Find the most recent view for this session
    const views = await ctx.db
      .query("contentViews")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("sessionId"), args.sessionId))
      .order("desc")
      .take(1);

    if (views.length > 0) {
      await ctx.db.patch(views[0]._id, {
        timeSpent: args.timeSpent,
      });
    }
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

    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Only admins can view analytics");
    }

    // Get all views for this content
    const allViews = await ctx.db
      .query("contentViews")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();

    // Calculate metrics
    const totalViews = allViews.length;
    const uniqueSessions = new Set(allViews.map((v) => v.sessionId)).size;
    const uniqueUsers = new Set(
      allViews.filter((v) => v.userId).map((v) => v.userId)
    ).size;

    // Calculate average time spent (only for views with timeSpent data)
    const viewsWithTime = allViews.filter((v) => v.timeSpent !== undefined);
    const averageTimeSpent =
      viewsWithTime.length > 0
        ? viewsWithTime.reduce((sum, v) => sum + (v.timeSpent || 0), 0) /
          viewsWithTime.length
        : 0;

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
            timeSpent: view.timeSpent,
            userName: profile
              ? `${profile.firstName} ${profile.lastName}`
              : "Unknown User",
          };
        })
    );

    // Group views by user
    const viewsByUser = new Map<
      string,
      { userName: string; viewCount: number; totalTimeSpent: number; lastViewed: number }
    >();

    for (const detail of viewerDetails) {
      const existing = viewsByUser.get(detail.userId!);
      if (existing) {
        existing.viewCount += 1;
        existing.totalTimeSpent += detail.timeSpent || 0;
        existing.lastViewed = Math.max(existing.lastViewed, detail.viewedAt);
      } else {
        viewsByUser.set(detail.userId!, {
          userName: detail.userName,
          viewCount: 1,
          totalTimeSpent: detail.timeSpent || 0,
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

    // Get views over time (last 30 days)
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    const recentViews = allViews.filter((v) => v.viewedAt >= thirtyDaysAgo);

    return {
      totalViews,
      uniqueSessions,
      uniqueUsers,
      averageTimeSpent: Math.round(averageTimeSpent),
      viewersList,
      recentViews: recentViews.length,
      viewsOverTime: recentViews.map((v) => ({
        viewedAt: v.viewedAt,
        timeSpent: v.timeSpent,
      })),
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

    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Only admins can view analytics");
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
        const uniqueSessions = new Set(views.map((v) => v.sessionId)).size;
        const uniqueUsers = new Set(
          views.filter((v) => v.userId).map((v) => v.userId)
        ).size;

        const viewsWithTime = views.filter((v) => v.timeSpent !== undefined);
        const averageTimeSpent =
          viewsWithTime.length > 0
            ? viewsWithTime.reduce((sum, v) => sum + (v.timeSpent || 0), 0) /
              viewsWithTime.length
            : 0;

        return {
          contentId: content._id,
          contentTitle: content.title,
          contentType: content.type,
          totalViews,
          uniqueSessions,
          uniqueUsers,
          averageTimeSpent: Math.round(averageTimeSpent),
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

    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Only admins can view analytics");
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
