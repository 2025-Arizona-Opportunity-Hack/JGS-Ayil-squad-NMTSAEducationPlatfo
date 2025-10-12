import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create content group
export const createContentGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can create content groups");
    }

    return await ctx.db.insert("contentGroups", {
      ...args,
      createdBy: userId,
      isActive: true,
    });
  },
});

// List content groups
export const listContentGroups = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      return [];
    }

    return await ctx.db.query("contentGroups").collect();
  },
});

// Get content group with items
export const getContentGroupWithItems = query({
  args: { groupId: v.id("contentGroups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      return null;
    }

    const group = await ctx.db.get(args.groupId);
    if (!group) return null;

    const groupItems = await ctx.db
      .query("contentGroupItems")
      .withIndex("by_group_order", (q) => q.eq("groupId", args.groupId))
      .collect();

    const contentItems = [];
    for (const item of groupItems) {
      const content = await ctx.db.get(item.contentId);
      if (content) {
        contentItems.push({
          ...content,
          groupItemId: item._id,
          order: item.order,
        });
      }
    }

    return {
      ...group,
      items: contentItems,
    };
  },
});

// Add content to group
export const addContentToGroup = mutation({
  args: {
    groupId: v.id("contentGroups"),
    contentId: v.id("content"),
    order: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can manage content groups");
    }

    // Check if content is already in the group
    const existingItem = await ctx.db
      .query("contentGroupItems")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("contentId"), args.contentId))
      .first();

    if (existingItem) {
      throw new Error("Content is already in this group");
    }

    return await ctx.db.insert("contentGroupItems", {
      groupId: args.groupId,
      contentId: args.contentId,
      addedBy: userId,
      order: args.order,
    });
  },
});

// Remove content from group
export const removeContentFromGroup = mutation({
  args: {
    groupItemId: v.id("contentGroupItems"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.role !== "admin") {
      throw new Error("Only admins can manage content groups");
    }

    const groupItem = await ctx.db.get(args.groupItemId);
    if (!groupItem) {
      throw new Error("Content group item not found");
    }

    await ctx.db.delete(args.groupItemId);
  },
});

// Grant content group access
export const grantContentGroupAccess = mutation({
  args: {
    groupId: v.id("contentGroups"),
    userId: v.optional(v.id("users")),
    userGroupId: v.optional(v.id("userGroups")),
    role: v.optional(v.union(
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    )),
    expiresAt: v.optional(v.number()),
    canShare: v.boolean(),
  },
  handler: async (ctx, args) => {
    const currentUserId = await getAuthUserId(ctx);
    if (!currentUserId) throw new Error("Not authenticated");

    // Check if current user is admin
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", currentUserId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can grant content group access");
    }

    return await ctx.db.insert("contentGroupAccess", {
      ...args,
      grantedBy: currentUserId,
    });
  },
});

// Get available content (not in group)
export const getAvailableContent = query({
  args: { groupId: v.id("contentGroups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      return [];
    }

    // Get all content
    const allContent = await ctx.db.query("content").collect();

    // Get content already in this group
    const groupItems = await ctx.db
      .query("contentGroupItems")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const contentInGroup = new Set(groupItems.map(item => item.contentId));

    // Return content not in the group
    return allContent.filter(content => !contentInGroup.has(content._id));
  },
});

// List all content group items (for filtering)
export const listAllContentGroupItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      return [];
    }

    return await ctx.db.query("contentGroupItems").collect();
  },
});
