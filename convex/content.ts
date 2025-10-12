import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create content
export const createContent = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("video"),
      v.literal("article"),
      v.literal("document"),
      v.literal("audio")
    ),
    fileId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()),
    richTextContent: v.optional(v.string()),
    isPublic: v.boolean(),
    tags: v.optional(v.array(v.string())),
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
      throw new Error("Only admins can create content");
    }

    return await ctx.db.insert("content", {
      ...args,
      createdBy: userId,
    });
  },
});

// List content (with access control)
export const listContent = query({
  args: {
    type: v.optional(v.union(
      v.literal("video"),
      v.literal("article"),
      v.literal("document"),
      v.literal("audio")
    )),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return [];

    let allContent;
    
    if (args.type) {
      allContent = await ctx.db
        .query("content")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    } else {
      allContent = await ctx.db.query("content").collect();
    }

    // Filter content based on access
    const accessibleContent = [];

    for (const content of allContent) {
      // Public content is always accessible
      if (content.isPublic) {
        accessibleContent.push(content);
        continue;
      }

      // Admins can see all content
      if (profile.role === "admin") {
        accessibleContent.push(content);
        continue;
      }

      // Check specific access permissions
      const hasAccess = await checkContentAccess(ctx, content._id, userId, profile.role);
      if (hasAccess) {
        accessibleContent.push(content);
      }
    }

    return accessibleContent;
  },
});

// Helper function to check content access
async function checkContentAccess(ctx: any, contentId: any, userId: any, userRole: string) {
  // Check direct user access
  const userAccess = await ctx.db
    .query("contentAccess")
    .withIndex("by_content", (q: any) => q.eq("contentId", contentId))
    .filter((q: any) => q.eq(q.field("userId"), userId))
    .first();

  if (userAccess && (!userAccess.expiresAt || userAccess.expiresAt > Date.now())) {
    return true;
  }

  // Check role-based access
  const roleAccess = await ctx.db
    .query("contentAccess")
    .withIndex("by_content", (q: any) => q.eq("contentId", contentId))
    .filter((q: any) => q.eq(q.field("role"), userRole))
    .first();

  if (roleAccess && (!roleAccess.expiresAt || roleAccess.expiresAt > Date.now())) {
    return true;
  }

  // Check user group access
  const userGroups = await ctx.db
    .query("userGroupMembers")
    .withIndex("by_user", (q: any) => q.eq("userId", userId))
    .collect();

  for (const membership of userGroups) {
    const groupAccess = await ctx.db
      .query("contentAccess")
      .withIndex("by_group", (q: any) => q.eq("userGroupId", membership.groupId))
      .first();

    if (groupAccess && (!groupAccess.expiresAt || groupAccess.expiresAt > Date.now())) {
      return true;
    }
  }

  return false;
}

// Grant content access
export const grantContentAccess = mutation({
  args: {
    contentId: v.id("content"),
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

    if (!profile || profile.role !== "admin") {
      throw new Error("Only admins can grant content access");
    }

    return await ctx.db.insert("contentAccess", {
      ...args,
      grantedBy: currentUserId,
    });
  },
});

// Generate upload URL for content files
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.role !== "admin") {
      throw new Error("Only admins can upload content");
    }

    return await ctx.storage.generateUploadUrl();
  },
});

// Update content public status
export const updateContentPublic = mutation({
  args: {
    contentId: v.id("content"),
    isPublic: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.role !== "admin") {
      throw new Error("Only admins can update content visibility");
    }

    await ctx.db.patch(args.contentId, {
      isPublic: args.isPublic,
    });
  },
});

// Get content by ID (with access control)
export const getContent = query({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const content = await ctx.db.get(args.contentId);
    if (!content) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return null;

    // Check access
    if (content.isPublic || profile.role === "admin") {
      return {
        ...content,
        fileUrl: content.fileId ? await ctx.storage.getUrl(content.fileId) : null,
        thumbnailUrl: content.thumbnailId ? await ctx.storage.getUrl(content.thumbnailId) : null,
      };
    }

    const hasAccess = await checkContentAccess(ctx, content._id, userId, profile.role);
    if (!hasAccess) return null;

    return {
      ...content,
      fileUrl: content.fileId ? await ctx.storage.getUrl(content.fileId) : null,
      thumbnailUrl: content.thumbnailId ? await ctx.storage.getUrl(content.thumbnailId) : null,
    };
  },
});

// Update content
export const updateContent = mutation({
  args: {
    contentId: v.id("content"),
    title: v.string(),
    description: v.optional(v.string()),
    type: v.union(
      v.literal("video"),
      v.literal("article"),
      v.literal("document"),
      v.literal("audio")
    ),
    fileId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()),
    richTextContent: v.optional(v.string()),
    isPublic: v.boolean(),
    tags: v.optional(v.array(v.string())),
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
      throw new Error("Only admins can update content");
    }

    const { contentId, ...updateData } = args;
    await ctx.db.patch(contentId, updateData);
  },
});
