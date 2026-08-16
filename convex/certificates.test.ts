/// <reference types="vite/client" />
/**
 * Certificates: server-side issuance from passing quiz attempts, and the
 * anonymous share-token lookup that must expose only whitelisted fields.
 */
import { describe, it, expect } from "vitest";
import { convexTest } from "convex-test";
import schema from "./schema";
import { api } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const modules = import.meta.glob("./**/*.ts");

// ─── Shared seeding helpers (mirrors quizzes.test.ts) ───────────────

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
      firstName: "Casey",
      lastName: "Learner",
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
      title: "Judges Training Video",
      isPublic: true,
      createdBy,
      status: "published",
      active: true,
      attachmentType: "video",
    })
  );
}

async function seedQuiz(
  t: ReturnType<typeof convexTest>,
  createdBy: Id<"users">,
  contentId: Id<"content">,
  overrides: Record<string, unknown> = {}
) {
  return await t.run(async (ctx) =>
    ctx.db.insert("quizzes", {
      title: "Comprehension Check",
      passingScore: 70,
      isActive: true,
      createdBy,
      contentId,
      ...overrides,
    })
  );
}

async function seedQuestion(
  t: ReturnType<typeof convexTest>,
  quizId: Id<"quizzes">
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
      isActive: true,
    })
  );
}

async function setup(t: ReturnType<typeof convexTest>) {
  const ownerId = await seedUser(t, "owner", "owner@test.local");
  const clientId = await seedUser(t, "client", "client@test.local");
  const contentId = await seedContent(t, ownerId);
  const quizId = await seedQuiz(t, ownerId, contentId);
  const questionId = await seedQuestion(t, quizId);
  return { ownerId, clientId, contentId, quizId, questionId };
}

// ─── Issuance ───────────────────────────────────────────────────────

describe("certificate issuance", () => {
  it("a passing submit auto-issues a certificate with snapshotted fields", async () => {
    const t = convexTest(schema, modules);
    const { clientId, quizId, questionId } = await setup(t);

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      });

    expect(result.passed).toBe(true);
    expect(result.certificate).not.toBeNull();
    expect(result.certificate!.shareToken).toMatch(/^[0-9a-f]{64}$/);

    const cert = await t.run(async (ctx) =>
      ctx.db
        .query("certificates")
        .withIndex("by_quiz_user", (q) =>
          q.eq("quizId", quizId).eq("userId", clientId)
        )
        .unique()
    );
    expect(cert).toMatchObject({
      recipientName: "Casey Learner",
      quizTitle: "Comprehension Check",
      targetTitle: "Judges Training Video",
      score: 100,
      passingScore: 70,
    });
  });

  it("a failing submit issues nothing and claim is rejected", async () => {
    const t = convexTest(schema, modules);
    const { clientId, quizId, questionId } = await setup(t);

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["b"] }],
      });
    expect(result.passed).toBe(false);
    expect(result.certificate).toBeNull();

    const certCount = await t.run(async (ctx) =>
      (await ctx.db.query("certificates").collect()).length
    );
    expect(certCount).toBe(0);

    await expect(
      t
        .withIdentity({ subject: clientId })
        .mutation(api.certificates.claimMyCertificate, { quizId })
    ).rejects.toThrow(/pass the quiz/i);
  });

  it("repeat passes never create a second certificate", async () => {
    const t = convexTest(schema, modules);
    const { clientId, quizId, questionId } = await setup(t);
    const asClient = t.withIdentity({ subject: clientId });

    const first = await asClient.mutation(api.quizzes.submitQuizAttempt, {
      quizId,
      answers: [{ questionId, selectedOptionIds: ["a"] }],
    });
    const second = await asClient.mutation(api.quizzes.submitQuizAttempt, {
      quizId,
      answers: [{ questionId, selectedOptionIds: ["a"] }],
    });
    const claimed = await asClient.mutation(
      api.certificates.claimMyCertificate,
      { quizId }
    );

    expect(second.certificate!.shareToken).toBe(
      first.certificate!.shareToken
    );
    expect(claimed.shareToken).toBe(first.certificate!.shareToken);
    const certCount = await t.run(async (ctx) =>
      (await ctx.db.query("certificates").collect()).length
    );
    expect(certCount).toBe(1);
  });

  it("claimMyCertificate retroactively issues for a pre-feature pass", async () => {
    const t = convexTest(schema, modules);
    const { clientId, quizId } = await setup(t);

    // Simulate an attempt recorded before certificates existed
    await t.run(async (ctx) => {
      await ctx.db.insert("quizAttempts", {
        quizId,
        userId: clientId,
        attemptNumber: 1,
        submittedAt: Date.now() - 1000,
        answers: [],
        score: 80,
        pointsEarned: 4,
        pointsPossible: 5,
        passed: true,
      });
    });

    const claimed = await t
      .withIdentity({ subject: clientId })
      .mutation(api.certificates.claimMyCertificate, { quizId });
    expect(claimed.shareToken).toMatch(/^[0-9a-f]{64}$/);

    const cert = await t.run(async (ctx) =>
      ctx.db
        .query("certificates")
        .withIndex("by_share_token", (q) =>
          q.eq("shareToken", claimed.shareToken)
        )
        .unique()
    );
    expect(cert!.score).toBe(80);
  });

  it("claim requires authentication", async () => {
    const t = convexTest(schema, modules);
    const { quizId } = await setup(t);
    await expect(
      t.mutation(api.certificates.claimMyCertificate, { quizId })
    ).rejects.toThrow(/not authenticated/i);
  });
});

