import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

// Create a purchase request
export const createPurchaseRequest = mutation({
  args: {
    contentId: v.id("content"),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if content exists and has pricing
    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    const pricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!pricing) throw new Error("This content is not available for purchase");

    // Check if user already has a pending or approved request
    const existingRequest = await ctx.db
      .query("purchaseRequests")
      .withIndex("by_user_content", (q) => 
        q.eq("userId", userId).eq("contentId", args.contentId)
      )
      .filter((q) => 
        q.or(
          q.eq(q.field("status"), "pending"),
          q.eq(q.field("status"), "approved")
        )
      )
      .first();

    if (existingRequest) {
      if (existingRequest.status === "pending") {
        throw new Error("You already have a pending request for this content");
      }
      if (existingRequest.status === "approved") {
        throw new Error("Your request has already been approved. You can now purchase this content.");
      }
    }

    // Check if user already owns this content
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

    if (existingOrder) {
      const hasAccess = !existingOrder.accessExpiresAt || existingOrder.accessExpiresAt > Date.now();
      if (hasAccess) {
        throw new Error("You already have access to this content");
      }
    }

    // Create the purchase request
    return await ctx.db.insert("purchaseRequests", {
      userId,
      contentId: args.contentId,
      status: "pending",
      message: args.message,
      createdAt: Date.now(),
    });
  },
});

// Get user's purchase requests
export const getMyPurchaseRequests = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const requests = await ctx.db
      .query("purchaseRequests")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    // Enrich with content details
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const content = await ctx.db.get(request.contentId);
        const pricing = await ctx.db
          .query("contentPricing")
          .withIndex("by_content", (q) => q.eq("contentId", request.contentId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        let reviewerName = null;
        if (request.reviewedBy) {
          const reviewer = await ctx.db.get(request.reviewedBy);
          if (reviewer) {
            const reviewerProfile = await ctx.db
              .query("userProfiles")
              .withIndex("by_user_id", (q) => q.eq("userId", request.reviewedBy!))
              .first();
            reviewerName = reviewerProfile 
              ? `${reviewerProfile.firstName} ${reviewerProfile.lastName}`
              : reviewer.name || "Admin";
          }
        }

        return {
          ...request,
          contentTitle: content?.title || "Unknown Content",
          contentDescription: content?.description,
          pricing: pricing ? {
            price: pricing.price,
            currency: pricing.currency,
          } : null,
          reviewerName,
        };
      })
    );

    return enrichedRequests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Get purchase request status for a specific content
export const getPurchaseRequestStatus = query({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const request = await ctx.db
      .query("purchaseRequests")
      .withIndex("by_user_content", (q) => 
        q.eq("userId", userId).eq("contentId", args.contentId)
      )
      .order("desc")
      .first();

    return request;
  },
});

// List all pending purchase requests (admin only)
export const listPendingRequests = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "owner"].includes(profile.role)) {
      return [];
    }

    const requests = await ctx.db
      .query("purchaseRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    // Enrich with user and content details
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const user = await ctx.db.get(request.userId);
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", request.userId))
          .first();
        
        const content = await ctx.db.get(request.contentId);
        const pricing = await ctx.db
          .query("contentPricing")
          .withIndex("by_content", (q) => q.eq("contentId", request.contentId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        return {
          ...request,
          userName: userProfile 
            ? `${userProfile.firstName} ${userProfile.lastName}`
            : user?.name || "Unknown User",
          userEmail: user?.email || "Unknown",
          contentTitle: content?.title || "Unknown Content",
          pricing: pricing ? {
            price: pricing.price,
            currency: pricing.currency,
          } : null,
        };
      })
    );

    return enrichedRequests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// List all purchase requests (admin only)
export const listAllRequests = query({
  args: {
    status: v.optional(v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "owner"].includes(profile.role)) {
      return [];
    }

    let requests;
    if (args.status) {
      requests = await ctx.db
        .query("purchaseRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
    } else {
      requests = await ctx.db.query("purchaseRequests").collect();
    }

    // Enrich with user and content details
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        const user = await ctx.db.get(request.userId);
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", request.userId))
          .first();
        
        const content = await ctx.db.get(request.contentId);
        const pricing = await ctx.db
          .query("contentPricing")
          .withIndex("by_content", (q) => q.eq("contentId", request.contentId))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        let reviewerName = null;
        if (request.reviewedBy) {
          const reviewer = await ctx.db.get(request.reviewedBy);
          if (reviewer) {
            const reviewerProfile = await ctx.db
              .query("userProfiles")
              .withIndex("by_user_id", (q) => q.eq("userId", request.reviewedBy!))
              .first();
            reviewerName = reviewerProfile 
              ? `${reviewerProfile.firstName} ${reviewerProfile.lastName}`
              : reviewer.name || "Admin";
          }
        }

        return {
          ...request,
          userName: userProfile 
            ? `${userProfile.firstName} ${userProfile.lastName}`
            : user?.name || "Unknown User",
          userEmail: user?.email || "Unknown",
          contentTitle: content?.title || "Unknown Content",
          pricing: pricing ? {
            price: pricing.price,
            currency: pricing.currency,
          } : null,
          reviewerName,
        };
      })
    );

    return enrichedRequests.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Approve a purchase request (admin only)
