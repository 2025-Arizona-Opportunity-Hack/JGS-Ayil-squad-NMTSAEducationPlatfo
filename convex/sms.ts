import { Twilio } from "@convex-dev/twilio";
import { components } from "./_generated/api";
import { internalAction, internalQuery, mutation, query } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";
import { getAuthUserId } from "@convex-dev/auth/server";

// Initialize Twilio component lazily to avoid startup errors when credentials are missing
let _twilio: ReturnType<typeof createTwilio> | null = null;

function createTwilio() {
  return new Twilio(components.twilio, {
    defaultFrom: process.env.TWILIO_PHONE_NUMBER || "",
  });
}

export function getTwilio() {
  if (!_twilio) {
    _twilio = createTwilio();
  }
  return _twilio;
}

// Check if Twilio credentials are configured
export function isTwilioConfigured(): boolean {
  return !!(process.env.TWILIO_ACCOUNT_SID && process.env.TWILIO_AUTH_TOKEN);
}

// Helper to get site settings for SMS branding
export const getSiteSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("siteSettings").first();
    return settings;
  },
});

// Helper to get user profile by ID
export const getUserProfile = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", args.userId))
      .unique();
    return profile;
  },
});

// Helper to get content details
export const getContentDetails = internalQuery({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    const content = await ctx.db.get(args.contentId);
    return content;
  },
});

// Generate a 6-digit verification code
function generateVerificationCode(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// ============================================
// PHONE VERIFICATION
// ============================================

// Start phone verification - sends SMS with code
export const startPhoneVerification = mutation({
  args: {
    phoneNumber: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    // Validate phone number format (basic E.164 validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(args.phoneNumber)) {
      throw new Error("Invalid phone number format. Please use E.164 format (e.g., +14155551234)");
    }

    // Check if phone number is already verified by another user
    const existingProfile = await ctx.db
      .query("userProfiles")
      .withIndex("by_phone", (q) => q.eq("phoneNumber", args.phoneNumber))
      .filter((q) => q.eq(q.field("phoneVerified"), true))
      .first();

    if (existingProfile && existingProfile.userId !== userId) {
      throw new Error("This phone number is already registered to another account");
    }

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    // Update profile with pending verification
    await ctx.db.patch(profile._id, {
      phoneNumber: args.phoneNumber,
      phoneVerified: false,
      phoneVerificationCode: verificationCode,
      phoneVerificationExpires: expiresAt,
    });

    // Schedule SMS sending
    await ctx.scheduler.runAfter(0, internal.sms.sendVerificationSms, {
      phoneNumber: args.phoneNumber,
      verificationCode,
    });

    return { success: true, message: "Verification code sent" };
  },
});

// Send verification SMS
export const sendVerificationSms = internalAction({
  args: {
    phoneNumber: v.string(),
    verificationCode: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(internal.sms.getSiteSettings);
    const orgName = settings?.organizationName || "NMTSA Education Platform";

    await getTwilio().sendMessage(ctx, {
      to: args.phoneNumber,
      body: `Your ${orgName} verification code is: ${args.verificationCode}. This code expires in 10 minutes.`,
    });
  },
});

// Verify phone number with code
export const verifyPhoneNumber = mutation({
  args: {
    code: v.string(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    if (!profile.phoneVerificationCode || !profile.phoneVerificationExpires) {
      throw new Error("No pending verification. Please request a new code.");
    }

    if (Date.now() > profile.phoneVerificationExpires) {
      throw new Error("Verification code has expired. Please request a new code.");
    }

    if (profile.phoneVerificationCode !== args.code) {
      throw new Error("Invalid verification code");
    }

    // Mark phone as verified and enable SMS notifications by default
    await ctx.db.patch(profile._id, {
      phoneVerified: true,
      phoneVerificationCode: undefined,
      phoneVerificationExpires: undefined,
      smsNotificationsEnabled: true,
    });

    return { success: true, message: "Phone number verified successfully" };
  },
});

// Resend verification code
export const resendVerificationCode = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");
    if (!profile.phoneNumber) throw new Error("No phone number on file");

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const expiresAt = Date.now() + 10 * 60 * 1000; // 10 minutes

    await ctx.db.patch(profile._id, {
      phoneVerificationCode: verificationCode,
      phoneVerificationExpires: expiresAt,
    });

    // Schedule SMS sending
    await ctx.scheduler.runAfter(0, internal.sms.sendVerificationSms, {
      phoneNumber: profile.phoneNumber,
      verificationCode,
    });

    return { success: true, message: "New verification code sent" };
  },
});

// Toggle SMS notifications
export const toggleSmsNotifications = mutation({
  args: {
    enabled: v.boolean(),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) throw new Error("Profile not found");

    if (args.enabled && !profile.phoneVerified) {
      throw new Error("Please verify your phone number first");
    }

    await ctx.db.patch(profile._id, {
      smsNotificationsEnabled: args.enabled,
    });

    return { success: true };
  },
});

// Get phone verification status
export const getPhoneStatus = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();

    if (!profile) return null;

    return {
      phoneNumber: profile.phoneNumber,
      phoneVerified: profile.phoneVerified || false,
      smsNotificationsEnabled: profile.smsNotificationsEnabled || false,
      hasPendingVerification: !!(profile.phoneVerificationCode && profile.phoneVerificationExpires && profile.phoneVerificationExpires > Date.now()),
    };
  },
});

