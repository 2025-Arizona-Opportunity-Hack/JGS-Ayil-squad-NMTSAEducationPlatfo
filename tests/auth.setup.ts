import { test as setup, expect } from "@playwright/test";
import * as fs from "fs";
import { TEST_USERS, waitForAppLoad } from "./helpers";

const AUTH_FILE = "tests/.auth/owner.json";

setup.setTimeout(120_000);
setup("authenticate as owner", async ({ page }) => {
  // Delete stale auth file
  try { fs.unlinkSync(AUTH_FILE); } catch {}

  // Navigate with clean state
  await page.goto("/");
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.context().clearCookies();
  await page.goto("/");

  // Wait for page to fully load — poll until we see meaningful UI
  console.log("[setup] Waiting for app to load...");
  let state: "wizard" | "signin" | "dashboard" | "unknown" = "unknown";

  for (let i = 0; i < 30; i++) {
    await page.waitForTimeout(2000);

    // Check for wizard
    if (await page.getByRole("button", { name: "Create Owner Account" }).isVisible().catch(() => false)) {
      state = "wizard";
      break;
    }
    // Check for sign-in (button or tab)
    if (await page.getByText("Forgot password?").isVisible().catch(() => false)) {
      state = "signin";
      break;
    }
    if (await page.getByRole("tab", { name: "Sign In" }).isVisible().catch(() => false)) {
      state = "signin";
      break;
    }
    // Check for dashboard
    if (await page.getByRole("button", { name: "Content", exact: true }).isVisible().catch(() => false)) {
      state = "dashboard";
      break;
    }

    console.log(`[setup] Waiting... (${i + 1}/30)`);
  }

  console.log(`[setup] Detected state: ${state}`);

  if (state === "wizard") {
    await runSetupWizard(page);
  } else if (state === "signin") {
    await signInAsOwner(page);
  } else if (state === "dashboard") {
    console.log("[setup] Already on dashboard");
  } else {
    await page.screenshot({ path: "tests/.auth/debug-screenshot.png" });
    throw new Error("[setup] Could not detect app state. Check tests/.auth/debug-screenshot.png");
  }

  // Dismiss tour and save
  await page.evaluate(() => localStorage.setItem("onboarding-tour-completed", "true"));
  const closeTour = page.getByRole("button", { name: "Close tour" });
  if (await closeTour.isVisible().catch(() => false)) {
    await closeTour.click();
    await page.waitForTimeout(300);
  }

  await page.context().storageState({ path: AUTH_FILE });
});

async function runSetupWizard(page: import("@playwright/test").Page) {
  await page.getByLabel("Email").fill(TEST_USERS.owner.email);
  await page.getByLabel("Password").fill(TEST_USERS.owner.password);
  await page.getByRole("button", { name: "Create Owner Account" }).click();
  console.log("[setup] Step 1/4: Creating account...");

  await expect(page.getByLabel("First Name *")).toBeVisible({ timeout: 30_000 });
  await page.getByLabel("First Name *").fill(TEST_USERS.owner.firstName);
  await page.getByLabel("Last Name *").fill(TEST_USERS.owner.lastName);
  await page.getByRole("button", { name: "Continue" }).click();
  console.log("[setup] Step 2/4: Profile done");

  await expect(page.getByLabel("Organization Name *")).toBeVisible({ timeout: 15_000 });
  await page.getByLabel("Organization Name *").fill("NMTSA Test Org");
  await page.getByRole("button", { name: "Complete Setup" }).click();
  console.log("[setup] Step 3/4: Organization done");

  // Wait for "You're all set!" or dashboard to appear
  const allSet = page.getByText("You're all set!");
  const dashboard = page.getByRole("button", { name: "Content", exact: true });
  const closeTour = page.getByRole("button", { name: "Close tour" });

  for (let i = 0; i < 15; i++) {
    await page.waitForTimeout(2000);
    if (await allSet.isVisible().catch(() => false)) break;
    if (await dashboard.isVisible().catch(() => false)) break;
    if (await closeTour.isVisible().catch(() => false)) break;
  }
  console.log("[setup] Step 4/4: Complete");

  await page.waitForTimeout(3000);
  await page.goto("/");
  await page.waitForTimeout(3000);
  await waitForAppLoad(page);
  console.log("[setup] Wizard finished");
}

async function signInAsOwner(page: import("@playwright/test").Page) {
  const tab = page.getByRole("tab", { name: "Sign In" });
  if (await tab.isVisible().catch(() => false)) {
    await tab.click();
    await page.waitForTimeout(300);
  }

  await page.locator('#signin-email, input[name="email"]').first().fill(TEST_USERS.owner.email);
  await page.locator('#signin-password, input[name="password"]').first().fill(TEST_USERS.owner.password);
  await page.getByRole("button", { name: "Sign In" }).click();

  await page.waitForTimeout(5000);
  await waitForAppLoad(page);

  // Handle incomplete setup
  if (await page.getByLabel("First Name *").isVisible().catch(() => false)) {
    console.log("[setup] Completing setup wizard...");
    await page.getByLabel("First Name *").fill(TEST_USERS.owner.firstName);
    await page.getByLabel("Last Name *").fill(TEST_USERS.owner.lastName);
    await page.getByRole("button", { name: "Continue" }).click();
    await page.waitForTimeout(1000);

    if (await page.getByLabel("Organization Name *").isVisible().catch(() => false)) {
      await page.getByLabel("Organization Name *").fill("NMTSA Test Org");
      await page.getByRole("button", { name: "Complete Setup" }).click();
    }
    await page.waitForTimeout(5000);
    await page.goto("/");
    await waitForAppLoad(page);
  }

  if (await page.locator('#signin-email').isVisible().catch(() => false)) {
    throw new Error(`[setup] Sign-in failed for ${TEST_USERS.owner.email}. Run "npm run test:reset" first.`);
  }
  console.log("[setup] Signed in");
}
