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

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can run normalization");
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

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can grant content access");
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

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can update content visibility");
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
    if (!profile || (profile.role !== "admin" && profile.role !== "owner" && profile.role !== "editor")) {
      throw new Error("Only editors, admins, or the owner can approve content");
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
    if (!profile || (profile.role !== "admin" && profile.role !== "owner" && profile.role !== "editor")) {
      throw new Error("Only editors, admins, or the owner can reject content");
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
    if (!profile || (profile.role !== "admin" && profile.role !== "owner" && profile.role !== "editor")) {
      throw new Error("Only editors, admins, or the owner can request changes");
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

    // Only admins or owner can unpublish content
    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can unpublish content");
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
    if (profile?.role === "admin" || profile?.role === "owner") {
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

    if (!profile || !["admin", "editor", "contributor", "owner"].includes(profile.role)) {
      throw new Error("Only admins, editors, contributors, or the owner can create content");
    }

    const demoContents = [
      {
        title: "Therapy Session Demo Video",
        description: "Example video from the project assets for demo purposes",
        type: "video" as const,
        externalUrl: "/src/assets/examples/videos/example_video.mp4",
        isPublic: true,
        active: true,
        tags: ["Demo", "Video", "Example"],
      },
      {
        title: "Music Therapy Visuals",
        description: "Demo article showcasing embedded example images",
        type: "article" as const,
        body: `<h2>Image Examples</h2>
<p>Below are sample images bundled with the application for demonstration.</p>
<div style="display:flex; gap:12px; flex-wrap:wrap; align-items:flex-start">
  <img src="/src/assets/examples/images/example_image.jpeg" alt="Example Image 1" style="max-width:300px; border-radius:8px; border:1px solid #ddd"/>
  <img src="/src/assets/examples/images/example_image_2.jpg" alt="Example Image 2" style="max-width:300px; border-radius:8px; border:1px solid #ddd"/>
</div>`,
        isPublic: true,
        active: true,
        tags: ["Demo", "Images", "Article"],
      },
      // Autism Spectrum Disorder Resources
      {
        title: "Music Therapy for Autism Spectrum Disorder",
        description: "Evidence-based approaches for using music therapy with individuals on the autism spectrum",
        type: "article" as const,
        body: `<h2>Music Therapy and Autism</h2>
<p>Music therapy has emerged as a powerful intervention for individuals with Autism Spectrum Disorder (ASD), addressing communication, social interaction, and behavioral challenges.</p>
<h3>Key Applications:</h3>
<ul>
<li>Enhancing verbal and non-verbal communication skills</li>
<li>Promoting social engagement and turn-taking</li>
<li>Reducing anxiety and sensory sensitivities</li>
<li>Supporting emotional regulation and self-expression</li>
<li>Developing motor coordination and body awareness</li>
</ul>
<h3>Techniques:</h3>
<p>Improvisational music therapy, structured musical activities, and songwriting can help individuals with ASD develop communication skills, express emotions, and build meaningful connections with others.</p>
<p>Research shows that music engages multiple areas of the brain simultaneously, making it an ideal medium for addressing the diverse needs of individuals on the spectrum.</p>`,
        tags: ["Autism", "ASD", "Communication", "Social Skills", "Therapy"],
        isPublic: true,
        active: true,
      },
      {
        title: "Stress Reduction Through Music Therapy",
        description: "Practical techniques for managing stress and anxiety using therapeutic music interventions",
        type: "article" as const,
        body: `<h2>Music Therapy for Stress Management</h2>
<p>Music therapy offers evidence-based techniques for reducing stress, managing anxiety, and promoting relaxation and well-being.</p>
<h3>Stress-Reducing Techniques:</h3>
<ul>
<li><strong>Receptive Music Listening:</strong> Carefully selected music to promote relaxation and reduce cortisol levels</li>
<li><strong>Rhythmic Breathing:</strong> Synchronizing breath with musical rhythms to activate the parasympathetic nervous system</li>
<li><strong>Progressive Muscle Relaxation with Music:</strong> Combining physical relaxation techniques with calming soundscapes</li>
<li><strong>Musical Improvisation:</strong> Expressing and processing emotions through spontaneous music-making</li>
<li><strong>Guided Imagery and Music (GIM):</strong> Using music to facilitate deep relaxation and emotional exploration</li>
</ul>
<h3>Physiological Benefits:</h3>
<p>Research demonstrates that music therapy can lower heart rate, reduce blood pressure, decrease cortisol levels, and increase endorphin production, creating measurable improvements in stress markers.</p>`,
        tags: ["Stress", "Anxiety", "Relaxation", "Wellness", "Mental Health"],
        isPublic: true,
        active: true,
      },
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
        title: "Sensory Processing and Music Therapy",
        description: "How music therapy supports individuals with sensory processing challenges",
        type: "article" as const,
        body: `<h2>Music Therapy for Sensory Processing</h2>
<p>Music therapy provides structured sensory experiences that can help individuals with sensory processing difficulties regulate their responses to environmental stimuli.</p>
<h3>Sensory Integration Through Music:</h3>
<ul>
<li><strong>Auditory Processing:</strong> Developing discrimination, sequencing, and attention skills</li>
<li><strong>Tactile Stimulation:</strong> Exploring different instrument textures and vibrations</li>
<li><strong>Vestibular Input:</strong> Movement-based musical activities for balance and coordination</li>
<li><strong>Proprioceptive Feedback:</strong> Using rhythm and movement to enhance body awareness</li>
</ul>
<p>Therapeutic music activities can be carefully calibrated to provide the right amount of sensory input, helping individuals achieve optimal arousal levels and improved self-regulation.</p>`,
        tags: ["Sensory Processing", "Autism", "Regulation", "Integration"],
        isPublic: true,
        active: true,
      },
      {
        title: "Music Therapy for ADHD and Executive Function",
        description: "Using music-based interventions to support attention, focus, and executive functioning",
        type: "article" as const,
        body: `<h2>Music Therapy and ADHD</h2>
<p>Music therapy offers unique approaches to supporting individuals with ADHD by engaging attention, promoting self-regulation, and developing executive function skills.</p>
<h3>Therapeutic Approaches:</h3>
<ul>
<li><strong>Rhythmic Entrainment:</strong> Using steady beats to improve sustained attention and task completion</li>
<li><strong>Musical Games:</strong> Developing impulse control and turn-taking skills</li>
<li><strong>Composition Activities:</strong> Enhancing planning, organization, and working memory</li>
<li><strong>Movement to Music:</strong> Channeling energy productively while improving motor control</li>
</ul>
<h3>Executive Function Development:</h3>
<p>Structured musical activities naturally require planning, sequencing, self-monitoring, and flexible thinking—all key executive function skills that can transfer to daily life activities.</p>`,
        tags: ["ADHD", "Attention", "Executive Function", "Focus", "Self-Regulation"],
        isPublic: true,
        active: true,
      },
      {
        title: "Trauma-Informed Music Therapy",
        description: "Approaches for using music therapy with trauma survivors in a safe and supportive way",
        type: "article" as const,
        body: `<h2>Music Therapy and Trauma Recovery</h2>
<p>Trauma-informed music therapy provides a safe, non-verbal medium for processing traumatic experiences and building resilience.</p>
<h3>Core Principles:</h3>
<ul>
<li>Creating a safe therapeutic environment</li>
<li>Empowering client choice and control</li>
<li>Building trust through consistent structure</li>
<li>Supporting emotional regulation before processing</li>
<li>Honoring individual pace and readiness</li>
</ul>
<h3>Therapeutic Techniques:</h3>
<p>Music therapy offers multiple pathways for trauma recovery, including songwriting for narrative reconstruction, improvisation for emotional expression, and receptive listening for grounding and stabilization.</p>
<p>The non-verbal nature of music can access emotions and memories that may be difficult to verbalize, while providing a sense of safety and containment.</p>`,
        tags: ["Trauma", "PTSD", "Recovery", "Mental Health", "Safety"],
        isPublic: false,
        active: true,
      },
      {
        title: "Music Therapy for Depression and Mood Disorders",
        description: "Evidence-based music therapy interventions for managing depression and improving mood",
        type: "article" as const,
        body: `<h2>Music Therapy and Depression</h2>
<p>Music therapy has demonstrated effectiveness in reducing symptoms of depression and supporting emotional well-being through active and receptive interventions.</p>
<h3>Therapeutic Interventions:</h3>
<ul>
<li><strong>Songwriting:</strong> Processing emotions and creating meaning through lyric composition</li>
<li><strong>Music-Assisted Relaxation:</strong> Reducing rumination and promoting positive mood states</li>
<li><strong>Group Music-Making:</strong> Combating isolation and building social connections</li>
<li><strong>Lyric Analysis:</strong> Exploring themes of hope, resilience, and recovery</li>
<li><strong>Improvisation:</strong> Expressing difficult emotions in a safe, contained way</li>
</ul>
<h3>Neurobiological Effects:</h3>
<p>Music therapy can influence neurotransmitter systems involved in mood regulation, including dopamine, serotonin, and oxytocin, while also reducing stress hormones.</p>`,
        tags: ["Depression", "Mood", "Mental Health", "Emotional Wellness"],
        isPublic: true,
        active: true,
      },
      {
        title: "Rhythmic Auditory Stimulation for Gait Training",
        description: "Using RAS techniques to improve walking patterns in neurological rehabilitation",
        type: "article" as const,
        body: `<h2>Rhythmic Auditory Stimulation (RAS)</h2>
<p>RAS is a neurologic music therapy technique that uses rhythmic cues to improve motor control and coordination, particularly in gait rehabilitation.</p>
<h3>Clinical Applications:</h3>
<ul>
<li>Parkinson's disease gait training</li>
<li>Stroke rehabilitation</li>
<li>Traumatic brain injury recovery</li>
<li>Cerebral palsy motor development</li>
<li>Multiple sclerosis mobility support</li>
</ul>
<h3>How It Works:</h3>
<p>The auditory system has direct connections to motor areas of the brain. Rhythmic cues provide external timing signals that help organize and stabilize movement patterns, leading to improved gait velocity, stride length, and cadence.</p>
<p>Research shows that RAS can produce immediate improvements in gait parameters, with benefits maintained through regular practice.</p>`,
        tags: ["RAS", "Gait", "Movement", "Rehabilitation", "Parkinson's"],
        isPublic: true,
        active: true,
      },
      {
        title: "Music Therapy for Dementia and Alzheimer's",
        description: "Using music to support memory, cognition, and quality of life in dementia care",
        type: "article" as const,
        body: `<h2>Music Therapy in Dementia Care</h2>
<p>Music therapy is one of the most effective non-pharmacological interventions for individuals with dementia, accessing preserved musical memory even in advanced stages.</p>
<h3>Benefits:</h3>
<ul>
<li>Stimulating long-term memory through familiar songs</li>
<li>Reducing agitation and behavioral symptoms</li>
<li>Improving mood and emotional expression</li>
<li>Facilitating social interaction and communication</li>
<li>Providing meaningful engagement and quality of life</li>
</ul>
<h3>Evidence-Based Approaches:</h3>
<p>Personalized music listening, group singing, and reminiscence through music can all support cognitive function, reduce anxiety, and enhance well-being for individuals with dementia and their caregivers.</p>`,
        tags: ["Dementia", "Alzheimer's", "Memory", "Elderly", "Cognition"],
        isPublic: true,
        active: true,
      },
      {
        title: "Melodic Intonation Therapy for Aphasia",
        description: "Using MIT to support speech recovery after stroke or brain injury",
        type: "article" as const,
        body: `<h2>Melodic Intonation Therapy (MIT)</h2>
<p>MIT is a specialized neurologic music therapy technique that uses melodic and rhythmic elements to facilitate speech production in individuals with non-fluent aphasia.</p>
<h3>The MIT Process:</h3>
<ul>
<li>Phrases are intoned (sung) using simple melodic patterns</li>
<li>Left hand tapping provides rhythmic cues</li>
<li>Gradual progression from singing to speaking</li>
<li>Systematic fading of musical elements</li>
</ul>
<h3>Neurological Basis:</h3>
<p>MIT engages right hemisphere language areas and can help establish new neural pathways for speech production when left hemisphere language centers are damaged.</p>
<p>Research demonstrates significant improvements in speech output for individuals with moderate to severe non-fluent aphasia.</p>`,
        tags: ["MIT", "Aphasia", "Speech", "Stroke", "Language"],
        isPublic: true,
        active: true,
      },
      {
        title: "Music Therapy for Pain Management",
        description: "Using music-based interventions to reduce pain perception and improve coping",
        type: "article" as const,
        body: `<h2>Music Therapy and Pain Management</h2>
<p>Music therapy offers non-pharmacological approaches to pain management through multiple mechanisms including distraction, relaxation, and emotional support.</p>
<h3>Pain Management Techniques:</h3>
<ul>
<li><strong>Music-Assisted Relaxation:</strong> Reducing muscle tension and stress-related pain</li>
<li><strong>Rhythmic Breathing:</strong> Using musical phrasing to guide deep breathing</li>
<li><strong>Active Music-Making:</strong> Providing distraction and sense of control</li>
<li><strong>Lyric Analysis:</strong> Reframing pain experiences and building coping strategies</li>
</ul>
<h3>Clinical Evidence:</h3>
<p>Studies show music therapy can reduce pain intensity, decrease anxiety related to pain, and reduce the need for pain medication in various medical settings.</p>`,
        tags: ["Pain", "Chronic Pain", "Palliative Care", "Wellness"],
        isPublic: true,
        active: true,
      },
      {
        title: "Pediatric Music Therapy: Developmental Support",
        description: "Using music therapy to support child development across multiple domains",
        type: "article" as const,
        body: `<h2>Music Therapy in Pediatric Care</h2>
<p>Music therapy supports children's development across cognitive, motor, communication, social, and emotional domains through engaging, developmentally appropriate interventions.</p>
<h3>Developmental Areas:</h3>
<ul>
<li><strong>Communication:</strong> Supporting speech and language development</li>
<li><strong>Motor Skills:</strong> Developing fine and gross motor coordination</li>
<li><strong>Social Skills:</strong> Practicing turn-taking, sharing, and cooperation</li>
<li><strong>Emotional Regulation:</strong> Identifying and expressing feelings appropriately</li>
<li><strong>Cognitive Skills:</strong> Enhancing attention, memory, and problem-solving</li>
</ul>
<h3>Populations Served:</h3>
<p>Pediatric music therapy benefits children with autism, developmental delays, cerebral palsy, genetic disorders, and those in medical settings.</p>`,
        tags: ["Pediatric", "Children", "Development", "Early Intervention"],
        isPublic: true,
        active: true,
      },
      {
        title: "Group Music Therapy: Building Community and Connection",
        description: "The power of group music-making for social connection and therapeutic growth",
        type: "article" as const,
        body: `<h2>Group Music Therapy</h2>
<p>Group music therapy harnesses the power of shared musical experiences to build community, develop social skills, and provide mutual support.</p>
<h3>Group Benefits:</h3>
<ul>
<li>Reducing isolation and building social connections</li>
<li>Providing peer support and validation</li>
<li>Developing communication and cooperation skills</li>
<li>Creating a sense of belonging and community</li>
<li>Offering opportunities for leadership and contribution</li>
</ul>
<h3>Group Formats:</h3>
<p>Drum circles, choir groups, songwriting groups, and improvisation ensembles each offer unique therapeutic benefits while fostering connection and shared meaning-making.</p>`,
        tags: ["Group Therapy", "Community", "Social Skills", "Connection"],
        isPublic: true,
        active: true,
      },
      {
        title: "Music Therapy Assessment and Treatment Planning",
        description: "Professional guide to conducting music therapy assessments and developing individualized treatment plans",
        type: "article" as const,
        body: `<h2>Music Therapy Assessment</h2>
<p>Comprehensive assessment is the foundation of effective music therapy practice, informing individualized treatment planning and goal development.</p>
<h3>Assessment Domains:</h3>
<ul>
<li>Musical preferences and history</li>
<li>Cognitive functioning and attention</li>
<li>Communication and language skills</li>
<li>Motor abilities and coordination</li>
<li>Social and emotional functioning</li>
<li>Sensory processing and preferences</li>
</ul>
<h3>Treatment Planning:</h3>
<p>Based on assessment findings, music therapists develop SMART goals (Specific, Measurable, Achievable, Relevant, Time-bound) and select evidence-based interventions matched to client needs and preferences.</p>
<p>Regular progress monitoring and outcome measurement ensure accountability and guide treatment modifications.</p>`,
        tags: ["Assessment", "Treatment Planning", "Professional", "Clinical Practice"],
        isPublic: false,
        active: true,
      },
      {
        title: "Cultural Considerations in Music Therapy",
        description: "Providing culturally responsive and inclusive music therapy services",
        type: "article" as const,
        body: `<h2>Culturally Responsive Music Therapy</h2>
<p>Effective music therapy practice requires cultural humility, awareness, and responsiveness to the diverse backgrounds and identities of clients.</p>
<h3>Key Principles:</h3>
<ul>
<li>Honoring clients' musical traditions and preferences</li>
<li>Recognizing music's cultural meanings and contexts</li>
<li>Addressing power dynamics and historical trauma</li>
<li>Adapting interventions to cultural values and norms</li>
<li>Engaging in ongoing cultural self-reflection</li>
</ul>
<h3>Inclusive Practice:</h3>
<p>Music therapists must consider how race, ethnicity, language, religion, gender identity, sexual orientation, disability, and socioeconomic status shape clients' experiences and therapeutic needs.</p>
<p>Building authentic relationships across difference requires humility, curiosity, and commitment to equity and justice.</p>`,
        tags: ["Cultural Competence", "Diversity", "Inclusion", "Equity"],
        isPublic: true,
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
