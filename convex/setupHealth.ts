/**
 * "Setup health" configuration checklist for admins.
 *
 * A fresh deployment (see docs/DEPLOYMENTS.md) needs several env vars set,
 * and several of them fail *silently* — e.g. without `ENVIRONMENT=production`,
 * `getRecipient()` in emails.ts quietly redirects every outbound email to
 * `DEV_TEST_EMAIL`, so Resend reports success and no real user ever receives
 * mail. This module surfaces that class of misconfiguration to admins.
 *
 * Security contract (do not weaken):
 * - `getSetupHealth` returns booleans + static prose only. It NEVER returns
 *   the value of an env var, not even partially.
 * - It is gated on PERMISSIONS.MANAGE_SITE_SETTINGS, but — unlike
 *   `requirePermission` — it never throws to get there. This query backs a
 *   banner rendered on every admin page; per CLAUDE.md, a query that throws
 *   inside a component rendered on mount blanks the whole app through
 *   `useQuery`. An unauthenticated caller or one lacking the permission gets
 *   a plain `null`, which the UI treats as "nothing to show."
 */
import { query } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { getEffectivePermissions, hasPermission, PERMISSIONS } from "./permissions";

export type SetupHealthSeverity =
  | "critical"
  | "blocking"
  | "recommended"
  | "optional";

export interface SetupHealthCheck {
  id: string;
  title: string;
  severity: SetupHealthSeverity;
  ok: boolean;
  impact: string;
  fix: string;
  docsAnchor?: string;
}

export interface SetupHealthCounts {
  critical: number;
  blocking: number;
  recommended: number;
  optional: number;
}

/**
 * SITE_URL pointing at a local dev origin (http(s)://localhost[:port] or
 * 127.0.0.1) means this is a legitimate dev deployment, where e.g. the
 * dev-mode email redirect is the *desired* behavior. We only nag about
 * production-only concerns when SITE_URL looks like a real domain.
 */
function isLocalDevUrl(url: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(url.trim());
}

function looksLikeProduction(): boolean {
  const siteUrl = process.env.SITE_URL?.trim();
  if (!siteUrl) return false;
  return !isLocalDevUrl(siteUrl);
}

