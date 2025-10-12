import { query, mutation } from "./_generated/server";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Create content (as draft)
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
    thumbnailId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()),
    richTextContent: v.optional(v.string()),
    body: v.optional(v.string()),
    isPublic: v.boolean(),
    authorName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    active: v.boolean(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has permission to create content (contributor, editor, or admin)
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || !["admin", "editor", "contributor"].includes(profile.role)) {
      throw new Error("Only admins, editors, and contributors can create content");
    }

    // Validate dates
    if (args.startDate && args.endDate && args.startDate > args.endDate) {
      throw new Error("Start date must be before end date");
    }

    // Normalize: Articles should not store richTextContent
    const data = args.type === "article" ? { ...args, richTextContent: undefined } : args;

    // All new content starts as draft
    const contentId = await ctx.db.insert("content", {
      ...data,
      createdBy: userId,
      status: "draft",
      currentVersion: 1,
    });

    // Create initial version
    await ctx.db.insert("contentVersions", {
      contentId,
      versionNumber: 1,
      title: data.title,
      description: data.description,
      type: data.type,
      fileId: data.fileId,
      externalUrl: data.externalUrl,
      richTextContent: data.richTextContent,
      body: data.body,
      isPublic: data.isPublic,
      tags: data.tags,
      active: data.active,
      startDate: data.startDate,
      endDate: data.endDate,
      status: "draft",
      createdBy: userId,
      createdAt: Date.now(),
      changeDescription: "Initial version",
    });

    return contentId;
  },
});

// One-time migration: remove richTextContent from article documents
export const normalizeArticlesRemoveRichText = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || profile.role !== "admin") {
      throw new Error("Only admins can run normalization");
    }

    const all = await ctx.db
      .query("content")
      .withIndex("by_type", (q) => q.eq("type", "article"))
      .collect();

    let updated = 0;
    for (const doc of all) {
      const needsMove = typeof (doc as any).richTextContent === "string" && (doc as any).richTextContent.length > 0;
      if (!needsMove) continue;

      const next: any = { richTextContent: undefined };
      if (!doc.body || doc.body.length === 0) {
        next.body = (doc as any).richTextContent;
      }
      await ctx.db.patch(doc._id, next);
      updated++;
    }

    return { success: true, updated };
  },
});

