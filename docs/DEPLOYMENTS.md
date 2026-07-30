# Deployments — running Content Portal for multiple organizations

This platform (NMTSA today, `lms.ohack.dev` next, more later) is run as
**one deployment per organization**: its own Convex project + its own Vercel
project, both built from this same git repo. This doc explains why, then
walks through standing up a brand-new instance end to end.

## Architecture decision: one deployment per org, not multi-tenant

We deliberately do **not** run a single shared backend with tenant scoping
(a `tenantId` column, hostname → tenant resolution, etc.). Reasons, from the
code as it exists today:

- **`siteSettings` is a single-row table.** Every read is `.first()`
  (`convex/siteSettings.ts`) — org name, tagline, logo, favicon, brand color.
  The whole app assumes exactly one organization per backend. Making it
  multi-row would touch nearly every query/mutation that reads settings.
- **There is no real `organizations` table.** `convex/organizations.ts` is a
  stub; `organizationId` in the schema is a vestigial optional string, not a
  tenancy key anywhere it's used.
- **Per-org config is already per-deployment env vars.** `SITE_URL`,
  `JWT_PRIVATE_KEY`, `JWKS`, `MEDIA_URL_SECRET`, Stripe keys, the Resend
  sending domain, the Twilio number — these are all already "one value per
  backend." A second organization needs a second set of these, which is
  exactly what a second Convex deployment gives you for free.
- **Hard data isolation by construction.** A v0.6.0 security audit found 11
  access-control holes in the existing single-tenant model. Adding row-level
  tenant scoping on top would multiply that leak surface — every query and
  mutation would need a tenant check added and kept correct forever. Separate
  backends make cross-org data leaks structurally impossible instead of
  policy-dependent.
- **`VITE_CONVEX_URL` is inlined at build time by Vite.** A single Vercel
  build can only ever point at one Convex backend — there's no way for one
  frontend build artifact to serve two organizations' data even if we wanted
  to.

**Consequence:** "supporting a new domain" means *provisioning a new
instance* — a new Convex project, a new Vercel project, and the per-instance
secrets that connect them. The rest of this doc makes that repeatable.

This is a settled decision. Do not add a tenants table, tenant scoping,
hostname→tenant resolution, or Stripe Connect to work around it.

---

## Worked example: standing up `lms.ohack.dev`

These steps produce a brand-new, fully isolated instance. Total time is
mostly waiting on DNS propagation.

### 0. Use a separate checkout (important)

> **Linking a Convex project rewrites `.env.local`** (`CONVEX_DEPLOYMENT` and
> `VITE_CONVEX_URL`). If you run the linking step in your everyday working
> copy, you will clobber whatever local backend you develop against and have
> to reconfigure it. `npx convex env` and `npx convex env --prod` both act on
> the deployment that the *current checkout* is linked to, so one checkout can
> only be pointed at one instance at a time.
>
> Give each instance its own checkout:
>
> ```bash
> git clone <this repo> ~/dev/ohack-lms
> cd ~/dev/ohack-lms
> npm install
> ```
>
> Do every step below from that directory. Your primary checkout keeps its own
> `.env.local` and local dev backend, untouched.

### 1. Create the Convex project

1. Go to [dashboard.convex.dev](https://dashboard.convex.dev) and create a
   new project (e.g. `ohack-lms`). You must be logged in to the CLI too:
   ```bash
   npx convex login     # opens a browser; one-time per machine
   ```
2. From the **instance checkout** (see step 0), link it to that project:
   ```bash
   npx convex dev
   ```
   Leave this running once to link the project (`Ctrl+C` after it connects,
   or leave it running in another terminal during initial setup).
3. Note the deployment URL from Settings → URL & Deploy Key — you'll need it
   for `VITE_CONVEX_URL` in step 4.

### 2. Provision the instance's secrets

Run the provisioning script against the linked deployment:

```bash
npm run provision -- --site-url https://lms.ohack.dev
```

This generates and sets, on the Convex deployment:

- `JWT_PRIVATE_KEY` + `JWKS` — a fresh RSA-2048 key pair for Convex Auth
- `MEDIA_URL_SECRET` — 32 random bytes (hex), required for signed media URLs
- `SITE_URL` — `https://lms.ohack.dev`

It refuses to run if `JWT_PRIVATE_KEY` is already set on that deployment
(rotating it would sign out every existing user) — pass `--force` only if
you deliberately want to rotate it. It never prints secret values and never
sets `ALLOW_MOCK_PAYMENTS`.

When you're ready to provision the **production** Convex deployment (as
opposed to dev), run once against prod and add `--prod`:

```bash
npx convex deploy --prod   # first production deploy, links prod deployment
npm run provision -- --site-url https://lms.ohack.dev --prod
```

