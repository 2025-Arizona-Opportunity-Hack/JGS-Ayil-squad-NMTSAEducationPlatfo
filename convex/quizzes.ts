/**
 * Quizzes: staff author questions against a content item or a bundle;
 * learners take the quiz, attempts are graded server-side, and results
 * (score, pass/fail, attempts-to-pass, learner feedback) are recorded.
 *
 * Security invariants (see CLAUDE.md and security.test.ts):
 * - `correctOptionIds` / `explanation` never reach learner-facing queries.
 *   Learner payloads go through `sanitizeQuestion`, an explicit whitelist.
 * - Grading happens only in `submitQuizAttempt`; the client submits option
 *   ids and gets back a graded result shaped by the quiz's revealAnswers.
 * - Entitlement to the quiz's target (content or bundle) is re-checked on
 *   every fetch and submit, composed from helpers.ts only.
 */
import { v, ConvexError } from "convex/values";
import { query, mutation, QueryCtx } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";
import { Doc, Id } from "./_generated/dataModel";
import {
  requireAuth,
  requirePermission,
  checkContentAccess,
  checkGroupAccess,
  getUserProfile,
  formatUserName,
} from "./helpers";
import {
  getEffectivePermissions,
  hasPermission,
  PERMISSIONS,
} from "./permissions";

const MAX_QUESTIONS_PER_QUIZ = 100;
const MAX_OPTIONS_PER_QUESTION = 10;

// ─── Shared validation & helpers ────────────────────────────────────

function validatePassingScore(score: number): void {
  if (!Number.isFinite(score) || score <= 0 || score > 100) {
    throw new ConvexError("Passing score must be between 1 and 100");
  }
}

function validateQuestionShape(args: {
  kind: "single" | "multi" | "trueFalse";
  options: Array<{ id: string; text: string }>;
  correctOptionIds: string[];
  points?: number;
}): void {
  const { kind, options, correctOptionIds } = args;
  if (options.length < 2 || options.length > MAX_OPTIONS_PER_QUESTION) {
    throw new ConvexError(
      `Questions need between 2 and ${MAX_OPTIONS_PER_QUESTION} options`
    );
  }
  if (kind === "trueFalse" && options.length !== 2) {
    throw new ConvexError("True/false questions must have exactly 2 options");
  }
  const optionIds = new Set(options.map((o) => o.id));
  if (optionIds.size !== options.length) {
    throw new ConvexError("Option ids must be unique");
  }
  if (options.some((o) => !o.id.trim() || !o.text.trim())) {
    throw new ConvexError("Options need a non-empty id and text");
  }
  if (correctOptionIds.length === 0) {
    throw new ConvexError("At least one correct option is required");
  }
  if (!correctOptionIds.every((id) => optionIds.has(id))) {
    throw new ConvexError("Correct option ids must reference existing options");
  }
  if (new Set(correctOptionIds).size !== correctOptionIds.length) {
    throw new ConvexError("Correct option ids must be unique");
  }
  if (kind !== "multi" && correctOptionIds.length !== 1) {
    throw new ConvexError(
      "Single-answer and true/false questions must have exactly one correct option"
    );
  }
  if (
    args.points !== undefined &&
    (!Number.isFinite(args.points) || args.points <= 0)
  ) {
    throw new ConvexError("Points must be a positive number");
  }
}

/**
 * Whitelist mapping for learner-facing question payloads. Never spread the
 * question document here — new stored fields must be opted in explicitly so
 * answers can't leak by accident.
 */
function sanitizeQuestion(question: Doc<"quizQuestions">) {
  return {
    _id: question._id,
    order: question.order,
    prompt: question.prompt,
    kind: question.kind,
    points: question.points ?? 1,
    options: question.options.map((o) => ({ id: o.id, text: o.text })),
  };
}

