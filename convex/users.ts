import { query, mutation, internalQuery } from "./_generated/server";
import { ConvexError, v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { canDeleteUser, getEffectivePermissions, hasPermission, PERMISSIONS } from "./permissions";
import { requireAuth, requirePermission, getUserProfile } from "./helpers";

// Get current user profile
export const getCurrentUserProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) {
      // For queries, we can't insert data, so return null
      // The mutation below will handle profile creation
      return null;
    }

    // A removed account keeps its profile but gets no access.
    if (profile.deletedAt !== undefined) {
      return { ...profile, profilePictureUrl: null, effectivePermissions: [], isRemoved: true as const };
    }

    // Get profile picture URL if exists
    let profilePictureUrl = null;
    if (profile.profilePictureId) {
      profilePictureUrl = await ctx.storage.getUrl(profile.profilePictureId);
    }

    // Get effective permissions (custom or default based on role)
    const effectivePermissions = getEffectivePermissions(profile);

    return {
      ...profile,
      profilePictureUrl,
      effectivePermissions,
      isRemoved: false as const,
    };
  },
});

// Create the initial OWNER profile (only when no profiles exist)
export const createOwnerProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Ensure this is the very first profile
    const anyProfile = await ctx.db.query("userProfiles").first();
    if (anyProfile) throw new ConvexError("Bootstrap already completed");

    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found");

    const newProfile = await ctx.db.insert("userProfiles", {
      userId,
      role: "owner",
      firstName: args.firstName || user.name?.split(" ")[0] || "Owner",
      lastName: args.lastName || user.name?.split(" ").slice(1).join(" ") || "",
      isActive: true,
    });

    return newProfile;
  },
});

// Check if initial bootstrap is needed (no user profiles exist)
export const bootstrapNeeded = query({
  args: {},
  handler: async (ctx) => {
    const anyProfile = await ctx.db.query("userProfiles").first();
    return !anyProfile;
  },
});

// Create user profile (called when user first logs in)
export const createUserProfile = mutation({
  args: {
    firstName: v.optional(v.string()),
    lastName: v.optional(v.string()),
    role: v.optional(
      v.union(
        v.literal("client"),
        v.literal("professional"),
        v.literal("parent")
      )
    ),
    inviteCode: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    // Check if profile already exists
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (existingProfile) {
      return existingProfile._id;
    }

    // Get user info
    const user = await ctx.db.get(userId);
    if (!user) throw new ConvexError("User not found");

    // Check if another user with the same email already has a profile
    if (user.email) {
      // Look up other auth accounts with the same email (avoids full table scan)
      const authAccountsWithEmail = await ctx.db
        .query("authAccounts")
        .filter((q) =>
          q.and(
            q.eq(q.field("providerAccountId"), user.email!.toLowerCase()),
            q.neq(q.field("userId"), userId)
          )
        )
        .collect();

      for (const account of authAccountsWithEmail) {
        const existingUserProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", account.userId))
          .unique();

        if (existingUserProfile) {
          throw new ConvexError(
            `An account with email ${user.email} already exists. Please sign in instead of creating a new account.`
          );
        }
      }

      // Check for approved join request (unless they have an invite code)
      if (!args.inviteCode) {
        const joinRequest = await ctx.db
          .query("joinRequests")
          .withIndex("by_email", (q) => q.eq("email", user.email!.toLowerCase()))
          .order("desc")
          .first();

        if (!joinRequest || joinRequest.status !== "approved") {
          throw new ConvexError(
            "You need an approved join request to create an account. Please request access first or contact support."
          );
        }

        // Mark join request as account created
        if (!joinRequest.accountCreatedAt) {
          await ctx.db.patch(joinRequest._id, {
            accountCreatedAt: Date.now(),
            userId: userId,
          });
        }
      }
    }

    // Determine the role based on invite code or provided role
    let roleToAssign:
      | "admin"
      | "editor"
      | "contributor"
      | "client"
      | "parent"
      | "professional" = args.role || "client";

    // If invite code is provided, validate and use it
    if (args.inviteCode && args.inviteCode.trim() !== "") {
      const code = args.inviteCode.toUpperCase();

      // Check staff invite codes first
      const staffInvite = await ctx.db
        .query("inviteCodes")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();

      // Also check client invite codes
      const clientInvite = await ctx.db
        .query("clientInvites")
        .withIndex("by_code", (q) => q.eq("code", code))
        .unique();

      if (staffInvite) {
        if (!staffInvite.isActive) throw new ConvexError("This invite code has been deactivated");
        if (staffInvite.expiresAt && staffInvite.expiresAt < Date.now()) throw new ConvexError("This invite code has expired");
        roleToAssign = staffInvite.role;
      } else if (clientInvite) {
        if (!clientInvite.isActive) throw new ConvexError("This invite code has been deactivated");
        if (clientInvite.usedBy) throw new ConvexError("This invite code has already been used");
        if (clientInvite.expiresAt && clientInvite.expiresAt < Date.now()) throw new ConvexError("This invite code has expired");
        roleToAssign = clientInvite.role;

        // Mark client invite as used
        await ctx.db.patch(clientInvite._id, {
          usedBy: userId,
          usedAt: Date.now(),
        });
      } else {
        throw new ConvexError("Invalid invite code");
      }
    }

    const newProfile = await ctx.db.insert("userProfiles", {
      userId,
      role: roleToAssign,
      firstName: args.firstName || user.name?.split(" ")[0] || "User",
      lastName: args.lastName || user.name?.split(" ").slice(1).join(" ") || "",
      isActive: true,
    });

    return newProfile;
  },
});

