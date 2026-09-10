# Changelog

All notable changes are recorded here. Versioning follows the policy in
`CLAUDE.md`: every push to `main` bumps `package.json` and adds an entry below.

## 0.8.0 — 2026-09-02

- New: Help & Guides in the client portal: written guides for finding, watching,
  buying, and managing your account, plus a short interactive tour of the main
  menu. Reachable from the `?` button in the header or Help in the More menu.
- New: A one-time prompt points new users at the guides. It is remembered per user
  rather than per browser, so a shared family or clinic device does not hide it
  for everyone after one person dismisses it, and it stops appearing once you have
  opened the guides by any route — not only from the prompt's own buttons.
- Fix: Staff guides are now filtered by permission. Users are no longer offered the
  bundle or pricing guides unless they can perform those workflows — previously
  the bundle tour opened on a sidebar tab that permission filtering had removed,
  so it highlighted nothing.
- Fix: Tour highlighting now picks the visible element when a page renders the same
  control twice for different screen sizes.
- Fix: Guided tours now move keyboard focus into the tour when it opens, and return
  it to the button you opened it from when it closes. Tours previously asked screen
  readers to ignore everything outside the tour without placing focus inside it,
  which left screen-reader users with no announced starting point and sighted
  keyboard users with no visible focus and no sign the tour responds to the arrow
  keys.
- Fix: The Complete Purchase and Browse Shop buttons on the Requests page no
  longer blank the screen. Both pointed at an address that does not exist, so
  the whole portal disappeared with only the browser's Back button to recover;
  they now take you to Shop, where an approved item is actually purchased.
- New: Three staff guides — tagging content so you can find it again, changing
  content after you've saved it, and why a client can't see an item yet. All
  three are in the Help menu alongside the existing guides.
- Fix: The Make this content public checkbox on the Create New Content form now
  works. It previously ticked on screen but saved as unchecked, so every new
  item was created restricted no matter what you chose. Items created before
  this fix keep their stored setting and may need changing by hand.
- Fix: Guide instructions now match the buttons on screen. Several referred to
  a menu item by the wrong name, to the wrong menu icon, or to a control that
  does not exist — adding content to a bundle is done with Add and Remove
  buttons rather than tick boxes, the create form is saved with Create Content,
  and there is no way to add a picture to a very large upload by hand. The
  guides also no longer promise that clients can search by tag, that new tags
  always match older ones, that extra tag chips narrow the list, or that a
  bundle can be shared or sold as a group; and the warning about availability
  dates not saving from the edit form now appears in the visibility guide too,
  which staff can read without the edit guide.

## 0.7.0 — 2026-08-09
- Fix: Access granted to a user group now applies only to the item it was
  granted on. Previously a group grant on any single item let every member of
  that group open every restricted item in the library, because the access
  check matched the group without also matching the content.

- Improve: the welcome notification is now much harder to miss. It shows your
  profile picture (or your initials) beside a heading-sized greeting, stays on
  screen for 10 seconds instead of 5, and carries its own close button so you
  can dismiss it as soon as you have seen it. Feedback was that the original
  was too easy to overlook — the people it reassures are the ones least likely
  to catch a small notification.

## 0.6.0 — 2026-08-09

- New: dark mode is now the default. Anyone who has previously chosen light
  keeps light, and the sun/moon toggle in the header still switches at any
  time. A pre-paint script applies the theme before the first frame, so there
  is no white flash on load.
- New: a "Welcome back, <name>!" notification when you reach your portal,
  confirming your sign-in worked. It appears once per visit for clients and
  staff alike, and does not repeat as you move between pages.
- Fix: dark-mode accent colour is now readable. The primary colour was
  unchanged between light and dark and measured 2.66:1 as text on the dark
  background, against the 4.5:1 WCAG AA requirement — affecting 111 usages
  including the sign-in screen's links. It now measures 4.77:1, and an admin's
  configured brand colour is automatically adjusted for dark mode so a dark
  brand colour cannot make accent text unreadable.

## 0.5.0 — 2026-06-26