/** Deterministic shuffle so query results stay stable for a given attempt. */
function seededShuffle<T>(items: T[], seedStr: string): T[] {
  let seed = 0;
  for (let i = 0; i < seedStr.length; i++) {
    seed = (seed * 31 + seedStr.charCodeAt(i)) | 0;
  }
  const arr = [...items];
  const rand = () => {
    seed = (seed * 1664525 + 1013904223) | 0;
    return (seed >>> 0) / 4294967296;
  };
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

async function getActiveQuestions(ctx: QueryCtx, quizId: Id<"quizzes">) {
  const questions = await ctx.db
    .query("quizQuestions")
    .withIndex("by_quiz_order", (q) => q.eq("quizId", quizId))
    .collect();
  return questions
    .filter((q) => q.isActive !== false)
    .sort((a, b) => a.order - b.order);
}

async function getActivePricing(ctx: QueryCtx, contentId: Id<"content">) {
  return ctx.db
    .query("contentPricing")
    .withIndex("by_content", (q) => q.eq("contentId", contentId))
    .filter((q) => q.eq(q.field("isActive"), true))
    .first();
}

/**
 * Whether a learner may see/take a quiz attached to a content item.
 * Mirrors the getPublicContent entitlement + paywall composition: public
 * content is quiz-eligible only when it has no active pricing.
 */
async function isEntitledToContentQuiz(
  ctx: QueryCtx,
  content: Doc<"content">,
  userId: Id<"users">,
  profile: { role: string; permissions?: string[] }
): Promise<boolean> {
  if (content.status !== "published" || !content.active) return false;
  const now = Date.now();
  if (content.startDate && content.startDate > now) return false;
  if (content.endDate && content.endDate < now) return false;

  const perms = getEffectivePermissions(profile);
  if (content.createdBy === userId) return true;
  if (hasPermission(perms, PERMISSIONS.VIEW_ALL_CONTENT)) return true;
  if (await checkContentAccess(ctx, content._id, userId, profile.role)) {
    return true;
  }
  if (content.isPublic) {
    const pricing = await getActivePricing(ctx, content._id);
    if (!pricing) return true;
  }
  return false;
}

/** Whether a learner may see/take a quiz attached to a bundle. */
async function isEntitledToBundleQuiz(
  ctx: QueryCtx,
  group: Doc<"contentGroups">,
  userId: Id<"users">,
  profile: { role: string; permissions?: string[] }
): Promise<boolean> {
  if (!group.isActive) return false;
  const perms = getEffectivePermissions(profile);
  if (group.createdBy === userId) return true;
  if (hasPermission(perms, PERMISSIONS.VIEW_ALL_CONTENT)) return true;
  if (group.isPublic) return true;
  return checkGroupAccess(ctx, group._id, userId, profile.role);
}

async function isEntitledToQuiz(
  ctx: QueryCtx,
  quiz: Doc<"quizzes">,
  userId: Id<"users">,
  profile: { role: string; permissions?: string[] }
): Promise<boolean> {
  if (quiz.contentId) {
    const content = await ctx.db.get(quiz.contentId);
    if (!content) return false;
    return isEntitledToContentQuiz(ctx, content, userId, profile);
  }
  if (quiz.groupId) {
    const group = await ctx.db.get(quiz.groupId);
    if (!group) return false;
    return isEntitledToBundleQuiz(ctx, group, userId, profile);
  }
  return false;
}

async function hasCompletedContent(
  ctx: QueryCtx,
  userId: Id<"users">,
  contentId: Id<"content">
): Promise<boolean> {
  const progress = await ctx.db
    .query("contentProgress")
    .withIndex("by_user_content", (q) =>
      q.eq("userId", userId).eq("contentId", contentId)
    )
    .unique();
  return !!progress?.completed;
}

/**
 * Completion gating for a quiz: the single content item, or every item in
 * the bundle. Returns null when satisfied, else a lock reason.
 */
async function getCompletionLock(
  ctx: QueryCtx,
  quiz: Doc<"quizzes">,
  userId: Id<"users">
): Promise<string | null> {
  if (!quiz.requireContentCompletion) return null;
  if (quiz.contentId) {
    const done = await hasCompletedContent(ctx, userId, quiz.contentId);
    return done ? null : "content_not_completed";
  }
  if (quiz.groupId) {
    const items = await ctx.db
      .query("contentGroupItems")
      .withIndex("by_group", (q) => q.eq("groupId", quiz.groupId!))
      .collect();
    for (const item of items) {
      const done = await hasCompletedContent(ctx, userId, item.contentId);
      if (!done) return "content_not_completed";
    }
  }
  return null;
}

async function getOwnAttempts(
  ctx: QueryCtx,
  quizId: Id<"quizzes">,
  userId: Id<"users">
) {
  const attempts = await ctx.db
    .query("quizAttempts")
    .withIndex("by_quiz_user", (q) =>
      q.eq("quizId", quizId).eq("userId", userId)
    )
    .collect();
  return attempts.sort((a, b) => a.attemptNumber - b.attemptNumber);
}

// ─── Admin: quiz CRUD ───────────────────────────────────────────────

export const createQuiz = mutation({
  args: {
    title: v.string(),
    description: v.optional(v.string()),
    contentId: v.optional(v.id("content")),
    groupId: v.optional(v.id("contentGroups")),
    passingScore: v.number(),
    maxAttempts: v.optional(v.number()),
    shuffleQuestions: v.optional(v.boolean()),
    revealAnswers: v.optional(
      v.union(v.literal("none"), v.literal("correctness"), v.literal("full"))
    ),
    requireContentCompletion: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { userId } = await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);

    if (!args.title.trim()) throw new ConvexError("Title is required");
    validatePassingScore(args.passingScore);
    if (
      args.maxAttempts !== undefined &&
      (!Number.isInteger(args.maxAttempts) || args.maxAttempts < 1)
    ) {
      throw new ConvexError("Max attempts must be a positive integer");
    }

    const hasContent = args.contentId !== undefined;
    const hasGroup = args.groupId !== undefined;
    if (hasContent === hasGroup) {
      throw new ConvexError(
        "A quiz must attach to exactly one content item or one bundle"
      );
    }

    if (args.contentId) {
      const content = await ctx.db.get(args.contentId);
      if (!content) throw new ConvexError("Content not found");
      const existing = await ctx.db
        .query("quizzes")
        .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (existing) {
        throw new ConvexError("This content already has an active quiz");
      }
    }
    if (args.groupId) {
      const group = await ctx.db.get(args.groupId);
      if (!group) throw new ConvexError("Bundle not found");
      const existing = await ctx.db
        .query("quizzes")
        .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
        .filter((q) => q.eq(q.field("isActive"), true))
        .first();
      if (existing) {
        throw new ConvexError("This bundle already has an active quiz");
      }
    }

    return await ctx.db.insert("quizzes", {
      title: args.title.trim(),
      description: args.description,
      contentId: args.contentId,
      groupId: args.groupId,
      passingScore: args.passingScore,
      maxAttempts: args.maxAttempts,
      shuffleQuestions: args.shuffleQuestions,
      revealAnswers: args.revealAnswers,
      requireContentCompletion: args.requireContentCompletion,
      isActive: true,
      createdBy: userId,
      updatedAt: Date.now(),
    });
  },
});