// List content (with access control and workflow filtering)
export const listContent = query({
  args: {
    type: v.optional(v.union(
      v.literal("video"),
      v.literal("article"),
      v.literal("document"),
      v.literal("audio")
    )),
    status: v.optional(v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("published"),
      v.literal("rejected")
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
    
    // Filter by status if provided
    if (args.status) {
      allContent = await ctx.db
        .query("content")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
      
      // Further filter by type if provided
      if (args.type) {
        allContent = allContent.filter(c => c.type === args.type);
      }
    } else if (args.type) {
      allContent = await ctx.db
        .query("content")
        .withIndex("by_type", (q) => q.eq("type", args.type!))
        .collect();
    } else {
      allContent = await ctx.db.query("content").collect();
    }

    // Filter content based on access and workflow status
    const accessibleContent = [];

    for (const content of allContent) {
      // Get creator name
      const creator = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", content.createdBy))
        .unique();

      // Get reviewer name if content was reviewed
      let reviewerName: string | null = null;
      if (content.reviewedBy) {
        const reviewer = await ctx.db
          .query("userProfiles")
          .withIndex("by_user_id", (q) => q.eq("userId", content.reviewedBy as any))
          .unique();
        reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "Unknown";
      }

      // Get file and thumbnail URLs
      const fileUrl = content.fileId ? await ctx.storage.getUrl(content.fileId) : null;
      const thumbnailUrl = content.thumbnailId ? await ctx.storage.getUrl(content.thumbnailId) : null;

      const contentWithNames = {
        ...content,
        fileUrl,
        thumbnailUrl,
        creatorName: creator ? `${creator.firstName} ${creator.lastName}` : "Unknown",
        reviewerName,
      };

      // Admins and editors can see all content regardless of status and availability
      if (profile.role === "admin" || profile.role === "editor") {
        accessibleContent.push(contentWithNames);
        continue;
      }

      // Contributors can see their own drafts and all published content
      if (profile.role === "contributor") {
        if (content.createdBy === userId) {
          // Can see own content in any status
          accessibleContent.push(contentWithNames);
          continue;
        }
        // For other content, must be published and available
        if (content.status !== "published" || !isContentAvailable(content)) {
          continue;
        }
        // Check if has access to this published content
        if (content.isPublic) {
          accessibleContent.push(contentWithNames);
          continue;
        }
        const hasAccess = await checkContentAccess(ctx, content._id, userId, profile.role);
        if (hasAccess) {
          accessibleContent.push(contentWithNames);
        }
        continue;
      }

      // Non-content-creator users can only see published content
      if (content.status !== "published") {
        continue;
      }

      // Check if content is available based on active status and date range
      if (!isContentAvailable(content)) {
        continue;
      }

      // Public content is accessible
      if (content.isPublic) {
        accessibleContent.push(contentWithNames);
        continue;
      }

      // Check specific access permissions
      const hasAccess = await checkContentAccess(ctx, content._id, userId, profile.role);
      if (hasAccess) {
        accessibleContent.push(contentWithNames);
      }
    }

    return accessibleContent;
  },
});

// Helper function to check if content is currently available based on active status and dates
function isContentAvailable(content: any): boolean {
  // Must be active
  if (!content.active) return false;
  
  const now = Date.now();
  
  // Check start date
  if (content.startDate && content.startDate > now) return false;
  
  // Check end date
  if (content.endDate && content.endDate < now) return false;
  
  return true;
}

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

    if (!profile || !["admin", "editor", "contributor"].includes(profile.role)) {
      throw new Error("Only admins, editors, and contributors can upload content");
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

    // Get creator name
    const creator = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", content.createdBy))
      .unique();

    // Get reviewer name if content was reviewed
    let reviewerName: string | null = null;
    if (content.reviewedBy) {
      const reviewer = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", content.reviewedBy as any))
        .unique();
      reviewerName = reviewer ? `${reviewer.firstName} ${reviewer.lastName}` : "Unknown";
    }

    // Admins and editors can see all content
    if (profile.role === "admin" || profile.role === "editor") {
      return {
        ...content,
        fileUrl: content.fileId ? await ctx.storage.getUrl(content.fileId) : null,
        thumbnailUrl: content.thumbnailId ? await ctx.storage.getUrl(content.thumbnailId) : null,
        creatorName: creator ? `${creator.firstName} ${creator.lastName}` : "Unknown",
        reviewerName,
      };
    }

    // Non-admin/editor users need published content that is available
    if (content.status !== "published" || !isContentAvailable(content)) {
      return null;
    }

    // Check access for public or specifically granted content
    if (content.isPublic) {
      return {
        ...content,
        fileUrl: content.fileId ? await ctx.storage.getUrl(content.fileId) : null,
        thumbnailUrl: content.thumbnailId ? await ctx.storage.getUrl(content.thumbnailId) : null,
        creatorName: creator ? `${creator.firstName} ${creator.lastName}` : "Unknown",
        reviewerName,
      };
    }

    const hasAccess = await checkContentAccess(ctx, content._id, userId, profile.role);
    if (!hasAccess) return null;

    return {
      ...content,
      fileUrl: content.fileId ? await ctx.storage.getUrl(content.fileId) : null,
      thumbnailUrl: content.thumbnailId ? await ctx.storage.getUrl(content.thumbnailId) : null,
      creatorName: creator ? `${creator.firstName} ${creator.lastName}` : "Unknown",
      reviewerName,
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
    body: v.optional(v.string()),
    isPublic: v.boolean(),
    authorName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    active: v.boolean(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || !["admin", "editor", "contributor"].includes(profile.role)) {
      throw new Error("Only admins, editors, and contributors can update content");
    }

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    // Permission checks based on role
    if (profile.role === "contributor") {
      // Contributors can only edit their own drafts or rejected content
      if (content.createdBy !== userId) {
        throw new Error("Contributors can only edit their own content");
      }
      if (content.status !== "draft" && content.status !== "rejected") {
        throw new Error("Contributors can only edit content in draft or rejected status");
      }
    } else if (profile.role === "editor") {
      // Editors can edit any draft or rejected content
      if (content.status !== "draft" && content.status !== "rejected") {
        throw new Error("Editors can only edit content in draft or rejected status");
      }
    }
    // Admins can edit any content at any time

    // Validate dates
    if (args.startDate && args.endDate && args.startDate > args.endDate) {
      throw new Error("Start date must be before end date");
    }

    // Normalize: Articles should not store richTextContent
    const normalized = args.type === "article"
      ? { ...args, richTextContent: undefined }
      : args;

    // Get current version number
    const currentVersion = content.currentVersion || 1;
    const newVersion = currentVersion + 1;

    // Create version snapshot before updating
    await ctx.db.insert("contentVersions", {
      contentId: normalized.contentId,
      versionNumber: newVersion,
      title: normalized.title,
      description: normalized.description,
      type: normalized.type,
      fileId: normalized.fileId,
      externalUrl: normalized.externalUrl,
      richTextContent: normalized.richTextContent,
      body: normalized.body,
      isPublic: normalized.isPublic,
      tags: normalized.tags,
      active: normalized.active,
      startDate: normalized.startDate,
      endDate: normalized.endDate,
      status: content.status,
      createdBy: userId,
      createdAt: Date.now(),
      changeDescription: "Content updated",
    });

    // Update content with new data and version number
    const { contentId, ...updateData } = normalized;
    await ctx.db.patch(contentId, {
      ...updateData,
      currentVersion: newVersion,
    });
  },
});

