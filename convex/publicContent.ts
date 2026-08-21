import { v } from "convex/values";
import { query } from "./_generated/server";
import { getAuthUserId } from "./externalAuth";
import { getUserProfile, getAnonymousContentMediaInfo, formatUserName, checkContentAccess, deriveContentType } from "./helpers";
import { getEffectivePermissions, hasPermission, PERMISSIONS } from "./permissions";

// Public, published, active content ids for the sitemap (served by
// api/sitemap.ts on Vercel). Ids and timestamps only — never titles or
// URLs, so nothing here can leak beyond what /view/ already serves.
export const listPublicContentForSitemap = query({
  args: {},
  handler: async (ctx) => {
    const rows = await ctx.db
      .query("content")
      .withIndex("by_public", (q) => q.eq("isPublic", true))
      .filter((q) =>
        q.and(
          q.eq(q.field("status"), "published"),
          q.eq(q.field("active"), true)
        )
      )
      .take(1000);
    return rows.map((row) => ({
      _id: row._id,
      updatedAt: row.publishedAt ?? row._creationTime,
    }));
  },
});

// Get public content by ID (no auth required for public content)
export const getPublicContent = query({
  args: {
    contentId: v.id("content"),
    password: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const content = await ctx.db.get(args.contentId);
    
    if (!content) {
      return {
        error: "Content not found",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }

    // Check if content is published and active
    if (content.status !== "published") {
      return {
        error: "This content is not published yet",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }

    if (!content.active) {
      return {
        error: "This content is not currently active",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }

    // Check availability dates
    const now = Date.now();
    if (content.startDate && content.startDate > now) {
      return {
        error: "This content is not yet available",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }
    if (content.endDate && content.endDate < now) {
      return {
        error: "This content is no longer available",
        requiresPassword: false,
        requiresAuth: false,
        content: null,
      };
    }

    // Try to get authenticated user
    const userId = await getAuthUserId(ctx);

    // Entitlement independent of the public flag: creator, VIEW_ALL_CONTENT,
    // or an explicit contentAccess grant (which is what a completed purchase
    // writes via completeOrderInternal).
    let entitled = false;
    if (userId) {
      const userProfile = await getUserProfile(ctx, userId);
      if (userProfile) {
        const perms = getEffectivePermissions(userProfile);
        entitled =
          content.createdBy === userId ||
          hasPermission(perms, PERMISSIONS.VIEW_ALL_CONTENT) ||
          (await checkContentAccess(ctx, args.contentId, userId, userProfile.role));
      }
    }

    // Paywall gate: content with active pricing is served only to entitled
    // viewers, regardless of isPublic or password. On priced content,
    // `isPublic` means "the preview page is public", never "the media is
    // free". The password path is also bypassed so knowing a password set
    // before pricing was added cannot skip the purchase.
    const activePricing = await ctx.db
      .query("contentPricing")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();

    if (activePricing && !entitled) {
      // Private priced content stays invisible to anonymous visitors — no
      // preview metadata until they log in.
      if (!content.isPublic && !userId) {
        return { requiresPassword: false, requiresAuth: true, content: null };
      }
      const thumbnailUrl = content.thumbnailId
        ? await ctx.storage.getUrl(content.thumbnailId)
        : null;
      return {
        requiresPassword: false,
        requiresAuth: !userId,
        requiresPurchase: true,
        content: null,
        // Storefront metadata only — never fileUrl/externalUrl/body.
        preview: {
          title: content.title,
          description: content.description ?? null,
          type: deriveContentType(content.attachmentType, content.type),
          thumbnailUrl,
          authorName: content.authorName ?? null,
          publishedAt: content.publishedAt ?? null,
        },
        pricing: {
          pricingId: activePricing._id,
          price: activePricing.price,
          currency: activePricing.currency,
          accessDuration: activePricing.accessDuration ?? null,
        },
      };
    }

    let hasAccess = entitled || !!content.isPublic;

    // If still no access, check password
    if (!hasAccess) {
      if (content.password) {
        if (!args.password) {
          return { requiresPassword: true, requiresAuth: !userId, content: null };
        }
        if (args.password !== content.password) {
          return { error: "Incorrect password", requiresPassword: true, requiresAuth: false, content: null };
        }
        hasAccess = true;
      } else {
        return { requiresPassword: false, requiresAuth: true, content: null };
      }
    }

    if (!hasAccess) {
      return { error: "You don't have permission to view this content", requiresPassword: false, requiresAuth: true, content: null };
    }

    const [mediaInfo, thumbnailUrl] = await Promise.all([
      getAnonymousContentMediaInfo(ctx, content, !!activePricing),
      content.thumbnailId ? ctx.storage.getUrl(content.thumbnailId) : null,
    ]);
    const creatorName = formatUserName(await getUserProfile(ctx, content.createdBy));

    // Quiz presence is safe to surface to anyone allowed to see the content
    // itself (it drives the signed-out "sign in to take the quiz" nudge).
    // Summary fields only — questions stay behind quizzes.getQuizForContent.
    const activeQuiz = await ctx.db
      .query("quizzes")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    let quiz: { title: string; questionCount: number; passingScore: number } | null = null;
    if (activeQuiz) {
      const questions = await ctx.db
        .query("quizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", activeQuiz._id))
        .collect();
      quiz = {
        title: activeQuiz.title,
        questionCount: questions.filter((q) => q.isActive !== false).length,
        passingScore: activeQuiz.passingScore,
      };
    }

    return {
      requiresPassword: false,
      requiresAuth: false,
      content: {
        ...content,
        // Viewers switch on `type`, which is derived rather than stored.
        // Without this the player never renders. See deriveContentType.
        type: deriveContentType(content.attachmentType, content.type),
        fileUrl: mediaInfo.fileUrl,
        // Chunked media that isn't signature-exempt has no direct URL; the
        // viewer mints one via content.getSignedMediaUrl (passing the same
        // password it used here, so the gates re-apply).
        requiresSignedUrl: mediaInfo.requiresSignedUrl,
        thumbnailUrl,
        creatorName,
        password: undefined,
        quiz,
      },
    };
  },
});

