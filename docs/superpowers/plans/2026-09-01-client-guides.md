# Client-Side Help & Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give client-portal users (client, parent, professional) a Help & Guides feature — written guides for every task the portal actually supports, plus one short interactive orientation tour.

**Architecture:** The existing admin guides machinery is generalised rather than duplicated. The shared catalog in `guideContent.ts` gains an `audience` field and an optional `requiredPermission`; a pure `getGuidesFor()` helper becomes the single filtering point, which also fixes a pre-existing bug where every staff member is offered every staff guide. `GuidesLauncher` and `useGuides` stop reading the module-level `GUIDES` and take a list instead. `GuidedTour` learns to resolve the *visible* element when two nodes share a `data-tour` value — required because the client portal renders the same destination twice (desktop tabs vs mobile bottom nav).

**Tech Stack:** React 19 + Vite, TypeScript, Convex, Tailwind, shadcn/ui, react-router-dom, Vitest + Testing Library (happy-dom).

**Spec:** `docs/superpowers/specs/2026-09-01-client-guides-design.md`

## Global Constraints

- **Commits:** never add `Co-Authored-By` lines (CLAUDE.md).
- **Accessibility:** WCAG 2.2 AA is a core organizational tenet. Interactive client-portal controls keep the existing `min-h-[44px]` / `min-w-[44px]` touch-target convention and a visible focus ring (`focus-visible:ring-2 focus-visible:ring-client-primary`).
- **Component tests:** `*.test.tsx`, first two lines exactly `// @vitest-environment happy-dom` then `import "@testing-library/jest-dom/vitest";`. Pure-logic tests are `*.test.ts` with no environment pragma.
- **Convex in tests:** any component that calls `useQuery`/`useMutation` needs `vi.mock("convex/react", () => ({ useQuery: () => undefined, useMutation: () => vi.fn() }))` declared *before* the component import.
- **Run tests:** `npm test` (Vitest, single run).
- **Typecheck/build:** `npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`.
- **Permission type:** `requiredPermission` is typed `Permission` (from `@/lib/permissions`), not `string`, because `hasPermission(perms, p: Permission)` requires it.
- **Versioning:** one **minor** bump for this whole feature — `0.6.0` → `0.7.0` — plus a dated `CHANGELOG.md` entry, both in the final commit (Task 8). Do **not** bump in earlier tasks.
- **Client theme tokens:** client-portal markup uses `client-*` Tailwind tokens (`text-client-text`, `bg-client-card`, `border-client-border`, `text-client-primary`), not the admin tokens.

---

### Task 1: Catalog gains `audience`, `requiredPermission`, and `getGuidesFor`

Pure data + one pure function. No rendering.

**Files:**
- Modify: `src/components/guides/guideContent.ts:1-16` (imports and the `Guide` interface), plus one added field on each of the six existing guide objects
- Test: `src/components/guides/guideContent.test.ts`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces:
  - `Guide` with two new fields: `audience: "admin" | "client"` and `requiredPermission?: Permission`
  - `getGuidesFor(audience: Guide["audience"], permissions: string[] | undefined): Guide[]`

- [ ] **Step 1: Write the failing tests**

In `src/components/guides/guideContent.test.ts`, first widen the existing import on line 2 from `import { GUIDES } from "./guideContent";` to:

```ts
import { GUIDES, getGuidesFor } from "./guideContent";
import { PERMISSIONS } from "@/lib/permissions";
```

Do not add a second `./guideContent` import — TypeScript rejects the duplicate. Then append:

```ts
describe("getGuidesFor", () => {
  const ALL_STAFF = [
    PERMISSIONS.CREATE_CONTENT,
    PERMISSIONS.SET_CONTENT_PRICING,
    PERMISSIONS.MANAGE_CONTENT_GROUPS,
  ];

  it("returns only guides for the requested audience", () => {
    const admin = getGuidesFor("admin", ALL_STAFF);
    expect(admin.length).toBeGreaterThan(0);
    expect(admin.every((g) => g.audience === "admin")).toBe(true);
  });

  it("omits a guide whose requiredPermission the user lacks", () => {
    const ids = getGuidesFor("admin", [PERMISSIONS.CREATE_CONTENT]).map((g) => g.id);
    expect(ids).not.toContain("create-bundle");
    expect(ids).not.toContain("pricing-store");
  });

  it("includes a permission-gated guide when the user holds the permission", () => {
    const ids = getGuidesFor("admin", ALL_STAFF).map((g) => g.id);
    expect(ids).toContain("create-bundle");
    expect(ids).toContain("pricing-store");
  });

  it("includes ungated guides regardless of permissions", () => {
    const ids = getGuidesFor("admin", []).map((g) => g.id);
    expect(ids).toContain("upload-content");
  });

  it("treats undefined permissions as holding nothing", () => {
    const ids = getGuidesFor("admin", undefined).map((g) => g.id);
    expect(ids).toContain("upload-content");
    expect(ids).not.toContain("create-bundle");
  });
});

describe("GUIDES metadata", () => {
  it("gives every guide an audience", () => {
    expect(GUIDES.every((g) => g.audience === "admin" || g.audience === "client")).toBe(true);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/guides/guideContent.test.ts`
Expected: FAIL — `getGuidesFor is not a function`.

- [ ] **Step 3: Extend the type and add the helper**

In `src/components/guides/guideContent.ts`, change the imports at the top of the file from:

```ts
import type { TourStop } from "./GuidedTour";
```

to:

```ts
import type { TourStop } from "./GuidedTour";
import { hasPermission, type Permission } from "@/lib/permissions";
```

Replace the `Guide` interface with:

```ts
export interface Guide {
  id: string;
  title: string;
  summary: string;
  /** Which portal this guide is offered in. */
  audience: "admin" | "client";
  /**
   * When set, the guide is only offered to users holding this permission.
   * Prevents offering a workflow the user cannot perform — and, for guides
   * whose first tour stop targets a permission-gated nav item, prevents a
   * tour that spotlights nothing.
   */
  requiredPermission?: Permission;
  writtenSteps: WrittenStep[];
  tourStops: TourStop[];
}
```

At the end of the file, after the `GUIDES` array, add:

```ts
/**
 * The guides a given user should be offered. Single filtering point for both
 * portals — consumers must never read GUIDES directly.
 */
export function getGuidesFor(
  audience: Guide["audience"],
  permissions: string[] | undefined,
): Guide[] {
  return GUIDES.filter(
    (g) =>
      g.audience === audience &&
      (g.requiredPermission === undefined ||
        hasPermission(permissions, g.requiredPermission)),
  );
}
```

- [ ] **Step 4: Tag the six existing guides**