export const updateQuiz = mutation({
  args: {
    quizId: v.id("quizzes"),
    title: v.optional(v.string()),
    description: v.optional(v.string()),
    passingScore: v.optional(v.number()),
    maxAttempts: v.optional(v.union(v.number(), v.null())),
    shuffleQuestions: v.optional(v.boolean()),
    revealAnswers: v.optional(
      v.union(v.literal("none"), v.literal("correctness"), v.literal("full"))
    ),
    requireContentCompletion: v.optional(v.boolean()),
    isActive: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) throw new ConvexError("Quiz not found");

    const updates: Partial<Doc<"quizzes">> = { updatedAt: Date.now() };
    if (args.title !== undefined) {
      if (!args.title.trim()) throw new ConvexError("Title is required");
      updates.title = args.title.trim();
    }
    if (args.description !== undefined) updates.description = args.description;
    if (args.passingScore !== undefined) {
      validatePassingScore(args.passingScore);
      updates.passingScore = args.passingScore;
    }
    if (args.maxAttempts !== undefined) {
      if (args.maxAttempts === null) {
        updates.maxAttempts = undefined;
      } else {
        if (!Number.isInteger(args.maxAttempts) || args.maxAttempts < 1) {
          throw new ConvexError("Max attempts must be a positive integer");
        }
        updates.maxAttempts = args.maxAttempts;
      }
    }
    if (args.shuffleQuestions !== undefined) {
      updates.shuffleQuestions = args.shuffleQuestions;
    }
    if (args.revealAnswers !== undefined) {
      updates.revealAnswers = args.revealAnswers;
    }
    if (args.requireContentCompletion !== undefined) {
      updates.requireContentCompletion = args.requireContentCompletion;
    }
    if (args.isActive !== undefined) {
      // Re-activating must not create a second active quiz on the target
      if (args.isActive && !quiz.isActive) {
        const conflict = quiz.contentId
          ? await ctx.db
              .query("quizzes")
              .withIndex("by_content", (q) => q.eq("contentId", quiz.contentId))
              .filter((q) => q.eq(q.field("isActive"), true))
              .first()
          : await ctx.db
              .query("quizzes")
              .withIndex("by_group", (q) => q.eq("groupId", quiz.groupId))
              .filter((q) => q.eq(q.field("isActive"), true))
              .first();
        if (conflict && conflict._id !== quiz._id) {
          throw new ConvexError("The target already has another active quiz");
        }
      }
      updates.isActive = args.isActive;
    }

    await ctx.db.patch(args.quizId, updates);
    return null;
  },
});

