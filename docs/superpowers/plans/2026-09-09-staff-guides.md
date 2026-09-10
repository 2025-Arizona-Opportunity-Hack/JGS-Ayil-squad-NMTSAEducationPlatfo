# Staff Guides Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give staff who store and tag content the guides they are missing — tagging, editing after save, and why clients can't see an item — plus fix the create form's broken public checkbox and correct six wrong menu labels in the existing guides.

**Architecture:** No structural change. Three entries are appended to the `GUIDES` array in `src/components/guides/guideContent.ts` with `audience: "admin"`, two existing entries gain steps, and six existing sentences are corrected. All new guides are written-only (`tourStops: []`) — `GuidesLauncher` already hides "Start tour" for those. One React Hook Form wiring bug is fixed in `ContentManager.tsx`.

**Tech Stack:** React 19 + Vite, TypeScript, Convex, react-hook-form + zod, Radix UI, Vitest (happy-dom for components, edge-runtime for Convex).

**Spec:** `docs/superpowers/specs/2026-09-09-staff-guides-design.md`

## Global Constraints

- **Commits: never add `Co-Authored-By` lines.** Hard project rule (CLAUDE.md).
- **Accessibility (WCAG 2.2 AA)** is a core organizational tenet.
- Component tests are `*.test.tsx`, first two lines exactly `// @vitest-environment happy-dom` then `import "@testing-library/jest-dom/vitest";`. Pure-logic tests are `*.test.ts` with no pragma.
- Components using Convex need `vi.mock("convex/react", ...)` declared **before** the component import. Use the `vi.hoisted` pattern from `src/components/ContentPricingModal.test.tsx:6-11`.
- Run tests: `npm test`. Scope: `npm test -- <path>`.
- Typecheck/build: `npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`.
- **Do NOT bump `package.json`.** This branch already bumped to 0.8.0 and that release has not shipped; new entries are **amendments to the existing `## 0.8.0 — 2026-09-02` section**.
- **All user-facing guide copy must use verbatim on-screen labels.** Every label in this plan was verified against the source. Do not paraphrase a label, and do not invent one. If a step seems to need a label this plan does not give you, stop and ask rather than guessing — guides describing controls that do not exist is the exact defect this work is correcting.
- The row action menu trigger is a **vertical** ⋮ icon (`MoreVertical`, `src/components/admin/ContentList.tsx:30,396`) with `aria-label="Actions for {title}"`. It is **not** a horizontal ⋯.

## Verified label reference

Use these exact strings. Source file and line given for each.

**Create form** (`src/components/ContentManager.tsx`): `Create New Content` :922 · `Title *` :927 · `Tags` :1132 · `Type a tag and press Enter...` :1141 · `Make this content public` :1153 · `Availability Settings` :1161 · `Set content as in-active` :1175 · `Start Date (optional)` :1184 · `End Date (optional)` :1221 · `Create Content` :1282

**Edit modal** (`src/components/ContentEditModal.tsx`): `Edit Content` :192 · `Title *` :245 · `Author Name` :276 · `Attachment Type *` :289 · `Choose a new file to replace` :319 · `View` :332 · `Tags` :377 · `Make this content public` :399 · `Active` :408 · `Update Content` :564 · banner headings `Changes Requested` / `Content Rejected` :214

**Row action menu** (`src/components/admin/ContentList.tsx`): `Preview Content` :406 · `Review Content` :416 · `Submit for Review` :428 · `Edit Content` :436 · `Copy Share Link` :447 · `Share with 3rd Party` :455 · `Recommend to User` :463 · `Manage Access` :471 · `Set Pricing` :479 · `Archive Content` :500 · `Delete Content` :511

**Filters sidebar** (`src/components/admin/ContentFilters.tsx`): `Filters` :89 · `Clear` :108 · `Search Content` :117 · `Search by title or description...` :123 · `Status` :151 · `Attachment Type` :190 · `Filter by Tags` :235 · `Filter by Content Bundle` :279 · `Sort By` :300

