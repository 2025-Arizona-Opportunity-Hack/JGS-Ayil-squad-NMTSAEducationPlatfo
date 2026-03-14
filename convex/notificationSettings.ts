import { v } from "convex/values";
import {
  query,
  mutation,
  internalAction,
  internalMutation,
  internalQuery,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { requirePermission } from "./helpers";
import { PERMISSIONS } from "./permissions";

const eventsValidator = v.object({
  contentAccessGranted: v.object({ email: v.boolean(), sms: v.boolean() }),
  joinRequestApproved: v.object({ email: v.boolean(), sms: v.boolean() }),
  purchaseRequestApproved: v.object({ email: v.boolean(), sms: v.boolean() }),
  purchaseRequestDenied: v.object({ email: v.boolean(), sms: v.boolean() }),
  recommendationSent: v.object({ email: v.boolean(), sms: v.boolean() }),
  verificationEmail: v.object({ email: v.boolean(), sms: v.boolean() }),
});

// Get notification settings (requires MANAGE_SITE_SETTINGS)
export const getNotificationSettings = query({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_SITE_SETTINGS);
    return await ctx.db.query("notificationSettings").first();
  },
});

// Internal query: get channel settings for a specific event
export const getEventSettings = internalQuery({
  args: { eventName: v.string() },
  handler: async (ctx, args) => {
    const settings = await ctx.db.query("notificationSettings").first();
    if (!settings) {
      return { email: true, sms: false };
    }
    const events = settings.events as Record<
      string,
      { email: boolean; sms: boolean }
    >;
    const eventSettings = events[args.eventName];
    if (!eventSettings) {
      return { email: true, sms: false };
    }
    return eventSettings;
  },
});

// Update notification settings (requires MANAGE_SITE_SETTINGS)
export const updateNotificationSettings = mutation({
  args: {
    events: eventsValidator,
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePermission(
      ctx,
      PERMISSIONS.MANAGE_SITE_SETTINGS
    );

    const existing = await ctx.db.query("notificationSettings").first();

    if (!existing) {
      throw new Error(
        "Notification settings not found. Please complete setup first."
      );
    }

    await ctx.db.patch(existing._id, {
      events: args.events,
      updatedAt: Date.now(),
      updatedBy: userId,
    });
  },
});

// Internal action: detect which notification channels are configured via env vars
export const refreshChannelStatus = internalAction({
  args: {},
  handler: async (ctx) => {
    const emailConfigured = Boolean(
      process.env.RESEND_API_KEY && process.env.RESEND_FROM_EMAIL
    );

    const smsConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
    );

    await ctx.runMutation(internal.notificationSettings.updateChannelStatus, {
      emailConfigured,
      smsConfigured,
    });
  },
});

// Internal mutation: persist channel availability to the notification settings doc
export const updateChannelStatus = internalMutation({
  args: {
    emailConfigured: v.boolean(),
    smsConfigured: v.boolean(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.query("notificationSettings").first();

    if (!existing) {
      return;
    }

    await ctx.db.patch(existing._id, {
      emailConfigured: args.emailConfigured,
      smsConfigured: args.smsConfigured,
      lastChannelCheck: Date.now(),
    });
  },
});

// Mutation: schedule a channel status refresh (requires MANAGE_SITE_SETTINGS)
export const triggerChannelStatusRefresh = mutation({
  args: {},
  handler: async (ctx) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_SITE_SETTINGS);

    await ctx.scheduler.runAfter(
      0,
      internal.notificationSettings.refreshChannelStatus,
      {}
    );
  },
});
