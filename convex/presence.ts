import { v } from "convex/values";
import { mutation, query, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Update user's presence (heartbeat)
export const updatePresence = mutation({
  args: {
    contentId: v.id("content"),
    contentTitle: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return; // Allow anonymous users to skip presence

    // Get user profile for name
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile) return;

    const userName = `${userProfile.firstName} ${userProfile.lastName}`;

    // Check if presence record exists
    const existing = await ctx.db
      .query("activePresence")
      .withIndex("by_user_content", (q) =>
        q.eq("userId", userId).eq("contentId", args.contentId)
      )
      .first();

    if (existing) {
      // Update existing presence
      await ctx.db.patch(existing._id, {
        lastHeartbeat: Date.now(),
        contentTitle: args.contentTitle,
        userName,
      });
    } else {
      // Create new presence record
      await ctx.db.insert("activePresence", {
        userId,
        userName,
        contentId: args.contentId,
        contentTitle: args.contentTitle,
        lastHeartbeat: Date.now(),
      });
    }
  },
});

// Remove user's presence when they leave
export const removePresence = mutation({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;

    // Find and delete the presence record
    const existing = await ctx.db
      .query("activePresence")
      .withIndex("by_user_content", (q) =>
        q.eq("userId", userId).eq("contentId", args.contentId)
      )
      .first();

    if (existing) {
      await ctx.db.delete(existing._id);
    }
  },
});

// Get all active viewers (admin only)
export const getActiveViewers = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!userProfile || (userProfile.role !== "admin" && userProfile.role !== "owner")) {
      throw new Error("Only admins or the owner can view presence data");
    }

    // Get all presence records updated in the last 2 minutes
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const activePresence = await ctx.db
      .query("activePresence")
      .withIndex("by_heartbeat", (q) => q.gte("lastHeartbeat", twoMinutesAgo))
      .collect();

    return activePresence;
  },
});

// Get viewers for a specific content item (admin only)
export const getContentViewers = query({
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
      throw new Error("Only admins or the owner can view presence data");
    }

    // Get all presence records for this content updated in the last 2 minutes
    const twoMinutesAgo = Date.now() - 2 * 60 * 1000;
    const allPresence = await ctx.db
      .query("activePresence")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();

    return allPresence.filter((p) => p.lastHeartbeat >= twoMinutesAgo);
  },
});

// Clean up stale presence records (run periodically)
export const cleanupStalePresence = internalMutation({
  handler: async (ctx) => {
    const fiveMinutesAgo = Date.now() - 5 * 60 * 1000;
    const staleRecords = await ctx.db
      .query("activePresence")
      .withIndex("by_heartbeat", (q) => q.lt("lastHeartbeat", fiveMinutesAgo))
      .collect();

    for (const record of staleRecords) {
      await ctx.db.delete(record._id);
    }
  },
});
