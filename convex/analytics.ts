import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { requirePermission, getUserProfile, formatUserName } from "./helpers";
import { PERMISSIONS } from "./permissions";

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
    await requirePermission(ctx, PERMISSIONS.VIEW_ANALYTICS);

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
          const profile = await getUserProfile(ctx, view.userId!);

          return {
            userId: view.userId,
            viewedAt: view.viewedAt,
            userName: profile ? formatUserName(profile) : "Unknown User",
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
    await requirePermission(ctx, PERMISSIONS.VIEW_ANALYTICS);

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
    // View counts are surfaced inside ContentManager, which contributors and
    // editors (who lack VIEW_ANALYTICS) can open. Degrade gracefully instead of
    // throwing — an unhandled throw here blanks the whole app. Mirrors the
    // pattern used by contentGroups.listContentGroups.
    try {
      await requirePermission(ctx, PERMISSIONS.VIEW_ANALYTICS);
    } catch {
      return {} as Record<string, number>;
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

// ── Comprehensive Dashboard Analytics ───────────────────────────────────────

/**
 * Get full dashboard analytics with time-series data for charts.
 * Returns views over time, revenue over time, content type breakdown,
 * user growth, and engagement metrics.
 */
export const getDashboardAnalytics = query({
  args: {
    periodDays: v.optional(v.number()), // 7, 30, 90, or 365
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.VIEW_ANALYTICS);

    const periodDays = args.periodDays || 30;
    const now = Date.now();
    const periodStart = now - periodDays * 24 * 60 * 60 * 1000;
    const prevPeriodStart = periodStart - periodDays * 24 * 60 * 60 * 1000;

    // ── Fetch all data ──
    const allViews = await ctx.db.query("contentViews").collect();
    const allContent = await ctx.db.query("content").collect();
    const allOrders = await ctx.db.query("orders").collect();
    const allProfiles = await ctx.db.query("userProfiles").collect();
    const allAccess = await ctx.db.query("contentAccess").collect();

    const completedOrders = allOrders.filter((o) => o.status === "completed");

    // ── Views in period vs previous period ──
    const viewsInPeriod = allViews.filter((v) => v.viewedAt >= periodStart);
    const viewsInPrevPeriod = allViews.filter(
      (v) => v.viewedAt >= prevPeriodStart && v.viewedAt < periodStart
    );

    // ── Revenue in period vs previous period ──
    const revenueInPeriod = completedOrders
      .filter((o) => (o.completedAt || o._creationTime) >= periodStart)
      .reduce((sum, o) => sum + (o.amount || 0), 0);
    const revenueInPrevPeriod = completedOrders
      .filter(
        (o) =>
          (o.completedAt || o._creationTime) >= prevPeriodStart &&
          (o.completedAt || o._creationTime) < periodStart
      )
      .reduce((sum, o) => sum + (o.amount || 0), 0);

    // ── Unique users in period ──
    const uniqueUsersInPeriod = new Set(
      viewsInPeriod.filter((v) => v.userId).map((v) => v.userId)
    ).size;
    const uniqueUsersInPrevPeriod = new Set(
      viewsInPrevPeriod.filter((v) => v.userId).map((v) => v.userId)
    ).size;

    // ── Views over time (daily buckets) ──
    const viewsByDay: Record<string, number> = {};
    for (const view of viewsInPeriod) {
      const date = new Date(view.viewedAt);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      viewsByDay[key] = (viewsByDay[key] || 0) + 1;
    }

    // Fill in missing days with 0
    const viewsTimeSeries: { date: string; views: number }[] = [];
    for (let d = new Date(periodStart); d <= new Date(now); d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      viewsTimeSeries.push({ date: key, views: viewsByDay[key] || 0 });
    }

    // ── Revenue over time (daily buckets) ──
    const revenueByDay: Record<string, number> = {};
    for (const order of completedOrders.filter(
      (o) => (o.completedAt || o._creationTime) >= periodStart
    )) {
      const date = new Date(order.completedAt || order._creationTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      revenueByDay[key] = (revenueByDay[key] || 0) + (order.amount || 0);
    }

    const revenueTimeSeries: { date: string; revenue: number }[] = [];
    for (let d = new Date(periodStart); d <= new Date(now); d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      revenueTimeSeries.push({ date: key, revenue: (revenueByDay[key] || 0) / 100 }); // cents → dollars
    }

    // ── Content type breakdown ──
    const typeBreakdown: Record<string, number> = {};
    for (const content of allContent) {
      const type = content.attachmentType || content.type || "other";
      typeBreakdown[type] = (typeBreakdown[type] || 0) + 1;
    }
    const contentTypeData = Object.entries(typeBreakdown).map(([type, count]) => ({
      type: type === "pdf" ? "PDF" : type === "richtext" ? "Article" : type.charAt(0).toUpperCase() + type.slice(1),
      count,
    }));

    // ── Top content by views ──
    const contentViewMap: Record<string, number> = {};
    for (const view of viewsInPeriod) {
      contentViewMap[view.contentId] = (contentViewMap[view.contentId] || 0) + 1;
    }
    const topContent = Object.entries(contentViewMap)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 10)
      .map(([contentId, views]) => {
        const content = allContent.find((c) => c._id === contentId);
        return {
          contentId,
          title: content?.title || "Unknown",
          type: content?.attachmentType || content?.type || "other",
          views,
        };
      });

    // ── User growth (new profiles over time) ──
    const newUsersByDay: Record<string, number> = {};
    for (const profile of allProfiles.filter((p) => p._creationTime >= periodStart)) {
      const date = new Date(profile._creationTime);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
      newUsersByDay[key] = (newUsersByDay[key] || 0) + 1;
    }

    const userGrowthTimeSeries: { date: string; newUsers: number }[] = [];
    for (let d = new Date(periodStart); d <= new Date(now); d.setDate(d.getDate() + 1)) {
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      userGrowthTimeSeries.push({ date: key, newUsers: newUsersByDay[key] || 0 });
    }

    // ── Role breakdown ──
    const roleBreakdown: Record<string, number> = {};
    for (const profile of allProfiles) {
      const role = profile.role || "unknown";
      roleBreakdown[role] = (roleBreakdown[role] || 0) + 1;
    }
    const userRoleData = Object.entries(roleBreakdown).map(([role, count]) => ({
      role: role.charAt(0).toUpperCase() + role.slice(1),
      count,
    }));

    // ── Summary KPIs ──
    const publishedContent = allContent.filter((c) => c.status === "published").length;
    const totalAccessGrants = allAccess.length;

    return {
      // KPI summary with trends
      kpis: {
        totalViews: viewsInPeriod.length,
        prevTotalViews: viewsInPrevPeriod.length,
        uniqueUsers: uniqueUsersInPeriod,
        prevUniqueUsers: uniqueUsersInPrevPeriod,
        revenue: revenueInPeriod / 100,
        prevRevenue: revenueInPrevPeriod / 100,
        totalContent: allContent.length,
        publishedContent,
        totalUsers: allProfiles.length,
        totalAccessGrants,
        ordersInPeriod: completedOrders.filter(
          (o) => (o.completedAt || o._creationTime) >= periodStart
        ).length,
      },
      // Time series
      viewsTimeSeries,
      revenueTimeSeries,
      userGrowthTimeSeries,
      // Breakdowns
      contentTypeData,
      userRoleData,
      topContent,
    };
  },
});
