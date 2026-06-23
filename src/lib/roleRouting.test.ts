import { describe, it, expect } from "vitest";
import { isAdminUser, hasPermission, PERMISSIONS } from "./permissions";
import { getDefaultPermissions } from "../../convex/permissions";

// The post-login routing contract for every role, using each role's DEFAULT
// permissions. "admin" => staff dashboard (AdminDashboard); "client" => client
// portal (ClientLayout). Keep this in sync with App.tsx routing.
const ROLE_DESTINATIONS: Record<string, "admin" | "client"> = {
  owner: "admin",
  admin: "admin",
  editor: "admin",
  contributor: "admin",
  professional: "client",
  parent: "client",
  client: "client",
};

describe("post-login routing per role", () => {
  for (const [role, destination] of Object.entries(ROLE_DESTINATIONS)) {
    it(`routes "${role}" to the ${destination} experience`, () => {
      const perms = getDefaultPermissions(role);
      expect(isAdminUser(perms)).toBe(destination === "admin");
    });
  }

  it("treats users with no/undefined permissions as non-admin", () => {
    expect(isAdminUser([])).toBe(false);
    expect(isAdminUser(undefined)).toBe(false);
  });
});

describe("invite-code modal gating per role", () => {
  // Only these roles can generate invite codes, so only they should mount the
  // InviteCodeModal / ClientInviteModal (whose queries throw otherwise).
  const CAN_GENERATE = new Set(["owner", "admin"]);
  for (const role of Object.keys(ROLE_DESTINATIONS)) {
    it(`${role} ${CAN_GENERATE.has(role) ? "can" : "cannot"} generate invite codes`, () => {
      const perms = getDefaultPermissions(role);
      expect(hasPermission(perms, PERMISSIONS.GENERATE_INVITE_CODES)).toBe(
        CAN_GENERATE.has(role)
      );
    });
  }
});
