import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getDefaultPermissions, hasPermission, PERMISSIONS, Permission } from "./permissions";

// Helper to get effective permissions for a user profile
function getEffectivePermissions(profile: { role: string; permissions?: string[] }): Permission[] {
  // If custom permissions are set, use those
  if (profile.permissions && profile.permissions.length > 0) {
    return profile.permissions as Permission[];
  }
  // Otherwise, use default permissions for the role
  return getDefaultPermissions(profile.role);
}

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
    if (!userId) throw new Error("Not authenticated");

    // Ensure this is the very first profile
    const anyProfile = await ctx.db.query("userProfiles").first();
    if (anyProfile) throw new Error("Bootstrap already completed");

    const user = await ctx.db.get(userId);
    if (!user) throw new Error("User not found");

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
    if (!userId) throw new Error("Not authenticated");

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
    if (!user) throw new Error("User not found");

    // Check if another user with the same email already has a profile
    if (user.email) {
      const allUsers = await ctx.db.query("users").collect();
      const usersWithSameEmail = allUsers.filter(
        (u) => u.email === user.email && u._id !== userId
      );

      if (usersWithSameEmail.length > 0) {
        // Check if any of these users have profiles
        for (const existingUser of usersWithSameEmail) {
          const existingUserProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user_id", (q) => q.eq("userId", existingUser._id))
            .unique();

          if (existingUserProfile) {
            throw new Error(
              `An account with email ${user.email} already exists. Please sign in instead of creating a new account.`
            );
          }
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
      const inviteCode = await ctx.db
        .query("inviteCodes")
        .withIndex("by_code", (q) =>
          q.eq("code", args.inviteCode!.toUpperCase())
        )
        .unique();

      if (!inviteCode) {
        throw new Error("Invalid invite code");
      }

      if (!inviteCode.isActive) {
        throw new Error("This invite code has been deactivated");
      }

      if (inviteCode.expiresAt && inviteCode.expiresAt < Date.now()) {
        throw new Error("This invite code has expired");
      }

      // Use the role from the invite code
      roleToAssign = inviteCode.role;
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
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

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
    if (!userId) throw new Error("Not authenticated");

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
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Check if current user has permission to update roles
    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", currentUserId))
      .unique();

    if (!currentProfile) throw new Error("Profile not found");
    
    const currentPermissions = getEffectivePermissions(currentProfile);
    
    // Check for UPDATE_USER_ROLES permission
    if (!hasPermission(currentPermissions, PERMISSIONS.UPDATE_USER_ROLES)) {
      throw new Error("You don't have permission to update user roles");
    }

    // Promoting to admin requires PROMOTE_TO_ADMIN permission (owner only by default)
    if (args.role === "admin") {
      if (!hasPermission(currentPermissions, PERMISSIONS.PROMOTE_TO_ADMIN)) {
        throw new Error("Only owners can promote users to admin");
      }
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!targetProfile) throw new Error("User profile not found");

    // Reset permissions to defaults when role changes
    await ctx.db.patch(targetProfile._id, {
      role: args.role,
      permissions: undefined, // Clear custom permissions, will use role defaults
    });
  },
});

// Owner-only: Promote a user to admin
export const promoteToAdmin = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", currentUserId))
      .unique();

    if (!currentProfile) throw new Error("Profile not found");
    
    const currentPermissions = getEffectivePermissions(currentProfile);
    
    // Check for PROMOTE_TO_ADMIN permission
    if (!hasPermission(currentPermissions, PERMISSIONS.PROMOTE_TO_ADMIN)) {
      throw new Error("Only owners can promote users to admin");
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!targetProfile) throw new Error("User profile not found");

    await ctx.db.patch(targetProfile._id, { 
      role: "admin",
      permissions: undefined, // Use default admin permissions
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
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", currentUserId))
      .unique();

    if (!currentProfile) throw new Error("Profile not found");
    
    const currentPermissions = getEffectivePermissions(currentProfile);
    
    // Check for MANAGE_USERS permission
    if (!hasPermission(currentPermissions, PERMISSIONS.MANAGE_USERS)) {
      throw new Error("You don't have permission to manage users");
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!targetProfile) throw new Error("User profile not found");

    // Cannot modify owner permissions
    if (targetProfile.role === "owner") {
      throw new Error("Cannot modify owner permissions");
    }

    // Cannot grant PROMOTE_TO_ADMIN unless you have it yourself
    if (args.permissions.includes(PERMISSIONS.PROMOTE_TO_ADMIN)) {
      if (!hasPermission(currentPermissions, PERMISSIONS.PROMOTE_TO_ADMIN)) {
        throw new Error("Only owners can grant the PROMOTE_TO_ADMIN permission");
      }
    }

    await ctx.db.patch(targetProfile._id, {
      permissions: args.permissions,
    });
  },
});

// Reset user permissions to role defaults (requires MANAGE_USERS permission)
export const resetUserPermissions = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", currentUserId))
      .unique();

    if (!currentProfile) throw new Error("Profile not found");
    
    const currentPermissions = getEffectivePermissions(currentProfile);
    
    // Check for MANAGE_USERS permission
    if (!hasPermission(currentPermissions, PERMISSIONS.MANAGE_USERS)) {
      throw new Error("You don't have permission to manage users");
    }

    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!targetProfile) throw new Error("User profile not found");

    // Cannot modify owner permissions
    if (targetProfile.role === "owner") {
      throw new Error("Cannot modify owner permissions");
    }

    await ctx.db.patch(targetProfile._id, {
      permissions: undefined, // Reset to role defaults
    });
  },
});

