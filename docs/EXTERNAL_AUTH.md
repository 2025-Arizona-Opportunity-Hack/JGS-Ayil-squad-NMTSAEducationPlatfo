# External authentication (PropelAuth today, Auth0-ready)

An instance can replace the built-in Convex Auth password login with the
organization's own identity provider, so users don't need another set of
credentials. PropelAuth is implemented; the same seams accommodate Auth0 or
any OIDC/custom-JWT provider (design notes at the bottom).

One deployment uses one auth mode — it's baked into the frontend build like
`VITE_CONVEX_URL`.

## Architecture

Three seams, all provider-agnostic except the middle of each:

1. **Token verification** — `convex/auth.config.ts` registers the external
   issuer (from `PROPELAUTH_URL` / `EXTERNAL_AUTH_ISSUERS`) as a `customJwt`
   provider; Convex verifies signatures against the issuer's JWKS
   (`<issuer>/.well-known/jwks.json`). No backend secret is needed.
2. **Identity → account mapping** — `convex/externalAuth.ts`:
   - `authIdentities` table maps a verified `tokenIdentifier`
     (`issuer|subject`) to a `users` row.
   - `ensureExternalUser` (called once by the frontend after login) creates or
     finds that row. It creates an **account only** — profiles and roles still
     go through `users.createUserProfile`, so the join-request gate and the
     client/parent role clamp apply to external signups unchanged.
   - `getAuthUserId` is the app-wide replacement for the @convex-dev/auth
     helper: Convex Auth identities resolve exactly as before; external
     identities resolve through `authIdentities`. **Never import
     `getAuthUserId` from `@convex-dev/auth/server` in app code** — one copy
     of the resolution logic, per the security invariants.
3. **Frontend session** — `src/lib/externalAuth.tsx` adapts the provider's
   React SDK to `ConvexProviderWithAuth` (`{ isLoading, isAuthenticated,
   fetchAccessToken }`), bridges sign-out through `AppSignOutContext`
   (`src/lib/appAuth.tsx`), and swaps the password form for hosted
   login/signup redirects. `src/lib/authMode.ts` is the build-time switch.

In external mode the app hides Convex-Auth-only UI: the password sign-in/up
form, `/reset-password`, and the owner-password form in the setup wizard
(replaced by "sign in to continue" — the first authenticated user still
claims owner through the existing wizard flow).

## Enabling PropelAuth on an instance

1. **PropelAuth dashboard** (test env first, then prod):
   - Frontend Integration → add the app's URL (e.g. `http://localhost:5173`,
     later `https://lms.example.org`) so redirects and cookies work.
2. **Convex deployment env** (`npx convex env set ...`):
   - `PROPELAUTH_URL` — the auth URL, e.g. `https://44082960.propelauthtest.com`
     or your custom auth domain. Must match the token `iss` exactly (no
     trailing slash needed; both sides normalize).
   - Optional: `EXTERNAL_AUTH_TRUST_EMAILS=true` — link an external login to
     an EXISTING account with the same email instead of creating a new one.
     Off by default (account-takeover guard). Only enable when the provider
     verifies email ownership — PropelAuth does. This is also the migration
     path: existing password users (including the owner) keep their profiles
     when they first sign in through PropelAuth.
3. **Frontend build env** (Vercel project settings):
   - `VITE_AUTH_PROVIDER=propelauth`
   - `VITE_PROPELAUTH_URL=<same URL as PROPELAUTH_URL>`
4. Redeploy backend (`npx convex deploy`) and frontend. `auth.config.ts` is
   applied at push time — the backend must be redeployed after changing
   `PROPELAUTH_URL`.

Signup flow notes:
- Join requests, invite codes, and `allowPublicSignup` behave exactly as with
  password auth; only the credential step is external.
- PropelAuth access tokens carry `email`, `first_name`, `last_name`; the
  users row gets email + display name from the token, and the profile
  (first/last name, role selection) is still created in-app.

## Security invariants (additions)

- `ensureExternalUser` takes **no arguments** — identity comes only from the
  verified JWT. It never creates a profile or grants a role.
- Email linking is opt-in via `EXTERNAL_AUTH_TRUST_EMAILS` (see above).
- `convex/auth.config.ts` must read optional env vars via enumeration
  (`Object.entries(process.env)`), because a direct `process.env.X` read of
  an unset var fails every push with `AuthConfigMissingEnvironmentVariable` —
  which would break instances that don't use external auth.
- Issuer lists in `auth.config.ts` and `externalIssuers()`
  (`convex/externalAuth.ts`) must stay in sync; both read the same env vars.
- Regression tests: `convex/externalAuth.test.ts`.

## Future: Auth0 (design only — not implemented)

The seams above were shaped so Auth0 needs no schema or resolver changes:

1. **Token verification** — Auth0 issues proper OIDC tokens with an `aud`
   claim, so instead of `customJwt` it should get a first-class entry in
   `auth.config.ts`: `{ domain: "https://<tenant>.auth0.com/", applicationID:
   "<API audience>" }` (note Auth0's `iss` has a trailing slash). Add the
   issuer to `EXTERNAL_AUTH_ISSUERS` so `getAuthUserId` routes it through
   `authIdentities` — the normalization there already tolerates the slash.
2. **Mapping** — unchanged. `tokenIdentifier` (`issuer|sub`, e.g.
   `...auth0.com/|auth0|abc123`) is already provider-neutral. Auth0 supplies
   standard `email`/`email_verified` claims, so email linking could be
   hardened to require `identity.emailVerified === true` instead of an env
   toggle when this is built.
3. **Frontend** — implement the same three pieces `externalAuth.tsx` exports:
   a `useAuth` adapter over `@auth0/auth0-react`'s `getAccessTokenSilently`
   (request the API audience so you get a JWT, not an opaque token), a
   sign-out bridge over `logout()`, and `loginWithRedirect` buttons. Extend
   `AuthMode` in `src/lib/authMode.ts` with `"auth0"` and branch in
   `main.tsx`.

Keeping `VITE_AUTH_PROVIDER` a string enum (not a boolean) and routing all
provider imports through `src/lib/externalAuth.tsx` were deliberate for this.
