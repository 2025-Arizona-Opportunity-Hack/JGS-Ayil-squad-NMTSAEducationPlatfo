import { describe, it, expect, beforeEach, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

// ─── Shared seeding helper (mirrors convex/analytics.test.ts / security.test.ts) ───

async function seedUser(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, name: "Test User" });
    await ctx.db.insert("userProfiles", {
      userId,
      role,
      firstName: "Test",
      lastName: "User",
      isActive: true,
    });
    return userId;
  });
}

// All env vars getSetupHealth reads. Snapshotted/restored around every test
// so tests can't leak state into each other or into other test files.
const ENV_KEYS = [
  "ALLOW_MOCK_PAYMENTS",
  "ENVIRONMENT",
  "SITE_URL",
  "MEDIA_URL_SECRET",
  "RESEND_API_KEY",
  "RESEND_DOMAIN",
  "RESEND_FROM_EMAIL",
  "ORG_NAME",
  "STRIPE_SECRET_KEY",
  "STRIPE_WEBHOOK_SECRET",
  "TWILIO_ACCOUNT_SID",
  "TWILIO_AUTH_TOKEN",
  "TWILIO_PHONE_NUMBER",
] as const;

let snapshot: Record<string, string | undefined>;

beforeEach(() => {
  snapshot = {};
  for (const key of ENV_KEYS) {
    snapshot[key] = process.env[key];
    delete process.env[key];
  }
});

afterEach(() => {
  for (const key of ENV_KEYS) {
    if (snapshot[key] === undefined) delete process.env[key];
    else process.env[key] = snapshot[key];
  }
});

const PROD_SITE_URL = "https://portal.example.org";
const LOCALHOST_SITE_URL = "http://localhost:5173";

describe("getSetupHealth: permission gating never throws", () => {
  it("returns null for an unauthenticated caller", async () => {
    const t = convexTest(schema);
    const result = await t.query(api.setupHealth.getSetupHealth, {});
    expect(result).toBeNull();
  });

  it("returns null for a client role (no MANAGE_SITE_SETTINGS), without throwing", async () => {
    const t = convexTest(schema);
    const clientId = await seedUser(t, "client", "client@test.local");

    const result = await t
      .withIdentity({ subject: clientId })
      .query(api.setupHealth.getSetupHealth, {});

    expect(result).toBeNull();
  });

  it("returns checks for an owner", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner@test.local");

    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    expect(result).not.toBeNull();
    expect(Array.isArray(result!.checks)).toBe(true);
    expect(result!.checks.length).toBeGreaterThan(0);
    expect(result!.counts).toHaveProperty("critical");
    expect(result!.counts).toHaveProperty("blocking");
    expect(result!.counts).toHaveProperty("recommended");
    expect(result!.counts).toHaveProperty("optional");
  });
});

describe("getSetupHealth: never leaks an env var value", () => {
  it("does not leak RESEND_API_KEY, STRIPE_WEBHOOK_SECRET, or SITE_URL values", async () => {
    process.env.RESEND_API_KEY = "re_supersecret_sentinel";
    process.env.RESEND_DOMAIN = "example.org";
    process.env.RESEND_FROM_EMAIL = "noreply@example.org";
    process.env.STRIPE_SECRET_KEY = "sk_live_should_never_appear";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_totally_secret_value";
    process.env.SITE_URL = "https://sentinel-domain-should-not-leak.example";
    process.env.MEDIA_URL_SECRET = "media-secret-sentinel-value";

    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-leak@test.local");

    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    const serialized = JSON.stringify(result);

    expect(serialized).not.toContain("re_supersecret_sentinel");
    expect(serialized).not.toContain("sk_live_should_never_appear");
    expect(serialized).not.toContain("whsec_totally_secret_value");
    expect(serialized).not.toContain("sentinel-domain-should-not-leak");
    expect(serialized).not.toContain("media-secret-sentinel-value");
  });
});

describe("getSetupHealth: mock_payments_enabled", () => {
  it("flags ALLOW_MOCK_PAYMENTS=true on a production-looking deployment as non-ok critical", async () => {
    process.env.ALLOW_MOCK_PAYMENTS = "true";
    process.env.SITE_URL = PROD_SITE_URL;

    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-mock-1@test.local");
    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    const check = result!.checks.find((c) => c.id === "mock_payments_enabled")!;
    expect(check.severity).toBe("critical");
    expect(check.ok).toBe(false);
    expect(result!.counts.critical).toBeGreaterThan(0);
  });

  it("is ok when ALLOW_MOCK_PAYMENTS is unset", async () => {
    process.env.SITE_URL = PROD_SITE_URL;

    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-mock-2@test.local");
    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    const check = result!.checks.find((c) => c.id === "mock_payments_enabled")!;
    expect(check.ok).toBe(true);
  });
});

describe("getSetupHealth: environment_mode", () => {
  it("flags ENVIRONMENT unset on a production-looking deployment as non-ok blocking", async () => {
    process.env.SITE_URL = PROD_SITE_URL;

    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-env-1@test.local");
    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    const check = result!.checks.find((c) => c.id === "environment_mode")!;
    expect(check.severity).toBe("blocking");
    expect(check.ok).toBe(false);
  });

  it("is ok when ENVIRONMENT=production", async () => {
    process.env.SITE_URL = PROD_SITE_URL;
    process.env.ENVIRONMENT = "production";

    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-env-2@test.local");
    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    const check = result!.checks.find((c) => c.id === "environment_mode")!;
    expect(check.ok).toBe(true);
  });

  it("does not flag a localhost SITE_URL even with ENVIRONMENT unset (dev deployments shouldn't nag)", async () => {
    process.env.SITE_URL = LOCALHOST_SITE_URL;

    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-env-3@test.local");
    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    const check = result!.checks.find((c) => c.id === "environment_mode")!;
    expect(check.ok).toBe(true);
  });
});

describe("getSetupHealth: stripe_webhook_secret", () => {
  it("flags STRIPE_SECRET_KEY set without STRIPE_WEBHOOK_SECRET as non-ok blocking", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";

    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-stripe-1@test.local");
    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    const check = result!.checks.find((c) => c.id === "stripe_webhook_secret")!;
    expect(check.severity).toBe("blocking");
    expect(check.ok).toBe(false);
  });

  it("is optional and ok when neither Stripe var is set", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-stripe-2@test.local");
    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    const check = result!.checks.find((c) => c.id === "stripe_webhook_secret")!;
    expect(check.severity).toBe("optional");
    expect(check.ok).toBe(true);
  });

  it("is ok when both Stripe vars are set", async () => {
    process.env.STRIPE_SECRET_KEY = "sk_test_abc";
    process.env.STRIPE_WEBHOOK_SECRET = "whsec_abc";

    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-stripe-3@test.local");
    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.setupHealth.getSetupHealth, {});

    const check = result!.checks.find((c) => c.id === "stripe_webhook_secret")!;
    expect(check.severity).toBe("blocking");
    expect(check.ok).toBe(true);
  });
});
