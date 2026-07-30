# Changelog

All notable changes are recorded here. Versioning follows the policy in
`CLAUDE.md`: every push to `main` bumps `package.json` and adds an entry below.

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
