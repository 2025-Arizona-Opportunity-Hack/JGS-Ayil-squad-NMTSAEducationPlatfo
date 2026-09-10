import { useEffect, useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Keyed by user id, unlike the browser-global staff key. Client devices are
 * frequently shared — a family tablet, a clinic machine — and a global flag
 * would let the first person to dismiss hide the prompt from everyone else.
 */
function seenKey(userId: string) {
  return `guides-client-prompt-seen:${userId}`;
}

interface ClientHelpPromptProps {
  userId: string;
  onOpenGuides: () => void;
  /**
   * Whether the guides launcher is currently open, by whatever route — this
   * prompt's "Show me", the header's ? button, or the More drawer.
   */
  guidesOpened?: boolean;
}

export function ClientHelpPrompt({
  userId,
  onOpenGuides,
  guidesOpened = false,
}: ClientHelpPromptProps) {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(seenKey(userId)) !== "true"
  );

  const markSeen = () => {
    localStorage.setItem(seenKey(userId), "true");
    setVisible(false);
  };

  // Reaching the launcher at all is the whole point of the prompt, so any
  // route in counts as seen. Recording only our own buttons meant a user who
  // found the ? button unaided was nudged towards it again on every load,
  // forever.
  useEffect(() => {
    if (!guidesOpened) return;
    localStorage.setItem(seenKey(userId), "true");
    setVisible(false);
  }, [guidesOpened, userId]);

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-client-border bg-client-card shadow-lg p-4"
    >
      <div className="flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-client-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-client-text">First time here?</p>
          <p className="text-sm text-client-text-secondary mt-1">
            Short guides for finding, watching, and buying content are in the Help menu.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="min-h-[44px]"
              onClick={() => {
                markSeen();
                onOpenGuides();
              }}
            >
              Show me
            </Button>
            <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={markSeen}>
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
