# Client-Side Help & Guides — Design Spec

Date: 2026-09-01
Status: Approved (pending implementation plan)

## Problem

A NMTSA manager asked:

> "Is it possible to have a similar tutorial on the user side for how to
> manipulate their content? You might have already done that, I just don't see
> it on my end because I am a manager."

It has not been built, and it is not hidden from them by a permission. There is
no guides-related permission constant anywhere (`src/lib/permissions.ts`,
`convex/permissions.ts`) and no `hasPermission(...)` wraps any guides component.
The entire guides system is mounted inside one component — `useGuides()` is
called once, at `src/components/AdminDashboard.tsx:39`, with `GuidesLauncher`,
`WrittenGuide`, `GuidedTour`, `GuideDemoHost`, and `NewStaffPrompt` rendered at
`AdminDashboard.tsx:128-148` and the Help button at
`src/components/admin/AdminHeader.tsx:64-73`. `AdminDashboard` renders only
behind `if (isAdmin)` (`src/App.tsx:172-176`); everyone else falls through to the
`ClientLayout` route tree (`src/App.tsx:179-192`), which has zero help
affordances.

This was deliberate. The original spec lists "guides for roles outside the admin
dashboard" as a verbatim non-goal
(`docs/superpowers/specs/2026-06-23-help-guides-tour-design.md:26-27`). This
document reverses that decision for the client audience.

## Goal

A discoverable **Help & Guides** feature in the client portal, offering written
step-by-step guides for every task a client, parent, or professional can
actually perform, plus one short interactive orientation tour. Discovery is a
`?` button plus a one-time dismissible nudge.

## Scoping constraint: what there is to teach

The customer asked about "manipulating their content." The client portal has
little manipulation to teach, and three visible nav destinations are dead ends.
These are **documented as defects, not taught**:

- **Bundles** — `listContentGroups` requires `MANAGE_CONTENT_GROUPS` and swallows
  the failure into `return []` (`convex/contentGroups.ts:81-85`). No non-admin
  role holds it (`convex/permissions.ts:94-107`), so `/bundles` is permanently
  empty while reading as "staff haven't made any."
- **My Shares** — client and parent hold `SHARE_CONTENT`, but the only live mount
  of `ThirdPartyShareModal` is `ContentManager.tsx:1629` (admin-only). Both
  `ContentViewer` components are dead code, imported by nothing. So `/shares`
  can only ever show an empty state pointing at a button this audience does not
  have.
- **For You → Purchase** — `createOrder` returns `{orderId, purchaseRequestId}`
  (`convex/orders.ts:82`), but `src/components/RecommendedContent.tsx:67-78`
  assigns that whole object to `orderId` and passes it to
  `completeOrder({orderId})`. Argument validation rejects it.

There are also no favorites, bookmarks, notes, or resume-progress anywhere in
the codebase — the `progress` prop on `ContentCard.tsx:20-24` is never passed by
any caller. "Organize your content" currently has nothing to document.

These findings ship as a **separate gaps report** for the customer, not as
guide content.

## Decisions

- **Scope:** document what works today; report the gaps separately.
- **Format:** hybrid — written guides for every topic, plus exactly one
  interactive orientation tour that never leaves the portal shell.
- **Catalog:** one shared catalog with an `audience` field and an optional
  `requiredPermission`, rather than a duplicate client module.
- **Discovery:** `?` button plus a one-time dismissible nudge. No auto-firing
  modal — it would seize focus on arrival, which conflicts with WCAG 2.2 AA as a
  core organizational tenet and skews badly for this audience.
- **Persistence:** `localStorage` keyed by user id.

## Structural constraints discovered

Two properties of the client portal shape the design and are not negotiable
without larger refactors:

1. **Opening content unmounts the shell.** `/view/:contentId` is a sibling route
   at `src/main.tsx:35`, outside `<App/>` and therefore outside `ClientLayout`.
   Content cards navigate there (`client/ContentCard.tsx:34`). `GuidedTour` keeps
   step state in local `useState` (`GuidedTour.tsx:29`) with no persistence, so
   "find it → open it → play it" cannot be one continuous tour. Any tour must
   stay inside the shell.
2. **The same destination is two different DOM nodes.** Client nav is 8 desktop
   tabs (`ClientHeader.tsx:19-28`) versus 3 bottom-nav items plus a 5-item More
   drawer on mobile (`BottomNav.tsx:9-13`, `MoreDrawer.tsx:11-17`). Only one is
   visible at a time. Drawer targets do not exist in the DOM until the drawer is
   opened.

