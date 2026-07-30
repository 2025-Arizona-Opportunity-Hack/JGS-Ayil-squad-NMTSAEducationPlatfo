import { action } from "./_generated/server";
import { v } from "convex/values";
import { api } from "./_generated/api";

// Dead code today (nothing in src/ calls it). Previously this was a *public*
// action that would fetch() any caller-supplied `videoUrl` with no auth and
// no host allowlist — a blind SSRF / bandwidth-burn primitive (an attacker
// could point it at internal/cloud-metadata addresses). Server-side video
// processing was never actually implemented here (the fetched blob was
// immediately discarded and this always returned null) — client-side
// generation in VideoThumbnail.tsx is the real implementation.
//
// The ideal fix is `internalAction` (not client-reachable at all), but that
// would remove this export from `api.generateThumbnail` entirely, which
// `security.test.ts` references directly (un-cast) — since that test file is
// contract and off-limits to edit, this stays a public `action`. What
// actually closes the SSRF hole is removing the outbound fetch itself: the
// handler below performs no network I/O regardless of who calls it, so
// there's nothing left to exploit.
export const generateThumbnailFromVideo = action({
  args: {
    contentId: v.id("content"),
    videoUrl: v.string(),
  },
  handler: async () => {
    return null;
  },
});

// Helper action to update content with a generated thumbnail. Same
// public-vs-internal constraint as above (kept `action` so
// `api.generateThumbnail.updateContentThumbnail` keeps type-checking against
// security.test.ts). The IDOR this used to enable is closed at the source:
// `updateContentThumbnailId` (content.ts) now requires the caller be the
// content's creator or hold EDIT_CONTENT, so this wrapper can no longer be
// used to repoint another user's thumbnail — it just forwards to a mutation
// that will throw for an unauthorized caller.
export const updateContentThumbnail = action({
  args: {
    contentId: v.id("content"),
    thumbnailId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    await ctx.runMutation(api.content.updateContentThumbnailId, {
      contentId: args.contentId,
      thumbnailId: args.thumbnailId,
    });
  },
});

