import {
  internalMutation,
  internalQuery,
  MutationCtx,
  QueryCtx,
} from "./_generated/server";
import { v } from "convex/values";
import { Id } from "./_generated/dataModel";

// Storage lifecycle maintenance. Convex never garbage-collects _storage
// objects on its own — every blob lives until ctx.storage.delete. This file
// owns the ONE copy of "which storage ids does the app still reference",
// used both by the delete/replace mutations in content.ts (to free blobs the
// moment their last reference goes away) and by pruneOrphanedFiles (to sweep
// blobs orphaned before that cleanup existed).

export async function collectReferencedStorageIds(
  ctx: QueryCtx
): Promise<Set<Id<"_storage">>> {
  const referenced = new Set<Id<"_storage">>();
  const add = (id: Id<"_storage"> | undefined) => {
    if (id) referenced.add(id);
  };

  for (const row of await ctx.db.query("content").collect()) {
    add(row.fileId);
    add(row.thumbnailId);
    for (const chunk of row.chunks ?? []) referenced.add(chunk.storageId);
  }
  for (const group of await ctx.db.query("contentGroups").collect()) {
    add(group.thumbnailId);
  }
  for (const profile of await ctx.db.query("userProfiles").collect()) {
    add(profile.profilePictureId);
  }
  const settings = await ctx.db.query("siteSettings").first();
  add(settings?.logoId);
  add(settings?.faviconId);

  return referenced;
}

// Best-effort delete of candidate blobs that nothing references anymore.
// Call AFTER the db writes that drop the references — a mutation reads its
// own writes, so the just-deleted/patched rows no longer count. A candidate
// still referenced elsewhere (e.g. a fileId shared by another row) survives.
export async function deleteUnreferencedStorage(
  ctx: MutationCtx,
  candidates: Array<Id<"_storage"> | undefined>
): Promise<void> {
  const ids = candidates.filter((id): id is Id<"_storage"> => id !== undefined);
  if (ids.length === 0) return;

  const referenced = await collectReferencedStorageIds(ctx);
  for (const id of ids) {
    if (referenced.has(id)) continue;
    try {
      await ctx.storage.delete(id);
    } catch (err) {
      // Missing blob or storage hiccup — never block the caller's write.
      console.error("Failed to delete unreferenced storage object:", id, err);
    }
  }
}

// Sweep _storage for blobs no table references. Dry run by default; pass
// { dryRun: false } to actually delete. Paginated — re-run with the returned
// continueCursor until isDone. minAgeHours (default 24) skips fresh uploads
// that a client may not have attached to a content row yet.
//
//   npx convex run maintenance:pruneOrphanedFiles '{}'                # preview
//   npx convex run maintenance:pruneOrphanedFiles '{"dryRun":false}'  # delete
export const pruneOrphanedFiles = internalMutation({
  args: {
    dryRun: v.optional(v.boolean()),
    cursor: v.optional(v.union(v.string(), v.null())),
    limit: v.optional(v.number()),
    minAgeHours: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    const dryRun = args.dryRun ?? true;
    const minAgeMs = (args.minAgeHours ?? 24) * 60 * 60 * 1000;
    const newestAllowed = Date.now() - minAgeMs;
    const numItems = Math.min(Math.max(args.limit ?? 200, 1), 500);

    const referenced = await collectReferencedStorageIds(ctx);
    const page = await ctx.db.system
      .query("_storage")
      .paginate({ cursor: args.cursor ?? null, numItems });

    const orphans = [];
    let skippedRecent = 0;
    for (const file of page.page) {
      if (referenced.has(file._id)) continue;
      if (file._creationTime > newestAllowed) {
        skippedRecent++;
        continue;
      }
      orphans.push({
        id: file._id,
        size: file.size,
        contentType: file.contentType ?? null,
      });
      if (!dryRun) await ctx.storage.delete(file._id);
    }

    return {
      dryRun,
      scanned: page.page.length,
      orphanCount: orphans.length,
      orphanBytes: orphans.reduce((sum, o) => sum + o.size, 0),
      skippedRecent,
      orphans,
      isDone: page.isDone,
      continueCursor: page.isDone ? null : page.continueCursor,
    };
  },
});

// ─── GCS migration (convex/gcs.ts) ──────────────────────────────────