Add `audience: "admin",` immediately after the `summary:` line of each of the six existing guide objects (`upload-content`, `share-content`, `content-statuses`, `pricing-store`, `create-bundle`, `write-article`).

Then add a `requiredPermission` to exactly two of them, after their `audience` line:

```ts
// in the "pricing-store" guide object:
    requiredPermission: PERMISSIONS.SET_CONTENT_PRICING,

// in the "create-bundle" guide object:
    requiredPermission: PERMISSIONS.MANAGE_CONTENT_GROUPS,
```

This requires `PERMISSIONS` in the import added in Step 3 — update that import line to:

```ts
import { hasPermission, PERMISSIONS, type Permission } from "@/lib/permissions";
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/components/guides/guideContent.test.ts`
Expected: PASS, including the pre-existing "includes all the expected guides" and "has unique guide ids" tests.

- [ ] **Step 6: Typecheck**

Run: `npx tsc -p . --noEmit`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/components/guides/guideContent.ts src/components/guides/guideContent.test.ts
git commit -m "feat(guides): add audience and requiredPermission to the guide catalog

Adds getGuidesFor() as the single filtering point so guides can serve more
than one portal, and gates pricing-store and create-bundle on the permissions
their workflows actually need."
```

---

### Task 2: `GuidesLauncher` and `useGuides` take a guide list

Makes the filter from Task 1 actually take effect. Admin behaviour changes here: staff stop seeing guides they cannot act on.

**Files:**
- Modify: `src/components/guides/GuidesLauncher.tsx:10,19,31`
- Modify: `src/components/guides/useGuides.ts:2,16-21,44-45`
- Modify: `src/components/AdminDashboard.tsx:39`
- Test: `src/components/guides/GuidesLauncher.test.tsx`, `src/components/guides/useGuides.test.ts`

**Interfaces:**
- Consumes: `getGuidesFor`, `Guide` from Task 1.
- Produces:
  - `GuidesLauncher` props gain `guides: Guide[]`
  - `useGuides(guides: Guide[]): UseGuides` — the `UseGuides` shape is unchanged

- [ ] **Step 1: Write the failing tests**

Append to `src/components/guides/useGuides.test.ts`:

```ts
import type { Guide } from "./guideContent";

const TWO: Guide[] = [
  { id: "a", title: "A", summary: "sa", audience: "client", writtenSteps: [], tourStops: [] },
  { id: "b", title: "B", summary: "sb", audience: "client", writtenSteps: [], tourStops: [] },
];

describe("useGuides with an explicit list", () => {
  it("resolves a written guide from the list it was given", () => {
    const { result } = renderHook(() => useGuides(TWO));
    act(() => result.current.readSteps("b"));
    expect(result.current.writtenGuide?.title).toBe("B");
  });

  it("resolves null for an id absent from the list", () => {
    const { result } = renderHook(() => useGuides(TWO));
    act(() => result.current.startTour("not-in-list"));
    expect(result.current.tourGuide).toBeNull();
  });
});
```

If `src/components/guides/useGuides.test.ts` does not already import them, add to its imports:

```ts
import { renderHook, act } from "@testing-library/react";
```

Append to `src/components/guides/GuidesLauncher.test.tsx`:

```ts
import type { Guide } from "./guideContent";

const ONE: Guide[] = [
  { id: "only", title: "Only Guide", summary: "just one", audience: "client", writtenSteps: [], tourStops: [] },
];

