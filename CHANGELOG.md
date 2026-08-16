# Changelog

All notable changes are recorded here. Versioning follows the policy in
`CLAUDE.md`: every push to `main` bumps `package.json` and adds an entry below.

## 0.16.0 — 2026-08-15

- Feature: **quiz pass certificates.** Passing a quiz now auto-issues a
  certificate (server-side, from the graded attempt; snapshots name/quiz/
  score). Shown inline after the quiz with share actions (copy link, Add to
  LinkedIn, X, Facebook, native share) and listed in the profile modal.
  Public verification page at `/certificate/:token` (tokenized, noindex)
  backed by a whitelisted anonymous query; unfurl bots get OG tags via
  `api/meta.ts`. Learners who passed before this release get a one-click
  "Get your certificate" button. Tests: `convex/certificates.test.ts`.

## 0.15.0 — 2026-08-09

- Feature: **configurable signup roles.** The "I am a..." choices on the
  first-login screen are now editable per instance (Admin → Settings →
  Signup Roles), e.g. judge/mentor/hacker/volunteer/sponsor/nonprofit/staff.
  Each option has a label, optional description, and a base permission role
  limited to client or parent — labels are cosmetic and can never grant a
  privileged role (those still require invite codes). The chosen label is
  stored on the profile (`roleLabel`) and shown in the admin user list.
  Unconfigured instances keep the built-in Client/Parent defaults. Tests:
  `convex/signupRoles.test.ts`.

## 0.14.1 — 2026-08-06

- Fix: **external auth issuer was never registered.** `auth.config.ts` read
  its optional env vars via `Object.entries(process.env)`, but at push time
  `process.env` is a non-enumerable facade (`Object.keys` → `[]`), so the
  provider list was silently empty and PropelAuth logins failed with
  `NoAuthProvider`, looping back to the sign-in screen. Optional vars are now
  read with a direct property access inside try/catch (set vars are readable;
  unset vars throw `AuthConfigMissingEnvironmentVariable`, which the catch
  makes optional). Verified by JWT probe against the deployment, not just by
  a successful push. Docs updated with the verification recipe.

## 0.14.0 — 2026-08-02

- Feature: **external authentication (PropelAuth).** An instance can now use
  the organization's own PropelAuth login instead of the built-in password
  auth: set `PROPELAUTH_URL` on the Convex deployment and
  `VITE_AUTH_PROVIDER=propelauth` + `VITE_PROPELAUTH_URL` on the frontend
  build. Tokens are verified via the issuer's JWKS (`customJwt` provider);
  identities map to accounts through the new `authIdentities` table
  (`externalAuth.ensureExternalUser`). Profiles/roles still flow through
  `users.createUserProfile`, so the join-request gate and client/parent role
  clamp apply unchanged. Optional `EXTERNAL_AUTH_TRUST_EMAILS=true` links
  external logins to existing same-email accounts (migration path). The
  architecture is provider-pluggable — Auth0 design notes included. Docs:
  `docs/EXTERNAL_AUTH.md`; tests: `convex/externalAuth.test.ts`.

## 0.13.2 — 2026-08-02

- Fix: **public signup was still blocked after authentication.** `App.tsx`
  kept its own join-request gate ("Access Not Available") for authenticated
  users without a profile and never consulted `allowPublicSignup` — so
  code-less signups authenticated fine but never reached role selection. The
  gate now defers to the setting (and waits for settings to load instead of
  flashing the denial screen). Server-side enforcement is unchanged:
  `users.createUserProfile` still clamps code-less signups to client/parent.

## 0.13.1 — 2026-08-02

- Fix: **sign-up errors were unreadable in production.** Convex redacts plain
  server errors there, so every failure (short password, email already
  registered) surfaced as "Something went wrong." Password validation now
  throws a `ConvexError` the browser can read (`convex/passwordRules.ts`,
  length ≥ 8 — matching what the provider already enforced), the sign-up form
  maps it to a specific message, the password field enforces `minLength=8`
  client-side, and the generic fallback now suggests signing in / password
  reset (the most common redacted cause is an already-registered email).