// Submit content for review
export const submitForReview = mutation({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || !["admin", "contributor"].includes(profile.role)) {
      throw new Error("Only admins and contributors can submit content for review");
    }

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    // Contributors can only submit their own content
    if (profile.role === "contributor" && content.createdBy !== userId) {
      throw new Error("Contributors can only submit their own content");
    }

    // Can only submit drafts, rejected content, or content with changes requested
    if (content.status !== "draft" && content.status !== "rejected" && content.status !== "changes_requested") {
      throw new Error("Can only submit drafts, rejected content, or content with requested changes for review");
    }

    await ctx.db.patch(args.contentId, {
      status: "review",
      submittedForReviewAt: Date.now(),
      submittedForReviewBy: userId,
    });
  },
});

// Approve content (move to published)
export const approveContent = mutation({
  args: {
    contentId: v.id("content"),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    // Only editors and admins can approve content
    if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
      throw new Error("Only editors and admins can approve content");
    }

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    if (content.status !== "review") {
      throw new Error("Can only approve content in review status");
    }

    await ctx.db.patch(args.contentId, {
      status: "published",
      reviewedAt: Date.now(),
      reviewedBy: userId,
      reviewNotes: args.reviewNotes,
      publishedAt: Date.now(),
    });
  },
});

// Reject content (move back to draft)
export const rejectContent = mutation({
  args: {
    contentId: v.id("content"),
    reviewNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    // Only editors and admins can reject content
    if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
      throw new Error("Only editors and admins can reject content");
    }

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    if (content.status !== "review") {
      throw new Error("Can only reject content in review status");
    }

    await ctx.db.patch(args.contentId, {
      status: "rejected",
      reviewedAt: Date.now(),
      reviewedBy: userId,
      reviewNotes: args.reviewNotes,
    });
  },
});

// Request changes to content
export const requestChanges = mutation({
  args: {
    contentId: v.id("content"),
    reviewNotes: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    // Only editors and admins can request changes
    if (!profile || (profile.role !== "admin" && profile.role !== "editor")) {
      throw new Error("Only editors and admins can request changes");
    }

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    if (content.status !== "review") {
      throw new Error("Can only request changes for content in review status");
    }

    await ctx.db.patch(args.contentId, {
      status: "changes_requested",
      reviewedAt: Date.now(),
      reviewedBy: userId,
      reviewNotes: args.reviewNotes,
    });
  },
});

// Unpublish content (move back to draft)
export const unpublishContent = mutation({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    // Only admins can unpublish content
    if (!profile || profile.role !== "admin") {
      throw new Error("Only admins can unpublish content");
    }

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    if (content.status !== "published") {
      throw new Error("Can only unpublish published content");
    }

    await ctx.db.patch(args.contentId, {
      status: "draft",
    });
  },
});

// Delete content
export const deleteContent = mutation({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    // Permission checks
    if (profile?.role === "admin") {
      // Admins can delete any content
    } else if (profile?.role === "editor") {
      // Editors can delete draft and rejected content
      if (content.status !== "draft" && content.status !== "rejected") {
        throw new Error("Editors can only delete content in draft or rejected status");
      }
    } else if (profile?.role === "contributor") {
      // Contributors can only delete their own draft or rejected content
      if (content.createdBy !== userId) {
        throw new Error("Contributors can only delete their own content");
      }
      if (content.status !== "draft" && content.status !== "rejected") {
        throw new Error("Contributors can only delete content in draft or rejected status");
      }
    } else {
      throw new Error("You don't have permission to delete content");
    }

    // Delete related records
    // 1. Delete all versions
    const versions = await ctx.db
      .query("contentVersions")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();
    
    for (const version of versions) {
      await ctx.db.delete(version._id);
    }

    // 2. Delete content access records
    const accessRecords = await ctx.db
      .query("contentAccess")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();
    
    for (const access of accessRecords) {
      await ctx.db.delete(access._id);
    }

    // 3. Delete from content groups
    const groupItems = await ctx.db
      .query("contentGroupItems")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();
    
    for (const item of groupItems) {
      await ctx.db.delete(item._id);
    }

    // 4. Delete content shares
    const shares = await ctx.db
      .query("contentShares")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .collect();
    
    for (const share of shares) {
      await ctx.db.delete(share._id);
    }

    // Finally, delete the content itself
    await ctx.db.delete(args.contentId);

    // Note: Files in storage are not deleted to prevent data loss
    // You may want to implement a cleanup job for orphaned files
  },
});