// Update user profile
export const updateProfile = mutation({
  args: {
    firstName: v.string(),
    lastName: v.string(),
    profilePictureId: v.optional(v.id("_storage")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new ConvexError("Profile not found");

    await ctx.db.patch(profile._id, {
      firstName: args.firstName,
      lastName: args.lastName,
      profilePictureId: args.profilePictureId || undefined,
    });
  },
});

// Generate upload URL for profile pictures
export const generateProfilePictureUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");

    return await ctx.storage.generateUploadUrl();
  },
});

// Admin: Update user role
export const updateUserRole = mutation({
  args: {
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("contributor"),
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    ),
  },
  handler: async (ctx, args) => {
    const { permissions } = await requirePermission(ctx, PERMISSIONS.UPDATE_USER_ROLES);

    // Promoting to admin requires PROMOTE_TO_ADMIN permission (owner only by default)
    if (args.role === "admin") {
      if (!hasPermission(permissions, PERMISSIONS.PROMOTE_TO_ADMIN)) {
        throw new ConvexError("Only owners can promote users to admin");
      }
    }

    const targetProfile = await getUserProfile(ctx, args.userId);
    if (!targetProfile) throw new ConvexError("User profile not found");
    if (targetProfile.deletedAt !== undefined) {
      throw new ConvexError("This user has been removed");
    }

    await ctx.db.patch(targetProfile._id, {
      role: args.role,
      permissions: undefined,
    });
  },
});

// Owner-only: Promote a user to admin
export const promoteToAdmin = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.PROMOTE_TO_ADMIN);

    const targetProfile = await getUserProfile(ctx, args.userId);
    if (!targetProfile) throw new ConvexError("User profile not found");
    if (targetProfile.deletedAt !== undefined) {
      throw new ConvexError("This user has been removed");
    }

    await ctx.db.patch(targetProfile._id, {
      role: "admin",
      permissions: undefined,
    });
  },
});

// Update user permissions (requires MANAGE_USERS permission)
export const updateUserPermissions = mutation({
  args: {
    userId: v.id("users"),
    permissions: v.array(v.string()),
  },
  handler: async (ctx, args) => {
    const { permissions: callerPerms } = await requirePermission(ctx, PERMISSIONS.MANAGE_USERS);

    const targetProfile = await getUserProfile(ctx, args.userId);
    if (!targetProfile) throw new ConvexError("User profile not found");
    if (targetProfile.deletedAt !== undefined) {
      throw new ConvexError("This user has been removed");
    }

    if (targetProfile.role === "owner") {
      throw new ConvexError("Cannot modify owner permissions");
    }

    if (args.permissions.includes(PERMISSIONS.PROMOTE_TO_ADMIN)) {
      if (!hasPermission(callerPerms, PERMISSIONS.PROMOTE_TO_ADMIN)) {
        throw new ConvexError("Only owners can grant the PROMOTE_TO_ADMIN permission");
      }
    }

    await ctx.db.patch(targetProfile._id, { permissions: args.permissions });
  },
});

