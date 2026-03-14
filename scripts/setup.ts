#!/usr/bin/env npx tsx

/**
 * Interactive CLI setup for NMTSA Education Platform.
 *
 * Collects environment variables, writes .env files, optionally pushes to
 * Vercel/Netlify and triggers deployment.
 *
 * Usage:
 *   npx tsx scripts/setup.ts
 *   npm run setup
 */

import * as readline from "readline/promises";
import { stdin, stdout } from "process";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

const rl = readline.createInterface({ input: stdin, output: stdout });

// ── Helpers ──────────────────────────────────────────────────────────────────

function banner(text: string) {
  const line = "═".repeat(60);
  console.log(`\n╔${line}╗`);
  console.log(`║${text.padStart(30 + text.length / 2).padEnd(60)}║`);
  console.log(`╚${line}╝\n`);
}

async function ask(question: string, defaultValue?: string): Promise<string> {
  const suffix = defaultValue ? ` [${defaultValue}]` : "";
  const answer = await rl.question(`  ${question}${suffix}: `);
  return answer.trim() || defaultValue || "";
}

async function confirm(question: string, defaultYes = true): Promise<boolean> {
  const hint = defaultYes ? "[Y/n]" : "[y/N]";
  const answer = await rl.question(`  ${question} ${hint}: `);
  if (!answer.trim()) return defaultYes;
  return answer.trim().toLowerCase().startsWith("y");
}

async function choice(question: string, options: string[]): Promise<number> {
  console.log(`\n  ${question}`);
  options.forEach((opt, i) => console.log(`    ${i + 1}. ${opt}`));
  const answer = await rl.question("  Choice: ");
  const idx = parseInt(answer.trim(), 10) - 1;
  if (idx >= 0 && idx < options.length) return idx;
  return 0;
}

// ── Validators ───────────────────────────────────────────────────────────────

const validators: Record<string, (v: string) => string | null> = {
  VITE_CONVEX_URL: (v) =>
    v.startsWith("https://") ? null : "Must start with https://",
  RESEND_API_KEY: (v) =>
    v.startsWith("re_") ? null : "Must start with re_",
  RESEND_FROM_EMAIL: (v) =>
    v.includes("@") ? null : "Must be a valid email address",
  TWILIO_ACCOUNT_SID: (v) =>
    v.startsWith("AC") ? null : "Must start with AC",
  TWILIO_PHONE_NUMBER: (v) =>
    /^\+\d{10,15}$/.test(v) ? null : "Must be E.164 format (e.g., +14155551234)",
  STRIPE_SECRET_KEY: (v) =>
    v.startsWith("sk_") ? null : "Must start with sk_",
  STRIPE_WEBHOOK_SECRET: (v) =>
    v.startsWith("whsec_") ? null : "Must start with whsec_",
};

async function askValidated(
  name: string,
  question: string,
  required = false
): Promise<string> {
  while (true) {
    const value = await ask(question);
    if (!value) {
      if (required) {
        console.log("    This field is required.");
        continue;
      }
      return "";
    }
    const validate = validators[name];
    if (validate) {
      const err = validate(value);
      if (err) {
        console.log(`    Invalid: ${err}`);
        continue;
      }
    }
    return value;
  }
}

// ── Env writing ──────────────────────────────────────────────────────────────

