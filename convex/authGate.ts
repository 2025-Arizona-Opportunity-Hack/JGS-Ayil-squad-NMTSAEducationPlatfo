/**
 * Refuse every password flow for removed accounts.
 *
 * Removing a user keeps all their data and flags the profile with
 * `deletedAt`. This gate makes that flag stick at sign-in: signIn, signUp,
 * reset (sending a code), reset-verification and email-verification are all
 * refused for the account's email (sign-in only after the password is
 * checked), and anything that resolves to a removed user is refused before a
 * session is created.
 */
import { ConvexError } from "convex/values";

export const ACCOUNT_REMOVED_MESSAGE = "This account has been removed.";

type Params = Record<string, unknown>;
type AuthorizeResult = { userId: string; sessionId?: string } | null;
type Authorize<Ctx> = (params: Params, ctx: Ctx) => Promise<AuthorizeResult>;

export type RemovedCheck<Ctx> = (
  ctx: Ctx,
  who: { email?: string; userId?: string },
) => Promise<boolean>;

export function blockRemovedAccounts<Ctx>(
  authorize: Authorize<Ctx>,
  isRemoved: RemovedCheck<Ctx>,
): Authorize<Ctx> {
  return async (params, ctx) => {
    const email = typeof params.email === "string" ? params.email.trim() : undefined;
    // For sign-in, wait until the password is proven, so the message never
    // reveals which emails belonged to removed accounts. Every other flow
    // (sign up, reset, verification) acts before returning a user, so it has
    // to be refused up front.
    if (email && params.flow !== "signIn" && (await isRemoved(ctx, { email }))) {
      throw new ConvexError(ACCOUNT_REMOVED_MESSAGE);
    }
    const result = await authorize(params, ctx);
    if (result?.userId && (await isRemoved(ctx, { userId: result.userId }))) {
      throw new ConvexError(ACCOUNT_REMOVED_MESSAGE);
    }
    return result;
  };
}