## Architecture

### Catalog: `guides/guideContent.ts`

`Guide` gains two fields:

```ts
interface Guide {
  id: string;
  title: string;
  summary: string;
  audience: "admin" | "client";
  requiredPermission?: string;   // a PERMISSIONS constant
  writtenSteps: WrittenStep[];
  tourStops: TourStop[];
}
```

All six existing guides are tagged `audience: "admin"`. `pricing-store` and
`create-bundle` additionally declare their `requiredPermission`.

A pure helper becomes the single filtering point:

```ts
export function getGuidesFor(
  audience: Guide["audience"],
  permissions: string[] | undefined,
): Guide[];
```

It returns guides matching the audience whose `requiredPermission` is absent or
held. Being pure, it is unit-testable without rendering.

**This fixes a pre-existing bug.** `GuidesLauncher` currently renders
`GUIDES.map(...)` unfiltered (`GuidesLauncher.tsx:31`), so every staff member is
offered every staff guide regardless of permission. Two concrete failures today:

- `create-bundle` opens on `tab-contentGroups` (`guideContent.ts:349`), but that
  sidebar item is gated by `canManageContentGroups` (`admin/AdminSidebar.tsx:43`,
  filtered at `:78`). A user without `MANAGE_CONTENT_GROUPS` gets a tour whose
  very first stop spotlights nothing — the rAF poll gives up after ~1s and the
  tooltip silently centers (`GuidedTour.tsx:58-63`).
- `pricing-store` opens on `tab-content` (`guideContent.ts:281`), which is not
  gated, so it resolves — but it then walks the user through Set pricing, which
  requires `SET_CONTENT_PRICING`. The guide is offered to people who cannot
  perform it.

Adding a second audience to an unfiltered catalog would make this worse, so it
is fixed here rather than deferred.

### Consumers take a list

- `GuidesLauncher` accepts a `guides: Guide[]` prop instead of importing
  `GUIDES` directly (`GuidesLauncher.tsx:31`).
- `useGuides(guides: Guide[])` accepts the filtered list instead of closing over
  the module-level `GUIDES` (`useGuides.ts:2,16-19`).

Both admin and client call sites pass the result of `getGuidesFor(...)`.

### Engine fix: visible-target resolution

`GuidedTour` resolves targets with `document.querySelector` — first match wins
(`GuidedTour.tsx:46,53`). With the responsive dual nav, the desktop tab and the
mobile bottom-nav item for one destination share a `data-tour` value and only
one is visible; `querySelector` can return the CSS-hidden node, whose
`getBoundingClientRect()` is all zeros, spotlighting a 0×0 rect at the origin.

Replace both call sites with `querySelectorAll` plus selection of the first
element having a non-zero bounding rect, falling back to the existing rAF poll
(`GuidedTour.tsx:58-63`) when none is visible yet. No prop or type change; the
admin tours become more robust for free.

### Client wiring: `ClientLayout`

`ClientLayout` already queries `getCurrentUserProfile` (`ClientLayout.tsx:19`),
so `effectivePermissions` and the user id are in scope — no new query.

It gains `useGuides(getGuidesFor("client", permissions))`, a
`TourActiveProvider` (`TourActiveContext` defaults to `false` with no provider,
so this is additive), and renders `GuidesLauncher`, `WrittenGuide`,
`GuidedTour`, and `ClientHelpPrompt`.

**Deliberately not ported from the admin host:**

- `GuideDemoHost` — imports Convex and hardcodes
  `DEMO_TOURS = new Set(["pricing-store","share-content"])`; admin-specific.
- The synthesized global Escape keydown on tour teardown
  (`AdminDashboard.tsx:46-55`), which closes whatever dialog layer is topmost.

### Entry points

- `ClientHeader` gains a `?` icon button beside the theme toggle, mirroring
  `AdminHeader.tsx:64-73`. Placed near the existing controls at
  `ClientHeader.tsx:54,69`.
- `MoreDrawer` gains a **Help** row after its five items (`MoreDrawer.tsx:11-17`)
  so the feature is reachable on mobile, where the header is condensed.

### `guides/ClientHelpPrompt.tsx`

The `NewStaffPrompt` pattern (`NewStaffPrompt.tsx:11-20`) with a per-user key:

```
guides-client-prompt-seen:${userId}
```