## 0.13.0 — 2026-08-02

- Feature: **quiz discoverability**.
  - Signed-out visitors on `/view/` content that has a quiz now see a
    "sign in to take the quiz" card (quiz title, question count, passing
    score) in the same slot where the quiz renders after signing in, with
    return-to-content replay after login/signup. `getPublicContent` exposes a
    summary (`title`/`questionCount`/`passingScore`) only on content the
    viewer is already allowed to see — never on paywalled previews or private
    content, and never any question data.
  - Admin content list rows show a clickable **Quiz** badge (jumps to the
    Quizzes tab) and the content edit modal notes the attached quiz, for
    users with `MANAGE_QUIZZES`.

## 0.12.0 — 2026-08-02

- Feature: **signup & purchase friction toggles** — two new instance-level
  settings in the admin Site Settings "Access & Signup" card, both **off by
  default** (existing instances unchanged):
  - `allowPublicSignup` — anyone can create an account without an invite
    code or admin-approved join request. The invite-code field on the Sign
    Up form becomes optional (a supplied code is still validated and still
    grants its role). The server-side role clamp is untouched: code-less
    signups can only ever be `client`/`parent` — `professional`
    (`VIEW_ALL_CONTENT`) and staff roles still require an invite code.
    Caveat noted in the admin UI: these accounts skip the join-request
    email-verification step.
  - `autoApprovePurchases` — signed-in users can buy priced content
    directly; `createOrder` auto-creates an approved purchase request for
    audit/reporting continuity instead of requiring an admin approval
    round-trip. Payment completion is still webhook-verified — the toggle
    never grants entitlement, only removes the approval step.
- The paywall for anonymous visitors now offers **"Sign up to purchase"**
  (when public signup is on) alongside log-in, both preserving the
  return-to-content redirect; `/?signup=true` deep-links to the Sign Up tab.
- Together with 0.11.0 this completes the search-to-purchase funnel:
  find content in search → preview + price → sign up → pay → watch →
  (0.10.0) take the quiz.
- Regression cluster D in `convex/security.test.ts`: toggles off = existing
  behavior byte-for-byte; toggles on = no privilege escalation, no payment
  bypass.

## 0.11.0 — 2026-08-02

- Feature: **SEO + link unfurling.** Link-preview bots (Slack, iMessage,
  Facebook, X, LinkedIn, Discord, WhatsApp, Telegram…) hitting `/view/:id`
  or `/share/:token` are rewritten (per user-agent, in `vercel.json`) to a
  new Vercel function `api/meta.ts` that serves per-content Open Graph /
  Twitter tags. Metadata comes only from the anonymous-visible payloads of
  `getPublicContent` / `getContentByShareToken`, so publication, paywall,
  and privacy gates apply verbatim — gated content falls back to site-wide
  defaults from `getSiteSettings`. Share pages carry `noindex`. Google and
  other JS-rendering crawlers keep the real SPA (better than serving them a
  stub) and get correct titles from the new client-side `usePageMeta` hook,
  which also fixes `/view/` and `/share/` tabs being titled "Content
  Portal" for humans.
- Feature: **sitemap + robots.** `/sitemap.xml` (Vercel function backed by
  new public query `publicContent.listPublicContentForSitemap`: public +
  published + active only) and a dynamic `/robots.txt` (allows `/view/`,
  disallows `/share/`, absolute per-domain sitemap URL).
- Fix: `index.html` previously pointed `og:image` at a file that didn't
  exist (404 on every unfurl) and had no meta description or OG/Twitter tag
  set. Now ships neutral, org-brandable defaults plus a real
  `public/og-default.png` (replace per instance if desired; `api/meta.ts`
  prefers the org logo, then the content thumbnail).
- Note: SEO reach is currently limited to individually-public `/view/`
  pages — there is no public landing/catalog page for anonymous visitors
  (tracked as a recommended follow-up).

## 0.10.0 — 2026-08-02

