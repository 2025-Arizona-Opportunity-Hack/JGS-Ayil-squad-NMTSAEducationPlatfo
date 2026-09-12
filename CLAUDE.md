# NMTSA Education Platform — Project Guide

Content portal for NMTSA: staff manage/share therapy content; clients, parents,
and professionals access it. Stack: **React + Vite** frontend, **Convex**
backend (queries/mutations + auth), deployed on **Vercel**.

## Local development

- `npm run dev` runs Vite (http://localhost:5173) + `convex dev` against an
  **anonymous local Convex backend** (see `.env.local`; no Convex account needed).
- Convex Auth needs `JWT_PRIVATE_KEY`, `JWKS`, `SITE_URL` set on the deployment
  (`npx convex env list` to check; `npm run setup:auth` to regenerate).
- **`MEDIA_URL_SECRET` is required** (any long random string, per deployment).
  Signed media URLs fail closed without it, so non-public media stops serving.
- `ALLOW_MOCK_PAYMENTS=true` enables the mock checkout in dev. **Never set it in
  production** — it lets a user complete their own order without paying.
- After a convex CLI update, the local backend may prompt interactively to
  upgrade — answer it via `npx convex dev --once` in a real terminal.

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

## Multi-organization deployments

**One deployment serves one organization** — its own Convex project and its own
Vercel project from this repo. NMTSA and `lms.ohack.dev` are separate instances.
Full runbook: `docs/DEPLOYMENTS.md`; provision with `npm run provision`.

- This is not a multi-tenant app. `siteSettings` is a single-row table read with
  `.first()`, there is no `organizations` table, and `organizationId` is a
  vestigial optional string. Don't add tenant scoping without a deliberate
  project — `VITE_CONVEX_URL` is inlined at build time, so one frontend build
  cannot serve two backends anyway.
- **Never hardcode an organization name or URL.** Use `getOrgName(settings)` and
  `requireSiteUrl()` from `convex/helpers.ts`. `requireSiteUrl()` throws when
  `SITE_URL` is unset, deliberately: emitting a link to another org's domain is
  worse than failing to send. The one exception is a `localhost` dev fallback,
  which cannot leak across orgs.
- The password-reset email in `convex/auth.ts` has no `ctx`, so its sender name
  comes from the `ORG_NAME` env var, not `siteSettings`.
- `ALLOWED_ORIGINS` (comma-separated) adds origins to one instance — that's how
  you serve an apex/`www` alias, not a reason to create a new instance.

## Security invariants

Every exported Convex `query`/`mutation`/`action` is a **public endpoint** —
authorization must be enforced inside the function, never in the UI. A 0.6.0
audit found eleven holes where it wasn't; `convex/security.test.ts` is the
regression suite, and these rules are what it enforces:

- Never return a file URL (`getContentFileUrl`, `ctx.storage.getUrl`) without
  first checking entitlement. Several leaks were "the UI hides the button".
- Content with **active pricing** is served only to entitled viewers (creator,
  `VIEW_ALL_CONTENT`, or a `contentAccess` grant). On priced content,
  `isPublic` means "the purchase/preview page is public", never "the media is
  free" — `getPublicContent` returns a `requiresPurchase` preview instead, and
  neither passwords (`grantAccessAfterPassword`) nor share links bypass it.
- `SHARE_CONTENT` is a default permission of **every** role, including client
  and parent. It does not imply trust — gate third-party sharing of private
  content on `SHARE_WITH_THIRD_PARTY`, and never allow it for priced content.
- `professional` carries `VIEW_ALL_CONTENT`, so it must never be self-assignable
  at signup; privileged roles come only from an admin-issued invite code.
  The configurable `siteSettings.signupRoles` ("I am a..." options) respect
  this: labels are cosmetic (`userProfiles.roleLabel`), and each option's
  `baseRole` is limited to client/parent by validators in both `schema.ts`
  and `siteSettings.updateSiteSettings`. Tests: `convex/signupRoles.test.ts`.
- Entitlement comes from a signature-verified Stripe webhook
  (`completeOrderInternal`), never from a client-callable mutation.
- Keep one copy of an access check. The group-access bypass existed because
  `content.ts` held a divergent copy of `checkContentAccess`; `helpers.ts` owns it
  (and `checkGroupAccess` for bundles).
- **Chunked media** (`content.chunks`, files over ~50 MB) is served by
  `/api/serve-chunked`, which requires an HMAC-signed URL (`MEDIA_URL_SECRET`,
  fail-closed) unless the content is exempt — public+published+active+unpriced+
  password-free; `isSignedMediaExempt` in `helpers.ts` is the ONE copy of that
  predicate, shared by `router.ts` and the queries. Queries never return an
  unsigned `/api/serve-chunked` URL for non-exempt content: they return
  `fileUrl: null` + `requiresSignedUrl: true`, and the frontend
  (`src/lib/useMediaUrl.ts` → `content.getSignedMediaUrl`) mints one.
  `getSignedMediaUrl`'s entitlement comes only from the canonical viewer
  queries (getContent, then shareToken via getContentByShareToken, then
  getPublicContent+password) — never a new copy of an access check.
  `getContent` itself enforces the paywall (priced ⇒ creator / VIEW_ALL /
  grant) and returns `password` only to holders of `EDIT_CONTENT` (the edit
  form prefills it). MIME aliases are normalized in `convex/mimeTypes.ts`
  (video/x-m4v → video/mp4) at upload AND serve time. Tests: clusters
  A3/A3b/A5 in `convex/security.test.ts`.
- **Quiz answers are secrets.** `quizQuestions.correctOptionIds`/`explanation`
  reach clients only via `getQuizForEditing` (gated on `MANAGE_QUIZZES`, which
  is deliberately separate from `EDIT_CONTENT`) or reveal-shaped grading
  results. Learner queries go through the `sanitizeQuestion` whitelist in
  `convex/quizzes.ts` — never spread a question doc. Grading is server-side
  only. Regression cluster C1 in `convex/security.test.ts`.
- **Quizzes are never re-pointed to a different target** — attempts store only
  `quizId`, so moving one corrupts attempt history and certificate idempotency.
  `duplicateQuiz` copies settings + active questions to a new target instead
  (copy starts inactive; answers copied server-side, returns only the new id).
- **Certificates are issued server-side only** — from a graded passing
  `quizAttempts` row (`issueCertificateIfNeeded` in `convex/certificates.ts`
  is the single copy; `submitQuizAttempt` auto-issues, `claimMyCertificate`
  re-validates the pass). `getCertificateByShareToken` is deliberately
  anonymous (share page `/certificate/:token` + `api/meta.ts`) and returns a
  whitelist — never userId/attemptId/quizId or answers. It DOES return
  attempt counts for the cert's (quiz, user) — `attemptCount` (all attempts,
  incl. retakes after the pass) + `attemptsToPass` (attemptNumber of the
  earning attempt) — consumed by www.ohack.dev's judge-review tooltip
  (`VolunteerTable.js` / `ApplicationReviewCard.js`), which otherwise needs
  an LMS admin role for attempt data. Tests: `convex/certificates.test.ts`.
