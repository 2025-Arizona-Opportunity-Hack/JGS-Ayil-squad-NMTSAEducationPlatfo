# Help & Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a discoverable Help & Guides feature to the admin dashboard offering, for "Upload content" and "Share content", both an interactive point-and-guide spotlight tour and a written step-by-step guide.

**Architecture:** Extract the existing `OnboardingTour` spotlight engine into a reusable `GuidedTour({stops, onClose})`. A `guideContent.ts` data module is the single source of truth feeding both the written guide and the tour. A Help (`?`) button in `AdminHeader` opens a `GuidesLauncher`; `useGuides` holds the open/active state in `AdminDashboard`. New staff get a one-time `NewStaffPrompt`.

**Tech Stack:** React + Vite, TypeScript, Vitest + @testing-library/react (happy-dom), shadcn/ui (Dialog, Card, Button), lucide-react icons.

**Testing notes:** Component/hook tests use `// @vitest-environment happy-dom` as the first line and `import "@testing-library/jest-dom/vitest";`. None of these components import `convex/react`, so no Convex mocking is needed. Run a single test file with `npx vitest run <path>`.

---

### Task 1: Extract reusable `GuidedTour` engine

**Files:**
- Create: `src/components/guides/GuidedTour.tsx`
- Test: `src/components/guides/GuidedTour.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/guides/GuidedTour.test.tsx`:

```tsx
// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidedTour, type TourStop } from "./GuidedTour";

const STOPS: TourStop[] = [
  { target: "a", title: "First stop", description: "Do the first thing.", position: "bottom" },
  { target: "b", title: "Second stop", description: "Do the second thing.", position: "bottom" },
];

describe("GuidedTour", () => {
  it("renders the first stop's title and description", () => {
    render(<GuidedTour stops={STOPS} onClose={() => {}} />);
    expect(screen.getByText("First stop")).toBeInTheDocument();
    expect(screen.getByText("Do the first thing.")).toBeInTheDocument();
  });

  it("advances to the next stop when Next is clicked", async () => {
    render(<GuidedTour stops={STOPS} onClose={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    expect(screen.getByText("Second stop")).toBeInTheDocument();
  });

  it("calls onClose when Done is clicked on the last stop", async () => {
    const onClose = vi.fn();
    render(<GuidedTour stops={STOPS} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /next/i }));
    await userEvent.click(screen.getByRole("button", { name: /done/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close (X) button is clicked", async () => {
    const onClose = vi.fn();
    render(<GuidedTour stops={STOPS} onClose={onClose} />);
    await userEvent.click(screen.getByRole("button", { name: /close tour/i }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/guides/GuidedTour.test.tsx`
Expected: FAIL — cannot resolve `./GuidedTour`.

- [ ] **Step 3: Write the implementation**

Create `src/components/guides/GuidedTour.tsx` (extracted from `OnboardingTour`, controlled by props — no localStorage, always active while mounted):

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/guides/GuidedTour.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/guides/GuidedTour.tsx src/components/guides/GuidedTour.test.tsx
git commit -m "feat(guides): extract reusable GuidedTour spotlight engine"
```

---

### Task 2: Refactor `OnboardingTour` to use `GuidedTour`

**Files:**
- Modify: `src/components/setup/OnboardingTour.tsx`

- [ ] **Step 1: Replace the file contents**

Replace the entire contents of `src/components/setup/OnboardingTour.tsx` with the version below. The welcome stops are unchanged; all spotlight logic now comes from `GuidedTour`. Behavior (auto-show once via localStorage, `forceShow`) is preserved.

```tsx
import { useState, useEffect } from "react";
import { GuidedTour, type TourStop } from "../guides/GuidedTour";

