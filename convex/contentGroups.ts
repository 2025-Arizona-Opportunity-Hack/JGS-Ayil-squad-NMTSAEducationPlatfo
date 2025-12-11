import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create content group (bundle)
export const createContentGroup = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    thumbnailId: v.optional(v.id("_storage")),
    isPublic: v.optional(v.boolean()),
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
      isPublic: args.isPublic ?? false,
    });
  },
});

// Update content group (bundle)
export const updateContentGroup = mutation({
  args: {
    groupId: v.id("contentGroups"),
    name: v.string(),
    description: v.optional(v.string()),
    thumbnailId: v.optional(v.id("_storage")),
    isPublic: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
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
      throw new Error("Only admins or the owner can update content groups");
    }

    const { groupId, ...updateData } = args;
    await ctx.db.patch(groupId, updateData);
  },
});

// Delete content group
export const deleteContentGroup = mutation({
  args: {
    groupId: v.id("contentGroups"),
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
      throw new Error("Only admins or the owner can delete content groups");
    }

    // Delete all items in the group
    const groupItems = await ctx.db
      .query("contentGroupItems")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    for (const item of groupItems) {
      await ctx.db.delete(item._id);
    }

    // Delete bundle pricing
    const bundlePricing = await ctx.db
      .query("bundlePricing")
      .withIndex("by_bundle", (q) => q.eq("bundleId", args.groupId))
      .collect();

    for (const pricing of bundlePricing) {
      await ctx.db.delete(pricing._id);
    }

    // Delete the group
    await ctx.db.delete(args.groupId);
  },
});

// List content groups (with thumbnail URLs and pricing)
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

    const groups = await ctx.db.query("contentGroups").collect();

    // Enrich with thumbnail URLs, item counts, and pricing
    const enrichedGroups = await Promise.all(
      groups.map(async (group) => {
        // Get thumbnail URL
        const thumbnailUrl = group.thumbnailId 
          ? await ctx.storage.getUrl(group.thumbnailId) 
          : null;

        // Get item count
        const items = await ctx.db
          .query("contentGroupItems")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();

        // Get active pricing
        const pricing = await ctx.db
          .query("bundlePricing")
          .withIndex("by_bundle", (q) => q.eq("bundleId", group._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        return {
          ...group,
          thumbnailUrl,
          itemCount: items.length,
          pricing: pricing ? {
            _id: pricing._id,
            price: pricing.price,
            currency: pricing.currency,
            accessDuration: pricing.accessDuration,
          } : null,
        };
      })
    );

    return enrichedGroups;
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

// ============ Bundle Pricing Functions ============

// Set bundle pricing
export const setBundlePricing = mutation({
  args: {
    bundleId: v.id("contentGroups"),
    price: v.number(), // Price in cents
    currency: v.string(),
    accessDuration: v.optional(v.number()), // Duration in milliseconds
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
      throw new Error("Only admins or the owner can set bundle pricing");
    }

    // Check if bundle exists
    const bundle = await ctx.db.get(args.bundleId);
    if (!bundle) throw new Error("Bundle not found");

    // Deactivate any existing pricing
    const existingPricing = await ctx.db
      .query("bundlePricing")
      .withIndex("by_bundle", (q) => q.eq("bundleId", args.bundleId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const pricing of existingPricing) {
      await ctx.db.patch(pricing._id, { isActive: false });
    }

    // Create new pricing
    return await ctx.db.insert("bundlePricing", {
      bundleId: args.bundleId,
      price: args.price,
      currency: args.currency,
      accessDuration: args.accessDuration,
      isActive: true,
      createdBy: userId,
      createdAt: Date.now(),
    });
  },
});

// Remove bundle pricing
export const removeBundlePricing = mutation({
  args: {
    bundleId: v.id("contentGroups"),
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
      throw new Error("Only admins or the owner can remove bundle pricing");
    }

    // Deactivate all pricing for this bundle
    const existingPricing = await ctx.db
      .query("bundlePricing")
      .withIndex("by_bundle", (q) => q.eq("bundleId", args.bundleId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    for (const pricing of existingPricing) {
      await ctx.db.patch(pricing._id, { isActive: false });
    }
  },
});

// Get bundle pricing
export const getBundlePricing = query({
  args: {
    bundleId: v.id("contentGroups"),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("bundlePricing")
      .withIndex("by_bundle", (q) => q.eq("bundleId", args.bundleId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
  },
});

// List all bundle pricing (for admin)
export const listAllBundlePricing = query({
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

    const allPricing = await ctx.db
      .query("bundlePricing")
      .filter((q) => q.eq(q.field("isActive"), true))
      .collect();

    // Enrich with bundle info
    const enrichedPricing = await Promise.all(
      allPricing.map(async (pricing) => {
        const bundle = await ctx.db.get(pricing.bundleId);
        return {
          ...pricing,
          bundleName: bundle?.name || "Unknown Bundle",
        };
      })
    );

    return enrichedPricing;
  },
});

// Generate upload URL for bundle thumbnails
export const generateBundleThumbnailUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can upload bundle thumbnails");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Bulk add content to a group
export const bulkAddContentToGroup = mutation({
  args: {
    groupId: v.id("contentGroups"),
    contentIds: v.array(v.id("content")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can manage content groups");
    }

    // Check if group exists
    const group = await ctx.db.get(args.groupId);
    if (!group) throw new Error("Content group not found");

    // Get existing items in the group
    const existingItems = await ctx.db
      .query("contentGroupItems")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .collect();

    const existingContentIds = new Set(existingItems.map(item => item.contentId));

    // Get max order
    const maxOrder = existingItems.reduce((max, item) => Math.max(max, item.order || 0), 0);

    let added = 0;
    let order = maxOrder;
    for (const contentId of args.contentIds) {
      // Skip if already in group
      if (existingContentIds.has(contentId)) continue;

      // Check if content exists
      const content = await ctx.db.get(contentId);
      if (!content) continue;

      order++;
      await ctx.db.insert("contentGroupItems", {
        groupId: args.groupId,
        contentId,
        addedBy: userId,
        order,
      });
      added++;
    }

    return { added, groupName: group.name };
  },
});

// Create a new group and add content to it
export const createGroupWithContent = mutation({
  args: {
    name: v.string(),
    description: v.optional(v.string()),
    contentIds: v.array(v.id("content")),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can create content groups");
    }

    // Create the group
    const groupId = await ctx.db.insert("contentGroups", {
      name: args.name,
      description: args.description,
      createdBy: userId,
      isActive: true,
      isPublic: false,
    });

    // Add content to the group
    let added = 0;
    for (let i = 0; i < args.contentIds.length; i++) {
      const contentId = args.contentIds[i];
      const content = await ctx.db.get(contentId);
      if (!content) continue;

      await ctx.db.insert("contentGroupItems", {
        groupId,
        contentId,
        addedBy: userId,
        order: i + 1,
      });
      added++;
    }

    return { groupId, added, groupName: args.name };
  },
});
