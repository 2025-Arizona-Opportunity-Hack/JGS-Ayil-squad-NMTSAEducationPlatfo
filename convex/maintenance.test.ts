/// <reference types="vite/client" />
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";

const modules = import.meta.glob("./**/*.ts");

// Storage lifecycle contract: deleting or replacing content frees the blobs
// it owned (file, thumbnail, chunks) unless another row still references
// them, and pruneOrphanedFiles sweeps blobs nothing references — dry-run by
// default, sparing fresh uploads that may not be attached yet.

async function seedOwner(t: ReturnType<typeof convexTest>) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", {
      email: `owner-${Math.random()}@test.local`,
      name: "Owner",
    });
    await ctx.db.insert("userProfiles", {
      userId,
      role: "owner",
      firstName: "Test",
      lastName: "Owner",
      isActive: true,
    });
    return userId;
  });
}

async function storeBlob(t: ReturnType<typeof convexTest>, bytes: string) {
  return await t.run((ctx) => ctx.storage.store(new Blob([bytes])));
}

async function blobExists(
  t: ReturnType<typeof convexTest>,
  id: Awaited<ReturnType<typeof storeBlob>>
) {
  return (await t.run((ctx) => ctx.storage.getUrl(id))) !== null;
}

function seedVideoRow(
  t: ReturnType<typeof convexTest>,
  ownerId: Awaited<ReturnType<typeof seedOwner>>,
  fields: Record<string, unknown>
) {
  return t.run((ctx) =>
    ctx.db.insert("content", {
      title: "Video",
      attachmentType: "video" as const,
      isPublic: false,
      status: "published",
      active: true,
      createdBy: ownerId,
      mimeType: "video/mp4",
      ...fields,
    })
  );
}

describe("deleteContent storage cleanup", () => {
  it("frees the file, thumbnail, and chunk blobs", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedOwner(t);
    const fileId = await storeBlob(t, "video-bytes");
    const thumbId = await storeBlob(t, "thumb-bytes");
    const chunkId = await storeBlob(t, "chunk-bytes");
    const singleId = await seedVideoRow(t, ownerId, { fileId, thumbnailId: thumbId });
    const chunkedId = await seedVideoRow(t, ownerId, {
      chunks: [{ storageId: chunkId, size: 11 }],
    });

    const asOwner = t.withIdentity({ subject: ownerId });
    await asOwner.mutation(api.content.deleteContent, { contentId: singleId });
    await asOwner.mutation(api.content.deleteContent, { contentId: chunkedId });

    expect(await blobExists(t, fileId)).toBe(false);
    expect(await blobExists(t, thumbId)).toBe(false);
    expect(await blobExists(t, chunkId)).toBe(false);
  });

  it("spares a blob still referenced by another row", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedOwner(t);
    const sharedFileId = await storeBlob(t, "shared-bytes");
    const doomed = await seedVideoRow(t, ownerId, { fileId: sharedFileId });
    await seedVideoRow(t, ownerId, { fileId: sharedFileId });

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.content.deleteContent, { contentId: doomed });

    expect(await blobExists(t, sharedFileId)).toBe(true);
  });
});

describe("bulkDeleteContent storage cleanup", () => {
  it("frees file and chunk blobs across the batch", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedOwner(t);
    const fileId = await storeBlob(t, "bulk-file");
    const chunkId = await storeBlob(t, "bulk-chunk");
    const a = await seedVideoRow(t, ownerId, { fileId });
    const b = await seedVideoRow(t, ownerId, {
      chunks: [{ storageId: chunkId, size: 10 }],
    });

    await t
      .withIdentity({ subject: ownerId })
      .mutation(api.content.bulkDeleteContent, { contentIds: [a, b] });

    expect(await blobExists(t, fileId)).toBe(false);
    expect(await blobExists(t, chunkId)).toBe(false);
  });
});

describe("updateContent replaced-blob cleanup", () => {
  it("frees the old single file and old thumbnail on replacement", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedOwner(t);
    const oldFileId = await storeBlob(t, "old-file");
    const oldThumbId = await storeBlob(t, "old-thumb");
    const newFileId = await storeBlob(t, "new-file");
    const newThumbId = await storeBlob(t, "new-thumb");
    const contentId = await seedVideoRow(t, ownerId, {
      fileId: oldFileId,
      thumbnailId: oldThumbId,
      status: "draft",
    });

    await t.withIdentity({ subject: ownerId }).mutation(api.content.updateContent, {
      contentId,
      title: "Replaced",
      attachmentType: "video" as const,
      isPublic: false,
      active: true,
      fileId: newFileId,
      thumbnailId: newThumbId,
    });

    expect(await blobExists(t, oldFileId)).toBe(false);
    expect(await blobExists(t, oldThumbId)).toBe(false);
    expect(await blobExists(t, newFileId)).toBe(true);
    expect(await blobExists(t, newThumbId)).toBe(true);
  });
});

