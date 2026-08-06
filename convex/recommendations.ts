import { ConvexError, v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission, requireAuth, formatUserName, getUserProfile, getStorageUrls, getContentFileUrl, checkContentAccess, validateEmail, deriveContentType } from "./helpers";
import { PERMISSIONS, hasPermission } from "./permissions";

// Create a content recommendation
export const createRecommendation = mutation({
  args: {
    contentId: v.id("content"),
    recipientEmail: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    validateEmail(args.recipientEmail);

    const { userId, profile, permissions } = await requirePermission(ctx, PERMISSIONS.RECOMMEND_CONTENT);

    // Check if content exists
    const content = await ctx.db.get(args.contentId);
    if (!content) throw new ConvexError("Content not found");

    // The recommender must actually be able to access this content
    // themselves — holding RECOMMEND_CONTENT alone must not let someone
    // recommend (and thereby imply/leak knowledge of) content they have no
    // entitlement to.
    const isCreator = content.createdBy === userId;
    const canViewAll = hasPermission(permissions, PERMISSIONS.VIEW_ALL_CONTENT);
    if (!isCreator && !canViewAll) {
      const hasAccess = await checkContentAccess(ctx, args.contentId, userId, profile.role);
      if (!hasAccess) {
        throw new ConvexError("You don't have access to this content");
      }
    }

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

    // Recipient's profile — needed to evaluate contentAccess grants
    // (role/group-based access checks need the recipient's role).
    const recipientProfile = await getUserProfile(ctx, userId);

    // Enrich with content and recommender details
    const enrichedRecommendations = await Promise.all(
      recommendations.map(async (rec) => {
        const content = await ctx.db.get(rec.contentId);
        if (!content) return null;

        const recommender = await getUserProfile(ctx, rec.recommendedBy);

        // Check if the recipient has a completed, non-expired order for this content
        const order = await ctx.db
          .query("orders")
          .withIndex("by_user", (q) => q.eq("userId", userId))
          .filter((q) =>
            q.and(
              q.eq(q.field("contentId"), rec.contentId),
              q.eq(q.field("status"), "completed")
            )
          )
          .first();
        const hasValidOrder =
          !!order && (!order.accessExpiresAt || order.accessExpiresAt > Date.now());

        // Check if content has pricing
        const pricing = await ctx.db
          .query("contentPricing")
          .withIndex("by_content", (q) => q.eq("contentId", rec.contentId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        // The paywall is enforced here, not just in the UI: only hand back
        // a real fileUrl when the recipient is actually entitled — public
        // unpriced content, an explicit contentAccess grant, or a completed
        // non-expired order. `thumbnailUrl` is never the paid asset, so it's
        // always returned.
        const isPublicUnpriced =
          !!content.isPublic && content.status === "published" && !pricing;
        const hasContentAccess = recipientProfile
          ? await checkContentAccess(ctx, rec.contentId, userId, recipientProfile.role)
          : false;
        const isEntitled = isPublicUnpriced || hasContentAccess || hasValidOrder;

        const [fileUrl, thumbnailUrl] = await Promise.all([
          isEntitled ? getContentFileUrl(ctx, content) : Promise.resolve(null),
          content.thumbnailId ? ctx.storage.getUrl(content.thumbnailId) : null,
        ]);

        return {
          ...rec,
          content: {
            ...content,
            // Derived, not stored — RecommendedContent switches on it.
            type: deriveContentType(content.attachmentType, content.type),
            fileUrl,
            thumbnailUrl,
          },
          recommenderName: formatUserName(recommender),
          hasPurchased: !!order,
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
    if (!recommendation) throw new ConvexError("Recommendation not found");

    // Verify this recommendation is for the current user
    const user = await ctx.db.get(userId);
    if (
      recommendation.recipientUserId !== userId &&
      recommendation.recipientEmail !== user?.email
    ) {
      throw new ConvexError("Not authorized");
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
    if (!recommendation) throw new ConvexError("Recommendation not found");

    // Only the professional who made it can delete it
    if (recommendation.recommendedBy !== userId) {
      throw new ConvexError("Not authorized");
    }

    await ctx.db.patch(args.recommendationId, {
      isActive: false,
    });

    return { success: true };
  },
});