See `node scripts/provision-instance.mjs --help` for all flags.

### 3. Create a separate Vercel project

Create a **new** Vercel project from this same repo — do not reuse NMTSA's
(or any other instance's) Vercel project. Because `VITE_CONVEX_URL` is baked
into the JS bundle at build time, one Vercel project = one backend, always.

```bash
npx vercel link     # choose "create a new project"
```

### 4. Set the frontend build env var

On the new Vercel project, set:

```
VITE_CONVEX_URL=https://<your-deployment-name>.convex.cloud
```

(Vercel dashboard → Project → Settings → Environment Variables, or
`npx vercel env add VITE_CONVEX_URL production`.)

### 5. Add the domain + DNS

1. Vercel dashboard → Project → Settings → Domains → add `lms.ohack.dev`.
2. At your DNS provider, add the CNAME (or A/ALIAS, per Vercel's
   instructions) Vercel shows you, pointing `lms.ohack.dev` at Vercel.
3. Wait for DNS to propagate and Vercel to issue the certificate.

### 6. Deploy

```bash
npx vercel deploy --prod
```

### 7. Complete the first-run setup wizard

Open `https://lms.ohack.dev`. Since there are no user profiles yet, the app
shows the in-app setup wizard:

1. Sign in / create an account — **the first user automatically becomes the
   owner.**
2. Set the organization name, tagline, logo, and brand color. (The org name
   placeholder in this step is intentionally generic — it's not NMTSA's.)
3. Set default notification channels.

From this point the instance is live and fully separate from every other
instance — different database, different auth keys, different domain.

### 8. Optional: per-instance integrations

Configure these independently for the new instance whenever you're ready —
none are required to launch:

```bash
npm run setup:email    # Resend — email notifications, invites, verification
npm run setup:sms      # Twilio — SMS notifications
npm run setup:stripe   # Stripe — paid content
npm run setup:google   # Google Drive import
```

Each Stripe-enabled instance needs **its own** webhook endpoint in the
Stripe dashboard pointing at that deployment's
`https://lms.ohack.dev/api/stripe/webhook` — webhook secrets are
per-endpoint and are not shared across instances.

---

## Environment variable matrix

| Variable | Lives in | Required? | What breaks without it |
|---|---|---|---|
| `SITE_URL` | Convex deployment | **Required** | CORS falls back to the localhost dev origin (browsers get blocked calling `/api/stripe/checkout` and `/api/serve-chunked/*` from the real domain); every generated email/SMS link (password reset, invites, verification, shares) throws instead of silently pointing at another org's domain — see `getOrgName`/`requireSiteUrl` in `convex/helpers.ts` |
| `ALLOWED_ORIGINS` | Convex deployment | Optional | Only `SITE_URL`'s origin is allowed to call the HTTP API — an apex/`www` alias or a Vercel preview domain gets CORS-blocked. Comma-separated list of additional absolute origins, e.g. `https://www.lms.ohack.dev,https://ohack-lms-preview.vercel.app` |
| `JWT_PRIVATE_KEY` | Convex deployment | **Required** | Convex Auth cannot sign session tokens — sign-in is completely broken. Generated by `npm run provision` or `npm run setup:auth`. **Never rotate casually** — it signs out every existing user |
| `JWKS` | Convex deployment | **Required** | Must be the public-key counterpart of `JWT_PRIVATE_KEY` (kid `convex-auth-key`, RS256). Convex Auth token verification fails if missing or mismatched |
| `MEDIA_URL_SECRET` | Convex deployment | **Required** (as of v0.6.0) | Signed media URLs **fail closed** — private, password-protected, and priced content becomes unservable (`/api/serve-chunked/*` returns 403 for everything that isn't public+unpriced+password-free) |
| `ORG_NAME` | Convex deployment | Recommended | The **password-reset email** is sent from a Convex Auth callback that has no database access, so it cannot read `siteSettings`. Without `ORG_NAME` that email is sent from the neutral `"Content Portal"` rather than this organization's name — which reads as a phishing attempt to recipients. Everything else takes its name from `siteSettings` (set in the setup wizard) |
| `VITE_CONVEX_URL` | Vercel build env | **Required** | Frontend has no backend to talk to. Baked in at build time — changing it requires a rebuild/redeploy, not just an env var flip |
| `CONVEX_DEPLOYMENT` | Local `.env.local` (dev only) | Required for local dev | `npx convex dev` doesn't know which deployment to sync functions to. Not used in the deployed app itself |
| `ALLOW_MOCK_PAYMENTS` | Convex deployment | Must stay **unset** in production | When `"true"`, lets a user mark their own order complete without paying. Dev-only convenience for testing the purchase flow without a real Stripe account — **never set this on a production deployment** |
| `STRIPE_SECRET_KEY` | Convex deployment | Optional | Paid content checkout is disabled |
| `STRIPE_WEBHOOK_SECRET` | Convex deployment | Required if `STRIPE_SECRET_KEY` is set | Webhook signature verification fails, so `checkout.session.completed` events are rejected and paid orders never get marked complete |
| `RESEND_API_KEY` | Convex deployment | Optional | All email (notifications, invites, verification, password reset) is disabled |
| `RESEND_DOMAIN` | Convex deployment | Optional | Falls back to `resend.dev` sender domain — fine for testing, not for production sending reputation |
| `TWILIO_ACCOUNT_SID` / `TWILIO_AUTH_TOKEN` / `TWILIO_PHONE_NUMBER` | Convex deployment | Optional | SMS notifications disabled |
| `AUTH_GOOGLE_ID` / `AUTH_GOOGLE_SECRET` | Convex deployment | Optional | "Sign in with Google" disabled; email/password still works |
| `VITE_GOOGLE_CLIENT_ID` / `VITE_GOOGLE_API_KEY` / `VITE_GOOGLE_APP_ID` | Vercel build env | Optional | Google Drive file import disabled |

## Explicit warnings

- **`ALLOW_MOCK_PAYMENTS` must never be set on a production deployment.**
  `npm run provision` never sets it — if you find it set on a prod
  deployment, that's a bug to fix immediately, not a feature.
- **`MEDIA_URL_SECRET` fails closed, not open.** If it's missing, private and
  priced content becomes *unservable*, not *publicly servable* — this is the
  safe failure direction, but it means "content won't load" is often a
  missing-env-var problem, not a code bug. Check `npx convex env list`
  first.
- **Each instance needs its own Stripe webhook endpoint.** Webhook secrets
  are minted per-endpoint in the Stripe dashboard; reusing NMTSA's
  `STRIPE_WEBHOOK_SECRET` on another instance will make every webhook
  signature check fail for that instance (and vice versa).
- **Rotating `JWT_PRIVATE_KEY` signs out every existing user.** `npm run
  provision` refuses to overwrite an existing one unless you pass `--force`.
  Only do this deliberately.

## Adding another domain to an existing instance

If you just need a second hostname for an instance that already
exists — an apex/`www` alias, or a Vercel preview domain — that's **not** a
new instance. You don't need to provision anything new:

1. Add the domain as a Vercel domain alias on the existing project
   (Vercel dashboard → Domains → Add).
2. Add it to `ALLOWED_ORIGINS` on that instance's Convex deployment
   (comma-separated if there are already other entries):
   ```bash
   npx convex env set ALLOWED_ORIGINS "https://www.lms.ohack.dev" [--prod]
   ```
3. Leave `SITE_URL` as the canonical domain — it's still what's used for
   generated email/SMS links. `ALLOWED_ORIGINS` only affects which origins
   the browser is allowed to call the API from (CORS).

## Per-instance checklist (copy-paste into a ticket)

```
New instance: <org name> — <domain>

Backend (Convex)
[ ] Created Convex project: <project name / dashboard link>
[ ] Ran `npm run provision -- --site-url https://<domain> [--prod]`
[ ] Verified JWT_PRIVATE_KEY / JWKS / MEDIA_URL_SECRET / SITE_URL are set
    (npx convex env list [--prod]) — values not shared in the ticket
[ ] Set ORG_NAME to this organization's name (password-reset email sender)
[ ] Confirmed ALLOW_MOCK_PAYMENTS is NOT set

Frontend (Vercel)
[ ] Created a new Vercel project from this repo (not reusing another
    instance's project)
[ ] Set VITE_CONVEX_URL to this deployment's Convex URL
[ ] Added domain <domain> in Vercel and pointed DNS (CNAME) at Vercel
[ ] Deployed (npx vercel deploy --prod)

First run
[ ] Opened https://<domain> and completed the setup wizard
[ ] Confirmed the first user is the intended owner
[ ] Set organization name / logo / brand color / favicon

Optional integrations (check off what this org needs)
[ ] Resend (npm run setup:email) — verified sending domain set as
    RESEND_DOMAIN
[ ] Twilio (npm run setup:sms)
[ ] Stripe (npm run setup:stripe) — dedicated webhook endpoint created at
    https://<domain>/api/stripe/webhook, STRIPE_WEBHOOK_SECRET set
[ ] Google Drive / OAuth (npm run setup:google)

Sign-off
[ ] No org-specific fallback text visible anywhere in the UI/emails for
    this instance
[ ] ALLOWED_ORIGINS set if this instance needs more than one origin
```
