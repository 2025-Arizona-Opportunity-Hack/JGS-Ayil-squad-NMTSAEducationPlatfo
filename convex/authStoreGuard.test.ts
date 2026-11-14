import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { userTouchedByStoreCall } from "./authStoreGuard";

async function seedUser(t: ReturnType<typeof convexTest>, role: string, email: string) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, name: role });
    await ctx.db.insert("userProfiles", { userId, role: role as any, firstName: role, lastName: "User", isActive: true });
    return userId;
  });
}

const countSessions = (t: ReturnType<typeof convexTest>) =>
  t.run(async (ctx) => (await ctx.db.query("authSessions").collect()).length);

describe("auth:store refuses removed accounts in the same transaction", () => {
  it("a sign-in that reaches the store after the delete creates no session", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    const client = await seedUser(t, "client", "client@test.local");
    await t.withIdentity({ subject: owner }).mutation(api.users.deleteUser, { userId: client });

    await expect(
      t.mutation(internal.auth.store, { args: { type: "signIn", userId: client, generateTokens: false } }),
    ).rejects.toThrow("This account has been removed.");
    expect(await countSessions(t)).toBe(0);
  });

  it("an active user's sign-in still creates a session", async () => {
    const t = convexTest(schema);
    const client = await seedUser(t, "client", "client@test.local");
    await t.mutation(internal.auth.store, { args: { type: "signIn", userId: client, generateTokens: false } });
    expect(await countSessions(t)).toBe(1);
  });

  it("a reset code can't be created for a removed account", async () => {
    const t = convexTest(schema);
    const owner = await seedUser(t, "owner", "owner@test.local");
    const client = await seedUser(t, "client", "client@test.local");
    const accountId = await t.run((ctx) =>
      ctx.db.insert("authAccounts", { userId: client, provider: "password", providerAccountId: "client@test.local" }),
    );
    await t.withIdentity({ subject: owner }).mutation(api.users.deleteUser, { userId: client });

    await expect(
      t.mutation(internal.auth.store, {
        args: {
          type: "createVerificationCode", accountId, provider: "resend", email: "client@test.local",
          code: "123456", expirationTime: Date.now() + 60_000, allowExtraProviders: true,
        },
      }),
    ).rejects.toThrow("This account has been removed.");
    await t.run(async (ctx) => {
      expect(await ctx.db.query("authVerificationCodes").collect()).toEqual([]);
    });
  });

  it("finds the user behind a refresh token and a password change", async () => {
    const t = convexTest(schema);
    const client = await seedUser(t, "client", "client@test.local");
    await t.run(async (ctx) => {
      const sessionId = await ctx.db.insert("authSessions", { userId: client, expirationTime: Date.now() + 60_000 });
      await ctx.db.insert("authAccounts", { userId: client, provider: "password", providerAccountId: "Client@Test.local" });
      expect(await userTouchedByStoreCall(ctx, { type: "refreshSession", refreshToken: `token|${sessionId}` }, null)).toBe(client);
      expect(
        await userTouchedByStoreCall(ctx, { type: "modifyAccount", provider: "password", account: { id: "Client@Test.local", secret: "x" } }, null),
      ).toBe(client);
      expect(await userTouchedByStoreCall(ctx, { type: "signOut" }, null)).toBeNull();
    });
  });
});
