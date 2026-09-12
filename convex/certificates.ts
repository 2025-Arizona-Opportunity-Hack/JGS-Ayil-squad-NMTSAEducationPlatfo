/**
 * Quiz pass certificates.
 *
 * Security invariants (see CLAUDE.md and certificates.test.ts):
 * - Issuance is server-side only: a certificate row is derived from a graded
 *   passing quizAttempt. The client never supplies names, scores, or tokens.
 *   submitQuizAttempt auto-issues on a pass; claimMyCertificate exists for
 *   passes recorded before this feature shipped and re-validates the passing
 *   attempt itself.
 * - getCertificateByShareToken is deliberately anonymous-callable (the public
 *   /certificate/:token page and api/meta.ts unfurl bots use it) and returns
 *   an explicit whitelist — never the userId, attemptId, attempt answers, or
 *   any quiz internals. It does include attempt COUNTS for the (quiz, user)
 *   behind the certificate (attemptCount / attemptsToPass) so a verifier
 *   holding the share link — e.g. OHack's judge review — can see how many
 *   tries the pass took without an LMS admin role.
 */
import { ConvexError, v } from "convex/values";
import { mutation, query, MutationCtx } from "./_generated/server";
import { getAuthUserId } from "./externalAuth";
import { Doc, Id } from "./_generated/dataModel";
import { requireAuth, getUserProfile, formatUserName } from "./helpers";

function generateShareToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, (byte) => byte.toString(16).padStart(2, "0")).join(
    ""
  );
}

/**
 * Issue a certificate for a passing attempt, or return the one already
 * issued for this (quiz, user). Never issues on a failed attempt. Called
 * from submitQuizAttempt (auto-issue) and claimMyCertificate — keep this
 * the single copy of issuance logic.
 */
export async function issueCertificateIfNeeded(
  ctx: MutationCtx,
  quiz: Doc<"quizzes">,
  userId: Id<"users">,
  attempt: { _id: Id<"quizAttempts">; score: number; passed: boolean }
): Promise<Doc<"certificates"> | null> {
  if (!attempt.passed) return null;

  const existing = await ctx.db
    .query("certificates")
    .withIndex("by_quiz_user", (q) =>
      q.eq("quizId", quiz._id).eq("userId", userId)
    )
    .unique();
  if (existing) return existing;

  const profile = await getUserProfile(ctx, userId);
  let targetTitle: string | undefined;
  if (quiz.contentId) {
    targetTitle = (await ctx.db.get(quiz.contentId))?.title;
  } else if (quiz.groupId) {
    targetTitle = (await ctx.db.get(quiz.groupId))?.name;
  }

  const certificateId = await ctx.db.insert("certificates", {
    quizId: quiz._id,
    userId,
    attemptId: attempt._id,
    shareToken: generateShareToken(),
    recipientName: formatUserName(profile),
    quizTitle: quiz.title,
    targetTitle,
    score: attempt.score,
    passingScore: quiz.passingScore,
    issuedAt: Date.now(),
  });
  return await ctx.db.get(certificateId);
}

/**
 * Retroactive issuance for learners who passed before certificates existed.
 * Validates the passing attempt server-side; idempotent per (quiz, user).
 */
export const claimMyCertificate = mutation({
  args: { quizId: v.id("quizzes") },
  handler: async (ctx, args) => {
    const { userId } = await requireAuth(ctx);
    const quiz = await ctx.db.get(args.quizId);
    if (!quiz) throw new ConvexError("Quiz not found");

    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz_user", (q) =>
        q.eq("quizId", args.quizId).eq("userId", userId)
      )
      .collect();
    const firstPass = attempts
      .sort((a, b) => a.attemptNumber - b.attemptNumber)
      .find((a) => a.passed);
    if (!firstPass) {
      throw new ConvexError("Pass the quiz to earn a certificate");
    }

    const certificate = await issueCertificateIfNeeded(
      ctx,
      quiz,
      userId,
      firstPass
    );
    return { shareToken: certificate!.shareToken };
  },
});

/** The caller's own certificates, newest first — shown in the profile. */
export const getMyCertificates = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const certificates = await ctx.db
      .query("certificates")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .order("desc")
      .take(100);
    return certificates.map((c) => ({
      _id: c._id,
      quizTitle: c.quizTitle,
      targetTitle: c.targetTitle ?? null,
      score: c.score,
      issuedAt: c.issuedAt,
      shareToken: c.shareToken,
    }));
  },
});

/**
 * Anonymous verification lookup for a shared certificate. Whitelist only —
 * this is a public endpoint reachable with nothing but the token.
 *
 * attemptCount = every attempt this learner made on this quiz (including any
 * after the pass); attemptsToPass = the attemptNumber of the attempt that
 * earned the certificate. Counts only — never the attempts themselves.
 */
export const getCertificateByShareToken = query({
  args: { shareToken: v.string() },
  handler: async (ctx, args) => {
    const certificate = await ctx.db
      .query("certificates")
      .withIndex("by_share_token", (q) => q.eq("shareToken", args.shareToken))
      .unique();
    if (!certificate) return null;

    const attempts = await ctx.db
      .query("quizAttempts")
      .withIndex("by_quiz_user", (q) =>
        q.eq("quizId", certificate.quizId).eq("userId", certificate.userId)
      )
      .collect();
    const passingAttempt = await ctx.db.get(certificate.attemptId);
    const firstPass = attempts
      .filter((a) => a.passed)
      .sort((a, b) => a.attemptNumber - b.attemptNumber)[0];

    return {
      recipientName: certificate.recipientName,
      quizTitle: certificate.quizTitle,
      targetTitle: certificate.targetTitle ?? null,
      score: certificate.score,
      passingScore: certificate.passingScore,
      issuedAt: certificate.issuedAt,
      attemptCount: attempts.length,
      attemptsToPass:
        passingAttempt?.attemptNumber ?? firstPass?.attemptNumber ?? null,
    };
  },
});