**Manage Access** (`src/components/AccessManagementModal.tsx`): title `Manage Access: {title}` :173 · `Make this content public (accessible to all users)` :190

**Review modal** (`src/components/ContentReviewModal.tsx`): `Approve & Publish` :434 · `Request Changes` :442 · `Reject` :450

## Facts the copy must respect

- Tags are **lowercased on entry** (`src/components/ui/tag-input.tsx:37`).
- Enter, comma, and Tab commit a tag **only while the box has text**; Tab moves focus normally when empty (`:55`). Blur commits (`:104-105`). Backspace in an empty box removes the last tag (`:58-59`). Pasting a comma-separated list adds them all (`:65-76`).
- The **entire `Filter by Tags` section is hidden** until at least one item in the library has a tag (`src/components/admin/ContentFilters.tsx:231`).
- `Search Content` matches **title and description only** (`src/components/ContentManager.tsx:218-220`). The bundle picker (`src/components/ContentGroupContentModal.tsx:84`) and the archive search (`src/components/admin/ArchivedContent.tsx:73`) **do** match tags.
- `Manage Access` and `Set Pricing` are **owner/admin only** (`MANAGE_CONTENT_ACCESS` / `SET_CONTENT_PRICING`, `convex/permissions.ts:70-108`).
- **Do NOT write that contributors can only edit their own drafts.** That restriction (`convex/content.ts:676-684`) never fires for stock roles: every default role holding `EDIT_CONTENT` also holds `VIEW_ALL_CONTENT` (`convex/permissions.ts:76,86`). Phrase it as "unless your account has a custom permission set".
- Editing **never** changes status (`status` is not an argument of `updateContent`, `convex/content.ts:635-655`).
- Clients cannot filter or search by tag anywhere.

---

### Task 1: Fix the create form's public checkbox

`ContentManager.tsx:1147-1151` spreads `{...register("isPublic")}` onto a Radix `Checkbox`, which renders a `<button role="checkbox">` and never calls the `onChange` that `register` supplies. The box toggles visually and the form always submits the `:136` default `isPublic: false`.

The same file already wires the `active` checkbox correctly with a `Controller` at `:1164-1178`. Match that, not another component.

**Files:**
- Modify: `src/components/ContentManager.tsx:1147-1155`
- Test: `src/components/ContentManager.test.tsx` (create)

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: no API change. `createContent` receives `isPublic: true` when the box is ticked.

- [ ] **Step 1: Write the failing test**

Create `src/components/ContentManager.test.tsx`:

```tsx
// @vitest-environment happy-dom
import "@testing-library/jest-dom/vitest";
import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";

const createContent = vi.fn(async () => "new-content-id");
const { useMutation, useQuery, useAction } = vi.hoisted(() => ({
  useMutation: vi.fn(),
  useQuery: vi.fn(() => undefined),
  useAction: vi.fn(() => vi.fn()),
}));
vi.mock("convex/react", () => ({ useMutation, useQuery, useAction }));

import { ContentManager } from "./ContentManager";

describe("ContentManager create form", () => {
  beforeEach(() => {
    createContent.mockClear();
    // The first useMutation call in the component is createContent.
    let call = 0;
    useMutation.mockImplementation(() => {
      call += 1;
      return call === 1 ? createContent : vi.fn();
    });
  });

  it("submits isPublic: true when the public checkbox is ticked", async () => {
    render(<ContentManager />);

    await userEvent.click(
      screen.getByRole("button", { name: /create content/i })
    );
    await userEvent.type(screen.getByLabelText(/^title/i), "Warm-up rhythms");
    await userEvent.click(
      screen.getByRole("checkbox", { name: /make this content public/i })
    );
    await userEvent.click(
      screen.getByRole("button", { name: /^create content$/i })
    );

    await waitFor(() => expect(createContent).toHaveBeenCalled());
    expect(createContent.mock.calls[0][0]).toMatchObject({ isPublic: true });
  });
});
```

