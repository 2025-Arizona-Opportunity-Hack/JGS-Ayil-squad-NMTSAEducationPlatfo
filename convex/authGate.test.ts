import { describe, it, expect, vi } from "vitest";
import { blockRemovedAccounts, ACCOUNT_REMOVED_MESSAGE } from "./authGate";

const removedEmail = "gone@test.local";
const removedUser = "user-gone";
const isRemoved = async (_ctx: unknown, who: { email?: string; userId?: string }) =>
  who.email?.toLowerCase() === removedEmail || who.userId === removedUser;

describe("blockRemovedAccounts", () => {
  for (const flow of ["signUp", "reset", "reset-verification", "email-verification"]) {
    it(`refuses the ${flow} flow for a removed email before the provider runs`, async () => {
      const authorize = vi.fn(async () => ({ userId: "x" }));
      const gated = blockRemovedAccounts(authorize, isRemoved);
      await expect(gated({ flow, email: " Gone@Test.local " }, {})).rejects.toThrow(ACCOUNT_REMOVED_MESSAGE);
      expect(authorize).not.toHaveBeenCalled();
    });
  }

  it("checks the password before saying a sign-in account is removed", async () => {
    const authorize = vi.fn(async () => ({ userId: removedUser }));
    const gated = blockRemovedAccounts(authorize, isRemoved);
    await expect(gated({ flow: "signIn", email: removedEmail }, {})).rejects.toThrow(ACCOUNT_REMOVED_MESSAGE);
    expect(authorize).toHaveBeenCalledOnce();
  });

  it("a wrong password for a removed account gets the ordinary failure, not the removed message", async () => {
    const gated = blockRemovedAccounts(async () => {
      throw new Error("InvalidSecret");
    }, isRemoved);
    await expect(gated({ flow: "signIn", email: removedEmail }, {})).rejects.toThrow("InvalidSecret");
  });

  it("refuses when the provider resolves to a removed user", async () => {
    const gated = blockRemovedAccounts(async () => ({ userId: removedUser }), isRemoved);
    await expect(gated({ flow: "signIn", email: "other@test.local" }, {})).rejects.toThrow(ACCOUNT_REMOVED_MESSAGE);
  });

  it("lets everyone else through unchanged", async () => {
    const gated = blockRemovedAccounts(async () => ({ userId: "u1", sessionId: "s1" }), isRemoved);
    expect(await gated({ flow: "signIn", email: "ok@test.local" }, {})).toEqual({ userId: "u1", sessionId: "s1" });
  });

  it("passes through a flow that signs nobody in, such as sending a reset code", async () => {
    const gated = blockRemovedAccounts(async () => null, isRemoved);
    expect(await gated({ flow: "reset", email: "ok@test.local" }, {})).toBeNull();
  });
});

describe("the real password provider", () => {
  it("is the gated one, so a removed account's reset is refused before anything is sent", async () => {
    const { passwordProvider } = await import("./auth");
    // convexAuth() merges `options` onto the provider; this is the function sign-in calls.
    const authorize = (passwordProvider as unknown as { authorize: (p: object, c: object) => Promise<unknown> }).authorize;
    const ctx = { runQuery: vi.fn(async () => true) };
    await expect(authorize({ flow: "reset", email: "gone@test.local" }, ctx)).rejects.toThrow(ACCOUNT_REMOVED_MESSAGE);
    expect(ctx.runQuery).toHaveBeenCalledOnce();
  });
});