- The `allowPublicSignup` site setting relaxes the join-request gate only —
  the role clamp in `users.createUserProfile` (code-less signups →
  client/parent) must stay intact. `autoApprovePurchases` removes the
  purchase-approval step only — entitlement still comes exclusively from the
  Stripe webhook. Cluster D tests both. The join-request gate exists in TWO
  places: `users.createUserProfile` (enforcement) and the App.tsx
  "Access Not Available" screen (UX) — a signup-flow change must touch both.
- Auth errors thrown as plain `Error` are redacted to "Server Error" in
  production — the sign-in/sign-up forms can't string-match them. Anything
  the browser must explain (e.g. password rules in `convex/passwordRules.ts`)
  must be a `ConvexError`.
- `api/meta.ts` (unfurl bots) may only source metadata from queries an
  anonymous visitor can call (`getPublicContent`, `getContentByShareToken`,
  `getCertificateByShareToken`, `getSiteSettings`) so publication/paywall/
  privacy gates apply verbatim.
- **External auth** (PropelAuth; see `docs/EXTERNAL_AUTH.md`): backend code
  imports `getAuthUserId` from `convex/externalAuth.ts`, never from
  `@convex-dev/auth/server` — it's the single resolver for both Convex Auth
  and external identities (`authIdentities` table).
  `externalAuth.ensureExternalUser` creates accounts only (no profile, no
  role, no client args); linking to existing same-email accounts requires
  `EXTERNAL_AUTH_TRUST_EMAILS=true`. `auth.config.ts` must read optional env
  vars via try/catch around the property access — at push time process.env is
  non-enumerable (`Object.keys` → `[]`, so enumeration silently yields no
  providers) and reading an UNSET var throws
  (`AuthConfigMissingEnvironmentVariable`). After changing auth config,
  verify registration with a fake JWT (wrong-issuer ⇒ `NoAuthProvider`,
  right-issuer ⇒ kid/JWKS error) — a successful push alone proves nothing.
  Frontend auth mode is
  build-time (`VITE_AUTH_PROVIDER`); sign-out goes through `useAppSignOut()`
  (`src/lib/appAuth.tsx`), not `useAuthActions` directly. Tests:
  `convex/externalAuth.test.ts`.

