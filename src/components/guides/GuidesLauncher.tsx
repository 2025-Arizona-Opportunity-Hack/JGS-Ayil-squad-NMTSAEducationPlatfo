import { BookOpen, PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { GUIDES } from "./guideContent";

interface GuidesLauncherProps {
  open: boolean;
  onClose: () => void;
  onReadSteps: (guideId: string) => void;
  onStartTour: (guideId: string) => void;
}

export function GuidesLauncher({ open, onClose, onReadSteps, onStartTour }: GuidesLauncherProps) {
  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Help & Guides</DialogTitle>
          <DialogDescription>
            Step-by-step help for common tasks. Read the written steps or follow an interactive tour.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {GUIDES.map((guide) => (
            <div key={guide.id} className="rounded-lg border border-border p-4">
              <p className="font-medium text-foreground">{guide.title}</p>
              <p className="text-sm text-muted-foreground mb-3">{guide.summary}</p>
              <div className="flex flex-wrap gap-2">
                <Button size="sm" onClick={() => onStartTour(guide.id)}>
                  <PlayCircle className="w-4 h-4 mr-2" />
                  Start tour
                </Button>
                <Button size="sm" variant="outline" onClick={() => onReadSteps(guide.id)}>
                  <BookOpen className="w-4 h-4 mr-2" />
                  Read steps
                </Button>
              </div>
            </div>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  );
}