// Reset user permissions to role defaults (requires MANAGE_USERS permission)
export const resetUserPermissions = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_USERS);

    const targetProfile = await getUserProfile(ctx, args.userId);
    if (!targetProfile) throw new ConvexError("User profile not found");
    if (targetProfile.deletedAt !== undefined) {
      throw new ConvexError("This user has been removed");
    }

    if (targetProfile.role === "owner") {
      throw new ConvexError("Cannot modify owner permissions");
    }

    await ctx.db.patch(targetProfile._id, { permissions: undefined });
  },
});

// Remove a user. Nothing is deleted: the profile is flagged with deletedAt,
// their sessions are ended, and the sign-in gate refuses them from then on.
// Owners can remove anyone but themselves; admins only people below admin.
export const deleteUser = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const { userId: callerId, profile: callerProfile, permissions } =
      await requirePermission(ctx, PERMISSIONS.DELETE_USERS);

    if (args.userId === callerId) {
      throw new ConvexError("You can't delete your own account");
    }

    const targetProfile = await getUserProfile(ctx, args.userId);
    if (!targetProfile) throw new ConvexError("User profile not found");
    if (targetProfile.deletedAt !== undefined) {
      throw new ConvexError("This user has already been removed");
    }
    if (
      !canDeleteUser(
        { userId: callerId, role: callerProfile.role, permissions },
        { userId: args.userId, role: targetProfile.role },
      )
    ) {
      throw new ConvexError("Only owners can delete owners and admins");
    }

    await ctx.db.patch(targetProfile._id, {
      isActive: false,
      deletedAt: Date.now(),
      deletedBy: callerId,
    });

    // End every session so no refresh token can renew access.
    const sessions = await ctx.db
      .query("authSessions")
      .withIndex("userId", (q) => q.eq("userId", args.userId))
      .collect();
    for (const session of sessions) {
      const tokens = await ctx.db
        .query("authRefreshTokens")
        .withIndex("sessionId", (q) => q.eq("sessionId", session._id))
        .collect();
      for (const token of tokens) await ctx.db.delete(token._id);
      await ctx.db.delete(session._id);
    }
  },
});

// Used by the sign-in gate (convex/authGate.ts): is this email or user removed?
export const isAccountRemoved = internalQuery({
  args: { email: v.optional(v.string()), userId: v.optional(v.string()) },
  handler: async (ctx, args) => {
    const userIds = new Set<string>();
    if (args.userId) userIds.add(args.userId);
    if (args.email) {
      const email = args.email.trim().toLowerCase();
      const accounts = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", "password").eq("providerAccountId", email),
        )
        .collect();
      for (const account of accounts) userIds.add(account.userId);
      const users = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .collect();
      for (const user of users) userIds.add(user._id);
    }
    for (const id of userIds) {
      const normalized = ctx.db.normalizeId("users", id);
      if (!normalized) continue;
      const profile = await getUserProfile(ctx, normalized);
      if (profile?.deletedAt !== undefined) return true;
    }
    return false;
  },
});

// List all users (requires VIEW_USERS permission)
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, PERMISSIONS.VIEW_USERS);

    const profiles = await ctx.db.query("userProfiles").collect();

    return Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const effectivePermissions = getEffectivePermissions(profile);
        return {
          ...profile,
          email: user?.email,
          name: user?.name,
          effectivePermissions,
          isRemoved: profile.deletedAt !== undefined,
        };
      })
    );
  },
});

// REMOVED: getAdminsForCLI - was unauthenticated, use listUsers instead
// REMOVED: promoteToAdminCLI - was unauthenticated, use promoteToAdmin instead
// REMOVED: deleteDuplicateUsersCLI - was unauthenticated, use Convex dashboard
// REMOVED: deleteAnonymousUsersCLI - was unauthenticated, use Convex dashboard
// All admin operations now require authentication via the standard mutations above.

