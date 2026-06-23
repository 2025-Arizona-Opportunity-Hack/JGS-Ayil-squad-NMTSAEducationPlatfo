# Changelog

All notable changes are recorded here. Versioning follows the policy in
`CLAUDE.md`: every push to `main` bumps `package.json` and adds an entry below.

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