- Feature: **quizzes & assessments.** Staff (new `MANAGE_QUIZZES` permission;
  owner/admin/editor by default) can attach a quiz to a content item or a
  bundle: single/multi/true-false questions, passing score, optional attempt
  limit, optional shuffle, and a `revealAnswers` setting (score only /
  right-wrong / full answers). Learners take the quiz on the `/view/` page
  (or bundle page), attempts are **graded server-side**, and every attempt
  records score, pass/fail, and attempt number — "attempts to pass" shows in
  the new admin **Quizzes** tab alongside per-learner results. Learners can
  leave feedback after an attempt; staff see it in the results view. Correct
  answers never reach learner-facing queries (whitelist sanitizer; regression
  cluster C1 in `convex/security.test.ts` plus `convex/quizzes.test.ts`).
- Feature: **content progress tracking** (`contentProgress` table). Hosted
  video/audio report watch progress from the player (completed at ≥90%);
  external/YouTube embeds and documents get a manual "Mark as watched/read"
  button. Quizzes can require completion before they unlock
  (`requireContentCompletion`), including all-items completion for bundle
  quizzes. Progress is honor-system by design.
- Feature: **client bundle pages.** `/bundles` now lists bundles the learner
  can actually see (public bundles, own bundles, or a `contentGroupAccess`
  grant — a table that previously was written but never read) via new
  learner-facing queries in `convex/publicBundles.ts`, and links to a new
  bundle detail page (`/bundles/:groupId`) with the ordered item list,
  per-item completion, and the bundle quiz after the final item. Previously
  the page called an admin-gated query and always rendered empty.
- Fix: bundle item ordering is now deterministic — `addContentToGroup`
  defaults to end-of-list instead of no order, admins can reorder items
  (up/down in the bundle content modal, new `reorderGroupItems` mutation),
  readers sort explicitly, and `backfillGroupItemOrder` (internal) normalizes
  legacy rows. Run once after deploy:
  `npx convex run contentGroups:backfillGroupItemOrder`.
- Fix: the public viewer no longer falls back to a hardcoded organization
  name for authorless content (multi-org invariant); it uses the creator's
  name instead.

## 0.9.0 — 2026-07-31

- Feature: **priced content is now paywalled on `/view/` links.**
  `getPublicContent` no longer serves content with active pricing to anyone
  who isn't entitled (creator, `VIEW_ALL_CONTENT`, or a `contentAccess` grant
  from a completed purchase) — previously `isPublic` won and the paid media
  was served free to anonymous visitors. Unentitled viewers now get a
  purchase page (title/description/price preview, no file URL) with the full
  request-to-purchase → Stripe checkout flow inline (`PurchasePaywall`);
  anonymous visitors are prompted to log in first. Private priced content
  still reveals nothing to anonymous visitors. `grantAccessAfterPassword`
  also refuses priced content, so a password set before pricing can't become
  a free permanent entitlement. Regression tests: cluster A7 in
  `convex/security.test.ts`.
- The pricing modal now warns when pricing **Public** content (visitors will
  see a purchase page, not the full content) and notes that pricing disables
  third-party share links.
- The third-party share dialog now checks `canShareContent` up front and
  explains why sharing is unavailable (e.g. priced content) instead of
  failing with a permission error on submit.

## 0.8.2 — 2026-07-31

- Fix: **published media rendered no player** on public `/view/` links, share
  links, and recommendations — the page showed title, description and tags with
  the video/audio/document silently missing and no error anywhere. The database
  stores `attachmentType`, while the viewer components switch on `content.type`,
  a field that is *derived* on the way out of a query. Three queries
  (`publicContent.getPublicContent`, `contentShares.getContentByShareToken`,
  `recommendations.getMyRecommendations`) never applied that derivation, so
  `type` was `undefined` and every `type === ...` branch fell through.
- The mapping had been duplicated inline in two `content.ts` queries and was
  missing from the rest. It is now one exported `deriveContentType()` in
  `convex/helpers.ts` used by all five call sites, with
  `convex/contentType.test.ts` pinning each of the three previously-broken
  queries. Pre-existing bug, not a regression from the 0.6.0–0.8.1 work.

