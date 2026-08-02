import { ConvexError } from "convex/values";

export const MIN_PASSWORD_LENGTH = 8;

/**
 * Password rule for the Convex Auth Password provider. Thrown as ConvexError
 * so the reason reaches the browser in production — plain Errors from auth
 * are redacted to an opaque "Server Error" there, which the sign-up form can
 * only surface as a generic failure. Length-only by design (no composition
 * rules), matching what the provider's default enforced.
 */
export function validatePassword(password: string) {
  if (typeof password !== "string" || password.length < MIN_PASSWORD_LENGTH) {
    throw new ConvexError({
      code: "INVALID_PASSWORD",
      message: `Password must be at least ${MIN_PASSWORD_LENGTH} characters.`,
    });
  }
}
