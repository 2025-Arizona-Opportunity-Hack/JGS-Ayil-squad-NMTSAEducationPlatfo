# Help & Guides — Design Spec

Date: 2026-06-23
Status: Approved (pending implementation plan)

## Problem

Staff unfamiliar with the platform need to learn two core workflows on their
own, at their own pace: **uploading content** and **sharing content**. The
client (NMTSA) wants to onboard additional staff to help with uploads/sharing
without a live walkthrough each time. Delivery can be written or interactive.

There is already a generic welcome tour (`src/components/setup/OnboardingTour.tsx`)
— a spotlight/overlay engine driven by a hardcoded `TOUR_STOPS` array, anchored
by `data-tour` attributes, shown once via a `localStorage` flag with a
`forceShow` escape hatch. It is not task-specific.

## Goal

A discoverable **Help & Guides** feature in the admin dashboard offering, for
each supported workflow, both an **interactive point-and-guide spotlight tour**
and a **written step-by-step guide**. Ships with two guides: **Upload content**
and **Share content**. New staff are prompted once to find it.

Non-goals: hosted video; driving/opening modals from the tour; guides for roles
outside the admin dashboard; more than the two workflows (structure must make
adding more trivial, but we don't build them now).

## Decisions (from brainstorming)

- **Format:** hybrid — a launcher offering both an interactive tour and a written
  guide per workflow.
- **Tour depth:** point-and-guide. The tour highlights stable, always-present
  elements (sidebar tabs, the Create Content button) and tells the user what to
  do. It does NOT force dialogs open. Inside-the-dialog detail lives in the
  written guide.
- **Discovery:** a Help (`?`) button in the admin header, available anytime,
  plus a one-time gentle prompt for new staff pointing to it.

## Architecture

All new code lives under `src/components/guides/`, plus a refactor of the
existing tour engine.

### Single source of truth: `guides/guideContent.ts`

```ts
interface WrittenStep { title: string; detail: string; }
interface GuideTourStop {
  target: string;            // data-tour anchor id
  title: string;
  description: string;
  position: "top" | "bottom" | "left" | "right";
}
interface Guide {
  id: string;                // e.g. "upload-content"
  title: string;             // "Upload content"
  summary: string;           // one line for the launcher
  writtenSteps: WrittenStep[];
  tourStops: GuideTourStop[];
}
export const GUIDES: Guide[];
```

Both the written guide and the interactive tour read from this module, so they
cannot drift. Adding a future guide = adding one entry here (+ any new anchors).

### Reuse: generalize `OnboardingTour` → `GuidedTour`

Extract the spotlight engine (target-rect tracking, SVG mask, tooltip
positioning, keyboard nav, prev/next/done) into a reusable component:

```ts
interface GuidedTourProps {
  stops: GuideTourStop[];
  onClose: () => void;
}
```

- `GuidedTour` is purely controlled: it renders when mounted, calls `onClose`
  when finished/dismissed. No `localStorage` inside it.
- The existing welcome tour becomes a thin wrapper that owns the
  `onboarding-tour-completed` flag + `forceShow` behavior and passes the
  existing welcome stops to `GuidedTour`. Its current behavior is preserved.

### `guides/GuidesLauncher.tsx`

Dialog opened from the Help button. Lists each guide (title + summary) with two
actions: **Start interactive tour** and **Read written steps**. Selecting "tour"
mounts `GuidedTour` with that guide's `tourStops`; selecting "steps" opens
`WrittenGuide` for that guide.

### `guides/WrittenGuide.tsx`

Dialog rendering one guide's `writtenSteps` as a numbered, readable list with a
short intro. Includes a "Start the interactive tour instead" affordance.

### `guides/NewStaffPrompt.tsx`

A one-time, dismissible pointer to the Help button. Shows when its
`localStorage` flag (`guides-prompt-seen`) is unset; dismiss sets the flag.
Distinct from the welcome-tour flag so they're independent.

### Wiring

- `AdminHeader` gains a Help (`?`) icon button (desktop + mobile) that opens
  `GuidesLauncher`. The open/active state (launcher open, which guide is in
  written vs tour mode) lives in a small `useGuides` hook consumed by
  `AdminDashboard`, which renders the launcher/written-guide/tour and passes the
  open handler down to `AdminHeader`.
- Anchors to add: `data-tour="create-content"` (the Create Content button in
  `ContentActions`), `data-tour="tab-content"` and `data-tour="tab-shares"` (the
  Content and Shares sidebar items). Existing group-level anchors stay.

## Guide content (initial)

**Upload content**
- Tour stops: Content tab → Create Content button.
- Written steps: open **Content**; click **Create Content**; enter a **Title**;
  pick the **type** and **upload the file** (note: large files >500 MB upload in
  chunks and may take longer — keep the tab open); set **visibility**
  (public/who can see it); **Save**; (if a reviewer workflow applies) **Submit
  for review**.

**Share content**
- Tour stops: Content tab (find the item) → Shares tab (manage links).
- Written steps: find the content in **Content**; use its **Share** action;
  enter the **recipient** (and optional **message**); **copy the shareable
  link**; manage or revoke links anytime under the **Shares** tab.

## Data flow

Help button → `GuidesLauncher` open. User picks a guide + mode:
- "Read steps" → `WrittenGuide` dialog (pure render of `writtenSteps`).
- "Start tour" → launcher closes, `GuidedTour` mounts with `tourStops`,
  highlights `data-tour` anchors in sequence, `onClose` unmounts it.

New-staff prompt renders on first admin-dashboard load when its flag is unset.

## Error / edge handling

- A tour stop whose `data-tour` target isn't in the DOM: `GuidedTour` already
  centers the tooltip when no rect is found (existing behavior) — preserve it so
  a missing anchor degrades gracefully rather than breaking.
- Guides are only reachable from the admin dashboard, so no extra permission
  gating is needed; non-staff never see the Help button.

## Testing

- `guideContent`: every guide has ≥1 written step and ≥1 tour stop; every tour
  stop has a non-empty `target`, `title`, `description`.
- `GuidedTour`: renders the first stop from `stops`; **Next** advances; **Done**
  (last stop) calls `onClose`; Escape calls `onClose`.
- `GuidesLauncher`: renders one entry per guide; "Read steps" opens the written
  guide; "Start tour" triggers the tour callback with that guide's stops.
- `WrittenGuide`: renders all numbered steps for the given guide.
- `NewStaffPrompt`: visible when flag unset; hidden after dismiss (flag set).

## Versioning

New user-facing feature → minor bump (per `CLAUDE.md`), with a `CHANGELOG.md`
entry, on the push that ships it.
