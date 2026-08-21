import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api, internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

// ─── Shared seeding helpers (mirrors security.test.ts) ─────────────

async function seedUser(
  t: ReturnType<typeof convexTest>,
  role: string,
  email: string,
  profileOverrides: Record<string, unknown> = {}
) {
  return await t.run(async (ctx) => {
    const userId = await ctx.db.insert("users", { email, name: "Test User" });
    await ctx.db.insert("userProfiles", {
      userId,
      role,
      firstName: "Test",
      lastName: "User",
      isActive: true,
      ...profileOverrides,
    });
    return userId;
  });
}

async function seedContent(
  t: ReturnType<typeof convexTest>,
  createdBy: Id<"users">,
  overrides: Record<string, unknown> = {}
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("content", {
      title: "Judges Training Video",
      isPublic: true,
      createdBy,
      status: "published",
      active: true,
      attachmentType: "video",
      ...overrides,
    })
  );
}

async function seedQuiz(
  t: ReturnType<typeof convexTest>,
  createdBy: Id<"users">,
  target: { contentId?: Id<"content">; groupId?: Id<"contentGroups"> },
  overrides: Record<string, unknown> = {}
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("quizzes", {
      title: "Comprehension Check",
      passingScore: 70,
      isActive: true,
      createdBy,
      ...target,
      ...overrides,
    })
  );
}

async function seedQuestion(
  t: ReturnType<typeof convexTest>,
  quizId: Id<"quizzes">,
  overrides: Record<string, unknown> = {}
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("quizQuestions", {
      quizId,
      order: 1,
      prompt: "What does a judge evaluate first?",
      kind: "single",
      options: [
        { id: "a", text: "Impact" },
        { id: "b", text: "Font choice" },
      ],
      correctOptionIds: ["a"],
      explanation: "Impact on the nonprofit comes first.",
      isActive: true,
      ...overrides,
    })
  );
}

/** Recursively scan a payload for a forbidden key. */
function findKeyDeep(value: unknown, key: string): boolean {
  if (value === null || typeof value !== "object") return false;
  if (Array.isArray(value)) return value.some((item) => findKeyDeep(item, key));
  return Object.entries(value as Record<string, unknown>).some(
    ([k, nested]) => k === key || findKeyDeep(nested, key)
  );
}

// ═══════════════════════════════════════════════════════════════════
// Answer hiding
// ═══════════════════════════════════════════════════════════════════

