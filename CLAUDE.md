# NMTSA Education Platform — Project Guide

Content portal for NMTSA: staff manage/share therapy content; clients, parents,
and professionals access it. Stack: **React + Vite** frontend, **Convex**
backend (queries/mutations + auth), deployed on **Vercel**.

## Versioning policy (REQUIRED)

**Every change pushed to `main` must increment the version and be recorded.**

- **Source of truth:** the `version` field in `package.json` (semver).
- **On each push to `main`:**
  1. Bump `package.json` `version`:
     - **patch** (`x.y.Z+1`) — bug fixes, refactors, tests, docs (default).
     - **minor** (`x.Y+1.0`) — new user-facing features / behavior changes.
     - **major** (`X+1.0.0`) — breaking changes.
  2. Add a matching entry at the top of `CHANGELOG.md`: the new version, the
     date (`YYYY-MM-DD`), and a short bullet summary of what changed.
  3. Include both files in the same commit/push as the change.
- One bump per push (a push may bundle several commits; bump once for the set).
- Never reuse or skip a version number; `CHANGELOG.md` is the running history.

## Permissions & routing model

- Access is permission-based, not role-based. Roles map to **default
  permissions** in `convex/permissions.ts` (`DEFAULT_PERMISSIONS`). A profile's
  effective permissions are custom `permissions` if set, else the role defaults.
- Frontend mirrors permission constants/helpers in `src/lib/permissions.ts`.
- **Dashboard routing** (`src/App.tsx`) uses `isAdminUser(permissions)` from
  `src/lib/permissions.ts` — keyed on management capability (CREATE/EDIT content,
  VIEW_USERS, MANAGE_SITE_SETTINGS), **not** `VIEW_ALL_CONTENT`. owner/admin/
  editor/contributor → admin dashboard; professional/parent/client → client
  portal. See `src/lib/roleRouting.test.ts` for the per-role contract.
- **Guard query/permission throws in render paths.** A Convex query that throws
  (e.g. `requirePermission`) inside a component rendered on mount will surface
  through `useQuery` and, without an error boundary, blank the whole app. Either
  degrade gracefully in the query (`try { requirePermission } catch { return [] }`)
  or skip/gate the query for users who lack the permission. A top-level
  `ErrorBoundary` (`src/components/ErrorBoundary.tsx`) is the safety net.

## Conventions

- **Commits:** do not add `Co-Authored-By` lines.
- **Accessibility (WCAG 2.2 AA)** is a core organizational tenet — keep it in mind
  for all UI work.
- **Tests:** `npm test` (Vitest). Convex tests run under edge-runtime; component
  tests are `*.test.tsx` (happy-dom) and import `@testing-library/jest-dom/vitest`.
- **Typecheck/build:** `npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`.
