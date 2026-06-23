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

describe("analytics.getContentViewCounts", () => {
  it("returns empty counts (does not throw) for a contributor lacking VIEW_ANALYTICS", async () => {
    const t = convexTest(schema);
    const contributorId = await seedUser(t, "contributor", "contrib@test.local");

    const result = await t
      .withIdentity({ subject: contributorId })
      .query(api.analytics.getContentViewCounts, {});

    expect(result).toEqual({});
  });

  // Every role must be able to open ContentManager (the default admin tab)
  // without this query throwing and blanking the app. Roles without
  // VIEW_ANALYTICS get {}; roles with it get real counts.
  const ALL_ROLES = [
    "owner",
    "admin",
    "editor",
    "contributor",
    "professional",
    "parent",
    "client",
  ];
  for (const role of ALL_ROLES) {
    it(`does not throw for role "${role}"`, async () => {
      const t = convexTest(schema);
      const userId = await seedUser(t, role, `${role}@test.local`);

      const result = await t
        .withIdentity({ subject: userId })
        .query(api.analytics.getContentViewCounts, {});

      expect(typeof result).toBe("object");
    });
  }

  it("returns view counts for a user with VIEW_ANALYTICS (owner)", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner@test.local");

    // Seed a content view so the count is non-trivial.
    await t.run(async (ctx) => {
      const contentId = await ctx.db.insert("content", {
        title: "Sample",
        isPublic: false,
        createdBy: ownerId,
      });
      await ctx.db.insert("contentViews", {
        contentId,
        viewedAt: 0,
        sessionId: "test-session",
      });
    });

    const result = await t
      .withIdentity({ subject: ownerId })
      .query(api.analytics.getContentViewCounts, {});

    const total = Object.values(result).reduce((a, b) => a + b, 0);
    expect(total).toBe(1);
  });
});