export const deleteQuiz = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) throw new ConvexError("Quiz not found");

    const anyAttempt = await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .first();
    if (anyAttempt) {
      throw new ConvexError(
        "This quiz has recorded attempts. Deactivate it instead of deleting so results stay available."
      );
    }

    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();
    for (const question of questions) {
      await ctx.db.delete(question._id);
    }
    await ctx.db.delete(args.quizId);
    return null;
  },
});

// ─── Admin: question CRUD ───────────────────────────────────────────

export const addQuestion = mutation({
  args: {
    quizId: v.id("quizzes"),
    prompt: v.string(),
    kind: v.union(
      v.literal("single"),
      v.literal("multi"),
      v.literal("trueFalse")
    ),
    options: v.array(v.object({ id: v.string(), text: v.string() })),
    correctOptionIds: v.array(v.string()),
    explanation: v.optional(v.string()),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) throw new ConvexError("Quiz not found");
    if (!args.prompt.trim()) throw new ConvexError("Prompt is required");
    validateQuestionShape(args);

    const existing = await ctx.db
      .query("quizQuestions")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();
    if (existing.length >= MAX_QUESTIONS_PER_QUIZ) {
      throw new ConvexError(
        `Quizzes are limited to ${MAX_QUESTIONS_PER_QUIZ} questions`
      );
    }
    const maxOrder = existing.reduce((max, q) => Math.max(max, q.order), 0);

    return await ctx.db.insert("quizQuestions", {
      quizId: args.quizId,
      order: maxOrder + 1,
      prompt: args.prompt.trim(),
      kind: args.kind,
      options: args.options,
      correctOptionIds: args.correctOptionIds,
      explanation: args.explanation,
      points: args.points,
      isActive: true,
    });
  },
});

export const updateQuestion = mutation({
  args: {
    questionId: v.id("quizQuestions"),
    prompt: v.optional(v.string()),
    kind: v.optional(
      v.union(v.literal("single"), v.literal("multi"), v.literal("trueFalse"))
    ),
    options: v.optional(
      v.array(v.object({ id: v.string(), text: v.string() }))
    ),
    correctOptionIds: v.optional(v.array(v.string())),
    explanation: v.optional(v.string()),
    points: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new ConvexError("Question not found");

    const next = {
      kind: args.kind ?? question.kind,
      options: args.options ?? question.options,
      correctOptionIds: args.correctOptionIds ?? question.correctOptionIds,
      points: args.points ?? question.points,
    };
    validateQuestionShape(next);
    if (args.prompt !== undefined && !args.prompt.trim()) {
      throw new ConvexError("Prompt is required");
    }

    await ctx.db.patch(args.questionId, {
      ...(args.prompt !== undefined ? { prompt: args.prompt.trim() } : {}),
      kind: next.kind,
      options: next.options,
      correctOptionIds: next.correctOptionIds,
      ...(args.explanation !== undefined
        ? { explanation: args.explanation }
        : {}),
      ...(args.points !== undefined ? { points: args.points } : {}),
    });
    return null;
  },
});

export const deleteQuestion = mutation({
  args: { questionId: v.id("quizQuestions") },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    const question = await ctx.db.get(args.questionId);
    if (!question) throw new ConvexError("Question not found");

    // If any attempt exists on this quiz, soft-delete so those attempts'
    // per-question records stay interpretable.
    const anyAttempt = await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz", (q) => q.eq("quizId", question.quizId))
      .first();
    if (anyAttempt) {
      await ctx.db.patch(args.questionId, { isActive: false });
    } else {
      await ctx.db.delete(args.questionId);
    }
    return null;
  },
});