const WELCOME_STOPS: TourStop[] = [
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
      "Use this button to quickly invite new clients to your platform via email.",
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

  useEffect(() => {
    if (forceShow) {
      setActive(true);
      return;
    }
    const completed = localStorage.getItem(TOUR_STORAGE_KEY);
    if (!completed) {
      const timer = setTimeout(() => setActive(true), 1000);
      return () => clearTimeout(timer);
    }
  }, [forceShow]);

  const handleComplete = () => {
    setActive(false);
    localStorage.setItem(TOUR_STORAGE_KEY, "true");
  };

  if (!active) return null;

  return <GuidedTour stops={WELCOME_STOPS} onClose={handleComplete} />;
}
```

- [ ] **Step 2: Verify the app typechecks**

Run: `npx tsc -p . --noEmit --pretty false`
Expected: exit 0, no output.

- [ ] **Step 3: Run the full test suite (no regressions)**

Run: `npx vitest run`
Expected: all tests pass.

- [ ] **Step 4: Commit**

```bash
git add src/components/setup/OnboardingTour.tsx
git commit -m "refactor(guides): OnboardingTour now wraps GuidedTour"
```

---

### Task 3: Guide content (single source of truth)

**Files:**
- Create: `src/components/guides/guideContent.ts`
- Test: `src/components/guides/guideContent.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/guides/guideContent.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import { GUIDES } from "./guideContent";