export const approveRequest = mutation({
  args: {
    requestId: v.id("purchaseRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "owner"].includes(profile.role)) {
      throw new Error("Only admins or the owner can approve purchase requests");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    if (request.status !== "pending") {
      throw new Error("This request has already been reviewed");
    }

    await ctx.db.patch(args.requestId, {
      status: "approved",
      adminNotes: args.adminNotes,
      reviewedAt: Date.now(),
      reviewedBy: userId,
    });

    // Send email notification to user
    await ctx.scheduler.runAfter(0, internal.emails.sendPurchaseApprovedEmail, {
      userId: request.userId,
      contentId: request.contentId,
      adminNotes: args.adminNotes,
    });
    // Send SMS notification
    await ctx.scheduler.runAfter(0, internal.sms.sendPurchaseApprovedSms, {
      userId: request.userId,
      contentId: request.contentId,
    });

    return { success: true };
  },
});

// Deny a purchase request (admin only)
export const denyRequest = mutation({
  args: {
    requestId: v.id("purchaseRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "owner"].includes(profile.role)) {
      throw new Error("Only admins or the owner can deny purchase requests");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    if (request.status !== "pending") {
      throw new Error("This request has already been reviewed");
    }

    await ctx.db.patch(args.requestId, {
      status: "denied",
      adminNotes: args.adminNotes,
      reviewedAt: Date.now(),
      reviewedBy: userId,
    });

    // Send email notification to user
    await ctx.scheduler.runAfter(0, internal.emails.sendPurchaseDeniedEmail, {
      userId: request.userId,
      contentId: request.contentId,
      adminNotes: args.adminNotes,
    });

    return { success: true };
  },
});

// Check if user can purchase content (has approved request)
export const canPurchaseContent = query({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { canPurchase: false, reason: "Not authenticated" };

    // Check if content has pricing
    const pricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (!pricing) {
      return { canPurchase: false, reason: "Content is not available for purchase" };
    }

    // Check if user already owns this content
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

    if (existingOrder) {
      const hasAccess = !existingOrder.accessExpiresAt || existingOrder.accessExpiresAt > Date.now();
      if (hasAccess) {
        return { canPurchase: false, reason: "You already have access to this content" };
      }
    }

    // Check for approved purchase request
    const approvedRequest = await ctx.db
      .query("purchaseRequests")
      .withIndex("by_user_content", (q) => 
        q.eq("userId", userId).eq("contentId", args.contentId)
      )
      .filter((q) => q.eq(q.field("status"), "approved"))
      .first();

    if (!approvedRequest) {
      // Check if there's a pending request
      const pendingRequest = await ctx.db
        .query("purchaseRequests")
        .withIndex("by_user_content", (q) => 
          q.eq("userId", userId).eq("contentId", args.contentId)
        )
        .filter((q) => q.eq(q.field("status"), "pending"))
        .first();

      if (pendingRequest) {
        return { 
          canPurchase: false, 
          reason: "Your purchase request is pending approval",
          requestStatus: "pending",
          requestId: pendingRequest._id,
        };
      }

      return { 
        canPurchase: false, 
        reason: "You need to request permission to purchase this content",
        requestStatus: "none",
      };
    }

    // Check if the approved request has already been used
    if (approvedRequest.purchaseCompletedAt) {
      return { 
        canPurchase: false, 
        reason: "You have already completed this purchase",
        requestStatus: "completed",
      };
    }

    return { 
      canPurchase: true, 
      reason: "Your request has been approved",
      requestStatus: "approved",
      requestId: approvedRequest._id,
    };
  },
});

// Mark purchase request as completed (called after successful purchase)
export const markRequestCompleted = mutation({
  args: {
    requestId: v.id("purchaseRequests"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Request not found");

    if (request.userId !== userId) {
      throw new Error("You can only complete your own purchase requests");
    }

    if (request.status !== "approved") {
      throw new Error("Only approved requests can be marked as completed");
    }

    await ctx.db.patch(args.requestId, {
      purchaseCompletedAt: Date.now(),
    });

    return { success: true };
  },
});

// Get count of pending requests (for admin badge)
export const getPendingRequestCount = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return 0;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile || !["admin", "owner"].includes(profile.role)) {
      return 0;
    }

    const pendingRequests = await ctx.db
      .query("purchaseRequests")
      .withIndex("by_status", (q) => q.eq("status", "pending"))
      .collect();

    return pendingRequests.length;
  },
});