The `call === 1` assumption is verified, not a guess: `createContent` is the first `useMutation` in the component (`src/components/ContentManager.tsx:162`), ahead of `createChunkedContent` (:163), `generateUploadUrl` (:164) and `logUploadFailure` (:165). If you reorder nothing, the first mock is the one asserted on.

Do **not** weaken this assertion to something that passes without the fix — the whole point is that it discriminates. If you cannot get a discriminating assertion working, stop and report rather than committing a test that proves nothing.

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/ContentManager.test.tsx`
Expected: FAIL — `createContent` called with `isPublic: false`. That failure IS the bug. If it fails for any other reason (element not found, mock error), fix the test until it fails on the assertion.

- [ ] **Step 3: Apply the fix**

In `src/components/ContentManager.tsx`, replace the block at `:1147-1155`:

```tsx
              <div className="flex items-center space-x-2" data-tour="field-visibility">
                <Checkbox
                id="isPublic"
                  {...register("isPublic")}
              />
                <Label htmlFor="isPublic" className="font-normal">
                Make this content public
                </Label>
            </div>
```

with:

```tsx
              <div className="flex items-center space-x-2" data-tour="field-visibility">
                <Controller
                  name="isPublic"
                  control={control}
                  render={({ field }) => (
                    <>
                      <Checkbox
                        id="isPublic"
                        checked={field.value}
                        onCheckedChange={(checked) => field.onChange(checked === true)}
                      />
                      <Label htmlFor="isPublic" className="font-normal">
                        Make this content public
                      </Label>
                    </>
                  )}
                />
              </div>
```

`Controller` is already imported at `:4` and `control` is already destructured at `:127`. Do not change the label text or the `data-tour` attribute.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npm test -- src/components/ContentManager.test.tsx`
Expected: PASS.

- [ ] **Step 5: Run the full suite and typecheck**

Run: `npm test`
Expected: PASS.

Run: `npx tsc -p . --noEmit`
Expected: clean.

- [ ] **Step 6: Commit**

```bash
git add src/components/ContentManager.tsx src/components/ContentManager.test.tsx
git commit -m "fix(content): make the create form's public checkbox actually work

register() was spread onto a Radix Checkbox, which renders a button and never
fires the onChange that react-hook-form supplies — so the box toggled visually
and the form always submitted isPublic: false. Wrapped in a Controller,
matching the active checkbox 15 lines below it."
```

---

### Task 2: Correct six wrong menu labels in the existing guides

Six sentences describe a horizontal `⋯` menu (the icon is a vertical `MoreVertical`) and name menu items that do not exist.

**Files:**
- Modify: `src/components/guides/guideContent.ts:174,260,275,300,340,445`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed later. Copy corrections only.

- [ ] **Step 1: Apply all six corrections**

Replace each `detail` / `description` string exactly as given. Change nothing else on those lines.

Line 174 (`share-content` tour stop) — from:
> "In real use you open a content item's ⋯ menu and choose Share. Next, I'll show you with a safe example."

to:
> "In real use you open a content item's ⋮ menu and choose Share with 3rd Party. Next, I'll show you with a safe example."

Line 260 (`content-statuses`) — from:
> "On the item's row, open the ⋯ actions menu and choose Submit for review. This moves the item to 'In review' and hands it to a reviewer. Do this once the draft is complete."

to:
> "On the item's row, open the ⋮ actions menu and choose Submit for Review. This moves the item to 'In review' and hands it to a reviewer. Do this once the draft is complete."

Line 275 (`content-statuses`) — from:
> "Approved and live. Clients you've shared it with — or who purchased it — can now see it. Reviewers publish from the ⋯ menu via Approve / Publish. Note: a published item still needs to be active and within any start/end dates to actually appear to clients."

to:
> "Approved and live. Clients you've shared it with — or who purchased it — can now see it. A reviewer opens Review Content from the ⋮ menu and chooses Approve & Publish. Note: a published item still needs to be active and within any start/end dates to actually appear to clients."