export const reorderQuestions = mutation({
  args: {
    quizId: v.id("quizzes"),
    orderedQuestionIds: v.array(v.id("quizQuestions")),
  },
  handler: async (ctx, args) => {
    await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    // Only active questions participate in ordering — the editing UI never
    // sees soft-deleted ones, so requiring them here would break reorder
    // after any delete-with-attempts.
    const questions = (
      await ctx.db
        .query("quizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
        .collect()
    ).filter((q) => q.isActive !== false);
    const byId = new Map(questions.map((q) => [q._id, q]));
    if (
      args.orderedQuestionIds.length !== questions.length ||
      !args.orderedQuestionIds.every((id) => byId.has(id))
    ) {
      throw new ConvexError(
        "orderedQuestionIds must contain every active question of this quiz exactly once"
      );
    }
    for (let i = 0; i < args.orderedQuestionIds.length; i++) {
      await ctx.db.patch(args.orderedQuestionIds[i], { order: i + 1 });
    }
    return null;
  },
});

// ─── Admin: listing, editing, results ───────────────────────────────

export const listQuizzes = query({
  args: {},
  handler: async (ctx) => {
    // Render-path query: degrade to [] rather than blanking the app
    try {
      await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    } catch {
      return [];
    }

    const quizzes = await ctx.db.query("quizzes").collect();
    return Promise.all(
      quizzes.map(async (quiz) => {
        let targetTitle = "(missing target)";
        if (quiz.contentId) {
          const content = await ctx.db.get(quiz.contentId);
          if (content) targetTitle = content.title;
        } else if (quiz.groupId) {
          const group = await ctx.db.get(quiz.groupId);
          if (group) targetTitle = group.name;
        }

        const questions = await ctx.db
          .query("quizQuestions")
          .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
          .collect();
        const attempts = await ctx.db
          .query("quizAttempts")
          .withIndex("by_quiz", (q) => q.eq("quizId", quiz._id))
          .collect();
        const userIds = new Set(attempts.map((a) => a.userId));
        const passedUserIds = new Set(
          attempts.filter((a) => a.passed).map((a) => a.userId)
        );

        return {
          ...quiz,
          targetType: quiz.contentId ? ("content" as const) : ("bundle" as const),
          targetTitle,
          questionCount: questions.filter((q) => q.isActive !== false).length,
          attemptCount: attempts.length,
          participantCount: userIds.size,
          passedCount: passedUserIds.size,
        };
      })
    );
  },
});

export const getQuizForEditing = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    // The ONLY query allowed to return correctOptionIds/explanation.
    try {
      await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    } catch {
      return null;
    }
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return null;
    const questions = await ctx.db
      .query("quizQuestions")
      .withIndex("by_quiz_order", (q) => q.eq("quizId", args.quizId))
      .collect();
    return {
      ...quiz,
      questions: questions
        .filter((q) => q.isActive !== false)
        .sort((a, b) => a.order - b.order),
    };
  },
});

export const getQuizResults = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    } catch {
      return null;
    }
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return null;

    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz", (q) => q.eq("quizId", args.quizId))
      .collect();

    const byUser = new Map<Id<"users">, typeof attempts>();
    for (const attempt of attempts) {
      const list = byUser.get(attempt.userId) ?? [];
      list.push(attempt);
      byUser.set(attempt.userId, list);
    }

    const rows = await Promise.all(
      Array.from(byUser.entries()).map(async ([userId, userAttempts]) => {
        const sorted = [...userAttempts].sort(
          (a, b) => a.attemptNumber - b.attemptNumber
        );
        const firstPass = sorted.find((a) => a.passed);
        const latestFeedback = [...sorted]
          .reverse()
          .find((a) => a.learnerFeedback);
        return {
          userId,
          userName: formatUserName(await getUserProfile(ctx, userId)),
          attemptCount: sorted.length,
          bestScore: Math.max(...sorted.map((a) => a.score)),
          passed: !!firstPass,
          attemptsToPass: firstPass?.attemptNumber ?? null,
          lastAttemptAt: sorted[sorted.length - 1].submittedAt,
          learnerFeedback: latestFeedback?.learnerFeedback ?? null,
          learnerFeedbackAt: latestFeedback?.learnerFeedbackAt ?? null,
        };
      })
    );

    return {
      quizId: quiz._id,
      title: quiz.title,
      passingScore: quiz.passingScore,
      results: rows.sort((a, b) => b.lastAttemptAt - a.lastAttemptAt),
    };
  },
});

