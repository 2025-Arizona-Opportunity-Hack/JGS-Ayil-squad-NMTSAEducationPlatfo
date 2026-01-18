import { Resend } from "@convex-dev/resend";
import { components } from "./_generated/api";
import { internalAction, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { v } from "convex/values";

// Initialize Resend component
// Note: testMode defaults to true - set to false in production with verified domain
export const resend = new Resend(components.resend, {
  // Set testMode: false when you have a verified domain in Resend
  // testMode: false,
});

// Helper to get site settings for email branding
export const getSiteSettings = internalQuery({
  args: {},
  handler: async (ctx) => {
    const settings = await ctx.db.query("siteSettings").first();
    return settings;
  },
});

// Helper to get user email by ID
export const getUserEmail = internalQuery({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    const user = await ctx.db.get(args.userId);
    return user?.email || null;
  },
});

// Helper to get user profile
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

// ============================================
// EMAIL SENDING ACTIONS
// ============================================

// Send verification email for join request
export const sendVerificationEmail = internalAction({
  args: {
    email: v.string(),
    firstName: v.string(),
    verificationToken: v.string(),
    baseUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { email, firstName, verificationToken, baseUrl } = args;
    const settings = await ctx.runQuery(internal.emails.getSiteSettings);
    const orgName = settings?.organizationName || "NMTSA Education Platform";

    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    try {
      await resend.sendEmail(ctx, {
        from: `${orgName} <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
        to: email,
        subject: "Verify your email address",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                <h1 style="color: white; margin: 0; font-size: 24px;">Verify Your Email</h1>
              </div>
              <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                <p style="font-size: 16px;">Hi ${firstName}!</p>
                <p style="font-size: 16px;">Thanks for requesting access to ${orgName}. To complete your request, please verify your email address by clicking the button below:</p>
                <p style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Verify Email Address</a>
                </p>
                <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #999; word-break: break-all;">${verificationUrl}</p>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 24 hours.</p>
                <p style="font-size: 14px; color: #666;">If you didn't request access, you can safely ignore this email.</p>
              </div>
            </body>
          </html>
        `,
      });

      return { success: true };
    } catch (error) {
      console.error("Error sending verification email:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  },
});

// Send invitation email with invite code
export const sendInviteEmail = internalAction({
  args: {
    recipientEmail: v.string(),
    inviteCode: v.string(),
    role: v.string(),
    inviterName: v.string(),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(internal.emails.getSiteSettings);
    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";

    const inviteUrl = `${baseUrl}?invite=${args.inviteCode}`;

    await resend.sendEmail(ctx, {
      from: `${orgName} <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
      to: args.recipientEmail,
      subject: `You've been invited to join ${orgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">You're Invited!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi there,</p>
            <p style="font-size: 16px;"><strong>${args.inviterName}</strong> has invited you to join <strong>${orgName}</strong> as a <strong>${args.role}</strong>.</p>
            <p style="font-size: 16px;">Use the invite code below to create your account:</p>
            <div style="background: #fff; border: 2px dashed #667eea; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #667eea;">${args.inviteCode}</span>
            </div>
            <p style="text-align: center;">
              <a href="${inviteUrl}" style="display: inline-block; background: #667eea; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Join Now</a>
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
      `,
    });
  },
});

// Send client invite email (for client portal users)
export const sendClientInviteEmail = internalAction({
  args: {
    recipientEmail: v.string(),
    inviteCode: v.string(),
    role: v.string(),
    inviterName: v.string(),
    recipientFirstName: v.optional(v.string()),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const settings = await ctx.runQuery(internal.emails.getSiteSettings);
    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";

    const inviteUrl = `${baseUrl}?clientInvite=${args.inviteCode}`;
    const greeting = args.recipientFirstName ? `Hi ${args.recipientFirstName}` : "Hi there";

    const roleDescriptions: Record<string, string> = {
      client: "access educational content and resources",
      parent: "manage your family's educational content",
      professional: "access professional resources and recommend content",
    };

    const roleDescription = roleDescriptions[args.role] || "access our platform";

    await resend.sendEmail(ctx, {
      from: `${orgName} <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
      to: args.recipientEmail,
      subject: `${args.inviterName} invited you to ${orgName}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to ${orgName}!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">${greeting},</p>
            <p style="font-size: 16px;"><strong>${args.inviterName}</strong> has invited you to join <strong>${orgName}</strong> to ${roleDescription}.</p>
            ${args.message ? `
            <div style="background: #fff; border-left: 4px solid #3b82f6; padding: 15px; margin: 20px 0;">
              <p style="margin: 0; font-size: 14px; color: #666;"><strong>Personal message:</strong></p>
              <p style="margin: 10px 0 0 0; font-size: 14px;">"${args.message}"</p>
            </div>
            ` : ''}
            <p style="font-size: 16px;">Use the invite code below to create your account:</p>
            <div style="background: #fff; border: 2px dashed #3b82f6; border-radius: 8px; padding: 20px; text-align: center; margin: 20px 0;">
              <span style="font-size: 28px; font-weight: bold; letter-spacing: 4px; color: #3b82f6;">${args.inviteCode}</span>
            </div>
            <p style="text-align: center;">
              <a href="${inviteUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Create Your Account</a>
            </p>
            <p style="font-size: 14px; color: #666; margin-top: 30px;">If you didn't expect this invitation, you can safely ignore this email.</p>
          </div>
        </body>
        </html>
      `,
    });
  },
});

// Send purchase request approved email
export const sendPurchaseApprovedEmail = internalAction({
  args: {
    userId: v.id("users"),
    contentId: v.id("content"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userEmail = await ctx.runQuery(internal.emails.getUserEmail, { userId: args.userId });
    const userProfile = await ctx.runQuery(internal.emails.getUserProfile, { userId: args.userId });
    const content = await ctx.runQuery(internal.emails.getContentDetails, { contentId: args.contentId });
    const settings = await ctx.runQuery(internal.emails.getSiteSettings);

    if (!userEmail || !content) return;

    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";
    const userName = userProfile ? `${userProfile.firstName}` : "there";

    await resend.sendEmail(ctx, {
      from: `${orgName} <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
      to: userEmail,
      subject: `Your purchase request has been approved - ${content.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">✓ Request Approved!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${userName},</p>
            <p style="font-size: 16px;">Great news! Your request to purchase <strong>"${content.title}"</strong> has been approved.</p>
            ${args.adminNotes ? `<div style="background: #fff; border-left: 4px solid #10b981; padding: 15px; margin: 20px 0;"><p style="margin: 0; font-size: 14px; color: #666;"><strong>Note from admin:</strong> ${args.adminNotes}</p></div>` : ''}
            <p style="font-size: 16px;">You can now complete your purchase and access this content.</p>
            <p style="text-align: center; margin-top: 25px;">
              <a href="${baseUrl}" style="display: inline-block; background: #10b981; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Complete Purchase</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });
  },
});

// Send purchase request denied email
export const sendPurchaseDeniedEmail = internalAction({
  args: {
    userId: v.id("users"),
    contentId: v.id("content"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userEmail = await ctx.runQuery(internal.emails.getUserEmail, { userId: args.userId });
    const userProfile = await ctx.runQuery(internal.emails.getUserProfile, { userId: args.userId });
    const content = await ctx.runQuery(internal.emails.getContentDetails, { contentId: args.contentId });
    const settings = await ctx.runQuery(internal.emails.getSiteSettings);

    if (!userEmail || !content) return;

    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const userName = userProfile ? `${userProfile.firstName}` : "there";

    await resend.sendEmail(ctx, {
      from: `${orgName} <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
      to: userEmail,
      subject: `Update on your purchase request - ${content.title}`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">Request Update</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${userName},</p>
            <p style="font-size: 16px;">We've reviewed your request to purchase <strong>"${content.title}"</strong> and unfortunately, we're unable to approve it at this time.</p>
            ${args.adminNotes ? `<div style="background: #fff; border-left: 4px solid #6b7280; padding: 15px; margin: 20px 0;"><p style="margin: 0; font-size: 14px; color: #666;"><strong>Reason:</strong> ${args.adminNotes}</p></div>` : ''}
            <p style="font-size: 16px;">If you have any questions, please don't hesitate to reach out to us.</p>
          </div>
        </body>
        </html>
      `,
    });
  },
});

// Send content access granted email
export const sendContentAccessGrantedEmail = internalAction({
  args: {
    userId: v.id("users"),
    contentId: v.id("content"),
    granterName: v.string(),
    expiresAt: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const userEmail = await ctx.runQuery(internal.emails.getUserEmail, { userId: args.userId });
    const userProfile = await ctx.runQuery(internal.emails.getUserProfile, { userId: args.userId });
    const content = await ctx.runQuery(internal.emails.getContentDetails, { contentId: args.contentId });
    const settings = await ctx.runQuery(internal.emails.getSiteSettings);

    if (!userEmail || !content) return;

    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";
    const userName = userProfile ? `${userProfile.firstName}` : "there";
    const expiryText = args.expiresAt 
      ? `Access expires on ${new Date(args.expiresAt).toLocaleDateString()}.`
      : "You have permanent access to this content.";

    await resend.sendEmail(ctx, {
      from: `${orgName} <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
      to: userEmail,
      subject: `You've been given access to "${content.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">🎁 New Content Access!</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${userName},</p>
            <p style="font-size: 16px;"><strong>${args.granterName}</strong> has given you access to:</p>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">${content.title}</h3>
              ${content.description ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">${content.description}</p>` : ''}
            </div>
            <p style="font-size: 14px; color: #666;">${expiryText}</p>
            <p style="text-align: center; margin-top: 25px;">
              <a href="${baseUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Content</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });
  },
});

// Send content recommendation email
export const sendRecommendationEmail = internalAction({
  args: {
    recipientEmail: v.string(),
    contentId: v.id("content"),
    recommenderName: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const content = await ctx.runQuery(internal.emails.getContentDetails, { contentId: args.contentId });
    const settings = await ctx.runQuery(internal.emails.getSiteSettings);

    if (!content) return;

    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";

    await resend.sendEmail(ctx, {
      from: `${orgName} <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
      to: args.recipientEmail,
      subject: `${args.recommenderName} recommended "${content.title}" for you`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #f59e0b 0%, #d97706 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">⭐ Content Recommendation</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi there,</p>
            <p style="font-size: 16px;"><strong>${args.recommenderName}</strong> thinks you would benefit from this content:</p>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">${content.title}</h3>
              ${content.description ? `<p style="margin: 0; color: #6b7280; font-size: 14px;">${content.description}</p>` : ''}
            </div>
            ${args.message ? `<div style="background: #fffbeb; border-left: 4px solid #f59e0b; padding: 15px; margin: 20px 0;"><p style="margin: 0; font-size: 14px;"><strong>Personal message:</strong> "${args.message}"</p></div>` : ''}
            <p style="text-align: center; margin-top: 25px;">
              <a href="${baseUrl}" style="display: inline-block; background: #f59e0b; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Recommendation</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });
  },
});

// Send content status change email to author
export const sendContentStatusEmail = internalAction({
  args: {
    contentId: v.id("content"),
    authorId: v.id("users"),
    newStatus: v.string(),
    reviewerName: v.string(),
    reviewNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const authorEmail = await ctx.runQuery(internal.emails.getUserEmail, { userId: args.authorId });
    const authorProfile = await ctx.runQuery(internal.emails.getUserProfile, { userId: args.authorId });
    const content = await ctx.runQuery(internal.emails.getContentDetails, { contentId: args.contentId });
    const settings = await ctx.runQuery(internal.emails.getSiteSettings);

    if (!authorEmail || !content) return;

    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const baseUrl = process.env.SITE_URL || "https://nmtsa.com";
    const authorName = authorProfile ? `${authorProfile.firstName}` : "there";

    const statusConfig: Record<string, { color: string; title: string; message: string; icon: string }> = {
      published: {
        color: "#10b981",
        title: "Content Published! 🎉",
        message: "Your content has been approved and is now live.",
        icon: "✓",
      },
      rejected: {
        color: "#ef4444",
        title: "Content Needs Revision",
        message: "Your content has been reviewed and requires changes before it can be published.",
        icon: "✗",
      },
      changes_requested: {
        color: "#f59e0b",
        title: "Changes Requested",
        message: "The reviewer has requested some changes to your content.",
        icon: "⚠",
      },
      review: {
        color: "#3b82f6",
        title: "Content Under Review",
        message: "Your content has been submitted and is now being reviewed.",
        icon: "👀",
      },
    };

    const config = statusConfig[args.newStatus] || {
      color: "#6b7280",
      title: "Content Status Updated",
      message: `Your content status has been changed to ${args.newStatus}.`,
      icon: "ℹ",
    };

    await resend.sendEmail(ctx, {
      from: `${orgName} <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
      to: authorEmail,
      subject: `${config.title} - "${content.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: ${config.color}; padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">${config.icon} ${config.title}</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${authorName},</p>
            <p style="font-size: 16px;">${config.message}</p>
            <div style="background: #fff; border: 1px solid #e5e7eb; border-radius: 8px; padding: 20px; margin: 20px 0;">
              <h3 style="margin: 0 0 10px 0; color: #1f2937;">${content.title}</h3>
              <p style="margin: 0; color: #6b7280; font-size: 14px;">Reviewed by: ${args.reviewerName}</p>
            </div>
            ${args.reviewNotes ? `<div style="background: #fff; border-left: 4px solid ${config.color}; padding: 15px; margin: 20px 0;"><p style="margin: 0; font-size: 14px;"><strong>Reviewer notes:</strong> ${args.reviewNotes}</p></div>` : ''}
            <p style="text-align: center; margin-top: 25px;">
              <a href="${baseUrl}" style="display: inline-block; background: ${config.color}; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">View Content</a>
            </p>
          </div>
        </body>
        </html>
      `,
    });
  },
});

// Send content archived email to author
export const sendContentArchivedEmail = internalAction({
  args: {
    contentId: v.id("content"),
    authorId: v.id("users"),
    archiverName: v.string(),
  },
  handler: async (ctx, args) => {
    const authorEmail = await ctx.runQuery(internal.emails.getUserEmail, { userId: args.authorId });
    const authorProfile = await ctx.runQuery(internal.emails.getUserProfile, { userId: args.authorId });
    const content = await ctx.runQuery(internal.emails.getContentDetails, { contentId: args.contentId });
    const settings = await ctx.runQuery(internal.emails.getSiteSettings);

    if (!authorEmail || !content) return;

    const orgName = settings?.organizationName || "NMTSA Education Platform";
    const authorName = authorProfile ? `${authorProfile.firstName}` : "there";

    await resend.sendEmail(ctx, {
      from: `${orgName} <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
      to: authorEmail,
      subject: `Content Archived - "${content.title}"`,
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
        </head>
        <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background: linear-gradient(135deg, #6b7280 0%, #4b5563 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
            <h1 style="color: white; margin: 0; font-size: 24px;">📦 Content Archived</h1>
          </div>
          <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
            <p style="font-size: 16px;">Hi ${authorName},</p>
            <p style="font-size: 16px;">Your content <strong>"${content.title}"</strong> has been archived by ${args.archiverName}.</p>
            <p style="font-size: 14px; color: #666;">Archived content is no longer visible to users but can be restored by an administrator if needed.</p>
            <p style="font-size: 14px; color: #666;">If you have any questions about this action, please contact an administrator.</p>
          </div>
        </body>
        </html>
      `,
    });
  },
});
