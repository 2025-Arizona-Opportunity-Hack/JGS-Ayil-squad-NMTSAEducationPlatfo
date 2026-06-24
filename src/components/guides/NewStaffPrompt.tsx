import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROMPT_SEEN_KEY = "guides-prompt-seen";

interface NewStaffPromptProps {
  onOpenGuides: () => void;
}

export function NewStaffPrompt({ onOpenGuides }: NewStaffPromptProps) {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(PROMPT_SEEN_KEY) !== "true"
  );

  const markSeen = () => {
    localStorage.setItem(PROMPT_SEEN_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card shadow-lg p-4">
      <div className="flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-foreground">New here?</p>
          <p className="text-sm text-muted-foreground mt-1">
            Step-by-step guides for uploading and sharing content are in the Help menu.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => {
                markSeen();
                onOpenGuides();
              }}
            >
              Show me
            </Button>
            <Button size="sm" variant="ghost" onClick={markSeen}>
              Dismiss
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={markSeen}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
