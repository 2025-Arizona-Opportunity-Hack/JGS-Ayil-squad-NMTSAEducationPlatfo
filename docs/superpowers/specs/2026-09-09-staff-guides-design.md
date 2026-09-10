# Staff Guides — Storing and Tagging Content

Date: 2026-09-09
Status: Approved (pending implementation plan)

## Problem

A manager at NMTSA asked for a tutorial covering "anyone who has access that may
be storing content, tagging their content etc.", and confirmed she means **staff
members** — the contributors and editors who add content to the portal.

Six staff guides already exist. An audit of all 29 distinct staff tasks against
that coverage found **one guide closes its own loop** (`upload-content`).
Essentially everything a staff member does to content *after* pressing Save is
undocumented: editing it, finding it again, granting access, reviewing a
submission.

On tagging specifically — the customer's literal ask — the entire corpus is one
sentence in `src/components/guides/guideContent.ts:127-131`:

> "Keywords that help you and clients find and group content. Type a tag and
> press Enter to add each one."

Nothing covers changing tags later, that typed tags are silently lowercased
(`src/components/ui/tag-input.tsx:37`), or that the Content sidebar has a
working tag-chip filter at all. That sentence is also **wrong** about clients:
they cannot filter by tag anywhere in the portal.

## Goal

Three new written staff guides plus two amendments, so a contributor who stores
and tags content can learn the whole loop — add it, tag it, find it again, change
it, and understand why a client can or cannot see it.

## Non-goals

- Interactive tours for the new guides. There are no `data-tour` anchors on the
  Tags field, the tag filter, the Edit modal, or Manage Access, and
  `GuideDemoHost` sandboxes only `pricing-store` and `share-content`
  (`src/components/guides/GuideDemoHost.tsx:14`). Any new tour would have to
  drive **real** content, which is not acceptable.
- Guides for owner/admin-only surfaces (Users, Groups, Invites, Site Settings,
  Analytics, Orders, Debug). Outside the cohort the customer named.
- A `review-content` guide. Real gap, but it serves editors and admins rather
  than the contributors she described. Fast follow.
- Bulk actions. The toolbar is ungated in the UI while its mutations reject —
  documenting it would teach a failure. See the gaps report.
- Fixing the date, Author Name, tag-casing, or permission-asymmetry defects.
  Recorded, not repaired.

## One code fix, deliberately in scope

**The create form's "Make this content public" checkbox does nothing.**

`src/components/ContentManager.tsx:1147-1151` spreads `{...register("isPublic")}`
onto a Radix `CheckboxPrimitive.Root`, which renders a `<button role="checkbox">`
rather than an `<input>` (`src/components/ui/checkbox.tsx:8-24`). React Hook
Form's `register` wires an `onChange` that Radix never calls — Radix emits
`onCheckedChange`. The box toggles visually and the form always submits the
`:136` default `isPublic: false`.

`ContentEditModal.tsx:392-401` wires the same control correctly, which is why
this is easy to miss.

It is fixed here rather than deferred because `content-visibility` exists to
answer "why can't clients see it?", and with this bug its headline advice would
be "tick the box, then go and fix it somewhere else." The fix mirrors the Edit
modal:

```tsx
<Checkbox
  id="isPublic"
  checked={watch("isPublic")}
  onCheckedChange={(checked) => setValue("isPublic", checked as boolean)}
/>
```

`upload-content`'s visibility step (`guideContent.ts:133`), which currently
documents the broken control as working, is corrected in the same change.

## Architecture

No structural change. Three entries are appended to the `GUIDES` array in
`src/components/guides/guideContent.ts` with `audience: "admin"`, and two
existing entries gain steps. The catalog, `getGuidesFor`, `GuidesLauncher`,
`useGuides`, and `WrittenGuide` are all unchanged — the launcher already hides
"Start tour" for guides with no tour stops
(`src/components/guides/GuidesLauncher.tsx:36`), so written-only guides need no
new handling.

### New guide 1: `organize-with-tags`

**Title:** "Tag content so you can find it again"
**requiredPermission:** none — every staff role can add and filter by tags, and
gating would hide it from exactly the contributors who tag most.
**Format:** written-only, `tourStops: []`.

Must cover:

- Adding tags on the create form, and the `TagInput` mechanics
  (`src/components/ui/tag-input.tsx:54-76, 87-105`): Enter, comma, or Tab
  commits the tag you have typed — note Tab only does so **while the box has
  text in it**, and moves focus normally when empty (`:55`). Clicking away also
  commits (`:104-105`). Backspace in an empty box removes the last tag
  (`:58-59`). Each tag's × removes that one (`:87-94`). Pasting a
  comma-separated list adds them all at once (`:65-76`) — the fastest way to tag
  an item.
- That every tag is **silently lowercased** as you type
  (`src/components/ui/tag-input.tsx:37`), so `Autism` becomes `autism`.
- Changing tags later through ⋯ → Edit
  (`src/components/ContentEditModal.tsx:377-389`).
- Finding content by tag: the tag chips in the Content sidebar
  (`src/components/ContentManager.tsx:222-224`).
- **The search box does not match tags.** It matches title and description only
  (`src/components/ContentManager.tsx:218-220`) — the tag chips are a separate
  control. The archive search (`src/components/admin/ArchivedContent.tsx:73`)
  and the bundle picker (`src/components/ContentGroupContentModal.tsx:84`) *do*
  match tags.
- A short house-vocabulary note: agree on words and reuse them, because two
  spellings make two chips matching different sets.
- **Correcting the existing claim:** clients never filter by tag. They can see
  tags on an item they have opened, and nothing more.

### New guide 2: `edit-content`

**Title:** "Change content after you've saved it"
**requiredPermission:** `PERMISSIONS.EDIT_CONTENT`
**Format:** written-only, `tourStops: []`.

