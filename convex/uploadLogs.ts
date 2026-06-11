import { ConvexError, v } from "convex/values";
import { internalMutation, mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Public mutation callable from the client when an upload fails.
// Auth is best-effort — we still log even if the session lookup fails,
// since we never want logging itself to mask the original error.
export const log = mutation({
  args: {
    step: v.string(),
    source: v.optional(v.string()),
    errorMessage: v.string(),
    errorName: v.optional(v.string()),
    fileName: v.optional(v.string()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    attachmentType: v.optional(v.string()),
    userAgent: v.optional(v.string()),
    url: v.optional(v.string()),
    httpStatus: v.optional(v.number()),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    let userId: any = null;
    try {
      userId = await getAuthUserId(ctx);
    } catch {
      userId = null;
    }
    await ctx.db.insert("uploadLogs", {
      ...args,
      userId: userId ?? undefined,
      createdAt: Date.now(),
    });
  },
});

// Admin/owner-only query for inspecting recent upload failures.
export const list = query({
  args: {
    step: v.optional(v.string()),
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
      throw new ConvexError("Only admins can view upload logs");
    }

    const limit = args.limit ?? 100;

    const logs =
      args.step !== undefined
        ? await ctx.db
            .query("uploadLogs")
            .withIndex("by_step", (q) => q.eq("step", args.step!))
            .order("desc")
            .take(limit)
        : await ctx.db
            .query("uploadLogs")
            .withIndex("by_created_at")
            .order("desc")
            .take(limit);

    // Attach a minimal user summary for display
    const enriched = await Promise.all(
      logs.map(async (entry) => {
        if (!entry.userId) return { ...entry, user: null };
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", entry.userId!))
          .unique();
        return {
          ...entry,
          user: userProfile
            ? {
                firstName: userProfile.firstName,
                lastName: userProfile.lastName,
                role: userProfile.role,
              }
            : null,
        };
      })
    );

    return enriched;
  },
});

// Cleanup old logs (intended for cron). Keeps last N days, default 30.
export const clearOldLogs = internalMutation({
  args: { olderThanDays: v.optional(v.number()) },
  handler: async (ctx, args) => {
    const days = args.olderThanDays ?? 30;
    const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;

    const oldLogs = await ctx.db
      .query("uploadLogs")
      .withIndex("by_created_at")
      .filter((q) => q.lt(q.field("createdAt"), cutoff))
      .take(500);

    for (const entry of oldLogs) {
      await ctx.db.delete(entry._id);
    }

    return { deleted: oldLogs.length };
  },
});