// Every content row whose media bytes still live in Convex storage — the
// worklist for migrating to the GCS bucket.
//
//   npx convex run maintenance:listGcsMigrationCandidates --prod
export const listGcsMigrationCandidates = internalQuery({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db.query("content").collect();
    return rows
      .filter((r) => (r.chunks?.length ?? 0) > 0 || r.fileId)
      .map((r) => ({
        contentId: r._id,
        title: r.title,
        fileSize: r.fileSize ?? null,
        mimeType: r.mimeType ?? null,
        storage: r.chunks?.length ? `chunked(${r.chunks.length})` : "single",
      }));
  },
});

// Point a content row at an object ALREADY uploaded to the GCS bucket (e.g.
// `gcloud storage cp` from a local copy — zero Convex egress), then free the
// Convex blobs it stops referencing. Admin-only via the CLI; unlike
// createContent this deliberately accepts any object path.
//
//   npx convex run maintenance:attachGcsMedia \
//     '{"contentId":"<id>","gcsPath":"content/manual/foo.mp4"}' --prod
export const attachGcsMedia = internalMutation({
  args: {
    contentId: v.id("content"),
    gcsPath: v.string(),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!args.gcsPath || args.gcsPath.startsWith("/")) {
      throw new Error("gcsPath must be a bucket-relative object path");
    }
    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    const oldChunks = content.chunks ?? [];
    await ctx.db.patch(args.contentId, {
      gcsPath: args.gcsPath,
      fileId: undefined,
      chunks: undefined,
      ...(args.fileSize !== undefined ? { fileSize: args.fileSize } : {}),
      ...(args.mimeType !== undefined ? { mimeType: args.mimeType } : {}),
    });

    // Chunk blobs are owned exclusively by this row; the single-file blob
    // goes through the reference scan like everywhere else.
    for (const chunk of oldChunks) {
      try {
        await ctx.storage.delete(chunk.storageId);
      } catch (err) {
        console.error("Failed to delete chunk storage object:", chunk.storageId, err);
      }
    }
    await deleteUnreferencedStorage(ctx, [content.fileId]);

    return {
      title: content.title,
      gcsPath: args.gcsPath,
      freedChunkBlobs: oldChunks.length,
      freedSingleBlob: !!content.fileId,
    };
  },
});

// Point a content row at a PUBLIC direct-media URL (e.g. an object already
// on https://cdn.ohack.dev) and free the Convex blobs it stops referencing.
// The media-info helpers serve direct externalUrls as the playable fileUrl,
// so the native player + watch tracking keep working. ONLY for content whose
// bytes may be public — the CDN has no entitlement gate, so never use this
// for priced/private/password content.
//
//   npx convex run maintenance:attachExternalMedia \
//     '{"contentId":"<id>","url":"https://cdn.ohack.dev/lms/foo.mp4"}' --prod
export const attachExternalMedia = internalMutation({
  args: {
    contentId: v.id("content"),
    url: v.string(),
    fileSize: v.optional(v.number()),
    mimeType: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    if (!/^https:\/\//.test(args.url)) {
      throw new Error("url must be an absolute https URL");
    }
    const content = await ctx.db.get(args.contentId);
    if (!content) throw new Error("Content not found");

    const oldChunks = content.chunks ?? [];
    const oldGcsPath = content.gcsPath;
    await ctx.db.patch(args.contentId, {
      externalUrl: args.url,
      fileId: undefined,
      chunks: undefined,
      gcsPath: undefined,
      ...(args.fileSize !== undefined ? { fileSize: args.fileSize } : {}),
      ...(args.mimeType !== undefined ? { mimeType: args.mimeType } : {}),
    });

    for (const chunk of oldChunks) {
      try {
        await ctx.storage.delete(chunk.storageId);
      } catch (err) {
        console.error("Failed to delete chunk storage object:", chunk.storageId, err);
      }
    }
    await deleteUnreferencedStorage(ctx, [content.fileId]);

    return {
      title: content.title,
      externalUrl: args.url,
      freedChunkBlobs: oldChunks.length,
      freedSingleBlob: !!content.fileId,
      // A GCS object this row pointed at is NOT deleted here (this mutation
      // can't fetch); clean it up out-of-band if one existed.
      orphanedGcsPath: oldGcsPath ?? null,
    };
  },
});
