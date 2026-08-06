/**
 * External (third-party) authentication support.
 *
 * The app's built-in auth is Convex Auth (password provider). An instance can
 * additionally trust an external JWT issuer — PropelAuth today, Auth0 or any
 * other OIDC/custom-JWT provider later — so an organization can reuse its own
 * login instead of creating another set of credentials.
 *
 * How the pieces fit:
 * - `auth.config.ts` registers the external issuer (from PROPELAUTH_URL /
 *   EXTERNAL_AUTH_ISSUERS) so Convex verifies its JWTs via JWKS.
 * - The frontend (src/lib/externalAuth.tsx) sends those JWTs through
 *   `ConvexProviderWithAuth` and calls `ensureExternalUser` after login.
 * - `ensureExternalUser` maps the verified identity to a `users` row via the
 *   `authIdentities` table. It creates the account only — never a profile and
 *   never a role. Profile creation still flows through
 *   `users.createUserProfile`, so the join-request gate and the client/parent
 *   role clamp apply to external signups exactly as to password signups.
 * - `getAuthUserId` below replaces the @convex-dev/auth import everywhere in
 *   the backend: Convex Auth identities resolve as before, external
 *   identities resolve through `authIdentities`.
 *
 * See docs/EXTERNAL_AUTH.md for setup and the Auth0 design notes.
 */
import { ConvexError, v } from "convex/values";
import { getAuthUserId as convexAuthUserId } from "@convex-dev/auth/server";
import {
  ActionCtx,
  MutationCtx,
  QueryCtx,
  internalQuery,
  mutation,
} from "./_generated/server";
import { internal } from "./_generated/api";
import { Id } from "./_generated/dataModel";

const stripTrailingSlash = (url: string) => url.replace(/\/+$/, "");

/**
 * Issuers this deployment trusts for external login. PROPELAUTH_URL is the
 * primary switch; EXTERNAL_AUTH_ISSUERS (comma-separated) exists so a future
 * provider (e.g. Auth0) doesn't require a code change here. Both must match
 * what auth.config.ts registers — an issuer listed here but not there can
 * never produce a verified identity, and vice versa.
 */
export function externalIssuers(): string[] {
  const issuers = [
    process.env.PROPELAUTH_URL,
    ...(process.env.EXTERNAL_AUTH_ISSUERS?.split(",") ?? []),
  ];
  return issuers
    .map((u) => u?.trim())
    .filter((u): u is string => !!u)
    .map(stripTrailingSlash);
}

export function isExternalIssuer(issuer: string): boolean {
  return externalIssuers().includes(stripTrailingSlash(issuer));
}

async function externalUserId(
  ctx: QueryCtx | MutationCtx,
  tokenIdentifier: string
): Promise<Id<"users"> | null> {
  const link = await ctx.db
    .query("authIdentities")
    .withIndex("by_token_identifier", (q) =>
      q.eq("tokenIdentifier", tokenIdentifier)
    )
    .unique();
  return link?.userId ?? null;
}

/**
 * Drop-in replacement for @convex-dev/auth's getAuthUserId that also resolves
 * identities from trusted external issuers. All backend code imports this one
 * (keeping a single copy of the resolution logic, per the security
 * invariants). Returns null for an external identity that hasn't been through
 * ensureExternalUser yet.
 */
export async function getAuthUserId(
  ctx: QueryCtx | MutationCtx | ActionCtx
): Promise<Id<"users"> | null> {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;
  if (!isExternalIssuer(identity.issuer)) {
    return await convexAuthUserId(ctx);
  }
  if ("db" in ctx) {
    return await externalUserId(ctx, identity.tokenIdentifier);
  }
  // Actions have no ctx.db — resolve through an internal query.
  const userId: Id<"users"> | null = await ctx.runQuery(
    internal.externalAuth.lookupExternalUserId,
    {}
  );
  return userId;
}

export const lookupExternalUserId = internalQuery({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity || !isExternalIssuer(identity.issuer)) return null;
    return await externalUserId(ctx, identity.tokenIdentifier);
  },
});

/**
 * Called by the frontend once after an external login. Creates (or finds) the
 * `users` row for the verified identity and records the mapping.
 *
 * Security notes:
 * - Takes no arguments: everything comes from the verified JWT.
 * - Creates an account only. Roles/profiles still go through
 *   users.createUserProfile (join-request gate + client/parent clamp intact).
 * - Linking to an EXISTING account by matching email is off by default and
 *   opt-in via EXTERNAL_AUTH_TRUST_EMAILS=true. Only enable it when the
 *   external provider verifies email ownership (PropelAuth does) — otherwise
 *   a provider account with someone else's email would take over their
 *   account here.
 */
export const ensureExternalUser = mutation({
  args: {},
  returns: v.union(v.id("users"), v.null()),
  handler: async (ctx) => {
    const identity = await ctx.auth.getUserIdentity();
    if (!identity) throw new ConvexError("Not authenticated");
    // Convex Auth manages its own users table rows; nothing to do.
    if (!isExternalIssuer(identity.issuer)) return null;

    const existing = await ctx.db
      .query("authIdentities")
      .withIndex("by_token_identifier", (q) =>
        q.eq("tokenIdentifier", identity.tokenIdentifier)
      )
      .unique();
    if (existing) return existing.userId;

    const email = identity.email?.toLowerCase();
    // Convex maps standard OIDC claims onto UserIdentity; PropelAuth access
    // tokens use first_name/last_name, which surface as extra claims.
    const claims = identity as Record<string, unknown>;
    const claim = (k: string) =>
      typeof claims[k] === "string" ? (claims[k] as string) : undefined;
    const joinedName = [
      claim("first_name") ?? identity.givenName,
      claim("last_name") ?? identity.familyName,
    ]
      .filter(Boolean)
      .join(" ");
    const name = identity.name ?? (joinedName || undefined);

    let userId: Id<"users"> | null = null;
    if (email && process.env.EXTERNAL_AUTH_TRUST_EMAILS === "true") {
      // .first(), not .unique(): legacy data may hold duplicate emails; link
      // to the oldest account rather than failing login.
      const match = await ctx.db
        .query("users")
        .withIndex("email", (q) => q.eq("email", email))
        .first();
      if (match) userId = match._id;
    }

    if (!userId) {
      userId = await ctx.db.insert("users", { email, name });
    }

    await ctx.db.insert("authIdentities", {
      tokenIdentifier: identity.tokenIdentifier,
      issuer: stripTrailingSlash(identity.issuer),
      subject: identity.subject,
      userId,
      email,
    });

    return userId;
  },
});