## 0.8.1 — 2026-07-31

- Docs: `docs/DEPLOYMENTS.md` gains a "Shipping a change to an existing
  instance" section, plus two traps hit while deploying `lms.ohack.dev`:
  the Vercel CLI (`vercel link` / `vercel env pull`) **rewrites `.env.local`**,
  which is where Convex keeps `CONVEX_DEPLOYMENT`, so it can silently repoint
  the linkage; and omitting `--team` when linking a Convex project can create a
  duplicate auto-suffixed project whose empty production deployment then
  happily receives your functions while the real site serves stale code.
  Documents how to verify the target deployment before and after deploying.

## 0.8.0 — 2026-07-30

- Add: **setup health checklist** for admins. Several deployment settings fail
  silently — most notably a missing `ENVIRONMENT=production`, which redirects
  every outbound email to `DEV_TEST_EMAIL` while Resend reports success — so a
  half-configured instance looked healthy. Admins with `MANAGE_SITE_SETTINGS`
  now get three surfaces: a persistent banner on every admin page (dismissible
  for the session only; genuinely dangerous items not at all), a badged "Setup"
  entry in the sidebar's System group, and a full checklist page.
- Eleven checks, ranked by severity: `ALLOW_MOCK_PAYMENTS` enabled on a
  production-looking deployment (critical — any user can unlock paid content
  free); `ENVIRONMENT`, `MEDIA_URL_SECRET`, `SITE_URL`, email, and a Stripe key
  without its webhook secret (blocking — buyers would be charged and receive
  nothing); the `RESEND_DOMAIN`/`RESEND_FROM_EMAIL` split, `ORG_NAME`, and
  incomplete site setup (recommended); SMS, payments, and Google Drive
  (optional). Each check states what is broken now and the exact command to fix
  it.
- `getSetupHealth` returns **booleans and static prose only, never a value** —
  a test asserts sentinel secrets appear nowhere in the response — and returns
  `null` rather than throwing when the caller lacks permission, since a
  throwing query in a render path blanks the whole admin app.

## 0.7.0 — 2026-07-28

Multi-domain / white-label support, so the platform can run for organizations
beyond NMTSA (e.g. `lms.ohack.dev`). **One deployment serves one organization**
— its own Convex project and its own Vercel project from this same repo. See
`docs/DEPLOYMENTS.md` for the rationale and the runbook.

- Fix: notification links fell back to `https://nmtsa.com` and the org name to
  `"NMTSA Education Platform"` in ~28 places across `emails.ts`/`sms.ts`, so an
  instance missing `SITE_URL` would email *its* users links to another
  organization's site. Added `getOrgName()` (neutral `"Content Portal"`
  fallback) and `requireSiteUrl()` (throws rather than emitting a cross-org
  link) in `convex/helpers.ts`, and routed every call site through them.
- Fix: the password-reset email was sent from `"NMTSA Platform <…>"` on every
  deployment. That callback has no database access, so the sender name now
  comes from the new optional `ORG_NAME` env var, defaulting to
  `"Content Portal"`. Also removed a hardcoded `noreply-nmtsa.org` fallback
  domain in `debugActions.ts`.
- Add: `ALLOWED_ORIGINS` (comma-separated) lets one instance serve additional
  origins such as an apex/`www` alias or a preview domain. CORS echoes the
  request's `Origin` only when it is in the allowlist, never `*`, and both
  header helpers now send `Vary: Origin`.
- Add: `scripts/provision-instance.mjs` (`npm run provision`) generates and sets
  the per-deployment secrets for a new instance — `JWT_PRIVATE_KEY`, `JWKS`,
  `MEDIA_URL_SECRET`, `SITE_URL`. It refuses to rotate an existing
  `JWT_PRIVATE_KEY` without `--force` (rotating signs out every user), never
  sets `ALLOW_MOCK_PAYMENTS`, and never prints secret values.
