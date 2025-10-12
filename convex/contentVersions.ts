import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Helper function to create a version snapshot
async function createVersionSnapshot(
  ctx: any,
  contentId: any,
  content: any,
  userId: any,
  changeDescription?: string
) {
  // Get the current highest version number for this content
  const existingVersions = await ctx.db
    .query("contentVersions")
    .withIndex("by_content", (q: any) => q.eq("contentId", contentId))
    .collect();

  const versionNumber = existingVersions.length + 1;

  // Create version snapshot
  await ctx.db.insert("contentVersions", {
    contentId,
    versionNumber,
    title: content.title,
    description: content.description,
    type: content.type,
    fileId: content.fileId,
    externalUrl: content.externalUrl,
    richTextContent: content.richTextContent,
    body: content.body,
    thumbnailId: content.thumbnailId,
    isPublic: content.isPublic,
    tags: content.tags,
    active: content.active,
    startDate: content.startDate,
    endDate: content.endDate,
    status: content.status,
    createdBy: userId,
    createdAt: Date.now(),
    changeDescription,
  });

  // Update content's current version
  await ctx.db.patch(contentId, {
    currentVersion: versionNumber,
  });

  return versionNumber;
}

// Query to get version history for a content item
export const getVersionHistory = query({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    // Get the content to check permissions
    const content = await ctx.db.get(args.contentId);
    if (!content) {
      throw new Error("Content not found");
    }

    // Check if user has access (admin, editor, contributor, or content creator)
    if (
      userProfile.role !== "admin" &&
      userProfile.role !== "editor" &&
      userProfile.role !== "contributor" &&
      content.createdBy !== userId
    ) {
      throw new Error("Not authorized to view version history");
    }

    // Get all versions for this content
    const versions = await ctx.db
      .query("contentVersions")
      .withIndex("by_content", (q: any) => q.eq("contentId", args.contentId))
      .collect();

    // Get user info for each version
    const versionsWithUsers = await Promise.all(
      versions.map(async (version) => {
        const creator = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", version.createdBy))
          .unique();
        return {
          ...version,
          creatorName: creator
            ? `${creator.firstName} ${creator.lastName}`
            : "Unknown User",
        };
      })
    );

    // Sort by version number descending (newest first)
    return versionsWithUsers.sort((a, b) => b.versionNumber - a.versionNumber);
  },
});

// Query to get a specific version
export const getVersion = query({
  args: {
    contentId: v.id("content"),
    versionNumber: v.number(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    // Get the content to check permissions
    const content = await ctx.db.get(args.contentId);
    if (!content) {
      throw new Error("Content not found");
    }

    // Check if user has access
    if (
      userProfile.role !== "admin" &&
      userProfile.role !== "editor" &&
      userProfile.role !== "contributor" &&
      content.createdBy !== userId
    ) {
      throw new Error("Not authorized to view this version");
    }

    // Get the specific version
    const version = await ctx.db
      .query("contentVersions")
      .withIndex("by_content_version", (q: any) =>
        q.eq("contentId", args.contentId).eq("versionNumber", args.versionNumber)
      )
      .first();

    if (!version) {
      throw new Error("Version not found");
    }

    // Get creator info
    const creator = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", version.createdBy))
      .unique();

    // Get file URL if fileId exists
    let fileUrl = null;
    if (version.fileId) {
      fileUrl = await ctx.storage.getUrl(version.fileId);
    }

    // Get thumbnail URL if thumbnailId exists
    let thumbnailUrl = null;
    if (version.thumbnailId) {
      thumbnailUrl = await ctx.storage.getUrl(version.thumbnailId);
    }

    return {
      ...version,
      creatorName: creator
        ? `${creator.firstName} ${creator.lastName}`
        : "Unknown User",
      fileUrl,
      thumbnailUrl,
    };
  },
});

// Mutation to revert to a previous version
export const revertToVersion = mutation({
  args: {
    contentId: v.id("content"),
    versionNumber: v.number(),
    changeDescription: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const userProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!userProfile) {
      throw new Error("User profile not found");
    }

    // Get the content
    const content = await ctx.db.get(args.contentId);
    if (!content) {
      throw new Error("Content not found");
    }

    // Check permissions (admin, editor, or content creator)
    if (
      userProfile.role !== "admin" &&
      userProfile.role !== "editor" &&
      content.createdBy !== userId
    ) {
      throw new Error("Not authorized to revert this content");
    }

    // Get the version to revert to
    const version = await ctx.db
      .query("contentVersions")
      .withIndex("by_content_version", (q: any) =>
        q.eq("contentId", args.contentId).eq("versionNumber", args.versionNumber)
      )
      .first();

    if (!version) {
      throw new Error("Version not found");
    }

    // Create a snapshot of current state before reverting
    await createVersionSnapshot(
      ctx,
      args.contentId,
      content,
      userId,
      `Saving before revert to version ${args.versionNumber}`
    );

    // Revert to the selected version
    await ctx.db.patch(args.contentId, {
      title: version.title,
      description: version.description,
      type: version.type,
      fileId: version.fileId,
      externalUrl: version.externalUrl,
      richTextContent: version.richTextContent,
      body: version.body,
      thumbnailId: version.thumbnailId,
      isPublic: version.isPublic,
      tags: version.tags,
      active: version.active,
      startDate: version.startDate,
      endDate: version.endDate,
      status: version.status,
    });

    // Create a new version entry for the revert
    const newVersionNumber = await createVersionSnapshot(
      ctx,
      args.contentId,
      version,
      userId,
      args.changeDescription || `Reverted to version ${args.versionNumber}`
    );

    return newVersionNumber;
  },
});

// Export helper function for use in content.ts
export { createVersionSnapshot };