describe("GuidesLauncher guide list", () => {
  it("renders exactly the guides it is given", () => {
    render(
      <GuidesLauncher
        guides={ONE}
        open
        onClose={() => {}}
        onReadSteps={() => {}}
        onStartTour={() => {}}
      />
    );
    expect(screen.getByText("Only Guide")).toBeInTheDocument();
    expect(screen.queryByText(/create content/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/guides/useGuides.test.ts src/components/guides/GuidesLauncher.test.tsx`
Expected: FAIL — TypeScript/runtime errors about the unexpected `guides` prop and `useGuides` argument.

- [ ] **Step 3: Make `useGuides` take a list**

In `src/components/guides/useGuides.ts`, change line 2 from:

```ts
import { GUIDES, type Guide } from "./guideContent";
```

to:

```ts
import { type Guide } from "./guideContent";
```

Replace the module-level `findGuide` helper (lines 16-19) and the hook signature (line 21) so lookup uses the passed list:

```ts
export function useGuides(guides: Guide[]): UseGuides {
  const [launcherOpen, setLauncherOpen] = useState(false);
  const [writtenGuideId, setWrittenGuideId] = useState<string | null>(null);
  const [tourGuideId, setTourGuideId] = useState<string | null>(null);

  const findGuide = useCallback(
    (id: string | null): Guide | null =>
      id ? (guides.find((g) => g.id === id) ?? null) : null,
    [guides],
  );
```

Then update the two memos (lines 44-45) to depend on `findGuide`:

```ts
  const writtenGuide = useMemo(() => findGuide(writtenGuideId), [findGuide, writtenGuideId]);
  const tourGuide = useMemo(() => findGuide(tourGuideId), [findGuide, tourGuideId]);
```

Everything between (the `openLauncher` … `closeTour` callbacks) is unchanged.

- [ ] **Step 4: Make `GuidesLauncher` take a list**

In `src/components/guides/GuidesLauncher.tsx`, delete the `GUIDES` import on line 10 and replace it with a type-only import:

```ts
import type { Guide } from "./guideContent";
```

Extend the props interface and the destructure:

```ts
interface GuidesLauncherProps {
  guides: Guide[];
  open: boolean;
  onClose: () => void;
  onReadSteps: (guideId: string) => void;
  onStartTour: (guideId: string) => void;
}

export function GuidesLauncher({ guides, open, onClose, onReadSteps, onStartTour }: GuidesLauncherProps) {
```

Change line 31 from `{GUIDES.map((guide) => (` to:

```tsx
          {guides.map((guide) => (
```

- [ ] **Step 5: Hide "Start tour" for written-only guides**

Most client guides are written-only (`tourStops: []`). The launcher currently
renders a "Start tour" button for every guide unconditionally, which would mount
`GuidedTour` with no stops. Wrap the tour button (lines 36-39) in a guard:

```tsx
                {guide.tourStops.length > 0 && (
                  <Button size="sm" onClick={() => onStartTour(guide.id)}>
                    <PlayCircle className="w-4 h-4 mr-2" />
                    Start tour
                  </Button>
                )}
```

Leave the "Read steps" button unconditional — every guide has written steps.

Add this test to `src/components/guides/GuidesLauncher.test.tsx`, inside the
`describe("GuidesLauncher guide list", ...)` block added in Step 1:

```tsx
  it("offers no tour for a guide with no tour stops", () => {
    render(
      <GuidesLauncher
        guides={ONE}
        open
        onClose={() => {}}
        onReadSteps={() => {}}
        onStartTour={() => {}}
      />
    );
    expect(screen.queryByRole("button", { name: /start tour/i })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: /read steps/i })).toBeInTheDocument();
  });

  it("offers a tour for a guide that has stops", () => {
    const withStops: Guide[] = [
      {
        ...ONE[0],
        tourStops: [
          { target: "x", title: "T", description: "D", position: "bottom" },
        ],
      },
    ];
    render(
      <GuidesLauncher
        guides={withStops}
        open
        onClose={() => {}}
        onReadSteps={() => {}}
        onStartTour={() => {}}
      />
    );
    expect(screen.getByRole("button", { name: /start tour/i })).toBeInTheDocument();
  });
```

- [ ] **Step 6: Update the admin call site**

In `src/components/AdminDashboard.tsx`, change line 39 from `const guides = useGuides();` to:

```tsx
  const adminGuides = useMemo(
    () => getGuidesFor("admin", userProfile?.effectivePermissions),
    [userProfile?.effectivePermissions],
  );
  const guides = useGuides(adminGuides);
```

Add `getGuidesFor` to the existing `./guides/guideContent` import (create the import if the file does not already have one), and ensure `useMemo` is in the `react` import at the top of the file.

Then pass the list to the launcher in the JSX at `AdminDashboard.tsx:128`:

```tsx
      <GuidesLauncher
        guides={adminGuides}
        open={guides.launcherOpen}
        onClose={guides.closeLauncher}
        onReadSteps={guides.readSteps}
        onStartTour={guides.startTour}
      />
```

- [ ] **Step 7: Run the full suite**

Run: `npm test`
Expected: PASS. Existing `GuidesLauncher` / `useGuides` tests that relied on the module-level catalog must be updated to pass a list rather than deleted — if any now fail, change the call to supply `getGuidesFor("admin", [PERMISSIONS.CREATE_CONTENT, PERMISSIONS.SET_CONTENT_PRICING, PERMISSIONS.MANAGE_CONTENT_GROUPS])`.

- [ ] **Step 8: Typecheck**

Run: `npx tsc -p . --noEmit`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/components/guides/GuidesLauncher.tsx src/components/guides/GuidesLauncher.test.tsx src/components/guides/useGuides.ts src/components/guides/useGuides.test.ts src/components/AdminDashboard.tsx
git commit -m "fix(guides): filter the launcher by audience and permission

GuidesLauncher and useGuides now take an explicit guide list instead of
reading the module-level catalog. Staff are no longer offered guides whose
workflow they lack permission for — create-bundle previously opened on a
sidebar tab that permission filtering had already removed."
```

---

### Task 3: `GuidedTour` resolves the visible target

Independent of Tasks 1-2. Required before any client tour works, because the client shell renders each destination twice.

**Files:**
- Modify: `src/components/guides/GuidedTour.tsx:46,53`
- Test: `src/components/guides/GuidedTour.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: no API change. `GuidedTour` behaviour only.

- [ ] **Step 1: Write the failing test**

Append to `src/components/guides/GuidedTour.test.tsx`:

```ts
import { waitFor } from "@testing-library/react";

describe("GuidedTour target resolution", () => {
  it("measures the visible node when two elements share a data-tour value", async () => {
    const hidden = document.createElement("div");
    hidden.setAttribute("data-tour", "dup");
    hidden.getBoundingClientRect = () =>
      ({ top: 0, left: 0, width: 0, height: 0, bottom: 0, right: 0, x: 0, y: 0, toJSON: () => {} }) as DOMRect;

    const visible = document.createElement("div");
    visible.setAttribute("data-tour", "dup");
    visible.getBoundingClientRect = () =>
      ({ top: 100, left: 40, width: 200, height: 50, bottom: 150, right: 240, x: 40, y: 100, toJSON: () => {} }) as DOMRect;

    // Hidden one first in document order, so querySelector would pick it.
    document.body.append(hidden, visible);

    const stops: TourStop[] = [
      { target: "dup", title: "Dup stop", description: "Points at the visible one.", position: "bottom" },
    ];
    render(<GuidedTour stops={stops} onClose={() => {}} />);

    // padding is 8 (GuidedTour.tsx:114). Resolving the hidden node gives
    // x=-8, y=-8; resolving the visible one gives x=32, y=92.
    await waitFor(() => {
      const spotlight = document.querySelector("rect[data-testid='tour-spotlight']");
      expect(spotlight).not.toBeNull();
      expect(Number(spotlight!.getAttribute("x"))).toBe(32);
      expect(Number(spotlight!.getAttribute("y"))).toBe(92);
      expect(Number(spotlight!.getAttribute("width"))).toBe(216);
      expect(Number(spotlight!.getAttribute("height"))).toBe(66);
    });

    hidden.remove();
    visible.remove();
  });
});
```

- [ ] **Step 2: Add the test hook to the spotlight rect**

The assertion needs a stable handle on the cut-out rect. In `src/components/guides/GuidedTour.tsx`, the mask's cut-out is the conditional `<rect>` at lines 160-167 — the one whose `x` is `targetRect.left - padding`. Add `data-testid="tour-spotlight"` to it, alongside the existing `rx="8"`. Change nothing else; in particular do not touch the outer masked `<rect>` at line 171.

- [ ] **Step 3: Run the test to verify it fails**

Run: `npm test -- src/components/guides/GuidedTour.test.tsx`
Expected: FAIL — the spotlight height is 0 because `querySelector` returned the hidden node.

- [ ] **Step 4: Implement visible-element resolution**

In `src/components/guides/GuidedTour.tsx`, add this helper immediately above the `useEffect` that begins at line 38:

```ts
/**
 * Resolve a data-tour anchor to the element the user can actually see.
 *
 * The client portal renders the same destination twice — a desktop tab and a
 * mobile bottom-nav item — and hides one with CSS. document.querySelector
 * returns whichever comes first in document order, which may be the hidden
 * one; its rect is all zeros, so the spotlight collapses to a 0x0 box at the
 * origin. Prefer the first node with a non-zero rect.
 */
function findVisibleTarget(target: string): Element | null {
  const all = Array.from(document.querySelectorAll(`[data-tour="${target}"]`));
  return (
    all.find((el) => {
      const r = el.getBoundingClientRect();
      return r.width > 0 && r.height > 0;
    }) ?? null
  );
}
```

Then replace the two lookups inside that effect. Line 46 becomes:

```ts
      const el = findVisibleTarget(stop.target);
```

and line 53 becomes:

```ts
          const settled = findVisibleTarget(stop.target);
```

Note this deliberately returns `null` rather than a hidden element when nothing is visible yet, so the existing rAF poll (`GuidedTour.tsx:58-63`) keeps retrying — which is what makes a target inside a not-yet-opened drawer work.

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npm test -- src/components/guides/GuidedTour.test.tsx`
Expected: PASS, including all pre-existing GuidedTour tests.

- [ ] **Step 6: Commit**

```bash
git add src/components/guides/GuidedTour.tsx src/components/guides/GuidedTour.test.tsx
git commit -m "fix(guides): spotlight the visible element for duplicated anchors

querySelector returns the first match in document order, which for a
responsive layout may be the CSS-hidden copy with a zero-size rect. Pick the
first anchor with a non-zero bounding box instead."
```

---

### Task 4: Client guide content

Content-only change to the catalog. Depends on Task 1's `audience` field.

**Files:**
- Modify: `src/components/guides/guideContent.ts` (append to the `GUIDES` array)
- Test: `src/components/guides/guideContent.test.ts`

**Interfaces:**
- Consumes: `Guide`, `audience`, `requiredPermission` from Task 1.
- Produces: guide ids `client-getting-around`, `client-find-and-open`, `client-play-content`, `client-paid-access`, `client-for-you`, `client-orders`, `client-profile`, `client-recommend`. The anchors `client-nav-home`, `client-nav-browse`, `client-nav-shop`, `client-nav-profile` are consumed by Task 5.

- [ ] **Step 1: Write the failing test**

Append to `src/components/guides/guideContent.test.ts`:

```ts
describe("client guides", () => {
  const CLIENT_IDS = [
    "client-getting-around",
    "client-find-and-open",
    "client-play-content",
    "client-paid-access",
    "client-for-you",
    "client-orders",
    "client-profile",
  ];

  it("includes all the expected client guides", () => {
    const ids = getGuidesFor("client", []).map((g) => g.id);
    for (const id of CLIENT_IDS) expect(ids).toContain(id);
  });

  it("offers the recommend guide only to holders of RECOMMEND_CONTENT", () => {
    expect(getGuidesFor("client", []).map((g) => g.id)).not.toContain("client-recommend");
    expect(
      getGuidesFor("client", [PERMISSIONS.RECOMMEND_CONTENT]).map((g) => g.id)
    ).toContain("client-recommend");
  });

  it("gives every client guide written steps", () => {
    for (const g of getGuidesFor("client", [PERMISSIONS.RECOMMEND_CONTENT])) {
      expect(g.writtenSteps.length).toBeGreaterThan(0);
    }
  });

  it("only tours anchors that exist in both the mobile and desktop shells", () => {
    const stable = new Set([
      "client-nav-home",
      "client-nav-browse",
      "client-nav-shop",
      "client-nav-profile",
    ]);
    for (const g of getGuidesFor("client", [PERMISSIONS.RECOMMEND_CONTENT])) {
      for (const stop of g.tourStops) expect(stable.has(stop.target)).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/guides/guideContent.test.ts`
Expected: FAIL — none of the client ids are present.

- [ ] **Step 3: Append the client guides**

Add these eight objects to the end of the `GUIDES` array in `src/components/guides/guideContent.ts`.

Note the tour deliberately visits only the four destinations that exist in **both** layouts. "For You", "Orders" and "Requests" are desktop header tabs but live inside the mobile More drawer, and the More trigger itself does not exist on desktop — so no single stop ordering resolves on both viewports. They are covered in writing instead.

```ts
  {
    id: "client-getting-around",
    title: "Getting around",
    summary: "A quick look at where everything lives in your portal.",
    audience: "client",
    tourStops: [
      {
        target: "client-nav-home",
        title: "Home",
        description:
          "Your starting point. Recent content and anything recommended to you shows up here first.",
        position: "bottom",
      },
      {
        target: "client-nav-browse",
        title: "Browse",
        description:
          "Search everything you have access to, or filter by the kind of content you want.",
        position: "bottom",
      },
      {
        target: "client-nav-shop",
        title: "Shop",
        description:
          "Content you can buy. You ask for access first, and pay once a staff member approves it.",
        position: "bottom",
      },
      {
        target: "client-nav-profile",
        title: "You",
        description:
          "Your name and photo, switching between light and dark, and signing out. That's the tour — click Done.",
        position: "bottom",
      },
    ],
    writtenSteps: [
      {
        title: "Home",
        detail:
          "Where you land when you sign in. Shows recent content and anything your therapist has recommended.",
      },
      {
        title: "Browse",
        detail:
          "Everything you have access to, with a search box and filters by content type.",
      },
      {
        title: "Shop",
        detail:
          "Content available to buy. See 'Getting access to paid content' for how buying works.",
      },
      {
        title: "For You",
        detail:
          "Recommendations picked for you by a therapist, each with a note about why. On a phone, tap More to find it.",
      },
      {
        title: "Orders and Requests",
        detail:
          "Orders holds what you've bought and your receipts; Requests tracks access you've asked for. On a phone, both are under More.",
      },
      {
        title: "Your profile",
        detail:
          "Tap your photo in the top right to change your name or picture, switch between light and dark, or sign out.",
      },
    ],
  },
  {
    id: "client-find-and-open",
    title: "Find something and open it",
    summary: "Search for content, open it, and get back again.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Start from Home or Browse",
        detail:
          "Home shows recent and recommended items. Browse shows everything you have access to.",
      },
      {
        title: "Search or filter",
        detail:
          "In Browse, type into the search box to match titles and descriptions, or use the type filter to narrow to video, audio, documents, or articles.",
      },
      {
        title: "Open an item",
        detail: "Tap or click anywhere on a content card to open it.",
      },
      {
        title: "Opening takes you out of the portal",
        detail:
          "Content opens in its own full-screen viewer, so the menus you were just using disappear. That's expected.",
      },
      {
        title: "Getting back",
        detail:
          "Use your browser's Back button, or the Home button in the top bar of the viewer, to return to the portal.",
      },
    ],
  },
  {
    id: "client-play-content",
    title: "Watch, listen, or read",
    summary: "How each kind of content opens, and how to download a copy.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Video",
        detail:
          "Plays in a player with the usual controls — play and pause, volume, and full screen.",
      },
      {
        title: "Audio",
        detail: "Plays in an audio bar with play, pause, and a position slider.",
      },
      {
        title: "Documents",
        detail:
          "PDFs open in a viewer with a download button if you'd like your own copy.",
      },
      {
        title: "Articles",
        detail: "Written content appears directly on the page — just scroll to read.",
      },
      {
        title: "If something asks for a password",
        detail:
          "Some shared items are protected. Enter the password whoever shared it gave you. If it asks you to sign in, use your usual account.",
      },
    ],
  },
  {
    id: "client-paid-access",
    title: "Getting access to paid content",
    summary: "Request it, wait for approval, then pay — and where to finish if you stop partway.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Find it in Shop",
        detail: "Paid content lives in Shop, each item showing its price.",
      },
      {
        title: "Request to purchase",
        detail:
          "Choose Request to Purchase. You can't buy immediately — a staff member reviews the request first.",
      },
      {
        title: "Wait for approval",
        detail:
          "Approval isn't instant and may take a day or two. You can check the status any time under Requests.",
      },
      {
        title: "Complete the purchase",
        detail:
          "Once approved, open Requests and use Complete Purchase on the approved request to pay.",
      },
      {
        title: "If you stop partway",
        detail:
          "An approved request stays in Requests until you use it, so you can come back and finish later.",
      },
      {
        title: "After buying",
        detail:
          "The content is yours to open from Browse. Some purchases include an access period — check Orders for the expiry date.",
      },
    ],
  },
  {
    id: "client-for-you",
    title: "For You: your therapist's recommendations",
    summary: "Content picked for you, and the note explaining why.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Open For You",
        detail: "It's a tab along the top; on a phone, tap More first.",
      },
      {
        title: "Read the note",
        detail:
          "Each recommendation can carry a short message from whoever recommended it, explaining why it's relevant to you.",
      },
      {
        title: "Open the content",
        detail: "Choose the recommendation to open it, the same as anywhere else.",
      },
      {
        title: "If it's paid content",
        detail:
          "Recommended items that cost money follow the normal route — request access from Shop and pay once approved. See 'Getting access to paid content'.",
      },
    ],
  },
  {
    id: "client-orders",
    title: "Your orders and receipts",
    summary: "What you've bought, your receipts, and when access runs out.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Open Orders",
        detail: "A tab along the top; on a phone, tap More first.",
      },
      {
        title: "Review an order",
        detail: "Each row shows what you bought, what it cost, and the date.",
      },
      {
        title: "Get a receipt",
        detail: "Use the receipt action on an order to download a copy for your records.",
      },
      {
        title: "Check access expiry",
        detail:
          "Some purchases grant access for a set period. Where that applies, the expiry date is shown on the order.",
      },
    ],
  },
  {
    id: "client-profile",
    title: "Your profile and appearance",
    summary: "Change your name or photo, switch light and dark, and sign out.",
    audience: "client",
    tourStops: [],
    writtenSteps: [
      {
        title: "Open your profile",
        detail: "Tap your photo in the top right corner.",
      },
      {
        title: "Change your name",
        detail: "Edit your first and last name, then save.",
      },
      {
        title: "Add or change your photo",
        detail: "Upload a picture, replace the one you have, or remove it entirely.",
      },
      {
        title: "Light or dark",
        detail:
          "The theme toggle beside your photo switches between light and dark. Your choice is remembered.",
      },
      {
        title: "Sign out",
        detail:
          "The sign-out button is next to your photo. Worth doing on a shared or family device.",
      },
    ],
  },
  {
    id: "client-recommend",
    title: "Recommending content to a client",
    summary: "Send a client a piece of content with a note about why.",
    audience: "client",
    requiredPermission: PERMISSIONS.RECOMMEND_CONTENT,
    tourStops: [],
    writtenSteps: [
      {
        title: "Open the content",
        detail: "Find the item you want to recommend and open it.",
      },
      {
        title: "Choose Recommend",
        detail:
          "The Recommend button appears on content you can recommend. Only professional accounts see it.",
      },
      {
        title: "Enter the recipient",
        detail: "Type the email address of the person you're recommending it to.",
      },
      {
        title: "Add a note",
        detail:
          "Include a short message explaining why you're sending it — this is what they'll read in their For You tab.",
      },
      {
        title: "Send it",
        detail: "Once sent, the recommendation appears in that person's For You tab.",
      },
    ],
  },
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/components/guides/guideContent.test.ts`
Expected: PASS.

- [ ] **Step 5: Typecheck**

Run: `npx tsc -p . --noEmit`
Expected: no errors.

- [ ] **Step 6: Commit**

```bash
git add src/components/guides/guideContent.ts src/components/guides/guideContent.test.ts
git commit -m "feat(guides): add client-portal guide content

Seven guides for client and parent plus a professional-only recommend guide.
The orientation tour visits only the four destinations present in both the
mobile and desktop shells; the rest are covered in writing."
```

---

### Task 5: `ClientHelpPrompt`

**Files:**
- Create: `src/components/guides/ClientHelpPrompt.tsx`
- Test: `src/components/guides/ClientHelpPrompt.test.tsx`

**Interfaces:**
- Consumes: nothing.
- Produces: `ClientHelpPrompt({ userId, onOpenGuides }: { userId: string; onOpenGuides: () => void })`

- [ ] **Step 1: Write the failing test**

Create `src/components/guides/ClientHelpPrompt.test.tsx`:

```tsx
// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ClientHelpPrompt } from "./ClientHelpPrompt";

describe("ClientHelpPrompt", () => {
  beforeEach(() => localStorage.clear());

  it("shows when this user has not dismissed it", () => {
    render(<ClientHelpPrompt userId="u1" onOpenGuides={() => {}} />);
    expect(screen.getByText(/first time here/i)).toBeInTheDocument();
  });

  it("stores dismissal against the user id", async () => {
    render(<ClientHelpPrompt userId="u1" onOpenGuides={() => {}} />);
    await userEvent.click(screen.getByRole("button", { name: /dismiss/i }));
    expect(localStorage.getItem("guides-client-prompt-seen:u1")).toBe("true");
  });

  it("still shows for a different user on the same browser", () => {
    localStorage.setItem("guides-client-prompt-seen:u1", "true");
    render(<ClientHelpPrompt userId="u2" onOpenGuides={() => {}} />);
    expect(screen.getByText(/first time here/i)).toBeInTheDocument();
  });

  it("does not render once this user has dismissed it", () => {
    localStorage.setItem("guides-client-prompt-seen:u1", "true");
    const { container } = render(<ClientHelpPrompt userId="u1" onOpenGuides={() => {}} />);
    expect(container).toBeEmptyDOMElement();
  });

  it("ignores the staff prompt key", () => {
    localStorage.setItem("guides-prompt-seen", "true");
    render(<ClientHelpPrompt userId="u1" onOpenGuides={() => {}} />);
    expect(screen.getByText(/first time here/i)).toBeInTheDocument();
  });

  it("opens the guides and records dismissal", async () => {
    const onOpenGuides = vi.fn();
    render(<ClientHelpPrompt userId="u1" onOpenGuides={onOpenGuides} />);
    await userEvent.click(screen.getByRole("button", { name: /show me/i }));
    expect(onOpenGuides).toHaveBeenCalledTimes(1);
    expect(localStorage.getItem("guides-client-prompt-seen:u1")).toBe("true");
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/guides/ClientHelpPrompt.test.tsx`
Expected: FAIL — module not found.

- [ ] **Step 3: Implement the component**

Create `src/components/guides/ClientHelpPrompt.tsx`:

```tsx
import { useState } from "react";
import { HelpCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Keyed by user id, unlike the browser-global staff key. Client devices are
 * frequently shared — a family tablet, a clinic machine — and a global flag
 * would let the first person to dismiss hide the prompt from everyone else.
 */
function seenKey(userId: string) {
  return `guides-client-prompt-seen:${userId}`;
}

interface ClientHelpPromptProps {
  userId: string;
  onOpenGuides: () => void;
}

export function ClientHelpPrompt({ userId, onOpenGuides }: ClientHelpPromptProps) {
  const [visible, setVisible] = useState(
    () => localStorage.getItem(seenKey(userId)) !== "true"
  );

  const markSeen = () => {
    localStorage.setItem(seenKey(userId), "true");
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div
      role="status"
      className="fixed bottom-20 md:bottom-4 right-4 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-lg border border-client-border bg-client-card shadow-lg p-4"
    >
      <div className="flex items-start gap-3">
        <HelpCircle className="w-5 h-5 text-client-primary shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="font-medium text-client-text">First time here?</p>
          <p className="text-sm text-client-text-secondary mt-1">
            Short guides for finding, watching, and buying content are in the Help menu.
          </p>
          <div className="flex gap-2 mt-3">
            <Button
              size="sm"
              className="min-h-[44px]"
              onClick={() => {
                markSeen();
                onOpenGuides();
              }}
            >
              Show me
            </Button>
            <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={markSeen}>
              Dismiss
            </Button>
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-6 w-6 shrink-0"
          onClick={markSeen}
          aria-label="Close"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
```

Note `bottom-20 md:bottom-4`: on mobile the bottom nav occupies the bottom of the viewport, so the prompt must sit above it.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/guides/ClientHelpPrompt.test.tsx`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/components/guides/ClientHelpPrompt.tsx src/components/guides/ClientHelpPrompt.test.tsx
git commit -m "feat(guides): add the client help prompt

One-time dismissible pointer to the Help button, keyed by user id so a shared
family or clinic device does not hide it for everyone after one dismissal."
```

---

### Task 6: Client shell — anchors, help entry points, and wiring

Anchors, entry points, and the `ClientLayout` wiring land together: `ClientHeader`
and `MoreDrawer` gain a required `onHelpClick`, and `ClientLayout` is the only
thing that can supply it. Split apart, neither half typechecks on its own.

**Files:**
- Modify: `src/components/client/ClientHeader.tsx:15-17,53-70,77-98,100-116`
- Modify: `src/components/client/BottomNav.tsx:9-13`
- Modify: `src/components/client/MoreDrawer.tsx:11-17`
- Modify: `src/components/client/ClientLayout.tsx:1-19,32-70`
- Test: `src/components/client/ClientHeader.test.tsx` (create), `src/components/client/MoreDrawer.test.tsx` (create), `src/components/client/ClientLayout.test.tsx` (create)

**Interfaces:**
- Consumes: `getGuidesFor` (Task 1), `useGuides(guides)` and the `GuidesLauncher` `guides` prop (Task 2), the `client-nav-*` anchor names and client guides (Task 4), `ClientHelpPrompt` (Task 5).
- Produces: `ClientHeader` and `MoreDrawer` props gain `onHelpClick: () => void`; DOM anchors `client-nav-home`, `client-nav-browse`, `client-nav-shop`, `client-nav-profile`. This is the finished feature.

- [ ] **Step 1: Write the failing shell tests**

Create `src/components/client/ClientHeader.test.tsx`:

```tsx
// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("convex/react", () => ({
  useQuery: () => undefined,
  useMutation: () => vi.fn(),
}));

import { ClientHeader } from "./ClientHeader";

function renderHeader(onHelpClick = () => {}) {
  return render(
    <MemoryRouter>
      <ClientHeader onProfileClick={() => {}} onHelpClick={onHelpClick} />
    </MemoryRouter>
  );
}

describe("ClientHeader", () => {
  it("renders a help button", () => {
    renderHeader();
    expect(screen.getAllByRole("button", { name: /help/i }).length).toBeGreaterThan(0);
  });

  it("calls onHelpClick when the help button is used", async () => {
    const onHelpClick = vi.fn();
    renderHeader(onHelpClick);
    await userEvent.click(screen.getAllByRole("button", { name: /help/i })[0]);
    expect(onHelpClick).toHaveBeenCalledTimes(1);
  });

  it("anchors the tour to home, browse, shop and profile", () => {
    const { container } = renderHeader();
    for (const anchor of ["client-nav-home", "client-nav-browse", "client-nav-shop", "client-nav-profile"]) {
      expect(container.querySelector(`[data-tour="${anchor}"]`)).not.toBeNull();
    }
  });
});
```

Create `src/components/client/MoreDrawer.test.tsx`:

```tsx
// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { MoreDrawer } from "./MoreDrawer";

describe("MoreDrawer", () => {
  it("offers Help alongside the navigation items", () => {
    render(
      <MemoryRouter>
        <MoreDrawer open onOpenChange={() => {}} onHelpClick={() => {}} />
      </MemoryRouter>
    );
    expect(screen.getByRole("button", { name: /help/i })).toBeInTheDocument();
  });

  it("calls onHelpClick and closes the drawer", async () => {
    const onHelpClick = vi.fn();
    const onOpenChange = vi.fn();
    render(
      <MemoryRouter>
        <MoreDrawer open onOpenChange={onOpenChange} onHelpClick={onHelpClick} />
      </MemoryRouter>
    );
    await userEvent.click(screen.getByRole("button", { name: /help/i }));
    expect(onHelpClick).toHaveBeenCalledTimes(1);
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });
});
```

- [ ] **Step 2: Write the failing wiring test**

Create `src/components/client/ClientLayout.test.tsx`:

```tsx
// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";

vi.mock("convex/react", () => ({
  useQuery: () => ({
    _id: "user-1",
    firstName: "Sam",
    lastName: "Ray",
    profilePictureId: undefined,
    profilePictureUrl: undefined,
    effectivePermissions: ["share_content"],
  }),
  useMutation: () => vi.fn(),
}));

import { ClientLayout } from "./ClientLayout";

describe("ClientLayout guides", () => {
  beforeEach(() => localStorage.clear());

  it("opens the guides launcher from the header help button", async () => {
    render(
      <MemoryRouter>
        <ClientLayout />
      </MemoryRouter>
    );
    await userEvent.click(screen.getAllByRole("button", { name: /help and guides/i })[0]);
    expect(screen.getByText(/getting around/i)).toBeInTheDocument();
  });

  it("offers client guides but not staff guides", async () => {
    render(
      <MemoryRouter>
        <ClientLayout />
      </MemoryRouter>
    );
    await userEvent.click(screen.getAllByRole("button", { name: /help and guides/i })[0]);
    expect(screen.queryByText(/create content \(all the fields\)/i)).not.toBeInTheDocument();
  });

  it("hides the recommend guide from a client without RECOMMEND_CONTENT", async () => {
    render(
      <MemoryRouter>
        <ClientLayout />
      </MemoryRouter>
    );
    await userEvent.click(screen.getAllByRole("button", { name: /help and guides/i })[0]);
    expect(screen.queryByText(/recommending content to a client/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the tests to verify they fail**

Run: `npm test -- src/components/client/`
Expected: FAIL — no help button, unknown props, guides not mounted.

- [ ] **Step 4: Add anchors and the help button to `ClientHeader`**

Add `HelpCircle` to the existing `lucide-react` import on lines 3-6. Use `HelpCircle`, not another question-mark icon — it is what `AdminHeader.tsx:3` and `NewStaffPrompt.tsx:2` already use.

Extend the props interface (lines 15-17):

```ts
interface ClientHeaderProps {
  onProfileClick: () => void;
  onHelpClick: () => void;
}
```

and the destructure on line 30:

```tsx
export function ClientHeader({ onProfileClick, onHelpClick }: ClientHeaderProps) {
```

Add an anchor to the desktop nav buttons. Inside the `desktopTabs.map` at line 78, add this prop to the `<button>` alongside the existing `key`:

```tsx
                    data-tour={`client-nav-${label.toLowerCase().replace(/\s+/g, "-")}`}
```

This yields `client-nav-home`, `client-nav-browse`, `client-nav-shop`, and also `client-nav-bundles`, `client-nav-orders`, `client-nav-shares`, `client-nav-requests`, `client-nav-for-you`. Only the first three are toured; the rest are harmless and available later.

Add `data-tour="client-nav-profile"` to **both** profile buttons — the mobile one at line 55 and the desktop one at line 102.

Add a help button immediately **before** `<ThemeToggle />` in both clusters. Mobile (line 54):

```tsx
            <Button
              variant="ghost"
              size="icon"
              onClick={onHelpClick}
              aria-label="Help and guides"
              className="min-w-[44px] min-h-[44px]"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
```

Desktop (line 101):

```tsx
            <Button
              variant="ghost"
              size="icon"
              onClick={onHelpClick}
              aria-label="Help and guides"
              className="min-h-[44px]"
            >
              <HelpCircle className="w-5 h-5" />
            </Button>
```

- [ ] **Step 5: Add anchors to `BottomNav`**

In `src/components/client/BottomNav.tsx`, inside the `navItems.map` that renders each nav button, add:

```tsx
              data-tour={`client-nav-${label.toLowerCase()}`}
```

This gives the mobile Home, Browse and Shop buttons the *same* anchors as their desktop counterparts — which is exactly the duplication Task 3 handles. Leave the "More" button without an anchor; it is not toured.

- [ ] **Step 6: Add the Help row to `MoreDrawer`**

In `src/components/client/MoreDrawer.tsx`, add `HelpCircle` to the `lucide-react` import on line 2, and extend the props:

```ts
interface MoreDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onHelpClick: () => void;
}

export function MoreDrawer({ open, onOpenChange, onHelpClick }: MoreDrawerProps) {
```

After the list that renders `drawerItems`, add a Help entry styled to match the existing rows. Reuse whatever class string the existing item buttons use; the distinguishing part is the handler:

```tsx
        <button
          onClick={() => {
            onOpenChange(false);
            onHelpClick();
          }}
          className="flex items-center gap-3 w-full px-4 py-3 rounded-lg text-left min-h-[44px] text-client-text-secondary hover:text-client-text hover:bg-client-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-client-primary"
        >
          <HelpCircle className="w-5 h-5" />
          <span>Help</span>
        </button>
```

- [ ] **Step 7: Wire up `ClientLayout`**

In `src/components/client/ClientLayout.tsx`, add to the imports:

```tsx
import { useMemo } from "react";
import { getGuidesFor } from "../guides/guideContent";
import { useGuides } from "../guides/useGuides";
import { GuidesLauncher } from "../guides/GuidesLauncher";
import { WrittenGuide } from "../guides/WrittenGuide";
import { GuidedTour } from "../guides/GuidedTour";
import { TourActiveProvider } from "../guides/TourActiveContext";
import { ClientHelpPrompt } from "../guides/ClientHelpPrompt";
```

Merge `useMemo` into the existing `react` import on line 1 rather than duplicating it.

Inside the component, after `const userProfile = useQuery(...)` on line 19:

```tsx
  const clientGuides = useMemo(
    () => getGuidesFor("client", userProfile?.effectivePermissions),
    [userProfile?.effectivePermissions],
  );
  const guides = useGuides(clientGuides);
```

Wrap the returned tree in `<TourActiveProvider>` and pass the help handler down. The opening of the return becomes:

```tsx
  return (
    <TourActiveProvider active={guides.tourGuide !== null}>
    <div className="min-h-screen bg-client-surface text-client-text">
      <SkipToContent />
      <ClientHeader
        onProfileClick={() => setProfileOpen(true)}
        onHelpClick={guides.openLauncher}
      />
```

`TourActiveProvider` takes `active: boolean` (`TourActiveContext.tsx:9-15`); this mirrors `AdminDashboard.tsx:89` exactly.

Update the `MoreDrawer` on line 54:

```tsx
      <MoreDrawer
        open={moreOpen}
        onOpenChange={setMoreOpen}
        onHelpClick={guides.openLauncher}
      />
```

Then, after the existing `ProfileEditModal` block and before the closing `</div>`:

```tsx
      <GuidesLauncher
        guides={clientGuides}
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
          guides.writtenGuide && guides.writtenGuide.tourStops.length > 0
            ? () => guides.startTour(guides.writtenGuide!.id)
            : undefined
        }
      />
      {guides.tourGuide && (
        <GuidedTour stops={guides.tourGuide.tourStops} onClose={guides.closeTour} />
      )}
      {userProfile && (
        <ClientHelpPrompt userId={userProfile._id} onOpenGuides={guides.openLauncher} />
      )}
```

Close the provider after the `</div>`:

```tsx
    </div>
    </TourActiveProvider>
  );
```

Three deliberate differences from the admin host:
- **No `GuideDemoHost`** — it imports Convex and hardcodes `DEMO_TOURS` for two staff tours.
- **`onClose={guides.closeTour}` directly**, not the admin's `handleTourClose` (`AdminDashboard.tsx:46-55`), whose synthesized global Escape would close whatever dialog happens to be topmost.
- **`onStartTour` is conditional on the guide having stops**, because most client guides are written-only; offering "start the tour" on a guide with an empty `tourStops` array would open an immediately-broken tour.

- [ ] **Step 8: Run the tests to verify they pass**

Run: `npm test -- src/components/client/`
Expected: PASS.

- [ ] **Step 9: Run the full suite and typecheck**

Run: `npm test`
Expected: PASS.

Run: `npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`
Expected: clean. Unlike the intermediate tasks, this one must leave the tree
fully green — the required `onHelpClick` prop and its only supplier both land here.

- [ ] **Step 10: Commit**

```bash
git add src/components/client/ClientHeader.tsx src/components/client/ClientHeader.test.tsx src/components/client/BottomNav.tsx src/components/client/MoreDrawer.tsx src/components/client/MoreDrawer.test.tsx src/components/client/ClientLayout.tsx src/components/client/ClientLayout.test.tsx
git commit -m "feat(client): mount Help & Guides in the client portal

Help button in both header layouts and a Help row in the mobile More drawer.
Desktop tabs and mobile bottom-nav items share data-tour anchors so one tour
stop addresses whichever is visible. Guides are filtered by audience and
permission. Omits GuideDemoHost and the admin Escape-on-teardown behaviour,
neither of which applies here."
```

---

### Task 7: Gaps report

Customer-facing prose, not guide content.

**Files:**
- Create: `docs/client-portal-gaps.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed by later tasks.

- [ ] **Step 1: Write the report**

Create `docs/client-portal-gaps.md`:

```markdown
# Client portal — gaps found while writing the user guides

Written 2026-09-01, while building the client-side Help & Guides feature.

Documenting the portal surfaced four things that guides cannot paper over.
The guides deliberately route around each; none is fixed by that work.

## 1. Bundles is always empty for clients

The Bundles tab appears in the client menu, but the query behind it requires a
staff-only permission and returns an empty list for everyone else
(`convex/contentGroups.ts:81-85`). No client, parent, or professional account
holds that permission, so the tab can never show anything — and its empty state
reads as "staff haven't made any bundles yet" rather than "this isn't available
to you."

**Options:** show bundles to clients, or remove the tab from the client menu.

## 2. My Shares can never have anything in it

Clients and parents are granted the "share content" permission, but there is no
button anywhere in the client portal that creates a share link — the only place
that opens the share dialog is the staff content manager. So the Shares tab can
only ever show its empty state, and that empty state points at an action the
user has no way to perform.

**Options:** add a Share action to the content viewer for these users, or remove
the tab until the feature exists.

## 3. The Purchase button in For You cannot succeed

Recommended paid content shows a Purchase button that fails when used. Two
separate problems: the code passes the wrong value to the payment step, and the
underlying operation requires an approved purchase request that this flow never
creates (`src/components/RecommendedContent.tsx:67-78`, `convex/orders.ts:52-82`).

Buying the same content through Shop works correctly. This is a genuine defect
rather than a design gap, and is the most user-visible of the four.

## 4. There is nothing for clients to "organise"

The original request asked for a tutorial on how users manipulate their content.
Beyond viewing, buying, and editing their own profile, the portal currently has
no favourites, bookmarks, notes, or progress tracking. The content cards support
showing a progress bar, but nothing ever supplies a value
(`src/components/client/ContentCard.tsx:20-24`).

If "manage my content" is the goal, this is the feature gap to discuss — the
guides can only describe what exists.
```

- [ ] **Step 2: Commit**

```bash
git add docs/client-portal-gaps.md
git commit -m "docs: client portal gaps found while writing the user guides"
```

---

### Task 8: Version bump and changelog

The single bump for this whole feature.

**Files:**
- Modify: `package.json` (`version`)
- Modify: `CHANGELOG.md` (new top entry)

**Interfaces:**
- Consumes: Tasks 1-7 complete.
- Produces: nothing.

- [ ] **Step 1: Bump the version**

In `package.json`, change `"version": "0.6.0"` to `"version": "0.7.0"`. Minor, because this is a new user-facing feature.

- [ ] **Step 2: Add the changelog entry**

Add at the top of `CHANGELOG.md`, below any title heading and above the previous entry. Match the formatting of the existing entries exactly:

```markdown
## 0.7.0 — 2026-09-01

- Help & Guides in the client portal: written guides for finding, watching,
  buying, and managing your account, plus a short interactive tour of the main
  menu. Reachable from the `?` button in the header or Help in the More menu.
- A one-time prompt points new users at the guides. It is remembered per user
  rather than per browser, so a shared family or clinic device does not hide it
  for everyone after one person dismisses it.
- Staff guides are now filtered by permission. Users are no longer offered the
  bundle or pricing guides unless they can perform those workflows — previously
  the bundle tour opened on a sidebar tab that permission filtering had removed,
  so it highlighted nothing.
- Tour highlighting now picks the visible element when a page renders the same
  control twice for different screen sizes.
```

- [ ] **Step 3: Verify everything**

Run: `npm test`
Expected: PASS.

Run: `npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`
Expected: clean.

- [ ] **Step 4: Commit**

```bash
git add package.json CHANGELOG.md
git commit -m "chore: release v0.7.0 — client-side Help & Guides"
```

---

## Manual verification

Automated tests do not cover viewport-dependent behaviour. After Task 8, check by hand:

1. Sign in as a **client**. Confirm the first-visit prompt appears above the bottom nav on mobile and bottom-right on desktop.
2. Open Help from the header. Confirm seven guides are listed and no staff guides appear.
3. Run the "Getting around" tour on a **desktop** viewport. Confirm each of the four stops highlights the correct header tab, not a zero-size box top-left.
4. Repeat at a **mobile** viewport (≤767px). Confirm the same four stops highlight the bottom-nav items and the mobile profile button — this is the duplicated-anchor path from Task 3.
5. Dismiss the prompt, sign out, sign in as a **different** client on the same browser, and confirm the prompt appears again.
6. Sign in as a **professional** and confirm the recommend guide is listed; as a client, confirm it is not.
7. Sign in as a **contributor** (staff without pricing or bundle permission) and confirm the pricing and bundle guides are no longer offered.
8. Tab through the header with a keyboard: confirm the help button takes focus, shows a visible ring, and activates with Enter and Space.
