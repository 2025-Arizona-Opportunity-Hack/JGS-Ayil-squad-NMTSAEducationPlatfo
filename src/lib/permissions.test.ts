import { describe, it, expect } from "vitest";
import { PERMISSIONS as FRONTEND_PERMISSIONS } from "./permissions";
import { PERMISSIONS as BACKEND_PERMISSIONS } from "../../convex/permissions";

describe("Frontend/Backend permissions sync", () => {
  it("should have identical permission keys", () => {
    const frontendKeys = Object.keys(FRONTEND_PERMISSIONS).sort();
    const backendKeys = Object.keys(BACKEND_PERMISSIONS).sort();
    expect(frontendKeys).toEqual(backendKeys);
  });

  it("should have identical permission values", () => {
    const frontendValues = Object.values(FRONTEND_PERMISSIONS).sort();
    const backendValues = Object.values(BACKEND_PERMISSIONS).sort();
    expect(frontendValues).toEqual(backendValues);
  });

  it("each key should map to the same value", () => {
    for (const key of Object.keys(BACKEND_PERMISSIONS) as Array<keyof typeof BACKEND_PERMISSIONS>) {
      expect(FRONTEND_PERMISSIONS[key]).toBe(BACKEND_PERMISSIONS[key]);
    }
  });
});
