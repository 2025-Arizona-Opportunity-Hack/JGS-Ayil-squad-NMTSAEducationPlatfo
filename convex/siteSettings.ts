import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

// Get site settings (public - no auth required for basic info)
export const getSiteSettings = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("siteSettings").first();
    
    if (!settings) {
      return null;
    }

    // Get logo URL if exists
    const logoUrl = settings.logoId
      ? await ctx.storage.getUrl(settings.logoId)
      : null;

    // Get favicon URL if exists
    const faviconUrl = settings.faviconId
      ? await ctx.storage.getUrl(settings.faviconId)
      : null;

    return {
      ...settings,
      logoUrl,
      faviconUrl,
    };
  },
});

// Check if site setup is needed
export const isSetupNeeded = query({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("siteSettings").first();
    return !settings || !settings.setupCompleted;
  },
});

// Complete initial site setup (owner only, first time)
export const completeSiteSetup = mutation({
  args: {
    organizationName: v.string(),
    tagline: v.optional(v.string()),
    description: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
    primaryColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is owner
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile || profile.role !== "owner") {
      throw new Error("Only the owner can complete site setup");
    }

    // Check if settings already exist
    const existingSettings = await ctx.db.query("siteSettings").first();

    if (existingSettings) {
      // Update existing settings
      await ctx.db.patch(existingSettings._id, {
        organizationName: args.organizationName,
        tagline: args.tagline,
        description: args.description,
        logoId: args.logoId,
        primaryColor: args.primaryColor,
        setupCompleted: true,
        setupCompletedAt: Date.now(),
        setupCompletedBy: userId,
        updatedAt: Date.now(),
        updatedBy: userId,
      });
      return existingSettings._id;
    } else {
      // Create new settings
      return await ctx.db.insert("siteSettings", {
        organizationName: args.organizationName,
        tagline: args.tagline,
        description: args.description,
        logoId: args.logoId,
        primaryColor: args.primaryColor,
        setupCompleted: true,
        setupCompletedAt: Date.now(),
        setupCompletedBy: userId,
      });
    }
  },
});

// Update site settings (admin/owner only)
export const updateSiteSettings = mutation({
  args: {
    organizationName: v.optional(v.string()),
    tagline: v.optional(v.string()),
    description: v.optional(v.string()),
    logoId: v.optional(v.id("_storage")),
    primaryColor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin or owner
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can update site settings");
    }

    const existingSettings = await ctx.db.query("siteSettings").first();

    if (!existingSettings) {
      throw new Error("Site settings not found. Please complete setup first.");
    }

    // Build update object with only provided fields
    const updateData: Record<string, any> = {
      updatedAt: Date.now(),
      updatedBy: userId,
    };

    if (args.organizationName !== undefined) {
      updateData.organizationName = args.organizationName;
    }
    if (args.tagline !== undefined) {
      updateData.tagline = args.tagline;
    }
    if (args.description !== undefined) {
      updateData.description = args.description;
    }
    if (args.logoId !== undefined) {
      updateData.logoId = args.logoId;
    }
    if (args.primaryColor !== undefined) {
      updateData.primaryColor = args.primaryColor;
    }

    await ctx.db.patch(existingSettings._id, updateData);
  },
});

// Generate upload URL for logo
export const generateLogoUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Check if user is admin or owner
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile || (profile.role !== "admin" && profile.role !== "owner")) {
      throw new Error("Only admins or the owner can upload logos");
    }

    return await ctx.storage.generateUploadUrl();
  },
});
