import { describe, it, expect, afterEach } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { internal } from "./_generated/api";
import { getOrgName, requireSiteUrl } from "./helpers";

// Cluster C1: every organization runs its own deployment (see
// docs/DEPLOYMENTS.md), so a hardcoded org name or domain baked into a
// fallback would leak into every *other* org's deployment the moment its
// siteSettings/SITE_URL weren't configured. These tests lock in that
// getOrgName/requireSiteUrl never do that.

describe("getOrgName", () => {
  it("returns the configured org name when siteSettings exists", async () => {
    const t = convexTest(schema);
    const settings = await t.run(async (ctx) => {
      await ctx.db.insert("siteSettings", {
        organizationName: "Riverside Music Therapy",
        setupCompleted: true,
      });
      return await ctx.db.query("siteSettings").first();
    });

    expect(getOrgName(settings)).toBe("Riverside Music Therapy");
  });

  it('returns the neutral "Content Portal" fallback when the siteSettings table is empty', async () => {
    const t = convexTest(schema);
    const settings = await t.run(async (ctx) =>
      ctx.db.query("siteSettings").first()
    );

    expect(settings).toBeNull();
    expect(getOrgName(settings)).toBe("Content Portal");
  });

  it("never returns an NMTSA-specific string for any input", () => {
    expect(getOrgName(null)).not.toMatch(/nmtsa/i);
    expect(getOrgName(undefined)).not.toMatch(/nmtsa/i);
    expect(getOrgName({ organizationName: "" })).not.toMatch(/nmtsa/i);
    expect(getOrgName({ organizationName: undefined })).toBe("Content Portal");
    // A configured name always wins over the fallback, and is passed through
    // verbatim rather than being replaced by anything org-specific.
    expect(getOrgName({ organizationName: "Acme Therapy Co" })).toBe(
      "Acme Therapy Co"
    );
  });
});

describe("requireSiteUrl", () => {
  const ORIGINAL_SITE_URL = process.env.SITE_URL;

  afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = ORIGINAL_SITE_URL;
  });

  it("throws a ConvexError when SITE_URL is unset", () => {
    delete process.env.SITE_URL;
    expect(() => requireSiteUrl()).toThrow(/SITE_URL/);
  });

  it("throws when SITE_URL is an empty string", () => {
    process.env.SITE_URL = "";
    expect(() => requireSiteUrl()).toThrow(/SITE_URL/);
  });

  it("throws when SITE_URL is only whitespace", () => {
    process.env.SITE_URL = "   ";
    expect(() => requireSiteUrl()).toThrow(/SITE_URL/);
  });

  it("never falls back to nmtsa.com or any other hardcoded domain", () => {
    delete process.env.SITE_URL;
    try {
      requireSiteUrl();
      expect.fail("requireSiteUrl() should have thrown");
    } catch (err) {
      expect(String((err as Error).message)).not.toMatch(/nmtsa/i);
    }
  });

  it("returns the configured value when SITE_URL is set", () => {
    process.env.SITE_URL = "https://lms.ohack.dev";
    expect(requireSiteUrl()).toBe("https://lms.ohack.dev");
  });

  it("strips a single trailing slash", () => {
    process.env.SITE_URL = "https://lms.ohack.dev/";
    expect(requireSiteUrl()).toBe("https://lms.ohack.dev");
  });

  it("strips multiple trailing slashes", () => {
    process.env.SITE_URL = "https://lms.ohack.dev///";
    expect(requireSiteUrl()).toBe("https://lms.ohack.dev");
  });
});

// End-to-end: a real notification-building action (sendInviteEmail) must
// compute its subject/from lines from the configured org name and
// SITE_URL, not from a hardcoded NMTSA fallback.
describe("sendInviteEmail branding (end-to-end)", () => {
  const ORIGINAL_SITE_URL = process.env.SITE_URL;

  afterEach(() => {
    if (ORIGINAL_SITE_URL === undefined) delete process.env.SITE_URL;
    else process.env.SITE_URL = ORIGINAL_SITE_URL;
  });

  it("uses the configured org name in the logged subject/from, never NMTSA", async () => {
    process.env.SITE_URL = "https://lms.ohack.dev";
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("siteSettings", {
        organizationName: "Riverside Music Therapy",
        setupCompleted: true,
      });
    });

    // The actual Resend send will fail in this sandbox (no RESEND_API_KEY
    // configured), but sendEmailWithLogging logs the subject/from it built
    // *before* attempting to send, either way — which is exactly the piece
    // this test is verifying: the notification-building step used the
    // configured org name, not a hardcoded one.
    await t.action(internal.emails.sendInviteEmail, {
      recipientEmail: "newstaff@example.com",
      inviteCode: "ABC12345",
      role: "editor",
      inviterName: "Jane Admin",
    });

    const logs = await t.run(async (ctx) =>
      ctx.db.query("notificationLogs").collect()
    );
    expect(logs).toHaveLength(1);
    const [log] = logs;
    expect(log.subject).toContain("Riverside Music Therapy");
    expect(log.from).toContain("Riverside Music Therapy");
    expect(log.subject).not.toMatch(/nmtsa/i);
    expect(log.from).not.toMatch(/nmtsa/i);
  });

  it("fails loudly instead of defaulting to another org's domain when SITE_URL is unset", async () => {
    delete process.env.SITE_URL;
    const t = convexTest(schema);
    await t.run(async (ctx) => {
      await ctx.db.insert("siteSettings", {
        organizationName: "Riverside Music Therapy",
        setupCompleted: true,
      });
    });

    await expect(
      t.action(internal.emails.sendInviteEmail, {
        recipientEmail: "newstaff@example.com",
        inviteCode: "ABC12345",
        role: "editor",
        inviterName: "Jane Admin",
      })
    ).rejects.toThrow();

    // Nothing should have been logged as an attempted send — the action
    // threw before it ever built an email.
    const logs = await t.run(async (ctx) =>
      ctx.db.query("notificationLogs").collect()
    );
    expect(logs).toHaveLength(0);
  });
});
