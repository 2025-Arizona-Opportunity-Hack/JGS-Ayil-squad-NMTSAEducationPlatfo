import { describe, it, expect } from "vitest";
import { ConvexError } from "convex/values";
import { isAccountRemovedError } from "./accountRemoved";

describe("isAccountRemovedError", () => {
  it("recognises the server's removed-account error", () => {
    expect(isAccountRemovedError(new ConvexError("This account has been removed."))).toBe(true);
    expect(isAccountRemovedError(new Error("[Request ID: x] Server Error Uncaught ConvexError: This account has been removed."))).toBe(true);
  });
  it("ignores other errors", () => {
    expect(isAccountRemovedError(new Error("InvalidSecret"))).toBe(false);
    expect(isAccountRemovedError("nope")).toBe(false);
  });
});