// Update content thumbnail ID
export const updateContentThumbnailId = mutation({
  args: {
    contentId: v.id("content"),
    thumbnailId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    // Update thumbnail
    await ctx.db.patch(args.contentId, {
      thumbnailId: args.thumbnailId,
    });
  },
});

// Grant access to a user after successful password verification
export const grantAccessAfterPassword = mutation({
  args: {
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    // Check if user already has access
    const existingAccess = await ctx.db
      .query("contentAccess")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("userId"), userId))
      .first();

    if (!existingAccess) {
      // Grant permanent access to this user
      await ctx.db.insert("contentAccess", {
        contentId: args.contentId,
        userId: userId,
        canShare: false,
        grantedBy: userId, // Self-granted via password
      });
    }
  },
});

// Create demo content for testing/demonstration
export const createDemoContent = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user has permission to create content
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile || !["admin", "editor", "contributor"].includes(profile.role)) {
      throw new Error("Only admins, editors, and contributors can create content");
    }

    const demoContents = [
      {
        title: "Introduction to Neurologic Music Therapy",
        description: "Learn about the fundamentals of NMT and how it helps patients with neurological conditions",
        type: "article" as const,
        body: `<h2>What is Neurologic Music Therapy?</h2>
<p>Neurologic Music Therapy (NMT) is an evidence-based treatment system that uses music to address cognitive, sensory, and motor dysfunctions due to neurological disease.</p>
<h3>Key Benefits:</h3>
<ul>
<li>Improves motor function and coordination</li>
<li>Enhances speech and language abilities</li>
<li>Supports cognitive rehabilitation</li>
<li>Reduces anxiety and improves mood</li>
</ul>
<p>This approach is particularly effective for patients with stroke, Parkinson's disease, traumatic brain injury, and other neurological conditions.</p>`,
        tags: ["NMT", "Introduction", "Therapy", "Education"],
        isPublic: true,
        active: true,
      },
      {
        title: "Rhythmic Auditory Stimulation Demo",
        description: "A sample session demonstrating RAS techniques for gait training",
        type: "video" as const,
        externalUrl: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        tags: ["RAS", "Gait Training", "Demo", "Techniques"],
        isPublic: false,
        active: true,
      },
      {
        title: "Melodic Intonation Therapy Guide",
        description: "Comprehensive guide for using MIT in speech rehabilitation",
        type: "document" as const,
        body: "This document provides step-by-step instructions for implementing Melodic Intonation Therapy techniques with patients recovering from aphasia.",
        tags: ["MIT", "Speech", "Aphasia", "Guide"],
        isPublic: false,
        active: true,
      },
      {
        title: "Therapeutic Music Exercise Session",
        description: "Audio recording of a guided music-based exercise routine",
        type: "audio" as const,
        externalUrl: "https://example.com/audio-demo.mp3",
        tags: ["Exercise", "Audio", "Therapy", "Guided"],
        isPublic: true,
        active: true,
      },
      {
        title: "Music Therapy for Parkinson's Disease",
        description: "Advanced techniques for using rhythm and movement in Parkinson's treatment",
        type: "article" as const,
        body: `<h2>Music Therapy and Parkinson's Disease</h2>
<p>Music therapy has shown remarkable results in helping Parkinson's patients manage their symptoms and improve quality of life.</p>
<h3>Rhythmic Interventions:</h3>
<p>Using steady beats and rhythmic cues can help patients:</p>
<ul>
<li>Maintain steady gait patterns</li>
<li>Reduce freezing episodes</li>
<li>Improve balance and coordination</li>
<li>Enhance overall motor function</li>
</ul>
<p>Research continues to demonstrate the powerful impact of music on the brain's motor systems.</p>`,
        tags: ["Parkinson's", "Movement", "Advanced", "Research"],
        isPublic: false,
        active: true,
      }
    ];

    const createdIds = [];
    
    for (const content of demoContents) {
      const contentId = await ctx.db.insert("content", {
        ...content,
        createdBy: userId,
        status: "published",
        reviewedBy: userId,
      });
      createdIds.push(contentId);
    }

    return { 
      success: true, 
      count: createdIds.length,
      contentIds: createdIds 
    };
  },
});
