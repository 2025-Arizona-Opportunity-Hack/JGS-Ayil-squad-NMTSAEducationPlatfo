import { convexAuth, getAuthUserId } from "@convex-dev/auth/server";
import { Password } from "@convex-dev/auth/providers/Password";
import ResendProvider from "@auth/core/providers/resend";
import { query } from "./_generated/server";

export const { auth, signIn, signOut, store, isAuthenticated } = convexAuth({
  providers: [
    Password({
      reset: ResendProvider({
        apiKey: process.env.RESEND_API_KEY,
        from: `NMTSA Platform <noreply@${process.env.RESEND_DOMAIN || "resend.dev"}>`,
        sendVerificationRequest: async ({ identifier: email, token }) => {
          const apiKey = process.env.RESEND_API_KEY;
          if (!apiKey) throw new Error("RESEND_API_KEY is not configured");
          const domain = process.env.RESEND_DOMAIN || "resend.dev";
          const siteUrl = process.env.SITE_URL || "http://localhost:5173";
          const resetUrl = `${siteUrl}/reset-password?code=${token}&email=${encodeURIComponent(email)}`;

          const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
              "Authorization": `Bearer ${apiKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              from: `NMTSA Platform <noreply@${domain}>`,
              to: [email],
              subject: "Reset your password",
              html: `
                <!DOCTYPE html>
                <html>
                  <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
                    <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
                      <h1 style="color: white; margin: 0; font-size: 24px;">Reset Your Password</h1>
                    </div>
                    <div style="background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px;">
                      <p>You requested a password reset. Click the button below to set a new password:</p>
                      <p style="text-align: center; margin: 30px 0;">
                        <a href="${resetUrl}" style="display: inline-block; background: #3b82f6; color: white; padding: 12px 30px; text-decoration: none; border-radius: 6px; font-weight: 600;">Reset Password</a>
                      </p>
                      <p style="font-size: 14px; color: #666;">Or use this code: <strong>${token}</strong></p>
                      <p style="font-size: 14px; color: #666;">If you didn't request this, you can safely ignore this email.</p>
                    </div>
                  </body>
                </html>
              `,
            }),
          });

          if (!res.ok) {
            const err = await res.text();
            throw new Error(`Failed to send reset email: ${err}`);
          }
        },
      }),
    }),
  ],
});

export const loggedInUser = query({
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) {
      return null;
    }
    const user = await ctx.db.get(userId);
    if (!user) {
      return null;
    }
    return user;
  },
});