Must cover:

- Finding the item (search box, status/type filters, tag chips).
- Opening ⋯ → Edit (`src/components/admin/ContentList.tsx:433-438`).
- What can be changed, including tags — the hand-off to `organize-with-tags`.
- Replacing the file (`src/components/ContentEditModal.tsx:306-359`), and that
  the Edit modal has **no chunked-upload path**, so a replacement over 500 MB
  will not work there.
- Acting on reviewer feedback: the banner at
  `src/components/ContentEditModal.tsx:199-241`.
- **The ownership and status rule**, verbatim from `convex/content.ts:676-684`:
  without `VIEW_ALL_CONTENT` you may edit only content you created, and only
  while it is in draft, rejected, or changes-requested. With it, anything, any
  time.
- That editing a published item does **not** send it back for review.
- A caution that Author Name renders blank in the Edit modal and availability
  dates do not currently save correctly — both recorded in the staff gaps
  report — so avoid touching those two fields there for now.

### New guide 3: `content-visibility`

**Title:** "Why clients can't see it yet"
**requiredPermission:** none — **deliberately**. The contributors who hit this
usually cannot fix it themselves; the guide names `MANAGE_CONTENT_ACCESS` and
says to ask an admin — matching the phrasing `pricing-store` already uses
verbatim at `guideContent.ts:345` ("if you don't see Set pricing, ask an
admin"). Gating it would hide the diagnostic from the people who
need it.
**Format:** written-only, `tourStops: []`.

Must cover the four conditions that must **all** hold, from
`convex/content.ts:327-347`:

1. Status is **published** — not draft, review, rejected, or archived.
2. It is **available**: `active` is on and today falls inside any start/end
   dates.
3. Either it is **public**, or
4. the client has been **granted access** — individually, by role, by group, or
   through a share, recommendation, or purchase.

Then: how to grant access through ⋯ → Manage Access
(`src/components/AccessManagementModal.tsx:183-348`), and a short checklist to
run when a client reports they cannot see something.

### Amendment 1: `upload-content`

- **Correct the visibility step** (`guideContent.ts:133`) so it matches the
  fixed control and points at `content-visibility` for the rest of the picture.
- **Google Drive import**: the button appears on all four file fields
  (`src/components/GoogleDrivePicker.tsx:337`) and is invisible unless
  `VITE_GOOGLE_API_KEY` and `VITE_GOOGLE_CLIENT_ID` are configured
  (`:31-32, 207`).
- **Large files**: over 500 MB uploads in 50 MB chunks
  (`src/components/ContentManager.tsx:86-87`) to get past Convex's two-minute
  single-request window. No thumbnail is generated for a chunked upload — the
  generator needs the whole video as one blob (`:589-592`) — so those items need
  a thumbnail supplied by hand. The Edit modal has no chunked path, so it cannot
  replace a file that large.

### Amendment 2: `create-bundle`

Expand step 3 (`guideContent.ts:398`) with the picker mechanics
(`src/components/ContentGroupContentModal.tsx:105-234`) and the fact that the
picker's search **does** match tags (`:84`) — the strongest practical payoff for
tagging, and currently unmentioned anywhere.

## Staff gaps report

`docs/client-portal-gaps.md` is client-scoped and already referenced from PR #8,
so staff-side defects get their own `docs/staff-portal-gaps.md`, in the same
plain-language register for NMTSA:

1. Availability dates saved from the Edit modal are corrupted — the default is
   formatted `"yyyy-MM-dd'T'HH:mm"` (`src/components/ContentEditModal.tsx:81-82`)
   and submit appends `"T12:00:00"` (`:145-146`), producing an invalid date.
2. Author Name renders blank in the Edit modal and is wiped on save — the field
   is registered (`:279`) and submitted (`:142`) but missing from
   `defaultValues` (`:73-84`).
3. The bulk-action toolbar is shown to staff whose mutations then reject
   (`src/components/admin/ContentActions.tsx:90-209` vs
   `convex/content.ts:1637, 1706`).
4. Tag casing is inconsistent — newly typed tags are lowercased
   (`src/components/ui/tag-input.tsx:37`) while stored tags render as-is
   (`:28-33`) and the server normalises nothing, so seeded Title-Case tags and
   typed lowercase ones appear as separate chips matching different sets.
5. An editor cannot move their own draft forward: `editor` holds
   `REVIEW_CONTENT` and `PUBLISH_CONTENT` but not `SUBMIT_FOR_REVIEW`, and
   `approveContent` only accepts rows already in `review`
   (`convex/permissions.ts:75-93`, `convex/content.ts:766-768`).

## Testing

- `guideContent.test.ts`: extend the enumerated-id contract to the three new
  ids. The existing unique-id, audience, and written-steps assertions continue
  to apply. Add an assertion that every new guide has empty `tourStops`, so a
  future tour cannot be added without also adding its anchors.
- `getGuidesFor` tests: a user without `EDIT_CONTENT` is not offered
  `edit-content`; a user with it is. `organize-with-tags` and
  `content-visibility` are offered regardless of permissions.
- New `ContentManager` test: ticking "Make this content public" results in
  `isPublic: true` being submitted. Confirm it fails against the current code
  before the fix.

Verification: `npm test`, then
`npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`.

## Versioning

This work is added to the existing PR #8, which already bumped to **0.8.0**.
The policy is one bump per push, so this **amends the existing 0.8.0 entry** in
`CHANGELOG.md` rather than adding a new version.

## Known consequence

The admin launcher grows from six guides to nine in a flat, scrolling list. It
still works — `GuidesLauncher` is `max-h-[85vh] overflow-y-auto` — but grouping
is likely wanted before the list reaches a dozen. Out of scope here.
