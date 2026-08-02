import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ArrowDown, ArrowUp, Check, Pencil, Plus, Trash2, X } from "lucide-react";

// Extract the underlying message from a Convex error. ConvexError thrown
// server-side surfaces here with `.data` as the clean string payload;
// `.message` includes wrapper noise. Prefer .data.
function getErrorMessage(error: unknown): string {
  if (error instanceof ConvexError && typeof error.data === "string") {
    return error.data;
  }
  if (error instanceof Error) return error.message;
  return "An unexpected error occurred";
}

type QuestionKind = "single" | "multi" | "trueFalse";
type RevealAnswers = "none" | "correctness" | "full";

const KIND_LABELS: Record<QuestionKind, string> = {
  single: "Single answer",
  multi: "Multiple answers",
  trueFalse: "True / False",
};

const REVEAL_OPTIONS: { value: RevealAnswers; label: string; hint: string }[] = [
  {
    value: "none",
    label: "Score only",
    hint: "Learners see their score, but not which answers were right",
  },
  {
    value: "correctness",
    label: "Right or wrong per question",
    hint: "Learners see which questions they missed, not the correct answers",
  },
  {
    value: "full",
    label: "Full answers",
    hint: "Learners see the correct answers and any explanations",
  },
];

const TRUE_FALSE_OPTIONS = [
  { id: "true", text: "True" },
  { id: "false", text: "False" },
];

interface QuestionDraft {
  questionId: Id<"quizQuestions"> | null;
  prompt: string;
  kind: QuestionKind;
  options: { id: string; text: string }[];
  correctOptionIds: string[];
  explanation: string;
  points: string;
}

const EMPTY_SETTINGS = {
  title: "",
  description: "",
  passingScore: "70",
  maxAttempts: "",
  shuffleQuestions: false,
  requireContentCompletion: false,
  revealAnswers: "correctness" as RevealAnswers,
};

/** First unused id in "a".."z" so ids stay stable when editing existing options. */
function nextOptionId(options: { id: string }[]): string {
  for (let i = 0; i < 26; i++) {
    const id = String.fromCharCode(97 + i);
    if (!options.some((o) => o.id === id)) return id;
  }
  return `o${Date.now().toString(36)}`;
}

function emptyDraft(): QuestionDraft {
  return {
    questionId: null,
    prompt: "",
    kind: "single",
    options: [
      { id: "a", text: "" },
      { id: "b", text: "" },
    ],
    correctOptionIds: [],
    explanation: "",
    points: "",
  };
}

// Client-side mirror of the server's validateQuestionShape, with friendlier
// messages. The server remains the authority.
function validateDraft(draft: QuestionDraft): string | null {
  if (!draft.prompt.trim()) return "Question prompt is required";
  if (draft.options.length < 2 || draft.options.length > 10) {
    return "Questions need between 2 and 10 options";
  }
  if (draft.options.some((o) => !o.text.trim())) return "Every option needs text";
  if (draft.correctOptionIds.length === 0) {
    return draft.kind === "multi"
      ? "Check at least one correct option"
      : "Select the correct option";
  }
  if (draft.kind !== "multi" && draft.correctOptionIds.length !== 1) {
    return "This question type needs exactly one correct option";
  }
  if (draft.points.trim() !== "") {
    const points = Number(draft.points);
    if (!Number.isFinite(points) || points <= 0) {
      return "Points must be a positive number";
    }
  }
  return null;
}

interface QuizEditorModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** null = create mode */
  quizId: Id<"quizzes"> | null;
  /** Called after a successful create so the parent can switch to edit mode. */
  onCreated?: (quizId: Id<"quizzes">) => void;
}