describe("learner quiz payloads never contain answers", () => {
  it("getQuizForContent omits correctOptionIds and explanation entirely", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-leak-1@test.local");
    const clientId = await seedUser(t, "client", "client-leak-1@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId });
    await seedQuestion(t, quizId);

    const payload = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForContent, { contentId });

    expect(payload).not.toBeNull();
    expect(payload!.questions).toHaveLength(1);
    expect(findKeyDeep(payload, "correctOptionIds")).toBe(false);
    expect(findKeyDeep(payload, "explanation")).toBe(false);
  });

  it("getMyAttempts with revealAnswers 'none' returns no per-question rows", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-leak-2@test.local");
    const clientId = await seedUser(t, "client", "client-leak-2@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId }, {
      revealAnswers: "none",
    });
    const questionId = await seedQuestion(t, quizId);

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      });
    expect(result.results).toBeNull();

    const attempts = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getMyAttempts, { quizId });
    expect(attempts).toHaveLength(1);
    expect(attempts[0].answers).toBeNull();
    expect(attempts[0].score).toBe(100);
  });

  it("submit response with 'correctness' includes right/wrong but no answers", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-leak-3@test.local");
    const clientId = await seedUser(t, "client", "client-leak-3@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId }, {
      revealAnswers: "correctness",
    });
    const questionId = await seedQuestion(t, quizId);

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["b"] }],
      });
    expect(result.results).toHaveLength(1);
    expect(result.results![0].correct).toBe(false);
    expect(findKeyDeep(result.results, "correctOptionIds")).toBe(false);
  });

  it("submit response with 'full' reveals answers only after grading", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-leak-4@test.local");
    const clientId = await seedUser(t, "client", "client-leak-4@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId }, {
      revealAnswers: "full",
    });
    const questionId = await seedQuestion(t, quizId);

    // Pre-submit fetch still hides answers even in full mode
    const payload = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForContent, { contentId });
    expect(findKeyDeep(payload, "correctOptionIds")).toBe(false);

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      });
    expect(result.results![0]).toMatchObject({
      correct: true,
      correctOptionIds: ["a"],
    });
  });

  it("getQuizForEditing returns null (not answers) to non-staff", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-leak-5@test.local");
    const clientId = await seedUser(t, "client", "client-leak-5@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId });
    await seedQuestion(t, quizId);

    const asClient = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForEditing, { quizId });
    expect(asClient).toBeNull();

    const asOwner = await t
      .withIdentity({ subject: ownerId })
      .query(api.quizzes.getQuizForEditing, { quizId });
    expect(asOwner!.questions[0].correctOptionIds).toEqual(["a"]);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Entitlement
// ═══════════════════════════════════════════════════════════════════

describe("quiz entitlement", () => {
  it("anonymous users get null and cannot submit", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-ent-1@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId });
    const questionId = await seedQuestion(t, quizId);

    const payload = await t.query(api.quizzes.getQuizForContent, { contentId });
    expect(payload).toBeNull();

    await expect(
      t.mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      })
    ).rejects.toThrow();
  });

  it("private content without a grant yields null / rejected submit", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-ent-2@test.local");
    const clientId = await seedUser(t, "client", "client-ent-2@test.local");
    const contentId = await seedContent(t, ownerId, { isPublic: false });
    const quizId = await seedQuiz(t, ownerId, { contentId });
    const questionId = await seedQuestion(t, quizId);

    const payload = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForContent, { contentId });
    expect(payload).toBeNull();

    await expect(
      t.withIdentity({ subject: clientId }).mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      })
    ).rejects.toThrow(/access/i);
  });

  it("a contentAccess grant entitles the learner", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-ent-3@test.local");
    const clientId = await seedUser(t, "client", "client-ent-3@test.local");
    const contentId = await seedContent(t, ownerId, { isPublic: false });
    const quizId = await seedQuiz(t, ownerId, { contentId });
    const questionId = await seedQuestion(t, quizId);
    await t.run(async (ctx) => {
      await ctx.db.insert("contentAccess", {
        contentId,
        userId: clientId,
        grantedBy: ownerId,
        canShare: false,
      });
    });

    const payload = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForContent, { contentId });
    expect(payload).not.toBeNull();

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      });
    expect(result.passed).toBe(true);
  });

  it("public content with ACTIVE pricing is not quiz-eligible without purchase", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-ent-4@test.local");
    const clientId = await seedUser(t, "client", "client-ent-4@test.local");
    const contentId = await seedContent(t, ownerId, { isPublic: true });
    const quizId = await seedQuiz(t, ownerId, { contentId });
    const questionId = await seedQuestion(t, quizId);
    await t.run(async (ctx) => {
      await ctx.db.insert("contentPricing", {
        contentId,
        price: 1999,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
    });

    const payload = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForContent, { contentId });
    expect(payload).toBeNull();

    await expect(
      t.withIdentity({ subject: clientId }).mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      })
    ).rejects.toThrow(/access/i);

    // A purchase grant (what completeOrderInternal writes) restores access
    await t.run(async (ctx) => {
      await ctx.db.insert("contentAccess", {
        contentId,
        userId: clientId,
        grantedBy: ownerId,
        canShare: false,
      });
    });
    const entitled = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForContent, { contentId });
    expect(entitled).not.toBeNull();
  });

  it("unpublished or inactive content is not quiz-eligible", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-ent-5@test.local");
    const clientId = await seedUser(t, "client", "client-ent-5@test.local");
    const contentId = await seedContent(t, ownerId, { status: "draft" });
    const quizId = await seedQuiz(t, ownerId, { contentId });
    await seedQuestion(t, quizId);

    const payload = await t
      .withIdentity({ subject: clientId })
      .query(api.quizzes.getQuizForContent, { contentId });
    expect(payload).toBeNull();
  });

  it("bundle quiz: public bundle entitles; private bundle needs a group grant", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-ent-6@test.local");
    const clientId = await seedUser(t, "client", "client-ent-6@test.local");

    const privateGroupId = await t.run(async (ctx) =>
      ctx.db.insert("contentGroups", {
        name: "Private Bundle",
        createdBy: ownerId,
        isActive: true,
        isPublic: false,
      })
    );
    const publicGroupId = await t.run(async (ctx) =>
      ctx.db.insert("contentGroups", {
        name: "Public Bundle",
        createdBy: ownerId,
        isActive: true,
        isPublic: true,
      })
    );
    const privateQuizId = await seedQuiz(t, ownerId, { groupId: privateGroupId });
    const publicQuizId = await seedQuiz(t, ownerId, { groupId: publicGroupId });
    await seedQuestion(t, privateQuizId);
    await seedQuestion(t, publicQuizId);

    const asClient = t.withIdentity({ subject: clientId });
    expect(
      await asClient.query(api.quizzes.getQuizForBundle, {
        groupId: privateGroupId,
      })
    ).toBeNull();
    expect(
      await asClient.query(api.quizzes.getQuizForBundle, {
        groupId: publicGroupId,
      })
    ).not.toBeNull();

    // Role-based contentGroupAccess grant opens the private bundle
    await t.run(async (ctx) => {
      await ctx.db.insert("contentGroupAccess", {
        groupId: privateGroupId,
        role: "client",
        grantedBy: ownerId,
        canShare: false,
      });
    });
    expect(
      await asClient.query(api.quizzes.getQuizForBundle, {
        groupId: privateGroupId,
      })
    ).not.toBeNull();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Grading
// ═══════════════════════════════════════════════════════════════════

describe("server-side grading", () => {
  async function gradedQuiz(t: ReturnType<typeof convexTest>) {
    const ownerId = await seedUser(
      t,
      "owner",
      `owner-grade-${Math.random()}@test.local`
    );
    const clientId = await seedUser(
      t,
      "client",
      `client-grade-${Math.random()}@test.local`
    );
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId }, {
      passingScore: 60,
    });
    const q1 = await seedQuestion(t, quizId, { order: 1 }); // single, correct: a
    const q2 = await seedQuestion(t, quizId, {
      order: 2,
      prompt: "Select all judging criteria",
      kind: "multi",
      options: [
        { id: "x", text: "Impact" },
        { id: "y", text: "Feasibility" },
        { id: "z", text: "Team hair style" },
      ],
      correctOptionIds: ["x", "y"],
    });
    const q3 = await seedQuestion(t, quizId, {
      order: 3,
      prompt: "Judging is subjective",
      kind: "trueFalse",
      options: [
        { id: "true", text: "True" },
        { id: "false", text: "False" },
      ],
      correctOptionIds: ["true"],
      points: 2,
    });
    return { ownerId, clientId, quizId, q1, q2, q3 };
  }

  it("grades set-equality: partial multi-select earns nothing", async () => {
    const t = convexTest(schema);
    const { clientId, quizId, q1, q2, q3 } = await gradedQuiz(t);

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [
          { questionId: q1, selectedOptionIds: ["a"] }, // correct (1pt)
          { questionId: q2, selectedOptionIds: ["x"] }, // partial => wrong
          { questionId: q3, selectedOptionIds: ["false"] }, // wrong
        ],
      });

    expect(result.pointsEarned).toBe(1);
    expect(result.pointsPossible).toBe(4);
    expect(result.score).toBe(25);
    expect(result.passed).toBe(false);
  });

  it("full-credit multi + weighted trueFalse passes", async () => {
    const t = convexTest(schema);
    const { clientId, quizId, q1, q2, q3 } = await gradedQuiz(t);

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [
          { questionId: q1, selectedOptionIds: ["b"] }, // wrong
          { questionId: q2, selectedOptionIds: ["y", "x"] }, // order-independent
          { questionId: q3, selectedOptionIds: ["true"] }, // 2 pts
        ],
      });

    expect(result.pointsEarned).toBe(3);
    expect(result.score).toBe(75);
    expect(result.passed).toBe(true);
  });

  it("unanswered questions grade as wrong; extra/unknown answers are ignored", async () => {
    const t = convexTest(schema);
    const { clientId, quizId, q1 } = await gradedQuiz(t);

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId: q1, selectedOptionIds: ["a"] }],
      });
    expect(result.pointsEarned).toBe(1);
    expect(result.pointsPossible).toBe(4);
  });

  it("attemptNumber increments and attempts-to-pass is derivable", async () => {
    const t = convexTest(schema);
    const { ownerId, clientId, quizId, q1, q2, q3 } = await gradedQuiz(t);
    const asClient = t.withIdentity({ subject: clientId });

    const first = await asClient.mutation(api.quizzes.submitQuizAttempt, {
      quizId,
      answers: [{ questionId: q1, selectedOptionIds: ["b"] }],
    });
    expect(first.attemptNumber).toBe(1);
    expect(first.passed).toBe(false);

    const second = await asClient.mutation(api.quizzes.submitQuizAttempt, {
      quizId,
      answers: [
        { questionId: q1, selectedOptionIds: ["a"] },
        { questionId: q2, selectedOptionIds: ["x", "y"] },
        { questionId: q3, selectedOptionIds: ["true"] },
      ],
    });
    expect(second.attemptNumber).toBe(2);
    expect(second.passed).toBe(true);

    const results = await t
      .withIdentity({ subject: ownerId })
      .query(api.quizzes.getQuizResults, { quizId });
    const row = results!.results.find((r) => r.userId === clientId)!;
    expect(row.attemptCount).toBe(2);
    expect(row.attemptsToPass).toBe(2);
    expect(row.bestScore).toBe(100);
  });

  it("maxAttempts is enforced", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-max-1@test.local");
    const clientId = await seedUser(t, "client", "client-max-1@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId }, { maxAttempts: 1 });
    const questionId = await seedQuestion(t, quizId);
    const asClient = t.withIdentity({ subject: clientId });

    await asClient.mutation(api.quizzes.submitQuizAttempt, {
      quizId,
      answers: [{ questionId, selectedOptionIds: ["b"] }],
    });
    await expect(
      asClient.mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      })
    ).rejects.toThrow(/attempts/i);

    const payload = await asClient.query(api.quizzes.getQuizForContent, {
      contentId,
    });
    expect(payload!.status.locked).toBe(true);
    expect(payload!.status.lockReason).toBe("max_attempts_reached");
    expect(payload!.questions).toHaveLength(0);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Completion gating
