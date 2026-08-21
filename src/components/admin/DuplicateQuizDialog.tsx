import { useEffect, useRef, useState } from "react";
import { useMutation, useQuery } from "convex/react";
import { ConvexError } from "convex/values";
import { toast } from "sonner";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

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

interface DuplicateQuizDialogProps {
  /** null = closed */
  quiz: { _id: Id<"quizzes">; title: string } | null;
  onOpenChange: (open: boolean) => void;
  onDuplicated: (newQuizId: Id<"quizzes">) => void;
}

export function DuplicateQuizDialog({
  quiz,
  onOpenChange,
  onDuplicated,
}: DuplicateQuizDialogProps) {
  const open = quiz !== null;

  const contentList = useQuery(api.content.listContent, open ? {} : "skip");
  const bundleList = useQuery(
    api.contentGroups.listContentGroups,
    open ? {} : "skip"
  );
  const duplicateQuiz = useMutation(api.quizzes.duplicateQuiz);

  const [targetType, setTargetType] = useState<"content" | "bundle">("content");
  const [targetId, setTargetId] = useState("");
  const [title, setTitle] = useState("");
  const [saving, setSaving] = useState(false);

  // Seed the form each time the dialog opens for a (possibly different) quiz.
  const seededFor = useRef<string | null>(null);
  useEffect(() => {
    if (!quiz) {
      seededFor.current = null;
      return;
    }
    if (seededFor.current !== quiz._id) {
      seededFor.current = quiz._id;
      setTitle(`Copy of ${quiz.title}`);
      setTargetType("content");
      setTargetId("");
    }
  }, [quiz]);

  const targetOptions =
    targetType === "content"
      ? contentList
          ?.map((c) => ({ id: c._id as string, title: c.title }))
          .sort((a, b) => a.title.localeCompare(b.title))
      : bundleList
          ?.map((g) => ({ id: g._id as string, title: g.name }))
          .sort((a, b) => a.title.localeCompare(b.title));

  const handleDuplicate = async () => {
    if (!quiz) return;
    if (!title.trim()) {
      toast.error("Title is required");
      return;
    }
    if (!targetId) {
      toast.error(
        targetType === "content" ? "Choose a content item" : "Choose a bundle"
      );
      return;
    }
    setSaving(true);
    try {
      const newQuizId = await duplicateQuiz({
        sourceQuizId: quiz._id,
        contentId:
          targetType === "content" ? (targetId as Id<"content">) : undefined,
        groupId:
          targetType === "bundle" ? (targetId as Id<"contentGroups">) : undefined,
        title: title.trim(),
      });
      toast.success("Quiz duplicated — review it, then activate it when ready");
      onDuplicated(newQuizId);
    } catch (error) {
      toast.error(getErrorMessage(error));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Duplicate Quiz</DialogTitle>
          <DialogDescription>
            Copies "{quiz?.title}" and its questions to a new target. The copy
            starts inactive — activate it when it's ready for learners.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="dup-quiz-title">Title</Label>
            <Input
              id="dup-quiz-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
            />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="dup-target-type">Attach to</Label>
              <Select
                value={targetType}
                onValueChange={(value) => {
                  setTargetType(value as "content" | "bundle");
                  setTargetId("");
                }}
              >
                <SelectTrigger id="dup-target-type">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="content">Content item</SelectItem>
                  <SelectItem value="bundle">Bundle</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="dup-target">
                {targetType === "content" ? "Content" : "Bundle"}
              </Label>
              <Select value={targetId} onValueChange={setTargetId}>
                <SelectTrigger id="dup-target">
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
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={saving}
          >
            Cancel
          </Button>
          <Button onClick={handleDuplicate} disabled={saving || !targetId}>
            {saving ? "Duplicating..." : "Duplicate"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
