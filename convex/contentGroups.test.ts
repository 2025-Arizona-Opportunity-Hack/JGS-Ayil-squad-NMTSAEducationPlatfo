import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

async function seedUser(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string
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

async function seedContent(
  t: ReturnType<typeof convexTest>,
  createdBy: Id<"users">,
  title: string,
  overrides: Record<string, unknown> = {}
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("content", {
      title,
      isPublic: true,
      createdBy,
      status: "published",
      active: true,
      attachmentType: "video",
      ...overrides,
    })
  );
}

describe("bundle item ordering", () => {
  it("addContentToGroup defaults order to end of list", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-ord-1@test.local");
    const asOwner = t.withIdentity({ subject: ownerId });
    const groupId = await asOwner.mutation(api.contentGroups.createContentGroup, {
      name: "Ordered Bundle",
    });
    const c1 = await seedContent(t, ownerId, "One");
    const c2 = await seedContent(t, ownerId, "Two");

    await asOwner.mutation(api.contentGroups.addContentToGroup, {
      groupId,
      contentId: c1,
    });
    await asOwner.mutation(api.contentGroups.addContentToGroup, {
      groupId,
      contentId: c2,
    });

    const items = await t.run(async (ctx) =>
      ctx.db
        .query("contentGroupItems")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect()
    );
    const orders = items
      .sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
      .map((i) => i.order);
    expect(orders).toEqual([1, 2]);
  });

  it("reorderGroupItems normalizes to 1..n and requires the full item set", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-ord-2@test.local");
    const clientId = await seedUser(t, "client", "client-ord-2@test.local");
    const asOwner = t.withIdentity({ subject: ownerId });
    const groupId = await asOwner.mutation(api.contentGroups.createContentGroup, {
      name: "Reorder Bundle",
    });
    const c1 = await seedContent(t, ownerId, "One");
    const c2 = await seedContent(t, ownerId, "Two");
    // Legacy row with no order at all
    const legacyItemId = await t.run(async (ctx) =>
      ctx.db.insert("contentGroupItems", {
        groupId,
        contentId: c1,
        addedBy: ownerId,
      })
    );
    const newItemId = await asOwner.mutation(
      api.contentGroups.addContentToGroup,
      { groupId, contentId: c2 }
    );

    await expect(
      t.withIdentity({ subject: clientId }).mutation(
        api.contentGroups.reorderGroupItems,
        { groupId, orderedItemIds: [newItemId, legacyItemId] }
      )
    ).rejects.toThrow(/permission/i);

    await expect(
      asOwner.mutation(api.contentGroups.reorderGroupItems, {
        groupId,
        orderedItemIds: [newItemId],
      })
    ).rejects.toThrow(/every item/i);

    await asOwner.mutation(api.contentGroups.reorderGroupItems, {
      groupId,
      orderedItemIds: [newItemId, legacyItemId],
    });

    const items = await t.run(async (ctx) =>
      ctx.db
        .query("contentGroupItems")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect()
    );
    expect(items.find((i) => i._id === newItemId)!.order).toBe(1);
    expect(items.find((i) => i._id === legacyItemId)!.order).toBe(2);
  });

  it("backfillGroupItemOrder assigns 1..n to legacy rows", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-ord-3@test.local");
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("contentGroups", {
        name: "Legacy Bundle",
        createdBy: ownerId,
        isActive: true,
      })
    );
    const c1 = await seedContent(t, ownerId, "One");
    const c2 = await seedContent(t, ownerId, "Two");
    await t.run(async (ctx) => {
      await ctx.db.insert("contentGroupItems", {
        groupId,
        contentId: c1,
        addedBy: ownerId,
      });
      await ctx.db.insert("contentGroupItems", {
        groupId,
        contentId: c2,
        addedBy: ownerId,
        order: 5,
      });
    });

    const { patched } = await t.mutation(
      internal.contentGroups.backfillGroupItemOrder,
      {}
    );
    expect(patched).toBe(2);

    const items = await t.run(async (ctx) =>
      ctx.db
        .query("contentGroupItems")
        .withIndex("by_group", (q) => q.eq("groupId", groupId))
        .collect()
    );
    // Numbered row (5) sorts before the legacy undefined row, then both
    // normalize to 1..n
    expect(items.find((i) => i.contentId === c2)!.order).toBe(1);
    expect(items.find((i) => i.contentId === c1)!.order).toBe(2);
  });
});

