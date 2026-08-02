/**
 * Learner-facing bundle queries. The admin queries in contentGroups.ts are
 * gated on MANAGE_CONTENT_GROUPS and return [] for portal users — these
 * queries are the client portal's view, entitled per-user.
 *
 * Bundle entitlement: creator, VIEW_ALL_CONTENT, a public bundle, or a
 * contentGroupAccess grant (user / role / user-group) via checkGroupAccess.
 * Note this governs seeing the bundle page and taking its quiz; each item
 * is still individually gated by getPublicContent when opened.
 */
import { v } from "convex/values";
import { query, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  checkGroupAccess,
  getUserProfile,
  getStorageUrls,
  deriveContentType,
} from "./helpers";
import {
  getEffectivePermissions,
  hasPermission,
  PERMISSIONS,
} from "./permissions";
import { sortGroupItems } from "./contentGroups";

async function isEntitledToBundle(
  ctx: QueryCtx,
  group: Doc<"contentGroups">,
  userId: Id<"users">,
  profile: { role: string; permissions?: string[] }
): Promise<boolean> {
  if (!group.isActive) return false;
  if (group.createdBy === userId) return true;
  if (group.isPublic) return true;
  const perms = getEffectivePermissions(profile);
  if (hasPermission(perms, PERMISSIONS.VIEW_ALL_CONTENT)) return true;
  return checkGroupAccess(ctx, group._id, userId, profile.role);
}

export const listMyBundles = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const profile = await getUserProfile(ctx, userId);
    if (!profile) return [];

    const groups = await ctx.db.query("contentGroups").collect();
    const entitled = [];
    for (const group of groups) {
      if (await isEntitledToBundle(ctx, group, userId, profile)) {
        entitled.push(group);
      }
    }

    return Promise.all(
      entitled.map(async (group) => {
        const { thumbnailUrl } = await getStorageUrls(ctx, {
          thumbnailId: group.thumbnailId,
        });
        const items = await ctx.db
          .query("contentGroupItems")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .collect();
        const quiz = await ctx.db
          .query("quizzes")
          .withIndex("by_group", (q) => q.eq("groupId", group._id))
          .filter((q) => q.eq(q.field("isActive"), true))
          .first();

        let completedCount = 0;
        for (const item of items) {
          const progress = await ctx.db
            .query("contentProgress")
            .withIndex("by_user_content", (q) =>
              q.eq("userId", userId).eq("contentId", item.contentId)
            )
            .unique();
          if (progress?.completed) completedCount++;
        }

        return {
          _id: group._id,
          name: group.name,
          description: group.description ?? null,
          thumbnailUrl,
          itemCount: items.length,
          completedCount,
          hasQuiz: !!quiz,
        };
      })
    );
  },
});

export const getBundleForLearner = query({
  args: { groupId: v.id("contentGroups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await getUserProfile(ctx, userId);
    if (!profile) return null;

    const group = await ctx.db.get(args.groupId);
    if (!group) return null;
    if (!(await isEntitledToBundle(ctx, group, userId, profile))) return null;

    const groupItems = sortGroupItems(
      await ctx.db
        .query("contentGroupItems")
        .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
        .collect()
    );

    const items = [];
    for (const item of groupItems) {
      const content = await ctx.db.get(item.contentId);
      // Learners only see items that are actually viewable
      if (!content || content.status !== "published" || !content.active) {
        continue;
      }
      const { thumbnailUrl } = await getStorageUrls(ctx, {
        thumbnailId: content.thumbnailId,
      });
      const progress = await ctx.db
        .query("contentProgress")
        .withIndex("by_user_content", (q) =>
          q.eq("userId", userId).eq("contentId", item.contentId)
        )
        .unique();
      items.push({
        groupItemId: item._id,
        contentId: content._id,
        order: item.order ?? null,
        title: content.title,
        description: content.description ?? null,
        type: deriveContentType(content.attachmentType, content.type),
        thumbnailUrl,
        duration: content.duration ?? null,
        maxProgress: progress?.maxProgress ?? 0,
        completed: progress?.completed ?? false,
      });
    }

    const { thumbnailUrl } = await getStorageUrls(ctx, {
      thumbnailId: group.thumbnailId,
    });

    return {
      _id: group._id,
      name: group.name,
      description: group.description ?? null,
      thumbnailUrl,
      items,
      completedCount: items.filter((i) => i.completed).length,
    };
  },
});
