import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // User profiles
  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("contributor"),
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    ),
    firstName: v.string(),
    lastName: v.string(),
    isActive: v.boolean(),
    invitedBy: v.optional(v.id("users")),
    inviteAcceptedAt: v.optional(v.number()),
    // Temporary field for migration
    organizationId: v.optional(v.string()),
  })
    .index("by_user_id", ["userId"])
    .index("by_role", ["role"]),

  // Content items
  content: defineTable({
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
    body: v.optional(v.string()), // General rich text body field for all content types
    thumbnailId: v.optional(v.id("_storage")),
    duration: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    isPublic: v.boolean(),
    createdBy: v.id("users"),
    tags: v.optional(v.array(v.string())),
    accessExpiresAt: v.optional(v.number()),
    // Availability control fields
    active: v.boolean(),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    // Workflow fields
    status: v.union(
      v.literal("draft"),
      v.literal("review"),
      v.literal("published"),
      v.literal("rejected")
    ),
    submittedForReviewAt: v.optional(v.number()),
    submittedForReviewBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    reviewNotes: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    // Temporary field for migration
    organizationId: v.optional(v.string()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_type", ["type"])
    .index("by_public", ["isPublic"])
    .index("by_status", ["status"])
    .index("by_active", ["active"])
    .searchIndex("search_content", {
      searchField: "title",
      filterFields: ["type", "isPublic", "status", "active"],
    }),

  // Content groups
  contentGroups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    isActive: v.boolean(),
  })
    .index("by_creator", ["createdBy"]),

  // Content group items (many-to-many)
  contentGroupItems: defineTable({
    contentId: v.id("content"),
    groupId: v.id("contentGroups"),
    addedBy: v.id("users"),
    order: v.optional(v.number()),
  })
    .index("by_group", ["groupId"])
    .index("by_content", ["contentId"])
    .index("by_group_order", ["groupId", "order"]),

  // User groups (custom collections of users)
  userGroups: defineTable({
    name: v.string(),
    description: v.optional(v.string()),
    createdBy: v.id("users"),
    isActive: v.boolean(),
  })
    .index("by_creator", ["createdBy"]),

  // User group members (many-to-many)
  userGroupMembers: defineTable({
    userId: v.id("users"),
    groupId: v.id("userGroups"),
    addedBy: v.id("users"),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"]),

  // Individual content access (supports all three patterns)
  contentAccess: defineTable({
    contentId: v.id("content"),
    userId: v.optional(v.id("users")), // Individual user access
    userGroupId: v.optional(v.id("userGroups")), // User group access
    role: v.optional(v.union(
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    )), // Role-based access
    grantedBy: v.id("users"),
    expiresAt: v.optional(v.number()),
    canShare: v.boolean(),
  })
    .index("by_content", ["contentId"])
    .index("by_user", ["userId"])
    .index("by_group", ["userGroupId"])
    .index("by_role", ["role"]),

  // Content group access (supports all three patterns)
  contentGroupAccess: defineTable({
    groupId: v.id("contentGroups"),
    userId: v.optional(v.id("users")), // Individual user access
    userGroupId: v.optional(v.id("userGroups")), // User group access
    role: v.optional(v.union(
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    )), // Role-based access
    grantedBy: v.id("users"),
    expiresAt: v.optional(v.number()),
    canShare: v.boolean(),
  })
    .index("by_group", ["groupId"])
    .index("by_user", ["userId"])
    .index("by_user_group", ["userGroupId"])
    .index("by_role", ["role"]),

  // Content sharing to third parties
  contentShares: defineTable({
    contentId: v.id("content"),
    sharedBy: v.id("users"),
    recipientEmail: v.string(),
    recipientName: v.optional(v.string()),
    message: v.optional(v.string()),
    expiresAt: v.optional(v.number()),
    accessToken: v.string(),
    viewCount: v.number(),
    lastViewedAt: v.optional(v.number()),
  })
    .index("by_content", ["contentId"])
    .index("by_sharer", ["sharedBy"])
    .index("by_token", ["accessToken"]),

  // User invitations
  invitations: defineTable({
    email: v.string(),
    role: v.union(
      v.literal("editor"),
      v.literal("contributor"),
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    ),
    invitedBy: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
    acceptedAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_email", ["email"])
    .index("by_token", ["token"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