Line 300 (`pricing-store` tour stop) — from:
> "In real use you open a content item's ⋯ menu and choose Set pricing. Next, I'll show you with a safe example."

to:
> "In real use you open a content item's ⋮ menu and choose Set Pricing. Next, I'll show you with a safe example."

Line 340 (`pricing-store` written step) — from:
> "Click the ⋯ button on the content's row and choose Set pricing."

to:
> "Click the ⋮ button at the end of the content's row and choose Set Pricing."

Line 445 (`write-article`) — from:
> "From the Content tab, click Create Content for new content — or open an existing item's ⋯ menu and choose Edit to add text to it."

to:
> "From the Content tab, click Create Content for new content — or open an existing item's ⋮ menu and choose Edit Content to add text to it."

- [ ] **Step 2: Verify no stale references remain**

Run: `grep -n "⋯" src/components/guides/guideContent.ts`
Expected: no output.

Run: `grep -n "choose Share\b\|Submit for review\|Set pricing\|choose Edit\b\|Approve / Publish" src/components/guides/guideContent.ts`
Expected: no output.

- [ ] **Step 3: Run the suite**

Run: `npm test -- src/components/guides/`
Expected: PASS. These are copy changes; no test asserts on this text.

- [ ] **Step 4: Commit**

```bash
git add src/components/guides/guideContent.ts
git commit -m "fix(guides): correct menu labels that do not match the UI

The row actions trigger is a vertical MoreVertical icon, not a horizontal one,
and four named menu items were wrong: Share (Share with 3rd Party), Submit for
review (Submit for Review), Set pricing (Set Pricing), Edit (Edit Content).
Publishing also goes through Review Content, not directly from the row menu."
```

---

### Task 3: Amend `upload-content` and `create-bundle`

**Files:**
- Modify: `src/components/guides/guideContent.ts` — the `upload-content` and `create-bundle` `writtenSteps` arrays

**Interfaces:**
- Consumes: Task 1's fix (the visibility step now describes a working control).
- Produces: nothing consumed later.

- [ ] **Step 1: Correct `upload-content`'s visibility step**

In the `upload-content` guide, find the written step titled `Make this content public` and replace its `detail` with exactly:

> "Checked = anyone with the link can view it, once it is published. Unchecked = restricted, so only people you give access to can see it. If a client says they can't find something, see 'Why clients can't see it yet'."

- [ ] **Step 2: Add three steps to `upload-content`**

Insert after the step titled `Tags`:

```ts
      {
        title: "Importing from Google Drive",
        detail:
          "Each file field also offers a Google Drive button, which pulls a file straight from your Drive instead of your computer. If you don't see it, Drive hasn't been set up for this site — upload from your computer instead.",
      },
```

Insert after the step covering the file upload:

```ts
      {
        title: "Very large files",
        detail:
          "Anything over 500 MB uploads in pieces so it doesn't time out. Two things to know: no thumbnail is made automatically for those, so add a picture yourself if you want one; and you can't swap a file that large from the Edit Content form afterwards.",
      },
```

- [ ] **Step 3: Expand `create-bundle`'s third step**

In the `create-bundle` guide, find the written step titled `Add content to it` and replace its `detail` with exactly:

> "Open the bundle and use Search available content... to find items, then tick the ones you want. That search matches titles, descriptions and tags — so if you tag consistently, one word pulls up everything that belongs together. Untick an item to take it back out."

- [ ] **Step 4: Run the suite and typecheck**

Run: `npm test -- src/components/guides/`
Expected: PASS.

Run: `npx tsc -p . --noEmit`
Expected: clean.

- [ ] **Step 5: Commit**

```bash
git add src/components/guides/guideContent.ts
git commit -m "docs(guides): cover Google Drive import, large files, and the bundle picker

Also corrects the visibility step now that the create form's public checkbox
works, and points at the new visibility guide."
```

---

### Task 4: Add the `organize-with-tags` guide

