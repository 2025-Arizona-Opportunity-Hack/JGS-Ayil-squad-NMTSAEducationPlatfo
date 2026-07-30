#!/usr/bin/env node

/**
 * Provisions the per-deployment secrets a NEW Content Portal instance needs
 * on its Convex deployment.
 *
 * This platform is deployed one instance per organization (its own Convex
 * project + its own Vercel project, same git repo) — see docs/DEPLOYMENTS.md
 * for why. This script automates the manual part of standing up a new
 * instance's backend secrets so it's repeatable and hard to get wrong.
 *
 * It sets, on the target Convex deployment:
 *   JWT_PRIVATE_KEY   RSA-2048 private key (PKCS8 PEM) for Convex Auth
 *   JWKS              matching public JWKS (kid: convex-auth-key, RS256)
 *   MEDIA_URL_SECRET  32 random bytes (hex) — required since v0.6.0;
 *                     signed media URLs fail closed without it
 *   SITE_URL          the value passed to --site-url
 *
 * The RSA/JWKS generation mirrors `generateAuthKeys()` in scripts/setup.tsx
 * exactly (same algorithm/params/JWK fields) so keys are indistinguishable
 * from ones the interactive setup wizard would produce. We don't import that
 * file directly — it's an Ink TUI app that renders on module load and
 * requires a TTY, so it can't be required as a plain library.
 *
 * This script deliberately never sets ALLOW_MOCK_PAYMENTS: that flag lets a
 * user complete their own order without paying and must stay a dev-only,
 * manually-opted-into escape hatch — never something a provisioning tool
 * turns on for you.
 *
 * Usage:
 *   node scripts/provision-instance.mjs --site-url <url> [--prod] [--force]
 *   npm run provision -- --site-url <url> [--prod] [--force]
 */

import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { pathToFileURL } from "node:url";

const USAGE = `
Content Portal — instance provisioning

Usage:
  node scripts/provision-instance.mjs --site-url <url> [--prod] [--force]
  npm run provision -- --site-url <url> [--prod] [--force]

Generates and sets, on the target Convex deployment:
  JWT_PRIVATE_KEY   RSA-2048 private key (PKCS8 PEM) for Convex Auth
  JWKS              matching public JWKS (kid: convex-auth-key, RS256)
  MEDIA_URL_SECRET  32 random bytes (hex) — required for signed media URLs
  SITE_URL          the value passed to --site-url

Flags:
  --site-url <url>   Required. The instance's frontend origin,
                      e.g. https://lms.ohack.dev
  --prod              Target the deployment's production environment
                      (adds --prod to every \`npx convex env set\` call).
                      Omit to target the linked dev deployment.
  --force             Allow overwriting an existing JWT_PRIVATE_KEY. Without
                      this flag the script refuses when one is already set —
                      rotating it signs out every existing user, so that must
                      be a deliberate choice.
  --help, -h          Show this help.

Never sets ALLOW_MOCK_PAYMENTS. Never prints secret values.

See docs/DEPLOYMENTS.md for the full runbook.
`;

// ── Argument parsing (pure — no I/O) ────────────────────────────────────────

export function parseArgs(argv) {
  const args = { siteUrl: null, prod: false, force: false, help: false };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === "--site-url") {
      args.siteUrl = argv[i + 1] ?? null;
      i++;
    } else if (a === "--prod") {
      args.prod = true;
    } else if (a === "--force") {
      args.force = true;
    } else if (a === "--help" || a === "-h") {
      args.help = true;
    }
  }
  return args;
}

export function validateSiteUrl(siteUrl) {
  if (!siteUrl) return "Missing required --site-url <url>";
  if (siteUrl !== siteUrl.trim()) {
    return "--site-url must not have leading/trailing whitespace";
  }
  let parsed;
  try {
    parsed = new URL(siteUrl);
  } catch {
    return `--site-url is not a valid absolute URL: ${siteUrl}`;
  }
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return `--site-url must be http:// or https://, got: ${parsed.protocol}`;
  }
  return null;
}

// ── Secret generation (pure — no I/O) ───────────────────────────────────────

// Mirrors generateAuthKeys() in scripts/setup.tsx so keys match what the
// interactive wizard produces.
export function generateAuthKeys() {
  const { privateKey, publicKey } = crypto.generateKeyPairSync("rsa", {
    modulusLength: 2048,
    publicKeyEncoding: { type: "spki", format: "pem" },
    privateKeyEncoding: { type: "pkcs8", format: "pem" },
  });

  const pubKeyObj = crypto.createPublicKey(publicKey);
  const jwk = pubKeyObj.export({ format: "jwk" });
  jwk.kid = "convex-auth-key";
  jwk.use = "sig";
  jwk.alg = "RS256";

  return { privateKey, jwks: JSON.stringify({ keys: [jwk] }) };
}

export function generateMediaUrlSecret() {
  return crypto.randomBytes(32).toString("hex");
}

