# Changelog

All notable changes are recorded here. Versioning follows the policy in
`CLAUDE.md`: every push to `main` bumps `package.json` and adds an entry below.

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