// ============================================
// SMS NOTIFICATION ACTIONS
// ============================================

// Send SMS when content access is granted
export const sendContentAccessSms = internalAction({
  args: {
    userId: v.id("users"),
    contentId: v.id("content"),
    granterName: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(internal.sms.getUserProfile, { userId: args.userId });
    
    if (!profile?.phoneNumber || !profile.phoneVerified || !profile.smsNotificationsEnabled) {
      return; // User doesn't have SMS notifications enabled
    }

    const content = await ctx.runQuery(internal.sms.getContentDetails, { contentId: args.contentId });
    const settings = await ctx.runQuery(internal.sms.getSiteSettings);
    
    if (!content) return;

    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";

    await getTwilio().sendMessage(ctx, {
      to: profile.phoneNumber,
      body: `${orgName}: ${args.granterName} has given you access to "${content.title}". View it at ${baseUrl}`,
    });
  },
});

// Send SMS invitation (for admin/editor/contributor roles)
export const sendInviteSms = internalAction({
  args: {
    phoneNumber: v.string(),
    inviteCode: v.string(),
    role: v.string(),
    inviterName: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(internal.sms.getSiteSettings);
    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";

    const inviteUrl = `${baseUrl}?invite=${args.inviteCode}`;

    await getTwilio().sendMessage(ctx, {
      to: args.phoneNumber,
      body: `${args.inviterName} invited you to join ${orgName} as a ${args.role}. Use code ${args.inviteCode} or visit: ${inviteUrl}`,
    });
  },
});

// Send SMS client invitation (for client/parent/professional roles)
export const sendClientInviteSms = internalAction({
  args: {
    phoneNumber: v.string(),
    inviteCode: v.string(),
    role: v.string(),
    inviterName: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(internal.sms.getSiteSettings);
    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";

    const inviteUrl = `${baseUrl}?clientInvite=${args.inviteCode}`;

    const roleDescriptions: Record<string, string> = {
      client: "access educational content",
      parent: "manage family content",
      professional: "access professional resources",
    };

    const roleDesc = roleDescriptions[args.role] || "join our platform";

    await getTwilio().sendMessage(ctx, {
      to: args.phoneNumber,
      body: `${args.inviterName} invited you to ${orgName} to ${roleDesc}. Use code ${args.inviteCode} or visit: ${inviteUrl}`,
    });
  },
});

// Send SMS when content is recommended
export const sendRecommendationSms = internalAction({
  args: {
    userId: v.id("users"),
    contentId: v.id("content"),
    recommenderName: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(internal.sms.getUserProfile, { userId: args.userId });
    
    if (!profile?.phoneNumber || !profile.phoneVerified || !profile.smsNotificationsEnabled) {
      return; // User doesn't have SMS notifications enabled
    }

    const content = await ctx.runQuery(internal.sms.getContentDetails, { contentId: args.contentId });
    const settings = await ctx.runQuery(internal.sms.getSiteSettings);
    
    if (!content) return;

    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";

    await getTwilio().sendMessage(ctx, {
      to: profile.phoneNumber,
      body: `${orgName}: ${args.recommenderName} recommended "${content.title}" for you. Check it out at ${baseUrl}`,
    });
  },
});

// Send SMS when purchase request is approved
export const sendPurchaseApprovedSms = internalAction({
  args: {
    userId: v.id("users"),
    contentId: v.id("content"),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(internal.sms.getUserProfile, { userId: args.userId });
    
    if (!profile?.phoneNumber || !profile.phoneVerified || !profile.smsNotificationsEnabled) {
      return;
    }

    const content = await ctx.runQuery(internal.sms.getContentDetails, { contentId: args.contentId });
    const settings = await ctx.runQuery(internal.sms.getSiteSettings);
    
    if (!content) return;

    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";

    await getTwilio().sendMessage(ctx, {
      to: profile.phoneNumber,
      body: `${orgName}: Your request to purchase "${content.title}" has been approved! Complete your purchase at ${baseUrl}`,
    });
  },
});

// Send SMS when content status changes (for authors)
export const sendContentStatusSms = internalAction({
  args: {
    authorId: v.id("users"),
    contentTitle: v.string(),
    newStatus: v.string(),
  },
  handler: async (ctx, args) => {
    const profile = await ctx.runQuery(internal.sms.getUserProfile, { userId: args.authorId });
    
    if (!profile?.phoneNumber || !profile.phoneVerified || !profile.smsNotificationsEnabled) {
      return;
    }

    const settings = await ctx.runQuery(internal.sms.getSiteSettings);
    const orgName = settings?.organizationName || "NMTSA Education Platform";

    const statusMessages: Record<string, string> = {
      published: `Your content "${args.contentTitle}" has been published!`,
      rejected: `Your content "${args.contentTitle}" needs revision.`,
      changes_requested: `Changes requested for "${args.contentTitle}".`,
    };

    const message = statusMessages[args.newStatus] || `Status update for "${args.contentTitle}": ${args.newStatus}`;

    await getTwilio().sendMessage(ctx, {
      to: profile.phoneNumber,
      body: `${orgName}: ${message}`,
    });
  },
});