describe("pruneOrphanedFiles", () => {
  it("dry run reports orphans without deleting; real run deletes them", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedOwner(t);
    const keptId = await storeBlob(t, "still-referenced");
    const orphanId = await storeBlob(t, "orphaned-bytes");
    await seedVideoRow(t, ownerId, { fileId: keptId });

    const dry = await t.mutation(internal.maintenance.pruneOrphanedFiles, {
      minAgeHours: 0,
    });
    expect(dry.dryRun).toBe(true);
    expect(dry.orphans.map((o) => o.id)).toEqual([orphanId]);
    expect(await blobExists(t, orphanId)).toBe(true);

    const real = await t.mutation(internal.maintenance.pruneOrphanedFiles, {
      dryRun: false,
      minAgeHours: 0,
    });
    expect(real.orphanCount).toBe(1);
    expect(real.isDone).toBe(true);
    expect(await blobExists(t, orphanId)).toBe(false);
    expect(await blobExists(t, keptId)).toBe(true);
  });

  it("skips blobs newer than minAgeHours", async () => {
    const t = convexTest(schema, modules);
    const freshOrphan = await storeBlob(t, "fresh-orphan");

    const result = await t.mutation(internal.maintenance.pruneOrphanedFiles, {
      dryRun: false,
    });
    expect(result.orphanCount).toBe(0);
    expect(result.skippedRecent).toBe(1);
    expect(await blobExists(t, freshOrphan)).toBe(true);
  });
});

describe("attachExternalMedia (public CDN)", () => {
  it("repoints a chunked row at the CDN URL and frees the chunk blobs", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedOwner(t);
    const chunkA = await storeBlob(t, "chunk-a");
    const chunkB = await storeBlob(t, "chunk-b");
    const contentId = await seedVideoRow(t, ownerId, {
      isPublic: true,
      chunks: [
        { storageId: chunkA, size: 7 },
        { storageId: chunkB, size: 7 },
      ],
      fileSize: 14,
    });

    const cdnUrl = "https://cdn.ohack.dev/lms/Using%20the%20Judging%20Tool%20v2.mp4";
    const result = await t.mutation(internal.maintenance.attachExternalMedia, {
      contentId,
      url: cdnUrl,
    });
    expect(result.freedChunkBlobs).toBe(2);

    const row = await t.run((ctx) => ctx.db.get(contentId));
    expect(row?.externalUrl).toBe(cdnUrl);
    expect(row?.chunks).toBeUndefined();
    expect(await blobExists(t, chunkA)).toBe(false);
    expect(await blobExists(t, chunkB)).toBe(false);

    // The CDN URL is the playable fileUrl for both authed and anonymous
    // viewers — native player + watch tracking, zero Convex egress.
    const owned = await t
      .withIdentity({ subject: ownerId })
      .query(api.content.getContent, { contentId });
    expect(owned?.fileUrl).toBe(cdnUrl);
    expect(owned?.requiresSignedUrl).toBe(false);

    const pub = await t.query(api.publicContent.getPublicContent, { contentId });
    expect(pub.content?.fileUrl).toBe(cdnUrl);
    expect(pub.content?.requiresSignedUrl).toBe(false);
  });

  it("rejects non-https URLs", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedOwner(t);
    const contentId = await seedVideoRow(t, ownerId, { isPublic: true });
    await expect(
      t.mutation(internal.maintenance.attachExternalMedia, {
        contentId,
        url: "http://cdn.ohack.dev/lms/foo.mp4",
      })
    ).rejects.toThrow(/https/i);
  });

  it("embed-page externalUrls (YouTube) still get no fileUrl", async () => {
    const t = convexTest(schema, modules);
    const ownerId = await seedOwner(t);
    const contentId = await seedVideoRow(t, ownerId, {
      isPublic: true,
      externalUrl: "https://www.youtube.com/watch?v=abc123",
    });
    const pub = await t.query(api.publicContent.getPublicContent, { contentId });
    expect(pub.content?.fileUrl).toBeNull();
    expect(pub.content?.requiresSignedUrl).toBe(false);
  });
});
