import { PlayCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import type { Guide } from "./guideContent";

interface WrittenGuideProps {
  guide: Guide | null;
  open: boolean;
  onClose: () => void;
  onStartTour?: () => void;
}

export function WrittenGuide({ guide, open, onClose, onStartTour }: WrittenGuideProps) {
  if (!guide) return null;

  return (
    <Dialog open={open} onOpenChange={(o) => { if (!o) onClose(); }}>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{guide.title}</DialogTitle>
          <DialogDescription>{guide.summary}</DialogDescription>
        </DialogHeader>

        <ol className="space-y-4">
          {guide.writtenSteps.map((step, i) => (
            <li key={i} className="flex gap-3">
              <span className="flex-shrink-0 flex items-center justify-center w-6 h-6 rounded-full bg-primary/10 text-primary text-sm font-semibold">
                {i + 1}
              </span>
              <div>
                <p className="font-medium text-foreground">{step.title}</p>
                <p className="text-sm text-muted-foreground">{step.detail}</p>
              </div>
            </li>
          ))}
        </ol>

        {onStartTour && (
          <div className="pt-2">
            <Button variant="outline" className="w-full" onClick={onStartTour}>
              <PlayCircle className="w-4 h-4 mr-2" />
              Show me with an interactive tour
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
