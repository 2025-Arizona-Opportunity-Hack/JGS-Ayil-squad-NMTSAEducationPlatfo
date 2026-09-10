# Client portal — gaps found while writing the user guides

Written 2026-09-01, while building the client-side Help & Guides feature.

Documenting the portal surfaced five things that guides cannot paper over.
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
rather than a design gap.

## 4. There is nothing for clients to "organise"

The original request asked for a tutorial on how users manipulate their content.
Beyond viewing, buying, and editing their own profile, the portal currently has
no favourites, bookmarks, notes, or progress tracking. The content cards support
showing a progress bar, but nothing ever supplies a value
(`src/components/client/ContentCard.tsx:20-24`).

If "manage my content" is the goal, this is the feature gap to discuss — the
guides can only describe what exists.

## 5. "Recent Content" on the home page shows the oldest content

The home page has a section headed Recent Content, and what it lists is the
oldest content on the site rather than the newest. The query hands back items
in the order they were created, oldest first, and the page takes the first few
from the top of that list (`convex/content.ts:242`,
`src/pages/client/HomePage.tsx:16-17`).

The practical effect is that something added today does not show up there at
all, while the same long-standing items sit at the top for everyone, every
visit. Browse is unaffected — it lists everything, so nothing is missing from
it; only the ordering is arbitrary.

The guides work around this by not claiming recency: they describe Home as
showing "a selection of the content available to you".

**Options:** ask the query for newest-first, or rename the section to match
what it actually shows. The first is the likely intent, but it changes what
every client and staff user sees on opening the portal, so it is a product
decision rather than a wording fix.
