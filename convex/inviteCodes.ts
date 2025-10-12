import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Generate a random invite code
function generateCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let code = "";
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

// Create a new invite code
export const createInviteCode = mutation({
  args: {
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("contributor")
    ),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is an admin
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can create invite codes");
    }

    // Generate a unique code
    let code = generateCode();
    let existing = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    // Ensure code is unique
    while (existing) {
      code = generateCode();
      existing = await ctx.db
        .query("inviteCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
    }

    const inviteCodeId = await ctx.db.insert("inviteCodes", {
      code,
      role: args.role,
      createdBy: userId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      isActive: true,
    });

    return { inviteCodeId, code };
  },
});

// Validate an invite code
export const validateInviteCode = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const inviteCode = await ctx.db
      .query("inviteCodes")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!inviteCode) {
      return { valid: false, message: "Invalid invite code" };
    }

    if (!inviteCode.isActive) {
      return { valid: false, message: "This invite code has been deactivated" };
    }

    if (inviteCode.expiresAt && inviteCode.expiresAt < Date.now()) {
      return { valid: false, message: "This invite code has expired" };
    }

    return {
      valid: true,
      role: inviteCode.role,
      message: `Valid invite code for ${inviteCode.role} role`,
    };
  },
});

// List all invite codes (admin only)
export const listInviteCodes = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is an admin
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can view invite codes");
    }

    const inviteCodes = await ctx.db.query("inviteCodes").collect();

    // Get creator names
    const codesWithCreators = await Promise.all(
      inviteCodes.map(async (code) => {
        const creatorProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", code.createdBy))
          .unique();

        return {
          ...code,
          creatorName: creatorProfile
            ? `${creatorProfile.firstName} ${creatorProfile.lastName}`
            : "Unknown",
        };
      })
    );

    return codesWithCreators.sort((a, b) => b.createdAt - a.createdAt);
  },
});

// Deactivate an invite code
export const deactivateInviteCode = mutation({
  args: {
    inviteCodeId: v.id("inviteCodes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is an admin
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can deactivate invite codes");
    }

    await ctx.db.patch(args.inviteCodeId, {
      isActive: false,
    });
  },
});

// Reactivate an invite code
export const reactivateInviteCode = mutation({
  args: {
    inviteCodeId: v.id("inviteCodes"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user is an admin
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can reactivate invite codes");
    }

    await ctx.db.patch(args.inviteCodeId, {
      isActive: true,
    });
  },
});