export function QuizEditorModal({ open, onOpenChange, quizId, onCreated }: QuizEditorModalProps) {
  const isCreate = quizId === null;
  const quiz = useQuery(api.quizzes.getQuizForEditing, quizId ? { quizId } : "skip");

  // Target pickers are only needed while creating.
  const contentList = useQuery(
    api.content.listContent,
    open && isCreate ? {} : "skip"
  );
  const bundleList = useQuery(
    api.contentGroups.listContentGroups,
    open && isCreate ? {} : "skip"
  );

  const createQuiz = useMutation(api.quizzes.createQuiz);
  const updateQuiz = useMutation(api.quizzes.updateQuiz);
  const addQuestion = useMutation(api.quizzes.addQuestion);
  const updateQuestion = useMutation(api.quizzes.updateQuestion);
  const deleteQuestion = useMutation(api.quizzes.deleteQuestion);
  const reorderQuestions = useMutation(api.quizzes.reorderQuestions);

  const [targetType, setTargetType] = useState<"content" | "bundle">("content");
  const [targetId, setTargetId] = useState("");
  const [settings, setSettings] = useState({ ...EMPTY_SETTINGS });
  const [draft, setDraft] = useState<QuestionDraft | null>(null);
  const [saving, setSaving] = useState(false);
  const [deletingQuestion, setDeletingQuestion] = useState<{
    id: Id<"quizQuestions">;
    prompt: string;
  } | null>(null);

  // Seed the form when the dialog opens or the quiz being edited changes
  // (including the create → edit transition right after createQuiz).
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!open) {
      seededFor.current = null;
      setDraft(null);
      return;
    }
    if (quizId === null) {
      if (seededFor.current !== "create") {
        seededFor.current = "create";
        setSettings({ ...EMPTY_SETTINGS });
        setTargetType("content");
        setTargetId("");
        setDraft(null);
      }
      return;
    }
    if (quiz && seededFor.current !== quizId) {
      seededFor.current = quizId;
      setSettings({
        title: quiz.title,
        description: quiz.description ?? "",
        passingScore: String(quiz.passingScore),
        maxAttempts: quiz.maxAttempts !== undefined ? String(quiz.maxAttempts) : "",
        shuffleQuestions: !!quiz.shuffleQuestions,
        requireContentCompletion: !!quiz.requireContentCompletion,
        revealAnswers: quiz.revealAnswers ?? "correctness",
      });
    }
  }, [open, quizId, quiz]);

  // Shared settings validation for create/update. Returns null on failure
  // (after toasting) or the parsed numeric values.
  const parseSettings = (): { passingScore: number; maxAttempts: number | null } | null => {
    if (!settings.title.trim()) {
      toast.error("Title is required");
      return null;
    }
    const passingScore = Number(settings.passingScore);
    if (!Number.isFinite(passingScore) || passingScore <= 0 || passingScore > 100) {
      toast.error("Passing score must be between 1 and 100");
      return null;
    }
    let maxAttempts: number | null = null;
    if (settings.maxAttempts.trim() !== "") {
      const parsed = Number(settings.maxAttempts);
      if (!Number.isInteger(parsed) || parsed < 1) {
        toast.error("Max attempts must be a positive whole number (or empty for unlimited)");
        return null;
      }
      maxAttempts = parsed;
    }
    return { passingScore, maxAttempts };
  };

  const handleCreate = async () => {
    const parsed = parseSettings();
    if (!parsed) return;
    if (!targetId) {
      toast.error(targetType === "content" ? "Choose a content item" : "Choose a bundle");
      return;
    }
    setSaving(true);
    try {
      const newQuizId = await createQuiz({
        title: settings.title.trim(),
        description: settings.description.trim() || undefined,
        contentId: targetType === "content" ? (targetId as Id<"content">) : undefined,
        groupId: targetType === "bundle" ? (targetId as Id<"contentGroups">) : undefined,
        passingScore: parsed.passingScore,
        maxAttempts: parsed.maxAttempts ?? undefined,
        shuffleQuestions: settings.shuffleQuestions,
        revealAnswers: settings.revealAnswers,
        requireContentCompletion: settings.requireContentCompletion,
      });
      toast.success("Quiz created — now add some questions");
      onCreated?.(newQuizId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleUpdateSettings = async () => {
    if (!quizId) return;
    const parsed = parseSettings();
    if (!parsed) return;
    setSaving(true);
    try {
      await updateQuiz({
        quizId,
        title: settings.title.trim(),
        description: settings.description.trim(),
        passingScore: parsed.passingScore,
        maxAttempts: parsed.maxAttempts,
        shuffleQuestions: settings.shuffleQuestions,
        revealAnswers: settings.revealAnswers,
        requireContentCompletion: settings.requireContentCompletion,
      });
      toast.success("Quiz settings saved");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  // ── Question draft helpers ──────────────────────────────────────────

  const setKind = (kind: QuestionKind) => {
    setDraft((d) => {
      if (!d) return d;
      if (kind === "trueFalse") {
        return {
          ...d,
          kind,
          options: TRUE_FALSE_OPTIONS.map((o) => ({ ...o })),
          correctOptionIds: d.correctOptionIds
            .filter((id) => id === "true" || id === "false")
            .slice(0, 1),
        };
      }
      return {
        ...d,
        kind,
        correctOptionIds:
          kind === "single" ? d.correctOptionIds.slice(0, 1) : d.correctOptionIds,
      };
    });
  };

  const setOptionText = (optionId: string, text: string) =>
    setDraft(
      (d) =>
        d && {
          ...d,
          options: d.options.map((o) => (o.id === optionId ? { ...o, text } : o)),
        }
    );

  const addOption = () =>
    setDraft(
      (d) =>
        d && {
          ...d,
          options: [...d.options, { id: nextOptionId(d.options), text: "" }],
        }
    );

  const removeOption = (optionId: string) =>
    setDraft(
      (d) =>
        d && {
          ...d,
          options: d.options.filter((o) => o.id !== optionId),
          correctOptionIds: d.correctOptionIds.filter((id) => id !== optionId),
        }
    );

  const toggleCorrect = (optionId: string, checked: boolean) =>
    setDraft(
      (d) =>
        d && {
          ...d,
          correctOptionIds: checked
            ? [...d.correctOptionIds, optionId]
            : d.correctOptionIds.filter((id) => id !== optionId),
        }
    );

  const handleSaveQuestion = async () => {
    if (!draft || !quizId) return;
    const error = validateDraft(draft);
    if (error) {
      toast.error(error);
      return;
    }
    const shared = {
      prompt: draft.prompt.trim(),
      kind: draft.kind,
      options: draft.options.map((o) => ({ id: o.id, text: o.text.trim() })),
      correctOptionIds: draft.correctOptionIds,
      points: draft.points.trim() === "" ? undefined : Number(draft.points),
    };
    setSaving(true);
    try {
      if (draft.questionId) {
        await updateQuestion({
          questionId: draft.questionId,
          ...shared,
          // Send the (possibly empty) string so clearing an explanation sticks
          explanation: draft.explanation.trim(),
        });
        toast.success("Question updated");
      } else {
        await addQuestion({
          quizId,
          ...shared,
          explanation: draft.explanation.trim() || undefined,
        });
        toast.success("Question added");
      }
      setDraft(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  const handleMoveQuestion = async (index: number, direction: -1 | 1) => {
    if (!quiz || !quizId) return;
    const ids = quiz.questions.map((q) => q._id);
    const swapWith = index + direction;
    if (swapWith < 0 || swapWith >= ids.length) return;
    [ids[index], ids[swapWith]] = [ids[swapWith], ids[index]];
    try {
      await reorderQuestions({ quizId, orderedQuestionIds: ids });
    } catch (error) {
      toast.error(getErrorMessage(error));
    }
  };

  const handleDeleteQuestion = async () => {
    if (!deletingQuestion) return;
    try {
      await deleteQuestion({ questionId: deletingQuestion.id });
      toast.success("Question deleted");
      if (draft?.questionId === deletingQuestion.id) setDraft(null);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingQuestion(null);
    }
  };

  // ── Derived data ────────────────────────────────────────────────────

  const targetOptions =
    targetType === "content"
      ? contentList
          ?.map((c) => ({ id: c._id as string, title: c.title }))
          .sort((a, b) => a.title.localeCompare(b.title))
      : bundleList
          ?.map((g) => ({ id: g._id as string, title: g.name }))
          .sort((a, b) => a.title.localeCompare(b.title));

  const loadingEdit = !isCreate && quiz === undefined;
  const missing = !isCreate && quiz === null;

  return (
    <>
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{isCreate ? "New Quiz" : "Edit Quiz"}</DialogTitle>
            <DialogDescription>
              {isCreate
                ? "Attach a quiz to a content item or bundle. You can add questions after creating it."
                : "Update quiz settings and manage its questions."}
            </DialogDescription>
          </DialogHeader>

          {loadingEdit ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
            </div>
          ) : missing ? (
            <p className="text-sm text-muted-foreground py-4">This quiz no longer exists.</p>
          ) : (
            <div className="space-y-4">
              {/* Target — only choosable at creation; immutable afterwards */}
              {isCreate ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="quiz-target-type">Attach to</Label>
                    <Select
                      value={targetType}
                      onValueChange={(value) => {
                        setTargetType(value as "content" | "bundle");
                        setTargetId("");
                      }}
                    >
                      <SelectTrigger id="quiz-target-type">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="content">Content item</SelectItem>
                        <SelectItem value="bundle">Bundle</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="quiz-target">
                      {targetType === "content" ? "Content" : "Bundle"}
                    </Label>
                    <Select value={targetId} onValueChange={setTargetId}>
                      <SelectTrigger id="quiz-target">
                        <SelectValue
                          placeholder={
                            targetOptions === undefined
                              ? "Loading..."
                              : targetType === "content"
                                ? "Choose content..."
                                : "Choose a bundle..."
                          }
                        />
                      </SelectTrigger>
                      <SelectContent>
                        {targetOptions?.length === 0 && (
                          <div className="px-2 py-1.5 text-sm text-muted-foreground">
                            Nothing available
                          </div>
                        )}
                        {targetOptions?.map((target) => (
                          <SelectItem key={target.id} value={target.id}>
                            {target.title}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ) : (
                quiz && (
                  <p className="text-sm text-muted-foreground">
                    Attached to{" "}
                    <Badge variant="outline">
                      {quiz.contentId ? "Content" : "Bundle"}
                    </Badge>{" "}
                    — the target can't be changed after creation.
                  </p>
                )
              )}

              {/* Settings */}
              <div className="space-y-2">
                <Label htmlFor="quiz-title">Title</Label>
                <Input
                  id="quiz-title"
                  value={settings.title}
                  onChange={(e) => setSettings((s) => ({ ...s, title: e.target.value }))}
                  placeholder="e.g. Module 1 knowledge check"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiz-description">Description (optional)</Label>
                <Textarea
                  id="quiz-description"
                  rows={2}
                  value={settings.description}
                  onChange={(e) => setSettings((s) => ({ ...s, description: e.target.value }))}
                  placeholder="Shown to learners before they start"
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="quiz-passing-score">Passing score (%)</Label>
                  <Input
                    id="quiz-passing-score"
                    type="number"
                    min={1}
                    max={100}
                    value={settings.passingScore}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, passingScore: e.target.value }))
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="quiz-max-attempts">Max attempts</Label>
                  <Input
                    id="quiz-max-attempts"
                    type="number"
                    min={1}
                    value={settings.maxAttempts}
                    onChange={(e) =>
                      setSettings((s) => ({ ...s, maxAttempts: e.target.value }))
                    }
                    placeholder="Unlimited"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiz-reveal">After submitting, learners see</Label>
                <Select
                  value={settings.revealAnswers}
                  onValueChange={(value) =>
                    setSettings((s) => ({ ...s, revealAnswers: value as RevealAnswers }))
                  }
                >
                  <SelectTrigger id="quiz-reveal">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {REVEAL_OPTIONS.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        <div className="flex flex-col items-start">
                          <span>{option.label}</span>
                          <span className="text-xs text-muted-foreground">{option.hint}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <Label htmlFor="quiz-shuffle">Shuffle questions</Label>
                  <p className="text-xs text-muted-foreground">
                    Each learner sees the questions in a different order
                  </p>
                </div>
                <Switch
                  id="quiz-shuffle"
                  checked={settings.shuffleQuestions}
                  onCheckedChange={(checked) =>
                    setSettings((s) => ({ ...s, shuffleQuestions: checked }))
                  }
                />
              </div>
              <div className="flex items-center justify-between gap-4 rounded-lg border p-3">
                <div>
                  <Label htmlFor="quiz-require-completion">Require content completion</Label>
                  <p className="text-xs text-muted-foreground">
                    Learners must finish the content (or every bundle item) before taking the quiz
                  </p>
                </div>
                <Switch
                  id="quiz-require-completion"
                  checked={settings.requireContentCompletion}
                  onCheckedChange={(checked) =>
                    setSettings((s) => ({ ...s, requireContentCompletion: checked }))
                  }
                />
              </div>

              {/* Questions — edit mode only */}
              {!isCreate && quiz && (
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-semibold">
                      Questions ({quiz.questions.length})
                    </h3>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setDraft(emptyDraft())}
                      disabled={draft !== null}
                    >
                      <Plus className="w-4 h-4 mr-1" />
                      Add Question
                    </Button>
                  </div>

                  {quiz.questions.length === 0 && !draft && (
                    <p className="text-sm text-muted-foreground">
                      No questions yet. Learners can't take the quiz until it has at least one.
                    </p>
                  )}

                  <ul className="space-y-2" role="list">
                    {quiz.questions.map((question, index) => (
                      <li key={question._id} className="rounded-lg border p-3">
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-medium text-muted-foreground">
                                Q{index + 1}
                              </span>
                              <Badge variant="secondary">{KIND_LABELS[question.kind]}</Badge>
                              <span className="text-xs text-muted-foreground">
                                {question.points ?? 1} pt{(question.points ?? 1) === 1 ? "" : "s"}
                              </span>
                            </div>
                            <p className="text-sm font-medium mt-1">{question.prompt}</p>
                            <ul className="mt-1 space-y-0.5" role="list">
                              {question.options.map((option) => {
                                const isCorrect = question.correctOptionIds.includes(option.id);
                                return (
                                  <li
                                    key={option.id}
                                    className={cn(
                                      "text-sm flex items-center gap-1.5",
                                      isCorrect ? "font-medium" : "text-muted-foreground"
                                    )}
                                  >
                                    {isCorrect ? (
                                      <Check className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
                                    ) : (
                                      <span className="w-3.5 shrink-0" aria-hidden="true" />
                                    )}
                                    <span>{option.text}</span>
                                    {isCorrect && (
                                      <span className="sr-only">(correct answer)</span>
                                    )}
                                  </li>
                                );
                              })}
                            </ul>
                            {question.explanation && (
                              <p className="text-xs text-muted-foreground mt-1">
                                Explanation: {question.explanation}
                              </p>
                            )}
                          </div>
                          <div className="flex flex-col gap-0.5 shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMoveQuestion(index, -1)}
                              disabled={index === 0}
                              aria-label={`Move question ${index + 1} up`}
                            >
                              <ArrowUp className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() => handleMoveQuestion(index, 1)}
                              disabled={index === quiz.questions.length - 1}
                              aria-label={`Move question ${index + 1} down`}
                            >
                              <ArrowDown className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setDraft({
                                  questionId: question._id,
                                  prompt: question.prompt,
                                  kind: question.kind,
                                  options: question.options.map((o) => ({ ...o })),
                                  correctOptionIds: [...question.correctOptionIds],
                                  explanation: question.explanation ?? "",
                                  points:
                                    question.points !== undefined ? String(question.points) : "",
                                })
                              }
                              aria-label={`Edit question ${index + 1}`}
                            >
                              <Pencil className="w-4 h-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-7 w-7"
                              onClick={() =>
                                setDeletingQuestion({
                                  id: question._id,
                                  prompt: question.prompt,
                                })
                              }
                              aria-label={`Delete question ${index + 1}`}
                            >
                              <Trash2 className="w-4 h-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>

                  {/* Question add/edit form */}
                  {draft && (
                    <div className="rounded-lg border bg-muted/40 p-4 space-y-4">
                      <h4 className="text-sm font-semibold">
                        {draft.questionId ? "Edit Question" : "New Question"}
                      </h4>
                      <div className="space-y-2">
                        <Label htmlFor="question-prompt">Prompt</Label>
                        <Textarea
                          id="question-prompt"
                          rows={2}
                          value={draft.prompt}
                          onChange={(e) =>
                            setDraft((d) => d && { ...d, prompt: e.target.value })
                          }
                          placeholder="What do you want to ask?"
                        />
                      </div>
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label htmlFor="question-kind">Question type</Label>
                          <Select
                            value={draft.kind}
                            onValueChange={(value) => setKind(value as QuestionKind)}
                          >
                            <SelectTrigger id="question-kind">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="single">Single answer</SelectItem>
                              <SelectItem value="multi">Multiple answers</SelectItem>
                              <SelectItem value="trueFalse">True / False</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-2">
                          <Label htmlFor="question-points">Points</Label>
                          <Input
                            id="question-points"
                            type="number"
                            min={1}
                            value={draft.points}
                            onChange={(e) =>
                              setDraft((d) => d && { ...d, points: e.target.value })
                            }
                            placeholder="1"
                          />
                        </div>
                      </div>
                      <fieldset className="space-y-2">
                        <legend className="text-sm font-medium mb-1">
                          Options —{" "}
                          {draft.kind === "multi"
                            ? "check every correct answer"
                            : "select the correct answer"}
                        </legend>
                        {draft.options.map((option, index) => (
                          <div key={option.id} className="flex items-center gap-2">
                            {draft.kind === "multi" ? (
                              <Checkbox
                                id={`option-correct-${option.id}`}
                                checked={draft.correctOptionIds.includes(option.id)}
                                onCheckedChange={(checked) =>
                                  toggleCorrect(option.id, checked === true)
                                }
                                aria-label={`Option ${index + 1} is a correct answer`}
                              />
                            ) : (
                              <input
                                type="radio"
                                name="question-correct-option"
                                id={`option-correct-${option.id}`}
                                className="h-4 w-4 accent-primary shrink-0"
                                checked={draft.correctOptionIds[0] === option.id}
                                onChange={() =>
                                  setDraft((d) => d && { ...d, correctOptionIds: [option.id] })
                                }
                                aria-label={`Option ${index + 1} is the correct answer`}
                              />
                            )}
                            {draft.kind === "trueFalse" ? (
                              <span className="flex-1 text-sm">{option.text}</span>
                            ) : (
                              <>
                                <Input
                                  value={option.text}
                                  onChange={(e) => setOptionText(option.id, e.target.value)}
                                  aria-label={`Option ${index + 1} text`}
                                  placeholder={`Option ${index + 1}`}
                                />
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon"
                                  className="h-8 w-8 shrink-0"
                                  onClick={() => removeOption(option.id)}
                                  disabled={draft.options.length <= 2}
                                  aria-label={`Remove option ${index + 1}`}
                                >
                                  <X className="w-4 h-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        ))}
                        {draft.kind !== "trueFalse" && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={addOption}
                            disabled={draft.options.length >= 10}
                          >
                            <Plus className="w-4 h-4 mr-1" />
                            Add Option
                          </Button>
                        )}
                      </fieldset>
                      <div className="space-y-2">
                        <Label htmlFor="question-explanation">Explanation (optional)</Label>
                        <Textarea
                          id="question-explanation"
                          rows={2}
                          value={draft.explanation}
                          onChange={(e) =>
                            setDraft((d) => d && { ...d, explanation: e.target.value })
                          }
                          placeholder='Shown to learners when answer reveal is "Full answers"'
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button variant="outline" onClick={() => setDraft(null)} disabled={saving}>
                          Cancel
                        </Button>
                        <Button onClick={handleSaveQuestion} disabled={saving}>
                          {draft.questionId ? "Save Question" : "Add Question"}
                        </Button>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            {isCreate ? (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                  Cancel
                </Button>
                <Button onClick={handleCreate} disabled={saving}>
                  {saving ? "Creating..." : "Create Quiz"}
                </Button>
              </>
            ) : (
              <>
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Close
                </Button>
                <Button onClick={handleUpdateSettings} disabled={saving || !quiz}>
                  {saving ? "Saving..." : "Save Settings"}
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Question delete confirmation */}
      <AlertDialog
        open={deletingQuestion !== null}
        onOpenChange={(isOpen) => !isOpen && setDeletingQuestion(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this question?</AlertDialogTitle>
            <AlertDialogDescription>
              "{deletingQuestion?.prompt}" will be removed from the quiz. If learners have
              already taken the quiz, the question is hidden instead so past attempts stay
              interpretable.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteQuestion}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
