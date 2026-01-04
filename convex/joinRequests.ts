import { v } from "convex/values";
import { mutation, query, action } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getEffectivePermissions, hasPermission, PERMISSIONS } from "./permissions";
import { api } from "./_generated/api";

// Generate a secure random token
function generateVerificationToken(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  let token = "";
  for (let i = 0; i < 64; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return token;
}

// Create a join request (public - no auth required)
export const createJoinRequest = mutation({
  args: {
    email: v.string(),
    firstName: v.string(),
    lastName: v.string(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(args.email)) {
      throw new Error("Invalid email address");
    }

    // Check if a request with this email already exists
    const existingRequest = await ctx.db
      .query("joinRequests")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (existingRequest) {
      if (existingRequest.status === "pending_verification") {
        throw new Error("A verification email has already been sent to this address. Please check your email and click the verification link.");
      }
      if (existingRequest.status === "pending") {
        throw new Error("A join request with this email is already pending review");
      }
      if (existingRequest.status === "approved") {
        throw new Error("Your join request has already been approved. Please sign in to continue.");
      }
      if (existingRequest.status === "denied") {
        throw new Error("Your previous join request was denied. Please contact support if you believe this is an error.");
      }
    }

    // Check if a user with this email already exists and has a profile
    const allUsers = await ctx.db.query("users").collect();
    const existingUser = allUsers.find(
      (u) => u.email?.toLowerCase() === args.email.toLowerCase()
    );

    if (existingUser) {
      // Check if they have a profile
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", existingUser._id))
        .first();

      if (profile) {
        // User has a complete account - they should sign in
        throw new Error("An account with this email already exists. Please sign in instead. If you're having trouble signing in, try resetting your password.");
      }
      // If user exists but no profile, allow join request (they might have signed up but never completed profile creation)
    }

    // Generate verification token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours from now

    // Create the join request with pending_verification status
    const requestId = await ctx.db.insert("joinRequests", {
      email: args.email.toLowerCase(),
      firstName: args.firstName.trim(),
      lastName: args.lastName.trim(),
      message: args.message?.trim(),
      status: "pending_verification",
      emailVerified: false, // Explicitly set to false for new requests
      verificationToken,
      verificationTokenExpiresAt,
      createdAt: Date.now(),
    });

    // Send verification email (using action)
    // Determine base URL based on environment
    // For local development: use localhost (even if SITE_URL is set to production)
    // For production: use SITE_URL env var (must be explicitly set to production)
    const siteUrl = process.env.SITE_URL || "";
    const isProduction = process.env.ENVIRONMENT === "production";
    
    // Use localhost for local dev, production URL only when explicitly in production mode
    const baseUrl = isProduction && siteUrl
      ? siteUrl  // Production: use SITE_URL from env
      : "http://localhost:5173"; // Local dev: always use localhost
    
    console.log(`[Join Request] Base URL: ${baseUrl} (isProduction: ${isProduction}, SITE_URL: ${siteUrl || "not set"})`);
    
    // Schedule email to be sent (runs asynchronously)
    // Note: runAfter schedules the action but doesn't wait for its result
    // If email fails (e.g., testing mode), the request is still created
    // User can resend verification email later if needed
    try {
      await ctx.scheduler.runAfter(0, api.email.sendVerificationEmail, {
        email: args.email.toLowerCase(),
        firstName: args.firstName.trim(),
        verificationToken,
        baseUrl,
      });
    } catch (error) {
      // If scheduling fails, log but don't fail the request creation
      // The email action will handle testing mode errors internally
      console.warn("Failed to schedule verification email (request still created):", error);
    }

    return { requestId, status: "pending_verification" };
  },
});

// Verify email address using token
export const verifyJoinRequestEmail = mutation({
  args: {
    token: v.string(),
  },
  handler: async (ctx, args) => {
    // Find request by verification token
    const request = await ctx.db
      .query("joinRequests")
      .withIndex("by_verification_token", (q) => q.eq("verificationToken", args.token))
      .first();

    if (!request) {
      throw new Error("Invalid verification token. Please check your email and try again.");
    }

    // Check if already verified (handle legacy records that might not have emailVerified)
    if ((request.emailVerified ?? false) && request.status === "pending") {
      return { success: true, message: "Email already verified" };
    }

    // Check if token expired
    if (request.verificationTokenExpiresAt && request.verificationTokenExpiresAt < Date.now()) {
      throw new Error("Verification link has expired. Please request a new verification email.");
    }

    // Check if request was denied
    if (request.status === "denied") {
      throw new Error("This join request was denied. Please contact support if you believe this is an error.");
    }

    // Verify the email
    await ctx.db.patch(request._id, {
      emailVerified: true,
      status: "pending", // Change from pending_verification to pending
      verifiedAt: Date.now(),
      // Clear the token for security
      verificationToken: undefined,
      verificationTokenExpiresAt: undefined,
    });

    return { 
      success: true, 
      message: "Email verified successfully. Your request is now pending admin review.",
      email: request.email,
    };
  },
});

// Resend verification email
export const resendVerificationEmail = mutation({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("joinRequests")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .first();

    if (!request) {
      throw new Error("No join request found with this email address.");
    }

    if (request.emailVerified ?? false) {
      throw new Error("Email already verified. Your request is pending admin review.");
    }

    if (request.status === "denied") {
      throw new Error("This join request was denied. Please contact support.");
    }

    // Generate new token
    const verificationToken = generateVerificationToken();
    const verificationTokenExpiresAt = Date.now() + 24 * 60 * 60 * 1000; // 24 hours

    // Update request with new token
    await ctx.db.patch(request._id, {
      verificationToken,
      verificationTokenExpiresAt,
    });

    // Send verification email
    // Determine base URL based on environment (same logic as createJoinRequest)
    const siteUrl = process.env.SITE_URL || "";
    const isProduction = process.env.ENVIRONMENT === "production";
    
    // Use localhost for local dev, production URL only when explicitly in production mode
    const baseUrl = isProduction && siteUrl
      ? siteUrl  // Production: use SITE_URL from env
      : "http://localhost:5173"; // Local dev: always use localhost
    
    try {
      await ctx.scheduler.runAfter(0, api.email.sendVerificationEmail, {
        email: request.email,
        firstName: request.firstName,
        verificationToken,
        baseUrl,
      });
    } catch (error) {
      console.error("Failed to schedule email:", error);
      throw new Error("Failed to send verification email. Please try again later.");
    }

    return { success: true, message: "Verification email sent successfully." };
  },
});

