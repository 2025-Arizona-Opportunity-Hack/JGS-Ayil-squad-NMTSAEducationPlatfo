/**
 * Refuse removed accounts inside the auth library's own `auth:store` mutation.
 *
 * Every sign-in, session refresh, code sign-in, password change and reset-code
 * creation is written through `auth:store`. Checking the removed flag in that
 * same transaction means a delete and a sign-in can't interleave: if the person
 * is removed, the whole store operation (new session, new tokens, changed
 * password, new code) rolls back.
 *
 * Checked against @convex-dev/auth 0.0.80 (store argument shapes in
 * dist/server/implementation/mutations). Re-check when upgrading.
 */
import { ConvexError } from "convex/values";
import { MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { ACCOUNT_REMOVED_MESSAGE } from "./authGate";

type StoreCall = { type: string; [key: string]: any };

/** The user a store call signs in, refreshes, re-keys or sends a code to. */
export async function userTouchedByStoreCall(
  ctx: MutationCtx,
  call: StoreCall,
  result: any,
): Promise<Id<"users"> | null> {
  switch (call.type) {
    case "signIn":
      return call.userId ?? null;
    case "verifyCodeAndSignIn":
      return result?.userId ?? null;
    case "refreshSession": {
      const sessionId = String(call.refreshToken ?? "").split("|")[1];
      const normalized = sessionId ? ctx.db.normalizeId("authSessions", sessionId) : null;
      const session = normalized ? await ctx.db.get(normalized) : null;
      return session?.userId ?? null;
    }
    case "modifyAccount": {
      const account = await ctx.db
        .query("authAccounts")
        .withIndex("providerAndAccountId", (q) =>
          q.eq("provider", call.provider).eq("providerAccountId", call.account?.id),
        )
        .unique();
      return account?.userId ?? null;
    }
    case "createVerificationCode": {
      if (!call.accountId) return null;
      const account = await ctx.db.get(call.accountId as Id<"authAccounts">);
      return account?.userId ?? null;
    }
    default:
      return null;
  }
}

export async function refuseRemovedInStore(ctx: MutationCtx, call: StoreCall, result: unknown) {
  const userId = await userTouchedByStoreCall(ctx, call, result);
  if (!userId) return;
  const profile = await ctx.db
    .query("userProfiles")
    .withIndex("by_user_id", (q) => q.eq("userId", userId))
    .unique();
  if (profile?.deletedAt !== undefined) {
    throw new ConvexError(ACCOUNT_REMOVED_MESSAGE);
  }
}