export const getUserAttempts = query({
  args: { quizId: v.id("quizzes"), userId: v.id("users") },
  handler: async (ctx, args) => {
    try {
      await requirePermission(ctx, PERMISSIONS.MANAGE_QUIZZES);
    } catch {
      return [];
    }
    return getOwnAttempts(ctx, args.quizId, args.userId);
  },
});

// ─── Learner-facing ─────────────────────────────────────────────────

async function buildLearnerQuizPayload(
  ctx: QueryCtx,
  quiz: Doc<"quizzes">,
  userId: Id<"users">
) {
  const attempts = await getOwnAttempts(ctx, quiz._id, userId);
  const attemptsUsed = attempts.length;
  const attemptsRemaining =
    quiz.maxAttempts === undefined
      ? null
      : Math.max(0, quiz.maxAttempts - attemptsUsed);
  const passed = attempts.some((a) => a.passed);
  const bestScore =
    attempts.length > 0 ? Math.max(...attempts.map((a) => a.score)) : null;

  const completionLock = await getCompletionLock(ctx, quiz, userId);
  const outOfAttempts = attemptsRemaining !== null && attemptsRemaining <= 0;
  const lockReason = completionLock
    ? completionLock
    : outOfAttempts && !passed
      ? "max_attempts_reached"
      : null;

  let questions = (await getActiveQuestions(ctx, quiz._id)).map(
    sanitizeQuestion
  );
  if (quiz.shuffleQuestions) {
    questions = seededShuffle(
      questions,
      `${quiz._id}:${userId}:${attemptsUsed}`
    );
  }

  return {
    quizId: quiz._id,
    title: quiz.title,
    description: quiz.description ?? null,
    passingScore: quiz.passingScore,
    maxAttempts: quiz.maxAttempts ?? null,
    revealAnswers: quiz.revealAnswers ?? "correctness",
    requireContentCompletion: !!quiz.requireContentCompletion,
    questionCount: questions.length,
    // Questions are withheld while locked so a learner can't read them
    // before completing the content (or after running out of attempts).
    questions: lockReason ? [] : questions,
    status: {
      attemptsUsed,
      attemptsRemaining,
      bestScore,
      passed,
      locked: !!lockReason,
      lockReason,
    },
  };
}

