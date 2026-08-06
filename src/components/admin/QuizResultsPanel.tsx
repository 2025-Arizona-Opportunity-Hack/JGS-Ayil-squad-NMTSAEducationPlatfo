import { useEffect, useState } from "react";
import { useQuery } from "convex/react";
import { format } from "date-fns";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ArrowLeft, CheckCircle2, Users, XCircle } from "lucide-react";

interface QuizResultsPanelProps {
  quizId: Id<"quizzes"> | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function QuizResultsPanel({ quizId, open, onOpenChange }: QuizResultsPanelProps) {
  const results = useQuery(
    api.quizzes.getQuizResults,
    open && quizId ? { quizId } : "skip"
  );
  const [selectedUser, setSelectedUser] = useState<{
    userId: Id<"users">;
    userName: string;
  } | null>(null);
  const attempts = useQuery(
    api.quizzes.getUserAttempts,
    open && quizId && selectedUser
      ? { quizId, userId: selectedUser.userId }
      : "skip"
  );

  // Reset the drill-down whenever the panel closes or switches quizzes
  useEffect(() => {
    setSelectedUser(null);
  }, [quizId, open]);

  const passedIndicator = (passed: boolean) =>
    passed ? (
      <span className="inline-flex items-center gap-1 text-green-700">
        <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
        Passed
      </span>
    ) : (
      <span className="inline-flex items-center gap-1 text-muted-foreground">
        <XCircle className="w-4 h-4" aria-hidden="true" />
        Not passed
      </span>
    );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {results ? `Results — ${results.title}` : "Quiz Results"}
          </DialogTitle>
          <DialogDescription>
            {results
              ? `Passing score: ${results.passingScore}%`
              : "Learner attempts and outcomes for this quiz"}
          </DialogDescription>
        </DialogHeader>

        {results === undefined ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-2 border-primary border-t-transparent" />
          </div>
        ) : results === null ? (
          <p className="text-sm text-muted-foreground py-4">
            This quiz no longer exists.
          </p>
        ) : selectedUser ? (
          /* Drill-down: one learner's attempts */
          <div className="space-y-3">
            <Button variant="ghost" size="sm" onClick={() => setSelectedUser(null)}>
              <ArrowLeft className="w-4 h-4 mr-1" />
              All results
            </Button>
            <h3 className="text-sm font-semibold">
              {selectedUser.userName}'s attempts
            </h3>
            {attempts === undefined ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-6 w-6 border-2 border-primary border-t-transparent" />
              </div>
            ) : attempts.length === 0 ? (
              <p className="text-sm text-muted-foreground">No attempts recorded.</p>
            ) : (
              <ul className="space-y-2" role="list">
                {attempts.map((attempt) => (
                  <li key={attempt._id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between flex-wrap gap-2">
                      <div className="flex items-center gap-3">
                        <span className="text-sm font-medium">
                          Attempt {attempt.attemptNumber}
                        </span>
                        <span className="text-sm">{passedIndicator(attempt.passed)}</span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(attempt.submittedAt), "MMM d, yyyy 'at' h:mm a")}
                      </span>
                    </div>
                    <p className="text-sm mt-1">
                      Score {attempt.score}% — {attempt.pointsEarned}/
                      {attempt.pointsPossible} points —{" "}
                      {attempt.answers.filter((a) => a.correct).length} of{" "}
                      {attempt.answers.length} questions correct
                    </p>
                    {attempt.learnerFeedback && (
                      <div className="mt-2 p-2 bg-muted rounded-lg">
                        <p className="text-xs text-muted-foreground mb-0.5">
                          Learner feedback
                          {attempt.learnerFeedbackAt
                            ? ` — ${format(new Date(attempt.learnerFeedbackAt), "MMM d, yyyy")}`
                            : ""}
                        </p>
                        <p className="text-sm whitespace-pre-wrap">
                          {attempt.learnerFeedback}
                        </p>
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        ) : results.results.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 space-y-3">
            <Users className="w-12 h-12 text-muted-foreground" />
            <p className="text-sm text-muted-foreground">
              No one has taken this quiz yet.
            </p>
          </div>
        ) : (
          /* Summary + per-learner table */
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              {results.results.filter((r) => r.passed).length} of{" "}
              {results.results.length} participant
              {results.results.length === 1 ? "" : "s"} passed
            </p>
            <div className="rounded-lg border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Learner</TableHead>
                    <TableHead className="text-right">Attempts</TableHead>
                    <TableHead className="text-right">Best Score</TableHead>
                    <TableHead>Result</TableHead>
                    <TableHead className="text-right">Attempts to Pass</TableHead>
                    <TableHead>Last Attempt</TableHead>
                    <TableHead>Feedback</TableHead>
                    <TableHead>
                      <span className="sr-only">View attempts</span>
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {results.results.map((row) => (
                    <TableRow
                      key={row.userId}
                      className="cursor-pointer"
                      onClick={() =>
                        setSelectedUser({ userId: row.userId, userName: row.userName })
                      }
                    >
                      <TableCell className="font-medium">{row.userName}</TableCell>
                      <TableCell className="text-right">{row.attemptCount}</TableCell>
                      <TableCell className="text-right">{row.bestScore}%</TableCell>
                      <TableCell className="text-sm">
                        {passedIndicator(row.passed)}
                      </TableCell>
                      <TableCell className="text-right">
                        {row.attemptsToPass ?? "—"}
                      </TableCell>
                      <TableCell className="text-sm">
                        {format(new Date(row.lastAttemptAt), "MMM d, yyyy h:mm a")}
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        {row.learnerFeedback ? (
                          <span
                            className="block truncate text-sm"
                            title={row.learnerFeedback}
                          >
                            {row.learnerFeedback}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUser({
                              userId: row.userId,
                              userName: row.userName,
                            });
                          }}
                          aria-label={`View attempts for ${row.userName}`}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