- Add: `docs/DEPLOYMENTS.md` — architecture rationale, a worked `lms.ohack.dev`
  example end to end, an env var matrix (Convex deployment vs Vercel build),
  and a per-instance checklist.
- Improve: neutral default favicon (ends the `/favicon.ico` 404) plus dynamic
  favicon from `siteSettings.faviconUrl`; generic org placeholder in the setup
  wizard; package renamed to `content-portal`.
- Fix: `npm run provision --prod` now also sets `ENVIRONMENT=production`.
  Forgetting it fails silently in the worst way — `getRecipient()` redirects
  **every** outbound email to `DEV_TEST_EMAIL` and invite/verification links
  fall back to `localhost:5173`, so an instance looks healthy while no real
  user receives mail. Documented in the env matrix with a new "Enabling email"
  section covering Resend domain verification and the
  `RESEND_DOMAIN` vs `RESEND_FROM_EMAIL` split.
- Docs: `.env.example` now documents `MEDIA_URL_SECRET`, `ORG_NAME`,
  `ALLOWED_ORIGINS`, `ENVIRONMENT`, `DEV_TEST_EMAIL`, and the production
  warning on `ALLOW_MOCK_PAYMENTS`.

## 0.6.0 — 2026-07-27

Security hardening. Closes eleven verified access-control, paywall, and
privilege-escalation holes found in an audit of the Convex API surface. Every
Convex `query`/`mutation`/`action` is a public endpoint, and these were all
reachable by an ordinary logged-in user — several by an anonymous one.
Regression tests for all of them live in `convex/security.test.ts`.

- Fix: `content.grantAccessAfterPassword` never verified the password. It now
  takes the password and checks it server-side, and refuses content that has no
  password set. Previously any logged-in user could self-grant permanent access
  to every content item.
- Fix: the group-access branch of `checkContentAccess` ignored `contentId`, so
  membership in one group granted access to *all* content. The duplicated,
  divergent copy in `content.ts` is gone; `helpers.ts` is now the only version.
- Fix: `/api/serve-chunked` streamed any content to anyone with a content ID
  (which is not secret). Media URLs are now HMAC-SHA256 signed with a 15-minute
  expiry via the new `content.getSignedMediaUrl` action, verified in the HTTP
  handler. Genuinely public, unpriced, password-free content is still served
  unsigned. **Requires `MEDIA_URL_SECRET`; fails closed without it.**
- Fix: `SHARE_CONTENT` is a default permission of *every* role, which let a
  client mint anonymous share links to paid or private content. Priced content
  is now never third-party shareable, and private content requires
  `SHARE_WITH_THIRD_PARTY`. Share tokens re-check pricing at read time.
- Fix: `recommendations.getMyRecommendations` returned the file URL of
  unpurchased paid content (the paywall was UI-only); it now returns
  `fileUrl: null` unless the recipient is entitled. `createRecommendation`
  verifies the recommender can access the content.
- Fix: `orders.completeOrder` was a client-callable "mark my order paid" that
  granted access with no Stripe verification. It is now gated server-side on
  `ALLOW_MOCK_PAYMENTS`, which must be unset in production. The
  signature-verified webhook path (`completeOrderInternal`) is unchanged.
- Fix: `orders.createOrder` never checked that `pricingId` belonged to
  `contentId`, so a cheap item's price could be attached to an expensive one.
- Fix: signup accepted a client-supplied role, and `professional` carries
  `VIEW_ALL_CONTENT`. Self-service selection is now limited to client/parent;
  privileged roles come only from an invite code.
- Fix: staff invite codes were unlimited-use and never expired by default, so
  one leaked admin code minted admins forever. They are now single-use unless
  `maxUses` is set, and redemptions increment `currentUses`.
- Fix: `pricing.listPricedContent` leaked each item's plaintext password to
  every logged-in user.
- Fix: `content.updateContentThumbnailId` required only a login, letting any
  user repoint any content's thumbnail. It now requires `EDIT_CONTENT` or
  ownership. Removed the unauthenticated outbound `fetch` in
  `generateThumbnailFromVideo` (a blind SSRF vector in dead code).

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
