import { BookOpen, PlayCircle, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Guide } from "./guideContent";

interface GuidesLauncherProps {
  guides: Guide[];
  open: boolean;
  onClose: () => void;
  onReadSteps: (guideId: string) => void;
  onStartTour: (guideId: string) => void;
  /**
   * Supplied only for staff who administer the site. Opens a read-only view of
   * the client-portal guides so their wording can be checked against the real
   * portal. Absent for everyone else, so no entry point renders.
   */
  onPreviewClientGuides?: () => void;
}

export function GuidesLauncher({ guides, open, onClose, onReadSteps, onStartTour, onPreviewClientGuides }: GuidesLauncherProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Help & Guides</DialogTitle>
          <DialogDescription>
            Step-by-step help for common tasks. Read the written steps or follow an interactive tour.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {guides.map((guide) => (
            <div key={guide.id} className="rounded-lg border border-border p-4">
              <p className="font-medium text-foreground">{guide.title}</p>
              <p className="text-sm text-muted-foreground mb-3">{guide.summary}</p>
              <div className="flex flex-wrap gap-2">
                {guide.tourStops.length > 0 && (
                  <Button size="sm" onClick={() => onStartTour(guide.id)}>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start tour
                  </Button>
                )}
                <Button size="sm" variant="outline" onClick={() => onReadSteps(guide.id)}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Read steps
                </Button>
              </div>
            </div>
          ))}
        </div>

        {onPreviewClientGuides && (
          <div className="mt-2 border-t border-border pt-4">
            <p className="text-sm text-muted-foreground mb-3">
              Clients have their own separate guides. You can read them to check the
              wording still matches the portal.
            </p>
            <Button size="sm" variant="outline" onClick={onPreviewClientGuides}>
              <Eye className="w-4 h-4 mr-2" />
              Preview the client guides
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
