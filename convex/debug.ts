import { query } from "./_generated/server";
import { v } from "convex/values";

/**
 * Debug query to check if a user exists by email
 * Usage: npx convex run debug:checkUserByEmail '{"email": "user@example.com"}'
 */
export const checkUserByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    // Check users table
    const allUsers = await ctx.db.query("users").collect();
    const user = allUsers.find((u) => u.email?.toLowerCase() === email);

    if (!user) {
      return {
        exists: false,
        message: `No user found with email: ${args.email}`,
      };
    }

    // Check if they have a profile
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", user._id))
      .first();

    // Check for join requests
    const joinRequest = await ctx.db
      .query("joinRequests")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .first();

    return {
      exists: true,
      user: {
        id: user._id,
        email: user.email,
        name: user.name,
        createdAt: new Date(user._creationTime).toISOString(),
      },
      profile: profile
        ? {
            id: profile._id,
            role: profile.role,
            firstName: profile.firstName,
            lastName: profile.lastName,
            isActive: profile.isActive,
          }
        : null,
      joinRequest: joinRequest
        ? {
            id: joinRequest._id,
            status: joinRequest.status,
            emailVerified: joinRequest.emailVerified ?? null,
            createdAt: new Date(joinRequest.createdAt).toISOString(),
            reviewedAt: joinRequest.reviewedAt
              ? new Date(joinRequest.reviewedAt).toISOString()
              : null,
          }
        : null,
    };
  },
});

/**
 * Debug query to list all users
 * Usage: npx convex run debug:listAllUsers
 */
export const listAllUsers = query({
  args: {},
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    const usersWithDetails = await Promise.all(
      users.map(async (user) => {
        const profile = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", user._id))
          .first();

        return {
          id: user._id,
          email: user.email,
          name: user.name,
          hasProfile: !!profile,
          profileRole: profile?.role,
          createdAt: new Date(user._creationTime).toISOString(),
        };
      })
    );

    return {
      total: usersWithDetails.length,
      users: usersWithDetails,
    };
  },
});

/**
 * Debug query to list all admin/owner users
 * Usage: npx convex run debug:listAdmins
 */
export const listAdmins = query({
  args: {},
  handler: async (ctx) => {
    // Get all admin and owner profiles
    const adminProfiles = await ctx.db
      .query("userProfiles")
      .filter((q) =>
        q.or(q.eq(q.field("role"), "admin"), q.eq(q.field("role"), "owner"))
      )
      .collect();

    // Get user details for each admin/owner profile
    const adminsWithDetails = await Promise.all(
      adminProfiles.map(async (profile) => {
        const user = await ctx.db.get(profile.userId);
        return {
          userId: profile.userId,
          email: user?.email || "No email",
          name: user?.name || "No name",
          firstName: profile.firstName,
          lastName: profile.lastName,
          role: profile.role,
          isActive: profile.isActive,
          createdAt: new Date(profile._creationTime).toISOString(),
        };
      })
    );

    return {
      total: adminsWithDetails.length,
      admins: adminsWithDetails,
    };
  },
});

/**
 * Debug query to check join requests by email
 * Usage: npx convex run debug:checkJoinRequestByEmail '{"email": "user@example.com"}'
 */
export const checkJoinRequestByEmail = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const email = args.email.toLowerCase();

    const joinRequests = await ctx.db
      .query("joinRequests")
      .withIndex("by_email", (q) => q.eq("email", email))
      .order("desc")
      .collect();

    return {
      email: args.email,
      count: joinRequests.length,
      requests: joinRequests.map((req) => ({
        id: req._id,
        firstName: req.firstName,
        lastName: req.lastName,
        status: req.status,
        emailVerified: req.emailVerified ?? null,
        createdAt: new Date(req.createdAt).toISOString(),
        reviewedAt: req.reviewedAt
          ? new Date(req.reviewedAt).toISOString()
          : null,
        verifiedAt: req.verifiedAt
          ? new Date(req.verifiedAt).toISOString()
          : null,
      })),
    };
  },
});

/**
 * Debug query to list all join requests (for testing)
 * Usage: npx convex run debug:listAllJoinRequests
 */
export const listAllJoinRequests = query({
  args: {},
  handler: async (ctx) => {
    const requests = await ctx.db.query("joinRequests").order("desc").collect();

    return {
      total: requests.length,
      requests: requests.map((req) => ({
        id: req._id,
        email: req.email,
        firstName: req.firstName,
        lastName: req.lastName,
        status: req.status,
        emailVerified: req.emailVerified ?? null,
        createdAt: new Date(req.createdAt).toISOString(),
        reviewedAt: req.reviewedAt
          ? new Date(req.reviewedAt).toISOString()
          : null,
        verifiedAt: req.verifiedAt
          ? new Date(req.verifiedAt).toISOString()
          : null,
      })),
    };
  },
});
