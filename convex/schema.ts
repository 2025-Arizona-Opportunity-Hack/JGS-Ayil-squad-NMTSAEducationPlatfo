import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const applicationTables = {
  // Site settings (singleton - only one record)
  siteSettings: defineTable({
    organizationName: v.string(),
    tagline: v.optional(v.string()),
    description: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
    faviconId: v.optional(v.id("_storage")),
    primaryColor: v.optional(v.string()),
    setupCompleted: v.boolean(),
    setupCompletedAt: v.optional(v.number()),
    setupCompletedBy: v.optional(v.id("users")),
    updatedAt: v.optional(v.number()),
    updatedBy: v.optional(v.id("users")),
  }),

  // User profiles
  userProfiles: defineTable({
    userId: v.id("users"),
    role: v.union(
      v.literal("owner"),
      v.literal("admin"),
      v.literal("editor"),
      v.literal("contributor"),
      v.literal("client"),
      v.literal("parent"),
      v.literal("professional")
    ),
    // Permission-based access control - array of permission strings
    // If not set, defaults are derived from role
    permissions: v.optional(v.array(v.string())),
    firstName: v.string(),
    lastName: v.string(),
    profilePictureId: v.optional(v.id("_storage")),
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
    description: v.optional(v.string()), // Short description
    // Main attachment - one of these types (optional for legacy content migration)
    attachmentType: v.optional(v.union(
      v.literal("video"),
      v.literal("image"),
      v.literal("pdf"),
      v.literal("audio"),
      v.literal("richtext")
    )),
    // For file-based attachments (video, image, pdf, audio)
    fileId: v.optional(v.id("_storage")),
    externalUrl: v.optional(v.string()), // For external video/audio URLs
    // File metadata
    thumbnailId: v.optional(v.id("_storage")),
    duration: v.optional(v.number()),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
    // Access control
    isPublic: v.boolean(),
    createdBy: v.id("users"),
    authorName: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
    accessExpiresAt: v.optional(v.number()),
    // Availability control fields
    active: v.optional(v.boolean()),
    startDate: v.optional(v.number()),
    endDate: v.optional(v.number()),
    // Workflow fields
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("review"),
        v.literal("published"),
        v.literal("rejected"),
        v.literal("changes_requested")
      )
    ),
    submittedForReviewAt: v.optional(v.number()),
    submittedForReviewBy: v.optional(v.id("users")),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    reviewNotes: v.optional(v.string()),
    publishedAt: v.optional(v.number()),
    // Archive
    isArchived: v.optional(v.boolean()),
    archivedAt: v.optional(v.number()),
    archivedBy: v.optional(v.id("users")),
    // Password protection
    password: v.optional(v.string()),
    // Legacy fields for migration (can be removed after migration)
    type: v.optional(v.union(
      v.literal("video"),
      v.literal("article"),
      v.literal("document"),
      v.literal("audio")
    )),
    body: v.optional(v.string()),
    organizationId: v.optional(v.string()),
  })
    .index("by_creator", ["createdBy"])
    .index("by_attachment_type", ["attachmentType"])
    .index("by_public", ["isPublic"])
    .index("by_status", ["status"])
    .index("by_active", ["active"])
    .index("by_archived", ["isArchived"])
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
  }).index("by_creator", ["createdBy"]),

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
  }).index("by_creator", ["createdBy"]),

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
    role: v.optional(
      v.union(
        v.literal("client"),
        v.literal("parent"),
        v.literal("professional")
      )
    ), // Role-based access
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
    role: v.optional(
      v.union(
        v.literal("client"),
        v.literal("parent"),
        v.literal("professional")
      )
    ), // Role-based access
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

  // Invite codes (for role-based invites without specific emails)
  inviteCodes: defineTable({
    code: v.string(),
    role: v.union(
      v.literal("admin"),
      v.literal("editor"),
      v.literal("contributor")
    ),
    createdBy: v.id("users"),
    createdAt: v.number(),
    expiresAt: v.optional(v.number()),
    isActive: v.boolean(),
  })
    .index("by_code", ["code"])
    .index("by_creator", ["createdBy"]),

  // Content pricing (for content items available for purchase)
  contentPricing: defineTable({
    contentId: v.id("content"),
    price: v.number(), // Price in cents (e.g., 1999 = $19.99)
    currency: v.string(), // e.g., "USD"
    accessDuration: v.optional(v.number()), // Duration in milliseconds, undefined = indefinite
    isActive: v.boolean(),
    createdBy: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_content", ["contentId"])
    .index("by_active", ["isActive"]),

  // Orders (purchases made by users)
  orders: defineTable({
    userId: v.id("users"),
    contentId: v.id("content"),
    pricingId: v.id("contentPricing"),
    amount: v.number(), // Amount paid in cents
    currency: v.string(),
    status: v.union(
      v.literal("pending"),
      v.literal("completed"),
      v.literal("failed"),
      v.literal("refunded")
    ),
    paymentMethod: v.string(), // e.g., "mock_payment", "stripe", etc.
    accessExpiresAt: v.optional(v.number()), // When access expires
    createdAt: v.number(),
    completedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"])
    .index("by_status", ["status"])
    .index("by_created_at", ["createdAt"]),

  // Content views (track individual views of content)
  contentViews: defineTable({
    contentId: v.id("content"),
    userId: v.optional(v.id("users")), // Optional for anonymous views
    viewedAt: v.number(),
    sessionId: v.string(), // To track unique sessions
  })
    .index("by_content", ["contentId"])
    .index("by_user", ["userId"])
    .index("by_content_user", ["contentId", "userId"])
    .index("by_viewed_at", ["viewedAt"]),

  // Purchase requests (users request permission to purchase content)
  purchaseRequests: defineTable({
    userId: v.id("users"),
    contentId: v.id("content"),
    status: v.union(
      v.literal("pending"),
      v.literal("approved"),
      v.literal("denied")
    ),
    message: v.optional(v.string()), // Optional message from user explaining why they want access
    adminNotes: v.optional(v.string()), // Notes from admin when approving/denying
    createdAt: v.number(),
    reviewedAt: v.optional(v.number()),
    reviewedBy: v.optional(v.id("users")),
    // Once approved, track if they've completed the purchase
    purchaseCompletedAt: v.optional(v.number()),
  })
    .index("by_user", ["userId"])
    .index("by_content", ["contentId"])
    .index("by_status", ["status"])
    .index("by_user_content", ["userId", "contentId"]),

  // Content recommendations (professionals recommend content to users)
  contentRecommendations: defineTable({
    contentId: v.id("content"),
    recommendedBy: v.id("users"), // Professional who made the recommendation
    recipientEmail: v.string(), // Email of the user receiving the recommendation
    recipientUserId: v.optional(v.id("users")), // Set when recipient has an account
    message: v.optional(v.string()), // Optional message from the professional
    createdAt: v.number(),
    viewedAt: v.optional(v.number()), // When the recipient viewed the recommendation
    isActive: v.boolean(), // Can be deactivated
  })
    .index("by_content", ["contentId"])
    .index("by_recommender", ["recommendedBy"])
    .index("by_recipient_email", ["recipientEmail"])
    .index("by_recipient_user", ["recipientUserId"])
    .index("by_active", ["isActive"]),
};

export default defineSchema({
  ...authTables,
  ...applicationTables,
});
