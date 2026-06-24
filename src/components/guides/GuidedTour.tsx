import { useState, useEffect, useCallback, useRef } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { X, ArrowLeft, ArrowRight } from "lucide-react";

export interface TourStop {
  target: string; // matches a [data-tour="..."] attribute
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

interface GuidedTourProps {
  stops: TourStop[];
  onClose: () => void;
}

export function GuidedTour({ stops, onClose }: GuidedTourProps) {
  const [currentStop, setCurrentStop] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<SVGSVGElement>(null);

  const stop = stops[currentStop];

  useEffect(() => {
    if (!stop) return;
    const el = document.querySelector(`[data-tour="${stop.target}"]`);
    if (el) {
      setTargetRect(el.getBoundingClientRect());
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [stop]);

  useEffect(() => {
    const handleResize = () => {
      if (!stop) return;
      const el = document.querySelector(`[data-tour="${stop.target}"]`);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [stop]);

  const handleNext = useCallback(() => {
    setCurrentStop((prev) => {
      if (prev < stops.length - 1) return prev + 1;
      onClose();
      return prev;
    });
  }, [stops.length, onClose]);

  const handlePrev = useCallback(() => {
    setCurrentStop((prev) => (prev > 0 ? prev - 1 : prev));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [onClose, handleNext, handlePrev]);

  if (!stop) return null;

  const padding = 8;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect)
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };
    const gap = 12;
    const tooltipWidth = 320;
    const viewportMargin = 16;
    const clampLeft = (desiredLeft: number) => {
      const maxLeft = window.innerWidth - tooltipWidth - viewportMargin;
      return Math.max(viewportMargin, Math.min(desiredLeft, maxLeft));
    };
    switch (stop.position) {
      case "right":
        return { top: targetRect.top, left: targetRect.right + gap };
      case "left":
        return { top: targetRect.top, right: window.innerWidth - targetRect.left + gap };
      case "bottom":
        return { top: targetRect.bottom + gap, left: clampLeft(targetRect.left) };
      case "top":
        return { bottom: window.innerHeight - targetRect.top + gap, left: clampLeft(targetRect.left) };
    }
  };

  return (
    <div className="fixed inset-0 z-[9999]" role="dialog" aria-modal="true" aria-label="Guided tour">
      <svg ref={overlayRef} className="fixed inset-0 w-full h-full pointer-events-none" style={{ zIndex: 9999 }}>
        <defs>
          <mask id="guided-tour-mask">
            <rect width="100%" height="100%" fill="white" />
            {targetRect && (
              <rect
                x={targetRect.left - padding}
                y={targetRect.top - padding}
                width={targetRect.width + padding * 2}
                height={targetRect.height + padding * 2}
                rx="8"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          width="100%"
          height="100%"
          fill="rgba(0,0,0,0.6)"
          mask="url(#guided-tour-mask)"
          className="pointer-events-auto"
          onClick={onClose}
        />
      </svg>

      <div className="fixed z-[10000] w-80 max-w-[calc(100vw-2rem)]" style={getTooltipStyle()}>
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{stop.title}</CardTitle>
              <Button variant="ghost" size="icon" className="h-6 w-6" onClick={onClose} aria-label="Close tour">
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>{stop.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {currentStop + 1} of {stops.length}
              </span>
              <div className="flex gap-2">
                {currentStop > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  {currentStop < stops.length - 1 ? (
                    <>
                      Next
                      <ArrowRight className="h-3 w-3 ml-1" />
                    </>
                  ) : (
                    "Done"
                  )}
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
