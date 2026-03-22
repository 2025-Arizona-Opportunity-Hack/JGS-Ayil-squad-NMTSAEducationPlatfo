#!/usr/bin/env npx tsx

/**
 * Interactive CLI setup for NMTSA Education Platform.
 *
 * Built with React Ink for a polished terminal UI experience.
 * Collects environment variables, writes .env files, optionally pushes to
 * Vercel/Netlify and triggers deployment.
 *
 * Usage:
 *   npx tsx scripts/setup.tsx
 *   npm run setup
 */

import React, { useState, useCallback, useEffect } from "react";
import { render, Box, Text, useApp, useInput } from "ink";
import TextInput from "ink-text-input";
import SelectInput from "ink-select-input";
import Spinner from "ink-spinner";
import * as fs from "fs";
import * as path from "path";
import { execFileSync } from "child_process";

// ── Types ────────────────────────────────────────────────────────────────────

interface FieldDef {
  key: string;
  label: string;
  required?: boolean;
  validatorKey?: string;
  defaultValue?: string;
  mask?: boolean;
}

interface SelectOption {
  label: string;
  value: string;
}

interface StepDef {
  id: string;
  title: string;
  icon: string;
  description: string;
  helpLines: string[];
  optional?: boolean;
  confirmPrompt?: string;
  /** When set, shows a select menu before fields. The selected value is passed to onSelectAction. */
  selectPrompt?: string;
  selectOptions?: SelectOption[];
  fields: FieldDef[];
  prodOnly?: boolean;
  devOnly?: boolean;
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

// ── Step definitions with help text ──────────────────────────────────────────

const STEPS: StepDef[] = [
  {
    id: "convex",
    title: "Convex",
    icon: "⚡",
    description: "Convex is your real-time backend — it powers the database, auth, and serverless functions.",
    helpLines: [
      "How to get your Convex deployment URL:",
      "1. Go to dashboard.convex.dev",
      "2. Sign in with GitHub or Google",
      "3. Create a new project (or select existing)",
      "4. Go to Settings → URL & Deploy Key",
      '5. Copy the "Deployment URL"',
      "   (looks like https://your-app-123.convex.cloud)",
    ],
    fields: [
      {
        key: "VITE_CONVEX_URL",
        label: "Convex deployment URL",
        required: true,
        validatorKey: "VITE_CONVEX_URL",
      },
    ],
  },
  {
    id: "auth",
    title: "Auth Keys",
    icon: "🔐",
    description: "Auth keys (JWT) secure user sessions. You can auto-generate them or paste an existing key.",
    helpLines: [
      "Auto-generate (recommended):",
      "• Generates a 2048-bit RSA key pair",
      "• Creates the JWT_PRIVATE_KEY and JWKS automatically",
      "• These are pushed to Convex in the deploy step",
      "",
      "Paste existing key:",
      "• Use if you already ran `npx @convex-dev/auth`",
      "• Or if migrating keys from another environment",
      "",
      "Skip:",
      "• You can set this up later via `npm run setup:auth`",
    ],
    optional: true,
    confirmPrompt: "Set up auth keys (JWT)?",
    selectPrompt: "How would you like to set up auth keys?",
    selectOptions: [
      { label: "Auto-generate keys (recommended)", value: "generate" },
      { label: "Paste an existing private key", value: "paste" },
    ],
    fields: [
      {
        key: "CONVEX_AUTH_PRIVATE_KEY",
        label: "Auth private key",
      },
    ],
  },
  {
    id: "email",
    title: "Email",
    icon: "📧",
    description: "Resend powers email notifications, verification emails, and invites.",
    helpLines: [
      "How to get your Resend API key:",
      "1. Go to resend.com and sign in (or create a free account)",
      '2. Click "API Keys" in the left sidebar',
      '3. Click "Create API Key"',
      '4. Give it a name (e.g., "NMTSA Platform")',
      "5. Copy the key (starts with re_)",
      "",
      'For the "From" email address:',
      "• Use an email on a domain you've verified in Resend",
      "• For testing, Resend provides onboarding@resend.dev",
    ],
    optional: true,
    confirmPrompt: "Set up email notifications (Resend)?",
    fields: [
      {
        key: "RESEND_API_KEY",
        label: "Resend API key",
        required: true,
        validatorKey: "RESEND_API_KEY",
      },
      {
        key: "RESEND_FROM_EMAIL",
        label: "From email address",
        required: true,
        validatorKey: "RESEND_FROM_EMAIL",
      },
    ],
  },
  {
    id: "sms",
    title: "SMS",
    icon: "💬",
    description: "Twilio enables SMS notifications for your users.",
    helpLines: [
      "How to get your Twilio credentials:",
      "1. Go to console.twilio.com and sign in (or create a free trial)",
      "2. Your Account SID is on the dashboard homepage (starts with AC)",
      '3. Your Auth Token is next to it — click "Show" to reveal',
      "",
      "For the phone number:",
      '  a. Go to Phone Numbers → Manage → Buy a number',
      "  b. Or use your existing Twilio number",
      "  c. Format must be E.164: +1XXXXXXXXXX",
    ],
    optional: true,
    confirmPrompt: "Set up SMS notifications (Twilio)?",
    fields: [
      {
        key: "TWILIO_ACCOUNT_SID",
        label: "Account SID",
        required: true,
        validatorKey: "TWILIO_ACCOUNT_SID",
      },
      {
        key: "TWILIO_AUTH_TOKEN",
        label: "Auth Token",
        required: true,
      },
      {
        key: "TWILIO_PHONE_NUMBER",
        label: "Phone number (E.164)",
        required: true,
        validatorKey: "TWILIO_PHONE_NUMBER",
      },
    ],
  },
  {
    id: "stripe",
    title: "Stripe",
    icon: "💳",
    description: "Stripe handles paid content purchases and subscriptions.",
    helpLines: [
      "How to get your Stripe secret key:",
      "1. Go to dashboard.stripe.com/apikeys",
      "2. Sign in or create an account",
      '3. For testing, make sure "Test mode" is toggled ON',
      '4. Copy the "Secret key" (starts with sk_test_ or sk_live_)',
    ],
    optional: true,
    confirmPrompt: "Set up Stripe payments?",
    fields: [
      {
        key: "STRIPE_SECRET_KEY",
        label: "Secret key",
        required: true,
        validatorKey: "STRIPE_SECRET_KEY",
      },
    ],
  },
  {
    id: "stripe-webhook",
    title: "Stripe Webhook",
    icon: "🔗",
    description: "The webhook secret verifies that payment events genuinely come from Stripe.",
    helpLines: [], // Populated dynamically based on dev/prod — see getWebhookHelpLines()
    optional: true,
    confirmPrompt: "Set up Stripe webhook secret now?",
    selectPrompt: "How would you like to handle the webhook?",
    selectOptions: [], // Populated dynamically — see getWebhookSelectOptions()
    fields: [
      {
        key: "STRIPE_WEBHOOK_SECRET",
        label: "Webhook secret",
        required: true,
        validatorKey: "STRIPE_WEBHOOK_SECRET",
      },
    ],
  },
  {
    id: "google",
    title: "Google Drive",
    icon: "📁",
    description: "Google Drive integration lets users import files directly from their Drive.",
    helpLines: [
      "How to set up Google Drive integration:",
      "1. Go to console.cloud.google.com",
      "2. Create a new project (or select existing)",
      "3. Enable the Google Drive API and Google Picker API",
      "4. Go to APIs & Services → Credentials",
      '5. Click "Create Credentials" → OAuth 2.0 Client ID',
      '6. Set application type to "Web application"',
      "7. Add your app URL to authorized JavaScript origins",
      "8. Copy the Client ID and Client Secret",
    ],
    optional: true,
    confirmPrompt: "Set up Google Drive integration?",
    fields: [
      {
        key: "GOOGLE_CLIENT_ID",
        label: "Client ID",
      },
      {
        key: "GOOGLE_CLIENT_SECRET",
        label: "Client Secret",
      },
    ],
  },
  {
    id: "dev",
    title: "Dev Settings",
    icon: "🔧",
    description: "Development-specific settings for local testing.",
    helpLines: [
      "Dev test email redirect:",
      "• All notification emails will be sent to this address",
      "  instead of the actual recipient during development",
      "• This prevents accidentally emailing real users while testing",
      "• Default: test@example.com",
    ],
    devOnly: true,
    fields: [
      {
        key: "DEV_TEST_EMAIL",
        label: "Dev test email redirect",
        defaultValue: "test@example.com",
      },
    ],
  },
];

/** Populate the stripe-webhook step with environment-aware help and options. */
function configureWebhookStep(isProd: boolean) {
  const step = STEPS.find((s) => s.id === "stripe-webhook")!;

  if (isProd) {
    step.helpLines = [
      "Webhook setup requires a deployed domain for the endpoint URL.",
      "",
      "If you haven't deployed yet:",
      '• Choose "Set up after deployment" below',
      "• The wizard will deploy your app first,",
      "  then circle back to configure the webhook",
      "",
      "If you already know your domain:",
      '• Choose "I have my webhook secret"',
      "",
      "To create the webhook in Stripe:",
      "1. Go to Developers → Webhooks",
      '2. Click "Add endpoint"',
      "3. Set URL to https://YOUR-DOMAIN/api/stripe/webhook",
      "4. Select events: checkout.session.completed,",
      "   checkout.session.expired, charge.refunded",
      '5. Copy the "Signing secret" (starts with whsec_)',
    ];
    step.selectOptions = [
      { label: "I have my webhook secret", value: "paste" },
      { label: "Set up after deployment (recommended for new projects)", value: "defer" },
    ];
  } else {
    step.helpLines = [
      "For local development, use the Stripe CLI to forward",
      "webhook events to your local server — no domain needed!",
      "",
      "Setup steps:",
      "1. Install the Stripe CLI:",
      "   brew install stripe/stripe-cli/stripe",
      "   (or download from stripe.com/docs/stripe-cli)",
      "",
      "2. Login to your Stripe account:",
      "   stripe login",
      "",
      "3. Forward events to your local server:",
      "   stripe listen --forward-to localhost:5173/api/stripe/webhook",
      "",
      "4. The CLI will print a webhook signing secret (whsec_...)",
      "   Paste that secret below",
      "",
      "Tip: Keep `stripe listen` running in a separate terminal",
      "alongside `npm run dev` while testing payments.",
    ];
    step.selectOptions = [
      { label: "I have my webhook secret from Stripe CLI", value: "paste" },
      { label: "I'll set this up later", value: "defer" },
    ];
  }
}

// ── Env writing ──────────────────────────────────────────────────────────────

function writeEnvFile(vars: Record<string, string>, isProd: boolean): string {
  const filename = isProd ? ".env.production.local" : ".env.local";
  const filepath = path.resolve(process.cwd(), filename);

  let existing: Record<string, string> = {};
  if (fs.existsSync(filepath)) {
    const content = fs.readFileSync(filepath, "utf-8");
    for (const line of content.split("\n")) {
      const match = line.match(/^([^#=]+)=(.*)$/);
      if (match) existing[match[1].trim()] = match[2].trim();
    }
  }

  const merged = { ...existing, ...vars };
  const lines = Object.entries(merged)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k}=${v}`);

  fs.writeFileSync(filepath, lines.join("\n") + "\n", "utf-8");
  return filepath;
}

// ── UI Components ────────────────────────────────────────────────────────────

function Header({ title, step, totalSteps }: { title: string; step: number; totalSteps: number }) {
  const progress = Math.round((step / totalSteps) * 100);
  const barWidth = 24;
  const filled = Math.round((step / totalSteps) * barWidth);
  const bar = "█".repeat(filled) + "░".repeat(barWidth - filled);

  return (
    <Box flexDirection="column" marginBottom={1}>
      <Box borderStyle="round" borderColor="cyan" paddingX={2} paddingY={0}>
        <Text bold color="cyan">{title}</Text>
      </Box>
      <Box marginTop={1} gap={1}>
        <Text dimColor>Step {step} of {totalSteps}</Text>
        <Text color="cyan">{bar}</Text>
        <Text dimColor>{progress}%</Text>
      </Box>
    </Box>
  );
}

function StepSidebar({
  steps,
  currentIndex,
  skipped,
}: {
  steps: StepDef[];
  currentIndex: number;
  skipped: Set<string>;
}) {
  return (
    <Box flexDirection="column" marginRight={2} width={20}>
      {steps.map((s, i) => {
        const isSkipped = skipped.has(s.id);
        const isDone = i < currentIndex && !isSkipped;
        const isCurrent = i === currentIndex;

        let marker = "  ";
        let color: string | undefined;
        if (isDone) { marker = "✓ "; color = "green"; }
        else if (isCurrent) { marker = "→ "; color = "cyan"; }
        else if (isSkipped) { marker = "- "; color = undefined; }

        return (
          <Text key={s.id} color={color} dimColor={isSkipped} bold={isCurrent}>
            {marker}{s.icon} {s.title}
          </Text>
        );
      })}
    </Box>
  );
}

function HelpPanel({ step }: { step: StepDef }) {
  return (
    <Box flexDirection="column" marginBottom={1} paddingX={1} borderStyle="single" borderColor="yellow">
      <Text bold color="yellow">ℹ How to get these credentials:</Text>
      <Text> </Text>
      {step.helpLines.map((line, i) => (
        <Text key={i} color={line.startsWith("How") || line.startsWith("For") ? "white" : "gray"}>
          {line || " "}
        </Text>
      ))}
    </Box>
  );
}

function ValidationError({ message }: { message: string }) {
  return (
    <Box marginTop={0}>
      <Text color="red">  ✗ {message}</Text>
    </Box>
  );
}

// ── Prompt Components ────────────────────────────────────────────────────────

function ConfirmPrompt({
  question,
  defaultYes,
  onResult,
}: {
  question: string;
  defaultYes?: boolean;
  onResult: (yes: boolean) => void;
}) {
  const hint = defaultYes !== false ? "Y/n" : "y/N";

  useInput((input, key) => {
    if (key.return) {
      onResult(defaultYes !== false);
    } else if (input.toLowerCase() === "y") {
      onResult(true);
    } else if (input.toLowerCase() === "n") {
      onResult(false);
    }
  });

  return (
    <Box>
      <Text bold>{question} </Text>
      <Text dimColor>[{hint}]</Text>
    </Box>
  );
}

function TextPrompt({
  label,
  required,
  validatorKey,
  defaultValue,
  onSubmit,
}: {
  label: string;
  required?: boolean;
  validatorKey?: string;
  defaultValue?: string;
  onSubmit: (value: string) => void;
}) {
  const [value, setValue] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = useCallback(
    (submitted: string) => {
      const final = submitted.trim() || defaultValue || "";

      if (!final && required) {
        setError("This field is required");
        return;
      }

      if (final && validatorKey && validators[validatorKey]) {
        const err = validators[validatorKey](final);
        if (err) {
          setError(err);
          return;
        }
      }

      setError(null);
      onSubmit(final);
    },
    [required, validatorKey, defaultValue, onSubmit],
  );

  return (
    <Box flexDirection="column">
      <Box>
        <Text bold>{label}</Text>
        {defaultValue && <Text dimColor> [{defaultValue}]</Text>}
        <Text>: </Text>
        <TextInput value={value} onChange={setValue} onSubmit={handleSubmit} />
      </Box>
      {error && <ValidationError message={error} />}
    </Box>
  );
}

function SelectPrompt({
  question,
  options,
  onSelect,
}: {
  question: string;
  options: { label: string; value: string }[];
  onSelect: (value: string) => void;
}) {
  return (
    <Box flexDirection="column">
      <Text bold>{question}</Text>
      <Box marginLeft={1}>
        <SelectInput
          items={options}
          onSelect={(item) => onSelect(item.value)}
        />
      </Box>
    </Box>
  );
}

function GeneratedSuccess({ onContinue }: { onContinue: () => void }) {
  useInput((_input, key) => {
    if (key.return) onContinue();
  });

  return (
    <Box flexDirection="column">
      <Box gap={1}>
        <Text color="green">✓</Text>
        <Text>Auth keys will be auto-generated via </Text>
        <Text bold color="cyan">npx @convex-dev/auth</Text>
      </Box>
      <Box marginTop={0}>
        <Text dimColor>  This runs after the wizard finishes and handles key generation + Convex setup.</Text>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>Press Enter to continue...</Text>
      </Box>
    </Box>
  );
}

// ── Post-wizard actions (runs after Ink unmounts) ────────────────────────────

async function postWizardActions(
  vars: Record<string, string>,
  isProd: boolean,
) {
  const readline = await import("readline/promises");
  const { stdin, stdout } = await import("process");
  const rl = readline.createInterface({ input: stdin, output: stdout });

  const ask = async (question: string): Promise<boolean> => {
    const answer = await rl.question(`  ${question} [Y/n]: `);
    if (!answer.trim()) return true;
    return answer.trim().toLowerCase().startsWith("y");
  };

  const choice = async (question: string, options: string[]): Promise<number> => {
    console.log(`\n  ${question}`);
    options.forEach((opt, i) => console.log(`    ${i + 1}. ${opt}`));
    const answer = await rl.question("  Choice: ");
    const idx = parseInt(answer.trim(), 10) - 1;
    if (idx >= 0 && idx < options.length) return idx;
    return 0;
  };

  // Strip internal flags before writing
  const autoGenAuth = vars._AUTO_GEN_AUTH === "true";
  const deferStripeWebhook = vars._DEFER_STRIPE_WEBHOOK === "true";
  const cleanVars = { ...vars };
  delete cleanVars._AUTO_GEN_AUTH;
  delete cleanVars._DEFER_STRIPE_WEBHOOK;

  // Write env file
  const filepath = writeEnvFile(cleanVars, isProd);
  console.log(`\n  \x1b[32m✓\x1b[0m Environment file written to: ${filepath}`);

  // Auto-generate auth keys via Convex CLI
  if (autoGenAuth) {
    console.log("\n  \x1b[36m🔐 Generating auth keys via npx @convex-dev/auth...\x1b[0m\n");
    try {
      execFileSync("npx", ["@convex-dev/auth", "--skip-git-check"], {
        stdio: "inherit",
        cwd: process.cwd(),
      });
      console.log("  \x1b[32m✓\x1b[0m Auth keys generated and configured!");
    } catch {
      console.log("  \x1b[33m!\x1b[0m Auth key generation failed. You can run it manually later:");
      console.log("    npx @convex-dev/auth");
    }
  }

  // Push to Convex
  if (await ask("Push variables to Convex?")) {
    console.log("  Pushing to Convex...");
    for (const [key, value] of Object.entries(cleanVars)) {
      if (!value || key.startsWith("VITE_")) continue;
      try {
        execFileSync("npx", ["convex", "env", "set", key, "--", value], {
          stdio: ["pipe", "inherit", "inherit"],
          cwd: process.cwd(),
        });
      } catch {
        console.log(`    \x1b[33m!\x1b[0m Could not set ${key} in Convex`);
      }
    }
    console.log("  \x1b[32m✓\x1b[0m Done pushing to Convex");
  }

  // Production deployment
  if (isProd) {
    const platformIdx = await choice("Deploy to which platform?", [
      "Vercel",
      "Netlify",
      "None (I'll deploy manually)",
    ]);

    if (platformIdx === 0) {
      console.log("\n  Pushing environment variables to Vercel...");
      for (const [key, value] of Object.entries(cleanVars)) {
        if (!value) continue;
        try {
          execFileSync("npx", ["vercel", "env", "add", key, "production"], {
            input: value,
            stdio: ["pipe", "inherit", "inherit"],
            cwd: process.cwd(),
          });
        } catch {
          console.log(`    \x1b[33m!\x1b[0m Could not set ${key} on Vercel (may already exist)`);
        }
      }
      if (await ask("Trigger Vercel production deployment now?")) {
        try {
          execFileSync("npx", ["vercel", "deploy", "--prod"], {
            stdio: "inherit",
            cwd: process.cwd(),
          });
          console.log("  \x1b[32m✓\x1b[0m Deployment triggered!");
        } catch {
          console.log("  \x1b[33m!\x1b[0m Deployment failed. You may need to deploy manually.");
        }
      }
    } else if (platformIdx === 1) {
      console.log("\n  Pushing environment variables to Netlify...");
      for (const [key, value] of Object.entries(cleanVars)) {
        if (!value) continue;
        try {
          execFileSync("npx", ["netlify", "env:set", key, value], {
            stdio: ["pipe", "inherit", "inherit"],
            cwd: process.cwd(),
          });
        } catch {
          console.log(`    \x1b[33m!\x1b[0m Could not set ${key} on Netlify`);
        }
      }
      if (await ask("Trigger Netlify production deployment now?")) {
        try {
          execFileSync("npx", ["netlify", "deploy", "--prod"], {
            stdio: "inherit",
            cwd: process.cwd(),
          });
          console.log("  \x1b[32m✓\x1b[0m Deployment triggered!");
        } catch {
          console.log("  \x1b[33m!\x1b[0m Deployment failed. You may need to deploy manually.");
        }
      }
    }
  }

  // Deferred Stripe webhook setup — after deployment, we can now get the domain
  if (deferStripeWebhook) {
    console.log("\n  \x1b[36m╔════════════════════════════════════════════════════════╗\x1b[0m");
    console.log("  \x1b[36m║\x1b[0m  \x1b[1m🔗 Stripe Webhook Setup\x1b[0m                              \x1b[36m║\x1b[0m");
    console.log("  \x1b[36m╚════════════════════════════════════════════════════════╝\x1b[0m\n");

    console.log("  Now that your app is deployed, set up the Stripe webhook:\n");
    console.log("  1. Go to \x1b[4mdashboard.stripe.com/webhooks\x1b[0m");
    console.log('  2. Click \x1b[1m"Add endpoint"\x1b[0m');
    console.log("  3. Set the endpoint URL to:");
    console.log("     \x1b[33mhttps://YOUR-DOMAIN/api/stripe/webhook\x1b[0m");
    console.log("  4. Select these events:");
    console.log("     • checkout.session.completed");
    console.log("     • checkout.session.expired");
    console.log("     • charge.refunded");
    console.log('  5. Click \x1b[1m"Add endpoint"\x1b[0m, then copy the \x1b[1mSigning secret\x1b[0m\n');

    const webhookSecret = await rl.question("  Paste your webhook secret (whsec_...) or press Enter to skip: ");
    const trimmed = webhookSecret.trim();

    if (trimmed) {
      const err = validators.STRIPE_WEBHOOK_SECRET(trimmed);
      if (err) {
        console.log(`    \x1b[33m!\x1b[0m ${err} — skipping for now`);
        console.log("    You can set STRIPE_WEBHOOK_SECRET manually later.\n");
      } else {
        cleanVars.STRIPE_WEBHOOK_SECRET = trimmed;

        // Update env file
        writeEnvFile({ STRIPE_WEBHOOK_SECRET: trimmed }, isProd);
        console.log("  \x1b[32m✓\x1b[0m Webhook secret saved to env file");

        // Push to Convex
        try {
          execFileSync("npx", ["convex", "env", "set", "STRIPE_WEBHOOK_SECRET", "--", trimmed], {
            stdio: ["pipe", "inherit", "inherit"],
            cwd: process.cwd(),
          });
          console.log("  \x1b[32m✓\x1b[0m Webhook secret pushed to Convex");
        } catch {
          console.log("    \x1b[33m!\x1b[0m Could not push to Convex — set STRIPE_WEBHOOK_SECRET manually");
        }
      }
    } else {
      console.log("\n  \x1b[33m⚠\x1b[0m  Stripe webhook secret was not set.");
      console.log("  Payments will work but webhooks won't be verified.");
      console.log("  Set \x1b[1mSTRIPE_WEBHOOK_SECRET\x1b[0m in your environment when ready.\n");
    }
  }

  // Done
  const line = "═".repeat(40);
  console.log(`\n  \x1b[36m╔${line}╗\x1b[0m`);
  console.log(`  \x1b[36m║\x1b[0m\x1b[1m        Setup Complete!               \x1b[0m\x1b[36m║\x1b[0m`);
  console.log(`  \x1b[36m╚${line}╝\x1b[0m\n`);

  console.log("  Next steps:");
  if (!isProd) {
    console.log("    1. Run \x1b[1mnpm run dev\x1b[0m to start the dev server");
    if (deferStripeWebhook) {
      console.log("    2. In another terminal, run:");
      console.log("       \x1b[1mstripe listen --forward-to localhost:5173/api/stripe/webhook\x1b[0m");
      console.log("       Then set the printed whsec_ secret as STRIPE_WEBHOOK_SECRET");
      console.log("    3. Visit the app to complete the in-app setup wizard");
    } else {
      console.log("    2. Visit the app to complete the in-app setup wizard");
    }
  } else {
    console.log("    1. Verify your deployment is live");
    console.log("    2. Visit the app to complete the in-app setup wizard");
  }
  console.log("");

  rl.close();
}

// ── Main Wizard Component ────────────────────────────────────────────────────

function SetupWizard() {
  const { exit } = useApp();

  // Environment selection
  const [isProd, setIsProd] = useState<boolean | null>(null);

  // Step navigation
  const [stepIndex, setStepIndex] = useState(0);
  const [phase, setPhase] = useState<"confirm" | "select" | "input" | "generated">("confirm");
  const [fieldIndex, setFieldIndex] = useState(0);
  const [skipped, setSkipped] = useState<Set<string>>(new Set());

  // Collected values
  const [vars, setVars] = useState<Record<string, string>>({});

  // Completion
  const [done, setDone] = useState(false);

  // Filter steps based on environment and dependencies
  const visibleSteps = STEPS.filter((s) => {
    if (s.prodOnly && !isProd) return false;
    if (s.devOnly && isProd) return false;
    // Hide webhook step if Stripe was skipped or not yet confirmed
    if (s.id === "stripe-webhook" && (skipped.has("stripe") || !vars.STRIPE_SECRET_KEY)) return false;
    return true;
  });

  const currentStep = visibleSteps[stepIndex];
  const totalSteps = visibleSteps.length;

  // Handle completion — unmount Ink and run post-wizard actions
  useEffect(() => {
    if (done) {
      // Small delay to let the final render flush
      const timer = setTimeout(() => {
        exit();
        setTimeout(() => {
          postWizardActions(vars, isProd!).catch((err) => {
            console.error("\n  Setup failed:", err);
            process.exit(1);
          });
        }, 100);
      }, 200);
      return () => clearTimeout(timer);
    }
  }, [done, vars, isProd, exit]);

  // ── Environment selection screen ──
  if (isProd === null) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box borderStyle="round" borderColor="cyan" paddingX={2}>
          <Text bold color="cyan">NMTSA Education Platform Setup</Text>
        </Box>
        <Box marginTop={1} marginBottom={1}>
          <Text>
            This wizard will help you configure environment variables
            for your development or production environment.
          </Text>
        </Box>
        <SelectPrompt
          question="Which environment?"
          options={[
            { label: "Development  (writes .env.local)", value: "dev" },
            { label: "Production   (writes .env.production.local)", value: "prod" },
          ]}
          onSelect={(value) => {
            const prod = value === "prod";
            configureWebhookStep(prod);
            setIsProd(prod);
          }}
        />
      </Box>
    );
  }

  // ── Done screen ──
  if (done) {
    return (
      <Box flexDirection="column" padding={1}>
        <Box gap={1}>
          <Text color="green"><Spinner type="dots" /></Text>
          <Text>Writing environment file and finishing up...</Text>
        </Box>
      </Box>
    );
  }

  // ── Wizard step screen ──
  if (!currentStep) {
    // All steps complete
    setDone(true);
    return null;
  }

  const advanceStep = () => {
    if (stepIndex + 1 >= visibleSteps.length) {
      // Set ENVIRONMENT variable
      setVars((prev) => ({
        ...prev,
        ENVIRONMENT: isProd ? "production" : "development",
      }));
      setDone(true);
    } else {
      setStepIndex(stepIndex + 1);
      setPhase("confirm");
      setFieldIndex(0);
    }
  };

  const handleConfirm = (yes: boolean) => {
    if (!yes) {
      setSkipped((prev) => new Set(prev).add(currentStep.id));
      advanceStep();
    } else if (currentStep.selectOptions) {
      setPhase("select");
    } else {
      setPhase("input");
      setFieldIndex(0);
    }
  };

  const handleSelectAction = (value: string) => {
    if (currentStep.id === "auth" && value === "generate") {
      // Flag for post-wizard phase to run `npx @convex-dev/auth`
      setVars((prev) => ({ ...prev, _AUTO_GEN_AUTH: "true" }));
      setPhase("generated");
    } else if (value === "defer") {
      // Defer to post-deployment — flag it and advance
      setVars((prev) => ({ ...prev, _DEFER_STRIPE_WEBHOOK: "true" }));
      advanceStep();
    } else {
      // Manual paste — go to input fields
      setPhase("input");
      setFieldIndex(0);
    }
  };

  const handleFieldSubmit = (value: string) => {
    const field = currentStep.fields[fieldIndex];
    if (value) {
      setVars((prev) => ({ ...prev, [field.key]: value }));
    }

    if (fieldIndex + 1 >= currentStep.fields.length) {
      advanceStep();
    } else {
      setFieldIndex(fieldIndex + 1);
    }
  };

  // Determine if we should show confirm or go straight to input
  const showConfirm = currentStep.optional && phase === "confirm";

  return (
    <Box flexDirection="column" padding={1}>
      <Header title="NMTSA Education Platform Setup" step={stepIndex + 1} totalSteps={totalSteps} />

      <Box>
        {/* Step sidebar */}
        <StepSidebar steps={visibleSteps} currentIndex={stepIndex} skipped={skipped} />

        {/* Main content area */}
        <Box flexDirection="column" flexGrow={1}>
          {/* Step title */}
          <Box marginBottom={1}>
            <Text bold color="cyan">
              {currentStep.icon} {currentStep.title}
            </Text>
          </Box>

          {/* Description */}
          <Box marginBottom={1}>
            <Text>{currentStep.description}</Text>
          </Box>

          {/* Help panel */}
          <HelpPanel step={currentStep} />

          {/* Prompt area */}
          <Box flexDirection="column" marginTop={1}>
            {showConfirm ? (
              <ConfirmPrompt
                question={currentStep.confirmPrompt!}
                defaultYes={currentStep.id !== "google"}
                onResult={handleConfirm}
              />
            ) : phase === "select" && currentStep.selectOptions ? (
              <SelectPrompt
                question={currentStep.selectPrompt!}
                options={currentStep.selectOptions}
                onSelect={handleSelectAction}
              />
            ) : phase === "generated" ? (
              <GeneratedSuccess onContinue={advanceStep} />
            ) : (
              <>
                {/* Show completed fields for this step */}
                {currentStep.fields.slice(0, fieldIndex).map((f) => (
                  <Box key={f.key}>
                    <Text dimColor>  ✓ {f.label}: </Text>
                    <Text color="green">{vars[f.key] || "(skipped)"}</Text>
                  </Box>
                ))}

                {/* Current field */}
                {fieldIndex < currentStep.fields.length && (
                  <TextPrompt
                    key={`${currentStep.id}-${fieldIndex}`}
                    label={currentStep.fields[fieldIndex].label}
                    required={currentStep.fields[fieldIndex].required}
                    validatorKey={currentStep.fields[fieldIndex].validatorKey}
                    defaultValue={currentStep.fields[fieldIndex].defaultValue}
                    onSubmit={handleFieldSubmit}
                  />
                )}
              </>
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
}

// ── Entry point ──────────────────────────────────────────────────────────────

if (!process.stdin.isTTY) {
  console.error(
    "\n  This setup wizard requires an interactive terminal.\n" +
    "  Please run it directly: npm run setup\n",
  );
  process.exit(1);
}

render(<SetupWizard />);