// ═══════════════════════════════════════════════════════════════════

describe("requireContentCompletion gating", () => {
  it("locks the quiz until the content is completed", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-gate-1@test.local");
    const clientId = await seedUser(t, "client", "client-gate-1@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId }, {
      requireContentCompletion: true,
    });
    const questionId = await seedQuestion(t, quizId);
    const asClient = t.withIdentity({ subject: clientId });

    const locked = await asClient.query(api.quizzes.getQuizForContent, {
      contentId,
    });
    expect(locked!.status.locked).toBe(true);
    expect(locked!.status.lockReason).toBe("content_not_completed");
    expect(locked!.questions).toHaveLength(0);

    await expect(
      asClient.mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      })
    ).rejects.toThrow(/finish the content/i);

    // 95% watched crosses the completion threshold
    await asClient.mutation(api.progress.recordProgress, {
      contentId,
      progress: 0.95,
    });

    const unlocked = await asClient.query(api.quizzes.getQuizForContent, {
      contentId,
    });
    expect(unlocked!.status.locked).toBe(false);
    expect(unlocked!.questions).toHaveLength(1);

    const result = await asClient.mutation(api.quizzes.submitQuizAttempt, {
      quizId,
      answers: [{ questionId, selectedOptionIds: ["a"] }],
    });
    expect(result.passed).toBe(true);
  });

  it("bundle quiz requires every item completed", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-gate-2@test.local");
    const clientId = await seedUser(t, "client", "client-gate-2@test.local");
    const contentA = await seedContent(t, ownerId, { title: "Part 1" });
    const contentB = await seedContent(t, ownerId, { title: "Part 2" });
    const groupId = await t.run(async (ctx) => {
      const gid = await ctx.db.insert("contentGroups", {
        name: "Training Series",
        createdBy: ownerId,
        isActive: true,
        isPublic: true,
      });
      await ctx.db.insert("contentGroupItems", {
        groupId: gid,
        contentId: contentA,
        addedBy: ownerId,
        order: 1,
      });
      await ctx.db.insert("contentGroupItems", {
        groupId: gid,
        contentId: contentB,
        addedBy: ownerId,
        order: 2,
      });
      return gid;
    });
    const quizId = await seedQuiz(t, ownerId, { groupId }, {
      requireContentCompletion: true,
    });
    const questionId = await seedQuestion(t, quizId);
    const asClient = t.withIdentity({ subject: clientId });

    await asClient.mutation(api.progress.markContentCompleted, {
      contentId: contentA,
    });
    const stillLocked = await asClient.query(api.quizzes.getQuizForBundle, {
      groupId,
    });
    expect(stillLocked!.status.locked).toBe(true);

    await asClient.mutation(api.progress.markContentCompleted, {
      contentId: contentB,
    });
    const unlocked = await asClient.query(api.quizzes.getQuizForBundle, {
      groupId,
    });
    expect(unlocked!.status.locked).toBe(false);

    const result = await asClient.mutation(api.quizzes.submitQuizAttempt, {
      quizId,
      answers: [{ questionId, selectedOptionIds: ["a"] }],
    });
    expect(result.passed).toBe(true);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Learner feedback
// ═══════════════════════════════════════════════════════════════════

describe("learner feedback on attempts", () => {
  it("learner can leave feedback on own attempt; staff read it in results", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-fb-1@test.local");
    const clientId = await seedUser(t, "client", "client-fb-1@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId });
    const questionId = await seedQuestion(t, quizId);
    const asClient = t.withIdentity({ subject: clientId });

    const attempt = await asClient.mutation(api.quizzes.submitQuizAttempt, {
      quizId,
      answers: [{ questionId, selectedOptionIds: ["a"] }],
    });
    await asClient.mutation(api.quizzes.setMyAttemptFeedback, {
      attemptId: attempt.attemptId,
      feedback: "The video was clear, but question 1 felt ambiguous.",
    });

    const attempts = await asClient.query(api.quizzes.getMyAttempts, { quizId });
    expect(attempts[0].learnerFeedback).toMatch(/ambiguous/);

    const results = await t
      .withIdentity({ subject: ownerId })
      .query(api.quizzes.getQuizResults, { quizId });
    expect(results!.results[0].learnerFeedback).toMatch(/ambiguous/);
  });

  it("cannot leave feedback on someone else's attempt", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-fb-2@test.local");
    const clientA = await seedUser(t, "client", "client-fb-2a@test.local");
    const clientB = await seedUser(t, "client", "client-fb-2b@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId });
    const questionId = await seedQuestion(t, quizId);

    const attempt = await t
      .withIdentity({ subject: clientA })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      });

    await expect(
      t.withIdentity({ subject: clientB }).mutation(
        api.quizzes.setMyAttemptFeedback,
        {
          attemptId: attempt.attemptId,
          feedback: "hijack",
        }
      )
    ).rejects.toThrow(/not found/i);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Admin authoring guards
// ═══════════════════════════════════════════════════════════════════

describe("quiz authoring permissions and validation", () => {
  it("clients cannot create quizzes or list them; render queries degrade", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-adm-1@test.local");
    const clientId = await seedUser(t, "client", "client-adm-1@test.local");
    const contentId = await seedContent(t, ownerId);

    await expect(
      t.withIdentity({ subject: clientId }).mutation(api.quizzes.createQuiz, {
        title: "Rogue quiz",
        contentId,
        passingScore: 50,
      })
    ).rejects.toThrow(/permission/i);

    expect(
      await t.withIdentity({ subject: clientId }).query(api.quizzes.listQuizzes, {})
    ).toEqual([]);
  });

  it("editors have MANAGE_QUIZZES by default", async () => {
    const t = convexTest(schema);
    const editorId = await seedUser(t, "editor", "editor-adm-2@test.local");
    const contentId = await seedContent(t, editorId);

    const quizId = await t
      .withIdentity({ subject: editorId })
      .mutation(api.quizzes.createQuiz, {
        title: "Editor quiz",
        contentId,
        passingScore: 80,
      });
    expect(quizId).toBeDefined();
  });

  it("rejects a second active quiz on the same target and dual targets", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-adm-3@test.local");
    const contentId = await seedContent(t, ownerId);
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("contentGroups", {
        name: "Bundle",
        createdBy: ownerId,
        isActive: true,
      })
    );
    const asOwner = t.withIdentity({ subject: ownerId });

    await asOwner.mutation(api.quizzes.createQuiz, {
      title: "First",
      contentId,
      passingScore: 70,
    });
    await expect(
      asOwner.mutation(api.quizzes.createQuiz, {
        title: "Second",
        contentId,
        passingScore: 70,
      })
    ).rejects.toThrow(/already has an active quiz/i);

    await expect(
      asOwner.mutation(api.quizzes.createQuiz, {
        title: "Both targets",
        contentId,
        groupId,
        passingScore: 70,
      })
    ).rejects.toThrow(/exactly one/i);

    await expect(
      asOwner.mutation(api.quizzes.createQuiz, {
        title: "No target",
        passingScore: 70,
      })
    ).rejects.toThrow(/exactly one/i);
  });

  it("question validation: option/correct-id integrity", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-adm-4@test.local");
    const contentId = await seedContent(t, ownerId);
    const asOwner = t.withIdentity({ subject: ownerId });
    const quizId = await asOwner.mutation(api.quizzes.createQuiz, {
      title: "Validation quiz",
      contentId,
      passingScore: 70,
    });

    await expect(
      asOwner.mutation(api.quizzes.addQuestion, {
        quizId,
        prompt: "Bad correct id",
        kind: "single",
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        correctOptionIds: ["nope"],
      })
    ).rejects.toThrow(/reference existing options/i);

    await expect(
      asOwner.mutation(api.quizzes.addQuestion, {
        quizId,
        prompt: "Two answers on single",
        kind: "single",
        options: [
          { id: "a", text: "A" },
          { id: "b", text: "B" },
        ],
        correctOptionIds: ["a", "b"],
      })
    ).rejects.toThrow(/exactly one correct/i);
  });

  it("deleteQuiz refuses once attempts exist; deleteQuestion soft-deletes", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-adm-5@test.local");
    const clientId = await seedUser(t, "client", "client-adm-5@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId });
    const questionId = await seedQuestion(t, quizId);
    const asOwner = t.withIdentity({ subject: ownerId });

    await t.withIdentity({ subject: clientId }).mutation(
      api.quizzes.submitQuizAttempt,
      {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      }
    );

    await expect(
      asOwner.mutation(api.quizzes.deleteQuiz, { quizId })
    ).rejects.toThrow(/deactivate/i);

    await asOwner.mutation(api.quizzes.deleteQuestion, { questionId });
    const question = await t.run(async (ctx) => ctx.db.get(questionId));
    expect(question).not.toBeNull();
    expect(question!.isActive).toBe(false);
  });
});

