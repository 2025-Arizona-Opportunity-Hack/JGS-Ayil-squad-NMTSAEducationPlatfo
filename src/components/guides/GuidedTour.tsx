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
  /**
   * Where to put focus when the tour closes — normally the control that opened
   * the guides launcher. The tour cannot work this out for itself: the launcher
   * closes and the tour opens in one React commit, so by the time the tour
   * mounts, the "Start tour" button it was launched from is already detached
   * and document.activeElement has fallen back to <body>.
   */
  restoreFocusTo?: HTMLElement | null;
}

/**
 * Resolve a data-tour anchor to the element the user can actually see.
 *
 * The client portal renders the same destination twice — a desktop tab and a
 * mobile bottom-nav item — and hides one with CSS. document.querySelector
 * returns whichever comes first in document order, which may be the hidden
 * one; its rect is all zeros, so the spotlight collapses to a 0x0 box at the
 * origin. Prefer the first node with a non-zero rect.
 *
 * Measuring only — never for clicking. Falling back to a hidden node here
 * restores the 0x0-spotlight-at-origin bug.
 */
function findVisibleTarget(target: string): Element | null {
  return firstVisibleMatch(`[data-tour="${target}"]`);
}

/**
 * The first element matching `selector` that the user can actually see.
 *
 * A responsive shell renders the same control once per breakpoint and hides
 * one with CSS; the hidden copy still matches a selector but measures 0x0.
 * Shared by target resolution and by focus restoration, which has the same
 * problem — the header's help button exists twice.
 */
function firstVisibleMatch(selector: string): Element | null {
  return (
    Array.from(document.querySelectorAll(selector)).find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}

/** Focusable only if it is still in the document and not the bare <body>. */
function focusableOrNull(el: unknown): HTMLElement | null {
  return el instanceof HTMLElement && el.isConnected && el !== document.body
    ? el
    : null;
}

/**
 * Resolve a data-tour anchor for clicking.
 *
 * When duplicates exist, prefer the visible one (non-zero rect) so the click
 * reaches the user-facing copy. But HTMLElement.click() bypasses hit-testing,
 * so a zero-rect element is still clickable — e.g., mid-animation or before
 * layout settles. Requiring visibility here would fail clicks that would have
 * succeeded before duplicates existed, breaking tours with reveal animations.
 * Prefer visible; fall back to any match.
 *
 * Clicking only — never for measuring. Its zero-rect fallback is exactly what
 * the measuring paths must not have.
 */
function findClickTarget(target: string): Element | null {
  return findVisibleTarget(target) ?? document.querySelector(`[data-tour="${target}"]`);
}

export function GuidedTour({ stops, onClose, restoreFocusTo }: GuidedTourProps) {
  const [currentStop, setCurrentStop] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<SVGSVGElement>(null);
  const tooltipRef = useRef<HTMLDivElement>(null);

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
      const el = findVisibleTarget(stop.target);
      if (el) {
        el.scrollIntoView({ behavior: "smooth", block: "center" });
        setTargetRect(el.getBoundingClientRect());
        // Re-measure once after the open/scroll animation settles.
        setTimeout(() => {
          if (cancelled) return;
          const settled = findVisibleTarget(stop.target);
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
      const el = findVisibleTarget(stop.target);
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
      const el = findClickTarget(current.target);
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

  // aria-modal="true" hides everything outside this dialog from assistive tech,
  // so leaving focus on <body> strands AT users in an empty tree and gives
  // sighted keyboard users no clue the tour is keyboard-driven. Move focus to
  // the tooltip on mount and on every stop change (SC 2.4.3), and hand it back
  // to whatever opened the tour when we unmount.
  useEffect(() => {
    const activeAtMount = document.activeElement;
    return () => {
      // In order of preference: the control that opened the launcher; whatever
      // held focus when we mounted (covers a tour opened directly); and failing
      // both, the visible help button, since the launcher is always reachable
      // from there. The recorded opener can legitimately be gone — the
      // first-visit prompt's "Show me" button unmounts itself on dismissal.
      const target =
        focusableOrNull(restoreFocusTo) ??
        focusableOrNull(activeAtMount) ??
        focusableOrNull(firstVisibleMatch('[aria-label="Help and guides"]'));
      // Nothing sensible to return to: leave focus alone rather than move it
      // somewhere arbitrary.
      target?.focus();
    };
  }, []);

  useEffect(() => {
    tooltipRef.current?.focus();
  }, [currentStop]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") return onClose();
      if (e.key === "ArrowLeft") return handlePrev();
      if (e.key === "ArrowRight") return handleNext();
      if (e.key !== "Enter") return;
      // A focused button already fires its own click for Enter, so the button's
      // own handler runs. Advancing here as well would skip a stop — and on the
      // second-to-last stop, advance and immediately close. Focus sits on the
      // tooltip container (a div) on mount, where Enter still advances.
      if (e.target instanceof HTMLElement && e.target.closest("button")) return;
      handleNext();
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
                data-testid="tour-spotlight"
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
        <Card
          ref={tooltipRef}
          tabIndex={-1}
          data-testid="tour-tooltip"
          className="focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2"
        >
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
