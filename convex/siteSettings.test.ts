import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

async function seedRole(t: ReturnType<typeof convexTest>, role: string) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: `${role}@test.local`,
      name: `Test ${role}`,
    });
    await ctx.db.insert("userProfiles", {
      userId,
      role: role as "owner",
      firstName: "Test",
      lastName: role,
      isActive: true,
    });
    return userId;
  });
}

async function seedSettings(t: ReturnType<typeof convexTest>) {
  await t.run(async (ctx) => {
    await ctx.db.insert("siteSettings", {
      organizationName: "NMTSA",
      setupCompleted: true,
    });
  });
}

describe("siteSettings.prominentHelpButton", () => {
  it("is off until someone turns it on", async () => {
    const t = convexTest(schema);
    await seedSettings(t);

    const settings = await t.query(api.siteSettings.getSiteSettings, {});

    expect(settings?.prominentHelpButton).toBeUndefined();
  });

  it("can be turned on and off by an owner, and is readable without signing in", async () => {
    const t = convexTest(schema);
    await seedSettings(t);
    const ownerId = await seedRole(t, "owner");
    const owner = t.withIdentity({ subject: ownerId });

    await owner.mutation(api.siteSettings.updateSiteSettings, { prominentHelpButton: true });
    // Read anonymously: both portals' headers render it, including for clients.
    expect((await t.query(api.siteSettings.getSiteSettings, {}))?.prominentHelpButton).toBe(true);

    await owner.mutation(api.siteSettings.updateSiteSettings, { prominentHelpButton: false });
    expect((await t.query(api.siteSettings.getSiteSettings, {}))?.prominentHelpButton).toBe(false);
  });

  it("leaves the setting alone when other settings are saved", async () => {
    const t = convexTest(schema);
    await seedSettings(t);
    const owner = t.withIdentity({ subject: await seedRole(t, "owner") });

    await owner.mutation(api.siteSettings.updateSiteSettings, { prominentHelpButton: true });
    await owner.mutation(api.siteSettings.updateSiteSettings, { organizationName: "Renamed" });

    const settings = await t.query(api.siteSettings.getSiteSettings, {});
    expect(settings?.organizationName).toBe("Renamed");
    expect(settings?.prominentHelpButton).toBe(true);
  });

  it.each(["editor", "contributor", "professional", "client"])(
    "cannot be changed by %s (lacks MANAGE_SITE_SETTINGS)",
    async (role) => {
      const t = convexTest(schema);
      await seedSettings(t);
      const userId = await seedRole(t, role);

      await expect(
        t
          .withIdentity({ subject: userId })
          .mutation(api.siteSettings.updateSiteSettings, { prominentHelpButton: true }),
      ).rejects.toThrow(/permission/i);
    },
  );
});