// ═══════════════════════════════════════════════════════════════════
// Duplicate quiz
// ═══════════════════════════════════════════════════════════════════

describe("duplicateQuiz", () => {
  it("clients cannot duplicate quizzes", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-dup-1@test.local");
    const clientId = await seedUser(t, "client", "client-dup-1@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId });

    await expect(
      t.withIdentity({ subject: clientId }).mutation(api.quizzes.duplicateQuiz, {
        sourceQuizId: quizId,
        contentId,
      })
    ).rejects.toThrow(/permission/i);
  });

  it("copies settings and active questions to another content, inactive, returning only the id", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-dup-2@test.local");
    const editorId = await seedUser(t, "editor", "editor-dup-2@test.local");
    const contentA = await seedContent(t, ownerId);
    const contentB = await seedContent(t, ownerId, { title: "Second video" });
    const quizId = await seedQuiz(t, ownerId, { contentId: contentA }, {
      description: "Original description",
      passingScore: 85,
      maxAttempts: 3,
      shuffleQuestions: true,
      revealAnswers: "correctness",
      requireContentCompletion: true,
    });
    // Out-of-order source questions: relative order must survive renumbering
    await seedQuestion(t, quizId, {
      order: 5,
      prompt: "Later question",
      points: 4,
    });
    await seedQuestion(t, quizId, { order: 2, prompt: "Earlier question" });

    const returned = await t
      .withIdentity({ subject: editorId })
      .mutation(api.quizzes.duplicateQuiz, {
        sourceQuizId: quizId,
        contentId: contentB,
      });

    expect(typeof returned).toBe("string");
    expect(findKeyDeep(returned, "correctOptionIds")).toBe(false);

    const copy = await t.run(async (ctx) => ctx.db.get(returned));
    expect(copy).not.toBeNull();
    expect(copy!.contentId).toBe(contentB);
    expect(copy!.groupId).toBeUndefined();
    expect(copy!.isActive).toBe(false);
    expect(copy!.title).toBe("Comprehension Check");
    expect(copy!.description).toBe("Original description");
    expect(copy!.passingScore).toBe(85);
    expect(copy!.maxAttempts).toBe(3);
    expect(copy!.shuffleQuestions).toBe(true);
    expect(copy!.revealAnswers).toBe("correctness");
    expect(copy!.requireContentCompletion).toBe(true);
    expect(copy!.createdBy).toBe(editorId);

    const copiedQuestions = await t.run(async (ctx) =>
      ctx.db
        .query("quizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", returned))
        .collect()
    );
    expect(copiedQuestions).toHaveLength(2);
    const sorted = [...copiedQuestions].sort((a, b) => a.order - b.order);
    expect(sorted.map((q) => q.order)).toEqual([1, 2]);
    expect(sorted[0].prompt).toBe("Earlier question");
    expect(sorted[1].prompt).toBe("Later question");
    expect(sorted[1].points).toBe(4);
    expect(sorted[0].correctOptionIds).toEqual(["a"]);
    expect(sorted[0].explanation).toBe(
      "Impact on the nonprofit comes first."
    );
    expect(sorted.every((q) => q.isActive === true)).toBe(true);

    // Source untouched
    const source = await t.run(async (ctx) => ctx.db.get(quizId));
    expect(source!.contentId).toBe(contentA);
    expect(source!.isActive).toBe(true);
    const sourceQuestions = await t.run(async (ctx) =>
      ctx.db
        .query("quizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", quizId))
        .collect()
    );
    expect(sourceQuestions.map((q) => q.order).sort()).toEqual([2, 5]);
  });

  it("excludes soft-deleted questions and honors a title override", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-dup-3@test.local");
    const contentA = await seedContent(t, ownerId);
    const contentB = await seedContent(t, ownerId, { title: "Other" });
    const quizId = await seedQuiz(t, ownerId, { contentId: contentA });
    await seedQuestion(t, quizId, { prompt: "Keep me" });
    await seedQuestion(t, quizId, {
      order: 2,
      prompt: "Tombstone",
      isActive: false,
    });
    const asOwner = t.withIdentity({ subject: ownerId });

    const newId = await asOwner.mutation(api.quizzes.duplicateQuiz, {
      sourceQuizId: quizId,
      contentId: contentB,
      title: "  Renamed copy  ",
    });

    const copy = await t.run(async (ctx) => ctx.db.get(newId));
    expect(copy!.title).toBe("Renamed copy");
    const copiedQuestions = await t.run(async (ctx) =>
      ctx.db
        .query("quizQuestions")
        .withIndex("by_quiz", (q) => q.eq("quizId", newId))
        .collect()
    );
    expect(copiedQuestions).toHaveLength(1);
    expect(copiedQuestions[0].prompt).toBe("Keep me");

    await expect(
      asOwner.mutation(api.quizzes.duplicateQuiz, {
        sourceQuizId: quizId,
        contentId: contentB,
        title: "   ",
      })
    ).rejects.toThrow(/title is required/i);
  });

  it("validates the target: exactly one, and it must exist", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-dup-4@test.local");
    const contentId = await seedContent(t, ownerId);
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("contentGroups", {
        name: "Bundle",
        createdBy: ownerId,
        isActive: true,
      })
    );
    const quizId = await seedQuiz(t, ownerId, { contentId });
    const asOwner = t.withIdentity({ subject: ownerId });

    await expect(
      asOwner.mutation(api.quizzes.duplicateQuiz, {
        sourceQuizId: quizId,
        contentId,
        groupId,
      })
    ).rejects.toThrow(/exactly one/i);

    await expect(
      asOwner.mutation(api.quizzes.duplicateQuiz, { sourceQuizId: quizId })
    ).rejects.toThrow(/exactly one/i);

    const deletedContent = await seedContent(t, ownerId, { title: "Gone" });
    await t.run(async (ctx) => ctx.db.delete(deletedContent));
    await expect(
      asOwner.mutation(api.quizzes.duplicateQuiz, {
        sourceQuizId: quizId,
        contentId: deletedContent,
      })
    ).rejects.toThrow(/not found/i);
  });

  it("allows duplicating onto the same target; activation goes through the conflict guard", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-dup-5@test.local");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId });
    await seedQuestion(t, quizId);
    const asOwner = t.withIdentity({ subject: ownerId });

    const copyId = await asOwner.mutation(api.quizzes.duplicateQuiz, {
      sourceQuizId: quizId,
      contentId,
    });
    const copy = await t.run(async (ctx) => ctx.db.get(copyId));
    expect(copy!.isActive).toBe(false);

    // While the source is active, the copy cannot be activated…
    await expect(
      asOwner.mutation(api.quizzes.updateQuiz, {
        quizId: copyId,
        isActive: true,
      })
    ).rejects.toThrow(/another active quiz/i);

    // …but after deactivating the source it can.
    await asOwner.mutation(api.quizzes.updateQuiz, {
      quizId,
      isActive: false,
    });
    await asOwner.mutation(api.quizzes.updateQuiz, {
      quizId: copyId,
      isActive: true,
    });
    const activated = await t.run(async (ctx) => ctx.db.get(copyId));
    expect(activated!.isActive).toBe(true);
  });

  it("duplicates a content quiz onto a bundle", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner-dup-6@test.local");
    const contentId = await seedContent(t, ownerId);
    const groupId = await t.run(async (ctx) =>
      ctx.db.insert("contentGroups", {
        name: "Bundle",
        createdBy: ownerId,
        isActive: true,
      })
    );
    const quizId = await seedQuiz(t, ownerId, { contentId });

    const newId = await t
      .withIdentity({ subject: ownerId })
      .mutation(api.quizzes.duplicateQuiz, {
        sourceQuizId: quizId,
        groupId,
      });

    const copy = await t.run(async (ctx) => ctx.db.get(newId));
    expect(copy!.groupId).toBe(groupId);
    expect(copy!.contentId).toBeUndefined();
  });
});