describe("GUIDES", () => {
  it("includes the upload and share guides", () => {
    const ids = GUIDES.map((g) => g.id);
    expect(ids).toContain("upload-content");
    expect(ids).toContain("share-content");
  });

  it("every guide has a title, summary, written steps, and tour stops", () => {
    for (const g of GUIDES) {
      expect(g.title.length).toBeGreaterThan(0);
      expect(g.summary.length).toBeGreaterThan(0);
      expect(g.writtenSteps.length).toBeGreaterThan(0);
      expect(g.tourStops.length).toBeGreaterThan(0);
    }
  });

  it("every written step and tour stop is fully populated", () => {
    for (const g of GUIDES) {
      for (const s of g.writtenSteps) {
        expect(s.title.length).toBeGreaterThan(0);
        expect(s.detail.length).toBeGreaterThan(0);
      }
      for (const t of g.tourStops) {
        expect(t.target.length).toBeGreaterThan(0);
        expect(t.title.length).toBeGreaterThan(0);
        expect(t.description.length).toBeGreaterThan(0);
      }
    }
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/guides/guideContent.test.ts`
Expected: FAIL — cannot resolve `./guideContent`.

- [ ] **Step 3: Write the implementation**

Create `src/components/guides/guideContent.ts`:

```ts
import type { TourStop } from "./GuidedTour";

export interface WrittenStep {
  title: string;
  detail: string;
}

export interface Guide {
  id: string;
  title: string;
  summary: string;
  writtenSteps: WrittenStep[];
  tourStops: TourStop[];
}

export const GUIDES: Guide[] = [
  {
    id: "upload-content",
    title: "Upload content",
    summary: "Add a new video, document, audio file, or article to the library.",
    tourStops: [
      {
        target: "tab-content",
        title: "Open Content",
        description: "Everything you upload lives under the Content tab. Click here to open it.",
        position: "right",
      },
      {
        target: "create-content",
        title: "Create Content",
        description:
          "Click Create Content to open the upload form, then follow the written steps to fill it in.",
        position: "bottom",
      },
    ],
    writtenSteps: [
      {
        title: "Open the Content tab",
        detail: "In the left sidebar, click Content. This is where all uploaded content lives.",
      },
      {
        title: "Click Create Content",
        detail: "Use the Create Content button at the top of the content list to open the upload form.",
      },
      {
        title: "Enter a title",
        detail: "Give the content a clear title that staff and clients will recognize.",
      },
      {
        title: "Choose the type and upload the file",
        detail:
          "Pick the content type (video, audio, document, or article) and select the file. Large files (over 500 MB) upload in chunks and can take a few minutes — keep the tab open until it finishes.",
      },
      {
        title: "Set visibility",
        detail:
          "Choose who can see it. Public content is visible to anyone with the link; otherwise it stays restricted.",
      },
      {
        title: "Save",
        detail:
          "Click Save. You'll see a 'Content created successfully' confirmation and the item appears in the list.",
      },
    ],
  },
  {
    id: "share-content",
    title: "Share content",
    summary: "Send a piece of content to someone with a shareable link.",
    tourStops: [
      {
        target: "tab-content",
        title: "Find your content",
        description: "Open the Content tab and locate the item you want to share.",
        position: "right",
      },
      {
        target: "tab-shareLinks",
        title: "Manage share links",
        description:
          "Every link you create appears under the Shares tab, where you can copy or revoke it anytime.",
        position: "right",
      },
    ],
    writtenSteps: [
      {
        title: "Open the Content tab",
        detail: "In the left sidebar, click Content and find the item you want to share.",
      },
      {
        title: "Use the item's Share action",
        detail: "On the content row, choose Share. This opens the share dialog.",
      },
      {
        title: "Enter the recipient",
        detail: "Add the recipient's email and an optional message explaining what you're sending.",
      },
      {
        title: "Copy the shareable link",
        detail:
          "The dialog generates a shareable link. Copy it and send it to the recipient however you like.",
      },
      {
        title: "Manage links under Shares",
        detail:
          "Open the Shares tab to see every link you've created. From there you can copy a link again or delete it to revoke access.",
      },
    ],
  },
];
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/guides/guideContent.test.ts`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/guides/guideContent.ts src/components/guides/guideContent.test.ts
git commit -m "feat(guides): add upload/share guide content"
```

---

### Task 4: `WrittenGuide` dialog

**Files:**
- Create: `src/components/guides/WrittenGuide.tsx`
- Test: `src/components/guides/WrittenGuide.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/guides/WrittenGuide.test.tsx`:

```tsx
// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { WrittenGuide } from "./WrittenGuide";
import type { Guide } from "./guideContent";

const GUIDE: Guide = {
  id: "demo",
  title: "Demo guide",
  summary: "A demo.",
  tourStops: [{ target: "x", title: "t", description: "d", position: "bottom" }],
  writtenSteps: [
    { title: "Step one", detail: "Do one." },
    { title: "Step two", detail: "Do two." },
  ],
};

describe("WrittenGuide", () => {
  it("renders every step's title and detail when open", () => {
    render(<WrittenGuide guide={GUIDE} open onClose={() => {}} />);
    expect(screen.getByText("Step one")).toBeInTheDocument();
    expect(screen.getByText("Do one.")).toBeInTheDocument();
    expect(screen.getByText("Step two")).toBeInTheDocument();
    expect(screen.getByText("Do two.")).toBeInTheDocument();
  });

  it("calls onStartTour when the 'interactive tour' button is clicked", async () => {
    const onStartTour = vi.fn();
    render(<WrittenGuide guide={GUIDE} open onClose={() => {}} onStartTour={onStartTour} />);
    await userEvent.click(screen.getByRole("button", { name: /interactive tour/i }));
    expect(onStartTour).toHaveBeenCalledTimes(1);
  });

  it("renders nothing when guide is null", () => {
    const { container } = render(<WrittenGuide guide={null} open onClose={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/guides/WrittenGuide.test.tsx`
Expected: FAIL — cannot resolve `./WrittenGuide`.

- [ ] **Step 3: Write the implementation**

Create `src/components/guides/WrittenGuide.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/guides/WrittenGuide.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/guides/WrittenGuide.tsx src/components/guides/WrittenGuide.test.tsx
git commit -m "feat(guides): add WrittenGuide dialog"
```

---

### Task 5: `GuidesLauncher` dialog

**Files:**
- Create: `src/components/guides/GuidesLauncher.tsx`
- Test: `src/components/guides/GuidesLauncher.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/guides/GuidesLauncher.test.tsx`:

```tsx
// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { GuidesLauncher } from "./GuidesLauncher";
import { GUIDES } from "./guideContent";

describe("GuidesLauncher", () => {
  it("renders an entry for every guide", () => {
    render(<GuidesLauncher open onClose={() => {}} onReadSteps={() => {}} onStartTour={() => {}} />);
    for (const g of GUIDES) {
      expect(screen.getByText(g.title)).toBeInTheDocument();
    }
  });

  it("calls onReadSteps with the guide id", async () => {
    const onReadSteps = vi.fn();
    render(<GuidesLauncher open onClose={() => {}} onReadSteps={onReadSteps} onStartTour={() => {}} />);
    const buttons = screen.getAllByRole("button", { name: /read steps/i });
    await userEvent.click(buttons[0]);
    expect(onReadSteps).toHaveBeenCalledWith(GUIDES[0].id);
  });

  it("calls onStartTour with the guide id", async () => {
    const onStartTour = vi.fn();
    render(<GuidesLauncher open onClose={() => {}} onReadSteps={() => {}} onStartTour={onStartTour} />);
    const buttons = screen.getAllByRole("button", { name: /start tour/i });
    await userEvent.click(buttons[0]);
    expect(onStartTour).toHaveBeenCalledWith(GUIDES[0].id);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/guides/GuidesLauncher.test.tsx`
Expected: FAIL — cannot resolve `./GuidesLauncher`.

- [ ] **Step 3: Write the implementation**

Create `src/components/guides/GuidesLauncher.tsx`:

```tsx
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
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/guides/GuidesLauncher.test.tsx`
Expected: PASS (3 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/guides/GuidesLauncher.tsx src/components/guides/GuidesLauncher.test.tsx
git commit -m "feat(guides): add GuidesLauncher dialog"
```

---

### Task 6: `useGuides` state hook

**Files:**
- Create: `src/components/guides/useGuides.ts`
- Test: `src/components/guides/useGuides.test.ts`

- [ ] **Step 1: Write the failing test**

Create `src/components/guides/useGuides.test.ts`:

```ts
// @vitest-environment happy-dom
import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useGuides } from "./useGuides";
import { GUIDES } from "./guideContent";

describe("useGuides", () => {
  it("opens and closes the launcher", () => {
    const { result } = renderHook(() => useGuides());
    expect(result.current.launcherOpen).toBe(false);
    act(() => result.current.openLauncher());
    expect(result.current.launcherOpen).toBe(true);
    act(() => result.current.closeLauncher());
    expect(result.current.launcherOpen).toBe(false);
  });

  it("readSteps closes the launcher and sets the written guide", () => {
    const { result } = renderHook(() => useGuides());
    act(() => result.current.openLauncher());
    act(() => result.current.readSteps(GUIDES[0].id));
    expect(result.current.launcherOpen).toBe(false);
    expect(result.current.writtenGuide?.id).toBe(GUIDES[0].id);
    expect(result.current.tourGuide).toBeNull();
  });

  it("startTour sets the tour guide and clears launcher + written guide", () => {
    const { result } = renderHook(() => useGuides());
    act(() => result.current.readSteps(GUIDES[0].id));
    act(() => result.current.startTour(GUIDES[1].id));
    expect(result.current.tourGuide?.id).toBe(GUIDES[1].id);
    expect(result.current.writtenGuide).toBeNull();
    expect(result.current.launcherOpen).toBe(false);
  });

  it("closeTour clears the tour guide", () => {
    const { result } = renderHook(() => useGuides());
    act(() => result.current.startTour(GUIDES[0].id));
    act(() => result.current.closeTour());
    expect(result.current.tourGuide).toBeNull();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/guides/useGuides.test.ts`
Expected: FAIL — cannot resolve `./useGuides`.

- [ ] **Step 3: Write the implementation**

Create `src/components/guides/useGuides.ts`:

```ts
import { useState, useCallback, useMemo } from "react";
import { GUIDES, type Guide } from "./guideContent";

export interface UseGuides {
  launcherOpen: boolean;
  writtenGuide: Guide | null;
  tourGuide: Guide | null;
  openLauncher: () => void;
  closeLauncher: () => void;
  readSteps: (guideId: string) => void;
  startTour: (guideId: string) => void;
  closeWritten: () => void;
  closeTour: () => void;
}

function findGuide(id: string | null): Guide | null {
  if (!id) return null;
  return GUIDES.find((g) => g.id === id) ?? null;
}

export function useGuides(): UseGuides {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [writtenGuideId, setWrittenGuideId] = useState<string | null>(null);
  const [tourGuideId, setTourGuideId] = useState<string | null>(null);

  const openLauncher = useCallback(() => setLauncherOpen(true), []);
  const closeLauncher = useCallback(() => setLauncherOpen(false), []);

  const readSteps = useCallback((guideId: string) => {
    setLauncherOpen(false);
    setTourGuideId(null);
    setWrittenGuideId(guideId);
  }, []);

  const startTour = useCallback((guideId: string) => {
    setLauncherOpen(false);
    setWrittenGuideId(null);
    setTourGuideId(guideId);
  }, []);

  const closeWritten = useCallback(() => setWrittenGuideId(null), []);
  const closeTour = useCallback(() => setTourGuideId(null), []);

  const writtenGuide = useMemo(() => findGuide(writtenGuideId), [writtenGuideId]);
  const tourGuide = useMemo(() => findGuide(tourGuideId), [tourGuideId]);

  return {
    launcherOpen,
    writtenGuide,
    tourGuide,
    openLauncher,
    closeLauncher,
    readSteps,
    startTour,
    closeWritten,
    closeTour,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/guides/useGuides.test.ts`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/guides/useGuides.ts src/components/guides/useGuides.test.ts
git commit -m "feat(guides): add useGuides state hook"
```

---

### Task 7: `NewStaffPrompt` one-time pointer

**Files:**
- Create: `src/components/guides/NewStaffPrompt.tsx`
- Test: `src/components/guides/NewStaffPrompt.test.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/components/guides/NewStaffPrompt.test.tsx`:

```tsx
// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { NewStaffPrompt } from "./NewStaffPrompt";

describe("NewStaffPrompt", () => {
  beforeEach(() => localStorage.clear());

  it("shows the prompt when the seen flag is unset", () => {
    render(<NewStaffPrompt onOpenGuides={() => {}} />);
    expect(screen.getByText(/new here/i)).toBeInTheDocument();
  });

  it("hides and sets the flag when dismissed", async () => {
    const { rerender } = render(<NewStaffPrompt onOpenGuides={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(localStorage.getItem("guides-prompt-seen")).toBe("true");
    rerender(<NewStaffPrompt onOpenGuides={() => {}} />);
    expect(screen.queryByText(/new here/i)).not.toBeInTheDocument();
  });

  it("calls onOpenGuides and sets the flag when the open button is clicked", async () => {
    const onOpenGuides = vi.fn();
    render(<NewStaffPrompt onOpenGuides={onOpenGuides} />);
    await userEvent.click(screen.getByRole("button", { name: /show me/i }));
    expect(onOpenGuides).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("guides-prompt-seen")).toBe("true");
  });

  it("does not render when the flag is already set", () => {
    localStorage.setItem("guides-prompt-seen", "true");
    render(<NewStaffPrompt onOpenGuides={() => {}} />);
    expect(screen.queryByText(/new here/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npx vitest run src/components/guides/NewStaffPrompt.test.tsx`
Expected: FAIL — cannot resolve `./NewStaffPrompt`.

- [ ] **Step 3: Write the implementation**

Create `src/components/guides/NewStaffPrompt.tsx`:

```tsx
import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const PROMPT_SEEN_KEY = "guides-prompt-seen";

interface NewStaffPromptProps {
  onOpenGuides: () => void;
}

export function NewStaffPrompt({ onOpenGuides }: NewStaffPromptProps) {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(PROMPT_SEEN_KEY) !== "true"
  );

  const markSeen = () => {
    localStorage.setItem(PROMPT_SEEN_KEY, "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-border bg-card shadow-lg p-4">
      <div className="flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-foreground">New here?</p>
          <p className="text-sm text-muted-foreground mt-1">
            Step-by-step guides for uploading and sharing content are in the Help menu.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              onClick={() => {
                markSeen();
                onOpenGuides();
              }}
            >
              Show me
            </Button>
            <Button size="sm" variant="ghost" onClick={markSeen}>
              Dismiss
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={markSeen}
          aria-label="Dismiss"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

Note: there are two ways to dismiss — the small X (aria-label "Dismiss") and the "Dismiss" text button. The test's `/dismiss/i` matches the text button; both call `markSeen`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npx vitest run src/components/guides/NewStaffPrompt.test.tsx`
Expected: PASS (4 tests).

- [ ] **Step 5: Commit**

```bash
git add src/components/guides/NewStaffPrompt.tsx src/components/guides/NewStaffPrompt.test.tsx
git commit -m "feat(guides): add one-time NewStaffPrompt"
```

---

### Task 8: Add `data-tour` anchors

**Files:**
- Modify: `src/components/admin/ContentActions.tsx:73`
- Modify: `src/components/admin/AdminSidebar.tsx` (the item `<button>`)

- [ ] **Step 1: Anchor the Create Content button**

In `src/components/admin/ContentActions.tsx`, change the Create Content button (line 73) from:

```tsx
          <Button onClick={onCreateContent} className="min-h-[44px]">
```

to:

```tsx
          <Button onClick={onCreateContent} className="min-h-[44px]" data-tour="create-content">
```

- [ ] **Step 2: Anchor the sidebar tab items**

In `src/components/admin/AdminSidebar.tsx`, find the item button (it begins `<button` inside `visibleItems.map(...)`, with `onClick={() => onTabChange(value)}`). Add a `data-tour` attribute keyed by the tab value. Change:

```tsx
                      <button
                        onClick={() => onTabChange(value)}
                        aria-current={active ? "page" : undefined}
```

to:

```tsx
                      <button
                        onClick={() => onTabChange(value)}
                        data-tour={`tab-${value}`}
                        aria-current={active ? "page" : undefined}
```

This yields anchors `tab-content` and `tab-shareLinks` (matching the guide tour stops), plus the others for free.

- [ ] **Step 3: Verify typecheck**

Run: `npx tsc -p . --noEmit --pretty false`
Expected: exit 0.

- [ ] **Step 4: Commit**

```bash
git add src/components/admin/ContentActions.tsx src/components/admin/AdminSidebar.tsx
git commit -m "feat(guides): add data-tour anchors for create-content and sidebar tabs"
```

---

### Task 9: Wire Help button + guides into the dashboard

**Files:**
- Modify: `src/components/admin/AdminHeader.tsx`
- Modify: `src/components/admin/AdminLayout.tsx`
- Modify: `src/components/AdminDashboard.tsx`

- [ ] **Step 1: Add a Help button to `AdminHeader`**

In `src/components/admin/AdminHeader.tsx`:

(a) Update the icon import line:

```tsx
import { Menu } from "lucide-react";
```

to:

```tsx
import { Menu, HelpCircle } from "lucide-react";
```

(b) Add `onHelpClick` to the props interface:

```tsx
interface AdminHeaderProps {
  onProfileClick: () => void;
  onHelpClick: () => void;
  activeTab: string;
  onTabChange: (value: string) => void;
  sidebarPermissions: React.ComponentProps<typeof AdminSidebar>["permissions"];
}
```

(c) Destructure it:

```tsx
export function AdminHeader({ onProfileClick, onHelpClick, activeTab, onTabChange, sidebarPermissions }: AdminHeaderProps) {
```

(d) Add the Help button immediately before `<ThemeToggle />` in the right-hand action group:

```tsx
        <div className="flex items-center gap-2 shrink-0">
          <Button
            variant="ghost"
            size="icon"
            onClick={onHelpClick}
            aria-label="Help and guides"
            className="min-w-[44px] min-h-[44px]"
            data-tour="help-button"
          >
            <HelpCircle className="w-5 h-5" />
          </Button>
          <ThemeToggle />
```

- [ ] **Step 2: Thread `onHelpClick` through `AdminLayout`**

In `src/components/admin/AdminLayout.tsx`:

(a) Add `onHelpClick` to `AdminLayoutProps`:

```tsx
interface AdminLayoutProps {
  activeTab: string;
  onTabChange: (value: string) => void;
  onHelpClick: () => void;
  children: React.ReactNode;
}
```

(b) Destructure it in the function signature:

```tsx
export function AdminLayout({ activeTab, onTabChange, onHelpClick, children }: AdminLayoutProps) {
```

(c) Pass it to `AdminHeader` (add the prop to the existing `<AdminHeader ... />`):

```tsx
      <AdminHeader
        onProfileClick={() => setProfileOpen(true)}
        onHelpClick={onHelpClick}
        activeTab={activeTab}
        onTabChange={onTabChange}
        sidebarPermissions={sidebarPermissions}
      />
```

- [ ] **Step 3: Wire the guides into `AdminDashboard`**

In `src/components/AdminDashboard.tsx`:

(a) Add imports near the other component imports:

```tsx
import { useGuides } from "./guides/useGuides";
import { GuidesLauncher } from "./guides/GuidesLauncher";
import { WrittenGuide } from "./guides/WrittenGuide";
import { GuidedTour } from "./guides/GuidedTour";
import { NewStaffPrompt } from "./guides/NewStaffPrompt";
```

(b) Inside the component, after the existing `useState`/`useEffect` hooks (and before the `if (!userProfile)` early return), add:

```tsx
  const guides = useGuides();
```

(c) Pass `onHelpClick` to `AdminLayout` — change the opening tag:

```tsx
    <AdminLayout activeTab={activeTab} onTabChange={handleTabChange}>
```

to:

```tsx
    <AdminLayout activeTab={activeTab} onTabChange={handleTabChange} onHelpClick={guides.openLauncher}>
```

(d) Render the guides UI alongside the existing modals — immediately after the `<OnboardingTour />` line, add:

```tsx
      {/* Help & Guides */}
      <GuidesLauncher
        open={guides.launcherOpen}
        onClose={guides.closeLauncher}
        onReadSteps={guides.readSteps}
        onStartTour={guides.startTour}
      />
      <WrittenGuide
        guide={guides.writtenGuide}
        open={guides.writtenGuide !== null}
        onClose={guides.closeWritten}
        onStartTour={
          guides.writtenGuide
            ? () => guides.startTour(guides.writtenGuide!.id)
            : undefined
        }
      />
      {guides.tourGuide && (
        <GuidedTour stops={guides.tourGuide.tourStops} onClose={guides.closeTour} />
      )}
      <NewStaffPrompt onOpenGuides={guides.openLauncher} />
```

- [ ] **Step 4: Typecheck, full test suite, build**

Run: `npx tsc -p . --noEmit --pretty false && npx vitest run && npx vite build`
Expected: typecheck exit 0; all tests pass; build succeeds.

- [ ] **Step 5: Commit**

```bash
git add src/components/admin/AdminHeader.tsx src/components/admin/AdminLayout.tsx src/components/AdminDashboard.tsx
git commit -m "feat(guides): add Help button and wire guides into the dashboard"
```

---

### Task 10: Version bump, changelog, push

**Files:**
- Modify: `package.json` (version)
- Modify: `CHANGELOG.md`

- [ ] **Step 1: Bump the version (minor — new feature)**

In `package.json`, change `"version": "0.2.0",` to `"version": "0.3.0",`.

- [ ] **Step 2: Add the changelog entry**

Add at the top of the entries in `CHANGELOG.md` (above the most recent version heading):

```markdown
## 0.3.0 — 2026-06-23

- Add: Help & Guides in the admin dashboard. A Help (?) button opens a launcher
  with step-by-step guides for **uploading** and **sharing** content — each
  available as a readable written guide and an interactive point-and-guide tour.
  New staff get a one-time prompt pointing them to it. The existing welcome tour
  was refactored onto the shared `GuidedTour` engine.
```

- [ ] **Step 3: Final full verification**

Run: `npx tsc -p convex --noEmit --pretty false && npx tsc -p . --noEmit --pretty false && npx vitest run && npx vite build`
Expected: all clean/passing.

- [ ] **Step 4: Commit and push**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v0.3.0 — Help & Guides feature"
git push
```

---

## Self-Review

- **Spec coverage:** Launcher (Task 5), written guide (Task 4), interactive tour engine (Task 1) + content (Task 3), reuse via OnboardingTour refactor (Task 2), Help button discovery (Task 9), new-staff prompt (Task 7), anchors (Task 8), state hook (Task 6), versioning (Task 10). All spec sections covered.
- **Type consistency:** `TourStop` defined in Task 1 (`GuidedTour.tsx`), imported by `guideContent.ts` (Task 3); `Guide`/`WrittenStep` defined in Task 3, consumed by Tasks 4/5/6; `UseGuides` shape in Task 6 matches the wiring in Task 9 (`launcherOpen`, `writtenGuide`, `tourGuide`, `openLauncher`, `closeLauncher`, `readSteps`, `startTour`, `closeWritten`, `closeTour`).
- **Placeholders:** none — every step has full code or exact before/after edits.
- **Anchors:** guide `tourStops` targets (`tab-content`, `tab-shareLinks`, `create-content`) are created in Task 8; welcome-tour targets (`sidebar-*`, `invite-client`, `theme-toggle`) already exist in the codebase and are unchanged.