// Pure decision logic over `npx convex env list` output, kept separate from
// the child_process call so it's unit-testable without touching a real
// Convex deployment. Convex's env list output lines start with the var name
// (e.g. "JWT_PRIVATE_KEY=..." or "JWT_PRIVATE_KEY ..."); we only need to know
// whether the name appears as a line's leading token, not its value.
export function hasExistingKey(envListOutput, keyName) {
  return envListOutput
    .split("\n")
    .some((line) => new RegExp(`^${keyName}\\b`).test(line.trim()));
}

// ── Convex CLI I/O ───────────────────────────────────────────────────────────

function convexEnvList(prodFlag) {
  return execFileSync("npx", ["convex", "env", "list", ...prodFlag], {
    encoding: "utf-8",
    stdio: ["ignore", "pipe", "pipe"],
  });
}

function convexEnvSet(key, value, prodFlag) {
  execFileSync(
    "npx",
    ["convex", "env", "set", ...prodFlag, key, "--", value],
    { stdio: ["ignore", "ignore", "inherit"] }
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────

export async function main(argv) {
  const { siteUrl, prod, force, help } = parseArgs(argv);

  if (help) {
    console.log(USAGE);
    return 0;
  }

  const validationError = validateSiteUrl(siteUrl);
  if (validationError) {
    console.error(`\nError: ${validationError}\n${USAGE}`);
    return 1;
  }

  const prodFlag = prod ? ["--prod"] : [];
  const target = prod ? "production" : "development";

  console.log(`\nProvisioning Convex ${target} deployment for: ${siteUrl}\n`);
  console.log("This will set on that deployment:");
  console.log("  SITE_URL          =", siteUrl);
  console.log("  MEDIA_URL_SECRET  = <generated — 32 random bytes, hex>");
  console.log(
    "  JWT_PRIVATE_KEY   = <generated — RSA-2048 PKCS8>" +
      (force
        ? "  (--force: will overwrite if already set)"
        : "  (left untouched if already set)")
  );
  console.log("  JWKS              = <generated — matching public JWKS>");
  console.log("  ALLOW_MOCK_PAYMENTS is never touched by this script.\n");

  console.log("Checking existing Convex environment (npx convex env list)...");
  let envListOutput;
  try {
    envListOutput = convexEnvList(prodFlag);
  } catch {
    console.error(
      "\nCould not read the Convex environment. Is this project linked?\n" +
        "Run `npx convex dev` (dev) or `npx convex deploy --prod` (prod) at\n" +
        "least once first, and make sure you're logged in (`npx convex login`).\n"
    );
    return 1;
  }

  const jwtAlreadySet = hasExistingKey(envListOutput, "JWT_PRIVATE_KEY");
  if (jwtAlreadySet && !force) {
    console.error(
      "\nJWT_PRIVATE_KEY is already set on this deployment. Rotating it\n" +
        "signs out every existing user — that must be a deliberate choice.\n" +
        "Re-run with --force if you really want to rotate it.\n" +
        "(SITE_URL, MEDIA_URL_SECRET, and JWKS were NOT changed.)\n"
    );
    return 1;
  }

  const { privateKey, jwks } = generateAuthKeys();
  const mediaUrlSecret = generateMediaUrlSecret();

  console.log("\nSetting environment variables on Convex...");
  try {
    convexEnvSet("SITE_URL", siteUrl, prodFlag);
    console.log("  done: SITE_URL");
    convexEnvSet("MEDIA_URL_SECRET", mediaUrlSecret, prodFlag);
    console.log("  done: MEDIA_URL_SECRET");
    convexEnvSet("JWT_PRIVATE_KEY", privateKey, prodFlag);
    console.log(`  done: JWT_PRIVATE_KEY${jwtAlreadySet ? " (rotated)" : ""}`);
    convexEnvSet("JWKS", jwks, prodFlag);
    console.log("  done: JWKS");
  } catch {
    console.error(
      "\nFailed to set an environment variable on Convex — see the CLI output above."
    );
    return 1;
  }

  console.log(`
Done. Next steps:
  1. Create a NEW Vercel project from this repo for this instance (don't
     reuse another instance's project — VITE_CONVEX_URL is baked in at
     build time, so one Vercel build can only ever point at one backend).
  2. Set VITE_CONVEX_URL on that Vercel project to this Convex deployment's
     URL (Convex dashboard → Settings → URL & Deploy Key).
  3. Add ${siteUrl} as a domain on the Vercel project and point its DNS
     (CNAME) at Vercel.
  4. Deploy, then open the site — the first user to sign in becomes the
     owner via the in-app setup wizard.
  5. Optionally configure Resend / Twilio / Stripe / Google for this
     instance: \`npm run setup:email\`, \`setup:sms\`, \`setup:stripe\`,
     \`setup:google\`.

Full runbook: docs/DEPLOYMENTS.md
`);
  return 0;
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  main(process.argv.slice(2)).then(
    (code) => process.exit(code),
    (err) => {
      console.error("\nUnexpected error:", err);
      process.exit(1);
    }
  );
}
