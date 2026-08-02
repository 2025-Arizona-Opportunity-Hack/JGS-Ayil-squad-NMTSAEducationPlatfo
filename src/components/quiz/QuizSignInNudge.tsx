import { useQuery } from "convex/react";
import { useNavigate } from "react-router-dom";
import { ClipboardCheck, LogIn, UserPlus } from "lucide-react";
import { api } from "../../../convex/_generated/api";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface QuizSignInNudgeProps {
  contentId: string;
  quiz: {
    title: string;
    questionCount: number;
    passingScore: number;
  };
}

/**
 * Shown to signed-out visitors in the slot where QuizPanel renders for
 * signed-in users, so they know a quiz exists and why an account is needed
 * (attempts and scores are recorded per user). Mirrors QuizPanel's header
 * so the page doesn't reflow into an unfamiliar layout after signing in.
 */
export function QuizSignInNudge({ contentId, quiz }: QuizSignInNudgeProps) {
  const navigate = useNavigate();
  const siteSettings = useQuery(api.siteSettings.getSiteSettings);
  const allowSignup = !!siteSettings?.allowPublicSignup;

  // Same return-to-content replay the paywall uses: App.tsx navigates back
  // to /view/:id once the user is signed in.
  const goToAuth = (signup: boolean) => {
    sessionStorage.setItem("returnToContent", contentId);
    void navigate(signup ? "/?signup=true" : "/");
  };

  return (
    <Card className="mb-6 sm:mb-10 shadow-sm rounded-lg sm:rounded-xl border">
      <CardHeader className="px-4 sm:px-6">
        <CardTitle className="flex items-center gap-2 text-lg sm:text-xl">
          <ClipboardCheck className="w-5 h-5 text-primary" aria-hidden="true" />
          {quiz.title}
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 sm:px-6 space-y-4">
        <div className="flex flex-wrap items-center gap-2 text-sm">
          <Badge variant="secondary">
            {quiz.questionCount}{" "}
            {quiz.questionCount === 1 ? "question" : "questions"}
          </Badge>
          <Badge variant="secondary">{quiz.passingScore}% to pass</Badge>
        </div>
        <p className="text-sm text-muted-foreground">
          This content includes a quiz. Sign in to take it — your score and
          attempts are saved to your account.
        </p>
        <div className="flex flex-col sm:flex-row gap-2">
          <Button className="min-h-11" onClick={() => goToAuth(false)}>
            <LogIn className="w-4 h-4 mr-2" aria-hidden="true" />
            Sign in to take the quiz
          </Button>
          {allowSignup && (
            <Button
              variant="outline"
              className="min-h-11"
              onClick={() => goToAuth(true)}
            >
              <UserPlus className="w-4 h-4 mr-2" aria-hidden="true" />
              Create an account
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
