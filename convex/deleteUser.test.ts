import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { canDeleteUser, getDefaultPermissions } from "./permissions";

async function seedUser(t: ReturnType<typeof convexTest>, role: string, email: string) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, name: role });
    await ctx.db.insert("userProfiles", {
      userId,
      role: role as any,
      firstName: role,
      lastName: "User",
      isActive: true,
    });
    return userId;
  });
}

async function exists(t: ReturnType<typeof convexTest>, userId: any) {
  return await t.run(async (ctx) => ({
    user: (await ctx.db.get(userId)) !== null,
    profile: (await ctx.db.query("userProfiles").collect()).some((p: any) => p.userId === userId),
  }));
}

describe("canDeleteUser", () => {
  const owner = { userId: "o", role: "owner", permissions: getDefaultPermissions("owner") };
  const admin = { userId: "a", role: "admin", permissions: getDefaultPermissions("admin") };

  it("lets an owner delete admins, other owners and everyone below", () => {
    for (const role of ["owner", "admin", "editor", "contributor", "professional", "parent", "client"]) {
      expect(canDeleteUser(owner, { userId: "x", role })).toBe(true);
    }
  });

  it("lets an admin delete only people below admin", () => {
    expect(canDeleteUser(admin, { userId: "x", role: "owner" })).toBe(false);
    expect(canDeleteUser(admin, { userId: "x", role: "admin" })).toBe(false);
    for (const role of ["editor", "contributor", "professional", "parent", "client"]) {
      expect(canDeleteUser(admin, { userId: "x", role })).toBe(true);
    }
  });

  it("never lets anyone delete themselves", () => {
    expect(canDeleteUser(owner, { userId: "o", role: "owner" })).toBe(false);
    expect(canDeleteUser(admin, { userId: "a", role: "admin" })).toBe(false);
  });

  it("refuses roles without the delete permission", () => {
    for (const role of ["editor", "contributor", "professional", "parent", "client"]) {
      const caller = { userId: "c", role, permissions: getDefaultPermissions(role) };
      expect(canDeleteUser(caller, { userId: "x", role: "client" })).toBe(false);
    }
  });
});

describe("deleteUser", () => {
  it("an owner deletes an admin, with their profile, memberships and access grants", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    const admin = await seedUser(t, "admin", "admin@test.local");
    await t.run(async (ctx) => {
      const groupId = await ctx.db.insert("userGroups", { name: "Staff", createdBy: owner, isActive: true });
      await ctx.db.insert("userGroupMembers", { userId: admin, groupId, addedBy: owner });
      const contentId = await ctx.db.insert("content", {
        title: "Kept item", isPublic: false, createdBy: admin, status: "published", active: true,
      });
      await ctx.db.insert("contentAccess", { contentId, userId: admin, grantedBy: owner, canShare: false });
      const sessionId = await ctx.db.insert("authSessions", { userId: admin, expirationTime: Date.now() + 60_000 });
      await ctx.db.insert("authRefreshTokens", { sessionId, expirationTime: Date.now() + 60_000 });
      await ctx.db.insert("authAccounts", { userId: admin, provider: "password", providerAccountId: "admin@test.local" });
    });

    await t.withIdentity({ subject: owner }).mutation(api.users.deleteUser, { userId: admin });

    expect(await exists(t, admin)).toEqual({ user: false, profile: false });
    await t.run(async (ctx) => {
      expect(await ctx.db.query("userGroupMembers").collect()).toEqual([]);
      expect(await ctx.db.query("contentAccess").collect()).toEqual([]);
      // Sign-in data goes too, so the deleted person is signed out everywhere.
      expect(await ctx.db.query("authSessions").collect()).toEqual([]);
      expect(await ctx.db.query("authRefreshTokens").collect()).toEqual([]);
      expect(await ctx.db.query("authAccounts").collect()).toEqual([]);
      // Content the deleted person created is kept.
      expect((await ctx.db.query("content").collect()).map((c) => c.title)).toEqual(["Kept item"]);
    });
  });

  it("an admin deletes a client", async () => {
    const t = convexTest(schema);
    const admin = await seedUser(t, "admin", "admin@test.local");
    const client = await seedUser(t, "client", "client@test.local");
    await t.withIdentity({ subject: admin }).mutation(api.users.deleteUser, { userId: client });
    expect(await exists(t, client)).toEqual({ user: false, profile: false });
  });

  it("an admin cannot delete another admin or an owner", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    const admin = await seedUser(t, "admin", "admin@test.local");
    const otherAdmin = await seedUser(t, "admin", "admin2@test.local");
    const asAdmin = t.withIdentity({ subject: admin });
    await expect(asAdmin.mutation(api.users.deleteUser, { userId: otherAdmin })).rejects.toThrow(
      "Only owners can delete owners and admins",
    );
    await expect(asAdmin.mutation(api.users.deleteUser, { userId: owner })).rejects.toThrow(
      "Only owners can delete owners and admins",
    );
    expect(await exists(t, otherAdmin)).toEqual({ user: true, profile: true });
    expect(await exists(t, owner)).toEqual({ user: true, profile: true });
  });

  it("nobody can delete their own account", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    await expect(
      t.withIdentity({ subject: owner }).mutation(api.users.deleteUser, { userId: owner }),
    ).rejects.toThrow("You can't delete your own account");
    expect(await exists(t, owner)).toEqual({ user: true, profile: true });
  });

  it("an editor cannot delete anyone", async () => {
    const t = convexTest(schema);
    const editor = await seedUser(t, "editor", "editor@test.local");
    const client = await seedUser(t, "client", "client@test.local");
    await expect(
      t.withIdentity({ subject: editor }).mutation(api.users.deleteUser, { userId: client }),
    ).rejects.toThrow("Missing required permission: delete_users");
    expect(await exists(t, client)).toEqual({ user: true, profile: true });
  });
});
