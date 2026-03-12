import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth, formatUserName, getUserProfile, getStorageUrls, validateEmail } from "./helpers";
import { PERMISSIONS } from "./permissions";

// Create a content recommendation
export const createRecommendation = mutation({
  args: {
    contentId: v.id("content"),
    recipientEmail: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateEmail(args.recipientEmail);

    const { userId, profile } = await requirePermission(ctx, PERMISSIONS.RECOMMEND_CONTENT);

    // Check if content exists
    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    // Check if recipient user exists by email
    const recipientUser = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("email"), args.recipientEmail))
      .first();

    // Create the recommendation
    const recommendationId = await ctx.db.insert("contentRecommendations", {
      contentId: args.contentId,
      recommendedBy: userId,
      recipientEmail: args.recipientEmail,
      recipientUserId: recipientUser?._id,
      message: args.message,
      createdAt: Date.now(),
      isActive: true,
    });

    // Send email notification to recipient
    const recommenderName = formatUserName(profile);
    await ctx.scheduler.runAfter(0, internal.emails.sendRecommendationEmail, {
      recipientEmail: args.recipientEmail,
      contentId: args.contentId,
      recommenderName,
      message: args.message,
    });

    return { success: true, recommendationId };
  },
});

// Get recommendations for the current user
export const getMyRecommendations = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requireAuth(ctx);

    const user = await ctx.db.get(userId);
    if (!user?.email) return [];

    // Get recommendations by email or userId
    const recommendations = await ctx.db
      .query("contentRecommendations")
      .withIndex("by_recipient_email", (q) => q.eq("recipientEmail", user.email!))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Enrich with content and recommender details
    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const content = await ctx.db.get(rec.contentId);
        if (!content) return null;

        const recommender = await getUserProfile(ctx, rec.recommendedBy);

        // Check if user has purchased this content
        const hasPurchased = await ctx.db
          .query("orders")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) =>
            q.and(
              q.eq(q.field("contentId"), rec.contentId),
              q.eq(q.field("status"), "completed")
            )
          )
          .first();

        // Check if content has pricing
        const pricing = await ctx.db
          .query("contentPricing")
          .withIndex("by_content", (q) => q.eq("contentId", rec.contentId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        // Get file URLs
        const { fileUrl, thumbnailUrl } = await getStorageUrls(ctx, {
          fileId: content.fileId,
          thumbnailId: content.thumbnailId,
        });

        return {
          ...rec,
          content: {
            ...content,
            fileUrl,
            thumbnailUrl,
          },
          recommenderName: formatUserName(recommender),
          hasPurchased: !!hasPurchased,
          pricing: pricing ? {
            _id: pricing._id,
            price: pricing.price,
            currency: pricing.currency,
          } : null,
        };
      })
    );

    return enrichedRecommendations.filter((r) => r !== null);
  },
});

// Get recommendations made by the current professional
export const getMyRecommendationsMade = query({
  args: {},
  handler: async (ctx) => {
    const { userId } = await requirePermission(ctx, PERMISSIONS.RECOMMEND_CONTENT);

    const recommendations = await ctx.db
      .query("contentRecommendations")
      .withIndex("by_recommender", (q) => q.eq("recommendedBy", userId))
      .collect();

    // Enrich with content details
    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const content = await ctx.db.get(rec.contentId);
        if (!content) return null;

        const { thumbnailUrl } = await getStorageUrls(ctx, {
          thumbnailId: content.thumbnailId,
        });

        return {
          ...rec,
          content: {
            ...content,
            thumbnailUrl,
          },
        };
      })
    );

    return enrichedRecommendations.filter((r) => r !== null);
  },
});

// Mark a recommendation as viewed
export const markRecommendationViewed = mutation({
  args: {
    recommendationId: v.id("contentRecommendations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const recommendation = await ctx.db.get(args.recommendationId);
    if (!recommendation) throw new Error("Recommendation not found");

    // Verify this recommendation is for the current user
    const user = await ctx.db.get(userId);
    if (
      recommendation.recipientUserId !== userId &&
      recommendation.recipientEmail !== user?.email
    ) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.recommendationId, {
      viewedAt: Date.now(),
      recipientUserId: userId, // Update if it wasn't set before
    });

    return { success: true };
  },
});

// Delete a recommendation
export const deleteRecommendation = mutation({
  args: {
    recommendationId: v.id("contentRecommendations"),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);

    const recommendation = await ctx.db.get(args.recommendationId);
    if (!recommendation) throw new Error("Recommendation not found");

    // Only the professional who made it can delete it
    if (recommendation.recommendedBy !== userId) {
      throw new Error("Not authorized");
    }

    await ctx.db.patch(args.recommendationId, {
      isActive: false,
    });

    return { success: true };
  },
});