// List all users (requires VIEW_USERS permission)
export const listUsers = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const currentProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!currentProfile) throw new Error("Profile not found");
    
    const currentPermissions = getEffectivePermissions(currentProfile);
    
    if (!hasPermission(currentPermissions, PERMISSIONS.VIEW_USERS)) {
      throw new Error("You don't have permission to view users");
    }

    const profiles = await ctx.db.query("userProfiles").collect();

    // Get user details for each profile
    const usersWithProfiles = await Promise.all(
      profiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        const effectivePermissions = getEffectivePermissions(profile);
        return {
          ...profile,
          email: user?.email,
          name: user?.name,
          effectivePermissions,
        };
      })
    );

    return usersWithProfiles;
  },
});

// Get all admin users (no auth required - for CLI access)
export const getAdminsForCLI = query({
  args: {},
  handler: async (ctx) => {
    // Get all admin profiles
    const adminProfiles = await ctx.db
      .query("userProfiles")
      .withIndex("by_role", (q) => q.eq("role", "admin"))
      .collect();

    // Get user details for each admin profile
    const adminsWithDetails = await Promise.all(
      adminProfiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          userId: profile.userId,
          email: user?.email,
          name: user?.name,
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: profile.role,
          isActive: profile.isActive,
          createdAt: profile._creationTime,
        };
      })
    );

    return adminsWithDetails;
  },
});

// CLI-only: Promote user to admin (no auth required)
export const promoteToAdminCLI = mutation({
  args: {
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const targetProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();

    if (!targetProfile) throw new Error("User profile not found");

    await ctx.db.patch(targetProfile._id, {
      role: "admin",
    });

    return { success: true, message: `User ${args.userId} promoted to admin` };
  },
});

// CLI-only: Delete duplicate users by email (no auth required)
export const deleteDuplicateUsersCLI = mutation({
  args: {
    email: v.string(),
    keepRole: v.optional(
      v.union(
        v.literal("admin"),
        v.literal("client"),
        v.literal("professional"),
        v.literal("parent")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Find all users with this email
    const allUsers = await ctx.db.query("users").collect();
    const usersWithEmail = allUsers.filter((user) => user.email === args.email);

    if (usersWithEmail.length <= 1) {
      return { message: "No duplicates found", email: args.email };
    }

    // Get profiles for these users
    const profilesWithUsers = await Promise.all(
      usersWithEmail.map(async (user) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", user._id))
          .unique();
        return { user, profile };
      })
    );

    // Keep the user with the specified role, or the first admin, or the first user
    let userToKeep = profilesWithUsers.find(
      ({ profile }) => profile?.role === (args.keepRole || "admin")
    );

    if (!userToKeep) {
      userToKeep = profilesWithUsers.find(
        ({ profile }) => profile?.role === "admin"
      );
    }

    if (!userToKeep) {
      userToKeep = profilesWithUsers[0];
    }

    // Delete the duplicates
    const results = [];
    for (const { user, profile } of profilesWithUsers) {
      if (user._id !== userToKeep.user._id) {
        try {
          // Delete profile if exists
          if (profile) {
            await ctx.db.delete(profile._id);
          }

          // Delete auth accounts for this user
          const authAccounts = await ctx.db
            .query("authAccounts")
            .filter((q) => q.eq(q.field("userId"), user._id))
            .collect();

          for (const account of authAccounts) {
            await ctx.db.delete(account._id);
          }

          // Delete user
          await ctx.db.delete(user._id);

          results.push({
            userId: user._id,
            email: user.email,
            role: profile?.role,
            status: "deleted",
          });
        } catch (error) {
          results.push({
            userId: user._id,
            email: user.email,
            role: profile?.role,
            status: "error",
            error: error instanceof Error ? error.message : String(error),
          });
        }
      } else {
        results.push({
          userId: user._id,
          email: user.email,
          role: profile?.role,
          status: "kept",
        });
      }
    }

    return {
      message: `Processed ${usersWithEmail.length} accounts for ${args.email}`,
      results,
    };
  },
});

// CLI-only: Delete all anonymous users (no auth required)
export const deleteAnonymousUsersCLI = mutation({
  args: {},
  handler: async (ctx) => {
    // Find all anonymous auth accounts
    const anonymousAccounts = await ctx.db
      .query("authAccounts")
      .filter((q) => q.eq(q.field("provider"), "anonymous"))
      .collect();

    let deletedCount = 0;
    const results = [];

    for (const account of anonymousAccounts) {
      try {
        // Get user profile
        const userProfile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", account.userId))
          .unique();

        // Delete user profile if exists
        if (userProfile) {
          await ctx.db.delete(userProfile._id);
        }

        // Delete auth account
        await ctx.db.delete(account._id);

        // Delete user record
        await ctx.db.delete(account.userId);

        deletedCount++;
        results.push({
          userId: account.userId,
          status: "deleted",
          hadProfile: !!userProfile,
        });
      } catch (error) {
        results.push({
          userId: account.userId,
          status: "error",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: true,
      message: `Deleted ${deletedCount} anonymous users`,
      totalFound: anonymousAccounts.length,
      deletedCount,
      details: results,
    };
  },
});