The customer's literal ask, and the platform's largest documentation gap: tags are currently mentioned in exactly one sentence.

**Files:**
- Modify: `src/components/guides/guideContent.ts` (append to `GUIDES`)
- Test: `src/components/guides/guideContent.test.ts`

**Interfaces:**
- Consumes: the `Guide` shape — `{ id, title, summary, audience, requiredPermission?, writtenSteps, tourStops }`.
- Produces: guide id `organize-with-tags`.

- [ ] **Step 1: Write the failing test**

Append to `src/components/guides/guideContent.test.ts`:

```ts
describe("staff organize-with-tags guide", () => {
  it("is offered to every staff member regardless of permission", () => {
    const ids = getGuidesFor("admin", []).map((g) => g.id);
    expect(ids).toContain("organize-with-tags");
  });

  it("is written-only", () => {
    const guide = GUIDES.find((g) => g.id === "organize-with-tags");
    expect(guide?.tourStops).toHaveLength(0);
    expect(guide?.writtenSteps.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npm test -- src/components/guides/guideContent.test.ts`
Expected: FAIL — `organize-with-tags` is not in the catalog.

- [ ] **Step 3: Append the guide**

Add to the end of the `GUIDES` array:

```ts
  {
    id: "organize-with-tags",
    title: "Tag content so you can find it again",
    summary: "Add tags as you go, keep them consistent, and use the tag filter to pull a set back out.",
    audience: "admin",
    tourStops: [],
    writtenSteps: [
      {
        title: "Where tags live",
        detail:
          "There's a Tags field on the Create New Content form and on Edit Content. The box reads 'Type a tag and press Enter...'.",
      },
      {
        title: "Add a tag",
        detail:
          "Type a word and press Enter. A comma or Tab adds it too, and so does clicking away from the box. Each tag becomes a small badge.",
      },
      {
        title: "Add several at once",
        detail:
          "Paste a comma-separated list — balance, gait, warm-up — and all of them are added together. This is the quickest way to tag something.",
      },
      {
        title: "Capital letters are removed for you",
        detail:
          "Tags are stored in lower case, so typing Autism saves autism. You never have to match capitals when you search later.",
      },
      {
        title: "Remove a tag",
        detail:
          "Click the × on a badge to take it off. Pressing Backspace in an empty box removes the last one you added.",
      },
      {
        title: "Change tags later",
        detail:
          "Open the ⋮ menu at the end of the item's row, choose Edit Content, and edit the Tags field the same way. Editing tags does not send the item back for review.",
      },
      {
        title: "Find things by tag",
        detail:
          "In the Content tab, the Filters panel has a Filter by Tags heading with a chip for every tag in use. Click chips to narrow the list, and use Clear at the top to reset everything.",
      },
      {
        title: "No tags yet? No filter yet",
        detail:
          "The Filter by Tags section only appears once at least one item has a tag. If you can't see it, nothing has been tagged.",
      },
      {
        title: "The search box does not search tags",
        detail:
          "Search Content matches titles and descriptions only. To find things by tag, use the chips instead. Two other places do search tags: the picker when you add content to a bundle, and the search in Archived.",
      },
      {
        title: "Agree on your words",
        detail:
          "A tag is just text, so warmup and warm-up are two separate chips holding different items. Agree a short list as a team and stick to it — that is what makes tags worth having.",
      },
      {
        title: "What clients see",
        detail:
          "Clients see an item's tags when they open it, but they have no way to search or filter by them. Tags are for finding things yourself.",
      },
    ],
  },
```

- [ ] **Step 4: Extend the enumerated-id contract**

`guideContent.test.ts`'s "includes all the expected guides" test enumerates every guide id so an accidental deletion fails loudly. Add one line to it, beside the existing six admin ids:

```ts
    expect(ids).toContain("organize-with-tags");
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `npm test -- src/components/guides/guideContent.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the full suite and typecheck**

Run: `npm test` then `npx tsc -p . --noEmit`
Expected: both clean.

- [ ] **Step 7: Commit**

