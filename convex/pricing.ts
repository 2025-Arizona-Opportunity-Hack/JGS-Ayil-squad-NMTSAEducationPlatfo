import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Set or update pricing for content
export const setPricing = mutation({
  args: {
    contentId: v.id("content"),
    price: v.number(),
    currency: v.string(),
    accessDuration: v.optional(v.number()),
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
      throw new Error("Only admins can set pricing");
    }

    // Check if pricing already exists
    const existingPricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .first();

    if (existingPricing) {
      // Update existing pricing
      await ctx.db.patch(existingPricing._id, {
        price: args.price,
        currency: args.currency,
        accessDuration: args.accessDuration,
        isActive: true,
      });
      return existingPricing._id;
    } else {
      // Create new pricing
      return await ctx.db.insert("contentPricing", {
        contentId: args.contentId,
        price: args.price,
        currency: args.currency,
        accessDuration: args.accessDuration,
        isActive: true,
        createdBy: userId,
        createdAt: Date.now(),
      });
    }
  },
});

// Remove pricing from content
export const removePricing = mutation({
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
      throw new Error("Only admins can remove pricing");
    }

    const pricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .first();

    if (pricing) {
      await ctx.db.patch(pricing._id, { isActive: false });
    }
  },
});

// Get pricing for a specific content item
export const getPricing = query({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const pricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    return pricing;
  },
});

// List all content with active pricing (for shop)
export const listPricedContent = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    // Get all active pricing
    const allPricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Get content details for each pricing
    const pricedContent = await Promise.all(
      allPricing.map(async (pricing) => {
        const content = await ctx.db.get(pricing.contentId);
        if (!content) return null;

        // Check if user already owns this content
        const existingOrder = await ctx.db
          .query("orders")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) =>
            q.and(
              q.eq(q.field("contentId"), pricing.contentId),
              q.eq(q.field("status"), "completed")
            )
          )
          .first();

        // Check if access has expired
        const hasAccess = existingOrder && (!existingOrder.accessExpiresAt || existingOrder.accessExpiresAt > Date.now());

        // Get thumbnail URL if exists
        let thumbnailUrl = null;
        if (content.thumbnailId) {
          thumbnailUrl = await ctx.storage.getUrl(content.thumbnailId);
        }

        return {
          ...content,
          pricing,
          thumbnailUrl,
          hasAccess,
        };
      })
    );

    return pricedContent.filter((item) => item !== null);
  },
});

// Get all pricing (admin only)
export const listAllPricing = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || userProfile.role !== "admin") {
      throw new Error("Only admins can view all pricing");
    }

    const allPricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_active", (q) => q.eq("isActive", true))
      .collect();

    // Enrich with content details
    const enrichedPricing = await Promise.all(
      allPricing.map(async (pricing) => {
        const content = await ctx.db.get(pricing.contentId);
        return {
          ...pricing,
          contentTitle: content?.title || "Unknown",
        };
      })
    );

    return enrichedPricing;
  },
});