export const getSetupHealth = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;

    const profile = await ctx.db
      .query("userProfiles")
      .withIndex("by_user_id", (q) => q.eq("userId", userId))
      .unique();
    if (!profile) return null;

    const permissions = getEffectivePermissions(profile);
    if (!hasPermission(permissions, PERMISSIONS.MANAGE_SITE_SETTINGS)) {
      return null;
    }

    const prodLooking = looksLikeProduction();
    const checks: SetupHealthCheck[] = [];

    // 1. Mock payments must never be left on for a production-looking deployment.
    const mockPaymentsOn = process.env.ALLOW_MOCK_PAYMENTS === "true";
    checks.push({
      id: "mock_payments_enabled",
      title: "Mock payments disabled",
      severity: "critical",
      ok: !(mockPaymentsOn && prodLooking),
      impact:
        "ALLOW_MOCK_PAYMENTS is \"true\" on what looks like a production " +
        "deployment. Any signed-in user can mark their own order complete " +
        "and unlock paid content without paying — this bypasses Stripe " +
        "entirely.",
      fix: "npx convex env remove ALLOW_MOCK_PAYMENTS --prod",
      docsAnchor: "explicit-warnings",
    });

    // 2. Production email/link mode.
    const environment = process.env.ENVIRONMENT;
    checks.push({
      id: "environment_mode",
      title: "Production email mode",
      severity: "blocking",
      ok: !(environment !== "production" && prodLooking),
      impact:
        "ENVIRONMENT is not set to \"production\", so every outbound email " +
        "(password resets, invites, verification, shares) is silently " +
        "redirected to DEV_TEST_EMAIL instead of the real recipient, and " +
        "links in those emails point at http://localhost:5173. Resend " +
        "reports success — nothing looks wrong in the logs — but no real " +
        "user ever receives mail.",
      fix: "npx convex env set ENVIRONMENT production --prod",
      docsAnchor: "environment-variable-matrix",
    });

    // 3. Signed media URL secret — fails closed without it.
    const hasMediaSecret = Boolean(process.env.MEDIA_URL_SECRET);
    checks.push({
      id: "media_url_secret",
      title: "Signed media URL secret set",
      severity: "blocking",
      ok: hasMediaSecret,
      impact:
        "MEDIA_URL_SECRET is not set, so signed media URLs fail closed: " +
        "private, password-protected, and priced content will not play or " +
        "download at all.",
      fix: 'npx convex env set MEDIA_URL_SECRET "$(openssl rand -hex 32)" --prod',
      docsAnchor: "environment-variable-matrix",
    });

    // 4. Site URL — required for links and CORS.
    const hasSiteUrl = Boolean(process.env.SITE_URL?.trim());
    checks.push({
      id: "site_url",
      title: "Site URL configured",
      severity: "blocking",
      ok: hasSiteUrl,
      impact:
        "SITE_URL is not set. Every generated email/SMS link (password " +
        "reset, invites, verification, shares) throws instead of sending, " +
        "and CORS falls back to the localhost dev origin, so the deployed " +
        "frontend cannot call the checkout or media API.",
      fix: "npx convex env set SITE_URL https://<your-domain> --prod",
      docsAnchor: "environment-variable-matrix",
    });

    // 5. Email — signup itself depends on this.
    const hasResendKey = Boolean(process.env.RESEND_API_KEY);
    const hasResendDomain = Boolean(process.env.RESEND_DOMAIN);
    const emailConfigured = hasResendKey && hasResendDomain;
    checks.push({
      id: "email_configured",
      title: "Email sending configured",
      severity: "blocking",
      ok: emailConfigured,
      impact:
        "RESEND_API_KEY and/or RESEND_DOMAIN are not set, so signup itself " +
        "is broken: createUserProfile requires either an approved join " +
        "request (whose verification link arrives by email) or an " +
        "admin-issued invite code, and password resets cannot be sent.",
      fix:
        "See docs/DEPLOYMENTS.md \"Enabling email on an instance\": verify " +
        "a Resend sending domain (SPF/DKIM), then set RESEND_API_KEY, " +
        "RESEND_DOMAIN, and RESEND_FROM_EMAIL.",
      docsAnchor: "enabling-email-on-an-instance",
    });

    // 6. Email env vars must agree, or the app and its own UI disagree.
    const hasFromEmail = Boolean(process.env.RESEND_FROM_EMAIL);
    const uiReportsConfigured = hasResendKey && hasFromEmail;
    checks.push({
      id: "email_status_var_mismatch",
      title: "Email env vars agree with each other",
      severity: "recommended",
      ok: emailConfigured === uiReportsConfigured,
      impact:
        "RESEND_DOMAIN and RESEND_FROM_EMAIL are not both set. Outbound " +
        "senders are built from RESEND_DOMAIN, but the Notification " +
        "Settings page decides whether to report email as \"configured\" " +
        "from RESEND_FROM_EMAIL — so the app and its own admin UI will " +
        "disagree about whether email works.",
      fix: "Set both RESEND_DOMAIN and RESEND_FROM_EMAIL to matching values.",
      docsAnchor: "environment-variable-matrix",
    });

    // 7. Org name — used by the password-reset email sender, which has no DB access.
    checks.push({
      id: "org_name",
      title: "Organization name set for system email",
      severity: "recommended",
      ok: Boolean(process.env.ORG_NAME?.trim()),
      impact:
        "ORG_NAME is not set. The password-reset email is sent by a " +
        "callback with no database access, so it falls back to the " +
        "generic sender name \"Content Portal\" instead of this " +
        "organization's name — which can read as a phishing attempt to " +
        "recipients.",
      fix: 'npx convex env set ORG_NAME "<Your Org Name>" --prod',
      docsAnchor: "environment-variable-matrix",
    });

    // 8. Stripe webhook secret — entitlement comes only from the verified webhook.
    const stripeEnabled = Boolean(process.env.STRIPE_SECRET_KEY);
    const hasWebhookSecret = Boolean(process.env.STRIPE_WEBHOOK_SECRET);
    checks.push({
      id: "stripe_webhook_secret",
      title: "Stripe webhook secret set",
      severity: stripeEnabled ? "blocking" : "optional",
      ok: stripeEnabled ? hasWebhookSecret : true,
      impact: stripeEnabled
        ? "STRIPE_SECRET_KEY is set but STRIPE_WEBHOOK_SECRET is not. " +
          "Checkout works, but webhook signature verification throws — no " +
          "order is ever fulfilled, so buyers are charged and receive " +
          "nothing (entitlement comes only from the verified webhook)."
        : "Payments are not enabled, so there is no webhook to secure yet.",
      fix:
        "Add a webhook endpoint in the Stripe dashboard pointing at this " +
        "deployment's /api/stripe/webhook, then " +
        "npx convex env set STRIPE_WEBHOOK_SECRET whsec_... --prod",
      docsAnchor: "environment-variable-matrix",
    });

    // 9. Payments enabled at all (purely optional feature).
    checks.push({
      id: "payments_configured",
      title: "Stripe payments enabled",
      severity: "optional",
      ok: stripeEnabled,
      impact:
        "STRIPE_SECRET_KEY is not set, so priced content cannot be purchased.",
      fix: "npm run setup:stripe",
      docsAnchor: "environment-variable-matrix",
    });

    // 10. SMS (purely optional feature).
    const smsConfigured = Boolean(
      process.env.TWILIO_ACCOUNT_SID &&
        process.env.TWILIO_AUTH_TOKEN &&
        process.env.TWILIO_PHONE_NUMBER
    );
    checks.push({
      id: "sms_configured",
      title: "SMS notifications enabled",
      severity: "optional",
      ok: smsConfigured,
      impact:
        "TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, and/or TWILIO_PHONE_NUMBER " +
        "are not set, so SMS notifications and phone verification are " +
        "unavailable.",
      fix: "npm run setup:sms",
      docsAnchor: "environment-variable-matrix",
    });

    // 11. Branding/setup wizard completed.
    const siteSettings = await ctx.db.query("siteSettings").first();
    checks.push({
      id: "site_setup_completed",
      title: "Organization branding set up",
      severity: "recommended",
      ok: Boolean(siteSettings?.setupCompleted),
      impact:
        "The in-app setup wizard hasn't been completed, so the portal " +
        "still shows generic organization name/branding defaults instead " +
        "of this organization's own.",
      fix:
        "Sign in as the owner and complete the setup wizard, or fill in " +
        "Organization Info under Settings.",
    });

    const counts: SetupHealthCounts = {
      critical: 0,
      blocking: 0,
      recommended: 0,
      optional: 0,
    };
    for (const c of checks) {
      if (!c.ok) counts[c.severity]++;
    }

    return { checks, counts };
  },
});
