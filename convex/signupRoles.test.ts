/// <reference types="vite/client" />
/**
 * Configurable signup roles (siteSettings.signupRoles) regression tests.
 *
 * Invariants:
 * - A signup option's baseRole is limited to client/parent by validators —
 *   custom "I am a..." choices can never grant a privileged role.
 * - createUserProfile resolves the option server-side by id (labels and
 *   roles come from settings, never from client args).
 * - Only MANAGE_SITE_SETTINGS can change the list; empty list reverts to
 *   the built-in defaults.
 */
import { convexTest } from "convex-test";
import { describe, expect, test } from "vitest";
import { api } from "./_generated/api";
import schema from "./schema";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

const OHACK_ROLES = [
  { id: "judge", label: "Judge", baseRole: "client" as const },
  { id: "mentor", label: "Mentor", description: "Guide teams", baseRole: "client" as const },
  { id: "hacker", label: "Hacker", baseRole: "client" as const },
];

async function setup(t: ReturnType<typeof convexTest>, signupRoles?: unknown) {
  return await t.run(async (ctx) => {
    await ctx.db.insert("siteSettings", {
      organizationName: "Test Org",
      setupCompleted: true,
      allowPublicSignup: true,
      ...(signupRoles ? { signupRoles: signupRoles as never } : {}),
    });
    const ownerId = await ctx.db.insert("users", { email: "owner@example.com" });
    await ctx.db.insert("userProfiles", {
      userId: ownerId,
      role: "owner",
      firstName: "Own",
      lastName: "Er",
      isActive: true,
    });
    const newUserId = await ctx.db.insert("users", { email: "new@example.com" });
    return { ownerId, newUserId };
  });
}

describe("configurable signup roles", () => {
  test("signup with a configured option stores its baseRole and label", async () => {
    const t = convexTest(schema, modules);
    const { newUserId } = await setup(t, OHACK_ROLES);

    await t
      .withIdentity({ subject: `${newUserId}|s1` })
      .mutation(api.users.createUserProfile, {
        firstName: "Mel",
        lastName: "Mentor",
        signupRoleId: "mentor",
      });

    await t.run(async (ctx) => {
      const profile = await ctx.db
        .query("userProfiles")
        .withIndex("by_user_id", (q) => q.eq("userId", newUserId as Id<"users">))
        .unique();
      expect(profile?.role).toBe("client");
      expect(profile?.roleLabel).toBe("Mentor");
    });
  });

  test("unknown signupRoleId is rejected", async () => {
    const t = convexTest(schema, modules);
    const { newUserId } = await setup(t, OHACK_ROLES);

    await expect(
      t
        .withIdentity({ subject: `${newUserId}|s1` })
        .mutation(api.users.createUserProfile, {
          firstName: "A",
          lastName: "B",
          signupRoleId: "cfo",
        })
    ).rejects.toThrow(/no longer available/i);
  });

  test("signupRoleId cannot smuggle a privileged role — baseRole validator rejects it", async () => {
    const t = convexTest(schema, modules);
    const { ownerId } = await setup(t);

    await expect(
      t.withIdentity({ subject: `${ownerId}|s1` }).mutation(
        api.siteSettings.updateSiteSettings,
        {
          signupRoles: [
            // "professional" carries VIEW_ALL_CONTENT and must be impossible here.
            { id: "pro", label: "Pro", baseRole: "professional" },
          ],
        } as never
      )
    ).rejects.toThrow();
  });

  test("only MANAGE_SITE_SETTINGS can edit signup roles", async () => {
    const t = convexTest(schema, modules);
    const { newUserId } = await setup(t);
    await t.run(async (ctx) => {
      await ctx.db.insert("userProfiles", {
        userId: newUserId as Id<"users">,
        role: "client",
        firstName: "Cli",
        lastName: "Ent",
        isActive: true,
      });
    });

    await expect(
      t
        .withIdentity({ subject: `${newUserId}|s1` })
        .mutation(api.siteSettings.updateSiteSettings, {
          signupRoles: OHACK_ROLES,
        })
    ).rejects.toThrow(/permission/i);
  });

  test("owner can save a list; duplicates rejected; empty list reverts to defaults", async () => {
    const t = convexTest(schema, modules);
    const { ownerId } = await setup(t);
    const asOwner = t.withIdentity({ subject: `${ownerId}|s1` });

    await asOwner.mutation(api.siteSettings.updateSiteSettings, {
      signupRoles: OHACK_ROLES,
    });
    let settings = await t.query(api.siteSettings.getSiteSettings, {});
    expect(settings?.signupRoles?.map((r) => r.label)).toEqual([
      "Judge",
      "Mentor",
      "Hacker",
    ]);

    await expect(
      asOwner.mutation(api.siteSettings.updateSiteSettings, {
        signupRoles: [
          { id: "dup", label: "A", baseRole: "client" },
          { id: "dup", label: "B", baseRole: "client" },
        ],
      })
    ).rejects.toThrow(/unique/i);

    await asOwner.mutation(api.siteSettings.updateSiteSettings, {
      signupRoles: [],
    });
    settings = await t.query(api.siteSettings.getSiteSettings, {});
    expect(settings?.signupRoles).toBeUndefined();
  });
});
