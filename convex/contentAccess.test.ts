import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

// Seed a user with the given role and return their userId for withIdentity().
async function seedUser(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string,
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, name: "Test User" });
    await ctx.db.insert("userProfiles", {
      userId,
      role,
      firstName: "Test",
      lastName: "User",
      isActive: true,
    });
    return userId;
  });
}

// A published, active, non-public item — visible only to someone granted access.
async function seedRestrictedContent(
  t: ReturnType<typeof convexTest>,
  ownerId: any,
  title: string,
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("content", {
      title,
      isPublic: false,
      createdBy: ownerId,
      status: "published",
      active: true,
    }),
  );
}

describe("content access via user groups", () => {
  it("does not leak other content when a group is granted access to one item", async () => {
    const t = convexTest(schema);
    const admin = await seedUser(t, "admin", "admin@test.local");
    const client = await seedUser(t, "client", "client@test.local");

    const granted = await seedRestrictedContent(t, admin, "Granted item");
    const other = await seedRestrictedContent(t, admin, "Other item");

    // The client belongs to a group, and that group is granted access to
    // exactly one of the two items.
    await t.run(async (ctx) => {
      const groupId = await ctx.db.insert("userGroups", {
        name: "Tuesday cohort",
        createdBy: admin,
        isActive: true,
      });
      await ctx.db.insert("userGroupMembers", {
        userId: client,
        groupId,
        addedBy: admin,
      });
      await ctx.db.insert("contentAccess", {
        contentId: granted,
        userGroupId: groupId,
        grantedBy: admin,
        canShare: false,
      });
    });

    const visible = await t
      .withIdentity({ subject: client })
      .query(api.content.listContent, {});
    const titles = visible.map((c: any) => c.title);

    expect(titles).toContain("Granted item");
    expect(titles).not.toContain("Other item");
  });

  it("still grants access to the item the group was granted", async () => {
    const t = convexTest(schema);
    const admin = await seedUser(t, "admin", "admin2@test.local");
    const client = await seedUser(t, "client", "client2@test.local");
    const granted = await seedRestrictedContent(t, admin, "Group item");

    await t.run(async (ctx) => {
      const groupId = await ctx.db.insert("userGroups", {
        name: "Cohort",
        createdBy: admin,
        isActive: true,
      });
      await ctx.db.insert("userGroupMembers", {
        userId: client,
        groupId,
        addedBy: admin,
      });
      await ctx.db.insert("contentAccess", {
        contentId: granted,
        userGroupId: groupId,
        grantedBy: admin,
        canShare: false,
      });
    });

    const visible = await t
      .withIdentity({ subject: client })
      .query(api.content.listContent, {});
    expect(visible.map((c: any) => c.title)).toContain("Group item");
  });

  it("does not grant access through an expired group grant", async () => {
    const t = convexTest(schema);
    const admin = await seedUser(t, "admin", "admin3@test.local");
    const client = await seedUser(t, "client", "client3@test.local");
    const item = await seedRestrictedContent(t, admin, "Expired grant item");

    await t.run(async (ctx) => {
      const groupId = await ctx.db.insert("userGroups", {
        name: "Lapsed cohort",
        createdBy: admin,
        isActive: true,
      });
      await ctx.db.insert("userGroupMembers", {
        userId: client,
        groupId,
        addedBy: admin,
      });
      await ctx.db.insert("contentAccess", {
        contentId: item,
        userGroupId: groupId,
        grantedBy: admin,
        canShare: false,
        expiresAt: Date.now() - 1000,
      });
    });

    const visible = await t
      .withIdentity({ subject: client })
      .query(api.content.listContent, {});
    expect(visible.map((c: any) => c.title)).not.toContain("Expired grant item");
  });
});
