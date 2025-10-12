import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create a new order (purchase content)
export const createOrder = mutation({
  args: {
    contentId: v.id("content"),
    pricingId: v.id("contentPricing"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Get pricing details
    const pricing = await ctx.db.get(args.pricingId);
    if (!pricing || !pricing.isActive) {
      throw new Error("Pricing not found or inactive");
    }

    // Check if user already has an active order for this content
    const existingOrder = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .filter((q) =>
        q.and(
          q.eq(q.field("contentId"), args.contentId),
          q.eq(q.field("status"), "completed")
        )
      )
      .first();

    if (existingOrder && (!existingOrder.accessExpiresAt || existingOrder.accessExpiresAt > Date.now())) {
      throw new Error("You already have access to this content");
    }

    // Calculate access expiration
    let accessExpiresAt: number | undefined = undefined;
    if (pricing.accessDuration) {
      accessExpiresAt = Date.now() + pricing.accessDuration;
    }

    // Create the order
    const orderId = await ctx.db.insert("orders", {
      userId,
      contentId: args.contentId,
      pricingId: args.pricingId,
      amount: pricing.price,
      currency: pricing.currency,
      status: "pending",
      paymentMethod: "mock_payment",
      accessExpiresAt,
      createdAt: Date.now(),
    });

    return orderId;
  },
});

// Complete an order (simulate payment success)
export const completeOrder = mutation({
  args: {
    orderId: v.id("orders"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const order = await ctx.db.get(args.orderId);
    if (!order) throw new Error("Order not found");
    if (order.userId !== userId) throw new Error("Not authorized");
    if (order.status !== "pending") throw new Error("Order already processed");

    // Update order status
    await ctx.db.patch(args.orderId, {
      status: "completed",
      completedAt: Date.now(),
    });

    // Grant access to content
    const content = await ctx.db.get(order.contentId);
    if (content) {
      // Create content access entry
      await ctx.db.insert("contentAccess", {
        contentId: order.contentId,
        userId: order.userId,
        grantedBy: order.userId,
        expiresAt: order.accessExpiresAt,
        canShare: false,
      });
    }

    return { success: true };
  },
});

// Get user's order history
export const getUserOrders = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .collect();

    // Enrich with content and pricing details
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const content = await ctx.db.get(order.contentId);
        const pricing = await ctx.db.get(order.pricingId);

        // Get thumbnail URL if exists
        let thumbnailUrl = null;
        if (content?.thumbnailId) {
          thumbnailUrl = await ctx.storage.getUrl(content.thumbnailId);
        }

        return {
          ...order,
          contentTitle: content?.title || "Unknown",
          contentType: content?.type || "unknown",
          thumbnailUrl,
          pricingDetails: pricing,
        };
      })
    );

    return enrichedOrders;
  },
});

// Get all orders (admin/owner only)
export const getAllOrders = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "owner")) {
      throw new Error("Only admins or the owner can view all orders");
    }

    const orders = await ctx.db
      .query("orders")
      .withIndex("by_created_at")
      .order("desc")
      .collect();

    // Enrich with user, content, and pricing details
    const enrichedOrders = await Promise.all(
      orders.map(async (order) => {
        const content = await ctx.db.get(order.contentId);
        const pricing = await ctx.db.get(order.pricingId);
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", order.userId))
          .first();

        // Get thumbnail URL if exists
        let thumbnailUrl = null;
        if (content?.thumbnailId) {
          thumbnailUrl = await ctx.storage.getUrl(content.thumbnailId);
        }

        return {
          ...order,
          contentTitle: content?.title || "Unknown",
          contentType: content?.type || "unknown",
          thumbnailUrl,
          pricingDetails: pricing,
          userName: userProfile
            ? `${userProfile.firstName} ${userProfile.lastName}`
            : "Unknown User",
        };
      })
    );

    return enrichedOrders;
  },
});

// Get sales analytics (admin/owner only)
export const getSalesAnalytics = query({
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

    // Get all completed orders
    const completedOrders = await ctx.db
      .query("orders")
      .withIndex("by_status", (q) => q.eq("status", "completed"))
      .collect();

    // Calculate total revenue
    const totalRevenue = completedOrders.reduce(
      (sum, order) => sum + order.amount,
      0
    );

    // Calculate revenue by time period
    const now = Date.now();
    const oneDayAgo = now - 24 * 60 * 60 * 1000;
    const oneWeekAgo = now - 7 * 24 * 60 * 60 * 1000;
    const oneMonthAgo = now - 30 * 24 * 60 * 60 * 1000;

    const todayRevenue = completedOrders
      .filter((order) => order.completedAt && order.completedAt >= oneDayAgo)
      .reduce((sum, order) => sum + order.amount, 0);

    const weekRevenue = completedOrders
      .filter((order) => order.completedAt && order.completedAt >= oneWeekAgo)
      .reduce((sum, order) => sum + order.amount, 0);

    const monthRevenue = completedOrders
      .filter((order) => order.completedAt && order.completedAt >= oneMonthAgo)
      .reduce((sum, order) => sum + order.amount, 0);

    // Get top selling content
    const contentSales = new Map<string, { count: number; revenue: number; title: string }>();
    
    for (const order of completedOrders) {
      const existing = contentSales.get(order.contentId);
      const content = await ctx.db.get(order.contentId);
      
      if (existing) {
        existing.count += 1;
        existing.revenue += order.amount;
      } else {
        contentSales.set(order.contentId, {
          count: 1,
          revenue: order.amount,
          title: content?.title || "Unknown",
        });
      }
    }

    const topSellingContent = Array.from(contentSales.entries())
      .map(([contentId, data]) => ({
        contentId,
        ...data,
      }))
      .sort((a, b) => b.revenue - a.revenue)
      .slice(0, 5);

    return {
      totalRevenue,
      totalOrders: completedOrders.length,
      todayRevenue,
      weekRevenue,
      monthRevenue,
      todayOrders: completedOrders.filter(
        (order) => order.completedAt && order.completedAt >= oneDayAgo
      ).length,
      weekOrders: completedOrders.filter(
        (order) => order.completedAt && order.completedAt >= oneWeekAgo
      ).length,
      monthOrders: completedOrders.filter(
        (order) => order.completedAt && order.completedAt >= oneMonthAgo
      ).length,
      topSellingContent,
    };
  },
});
