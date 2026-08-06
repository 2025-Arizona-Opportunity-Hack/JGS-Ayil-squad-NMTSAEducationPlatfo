import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { ShieldAlert, AlertTriangle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISMISS_KEY = "setupHealthBannerDismissed";

// Short, human clause for whichever critical/blocking check is failing, so
// the banner can say *why* rather than just "N items." Only ids that can
// actually reach critical/blocking severity need an entry here.
const SHORT_CLAUSES: Record<string, string> = {
  mock_payments_enabled:
    "mock payments are on, so orders can be completed without paying",
  environment_mode:
    "email isn't in production mode, so real users won't receive it",
  media_url_secret:
    "media URLs aren't signed, so protected content won't play",
  site_url: "the site URL isn't set, so notification links are broken",
  email_configured: "email isn't configured, so new users can't sign up",
  stripe_webhook_secret: "Stripe orders aren't being fulfilled",
};

interface SetupHealthBannerProps {
  onOpenSetup: () => void;
}

export function SetupHealthBanner({ onOpenSetup }: SetupHealthBannerProps) {
  const data = useQuery(api.setupHealth.getSetupHealth);
  const [dismissed, setDismissed] = useState(
    () => sessionStorage.getItem(DISMISS_KEY) === "true"
  );

  // `undefined` = still loading, `null` = not permitted (shouldn't normally
  // happen since the caller only mounts this for MANAGE_SITE_SETTINGS
  // holders, but degrade quietly either way rather than guessing).
  if (!data) return null;

  const hasCritical = data.counts.critical > 0;
  const hasBlocking = data.counts.blocking > 0;
  if (!hasCritical && !hasBlocking) return null;

  // Critical items are never dismissible for the session — only blocking-only
  // banners can be quieted down, and only until the next reload.
  if (dismissed && !hasCritical) return null;

  const total = data.counts.critical + data.counts.blocking;
  const firstFailing = data.checks.find(
    (c) => !c.ok && (c.severity === "critical" || c.severity === "blocking")
  );
  const clause = firstFailing ? SHORT_CLAUSES[firstFailing.id] : undefined;

  const handleDismiss = () => {
    sessionStorage.setItem(DISMISS_KEY, "true");
    setDismissed(true);
  };

  return (
    <div
      role={hasCritical ? "alert" : "status"}
      className={cn(
        "flex items-center gap-3 px-4 py-3 border-b text-sm",
        hasCritical
          ? "bg-destructive/10 border-destructive/30 text-destructive"
          : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
      )}
    >
      {hasCritical ? (
        <ShieldAlert className="w-5 h-5 shrink-0" aria-hidden="true" />
      ) : (
        <AlertTriangle className="w-5 h-5 shrink-0" aria-hidden="true" />
      )}
      <p className="flex-1 min-w-0">
        <span className="font-semibold">
          {total} setup item{total === 1 ? "" : "s"} need
          {total === 1 ? "s" : ""} attention
        </span>
        {clause ? <span> — {clause}.</span> : null}
      </p>
      <Button
        size="sm"
        variant={hasCritical ? "destructive" : "outline"}
        onClick={onOpenSetup}
      >
        Review setup
      </Button>
      {!hasCritical && (
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss setup health notice for this session"
          className={cn(
            "shrink-0 rounded p-1.5",
            "hover:bg-black/5 dark:hover:bg-white/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          )}
        >
          <X className="w-4 h-4" aria-hidden="true" />
        </button>
      )}
    </div>
  );
}
