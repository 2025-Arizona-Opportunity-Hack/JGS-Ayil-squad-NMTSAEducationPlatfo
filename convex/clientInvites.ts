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

// Create a client invite and send via email
export const createClientInviteWithEmail = mutation({
  args: {
    role: v.union(
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    ),
    email: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    message: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has permission to invite clients
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    // Require MANAGE_USERS or GENERATE_INVITE_CODES permission
    if (!hasPermission(permissions, PERMISSIONS.MANAGE_USERS) && 
        !hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to invite clients");
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email address");
    }

    // Check if there's already an active invite for this email
    const existingInvite = await ctx.db
      .query("clientInvites")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingInvite) {
      throw new Error("An active invite already exists for this email");
    }

    // Generate a unique code
    let code = generateCode();
    let existing = await ctx.db
      .query("clientInvites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    while (existing) {
      code = generateCode();
      existing = await ctx.db
        .query("clientInvites")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
    }

    const inviteId = await ctx.db.insert("clientInvites", {
      code,
      role: args.role,
      email: args.email.toLowerCase(),
      firstName: args.firstName,
      lastName: args.lastName,
      message: args.message,
      createdBy: userId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      isActive: true,
      emailSent: false,
    });

    // Send email invitation
    const inviterName = `${profile.firstName} ${profile.lastName}`;
    await ctx.scheduler.runAfter(0, internal.emails.sendClientInviteEmail, {
      recipientEmail: args.email.toLowerCase(),
      inviteCode: code,
      role: args.role,
      inviterName,
      recipientFirstName: args.firstName,
      message: args.message,
    });

    // Mark email as sent
    await ctx.db.patch(inviteId, { emailSent: true });

    return { inviteId, code };
  },
});

// Create a client invite and send via SMS
export const createClientInviteWithSms = mutation({
  args: {
    role: v.union(
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    ),
    phoneNumber: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    message: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has permission to invite clients
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.MANAGE_USERS) && 
        !hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to invite clients");
    }

    // Validate phone number format (basic E.164 validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(args.phoneNumber)) {
      throw new Error("Invalid phone number format. Please use E.164 format (e.g., +14155551234)");
    }

    // Check if there's already an active invite for this phone
    const existingInvite = await ctx.db
      .query("clientInvites")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (existingInvite) {
      throw new Error("An active invite already exists for this phone number");
    }

    // Generate a unique code
    let code = generateCode();
    let existing = await ctx.db
      .query("clientInvites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    while (existing) {
      code = generateCode();
      existing = await ctx.db
        .query("clientInvites")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
    }

    const inviteId = await ctx.db.insert("clientInvites", {
      code,
      role: args.role,
      phoneNumber: args.phoneNumber,
      firstName: args.firstName,
      lastName: args.lastName,
      message: args.message,
      createdBy: userId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      isActive: true,
      smsSent: false,
    });

    // Send SMS invitation
    const inviterName = `${profile.firstName} ${profile.lastName}`;
    await ctx.scheduler.runAfter(0, internal.sms.sendClientInviteSms, {
      phoneNumber: args.phoneNumber,
      inviteCode: code,
      role: args.role,
      inviterName,
    });

    // Mark SMS as sent
    await ctx.db.patch(inviteId, { smsSent: true });

    return { inviteId, code };
  },
});

// Create a client invite and send via both email and SMS
export const createClientInviteWithBoth = mutation({
  args: {
    role: v.union(
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    ),
    email: v.string(),
    phoneNumber: v.string(),
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    message: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has permission to invite clients
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.MANAGE_USERS) && 
        !hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to invite clients");
    }

    // Validate email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email address");
    }

    // Validate phone number format
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(args.phoneNumber)) {
      throw new Error("Invalid phone number format. Please use E.164 format (e.g., +14155551234)");
    }

    // Generate a unique code
    let code = generateCode();
    let existing = await ctx.db
      .query("clientInvites")
      .withIndex("by_code", (q) => q.eq("code", code))
      .unique();

    while (existing) {
      code = generateCode();
      existing = await ctx.db
        .query("clientInvites")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();
    }

    const inviteId = await ctx.db.insert("clientInvites", {
      code,
      role: args.role,
      email: args.email.toLowerCase(),
      phoneNumber: args.phoneNumber,
      firstName: args.firstName,
      lastName: args.lastName,
      message: args.message,
      createdBy: userId,
      createdAt: Date.now(),
      expiresAt: args.expiresAt,
      isActive: true,
      emailSent: false,
      smsSent: false,
    });

    const inviterName = `${profile.firstName} ${profile.lastName}`;

    // Send email invitation
    await ctx.scheduler.runAfter(0, internal.emails.sendClientInviteEmail, {
      recipientEmail: args.email.toLowerCase(),
      inviteCode: code,
      role: args.role,
      inviterName,
      recipientFirstName: args.firstName,
      message: args.message,
    });

    // Send SMS invitation
    await ctx.scheduler.runAfter(0, internal.sms.sendClientInviteSms, {
      phoneNumber: args.phoneNumber,
      inviteCode: code,
      role: args.role,
      inviterName,
    });

    // Mark both as sent
    await ctx.db.patch(inviteId, { emailSent: true, smsSent: true });

    return { inviteId, code };
  },
});