describe("learner-facing bundles (publicBundles)", () => {
  it("anonymous and unentitled users see nothing; grants open access", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-pb-1@test.local");
    const clientId = await seedUser(t, "client", "client-pb-1@test.local");

    const privateGroupId = await t.run(async (ctx) =>
      ctx.db.insert("contentGroups", {
        name: "Private",
        createdBy: ownerId,
        isActive: true,
        isPublic: false,
      })
    );
    const publicGroupId = await t.run(async (ctx) =>
      ctx.db.insert("contentGroups", {
        name: "Public",
        createdBy: ownerId,
        isActive: true,
        isPublic: true,
      })
    );
    // Inactive bundles never appear
    await t.run(async (ctx) =>
      ctx.db.insert("contentGroups", {
        name: "Retired",
        createdBy: ownerId,
        isActive: false,
        isPublic: true,
      })
    );

    expect(await t.query(api.publicBundles.listMyBundles, {})).toEqual([]);

    const asClient = t.withIdentity({ subject: clientId });
    let names = (await asClient.query(api.publicBundles.listMyBundles, {})).map(
      (b) => b.name
    );
    expect(names).toEqual(["Public"]);
    expect(
      await asClient.query(api.publicBundles.getBundleForLearner, {
        groupId: privateGroupId,
      })
    ).toBeNull();

    await t.run(async (ctx) => {
      await ctx.db.insert("contentGroupAccess", {
        groupId: privateGroupId,
        userId: clientId,
        grantedBy: ownerId,
        canShare: false,
      });
    });
    names = (await asClient.query(api.publicBundles.listMyBundles, {})).map(
      (b) => b.name
    );
    expect(names.sort()).toEqual(["Private", "Public"]);
    expect(
      await asClient.query(api.publicBundles.getBundleForLearner, {
        groupId: publicGroupId,
      })
    ).not.toBeNull();
  });

  it("returns items in order with per-item completion, hiding unpublished items", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-pb-2@test.local");
    const clientId = await seedUser(t, "client", "client-pb-2@test.local");
    const c1 = await seedContent(t, ownerId, "Part 1");
    const c2 = await seedContent(t, ownerId, "Part 2");
    const draft = await seedContent(t, ownerId, "Draft", { status: "draft" });
    const groupId = await t.run(async (ctx) => {
      const gid = await ctx.db.insert("contentGroups", {
        name: "Series",
        createdBy: ownerId,
        isActive: true,
        isPublic: true,
      });
      await ctx.db.insert("contentGroupItems", {
        groupId: gid,
        contentId: c2,
        addedBy: ownerId,
        order: 2,
      });
      await ctx.db.insert("contentGroupItems", {
        groupId: gid,
        contentId: c1,
        addedBy: ownerId,
        order: 1,
      });
      await ctx.db.insert("contentGroupItems", {
        groupId: gid,
        contentId: draft,
        addedBy: ownerId,
        order: 3,
      });
      return gid;
    });

    const asClient = t.withIdentity({ subject: clientId });
    await asClient.mutation(api.progress.markContentCompleted, {
      contentId: c1,
    });

    const bundle = await asClient.query(api.publicBundles.getBundleForLearner, {
      groupId,
    });
    expect(bundle!.items.map((i) => i.title)).toEqual(["Part 1", "Part 2"]);
    expect(bundle!.items[0].completed).toBe(true);
    expect(bundle!.items[1].completed).toBe(false);
    expect(bundle!.completedCount).toBe(1);
  });
});