Distinct from the staff key `guides-prompt-seen` (`NewStaffPrompt.tsx:5`) so the
two audiences never share dismissal state. Keying by user id fixes the
shared-device collision: every existing flag is browser-global, a hazard already
documented in-repo at `src/lib/adminTabs.ts:26` ("persisted in localStorage and
shared across every user"). On a shared family tablet or clinic device, the
first person to dismiss would otherwise hide it from everyone.

Cross-device re-display is accepted: a dismissible pointer shown once more on a
second device is low cost, and avoiding it would require new Convex state the
guides feature has never needed.

## The interactive tour: "Getting around"

One tour, four stops, all inside `ClientLayout` so nothing unmounts:

Home → Browse → Shop → Profile.

Point-and-guide: **no `action: "click"`** anywhere, so the tour does not yank
people between pages while they are being oriented.

Shipped with four stops rather than the six planned, and without the mobile
More exception: For You, Orders and Requests live in the mobile More drawer and
are absent from the DOM until it is opened, so no single stop ordering resolves
on both viewports. The four kept are the destinations both the desktop tabs and
the mobile bar render. The written "Getting around" guide still covers all six,
and says where to find the drawer ones on a phone.

Bundles and Shares are omitted — they are dead ends.

New `data-tour` anchors are confined to the shell: `ClientHeader` tabs,
`BottomNav` items, the More trigger, and the profile button. Desktop and mobile
counterparts for one destination share an anchor value, resolved by the
visible-target fix above.

## Written guides (audience: client)

1. **Getting around the portal** — companion to the tour, for people who would
   rather read.
2. **Find something and open it** — Home carousel and Browse search; opening a
   card leaves the portal for a full-screen viewer, and how to get back
   (browser Back, or the Navbar Home button).
3. **Watch, listen, or download it** — the three viewer modes.
4. **Getting access to paid content** — Request to Purchase → staff approval →
   pay → finish from My Requests. Spans days and a staff action, so written only.
5. **For You** — what a recommendation is and reading the therapist's note.
   Does not document the Purchase button, which is broken.
6. **Your orders and receipts** — order history, receipts, access expiry.
7. **Your profile and appearance** — name, photo, light/dark, sign out.
8. **Recommending content to a client** — `requiredPermission:
   RECOMMEND_CONTENT`, so only professionals see it. `RecommendButton` returns
   `null` without it (`RecommendButton.tsx:28-30`).

Guides 1-7 are visible to client, parent, and professional. Guide 8 is
permission-filtered rather than given its own audience.

### Screenshot caveat

A `professional` sees drafts and unpublished items (`convex/content.ts:298-302`)
while client and parent see a filtered catalog (`convex/content.ts:327-347`).
Any screenshots must be captured from a client account, not a professional one.

## Separate deliverable: gaps report

A short document covering the three dead ends and the absent
favorites/progress features, written for the customer rather than for the
repository's internal use. It states what is broken, the user-visible symptom,
and that the guides deliberately route around each.

## Testing

Follow existing guides conventions (Vitest; `*.test.tsx` under happy-dom
importing `@testing-library/jest-dom/vitest`):

- `guideContent.test.ts` — the enumerated-id contract (`:5-13`) must be extended
  with the new client guide ids; the existing unique-id assertion still applies.
- New `getGuidesFor` tests: audience partitioning; `requiredPermission` honored;
  a user without `MANAGE_CONTENT_GROUPS` no longer offered `create-bundle` and
  one without `SET_CONTENT_PRICING` no longer offered `pricing-store` (the
  regressions this fixes); a professional offered the recommend guide while
  client and parent are not.
- `GuidedTour` — target resolution picks the visible element when two nodes
  share a `data-tour` value and one has a zero-size rect.
- `ClientHeader` / `MoreDrawer` — the help entry points render and invoke the
  launcher handler.
- `ClientHelpPrompt` — shows when its per-user key is unset, hides after
  dismissal, and does not read or write the staff key.

Note that `AdminDashboard` and `AdminHeader` have no test files today; the admin
wiring is covered only by typecheck and build. The client wiring lands in the
same untested seam, so the component tests above matter more than usual.

Verification: `npm test`, then
`npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`.

## Versioning

Per CLAUDE.md this is a new user-facing feature: **minor** bump in
`package.json`, with a matching dated `CHANGELOG.md` entry in the same commit.

## Non-goals

- Fixing the three dead-end surfaces. Documented, not repaired, per the scoping
  decision. Repairing them is a separate piece of work that would change what
  there is to teach.
- Tours that survive leaving the portal shell. Would require relocating
  `/view/:contentId` inside `ClientLayout` or adding cross-route tour state.
- Per-user guide state in Convex.
- Hosted video, and translation. There is no i18n layer in the app today, so
  multilingual help would be a first and is out of scope here.
