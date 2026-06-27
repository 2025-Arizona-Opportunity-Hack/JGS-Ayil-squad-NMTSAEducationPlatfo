import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { ContentPricingModal } from "../ContentPricingModal";
import { ThirdPartyShareModal } from "../ThirdPartyShareModal";
import type { Id } from "../../../convex/_generated/dataModel";

// A fake content item used purely to demonstrate the Pricing/Share dialogs
// during a guided tour. It is never written to the database, and the dialogs
// run in demoMode so nothing is saved or emailed.
const EXAMPLE_CONTENT_ID = "example-demo-content" as Id<"content">;
const EXAMPLE_CONTENT_TITLE = "Example: Intro to Music Therapy";

// Tours that demonstrate a per-content action with the example item.
const DEMO_TOURS = new Set(["pricing-store", "share-content"]);

interface GuideDemoHostProps {
  /** The id of the currently running tour guide, or null. */
  activeTourId: string | null;
}

export function GuideDemoHost({ activeTourId }: GuideDemoHostProps) {
  const [open, setOpen] = useState<"none" | "pricing" | "share">("none");
  const show = activeTourId !== null && DEMO_TOURS.has(activeTourId);

  // Reset the demo dialog whenever we leave a demo tour.
  useEffect(() => {
    if (!show) setOpen("none");
  }, [show]);

  if (!show) return null;

  return (
    <>
      <div
        data-tour="demo-example"
        className="fixed bottom-24 left-1/2 -translate-x-1/2 z-40 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card shadow-lg p-4"
      >
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
          Example item · tour demo (nothing is saved)
        </p>
        <p className="font-semibold text-foreground mt-1">{EXAMPLE_CONTENT_TITLE}</p>
        <div className="flex gap-2 mt-3">
          <Button size="sm" data-tour="demo-open-pricing" onClick={() => setOpen("pricing")}>
            Set pricing
          </Button>
          <Button
            size="sm"
            variant="outline"
            data-tour="demo-open-share"
            onClick={() => setOpen("share")}
          >
            Share
          </Button>
        </div>
      </div>

      <ContentPricingModal
        isOpen={open === "pricing"}
        onClose={() => setOpen("none")}
        contentId={EXAMPLE_CONTENT_ID}
        contentTitle={EXAMPLE_CONTENT_TITLE}
        demoMode
      />
      <ThirdPartyShareModal
        isOpen={open === "share"}
        onClose={() => setOpen("none")}
        contentId={EXAMPLE_CONTENT_ID}
        contentTitle={EXAMPLE_CONTENT_TITLE}
        demoMode
      />
    </>
  );
}