```bash
git add src/components/guides/guideContent.ts src/components/guides/guideContent.test.ts
git commit -m "docs(guides): add the tagging guide for staff

Covers adding, pasting, editing and removing tags, the automatic lower-casing,
the tag filter and when it appears, which searches match tags and which do not,
and that clients cannot filter by them."
```

---

### Task 5: Add the `edit-content` and `content-visibility` guides

Both cover the post-save lifecycle, which currently has no coverage at all.

**Files:**
- Modify: `src/components/guides/guideContent.ts` (append to `GUIDES`)
- Test: `src/components/guides/guideContent.test.ts`

**Interfaces:**
- Consumes: `PERMISSIONS` (already imported in `guideContent.ts`), the `Guide` shape.
- Produces: guide ids `edit-content` and `content-visibility`.

- [ ] **Step 1: Write the failing tests**

Append to `src/components/guides/guideContent.test.ts`:

```ts
describe("staff post-save guides", () => {
  it("gates edit-content on EDIT_CONTENT", () => {
    expect(getGuidesFor("admin", []).map((g) => g.id)).not.toContain("edit-content");
    expect(
      getGuidesFor("admin", [PERMISSIONS.EDIT_CONTENT]).map((g) => g.id)
    ).toContain("edit-content");
  });

  it("offers content-visibility to everyone, including staff who cannot grant access", () => {
    expect(getGuidesFor("admin", []).map((g) => g.id)).toContain("content-visibility");
  });

  it("keeps both guides written-only", () => {
    for (const id of ["edit-content", "content-visibility"]) {
      const guide = GUIDES.find((g) => g.id === id);
      expect(guide?.tourStops).toHaveLength(0);
      expect(guide?.writtenSteps.length).toBeGreaterThan(0);
    }
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/components/guides/guideContent.test.ts`
Expected: FAIL — neither guide exists.

- [ ] **Step 3: Append `edit-content`**

```ts
  {
    id: "edit-content",
    title: "Change content after you've saved it",
    summary: "Find an item, change its details or swap the file, and act on a reviewer's feedback.",
    audience: "admin",
    requiredPermission: PERMISSIONS.EDIT_CONTENT,
    tourStops: [],
    writtenSteps: [
      {
        title: "Find the item",
        detail:
          "Go to the Content tab. Use Search Content for a word from the title, or narrow the list with Status, Attachment Type, or the tag chips.",
      },
      {
        title: "Open it for editing",
        detail:
          "Click the ⋮ button at the end of the item's row and choose Edit Content.",
      },
      {
        title: "Change the details",
        detail:
          "Title, description, attachment type, external URL, tags and visibility can all be changed here. Save with Update Content.",
      },
      {
        title: "Swap the file",
        detail:
          "Under the file field, View opens the current file and Choose a new file to replace swaps it. Pick a file matching the attachment type — the form will tell you if it doesn't.",
      },
      {
        title: "Files over 500 MB",
        detail:
          "Very large files can't be replaced from this form. Create the item again with the new file, or ask an admin.",
      },
      {
        title: "If a reviewer sent it back",
        detail:
          "A Changes Requested or Content Rejected banner appears at the top with the reviewer's notes and the date. Make the changes, save, then submit it for review again from the ⋮ menu.",
      },
      {
        title: "Editing does not restart review",
        detail:
          "Changing a published item leaves it published and the change is live straight away. Only Submit for Review and a reviewer's decision move an item between stages.",
      },
      {
        title: "Two fields to leave alone for now",
        detail:
          "Author Name shows up blank on this form even when one is set, and saving clears it. Start and end dates don't save correctly from here either — set those when you first create the item. Both are known problems and are being tracked.",
      },
      {
        title: "If saving is refused",
        detail:
          "Most staff can edit any item at any time. If your account has a custom permission set, you may be limited to items you created and only while they're a draft, rejected, or have changes requested — the message on screen will say which.",
      },
    ],
  },
```

- [ ] **Step 4: Append `content-visibility`**

