import { useMemo, useRef, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import {
  CheckCircle2,
  XCircle,
  Lock,
  ClipboardCheck,
  RotateCcw,
} from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

interface QuizPanelProps {
  contentId?: Id<"content">;
  groupId?: Id<"contentGroups">;
}

interface SubmitResult {
  attemptId: Id<"quizAttempts">;
  attemptNumber: number;
  score: number;
  passed: boolean;
  pointsEarned: number;
  pointsPossible: number;
  passingScore: number;
  results:
    | null
    | Array<{
        questionId: Id<"quizQuestions">;
        correct: boolean;
        correctOptionIds?: string[];
        explanation?: string | null;
      }>;
}

function formatDate(timestamp: number) {
  return new Date(timestamp).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/**
 * Learner-facing quiz: renders below content (or on the bundle page),
 * collects answers, submits for server-side grading, and shows results +
 * attempt history. Renders nothing when there is no quiz for the target or
 * the viewer isn't entitled to it (the query returns null for both).
 */
export function QuizPanel({ contentId, groupId }: QuizPanelProps) {
  const quiz = useQuery(
    contentId ? api.quizzes.getQuizForContent : api.quizzes.getQuizForBundle,
    contentId ? { contentId } : groupId ? { groupId } : "skip"
  );
  const attempts = useQuery(
    api.quizzes.getMyAttempts,
    quiz ? { quizId: quiz.quizId } : "skip"
  );
  const submitAttempt = useMutation(api.quizzes.submitQuizAttempt);
  const setFeedback = useMutation(api.quizzes.setMyAttemptFeedback);

  const [taking, setTaking] = useState(false);
  const [selections, setSelections] = useState<Record<string, string[]>>({});
  const [submitting, setSubmitting] = useState(false);
  const [result, setResult] = useState<SubmitResult | null>(null);
  const [feedbackText, setFeedbackText] = useState("");
  const [feedbackSent, setFeedbackSent] = useState(false);
  const resultHeadingRef = useRef<HTMLHeadingElement | null>(null);

  const questionById = useMemo(() => {
    const map = new Map<
      string,
      NonNullable<typeof quiz>["questions"][number]
    >();
    for (const question of quiz?.questions ?? []) {
      map.set(question._id, question);
    }
    return map;
  }, [quiz]);

  if (!quiz) return null;

  const { status } = quiz;
  const attemptList = attempts ?? [];

  const selectOption = (
    questionId: string,
    optionId: string,
    kind: "single" | "multi" | "trueFalse"
  ) => {
    setSelections((prev) => {
      if (kind === "multi") {
        const current = new Set(prev[questionId] ?? []);
        if (current.has(optionId)) {
          current.delete(optionId);
        } else {
          current.add(optionId);
        }
        return { ...prev, [questionId]: [...current] };
      }
      return { ...prev, [questionId]: [optionId] };
    });
  };

  const answeredCount = quiz.questions.filter(
    (q) => (selections[q._id] ?? []).length > 0
  ).length;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    try {
      const submitted = await submitAttempt({
        quizId: quiz.quizId,
        answers: quiz.questions.map((question) => ({
          questionId: question._id,
          selectedOptionIds: selections[question._id] ?? [],
        })),
      });
      setResult(submitted as SubmitResult);
      setTaking(false);
      setFeedbackText("");
      setFeedbackSent(false);
      // Move focus to the result so screen readers announce the outcome
      requestAnimationFrame(() => resultHeadingRef.current?.focus());
    } catch (error) {
      const message =
        error instanceof Error && "data" in error
          ? String((error as { data: unknown }).data)
          : "Could not submit the quiz. Please try again.";
      toast.error(message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleSendFeedback = async () => {
    if (!result || !feedbackText.trim()) return;
    try {
      await setFeedback({
        attemptId: result.attemptId,
        feedback: feedbackText.trim(),
      });
      setFeedbackSent(true);
      toast.success("Thanks — your feedback was sent.");
    } catch {
      toast.error("Could not send feedback. Please try again.");
    }
  };

  const startAttempt = () => {
    setResult(null);
    setSelections({});
    setTaking(true);
  };

  const canAttempt =
    !status.locked &&
    (status.attemptsRemaining === null || status.attemptsRemaining > 0);

  const resultById = new Map(
    (result?.results ?? []).map((r) => [r.questionId as string, r])
  );

  return (
    <Card className="mb-6 sm:mb-10 shadow-sm rounded-lg sm:rounded-xl border">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <ClipboardCheck className="w-5 h-5 text-primary" aria-hidden="true" />
          {quiz.title}
        </CardTitle>
        {quiz.description && (
          <CardDescription>{quiz.description}</CardDescription>
        )}
      </CardHeader>
      <CardContent className="px-4 sm:px-6 space-y-6">
        {/* Status summary */}
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">
            {quiz.questionCount}{" "}
            {quiz.questionCount === 1 ? "question" : "questions"}
          </Badge>
          <Badge variant="secondary">{quiz.passingScore}% to pass</Badge>
          {quiz.maxAttempts !== null && (
            <Badge variant="secondary">
              {status.attemptsRemaining} of {quiz.maxAttempts}{" "}
              {quiz.maxAttempts === 1 ? "attempt" : "attempts"} left
            </Badge>
          )}
          {status.passed && (
            <Badge className="gap-1 bg-green-600 hover:bg-green-600 text-white">
              <CheckCircle2 className="w-3 h-3" aria-hidden="true" />
              Passed
            </Badge>
          )}
        </div>

        {/* Locked state */}
        {status.locked && (
          <div
            className="flex items-start gap-3 rounded-lg border bg-muted/40 p-4"
            role="status"
          >
            <Lock
              className="w-5 h-5 text-muted-foreground mt-0.5"
              aria-hidden="true"
            />
            <div>
              <p className="font-medium">
                {status.lockReason === "content_not_completed"
                  ? "Finish the content to unlock this quiz"
                  : "No attempts remaining"}
              </p>
              <p className="text-sm text-muted-foreground mt-1">
                {status.lockReason === "content_not_completed"
                  ? "Watch or read the material above first, then come back to check your understanding."
                  : "You've used all your attempts. Your best score is shown in your attempt history below."}
              </p>
            </div>
          </div>
        )}

        {/* Result announcement */}
        <div aria-live="polite">
          {result && (
            <div
              className={`rounded-lg border p-4 ${
                result.passed
                  ? "border-green-600/40 bg-green-600/5"
                  : "border-destructive/40 bg-destructive/5"
              }`}
            >
              <h3
                ref={resultHeadingRef}
                tabIndex={-1}
                className="flex items-center gap-2 text-lg font-semibold outline-none"
              >
                {result.passed ? (
                  <>
                    <CheckCircle2
                      className="w-5 h-5 text-green-600"
                      aria-hidden="true"
                    />
                    You passed — {result.score}%
                  </>
                ) : (
                  <>
                    <XCircle
                      className="w-5 h-5 text-destructive"
                      aria-hidden="true"
                    />
                    Not passed — {result.score}%
                  </>
                )}
              </h3>
              <p className="text-sm text-muted-foreground mt-1">
                {result.pointsEarned} of {result.pointsPossible} points ·{" "}
                {result.passingScore}% needed to pass · attempt{" "}
                {result.attemptNumber}
              </p>

              {/* Per-question review (when the quiz reveals it) */}
              {result.results && (
                <ul className="mt-4 space-y-3">
                  {result.results.map((r, index) => {
                    const question = questionById.get(r.questionId as string);
                    return (
                      <li key={r.questionId} className="text-sm">
                        <div className="flex items-start gap-2">
                          {r.correct ? (
                            <CheckCircle2
                              className="w-4 h-4 text-green-600 mt-0.5 shrink-0"
                              aria-hidden="true"
                            />
                          ) : (
                            <XCircle
                              className="w-4 h-4 text-destructive mt-0.5 shrink-0"
                              aria-hidden="true"
                            />
                          )}
                          <div>
                            <span className="font-medium">
                              {question?.prompt ?? `Question ${index + 1}`}
                            </span>{" "}
                            <span
                              className={
                                r.correct
                                  ? "text-green-700 dark:text-green-500"
                                  : "text-destructive"
                              }
                            >
                              — {r.correct ? "correct" : "incorrect"}
                            </span>
                            {r.correctOptionIds && question && (
                              <p className="text-muted-foreground mt-0.5">
                                Correct answer:{" "}
                                {question.options
                                  .filter((o) =>
                                    r.correctOptionIds!.includes(o.id)
                                  )
                                  .map((o) => o.text)
                                  .join(", ")}
                              </p>
                            )}
                            {r.explanation && (
                              <p className="text-muted-foreground mt-0.5">
                                {r.explanation}
                              </p>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}

              {/* Learner -> staff feedback */}
              <div className="mt-4 space-y-2">
                {feedbackSent ? (
                  <p className="text-sm text-muted-foreground" role="status">
                    Feedback sent — thank you!
                  </p>
                ) : (
                  <>
                    <Label htmlFor={`quiz-feedback-${quiz.quizId}`}>
                      Any feedback for us? (optional)
                    </Label>
                    <Textarea
                      id={`quiz-feedback-${quiz.quizId}`}
                      value={feedbackText}
                      onChange={(e) => setFeedbackText(e.target.value)}
                      placeholder="Tell us what was unclear, too easy, or missing…"
                      rows={3}
                      maxLength={5000}
                    />
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={!feedbackText.trim()}
                      onClick={() => void handleSendFeedback()}
                    >
                      Send feedback
                    </Button>
                  </>
                )}
              </div>

              {canAttempt && !result.passed && (
                <Button
                  type="button"
                  className="mt-4"
                  onClick={startAttempt}
                >
                  <RotateCcw className="w-4 h-4 mr-2" aria-hidden="true" />
                  Try again
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Intro / start */}
        {!taking && !result && !status.locked && canAttempt && (
          <Button type="button" onClick={startAttempt}>
            {status.attemptsUsed > 0 ? "Retake quiz" : "Start quiz"}
          </Button>
        )}

        {/* The quiz form */}
        {taking && (
          <form onSubmit={(e) => void handleSubmit(e)} className="space-y-6">
            {quiz.questions.map((question, index) => {
              const kind = question.kind;
              const selected = selections[question._id] ?? [];
              return (
                <fieldset
                  key={question._id}
                  className="rounded-lg border p-4"
                >
                  <legend className="font-medium px-1">
                    {index + 1}. {question.prompt}
                    {kind === "multi" && (
                      <span className="block text-xs font-normal text-muted-foreground mt-0.5">
                        Select all that apply
                      </span>
                    )}
                  </legend>
                  <div className="mt-2 space-y-2">
                    {question.options.map((option) => {
                      const inputId = `${question._id}-${option.id}`;
                      const checked = selected.includes(option.id);
                      return (
                        <label
                          key={option.id}
                          htmlFor={inputId}
                          className={`flex min-h-[44px] cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors ${
                            checked
                              ? "border-primary bg-primary/5"
                              : "hover:bg-muted/40"
                          }`}
                        >
                          <input
                            id={inputId}
                            type={kind === "multi" ? "checkbox" : "radio"}
                            name={question._id}
                            value={option.id}
                            checked={checked}
                            onChange={() =>
                              selectOption(question._id, option.id, kind)
                            }
                            className="h-4 w-4 shrink-0 accent-[hsl(var(--primary))]"
                          />
                          <span className="text-sm">{option.text}</span>
                        </label>
                      );
                    })}
                  </div>
                </fieldset>
              );
            })}
            <div className="flex flex-wrap items-center gap-3">
              <Button type="submit" disabled={submitting}>
                {submitting ? "Submitting…" : "Submit answers"}
              </Button>
              <span className="text-sm text-muted-foreground" role="status">
                {answeredCount} of {quiz.questions.length} answered
              </span>
            </div>
          </form>
        )}

        {/* Attempt history */}
        {attemptList.length > 0 && (
          <div>
            <h3 className="text-sm font-semibold mb-2">Your attempts</h3>
            <ul className="space-y-1.5">
              {attemptList.map((attempt) => (
                <li
                  key={attempt._id}
                  className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground"
                >
                  {attempt.passed ? (
                    <CheckCircle2
                      className="w-4 h-4 text-green-600 shrink-0"
                      aria-hidden="true"
                    />
                  ) : (
                    <XCircle
                      className="w-4 h-4 text-destructive shrink-0"
                      aria-hidden="true"
                    />
                  )}
                  <span>
                    Attempt {attempt.attemptNumber}: {attempt.score}% (
                    {attempt.passed ? "passed" : "not passed"}) ·{" "}
                    {formatDate(attempt.submittedAt)}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
