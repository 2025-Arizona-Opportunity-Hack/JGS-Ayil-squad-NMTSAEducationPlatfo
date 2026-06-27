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
  // When set, clicking "Next" first clicks the target element (e.g. to open a
  // modal or switch tabs) before advancing. The next stop then waits for its
  // own target to appear.
  action?: "click";
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

  // Locate the target for the current stop. The element may not exist yet (a
  // modal it lives in might still be opening), so poll across a few animation
  // frames before giving up and centering the tooltip.
  useEffect(() => {
    if (!stop) return;
    let cancelled = false;
    let frame = 0;
    const maxFrames = 60; // ~1s at 60fps

    const locate = () => {
      if (cancelled) return;
      const el = document.querySelector(`[data-tour="${stop.target}"]`);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTargetRect(el.getBoundingClientRect());
        // Re-measure once after the open/scroll animation settles.
        setTimeout(() => {
          if (cancelled) return;
          const settled = document.querySelector(`[data-tour="${stop.target}"]`);
          if (settled) setTargetRect(settled.getBoundingClientRect());
        }, 300);
        return;
      }
      frame += 1;
      if (frame < maxFrames) {
        requestAnimationFrame(locate);
      } else {
        setTargetRect(null);
      }
    };

    setTargetRect(null);
    locate();
    return () => {
      cancelled = true;
    };
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
    // If this stop drives the UI, click its target (e.g. open a modal / switch
    // tab) before advancing so the next stop's element exists to point at.
    const current = stops[currentStop];
    if (current?.action === "click") {
      const el = document.querySelector(`[data-tour="${current.target}"]`);
      if (el instanceof HTMLElement) el.click();
    }
    setCurrentStop((prev) => {
      if (prev < stops.length - 1) return prev + 1;
      onClose();
      return prev;
    });
  }, [stops, currentStop, onClose]);

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
    const estHeight = 230; // rough tooltip height for off-screen clamping
    const margin = 16;
    const clamp = (v: number, min: number, max: number) =>
      Math.max(min, Math.min(v, Math.max(min, max)));
    const maxLeft = window.innerWidth - tooltipWidth - margin;
    const maxTop = window.innerHeight - estHeight - margin;

    let top: number;
    let left: number;
    switch (stop.position) {
      case "right":
        left = targetRect.right + gap;
        top = targetRect.top;
        break;
      case "left":
        left = targetRect.left - tooltipWidth - gap;
        top = targetRect.top;
        break;
      case "bottom":
        left = targetRect.left;
        top = targetRect.bottom + gap;
        break;
      case "top":
      default:
        left = targetRect.left;
        top = targetRect.top - estHeight - gap;
        break;
    }
    // Always keep the tooltip on screen (both axes).
    return { top: clamp(top, margin, maxTop), left: clamp(left, margin, maxLeft) };
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

      <div
        className="fixed z-[10000] w-80 max-w-[calc(100vw-2rem)] max-h-[calc(100vh-2rem)] overflow-y-auto"
        style={getTooltipStyle()}
      >
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
