import { forwardRef } from "react";
import { HelpCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

/**
 * Each portal has its own palette; the button keeps its shape and only takes
 * on the colours of the header it sits in.
 */
const TONES = {
  client:
    "border-client-primary bg-client-primary/10 text-client-text hover:bg-client-primary/20 focus-visible:ring-client-primary ring-offset-client-card [&_svg]:text-client-primary",
  admin:
    "border-primary bg-primary/10 text-foreground hover:bg-primary/20 focus-visible:ring-primary ring-offset-card [&_svg]:text-primary",
} as const;

interface HelpButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  tone: keyof typeof TONES;
  /**
   * The site setting `prominentHelpButton`. Off, the button is the small `?`
   * icon matching the theme and sign-out icons beside it.
   */
  prominent?: boolean;
}

// Both forms share these. The name contains the visible word "Help" of the
// prominent form, so voice-control users can say what they see (SC 2.5.3).
// GuidedTour also looks the button up by this name to hand focus back after a
// tour, so it must not change.
const SHARED = { "aria-label": "Help and guides", "aria-haspopup": "dialog" } as const;

/**
 * The header's way into Help & Guides, shared by both portals.
 *
 * Families reported not spotting the bare `?`, so admins can switch on a
 * prominent form: a visible word, a larger icon, and a border. It stands out
 * without movement or bright fills — the client asked for prominence without
 * visual overstimulation.
 *
 * The border is a real border rather than a shadow or background alone, so the
 * button keeps its outline when the OS forces high-contrast colours.
 */
export const HelpButton = forwardRef<HTMLButtonElement, HelpButtonProps>(
  ({ tone, prominent = false, className, ...props }, ref) => {
    if (!prominent) {
      return (
        <Button
          ref={ref}
          variant="ghost"
          size="icon"
          {...SHARED}
          className={cn("min-w-[44px] min-h-[44px]", className)}
          {...props}
        >
          <HelpCircle className="w-5 h-5" aria-hidden="true" />
        </Button>
      );
    }

    return (
      <button
        ref={ref}
        type="button"
        {...SHARED}
        className={cn(
          "inline-flex shrink-0 items-center justify-center gap-1.5 min-h-[44px] min-w-[44px] px-2.5 rounded-full border-2",
          "text-base font-semibold whitespace-nowrap transition-colors",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2",
          TONES[tone],
          className,
        )}
        {...props}
      >
        <HelpCircle className="w-6 h-6 shrink-0" aria-hidden="true" />
        <span>Help</span>
      </button>
    );
  },
);
HelpButton.displayName = "HelpButton";
