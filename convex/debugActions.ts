"use node";

import { action } from "./_generated/server";
import { v } from "convex/values";
import { Resend } from "resend";
import { twilio } from "./sms";

// Initialize Resend with API key from environment
const resend = new Resend(
  process.env.RESEND_API_KEY || "re_DVi5fiVz_LCbnqa7ZYmmqoEFAhgdfiWnN"
);

/**
 * Send a test email via Resend
 * For debugging email configuration
 */
export const sendTestEmail = action({
  args: {
    toEmail: v.string(),
    subject: v.string(),
    body: v.string(),
  },
  handler: async (ctx, args) => {
    const { toEmail, subject, body } = args;

    // Configuration based on environment
    const IS_PRODUCTION = process.env.ENVIRONMENT === "production";
    const TEST_EMAIL = "mattyost00@gmail.com";
    const PRODUCTION_DOMAIN = "nmtsa";

    const recipientEmail = IS_PRODUCTION ? toEmail.trim().toLowerCase() : TEST_EMAIL;
    const fromEmail = IS_PRODUCTION
      ? `noreply@${PRODUCTION_DOMAIN}.com`
      : "onboarding@resend.dev";

    console.log(`[Debug Email] Environment: ${IS_PRODUCTION ? "PRODUCTION" : "TESTING"}`);
    console.log(`[Debug Email] Requested recipient: ${toEmail}`);
    console.log(`[Debug Email] Actual recipient: ${recipientEmail}`);
    console.log(`[Debug Email] From: ${fromEmail}`);

    try {
      const { data, error } = await resend.emails.send({
        from: fromEmail,
        to: recipientEmail,
        subject: subject,
        html: `
          <!DOCTYPE html>
          <html>
            <head>
              <meta charset="utf-8">
              <meta name="viewport" content="width=device-width, initial-scale=1.0">
            </head>
            <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="background-color: #f8f9fa; padding: 30px; border-radius: 8px;">
                <h2 style="color: #2563eb; margin-top: 0;">Debug Test Email</h2>
                ${!IS_PRODUCTION ? `<p style="background-color: #fff3cd; border: 1px solid #ffc107; padding: 10px; border-radius: 4px; margin-bottom: 20px; font-size: 12px;"><strong>TEST MODE:</strong> This email was sent to the test address (${TEST_EMAIL}). Original recipient: ${toEmail}</p>` : ""}
                <p>${body}</p>
                <hr style="border: none; border-top: 1px solid #ddd; margin: 20px 0;">
                <p style="font-size: 12px; color: #666;">
                  Sent at: ${new Date().toISOString()}<br>
                  Environment: ${IS_PRODUCTION ? "Production" : "Testing"}<br>
                  From: ${fromEmail}
                </p>
              </div>
            </body>
          </html>
        `,
      });

      if (error) {
        console.error("[Debug Email] Error:", error);
        return {
          success: false,
          error: error.message,
          details: {
            environment: IS_PRODUCTION ? "production" : "testing",
            requestedRecipient: toEmail,
            actualRecipient: recipientEmail,
            from: fromEmail,
          },
        };
      }

      return {
        success: true,
        messageId: data?.id,
        details: {
          environment: IS_PRODUCTION ? "production" : "testing",
          requestedRecipient: toEmail,
          actualRecipient: recipientEmail,
          from: fromEmail,
        },
      };
    } catch (error) {
      console.error("[Debug Email] Exception:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          environment: IS_PRODUCTION ? "production" : "testing",
          requestedRecipient: toEmail,
          actualRecipient: recipientEmail,
          from: fromEmail,
        },
      };
    }
  },
});

/**
 * Send a test SMS via Twilio
 * For debugging SMS configuration
 */
export const sendTestSms = action({
  args: {
    toPhone: v.string(),
    message: v.string(),
  },
  handler: async (ctx, args) => {
    const { toPhone, message } = args;

    // Validate phone number format (basic E.164 validation)
    const phoneRegex = /^\+[1-9]\d{1,14}$/;
    if (!phoneRegex.test(toPhone)) {
      return {
        success: false,
        error: "Invalid phone number format. Please use E.164 format (e.g., +14155551234)",
      };
    }

    console.log(`[Debug SMS] Sending to: ${toPhone}`);
    console.log(`[Debug SMS] Message: ${message}`);

    try {
      await twilio.sendMessage(ctx, {
        to: toPhone,
        body: `[DEBUG TEST] ${message}`,
      });

      return {
        success: true,
        details: {
          to: toPhone,
          message: message,
          sentAt: new Date().toISOString(),
        },
      };
    } catch (error) {
      console.error("[Debug SMS] Exception:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
        details: {
          to: toPhone,
        },
      };
    }
  },
});

/**
 * Get debug configuration status
 * Shows current environment settings for email and SMS
 */
export const getDebugConfig = action({
  args: {},
  handler: async () => {
    const IS_PRODUCTION = process.env.ENVIRONMENT === "production";
    const hasResendKey = !!process.env.RESEND_API_KEY;
    const hasTwilioPhone = !!process.env.TWILIO_PHONE_NUMBER;
    const hasTwilioSid = !!process.env.TWILIO_ACCOUNT_SID;
    const hasTwilioToken = !!process.env.TWILIO_AUTH_TOKEN;

    return {
      environment: IS_PRODUCTION ? "production" : "testing",
      email: {
        provider: "Resend",
        hasApiKey: hasResendKey,
        testEmail: IS_PRODUCTION ? null : "mattyost00@gmail.com",
        fromDomain: IS_PRODUCTION ? "nmtsa.com" : "resend.dev",
      },
      sms: {
        provider: "Twilio",
        hasPhoneNumber: hasTwilioPhone,
        hasAccountSid: hasTwilioSid,
        hasAuthToken: hasTwilioToken,
        configured: hasTwilioPhone && hasTwilioSid && hasTwilioToken,
      },
    };
  },
});
