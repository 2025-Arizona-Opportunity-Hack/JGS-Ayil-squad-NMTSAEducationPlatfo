import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

const LOCK_DURATION_MS = 10 * 60 * 1000; // 10 minutes

/**
 * Returns the current active setup lock, or null if none exists or all are expired.
 */
export const getSetupLock = query({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const locks = await ctx.db.query("setupLocks").collect();
    const activeLock = locks.find((lock) => lock.expiresAt > now);
    return activeLock ?? null;
  },
});

/**
 * Attempts to acquire the setup lock for the current user.
 * Cleans up expired locks first, then checks for an active lock.
 * Returns {acquired: true, lockId} on success, or {acquired: false, lockedBy} if locked by another user.
 */
export const acquireSetupLock = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();

    // Clean up expired locks
    const allLocks = await ctx.db.query("setupLocks").collect();
    for (const lock of allLocks) {
      if (lock.expiresAt <= now) {
        await ctx.db.delete(lock._id);
      }
    }

    // Check for an active lock
    const remainingLocks = await ctx.db.query("setupLocks").collect();
    const activeLock = remainingLocks.find((lock) => lock.expiresAt > now);
    if (activeLock) {
      if (activeLock.lockedBy === userId) {
        // Current user already holds the lock — return it
        return { acquired: true as const, lockId: activeLock._id };
      }
      return { acquired: false as const, lockedBy: activeLock.lockedBy };
    }

    // Create a new lock
    const lockId = await ctx.db.insert("setupLocks", {
      lockedBy: userId,
      lockedAt: now,
      expiresAt: now + LOCK_DURATION_MS,
    });

    return { acquired: true as const, lockId };
  },
});

/**
 * Refreshes the expiry of the setup lock held by the current user.
 */
export const touchSetupLock = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    const now = Date.now();
    const userLocks = await ctx.db
      .query("setupLocks")
      .withIndex("by_locked_by", (q) => q.eq("lockedBy", userId))
      .collect();

    const activeLock = userLocks.find((lock) => lock.expiresAt > now);
    if (!activeLock) {
      throw new Error("No active lock found for current user");
    }

    await ctx.db.patch(activeLock._id, {
      expiresAt: now + LOCK_DURATION_MS,
    });

    return { lockId: activeLock._id };
  },
});

/**
 * Internal mutation that deletes all expired setup locks.
 */
export const cleanupExpiredLocks = internalMutation({
  args: {},
  handler: async (ctx) => {
    const now = Date.now();
    const allLocks = await ctx.db.query("setupLocks").collect();
    let deleted = 0;
    for (const lock of allLocks) {
      if (lock.expiresAt <= now) {
        await ctx.db.delete(lock._id);
        deleted++;
      }
    }
    return { deleted };
  },
});
