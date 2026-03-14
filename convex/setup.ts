import { v } from "convex/values";
import { query, mutation, internalMutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { internal } from "./_generated/api";

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

/**
 * Complete setup wizard — atomic mutation that creates owner profile,
 * site settings, and notification settings in one transaction.
 * File uploads (avatar, logo) must happen BEFORE calling this mutation
 * via generateUploadUrl. This mutation only receives StorageIds.
 */
export const completeSetupWizard = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    profilePictureId: v.optional(v.id("_storage")),
    organizationName: v.string(),
    tagline: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
    primaryColor: v.optional(v.string()),
    defaultEmail: v.boolean(),
    defaultSms: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Verify this user holds the setup lock
    const lock = await ctx.db
      .query("setupLocks")
      .withIndex("by_locked_by", (q) => q.eq("lockedBy", userId))
      .first();
    if (!lock || lock.expiresAt < Date.now()) {
      throw new Error("Setup lock expired. Please restart setup.");
    }

    // Ensure no profiles exist (bootstrap guard)
    const anyProfile = await ctx.db.query("userProfiles").first();
    if (anyProfile) throw new Error("Setup already completed");

    // 1. Create owner profile
    await ctx.db.insert("userProfiles", {
      userId,
      role: "owner",
      firstName: args.firstName,
      lastName: args.lastName,
      profilePictureId: args.profilePictureId,
      isActive: true,
    });

    // 2. Create or update site settings
    const existingSettings = await ctx.db.query("siteSettings").first();
    if (existingSettings) {
      await ctx.db.patch(existingSettings._id, {
        organizationName: args.organizationName,
        tagline: args.tagline,
        logoId: args.logoId,
        primaryColor: args.primaryColor,
        setupCompleted: true,
        setupCompletedAt: Date.now(),
        setupCompletedBy: userId,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
    } else {
      await ctx.db.insert("siteSettings", {
        organizationName: args.organizationName,
        tagline: args.tagline,
        logoId: args.logoId,
        primaryColor: args.primaryColor,
        setupCompleted: true,
        setupCompletedAt: Date.now(),
        setupCompletedBy: userId,
      });
    }

    // 3. Create notification settings with defaults
    const defaultRouting = { email: args.defaultEmail, sms: args.defaultSms };
    await ctx.db.insert("notificationSettings", {
      events: {
        contentAccessGranted: { ...defaultRouting },
        joinRequestApproved: { ...defaultRouting },
        purchaseRequestApproved: { ...defaultRouting },
        purchaseRequestDenied: { ...defaultRouting },
        recommendationSent: { ...defaultRouting },
        verificationEmail: { email: true, sms: false }, // Always email for verification
      },
      emailConfigured: false,
      smsConfigured: false,
      lastChannelCheck: undefined,
      updatedAt: Date.now(),
      updatedBy: userId,
    });

    // 4. Schedule channel status check
    await ctx.scheduler.runAfter(
      0,
      internal.notificationSettings.refreshChannelStatus,
      {}
    );

    // 5. Delete the setup lock
    await ctx.db.delete(lock._id);
  },
});