// Check join request status by email (public - no auth required)
export const checkJoinRequestStatus = query({
  args: {
    email: v.string(),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("joinRequests")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .order("desc")
      .first();

    if (!request) {
      return null;
    }

    return {
      status: request.status,
      emailVerified: request.emailVerified,
      createdAt: request.createdAt,
      reviewedAt: request.reviewedAt,
      adminNotes: request.adminNotes,
      verifiedAt: request.verifiedAt,
    };
  },
});

// List all join requests (admin/owner only)
export const listJoinRequests = query({
  args: {
    status: v.optional(v.union(v.literal("pending"), v.literal("approved"), v.literal("denied"), v.literal("pending_verification"))),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.VIEW_USERS)) {
      throw new Error("You don't have permission to view join requests");
    }

    // Build query based on status filter
    // By default, only show verified pending requests (not pending_verification)
    let requests;
    if (args.status) {
      requests = await ctx.db
        .query("joinRequests")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .order("desc")
        .collect();
    } else {
      // Default: show all except pending_verification (only show verified requests)
      const allRequests = await ctx.db
        .query("joinRequests")
        .withIndex("by_created_at")
        .order("desc")
        .collect();
      // Filter out unverified requests - include legacy records (emailVerified undefined/null) with status "pending" 
      // as they were created before verification was required
      requests = allRequests.filter(r => 
        r.status !== "pending_verification" && 
        (r.status === "pending" ? (r.emailVerified ?? true) : true) // Legacy records are considered verified
      );
    }

    // Enrich with reviewer info
    const enrichedRequests = await Promise.all(
      requests.map(async (request) => {
        let reviewerName = null;
        if (request.reviewedBy) {
          const reviewerProfile = await ctx.db
            .query("userProfiles")
            .withIndex("by_user_id", (q) => q.eq("userId", request.reviewedBy!))
            .first();
          if (reviewerProfile) {
            reviewerName = `${reviewerProfile.firstName} ${reviewerProfile.lastName}`;
          }
        }

        return {
          ...request,
          reviewerName,
        };
      })
    );

    return enrichedRequests;
  },
});

// Approve a join request (admin/owner only)
export const approveJoinRequest = mutation({
  args: {
    requestId: v.id("joinRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.VIEW_USERS)) {
      throw new Error("You don't have permission to approve join requests");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Join request not found");

    if (request.status === "pending_verification") {
      throw new Error("This request's email has not been verified yet.");
    }
    if (request.status !== "pending") {
      throw new Error("This request has already been reviewed");
    }

    await ctx.db.patch(args.requestId, {
      status: "approved",
      reviewedAt: Date.now(),
      reviewedBy: userId,
      adminNotes: args.adminNotes,
    });

    return { success: true };
  },
});

// Deny a join request (admin/owner only)
export const denyJoinRequest = mutation({
  args: {
    requestId: v.id("joinRequests"),
    adminNotes: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .first();

    if (!profile) throw new Error("Profile not found");

    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.VIEW_USERS)) {
      throw new Error("You don't have permission to deny join requests");
    }

    const request = await ctx.db.get(args.requestId);
    if (!request) throw new Error("Join request not found");

    if (request.status === "pending_verification") {
      throw new Error("This request's email has not been verified yet.");
    }
    if (request.status !== "pending") {
      throw new Error("This request has already been reviewed");
    }

    await ctx.db.patch(args.requestId, {
      status: "denied",
      reviewedAt: Date.now(),
      reviewedBy: userId,
      adminNotes: args.adminNotes,
    });

    return { success: true };
  },
});

// Mark join request as account created (called when approved user signs up)
export const markJoinRequestAccountCreated = mutation({
  args: {
    email: v.string(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db
      .query("joinRequests")
      .withIndex("by_email", (q) => q.eq("email", args.email.toLowerCase()))
      .order("desc")
      .first();

    if (request && request.status === "approved" && !request.accountCreatedAt) {
      await ctx.db.patch(request._id, {
        accountCreatedAt: Date.now(),
        userId: args.userId,
      });
    }
  },
});

