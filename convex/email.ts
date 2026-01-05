"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";

// Initialize Resend with API key from environment
const resend = new Resend(
  process.env.RESEND_API_KEY || "re_DVi5fiVz_LCbnqa7ZYmmqoEFAhgdfiWnN"
);

// Configuration based on environment
// Set ENVIRONMENT=production in Convex env vars to enable production mode
// Defaults to testing mode (sends to mattyost00@gmail.com)
const IS_PRODUCTION = process.env.ENVIRONMENT === "production";
const TEST_EMAIL = "mattyost00@gmail.com"; // Verified test email for Resend testing mode
const PRODUCTION_DOMAIN = "nmtsa"; // Your production domain

/**
 * Send verification email for join request
 */
export const sendVerificationEmail = action({
  args: {
    email: v.string(),
    firstName: v.string(),
    verificationToken: v.string(),
    baseUrl: v.string(),
  },
  handler: async (ctx, args) => {
    const { email, firstName, verificationToken, baseUrl } = args;

    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    // Determine email addresses based on environment
    const actualEmail = email.trim().toLowerCase();
    const recipientEmail = IS_PRODUCTION
      ? actualEmail // Production: send to actual email
      : TEST_EMAIL; // Testing: always send to verified test email

    const fromEmail = IS_PRODUCTION
      ? `noreply@${PRODUCTION_DOMAIN}.com` // Production: use your domain
      : "onboarding@resend.dev"; // Testing: use Resend test domain

    console.log(
      `[Email] Environment: ${IS_PRODUCTION ? "PRODUCTION" : "TESTING"}`
    );
    console.log(`[Email] Original email: ${actualEmail}`);
    console.log(`[Email] Sending to: ${recipientEmail}`);
    console.log(`[Email] From: ${fromEmail}`);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject: "Verify your email address",
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
                <h2 style="color: #2563eb; margin-top: 0;">Hi ${firstName}!</h2>
                ${!IS_PRODUCTION ? `<p style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin-bottom: 20px; font-size: 12px;"><strong>TEST MODE:</strong> This email was sent to the test address. Your actual email (${actualEmail}) is registered in our system.</p>` : ""}
                <p>Thanks for requesting access to our platform. To complete your request, please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" style="background-color: #2563eb; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: bold;">Verify Email Address</a>
                </div>
                <p style="font-size: 14px; color: #666;">Or copy and paste this link into your browser:</p>
                <p style="font-size: 12px; color: #999; word-break: break-all;">${verificationUrl}</p>
                <p style="font-size: 14px; color: #666; margin-top: 30px;">This link will expire in 24 hours.</p>
                <p style="font-size: 14px; color: #666;">If you didn't request access, you can safely ignore this email.</p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error("[Email Debug] Resend error:", error);
        console.error("[Email Debug] Error message:", error.message);
        console.error(
          "[Email Debug] Full error object:",
          JSON.stringify(error, null, 2)
        );

        // Handle Resend testing limitation - check if it's a testing mode restriction
        if (
          error.message?.includes(
            "only send testing emails to your own email"
          ) ||
          error.message?.includes("verify a domain")
        ) {
          // In testing mode, log warning but don't throw
          // The join request is already created, email just couldn't be sent
          // This is expected behavior during testing - user can resend email later
          console.warn(
            `[Email Debug] Resend testing mode: Cannot send email to "${recipientEmail}". Expected verified email: "${TEST_EMAIL}". Request was created - user can resend verification email later.`
          );

          // If email matches verified test email but still fails, something else is wrong
          if (recipientEmail === TEST_EMAIL) {
            console.error(
              "[Email Debug] WARNING: Email matches verified test email but still failed! Check Resend account settings or API key."
            );
          }

          // Return success: false but don't throw - this is expected in testing
          return {
            success: false,
            testingMode: true,
            message: "Email not sent (testing mode restriction)",
            data: null,
          };
        }

        // For other errors, still throw so we know something went wrong
        throw new Error(`Failed to send email: ${error.message}`);
      }

      return { success: true, data };
    } catch (error) {
      console.error("Error sending verification email:", error);

      // Check if it's a testing mode restriction
      if (
        error instanceof Error &&
        (error.message.includes("only send testing emails") ||
          error.message.includes("verify a domain"))
      ) {
        // Return testing mode flag instead of throwing
        // This is expected behavior during testing
        console.warn(
          `Testing mode: Email to ${recipientEmail} not sent. Only verified test email allowed.`
        );
        return {
          success: false,
          testingMode: true,
          message: "Email not sent (testing mode)",
          data: null,
        };
      }

      // For unexpected errors, log but don't crash - request is already created
      console.error(
        "Unexpected error sending email (request was still created):",
        error
      );
      return {
        success: false,
        testingMode: false,
        message: "Email sending failed",
        data: null,
      };
    }
  },
});
