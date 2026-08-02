import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
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
  createdBy: Id<"users">
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("content", {
      title: "Video",
      isPublic: true,
      createdBy,
      status: "published",
      active: true,
      attachmentType: "video",
    })
  );
}

describe("contentProgress", () => {
  it("requires auth", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-prog-1@test.local");
    const contentId = await seedContent(t, ownerId);

    await expect(
      t.mutation(api.progress.recordProgress, { contentId, progress: 0.5 })
    ).rejects.toThrow(/not authenticated/i);
  });

  it("is monotonic and clamps to [0, 1]", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-prog-2@test.local");
    const clientId = await seedUser(t, "client", "client-prog-2@test.local");
    const contentId = await seedContent(t, ownerId);
    const asClient = t.withIdentity({ subject: clientId });

    await asClient.mutation(api.progress.recordProgress, {
      contentId,
      progress: 0.6,
    });
    // Seeking backwards must not lower recorded progress
    await asClient.mutation(api.progress.recordProgress, {
      contentId,
      progress: 0.2,
    });
    // Out-of-range values clamp instead of corrupting the row
    await asClient.mutation(api.progress.recordProgress, {
      contentId,
      progress: 17,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("contentProgress")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(rows).toHaveLength(1);
    expect(rows[0].maxProgress).toBe(1);
    expect(rows[0].completed).toBe(true);
    expect(rows[0].completionSource).toBe("playback");
  });

  it("completes at the 90% threshold, not before", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-prog-3@test.local");
    const clientId = await seedUser(t, "client", "client-prog-3@test.local");
    const contentId = await seedContent(t, ownerId);
    const asClient = t.withIdentity({ subject: clientId });

    const below = await asClient.mutation(api.progress.recordProgress, {
      contentId,
      progress: 0.89,
    });
    expect(below.completed).toBe(false);

    const at = await asClient.mutation(api.progress.recordProgress, {
      contentId,
      progress: 0.9,
    });
    expect(at.completed).toBe(true);
  });

  it("manual mark-as-watched records completionSource 'manual'", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-prog-4@test.local");
    const clientId = await seedUser(t, "client", "client-prog-4@test.local");
    const contentId = await seedContent(t, ownerId);

    await t
      .withIdentity({ subject: clientId })
      .mutation(api.progress.markContentCompleted, { contentId });

    const progress = await t
      .withIdentity({ subject: clientId })
      .query(api.progress.getMyProgressForContents, {
        contentIds: [contentId],
      });
    expect(progress[contentId]).toMatchObject({
      maxProgress: 1,
      completed: true,
    });

    const rows = await t.run(async (ctx) =>
      ctx.db
        .query("contentProgress")
        .withIndex("by_content", (q) => q.eq("contentId", contentId))
        .collect()
    );
    expect(rows[0].completionSource).toBe("manual");
  });

  it("progress is per-user", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-prog-5@test.local");
    const clientA = await seedUser(t, "client", "client-prog-5a@test.local");
    const clientB = await seedUser(t, "client", "client-prog-5b@test.local");
    const contentId = await seedContent(t, ownerId);

    await t
      .withIdentity({ subject: clientA })
      .mutation(api.progress.markContentCompleted, { contentId });

    const forB = await t
      .withIdentity({ subject: clientB })
      .query(api.progress.getMyProgressForContents, {
        contentIds: [contentId],
      });
    expect(forB[contentId]).toBeUndefined();
  });
});
