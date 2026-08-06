/// <reference types="vite/client" />
/**
 * External auth (PropelAuth / custom-JWT issuer) regression tests.
 *
 * Invariants covered:
 * - ensureExternalUser creates an account (users + authIdentities) from the
 *   verified identity only — never a profile, never a role.
 * - getAuthUserId resolves external identities through authIdentities, and
 *   leaves Convex Auth identities on the original code path.
 * - Email-based linking to existing accounts is OFF unless
 *   EXTERNAL_AUTH_TRUST_EMAILS=true (account-takeover guard).
 * - External signups stay subject to the client/parent role clamp in
 *   users.createUserProfile.
 */
import { convexTest } from "convex-test";
import { describe, expect, test, beforeEach, afterEach } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { externalIssuers, isExternalIssuer } from "./externalAuth";

const modules = import.meta.glob("./**/*.ts");

const ISSUER = "https://auth.example.com";

const ORIGINAL_ENV = {
  PROPELAUTH_URL: process.env.PROPELAUTH_URL,
  EXTERNAL_AUTH_ISSUERS: process.env.EXTERNAL_AUTH_ISSUERS,
  EXTERNAL_AUTH_TRUST_EMAILS: process.env.EXTERNAL_AUTH_TRUST_EMAILS,
};

function restoreEnv() {
  for (const [key, value] of Object.entries(ORIGINAL_ENV)) {
    if (value === undefined) delete process.env[key];
    else process.env[key] = value;
  }
}

function externalIdentity(overrides: Record<string, unknown> = {}) {
  const subject = (overrides.subject as string) ?? "propel-user-1";
  return {
    subject,
    issuer: ISSUER,
    tokenIdentifier: `${ISSUER}|${subject}`,
    email: "learner@example.com",
    ...overrides,
  };
}

describe("external auth", () => {
  beforeEach(() => {
    restoreEnv();
    process.env.PROPELAUTH_URL = ISSUER;
    delete process.env.EXTERNAL_AUTH_TRUST_EMAILS;
  });
  afterEach(restoreEnv);

  test("issuer helpers: parsing, trailing slashes, unset env", () => {
    process.env.PROPELAUTH_URL = "https://auth.example.com/";
    process.env.EXTERNAL_AUTH_ISSUERS = " https://a.example.com , https://b.example.com/ ";
    expect(externalIssuers()).toEqual([
      "https://auth.example.com",
      "https://a.example.com",
      "https://b.example.com",
    ]);
    expect(isExternalIssuer("https://auth.example.com")).toBe(true);
    expect(isExternalIssuer("https://b.example.com")).toBe(true);
    expect(isExternalIssuer("https://evil.example.com")).toBe(false);

    delete process.env.PROPELAUTH_URL;
    delete process.env.EXTERNAL_AUTH_ISSUERS;
    expect(externalIssuers()).toEqual([]);
    expect(isExternalIssuer(ISSUER)).toBe(false);
  });

  test("ensureExternalUser creates account + identity mapping, no profile, idempotent", async () => {
    const t = convexTest(schema, modules);
    const asExternal = t.withIdentity(
      externalIdentity({ first_name: "Pat", last_name: "Learner" })
    );

    const userId = await asExternal.mutation(api.externalAuth.ensureExternalUser, {});
    expect(userId).not.toBeNull();

    await t.run(async (ctx) => {
      const user = await ctx.db.get(userId!);
      expect(user?.email).toBe("learner@example.com");
      expect(user?.name).toBe("Pat Learner");

      const links = await ctx.db.query("authIdentities").collect();
      expect(links).toHaveLength(1);
      expect(links[0].userId).toBe(userId);
      expect(links[0].tokenIdentifier).toBe(`${ISSUER}|propel-user-1`);

      // Account only — no profile, no role.
      const profiles = await ctx.db.query("userProfiles").collect();
      expect(profiles).toHaveLength(0);
    });

    // Second call: same user, no duplicates.
    const again = await asExternal.mutation(api.externalAuth.ensureExternalUser, {});
    expect(again).toBe(userId);
    await t.run(async (ctx) => {
      expect(await ctx.db.query("authIdentities").collect()).toHaveLength(1);
      expect(await ctx.db.query("users").collect()).toHaveLength(1);
    });
  });

  test("getAuthUserId resolves external identities (loggedInUser works)", async () => {
    const t = convexTest(schema, modules);
    const asExternal = t.withIdentity(externalIdentity());

    // Before provisioning: authenticated but unknown → null, not a crash.
    expect(await asExternal.query(api.auth.loggedInUser, {})).toBeNull();

    const userId = await asExternal.mutation(api.externalAuth.ensureExternalUser, {});
    const user = await asExternal.query(api.auth.loggedInUser, {});
    expect(user?._id).toBe(userId);
  });

  test("ensureExternalUser is a no-op for Convex Auth identities", async () => {
    const t = convexTest(schema, modules);
    const userId = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "pw@example.com" })
    );
    // Convex Auth subject shape: "<usersId>|<sessionId>", non-external issuer.
    const asPassword = t.withIdentity({ subject: `${userId}|session1` });

    const result = await asPassword.mutation(api.externalAuth.ensureExternalUser, {});
    expect(result).toBeNull();
    await t.run(async (ctx) => {
      expect(await ctx.db.query("authIdentities").collect()).toHaveLength(0);
      expect(await ctx.db.query("users").collect()).toHaveLength(1);
    });
  });

  test("email linking is OFF by default — same email gets a separate account", async () => {
    const t = convexTest(schema, modules);
    const existing = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "learner@example.com" })
    );

    const userId = await t
      .withIdentity(externalIdentity())
      .mutation(api.externalAuth.ensureExternalUser, {});
    expect(userId).not.toBe(existing);
  });

  test("EXTERNAL_AUTH_TRUST_EMAILS=true links to the existing account", async () => {
    process.env.EXTERNAL_AUTH_TRUST_EMAILS = "true";
    const t = convexTest(schema, modules);
    const existing = await t.run(async (ctx) =>
      ctx.db.insert("users", { email: "learner@example.com" })
    );

    const userId = await t
      .withIdentity(externalIdentity())
      .mutation(api.externalAuth.ensureExternalUser, {});
    expect(userId).toBe(existing);
  });

  test("external signup cannot self-assign professional (role clamp holds)", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("siteSettings", {
        organizationName: "Test Org",
        setupCompleted: true,
        allowPublicSignup: true,
      });
    });
    const asExternal = t.withIdentity(externalIdentity());
    await asExternal.mutation(api.externalAuth.ensureExternalUser, {});

    await asExternal.mutation(api.users.createUserProfile, {
      firstName: "Sneaky",
      lastName: "Learner",
      role: "professional",
    });

    await t.run(async (ctx) => {
      const profiles = await ctx.db.query("userProfiles").collect();
      expect(profiles).toHaveLength(1);
      expect(profiles[0].role).toBe("client");
    });
  });

  test("external signup without public signup or join request is rejected", async () => {
    const t = convexTest(schema, modules);
    await t.run(async (ctx) => {
      await ctx.db.insert("siteSettings", {
        organizationName: "Test Org",
        setupCompleted: true,
      });
    });
    const asExternal = t.withIdentity(externalIdentity());
    await asExternal.mutation(api.externalAuth.ensureExternalUser, {});

    await expect(
      asExternal.mutation(api.users.createUserProfile, {
        firstName: "No",
        lastName: "Access",
      })
    ).rejects.toThrow(/approved join request/i);
  });
});
