#!/usr/bin/env npx tsx

/**
 * Reset the dev Convex database for testing.
 * Clears all user data while preserving the deployment.
 *
 * Usage:
 *   npx tsx scripts/reset-dev-db.ts
 *   npm run test:reset
 */

import * as readline from "readline/promises";
import { stdin, stdout } from "process";
import { execFileSync } from "child_process";
import * as fs from "fs";

const TABLES_TO_CLEAR = [
  "userProfiles",
  "users",
  "authAccounts",
  "authSessions",
  "authRefreshTokens",
  "authVerificationCodes",
  "authVerifiers",
  "authRateLimits",
  "content",
  "contentAccess",
  "contentGroups",
  "contentGroupItems",
  "contentShares",
  "contentViews",
  "joinRequests",
  "inviteCodes",
  "clientInvites",
  "orders",
  "purchaseRequests",
  "contentPricing",
  "siteSettings",
  "setupLocks",
  "notificationSettings",
  "notificationLogs",
  "userGroups",
  "userGroupMembers",
  "recommendations",
];

async function main() {
  // Skip confirmation if --yes flag is passed (for CI/scripts)
  const skipConfirm = process.argv.includes("--yes");

  if (!skipConfirm) {
    const rl = readline.createInterface({ input: stdin, output: stdout });

    console.log("\n  \x1b[33m⚠  Dev Database Reset\x1b[0m\n");
    console.log("  This will clear ALL data from your \x1b[1mdev\x1b[0m Convex deployment.");
    console.log("  The setup wizard will run again on next app load.\n");
    console.log("  \x1b[2mTables to clear:\x1b[0m");
    console.log(`  ${TABLES_TO_CLEAR.join(", ")}\n`);

    const answer = await rl.question("  Are you sure? Type \x1b[1myes\x1b[0m to continue: ");
    rl.close();

    if (answer.trim().toLowerCase() !== "yes") {
      console.log("\n  Cancelled.\n");
      return;
    }
  }

  console.log("\n  Clearing tables...\n");

  let cleared = 0;
  let skipped = 0;

  for (const table of TABLES_TO_CLEAR) {
    const tmpFile = `/tmp/convex-clear-${table}.jsonl`;
    try {
      // Write empty JSONL file
      fs.writeFileSync(tmpFile, "");

      // Import empty file with --replace to clear the table
      execFileSync(
        "npx",
        ["convex", "import", "--table", table, "--replace", "--yes", tmpFile],
        { cwd: process.cwd(), stdio: "pipe" },
      );
      console.log(`  \x1b[32m✓\x1b[0m ${table}`);
      cleared++;
    } catch {
      // Table might not exist or be empty
      skipped++;
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }

  console.log(`\n  Done! Cleared ${cleared} tables, skipped ${skipped}.`);
  console.log("  Run \x1b[1mnpm run dev\x1b[0m and the setup wizard will appear.\n");
}

main().catch((err) => {
  console.error("  Reset failed:", err.message);
  process.exit(1);
});