```ts
  {
    id: "content-visibility",
    title: "Why clients can't see it yet",
    summary: "Four things have to be true before a client sees an item — here's how to check each one.",
    audience: "admin",
    tourStops: [],
    writtenSteps: [
      {
        title: "Four things must all be true",
        detail:
          "An item reaches a client only when it is published, it is available, and either it is public or that client has been given access. Work down the list in order.",
      },
      {
        title: "1. Is it published?",
        detail:
          "Check the item's status in the Content list. Draft, In review, Rejected and Changes Requested are all invisible to clients. Only Published is visible.",
      },
      {
        title: "2. Is it available?",
        detail:
          "Open Edit Content and check Availability Settings. Active must be on. If a start date is set it must already have passed, and if an end date is set it must still be in the future. Leaving a date empty places no restriction.",
      },
      {
        title: "3. Is it public?",
        detail:
          "A public item is visible to every signed-in client once it is published and available. The Make this content public checkbox is on both the create and edit forms.",
      },
      {
        title: "4. Or has that client been given access?",
        detail:
          "If it isn't public, someone has to be granted access. Open the ⋮ menu on the item's row and choose Manage Access.",
      },
      {
        title: "Granting access",
        detail:
          "In Manage Access you can grant to named people, to a whole role — client, parent or professional — or to a user group. An expiry date applies to every grant you make in that save. A grant reaches only the item you opened it from.",
      },
      {
        title: "If you don't see Manage Access",
        detail:
          "Granting access needs a permission most staff don't have. If Manage Access isn't in the menu, ask an admin to grant it for you.",
      },
      {
        title: "Quick checklist",
        detail:
          "A client says they can't find something: is it Published? Is Active on and are the dates right? Is it public, or were they — or their role or group — actually granted access? One of those four is almost always the answer.",
      },
    ],
  },
```

- [ ] **Step 5: Extend the enumerated-id contract**

Add two lines to `guideContent.test.ts`'s "includes all the expected guides" test, beside the existing ids:

```ts
    expect(ids).toContain("edit-content");
    expect(ids).toContain("content-visibility");
```

- [ ] **Step 6: Run the tests to verify they pass**

Run: `npm test -- src/components/guides/guideContent.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the full suite and typecheck**

Run: `npm test` then `npx tsc -p . --noEmit`
Expected: both clean.

- [ ] **Step 8: Commit**

```bash
git add src/components/guides/guideContent.ts src/components/guides/guideContent.test.ts
git commit -m "docs(guides): add editing and visibility guides for staff

edit-content covers finding an item, changing it, replacing the file, reviewer
feedback, and that editing never restarts review. content-visibility walks the
four conditions a client's view depends on, and is deliberately ungated so the
staff who hit the problem can read it even though granting access is limited."
```

---

### Task 6: Staff gaps report

**Files:**
- Create: `docs/staff-portal-gaps.md`

**Interfaces:**
- Consumes: nothing.
- Produces: nothing consumed later.

- [ ] **Step 1: Write the document**

Create `docs/staff-portal-gaps.md`. Match the register of `docs/client-portal-gaps.md`: plain language for a non-technical reader, the user-visible symptom first, code references only in parentheses as evidence, and an `**Options:**` line closing each entry.

```markdown
# Staff side — problems found while writing the staff guides

Written 2026-09-09, while documenting how staff store and tag content.

Documenting the staff side turned up five things the guides have to work
around. None is caused by the guides; all of them affect people using the
portal today.

## 1. Author Name is wiped when you edit an item

The Edit Content form always shows Author Name as empty, even when the item has
one, and saving replaces the stored name with nothing. Anyone opening an item to
fix a typo will silently remove its byline
(`src/components/ContentEditModal.tsx:73-84, 142, 279`).

**Options:** show the current author when the form opens, or hide the field
until it does.

## 2. Availability dates cannot be changed from the Edit form

