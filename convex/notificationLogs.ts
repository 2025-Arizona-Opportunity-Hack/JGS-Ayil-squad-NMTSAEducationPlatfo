import { ConvexError, v } from "convex/values";
import { internalMutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

/**
 * Log a notification attempt (called internally from email/sms actions).
 */
export const log = internalMutation({
  args: {
    channel: v.union(v.literal("email"), v.literal("sms")),
    eventType: v.string(),
    recipient: v.string(),
    from: v.optional(v.string()),
    subject: v.optional(v.string()),
    success: v.boolean(),
    error: v.optional(v.string()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    await ctx.db.insert("notificationLogs", {
      ...args,
      createdAt: Date.now(),
    });
  },
});

/**
 * Query notification logs (admin/owner only).
 */
export const list = query({
  args: {
    channel: v.optional(v.union(v.literal("email"), v.literal("sms"), v.literal("all"))),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new ConvexError("Only admins can view notification logs");
    }

    const limit = args.limit || 50;
    const channel = args.channel || "all";

    let logs;
    if (channel !== "all") {
      logs = await ctx.db
        .query("notificationLogs")
        .withIndex("by_channel", (q) => q.eq("channel", channel))
        .order("desc")
        .take(limit);
    } else {
      logs = await ctx.db
        .query("notificationLogs")
        .order("desc")
        .take(limit);
    }

    return logs;
  },
});

/**
 * Clear old notification logs (keep last N days).
 */
export const clearOldLogs = internalMutation({
  args: { olderThanDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.olderThanDays || 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const oldLogs = await ctx.db
      .query("notificationLogs")
      .withIndex("by_created_at")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .take(500);

    for (const log of oldLogs) {
      await ctx.db.delete(log._id);
    }

    return { deleted: oldLogs.length };
  },
});
