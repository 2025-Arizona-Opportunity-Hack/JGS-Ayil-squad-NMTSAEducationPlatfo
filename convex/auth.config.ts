/**
 * JWT issuers this deployment trusts. Read at `convex deploy`/`convex dev`
 * push time from the deployment's env vars.
 *
 * - The Convex Auth entry (built-in password login) is always present.
 * - PROPELAUTH_URL adds that PropelAuth instance as a trusted issuer.
 *   PropelAuth serves OIDC discovery + JWKS under /.well-known/, and its
 *   access tokens carry no `aud` claim, so it's registered as a customJwt
 *   provider (no applicationID check).
 * - EXTERNAL_AUTH_ISSUERS (comma-separated URLs) covers future providers
 *   whose tokens follow the same shape. A provider that sets `aud` (e.g.
 *   Auth0) should instead get its own entry with `applicationID` — see
 *   docs/EXTERNAL_AUTH.md.
 *
 * Keep this list in sync with externalIssuers() in convex/externalAuth.ts:
 * an issuer trusted here but unknown there authenticates but never resolves
 * to a user, and vice versa.
 */
// Enumeration on purpose: when this file is evaluated at push time, Convex
// errors on any read of an UNSET env var (AuthConfigMissingEnvironmentVariable),
// but these two are optional — most instances don't configure external auth.
// Object.entries only yields vars that are actually set, so this never trips
// that check.
const setEnvVars = Object.fromEntries(Object.entries(process.env));
const optionalEnv = (name: string): string | undefined => setEnvVars[name];

const externalIssuerUrls = [
  optionalEnv("PROPELAUTH_URL"),
  ...(optionalEnv("EXTERNAL_AUTH_ISSUERS")?.split(",") ?? []),
]
  .map((u) => u?.trim())
  .filter((u): u is string => !!u)
  .map((u) => u.replace(/\/+$/, ""));

export default {
  providers: [
    {
      domain: process.env.CONVEX_SITE_URL,
      applicationID: "convex",
    },
    ...externalIssuerUrls.map((issuer) => ({
      type: "customJwt",
      issuer,
      jwks: `${issuer}/.well-known/jwks.json`,
      algorithm: "RS256",
    })),
  ],
};