function writeEnvFile(
  vars: Record<string, string>,
  isProd: boolean
): string {
  const filename = isProd ? ".env.production.local" : ".env.local";
  const filepath = path.resolve(process.cwd(), filename);

  // Read existing file if present, to preserve vars we don't manage
  let existing: Record<string, string> = {};
  if (fs.existsSync(filepath)) {
    const content = fs.readFileSync(filepath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) existing[match[1].trim()] = match[2].trim();
    }
  }

  // Merge — our values override
  const merged = { ...existing, ...vars };

  const lines = Object.entries(merged)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`);

  fs.writeFileSync(filepath, lines.join("\n") + "\n", "utf-8");
  return filepath;
}

// ── Platform deployment ──────────────────────────────────────────────────────

function pushToVercel(vars: Record<string, string>) {
  console.log("\n  Pushing environment variables to Vercel...");
  for (const [key, value] of Object.entries(vars)) {
    if (!value) continue;
    try {
      execFileSync("npx", ["vercel", "env", "add", key, "production"], {
        input: value,
        stdio: ["pipe", "inherit", "inherit"],
        cwd: process.cwd(),
      });
    } catch {
      console.log(`    Warning: Could not set ${key} on Vercel (may already exist)`);
    }
  }
}

function pushToNetlify(vars: Record<string, string>) {
  console.log("\n  Pushing environment variables to Netlify...");
  for (const [key, value] of Object.entries(vars)) {
    if (!value) continue;
    try {
      execFileSync("npx", ["netlify", "env:set", key, value], {
        stdio: ["pipe", "inherit", "inherit"],
        cwd: process.cwd(),
      });
    } catch {
      console.log(`    Warning: Could not set ${key} on Netlify`);
    }
  }
}

function deployVercel() {
  console.log("\n  Deploying to Vercel...");
  try {
    execFileSync("npx", ["vercel", "deploy", "--prod"], {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("  Deployment triggered successfully!");
  } catch {
    console.log("  Warning: Deployment command failed. You may need to deploy manually.");
  }
}

function deployNetlify() {
  console.log("\n  Deploying to Netlify...");
  try {
    execFileSync("npx", ["netlify", "deploy", "--prod"], {
      stdio: "inherit",
      cwd: process.cwd(),
    });
    console.log("  Deployment triggered successfully!");
  } catch {
    console.log("  Warning: Deployment command failed. You may need to deploy manually.");
  }
}

// ── Main flow ────────────────────────────────────────────────────────────────

async function main() {
  banner("NMTSA Education Platform Setup");

  console.log("  This wizard will help you configure environment variables");
  console.log("  for your development or production environment.\n");

  // 1. Dev or production?
  const envIdx = await choice("Which environment?", [
    "Development (writes .env.local)",
    "Production (writes .env.production.local)",
  ]);
  const isProd = envIdx === 1;

  const vars: Record<string, string> = {};

  // 2. Required: Convex URL
  console.log("\n  -- Convex --");
  vars.VITE_CONVEX_URL = await askValidated(
    "VITE_CONVEX_URL",
    "Convex deployment URL (e.g., https://your-app-123.convex.cloud)",
    true
  );

  // 3. Auth private key
  vars.CONVEX_AUTH_PRIVATE_KEY = await ask(
    "Convex auth private key (paste or press Enter to skip)"
  );

  // 4. Email (Resend)
  if (await confirm("Set up email notifications (Resend)?")) {
    console.log("    Get your API key from: https://resend.com/api-keys");
    vars.RESEND_API_KEY = await askValidated("RESEND_API_KEY", "Resend API key", true);
    vars.RESEND_FROM_EMAIL = await askValidated(
      "RESEND_FROM_EMAIL",
      "From email address",
      true
    );
  }

  // 5. SMS (Twilio)
  if (await confirm("Set up SMS notifications (Twilio)?")) {
    console.log("    Get your credentials from: https://console.twilio.com");
    vars.TWILIO_ACCOUNT_SID = await askValidated(
      "TWILIO_ACCOUNT_SID",
      "Twilio Account SID",
      true
    );
    vars.TWILIO_AUTH_TOKEN = await ask("Twilio Auth Token");
    vars.TWILIO_PHONE_NUMBER = await askValidated(
      "TWILIO_PHONE_NUMBER",
      "Twilio phone number (E.164 format)",
      true
    );
  }

  // 6. Stripe
  if (await confirm("Set up Stripe payments?")) {
    console.log("    Get your keys from: https://dashboard.stripe.com/apikeys");
    vars.STRIPE_SECRET_KEY = await askValidated(
      "STRIPE_SECRET_KEY",
      "Stripe secret key",
      true
    );
    vars.STRIPE_WEBHOOK_SECRET = await askValidated(
      "STRIPE_WEBHOOK_SECRET",
      "Stripe webhook secret"
    );
  }

  // 7. Google Drive
  if (await confirm("Set up Google Drive integration?", false)) {
    vars.GOOGLE_CLIENT_ID = await ask("Google Client ID");
    vars.GOOGLE_CLIENT_SECRET = await ask("Google Client Secret");
  }

  // 8. Dev/prod specific
  if (isProd) {
    vars.ENVIRONMENT = "production";
  } else {
    vars.ENVIRONMENT = "development";
    const testEmail = await ask("Dev test email (for email redirect)", "test@example.com");
    if (testEmail) vars.DEV_TEST_EMAIL = testEmail;
  }

  // 9. Write env file
  const filepath = writeEnvFile(vars, isProd);
  console.log(`\n  Environment file written to: ${filepath}`);

  // 10. Push env vars to Convex
  if (await confirm("Push variables to Convex?")) {
    console.log("  Pushing to Convex...");
    for (const [key, value] of Object.entries(vars)) {
      if (!value || key.startsWith("VITE_")) continue;
      try {
        execFileSync("npx", ["convex", "env", "set", key, "--", value], {
          stdio: ["pipe", "inherit", "inherit"],
          cwd: process.cwd(),
        });
      } catch {
        console.log(`    Warning: Could not set ${key} in Convex`);
      }
    }
  }

  // 11. Production deployment
  if (isProd) {
    const platformIdx = await choice("Deploy to which platform?", [
      "Vercel",
      "Netlify",
      "None (I'll deploy manually)",
    ]);

    if (platformIdx === 0) {
      pushToVercel(vars);
      if (await confirm("Trigger Vercel production deployment now?")) {
        deployVercel();
      }
    } else if (platformIdx === 1) {
      pushToNetlify(vars);
      if (await confirm("Trigger Netlify production deployment now?")) {
        deployNetlify();
      }
    }
  }

  banner("Setup Complete!");
  console.log("  Next steps:");
  if (!isProd) {
    console.log("    1. Run `npm run dev` to start the dev server");
    console.log("    2. Visit the app to complete the in-app setup wizard");
  } else {
    console.log("    1. Verify your deployment is live");
    console.log("    2. Visit the app to complete the in-app setup wizard");
  }
  console.log("");

  rl.close();
}

main().catch((err) => {
  console.error("\n  Setup failed:", err);
  rl.close();
  process.exit(1);
});