export const getQuizForContent = query({
  args: { contentId: v.id("content") },
  handler: async (ctx, args) => {
    // Rendered by PublicContentViewer, which anonymous visitors also load —
    // degrade to null for everyone who can't take the quiz.
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await getUserProfile(ctx, userId);
    if (!profile) return null;

    const quiz = await ctx.db
      .query("quizzes")
      .withIndex("by_content", (q) => q.eq("contentId", args.contentId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!quiz) return null;

    const content = await ctx.db.get(args.contentId);
    if (!content) return null;
    if (!(await isEntitledToContentQuiz(ctx, content, userId, profile))) {
      return null;
    }
    return buildLearnerQuizPayload(ctx, quiz, userId);
  },
});

export const getQuizForBundle = query({
  args: { groupId: v.id("contentGroups") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const profile = await getUserProfile(ctx, userId);
    if (!profile) return null;

    const quiz = await ctx.db
      .query("quizzes")
      .withIndex("by_group", (q) => q.eq("groupId", args.groupId))
      .filter((q) => q.eq(q.field("isActive"), true))
      .first();
    if (!quiz) return null;

    const group = await ctx.db.get(args.groupId);
    if (!group) return null;
    if (!(await isEntitledToBundleQuiz(ctx, group, userId, profile))) {
      return null;
    }
    return buildLearnerQuizPayload(ctx, quiz, userId);
  },
});

export const submitQuizAttempt = mutation({
  args: {
    quizId: v.id("quizzes"),
    answers: v.array(
      v.object({
        questionId: v.id("quizQuestions"),
        selectedOptionIds: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const { userId, profile } = await requireAuth(ctx);

    const quiz = await ctx.db.get(args.quizId);
    if (!quiz || !quiz.isActive) throw new ConvexError("Quiz not found");
    if (!(await isEntitledToQuiz(ctx, quiz, userId, profile))) {
      throw new ConvexError("You don't have access to this quiz");
    }

    const completionLock = await getCompletionLock(ctx, quiz, userId);
    if (completionLock) {
      throw new ConvexError(
        "Finish the content before taking this quiz"
      );
    }

    const priorAttempts = await getOwnAttempts(ctx, args.quizId, userId);
    if (
      quiz.maxAttempts !== undefined &&
      priorAttempts.length >= quiz.maxAttempts
    ) {
      throw new ConvexError("No attempts remaining for this quiz");
    }

    const questions = await getActiveQuestions(ctx, args.quizId);
    if (questions.length === 0) {
      throw new ConvexError("This quiz has no questions yet");
    }

    // Grade server-side: set equality between selected and correct option
    // ids. Partial credit is not awarded on multi-select questions.
    const answerByQuestion = new Map(
      args.answers.map((a) => [a.questionId, a.selectedOptionIds])
    );
    let pointsEarned = 0;
    let pointsPossible = 0;
    const gradedAnswers = questions.map((question) => {
      const selected = answerByQuestion.get(question._id) ?? [];
      const selectedSet = new Set(selected);
      const correctSet = new Set(question.correctOptionIds);
      const correct =
        selectedSet.size === correctSet.size &&
        [...correctSet].every((id) => selectedSet.has(id));
      const points = question.points ?? 1;
      pointsPossible += points;
      if (correct) pointsEarned += points;
      return {
        questionId: question._id,
        selectedOptionIds: [...selectedSet],
        correct,
      };
    });

    const score = Math.round((pointsEarned / pointsPossible) * 100);
    const passed = score >= quiz.passingScore;
    const attemptNumber = priorAttempts.length + 1;

    const attemptId = await ctx.db.insert("quizAttempts", {
      quizId: args.quizId,
      userId,
      attemptNumber,
      submittedAt: Date.now(),
      answers: gradedAnswers,
      score,
      pointsEarned,
      pointsPossible,
      passed,
    });

    const reveal = quiz.revealAnswers ?? "correctness";
    return {
      attemptId,
      attemptNumber,
      score,
      passed,
      pointsEarned,
      pointsPossible,
      passingScore: quiz.passingScore,
      results:
        reveal === "none"
          ? null
          : gradedAnswers.map((a) => {
              if (reveal === "correctness") {
                return { questionId: a.questionId, correct: a.correct };
              }
              const question = questions.find((q) => q._id === a.questionId)!;
              return {
                questionId: a.questionId,
                correct: a.correct,
                correctOptionIds: question.correctOptionIds,
                explanation: question.explanation ?? null,
              };
            }),
    };
  },
});

export const setMyAttemptFeedback = mutation({
  args: {
    attemptId: v.id("quizAttempts"),
    feedback: v.string(),
  },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const attempt = await ctx.db.get(args.attemptId);
    if (!attempt || attempt.userId !== userId) {
      throw new ConvexError("Attempt not found");
    }
    if (!args.feedback.trim()) {
      throw new ConvexError("Feedback cannot be empty");
    }
    if (args.feedback.length > 5000) {
      throw new ConvexError("Feedback is too long (5000 characters max)");
    }
    await ctx.db.patch(args.attemptId, {
      learnerFeedback: args.feedback.trim(),
      learnerFeedbackAt: Date.now(),
    });
    return null;
  },
});

export const getMyAttempts = query({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];

    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) return [];
    const reveal = quiz.revealAnswers ?? "correctness";

    const attempts = await getOwnAttempts(ctx, args.quizId, userId);
    return attempts.map((attempt) => ({
      _id: attempt._id,
      attemptNumber: attempt.attemptNumber,
      submittedAt: attempt.submittedAt,
      score: attempt.score,
      passed: attempt.passed,
      pointsEarned: attempt.pointsEarned,
      pointsPossible: attempt.pointsPossible,
      learnerFeedback: attempt.learnerFeedback ?? null,
      learnerFeedbackAt: attempt.learnerFeedbackAt ?? null,
      // Per-question detail follows the quiz's reveal setting; "none"
      // means score-only, so no answer rows at all.
      answers:
        reveal === "none"
          ? null
          : attempt.answers.map((a) => ({
              questionId: a.questionId,
              selectedOptionIds: a.selectedOptionIds,
              correct: a.correct,
            })),
    }));
  },
});
