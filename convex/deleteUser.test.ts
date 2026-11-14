import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
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

describe("deleteUser (removes the account, keeps every record)", () => {
  it("an owner removes an admin: data stays, sessions end, the profile is flagged", async () => {
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

    await t.run(async (ctx) => {
      expect(await ctx.db.get(admin)).not.toBeNull();
      const [profile] = (await ctx.db.query("userProfiles").collect()).filter((p) => p.userId === admin);
      expect(profile).toMatchObject({ isActive: false, deletedBy: owner, firstName: "admin" });
      expect(typeof profile!.deletedAt).toBe("number");
      expect(await ctx.db.query("userGroupMembers").collect()).toHaveLength(1);
      expect(await ctx.db.query("contentAccess").collect()).toHaveLength(1);
      expect(await ctx.db.query("content").collect()).toHaveLength(1);
      expect(await ctx.db.query("authAccounts").collect()).toHaveLength(1);
      // Sessions and refresh tokens are ended, so nothing can be renewed.
      expect(await ctx.db.query("authSessions").collect()).toEqual([]);
      expect(await ctx.db.query("authRefreshTokens").collect()).toEqual([]);
    });
  });

  it("a removed person is refused by every permission-checked function", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    const admin = await seedUser(t, "admin", "admin@test.local");
    await t.withIdentity({ subject: owner }).mutation(api.users.deleteUser, { userId: admin });
    await expect(t.withIdentity({ subject: admin }).query(api.users.listUsers, {})).rejects.toThrow(
      "This account has been removed.",
    );
  });

  it("the app is told the account is removed, with no permissions", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    const client = await seedUser(t, "client", "client@test.local");
    await t.withIdentity({ subject: owner }).mutation(api.users.deleteUser, { userId: client });
    expect(await t.withIdentity({ subject: client }).query(api.users.getCurrentUserProfile, {})).toMatchObject({
      isRemoved: true,
      effectivePermissions: [],
    });
  });

  it("the sign-in lookup finds a removed account by email, in any case, and by user", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    const client = await seedUser(t, "client", "client@test.local");
    await t.run((ctx) =>
      ctx.db.insert("authAccounts", { userId: client, provider: "password", providerAccountId: "client@test.local" }),
    );
    expect(await t.query(internal.users.isAccountRemoved, { email: "client@test.local" })).toBe(false);
    await t.withIdentity({ subject: owner }).mutation(api.users.deleteUser, { userId: client });
    expect(await t.query(internal.users.isAccountRemoved, { email: " Client@Test.local " })).toBe(true);
    expect(await t.query(internal.users.isAccountRemoved, { userId: client })).toBe(true);
    expect(await t.query(internal.users.isAccountRemoved, { email: "owner@test.local" })).toBe(false);
  });

  it("a removed user can't be removed again or have their role changed", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    const client = await seedUser(t, "client", "client@test.local");
    const asOwner = t.withIdentity({ subject: owner });
    await asOwner.mutation(api.users.deleteUser, { userId: client });
    await expect(asOwner.mutation(api.users.deleteUser, { userId: client })).rejects.toThrow(
      "This user has already been removed",
    );
    await expect(asOwner.mutation(api.users.updateUserRole, { userId: client, role: "editor" })).rejects.toThrow(
      "This user has been removed",
    );
  });

  it("an admin removes a client", async () => {
    const t = convexTest(schema);
    const admin = await seedUser(t, "admin", "admin@test.local");
    const client = await seedUser(t, "client", "client@test.local");
    await t.withIdentity({ subject: admin }).mutation(api.users.deleteUser, { userId: client });
    expect(await t.query(internal.users.isAccountRemoved, { userId: client })).toBe(true);
  });

  it("an admin cannot remove another admin or an owner", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    const admin = await seedUser(t, "admin", "admin@test.local");
    const otherAdmin = await seedUser(t, "admin", "admin2@test.local");
    const asAdmin = t.withIdentity({ subject: admin });
    for (const target of [otherAdmin, owner]) {
      await expect(asAdmin.mutation(api.users.deleteUser, { userId: target })).rejects.toThrow(
        "Only owners can delete owners and admins",
      );
      expect(await t.query(internal.users.isAccountRemoved, { userId: target })).toBe(false);
    }
  });

  it("nobody can remove their own account", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    await expect(
      t.withIdentity({ subject: owner }).mutation(api.users.deleteUser, { userId: owner }),
    ).rejects.toThrow("You can't delete your own account");
  });

  it("an editor cannot remove anyone", async () => {
    const t = convexTest(schema);
    const editor = await seedUser(t, "editor", "editor@test.local");
    const client = await seedUser(t, "client", "client@test.local");
    await expect(
      t.withIdentity({ subject: editor }).mutation(api.users.deleteUser, { userId: client }),
    ).rejects.toThrow("Missing required permission: delete_users");
  });
});