## Storage lifecycle

Convex never garbage-collects `_storage` blobs — anything not explicitly
deleted lives (and bills) forever. `convex/maintenance.ts` owns the ONE copy
of the storage reference map (`collectReferencedStorageIds`: content
fileId/thumbnailId/chunks, group thumbnails, profile pictures, site
logo/favicon — extend it when adding a `v.id("_storage")` field to the
schema). Delete/replace mutations in `content.ts` call
`deleteUnreferencedStorage` to free blobs when their last reference drops;
`maintenance:pruneOrphanedFiles` (internal, dry-run by default, 24h min-age
so in-flight uploads survive, paginated) sweeps historical orphans. Tests:
`convex/maintenance.test.ts`.

## Media storage: keep bytes off Convex (data egress)

Convex data egress is metered; video streaming through Convex storage blew
the free tier 21×. Two ways media bytes stay off Convex:

**Public CDN via externalUrl (preferred for public content).** An
`externalUrl` pointing straight at a media file (`https://cdn.ohack.dev/lms/…`,
the ohack public bucket) is served as the playable `fileUrl` by the media-info
helpers — native player + watch tracking, not the iframe embed path.
`isDirectMediaUrl` (`convex/helpers.ts`) is the ONE copy of the
direct-vs-embed predicate. Migrate a row with
`npx convex run maintenance:attachExternalMedia '{"contentId":"…","url":"…"}' --prod`
(also frees its Convex blobs). The CDN has **no entitlement gate** — never
point priced/private/password content at it.

**Private GCS bucket (for gated media).** `convex/gcs.ts`, configured per
deployment via `GCS_BUCKET` + `GCS_SERVICE_ACCOUNT` (inline service-account
JSON, same convention as backend-ohack.dev). **Unset ⇒ full fallback to
Convex storage** — never assume a bucket exists.

- The bucket has public-access-prevention enforced: there is NO unsigned URL
  for `content.gcsPath` media, even exempt/public content. Queries return
  `fileUrl: null` + `requiresSignedUrl: true`; `content.getSignedMediaUrl`
  mints a V4 signed GET through the SAME canonical entitlement chain as
  chunked media (getContent → shareToken → getPublicContent+password) and
  fails closed when GCS is unconfigured.
- Uploads: `gcs.generateGcsUploadUrl` (gated on `CREATE_CONTENT`) mints a
  signed PUT whose signed `x-goog-content-length-range` caps the size; the
  browser PUTs directly to GCS (`uploadContentFile` prefers GCS, falls back
  to Convex single/chunked). `createContent`/`updateContent` accept only
  paths matching `GCS_CONTENT_PATH_PATTERN` (uuid segment) so rows can't be
  pointed at arbitrary bucket objects.
- GCS never garbage-collects either: delete/replace mutations schedule
  `internal.gcs.deleteGcsObject` (object paths are single-owner by uuid).
- Migration without Convex egress: upload the file out-of-band (`gcloud
  storage cp` from a local copy), then
  `npx convex run maintenance:attachGcsMedia '{"contentId":"…","gcsPath":"…"}' --prod`
  (frees the old Convex blobs; `maintenance:listGcsMigrationCandidates`
  lists rows still on Convex storage).
- V4 signing is hand-rolled with `crypto.subtle` (action runtime, no SDK) —
  `signGcsUrl` in `convex/gcs.ts` is the one copy. Tests: `convex/gcs.test.ts`.

## SEO / unfurling

The app is a client-rendered SPA; `vercel.json` rewrites known unfurl-bot
user agents on `/view/:id`, `/share/:token`, and `/certificate/:token` to
`api/meta.ts`, which serves per-content Open Graph tags. Google et al. keep the SPA and get titles from
`src/lib/usePageMeta.ts`. `/sitemap.xml` + `/robots.txt` are Vercel functions
(`api/`), per-domain at request time — never hardcode a domain there. Share
pages are always `noindex`.

## Conventions

- **Commits:** do not add `Co-Authored-By` lines.
- **Accessibility (WCAG 2.2 AA)** is a core organizational tenet — keep it in mind
  for all UI work.
- **Tests:** `npm test` (Vitest). Convex tests run under edge-runtime; component
  tests are `*.test.tsx` (happy-dom) and import `@testing-library/jest-dom/vitest`.
- **Typecheck/build:** `npx tsc -p convex --noEmit && npx tsc -p . --noEmit && npx vite build`.

<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->
