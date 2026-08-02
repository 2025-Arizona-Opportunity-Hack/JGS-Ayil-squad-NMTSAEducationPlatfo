import { useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { QuizEditorModal } from "./QuizEditorModal";
import { QuizResultsPanel } from "./QuizResultsPanel";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
  BarChart3,
  ClipboardCheck,
  Pencil,
  Plus,
  Power,
  PowerOff,
  Trash2,
} from "lucide-react";

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

export function QuizManagement() {
  const quizzes = useQuery(api.quizzes.listQuizzes);
  const updateQuiz = useMutation(api.quizzes.updateQuiz);
  const deleteQuiz = useMutation(api.quizzes.deleteQuiz);

  const [editorOpen, setEditorOpen] = useState(false);
  const [editingQuizId, setEditingQuizId] = useState<Id<"quizzes"> | null>(null);
  const [resultsQuizId, setResultsQuizId] = useState<Id<"quizzes"> | null>(null);
  const [deletingQuiz, setDeletingQuiz] = useState<{
    _id: Id<"quizzes">;
    title: string;
  } | null>(null);
  const [togglingId, setTogglingId] = useState<Id<"quizzes"> | null>(null);

  const openCreate = () => {
    setEditingQuizId(null);
    setEditorOpen(true);
  };

  const openEdit = (quizId: Id<"quizzes">) => {
    setEditingQuizId(quizId);
    setEditorOpen(true);
  };

  const handleToggleActive = async (quiz: {
    _id: Id<"quizzes">;
    isActive: boolean;
  }) => {
    setTogglingId(quiz._id);
    try {
      await updateQuiz({ quizId: quiz._id, isActive: !quiz.isActive });
      toast.success(quiz.isActive ? "Quiz deactivated" : "Quiz activated");
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setTogglingId(null);
    }
  };

  const handleDelete = async () => {
    if (!deletingQuiz) return;
    try {
      await deleteQuiz({ quizId: deletingQuiz._id });
      toast.success("Quiz deleted");
    } catch (error) {
      // Surfaces the backend's "deactivate instead" message when attempts exist
      toast.error(getErrorMessage(error));
    } finally {
      setDeletingQuiz(null);
    }
  };

  if (quizzes === undefined) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Quizzes</h2>
          <p className="text-muted-foreground mt-2">
            Author quizzes for content and bundles, and review learner results
          </p>
        </div>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" />
          New Quiz
        </Button>
      </div>

      {quizzes.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-12 space-y-4">
          <ClipboardCheck className="w-16 h-16 text-muted-foreground" />
          <div className="text-center max-w-md">
            <h3 className="text-lg font-semibold">No quizzes yet</h3>
            <p className="text-sm text-muted-foreground mt-1">
              Create a quiz and attach it to a content item or bundle. Learners take it
              after viewing the content, and their scores show up here.
            </p>
          </div>
          <Button onClick={openCreate}>
            <Plus className="w-4 h-4 mr-1" />
            New Quiz
          </Button>
        </div>
      ) : (
        <div className="rounded-lg border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Quiz</TableHead>
                <TableHead>Attached to</TableHead>
                <TableHead className="text-right">Questions</TableHead>
                <TableHead className="text-right">Passed / Participants</TableHead>
                <TableHead className="text-right">Passing Score</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {quizzes.map((quiz) => (
                <TableRow key={quiz._id}>
                  <TableCell>
                    <p className="font-medium">{quiz.title}</p>
                    {quiz.description && (
                      <p className="text-xs text-muted-foreground line-clamp-1">
                        {quiz.description}
                      </p>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">
                        {quiz.targetType === "content" ? "Content" : "Bundle"}
                      </Badge>
                      <span className="text-sm">{quiz.targetTitle}</span>
                    </div>
                  </TableCell>
                  <TableCell className="text-right">{quiz.questionCount}</TableCell>
                  <TableCell className="text-right">
                    {quiz.passedCount} / {quiz.participantCount}
                  </TableCell>
                  <TableCell className="text-right">{quiz.passingScore}%</TableCell>
                  <TableCell>
                    {quiz.isActive ? (
                      <Badge className="bg-green-600 hover:bg-green-600">Active</Badge>
                    ) : (
                      <Badge variant="secondary">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => openEdit(quiz._id)}
                        aria-label={`Edit quiz ${quiz.title}`}
                      >
                        <Pencil className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setResultsQuizId(quiz._id)}
                        aria-label={`View results for ${quiz.title}`}
                      >
                        <BarChart3 className="w-4 h-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleToggleActive(quiz)}
                        disabled={togglingId === quiz._id}
                        aria-label={
                          quiz.isActive
                            ? `Deactivate quiz ${quiz.title}`
                            : `Activate quiz ${quiz.title}`
                        }
                      >
                        {quiz.isActive ? (
                          <PowerOff className="w-4 h-4" />
                        ) : (
                          <Power className="w-4 h-4" />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() =>
                          setDeletingQuiz({ _id: quiz._id, title: quiz.title })
                        }
                        aria-label={`Delete quiz ${quiz.title}`}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <QuizEditorModal
        open={editorOpen}
        onOpenChange={setEditorOpen}
        quizId={editingQuizId}
        onCreated={setEditingQuizId}
      />

      <QuizResultsPanel
        quizId={resultsQuizId}
        open={resultsQuizId !== null}
        onOpenChange={(isOpen) => !isOpen && setResultsQuizId(null)}
      />

      <AlertDialog
        open={deletingQuiz !== null}
        onOpenChange={(isOpen) => !isOpen && setDeletingQuiz(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete "{deletingQuiz?.title}"?</AlertDialogTitle>
            <AlertDialogDescription>
              This permanently removes the quiz and its questions. Quizzes with recorded
              attempts can't be deleted — deactivate them instead so results stay
              available.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