// ─── Anonymous share lookup (public endpoint) ───────────────────────

describe("getCertificateByShareToken", () => {
  it("returns only whitelisted display fields to anonymous callers", async () => {
    const t = convexTest(schema, modules);
    const { clientId, quizId, questionId } = await setup(t);

    const result = await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      });

    // No identity — the public share page / unfurl bot path
    const cert = await t.query(api.certificates.getCertificateByShareToken, {
      shareToken: result.certificate!.shareToken,
    });

    expect(cert).toEqual({
      recipientName: "Casey Learner",
      quizTitle: "Comprehension Check",
      targetTitle: "Judges Training Video",
      score: 100,
      passingScore: 70,
      issuedAt: expect.any(Number),
    });
    // Explicitly no identifiers that could be used to reach other records
    expect(cert).not.toHaveProperty("userId");
    expect(cert).not.toHaveProperty("attemptId");
    expect(cert).not.toHaveProperty("quizId");
    expect(cert).not.toHaveProperty("shareToken");
  });

  it("returns null for an unknown token", async () => {
    const t = convexTest(schema, modules);
    const cert = await t.query(api.certificates.getCertificateByShareToken, {
      shareToken: "f".repeat(64),
    });
    expect(cert).toBeNull();
  });
});

// ─── Learner payload & own-certificate queries ──────────────────────

describe("certificate exposure in learner queries", () => {
  it("quiz payload carries the certificate token after a pass", async () => {
    const t = convexTest(schema, modules);
    const { clientId, quizId, questionId, contentId } = await setup(t);
    const asClient = t.withIdentity({ subject: clientId });

    const before = await asClient.query(api.quizzes.getQuizForContent, {
      contentId,
    });
    expect(before!.status.certificate).toBeNull();

    await asClient.mutation(api.quizzes.submitQuizAttempt, {
      quizId,
      answers: [{ questionId, selectedOptionIds: ["a"] }],
    });

    const after = await asClient.query(api.quizzes.getQuizForContent, {
      contentId,
    });
    expect(after!.status.certificate).toMatchObject({
      shareToken: expect.stringMatching(/^[0-9a-f]{64}$/),
    });
  });

  it("getMyCertificates lists only the caller's own certificates", async () => {
    const t = convexTest(schema, modules);
    const { clientId, quizId, questionId } = await setup(t);
    const otherId = await seedUser(t, "client", "other@test.local");

    await t
      .withIdentity({ subject: clientId })
      .mutation(api.quizzes.submitQuizAttempt, {
        quizId,
        answers: [{ questionId, selectedOptionIds: ["a"] }],
      });

    const own = await t
      .withIdentity({ subject: clientId })
      .query(api.certificates.getMyCertificates, {});
    expect(own).toHaveLength(1);
    expect(own[0].quizTitle).toBe("Comprehension Check");

    const others = await t
      .withIdentity({ subject: otherId })
      .query(api.certificates.getMyCertificates, {});
    expect(others).toHaveLength(0);

    const anonymous = await t.query(api.certificates.getMyCertificates, {});
    expect(anonymous).toHaveLength(0);
  });
});
