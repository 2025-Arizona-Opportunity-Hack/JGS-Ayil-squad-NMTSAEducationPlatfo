import { describe, it, expect } from "vitest";
import { resolveAdminTab, DEFAULT_ADMIN_TAB } from "./adminTabs";
import { getDefaultPermissions } from "../../convex/permissions";

const contributor = getDefaultPermissions("contributor");
const owner = getDefaultPermissions("owner");

describe("resolveAdminTab", () => {
  it("keeps always-accessible tabs regardless of permissions", () => {
    expect(resolveAdminTab("content", contributor)).toBe("content");
    expect(resolveAdminTab("shareLinks", [])).toBe("shareLinks");
  });

  it("falls back to the default tab when the stored tab needs a missing permission", () => {
    // Contributor lacks VIEW_ANALYTICS and MANAGE_SITE_SETTINGS.
    expect(resolveAdminTab("analytics", contributor)).toBe(DEFAULT_ADMIN_TAB);
    expect(resolveAdminTab("settings", contributor)).toBe(DEFAULT_ADMIN_TAB);
    expect(resolveAdminTab("users", contributor)).toBe(DEFAULT_ADMIN_TAB);
  });

  it("keeps a permission-gated tab when the user has the permission", () => {
    expect(resolveAdminTab("analytics", owner)).toBe("analytics");
    expect(resolveAdminTab("settings", owner)).toBe("settings");
    expect(resolveAdminTab("users", owner)).toBe("users");
  });

  it("falls back for null, undefined, or unknown tabs", () => {
    expect(resolveAdminTab(null, owner)).toBe(DEFAULT_ADMIN_TAB);
    expect(resolveAdminTab(undefined, owner)).toBe(DEFAULT_ADMIN_TAB);
    expect(resolveAdminTab("not-a-real-tab", owner)).toBe(DEFAULT_ADMIN_TAB);
  });
});
