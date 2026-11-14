import { ConvexError } from "convex/values";
import { ACCOUNT_REMOVED_MESSAGE } from "../../convex/authGate";

/** True when a sign-in or reset failed because the account was removed. */
export function isAccountRemovedError(error: unknown): boolean {
  if (error instanceof ConvexError && error.data === ACCOUNT_REMOVED_MESSAGE) return true;
  return error instanceof Error && error.message.includes(ACCOUNT_REMOVED_MESSAGE);
}

export const ACCOUNT_REMOVED_TOAST = {
  title: "This account has been removed",
  description: "Contact the organisation if you think this is a mistake.",
};
