import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { requirePermission, formatUserName, getUserProfile } from "./helpers";
import { PERMISSIONS } from "./permissions";

// Create user group
export const createUserGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePermission(ctx, PERMISSIONS.MANAGE_USER_GROUPS);

    return await ctx.db.insert("userGroups", {
      ...args,
      createdBy: userId,
      isActive: true,
    });
  },
});

// List user groups
export const listUserGroups = query({
  args: {},
  handler: async (ctx) => {
    try {
      await requirePermission(ctx, PERMISSIONS.MANAGE_USER_GROUPS);
    } catch {
      return [];
    }

    return await ctx.db.query("userGroups").collect();
  },
});

// Add user to group
export const addUserToGroup = mutation({
  args: {
    groupId: v.id("userGroups"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const { userId: currentUserId } = await requirePermission(ctx, PERMISSIONS.MANAGE_USER_GROUPS);

    // Check if user is already in the group
    const existingMembership = await ctx.db
      .query("userGroupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (existingMembership) {
      throw new Error("User is already in this group");
    }

    return await ctx.db.insert("userGroupMembers", {
      ...args,
      addedBy: currentUserId,
    });
  },
});

// Remove user from group
export const removeUserFromGroup = mutation({
  args: {
    groupId: v.id("userGroups"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_USER_GROUPS);

    // Find the membership
    const membership = await ctx.db
      .query("userGroupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .first();

    if (!membership) {
      throw new Error("User is not in this group");
    }

    await ctx.db.delete(membership._id);
  },
});

// Get group members
export const getGroupMembers = query({
  args: { groupId: v.id("userGroups") },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, PERMISSIONS.MANAGE_USER_GROUPS);
    } catch {
      return [];
    }

    return await ctx.db
      .query("userGroupMembers")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();
  },
});
