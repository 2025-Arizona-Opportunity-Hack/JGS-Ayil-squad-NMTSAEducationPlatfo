import { describe, it, expect } from "vitest";
import { ConvexError } from "convex/values";
import { validatePassword, MIN_PASSWORD_LENGTH } from "./passwordRules";

describe("validatePassword", () => {
  it("accepts passwords at or above the minimum length", () => {
    expect(() => validatePassword("a".repeat(MIN_PASSWORD_LENGTH))).not.toThrow();
    expect(() => validatePassword("correct horse battery")).not.toThrow();
  });

  it("rejects short passwords with a ConvexError the client can read", () => {
    try {
      validatePassword("short");
      expect.unreachable("should have thrown");
    } catch (error) {
      // Must be ConvexError — a plain Error would be redacted to "Server
      // Error" in production and the sign-up form couldn't explain itself.
      expect(error).toBeInstanceOf(ConvexError);
      const data = (error as ConvexError<{ code: string; message: string }>).data;
      expect(data.code).toBe("INVALID_PASSWORD");
      expect(data.message).toMatch(/at least 8 characters/i);
    }
  });
});
