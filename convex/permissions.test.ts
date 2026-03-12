import { describe, it, expect } from "vitest";
import {
  PERMISSIONS,
  ALL_PERMISSIONS,
  DEFAULT_PERMISSIONS,
  getDefaultPermissions,
  hasPermission,
  hasAllPermissions,
  hasAnyPermission,
  getEffectivePermissions,
  Permission,
} from "./permissions";

describe("PERMISSIONS constants", () => {
  it("should have unique permission values", () => {
    const values = Object.values(PERMISSIONS);
    const unique = new Set(values);
    expect(unique.size).toBe(values.length);
  });

  it("ALL_PERMISSIONS should contain every permission", () => {
    expect(ALL_PERMISSIONS).toEqual(Object.values(PERMISSIONS));
  });

  it("should define PROMOTE_TO_ADMIN as owner-only", () => {
    expect(PERMISSIONS.PROMOTE_TO_ADMIN).toBe("promote_to_admin");
    expect(DEFAULT_PERMISSIONS["owner"]).toContain(PERMISSIONS.PROMOTE_TO_ADMIN);
    expect(DEFAULT_PERMISSIONS["admin"]).not.toContain(PERMISSIONS.PROMOTE_TO_ADMIN);
  });
});

describe("getDefaultPermissions", () => {
  it("returns all permissions for owner", () => {
    expect(getDefaultPermissions("owner")).toEqual(ALL_PERMISSIONS);
  });

  it("returns all except PROMOTE_TO_ADMIN for admin", () => {
    const adminPerms = getDefaultPermissions("admin");
    expect(adminPerms).not.toContain(PERMISSIONS.PROMOTE_TO_ADMIN);
    expect(adminPerms.length).toBe(ALL_PERMISSIONS.length - 1);
  });

  it("returns correct permissions for editor", () => {
    const editorPerms = getDefaultPermissions("editor");
    expect(editorPerms).toContain(PERMISSIONS.VIEW_ALL_CONTENT);
    expect(editorPerms).toContain(PERMISSIONS.CREATE_CONTENT);
    expect(editorPerms).toContain(PERMISSIONS.EDIT_CONTENT);
    expect(editorPerms).toContain(PERMISSIONS.REVIEW_CONTENT);
    expect(editorPerms).toContain(PERMISSIONS.PUBLISH_CONTENT);
    expect(editorPerms).not.toContain(PERMISSIONS.MANAGE_USERS);
    expect(editorPerms).not.toContain(PERMISSIONS.DELETE_CONTENT);
  });

  it("returns correct permissions for contributor", () => {
    const contribPerms = getDefaultPermissions("contributor");
    expect(contribPerms).toContain(PERMISSIONS.CREATE_CONTENT);
    expect(contribPerms).toContain(PERMISSIONS.SUBMIT_FOR_REVIEW);
    expect(contribPerms).not.toContain(PERMISSIONS.PUBLISH_CONTENT);
    expect(contribPerms).not.toContain(PERMISSIONS.REVIEW_CONTENT);
  });

  it("returns minimal permissions for client/parent", () => {
    expect(getDefaultPermissions("client")).toEqual([PERMISSIONS.SHARE_CONTENT]);
    expect(getDefaultPermissions("parent")).toEqual([PERMISSIONS.SHARE_CONTENT]);
  });

  it("returns RECOMMEND_CONTENT for professional", () => {
    const profPerms = getDefaultPermissions("professional");
    expect(profPerms).toContain(PERMISSIONS.RECOMMEND_CONTENT);
    expect(profPerms).toContain(PERMISSIONS.VIEW_ALL_CONTENT);
  });

  it("returns empty array for unknown role", () => {
    expect(getDefaultPermissions("nonexistent")).toEqual([]);
  });
});

describe("hasPermission", () => {
  it("returns true when user has the permission", () => {
    expect(hasPermission([PERMISSIONS.CREATE_CONTENT], PERMISSIONS.CREATE_CONTENT)).toBe(true);
  });

  it("returns false when user lacks the permission", () => {
    expect(hasPermission([PERMISSIONS.CREATE_CONTENT], PERMISSIONS.DELETE_CONTENT)).toBe(false);
  });

  it("returns false for undefined permissions", () => {
    expect(hasPermission(undefined, PERMISSIONS.CREATE_CONTENT)).toBe(false);
  });

  it("returns false for empty permissions", () => {
    expect(hasPermission([], PERMISSIONS.CREATE_CONTENT)).toBe(false);
  });
});

describe("hasAllPermissions", () => {
  const perms: Permission[] = [
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.EDIT_CONTENT,
    PERMISSIONS.DELETE_CONTENT,
  ];

  it("returns true when user has all listed permissions", () => {
    expect(hasAllPermissions(perms, [PERMISSIONS.CREATE_CONTENT, PERMISSIONS.EDIT_CONTENT])).toBe(true);
  });

  it("returns false when user is missing one", () => {
    expect(hasAllPermissions(perms, [PERMISSIONS.CREATE_CONTENT, PERMISSIONS.PUBLISH_CONTENT])).toBe(false);
  });

  it("returns false for undefined permissions", () => {
    expect(hasAllPermissions(undefined, [PERMISSIONS.CREATE_CONTENT])).toBe(false);
  });
});

describe("hasAnyPermission", () => {
  const perms: Permission[] = [PERMISSIONS.CREATE_CONTENT];

  it("returns true when user has at least one", () => {
    expect(hasAnyPermission(perms, [PERMISSIONS.CREATE_CONTENT, PERMISSIONS.PUBLISH_CONTENT])).toBe(true);
  });

  it("returns false when user has none", () => {
    expect(hasAnyPermission(perms, [PERMISSIONS.DELETE_CONTENT, PERMISSIONS.PUBLISH_CONTENT])).toBe(false);
  });

  it("returns false for undefined permissions", () => {
    expect(hasAnyPermission(undefined, [PERMISSIONS.CREATE_CONTENT])).toBe(false);
  });
});

describe("getEffectivePermissions", () => {
  it("returns custom permissions when set", () => {
    const custom = [PERMISSIONS.CREATE_CONTENT, PERMISSIONS.DELETE_CONTENT];
    expect(getEffectivePermissions({ role: "client", permissions: custom })).toEqual(custom);
  });

  it("returns role defaults when no custom permissions", () => {
    expect(getEffectivePermissions({ role: "editor" })).toEqual(getDefaultPermissions("editor"));
  });

  it("returns role defaults when permissions array is empty", () => {
    expect(getEffectivePermissions({ role: "admin", permissions: [] })).toEqual(getDefaultPermissions("admin"));
  });

  it("uses custom permissions even if they differ from role defaults", () => {
    // A client with custom admin-like permissions
    const custom = [...ALL_PERMISSIONS];
    const result = getEffectivePermissions({ role: "client", permissions: custom });
    expect(result).toEqual(custom);
  });
});
