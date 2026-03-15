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

interface TourStop {
  target: string;
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}

const TOUR_STOPS: TourStop[] = [
  {
    target: "sidebar-content",
    title: "Content Management",
    description:
      "Create, edit, and organize your educational content here. Upload videos, documents, and more.",
    position: "right",
  },
  {
    target: "sidebar-users",
    title: "User Management",
    description:
      "Manage your team and clients. Send invitations, review join requests, and control permissions.",
    position: "right",
  },
  {
    target: "invite-client",
    title: "Invite Clients",
    description:
      "Use this button to quickly invite new clients to your platform via email or SMS.",
    position: "bottom",
  },
  {
    target: "sidebar-system",
    title: "System Settings",
    description:
      "Configure your platform settings, notification preferences, and branding here.",
    position: "right",
  },
  {
    target: "theme-toggle",
    title: "Dark Mode",
    description:
      "Toggle between light and dark mode. Your users will see their own preference.",
    position: "bottom",
  },
];

const TOUR_STORAGE_KEY = "onboarding-tour-completed";

interface OnboardingTourProps {
  forceShow?: boolean;
}

export function OnboardingTour({ forceShow }: OnboardingTourProps) {
  const [active, setActive] = useState(false);
  const [currentStop, setCurrentStop] = useState(0);
  const [targetRect, setTargetRect] = useState<DOMRect | null>(null);
  const overlayRef = useRef<SVGSVGElement>(null);

  useEffect(() => {
    if (forceShow) {
      setActive(true);
      setCurrentStop(0);
      return;
    }
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  // Update target rect when stop changes
  useEffect(() => {
    if (!active) return;
    const stop = TOUR_STOPS[currentStop];
    const el = document.querySelector(`[data-tour="${stop.target}"]`);
    if (el) {
      const rect = el.getBoundingClientRect();
      setTargetRect(rect);
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    } else {
      setTargetRect(null);
    }
  }, [active, currentStop]);

  // Handle resize
  useEffect(() => {
    if (!active) return;
    const handleResize = () => {
      const stop = TOUR_STOPS[currentStop];
      const el = document.querySelector(`[data-tour="${stop.target}"]`);
      if (el) setTargetRect(el.getBoundingClientRect());
    };
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, [active, currentStop]);

  const handleDismiss = useCallback(() => {
    setActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  }, []);

  const handleNext = useCallback(() => {
    if (currentStop < TOUR_STOPS.length - 1) {
      setCurrentStop((prev) => prev + 1);
    } else {
      handleDismiss();
    }
  }, [currentStop, handleDismiss]);

  const handlePrev = useCallback(() => {
    if (currentStop > 0) setCurrentStop((prev) => prev - 1);
  }, [currentStop]);

  // Keyboard support
  useEffect(() => {
    if (!active) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") handleDismiss();
      if (e.key === "ArrowRight" || e.key === "Enter") handleNext();
      if (e.key === "ArrowLeft") handlePrev();
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [active, handleNext, handlePrev, handleDismiss]);

  if (!active) return null;

  const stop = TOUR_STOPS[currentStop];
  const padding = 8;

  const getTooltipStyle = (): React.CSSProperties => {
    if (!targetRect)
      return { top: "50%", left: "50%", transform: "translate(-50%, -50%)" };

    const gap = 12;
    const tooltipWidth = 320; // matches w-80
    const viewportMargin = 16; // matches max-w-[calc(100vw-2rem)]

    const clampLeft = (desiredLeft: number) => {
      const maxLeft = window.innerWidth - tooltipWidth - viewportMargin;
      return Math.max(viewportMargin, Math.min(desiredLeft, maxLeft));
    };

    switch (stop.position) {
      case "right":
        return { top: targetRect.top, left: targetRect.right + gap };
      case "left":
        return {
          top: targetRect.top,
          right: window.innerWidth - targetRect.left + gap,
        };
      case "bottom":
        return {
          top: targetRect.bottom + gap,
          left: clampLeft(targetRect.left),
        };
      case "top":
        return {
          bottom: window.innerHeight - targetRect.top + gap,
          left: clampLeft(targetRect.left),
        };
    }
  };

  return (
    <div
      className="fixed inset-0 z-[9999]"
      role="dialog"
      aria-modal="true"
      aria-label="Onboarding tour"
    >
      {/* SVG mask overlay */}
      <svg
        ref={overlayRef}
        className="fixed inset-0 w-full h-full pointer-events-none"
        style={{ zIndex: 9999 }}
      >
        <defs>
          <mask id="tour-mask">
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
          mask="url(#tour-mask)"
          className="pointer-events-auto"
          onClick={handleDismiss}
        />
      </svg>

      {/* Tooltip */}
      <div
        className="fixed z-[10000] w-80 max-w-[calc(100vw-2rem)]"
        style={getTooltipStyle()}
      >
        <Card>
          <CardHeader className="pb-2">
            <div className="flex items-center justify-between">
              <CardTitle className="text-base">{stop.title}</CardTitle>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6"
                onClick={handleDismiss}
                aria-label="Close tour"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <CardDescription>{stop.description}</CardDescription>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="flex items-center justify-between">
              <span className="text-xs text-muted-foreground">
                {currentStop + 1} of {TOUR_STOPS.length}
              </span>
              <div className="flex gap-2">
                {currentStop > 0 && (
                  <Button variant="outline" size="sm" onClick={handlePrev}>
                    <ArrowLeft className="h-3 w-3 mr-1" />
                    Back
                  </Button>
                )}
                <Button size="sm" onClick={handleNext}>
                  {currentStop < TOUR_STOPS.length - 1 ? (
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