// Validate a client invite code
export const validateClientInvite = query({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const invite = await ctx.db
      .query("clientInvites")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!invite) {
      return { valid: false, error: "Invalid invite code" };
    }

    if (!invite.isActive) {
      return { valid: false, error: "This invite code has been deactivated" };
    }

    if (invite.usedBy) {
      return { valid: false, error: "This invite code has already been used" };
    }

    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      return { valid: false, error: "This invite code has expired" };
    }

    return {
      valid: true,
      role: invite.role,
      firstName: invite.firstName,
      lastName: invite.lastName,
    };
  },
});

// Use a client invite code (called during signup)
export const useClientInvite = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invite = await ctx.db
      .query("clientInvites")
      .withIndex("by_code", (q) => q.eq("code", args.code.toUpperCase()))
      .unique();

    if (!invite) {
      throw new Error("Invalid invite code");
    }

    if (!invite.isActive) {
      throw new Error("This invite code has been deactivated");
    }

    if (invite.usedBy) {
      throw new Error("This invite code has already been used");
    }

    if (invite.expiresAt && invite.expiresAt < Date.now()) {
      throw new Error("This invite code has expired");
    }

    // Mark invite as used
    await ctx.db.patch(invite._id, {
      usedBy: userId,
      usedAt: Date.now(),
      isActive: false,
    });

    return {
      role: invite.role,
      firstName: invite.firstName,
      lastName: invite.lastName,
    };
  },
});

// List all client invites (for admin view)
export const listClientInvites = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.VIEW_USERS) && 
        !hasPermission(permissions, PERMISSIONS.GENERATE_INVITE_CODES)) {
      throw new Error("You don't have permission to view client invites");
    }

    const invites = await ctx.db
      .query("clientInvites")
      .withIndex("by_creator", (q) => q.eq("createdBy", userId))
      .order("desc")
      .collect();

    // Enrich with creator info
    const enrichedInvites = await Promise.all(
      invites.map(async (invite) => {
        const creator = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", invite.createdBy))
          .unique();

        let usedByName: string | null = null;
        if (invite.usedBy) {
          const usedById = invite.usedBy; // Store in variable for type narrowing
          const usedByProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user_id", (q) => q.eq("userId", usedById))
            .unique();
          if (usedByProfile) {
            usedByName = `${usedByProfile.firstName} ${usedByProfile.lastName}`;
          }
        }

        return {
          ...invite,
          creatorName: creator ? `${creator.firstName} ${creator.lastName}` : "Unknown",
          usedByName,
        };
      })
    );

    return enrichedInvites;
  },
});

// Deactivate a client invite
export const deactivateClientInvite = mutation({
  args: {
    inviteId: v.id("clientInvites"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    // Only creator or admin can deactivate
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (invite.createdBy !== userId && !hasPermission(permissions, PERMISSIONS.MANAGE_USERS)) {
      throw new Error("You don't have permission to deactivate this invite");
    }

    await ctx.db.patch(args.inviteId, { isActive: false });
    return { success: true };
  },
});

// Resend invite notification
export const resendClientInvite = mutation({
  args: {
    inviteId: v.id("clientInvites"),
    method: v.union(v.literal("email"), v.literal("sms"), v.literal("both")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const invite = await ctx.db.get(args.inviteId);
    if (!invite) throw new Error("Invite not found");

    if (!invite.isActive) {
      throw new Error("Cannot resend a deactivated invite");
    }

    if (invite.usedBy) {
      throw new Error("Cannot resend an already used invite");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    
    const permissions = getEffectivePermissions(profile);
    if (invite.createdBy !== userId && !hasPermission(permissions, PERMISSIONS.MANAGE_USERS)) {
      throw new Error("You don't have permission to resend this invite");
    }

    const inviterName = `${profile.firstName} ${profile.lastName}`;

    if ((args.method === "email" || args.method === "both") && invite.email) {
      await ctx.scheduler.runAfter(0, internal.emails.sendClientInviteEmail, {
        recipientEmail: invite.email,
        inviteCode: invite.code,
        role: invite.role,
        inviterName,
        recipientFirstName: invite.firstName,
        message: invite.message,
      });
      await ctx.db.patch(args.inviteId, { emailSent: true });
    }

    if ((args.method === "sms" || args.method === "both") && invite.phoneNumber) {
      await ctx.scheduler.runAfter(0, internal.sms.sendClientInviteSms, {
        phoneNumber: invite.phoneNumber,
        inviteCode: invite.code,
        role: invite.role,
        inviterName,
      });
      await ctx.db.patch(args.inviteId, { smsSent: true });
    }

    return { success: true };
  },
});
