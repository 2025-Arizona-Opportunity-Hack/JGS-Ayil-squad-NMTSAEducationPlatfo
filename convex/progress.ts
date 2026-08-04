/**
 * Per-user content progress: watch percentage for hosted media (emitted by
 * the viewer's timeupdate/ended handlers) and a manual "mark as watched"
 * path for external-URL content whose iframe cannot emit playback events.
 *
 * Progress is honor-system by design — the server cannot verify that media
 * actually played. It exists to power quiz completion gating and, later,
 * real "Continue Learning" rows.
 */
import { v, ConvexError } from "convex/values";
import { query, mutation, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "./externalAuth";
import { Id } from "./_generated/dataModel";
import { requireAuth } from "./helpers";

const COMPLETION_THRESHOLD = 0.9;

async function upsertProgress(
  ctx: MutationCtx,
  userId: Id<"users">,
  contentId: Id<"content">,
  progress: number,
  source: "playback" | "manual"
) {
  const clamped = Math.min(1, Math.max(0, progress));
  const existing = await ctx.db
    .query("contentProgress")
    .withIndex("by_user_content", (q) =>
      q.eq("userId", userId).eq("contentId", contentId)
    )
    .unique();

  const now = Date.now();
  // Monotonic: seeking backwards never lowers recorded progress, and a
  // completed row never becomes incomplete.
  const maxProgress = Math.max(existing?.maxProgress ?? 0, clamped);
  const completed =
    (existing?.completed ?? false) || maxProgress >= COMPLETION_THRESHOLD;

  if (existing) {
    if (
      maxProgress === existing.maxProgress &&
      completed === existing.completed
    ) {
      return existing.completed;
    }
    await ctx.db.patch(existing._id, {
      maxProgress,
      completed,
      ...(completed && !existing.completed
        ? { completedAt: now, completionSource: source }
        : {}),
      updatedAt: now,
    });
  } else {
    await ctx.db.insert("contentProgress", {
      contentId,
      userId,
      maxProgress,
      completed,
      ...(completed ? { completedAt: now, completionSource: source } : {}),
      updatedAt: now,
    });
  }
  return completed;
}

export const recordProgress = mutation({
  args: {
    contentId: v.id("content"),
    progress: v.number(), // 0..1 fraction of the media watched
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const content = await ctx.db.get(args.contentId);
    if (!content) throw new ConvexError("Content not found");
    if (!Number.isFinite(args.progress)) {
      throw new ConvexError("Progress must be a number between 0 and 1");
    }
    const completed = await upsertProgress(
      ctx,
      userId,
      args.contentId,
      args.progress,
      "playback"
    );
    return { completed };
  },
});

export const markContentCompleted = mutation({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const content = await ctx.db.get(args.contentId);
    if (!content) throw new ConvexError("Content not found");
    await upsertProgress(ctx, userId, args.contentId, 1, "manual");
    return { completed: true };
  },
});

export const getMyProgressForContents = query({
  args: { contentIds: v.array(v.id("content")) },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    const result: Record<
      string,
      { maxProgress: number; completed: boolean }
    > = {};
    if (!userId) return result;

    for (const contentId of args.contentIds.slice(0, 200)) {
      const progress = await ctx.db
        .query("contentProgress")
        .withIndex("by_user_content", (q) =>
          q.eq("userId", userId).eq("contentId", contentId)
        )
        .unique();
      if (progress) {
        result[contentId] = {
          maxProgress: progress.maxProgress,
          completed: progress.completed,
        };
      }
    }
    return result;
  },
});