Start and end dates saved from Edit Content are stored as an invalid value, so
scheduling set there does not take effect
(`src/components/ContentEditModal.tsx:81-82, 145-146`). Dates set when the item
is first created work correctly.

**Options:** fix the date handling on the edit form, or hide those two fields
there until it is fixed.

## 3. Bulk actions are offered to staff who cannot use them

The toolbar that appears when you select several items shows Visibility, Add to
Bundle and Archive to everyone, but the action is refused unless you have the
matching permission (`src/components/admin/ContentActions.tsx:90-209`). Staff
see a button, use it, and get an error.

**Options:** hide the actions a person cannot perform, the way the row menu
already does.

## 4. Tags typed today and tags already in the system don't match

Tags typed into the form are saved in lower case, but tags that were already in
the system keep their capitals (`src/components/ui/tag-input.tsx:37`). The two
appear as separate chips in the tag filter, each holding different items, so
filtering by one misses the other.

**Options:** convert existing tags to lower case once, so there is a single chip
per tag.

## 5. Editors cannot submit their own drafts

An editor can review and publish other people's work but has no Submit for
Review action on their own drafts, and a draft cannot be approved until it has
been submitted (`convex/permissions.ts:75-93`, `convex/content.ts:766-768`). An
editor's own draft has no way forward without help from an owner or admin.

**Options:** give editors the Submit for Review permission, or let a reviewer
publish a draft directly.

## Also worth knowing

**Professionals see everything.** Accounts with the professional role receive
every item in the library — including drafts, items in review, rejected items,
and items that are switched off or out of date
(`convex/content.ts:299-302`, `convex/permissions.ts:96`). This may well be
intended, since professionals are clinical staff, but it is worth confirming:
it means unpublished work is visible to them as soon as it is created.

**Access granted to a whole bundle does nothing.** Opening Manage Access from a
bundle saves records that nothing ever reads
(`convex/contentGroups.ts:227`). Grant access on the individual items instead.
```

- [ ] **Step 2: Commit**

```bash
git add docs/staff-portal-gaps.md
git commit -m "docs: record staff-side problems found while writing the guides"
```

---

### Task 7: Changelog

**Files:**
- Modify: `CHANGELOG.md` — the existing `## 0.8.0 — 2026-09-02` section

**Interfaces:**
- Consumes: Tasks 1-6 complete.
- Produces: nothing.

- [ ] **Step 1: Add bullets to the existing 0.8.0 entry**

Do **not** add a new version heading and do **not** change `package.json`. Append these to the end of the existing `## 0.8.0 — 2026-09-02` bullet list, matching its `New:` / `Fix:` prefix convention and its wrapping:

```markdown
- New: Three staff guides — tagging content so you can find it again, changing
  content after you've saved it, and why a client can't see an item yet. All
  three are in the Help menu alongside the existing guides.
- Fix: The Make this content public checkbox on the Create New Content form now
  works. It previously ticked on screen but saved as unchecked, so every new
  item was created restricted no matter what you chose. Items created before
  this fix keep their stored setting and may need changing by hand.
- Fix: Guide instructions now match the buttons on screen. Several referred to
  a menu item by the wrong name, or to the wrong menu icon.
```

- [ ] **Step 2: Verify the whole tree**

Run: `npm test`
Expected: PASS.

Run: `npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add CHANGELOG.md
git commit -m "docs: record the staff guides and the public-checkbox fix in 0.8.0"
```

---

## Manual verification

After Task 7, check by hand — automated tests do not cover these:

1. Sign in as an **admin**. Open Help. Confirm nine guides are listed.
2. Sign in as a **contributor**. Confirm `edit-content` appears, and that `pricing-store` and `create-bundle` do not.
3. Create a new item with **Make this content public** ticked. Confirm it saves as public — this is the fix in Task 1, and the bug it replaces was invisible from the UI.
4. Read the tagging guide beside the actual Content tab and confirm every control it names exists under that name.
5. With no tagged content in the library, confirm the `Filter by Tags` section is genuinely absent, as the guide says.