- Improve: the Pricing and Share tours now demonstrate the real dialogs using a
  never-saved example item. A guided-tour "demo mode" disables the save buttons,
  short-circuits the mutations, and skips the pricing lookup, so nothing is
  created, priced, or emailed during a tour.
- Fix: the tour tooltip no longer overflows off-screen — it clamps to both axes
  and scrolls internally; the Guides launcher is height-capped with scroll.

## 0.4.0 — 2026-06-26

- Improve: guided tours can now drive the UI. The "Create content" and "Write an
  article" tours open the create form and walk through its fields; "Create a
  bundle" opens the Bundles tab and the new-bundle form; "Pricing" and "Share"
  navigate to the Content tab and explain the per-item ⋯ action. A tour closes
  any modal it opened when it finishes.
- Fix: the "Write an article" guide now reflects that rich text lives in a
  content item's Description — there is no separate "Article" attachment type.

## 0.3.1 — 2026-06-24

- Improve: the "Create content" guide now explains every field on the form
  (title, description, author, attachment type, file/external URL, tags,
  public toggle, active/inactive, start/end dates, password). The "Content
  statuses & review" guide now explains each status in depth and who acts at
  each stage.

## 0.3.0 — 2026-06-23

- Add: Help & Guides in the admin dashboard. A Help (?) button opens a launcher
  with step-by-step guides — each available as a readable written guide and an
  interactive point-and-guide tour. New staff get a one-time prompt pointing
  them to it. The existing welcome tour was refactored onto the shared
  `GuidedTour` engine. Initial guides: **Upload content**, **Share content**,
  **Content statuses & review**, **Pricing & the store**, **Create a bundle**,
  and **Write an article**.

## 0.2.0 — 2026-06-23

- Add: professionals can now recommend content from the client portal. A
  permission-gated "Recommend" button (`RecommendButton`, requires
  RECOMMEND_CONTENT) appears in the content viewer (`/view/:id`) and opens the
  existing recommend modal. Closes the gap where the role had the permission but
  no UI to use it after moving to the client portal.

## 0.1.5 — 2026-06-22

- Tests: add unit coverage for the changes that lacked it — `listInviteCodes` /
  `listClientInvites` permission contracts (the queries that blanked the app),
  the invite modals' skip-query-while-closed behavior, and the `SignOutButton`.

## 0.1.4 — 2026-06-22

- Fix: the admin dashboard validates its persisted tab (`adminDashboardTab`,
  shared across users on a browser) against the current user's permissions,
  falling back to "Content" instead of showing an empty panel.

## 0.1.3 — 2026-06-22

- Add: sign-out button to the client portal header (mobile + desktop), reusing
  the shared `SignOutButton`.

## 0.1.2 — 2026-06-22

- Fix: video thumbnail generation no longer logs "The operation is insecure".
  `VideoThumbnail` now requests CORS (`crossOrigin`) so canvas extraction works
  where the host allows it, and falls back to displaying the video's first frame
  (instead of an error icon) when extraction can't run.

## 0.1.1 — 2026-06-22

- Track `CLAUDE.md` in git (removed from `.gitignore`) so the versioning policy
  and project guide are shared with the team.

## 0.1.0 — 2026-06-22

- Introduce versioning policy + this changelog (see `CLAUDE.md`).
- Fix: contributor/editor login no longer shows a blank page — the always-mounted
  invite modals (`InviteCodeModal`, `ClientInviteModal`) ran privileged queries
  (`listInviteCodes` / `listClientInvites`) on mount that threw for users without
  `GENERATE_INVITE_CODES`. Modals are now gated behind `canGenerateInviteCodes`
  and skip their list query while closed.
- Fix: `analytics.getContentViewCounts` degrades gracefully (returns `{}`) for
  users without `VIEW_ANALYTICS` instead of throwing and blanking `ContentManager`.
- Add: top-level `ErrorBoundary` so an uncaught render/query error shows a
  recoverable fallback instead of a blank white page.
- Change: the `professional` role now lands on the client portal (not the admin
  dashboard). Routing is keyed on management capability via `isAdminUser()`.
- Tests: per-role routing + invite-gate contract (`src/lib/roleRouting.test.ts`),
  per-role query safety (`convex/analytics.test.ts`), and `ErrorBoundary`.
