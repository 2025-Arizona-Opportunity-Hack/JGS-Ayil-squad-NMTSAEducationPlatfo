import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getDefaultPermissions, hasPermission, PERMISSIONS, Permission } from "./permissions";
import { internal } from "./_generated/api";

// Helper to get effective permissions for a user profile
function getEffectivePermissions(profile: { role: string; permissions?: string[] }): Permission[] {
  if (profile.permissions && profile.permissions.length > 0) {
    return profile.permissions as Permission[];
  }
  return getDefaultPermissions(profile.role);
}

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

    // Check if user has permission to generate invite codes
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to create invite codes");
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

// Create a new invite code and send it via email
export const createInviteCodeWithEmail = mutation({
  args: {
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("contributor")
    ),
    recipientEmail: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to generate invite codes
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to create invite codes");
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

    // Send email with invite code
    const inviterName = `${profile.firstName} ${profile.lastName}`;
    await ctx.scheduler.runAfter(0, internal.emails.sendInviteEmail, {
      recipientEmail: args.recipientEmail,
      inviteCode: code,
      role: args.role,
      inviterName,
    });

    return { inviteCodeId, code };
  },
});

// Create a new invite code and send it via SMS
export const createInviteCodeWithSms = mutation({
  args: {
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("contributor")
    ),
    recipientPhone: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      throw new Error("Not authenticated");
    }

    // Check if user has permission to generate invite codes
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to create invite codes");
    }

    // Validate phone number format (basic E.164 validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(args.recipientPhone)) {
      throw new Error("Invalid phone number format. Please use E.164 format (e.g., +14155551234)");
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

    // Send SMS with invite code
    const inviterName = `${profile.firstName} ${profile.lastName}`;
    await ctx.scheduler.runAfter(0, internal.sms.sendInviteSms, {
      phoneNumber: args.recipientPhone,
      inviteCode: code,
      role: args.role,
      inviterName,
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

    // Check if user has permission to view invite codes
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to view invite codes");
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

    // Check if user has permission to manage invite codes
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to deactivate invite codes");
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

    // Check if user has permission to manage invite codes
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to reactivate invite codes");
    }

    await ctx.db.patch(args.inviteCodeId, {
      isActive: true,
    });
  },
});