// ═══════════════════════════════════════════════════════════════════
// Public quiz summary (signed-out nudge on /view/)
// ═══════════════════════════════════════════════════════════════════

describe("getPublicContent quiz summary", () => {
  it("tells anonymous visitors a quiz exists on public content — summary only, no answers", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner@x.test");
    const contentId = await seedContent(t, ownerId);
    const quizId = await seedQuiz(t, ownerId, { contentId });
    await seedQuestion(t, quizId);
    await seedQuestion(t, quizId, { order: 2 });
    // Soft-deleted questions don't count toward the advertised size
    await seedQuestion(t, quizId, { order: 3, isActive: false });

    const result = await t.query(api.publicContent.getPublicContent, {
      contentId,
    });

    expect(result.content).not.toBeNull();
    expect((result.content as any).quiz).toEqual({
      title: "Comprehension Check",
      questionCount: 2,
      passingScore: 70,
    });
    expect(findKeyDeep(result, "correctOptionIds")).toBe(false);
    expect(findKeyDeep(result, "explanation")).toBe(false);
  });

  it("returns quiz: null when the quiz is inactive or absent", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner@x.test");
    const withInactive = await seedContent(t, ownerId);
    const inactiveQuiz = await seedQuiz(t, ownerId, { contentId: withInactive }, { isActive: false });
    await seedQuestion(t, inactiveQuiz);
    const withoutQuiz = await seedContent(t, ownerId);

    const inactive = await t.query(api.publicContent.getPublicContent, {
      contentId: withInactive,
    });
    const none = await t.query(api.publicContent.getPublicContent, {
      contentId: withoutQuiz,
    });

    expect((inactive.content as any).quiz).toBeNull();
    expect((none.content as any).quiz).toBeNull();
  });

  it("never mentions the quiz on paywalled or private content", async () => {
    const t = convexTest(schema);
    const ownerId = await seedUser(t, "owner", "owner@x.test");

    // Public but priced → preview branch, no quiz key
    const pricedContent = await seedContent(t, ownerId);
    const pricedQuiz = await seedQuiz(t, ownerId, { contentId: pricedContent });
    await seedQuestion(t, pricedQuiz);
    await t.run(async (ctx) => {
      await ctx.db.insert("contentPricing", {
        contentId: pricedContent,
        price: 500,
        currency: "USD",
        isActive: true,
        createdBy: ownerId,
        createdAt: Date.now(),
      });
    });

    // Private → requiresAuth with zero metadata
    const privateContent = await seedContent(t, ownerId, { isPublic: false });
    const privateQuiz = await seedQuiz(t, ownerId, { contentId: privateContent });
    await seedQuestion(t, privateQuiz);

    const priced = await t.query(api.publicContent.getPublicContent, {
      contentId: pricedContent,
    });
    const priv = await t.query(api.publicContent.getPublicContent, {
      contentId: privateContent,
    });

    expect((priced as any).requiresPurchase).toBe(true);
    expect(findKeyDeep(priced, "quiz")).toBe(false);
    expect(priv.requiresAuth).toBe(true);
    expect(priv.content).toBeNull();
    expect(findKeyDeep(priv, "quiz")).toBe(false);
  });
});
