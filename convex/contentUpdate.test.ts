/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

// updateContent's replacement-file contract: `fileId`/`chunks` are passed
// only when the media file itself is replaced; replacing must clean up the
// old chunk blobs (exclusively owned) and never leave a row both single-file
// and chunked at once.

async function seedEditor(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: `editor-${Math.random()}@test.local`,
      name: "Editor",
    });
    await ctx.db.insert("userProfiles", {
      userId,
      role: "owner",
      firstName: "Test",
      lastName: "Editor",
      isActive: true,
    });
    return userId;
  });
}

async function seedChunkedContent(
  t: ReturnType<typeof convexTest>,
  ownerId: Awaited<ReturnType<typeof seedEditor>>
) {
  return await t.run(async (ctx) => {
    const oldChunkIds = [];
    for (const bytes of ["OLD-CHUNK-ONE", "OLD-CHUNK-TWO"]) {
      oldChunkIds.push(await ctx.storage.store(new Blob([bytes])));
    }
    const contentId = await ctx.db.insert("content", {
      title: "Chunked Video",
      attachmentType: "video" as const,
      isPublic: false,
      status: "draft",
      active: true,
      createdBy: ownerId,
      mimeType: "video/mp4",
      fileSize: 26,
      chunks: oldChunkIds.map((storageId, i) => ({ storageId, size: 13 + i })),
    });
    return { contentId, oldChunkIds };
  });
}

const BASE_UPDATE_ARGS = {
  title: "Updated Title",
  attachmentType: "video" as const,
  isPublic: false,
  active: true,
};

describe("updateContent media replacement", () => {
  it("metadata-only updates leave the existing chunks untouched", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedEditor(t);
    const { contentId, oldChunkIds } = await seedChunkedContent(t, ownerId);

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.content.updateContent, {
        contentId,
        ...BASE_UPDATE_ARGS,
      });

    const row = await t.run((ctx) => ctx.db.get(contentId));
    expect(row?.title).toBe("Updated Title");
    expect(row?.chunks?.map((c) => c.storageId)).toEqual(oldChunkIds);
    const oldBlob = await t.run((ctx) => ctx.storage.getUrl(oldChunkIds[0]));
    expect(oldBlob).not.toBeNull();
  });

  it("replacing with new chunks deletes the old chunk blobs and keeps the row chunked", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedEditor(t);
    const { contentId, oldChunkIds } = await seedChunkedContent(t, ownerId);
    const newChunkId = await t.run((ctx) => ctx.storage.store(new Blob(["NEW-CHUNK"])));

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.content.updateContent, {
        contentId,
        ...BASE_UPDATE_ARGS,
        chunks: [{ storageId: newChunkId, size: 9 }],
        mimeType: "video/x-m4v",
      });

    const row = await t.run((ctx) => ctx.db.get(contentId));
    expect(row?.chunks?.map((c) => c.storageId)).toEqual([newChunkId]);
    expect(row?.fileId).toBeUndefined();
    expect(row?.fileSize).toBe(9);
    // mimeType is normalized server-side (Chromium rejects video/x-m4v).
    expect(row?.mimeType).toBe("video/mp4");
    // Old chunk blobs are exclusively owned by this row — they must be gone.
    for (const oldId of oldChunkIds) {
      const url = await t.run((ctx) => ctx.storage.getUrl(oldId));
      expect(url).toBeNull();
    }
  });

  it("replacing chunked content with a single file clears chunks and deletes their blobs", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedEditor(t);
    const { contentId, oldChunkIds } = await seedChunkedContent(t, ownerId);
    const newFileId = await t.run((ctx) =>
      ctx.storage.store(new Blob(["A-SMALL-REPLACEMENT-FILE"]))
    );

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.content.updateContent, {
        contentId,
        ...BASE_UPDATE_ARGS,
        fileId: newFileId,
        mimeType: "video/mp4",
      });

    const row = await t.run((ctx) => ctx.db.get(contentId));
    expect(row?.fileId).toBe(newFileId);
    expect(row?.chunks).toBeUndefined();
    expect(row?.fileSize).toBe("A-SMALL-REPLACEMENT-FILE".length);
    for (const oldId of oldChunkIds) {
      const url = await t.run((ctx) => ctx.storage.getUrl(oldId));
      expect(url).toBeNull();
    }
  });

  it("rejects passing both a replacement fileId and chunks", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedEditor(t);
    const { contentId } = await seedChunkedContent(t, ownerId);
    const newFileId = await t.run((ctx) => ctx.storage.store(new Blob(["X"])));

    await expect(
      t.withIdentity({ subject: ownerId }).mutation(api.content.updateContent, {
        contentId,
        ...BASE_UPDATE_ARGS,
        fileId: newFileId,
        chunks: [{ storageId: newFileId, size: 1 }],
      })
    ).rejects.toThrow();
  });

  it("updates the poster thumbnail when a new thumbnailId is passed", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedEditor(t);
    const { contentId } = await seedChunkedContent(t, ownerId);
    const thumbId = await t.run((ctx) => ctx.storage.store(new Blob(["JPEG"])));

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.content.updateContent, {
        contentId,
        ...BASE_UPDATE_ARGS,
        thumbnailId: thumbId,
      });

    const row = await t.run((ctx) => ctx.db.get(contentId));
    expect(row?.thumbnailId).toBe(thumbId);
  });
});
