/**
 * Which login system this build uses. Baked in at build time (like
 * VITE_CONVEX_URL): one deployment = one auth mode.
 *
 * - "convex" (default): the built-in Convex Auth password login.
 * - "propelauth": the org's own PropelAuth instance (VITE_PROPELAUTH_URL
 *   required; the Convex deployment needs the matching PROPELAUTH_URL).
 *
 * See docs/EXTERNAL_AUTH.md.
 */
export type AuthMode = "convex" | "propelauth";

export const AUTH_MODE: AuthMode =
  import.meta.env.VITE_AUTH_PROVIDER === "propelauth" ? "propelauth" : "convex";

export const isExternalAuth = AUTH_MODE !== "convex";

export const PROPELAUTH_URL: string | undefined =
  import.meta.env.VITE_PROPELAUTH_URL;
