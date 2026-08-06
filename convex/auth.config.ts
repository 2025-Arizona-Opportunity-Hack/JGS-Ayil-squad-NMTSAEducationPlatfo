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

// Optional env vars MUST be read like this here. During push evaluation
// process.env is not a real env object: it is not enumerable
// (Object.keys(process.env).length === 0, `in` is always false), set vars are
// readable only via property access, and reading an UNSET var throws
// (surfacing as AuthConfigMissingEnvironmentVariable, which would fail every
// push on instances that don't configure external auth). The try/catch makes
// the read optional; in normal runtimes it behaves like a plain env read.
const optionalEnv = (name: string): string | undefined => {
  try {
    return (process.env as Record<string, string | undefined>)[name];
  } catch {
    return undefined;
  }
};

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
