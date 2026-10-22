import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import type { Guide } from "./guideContent";

interface ClientGuidesPreviewProps {
  guides: Guide[];
  open: boolean;
  onClose: () => void;
}

/**
 * Read-only view of the client-portal guides, for staff checking that the
 * help text still matches the portal after a change.
 *
 * Deliberately not interactive. A guide's tour stops target `data-tour`
 * anchors that exist only in the client shell (ClientHeader, BottomNav), so a
 * tour started from the admin dashboard would spotlight nothing. The stop
 * descriptions are still text that can go stale, so they are shown to be read
 * rather than run.
 *
 * Everything is rendered at once rather than behind per-guide dialogs: the
 * point is to scan the whole set against the real portal, not to consume one
 * guide at a time the way a client does.
 */
export function ClientGuidesPreview({ guides, open, onClose }: ClientGuidesPreviewProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Client guides</DialogTitle>
          <DialogDescription>
            Exactly what clients see in their own Help menu, for checking the wording
            is still right. Reading only — nothing here changes anything.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-8">
          {guides.map((guide) => (
            <section key={guide.id} aria-labelledby={`preview-${guide.id}`}>
              <h3
                id={`preview-${guide.id}`}
                className="font-semibold text-foreground"
              >
                {guide.title}
              </h3>
              <p className="text-sm text-muted-foreground">{guide.summary}</p>

              {guide.requiredPermission && (
                <p className="text-xs text-muted-foreground mt-1 italic">
                  Only shown to clients who can do this
                </p>
              )}

              <ol className="mt-3 space-y-3">
                {guide.writtenSteps.map((step, i) => (
                  <li key={i} className="flex gap-3">
                    <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                      {i + 1}
                    </span>
                    <div>
                      <p className="font-medium text-foreground text-sm">{step.title}</p>
                      <p className="text-sm text-muted-foreground">{step.detail}</p>
                    </div>
                  </li>
                ))}
              </ol>

              {guide.tourStops.length > 0 && (
                <div className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
                  <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Walkthrough wording
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Spoken by the guided walkthrough in the client portal. It cannot be
                    run from here, because it points at parts of the client portal.
                  </p>
                  <ul className="mt-3 space-y-2">
                    {guide.tourStops.map((stop, i) => (
                      <li key={i}>
                        <p className="text-sm font-medium text-foreground">{stop.title}</p>
                        <p className="text-sm text-muted-foreground">{stop.description}</p>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
