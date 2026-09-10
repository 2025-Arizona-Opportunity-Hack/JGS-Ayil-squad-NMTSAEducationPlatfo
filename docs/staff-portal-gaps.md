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
