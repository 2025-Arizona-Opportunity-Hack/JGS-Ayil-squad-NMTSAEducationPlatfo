import { type Page, expect } from "@playwright/test";

// ── Test credentials ────────────────────────────────────────────────────────

export const TEST_USERS = {
  owner: {
    email: "pw-owner@test.nmtsa.local",
    password: "TestOwner123!",
    firstName: "Test",
    lastName: "Owner",
  },
} as const;

// ── Auth helpers ────────────────────────────────────────────────────────────

/**
 * Ensure the page is authenticated. If we land on the sign-in page,
 * sign in automatically. Call this in beforeEach for resilience.
 */
export async function ensureAuthenticated(page: Page) {
  await page.waitForTimeout(2000);

  const signInBtn = page.getByRole("button", { name: /^sign in$/i });
  const signInTab = page.getByRole("tab", { name: "Sign In" });
  const isSignIn = await signInBtn.isVisible().catch(() => false)
    || await signInTab.isVisible().catch(() => false);

  if (isSignIn) {
    if (await signInTab.isVisible().catch(() => false)) {
      await signInTab.click();
      await page.waitForTimeout(300);
    }
    await page.locator('#signin-email, input[name="email"]').first().fill(TEST_USERS.owner.email);
    await page.locator('#signin-password, input[name="password"]').first().fill(TEST_USERS.owner.password);
    await signInBtn.click();
    await page.waitForTimeout(5000);
  }
}

// ── Tour helpers ────────────────────────────────────────────────────────────

/**
 * Dismiss the onboarding tour if it's visible.
 */
export async function dismissTour(page: Page) {
  // Mark as completed in localStorage to prevent it from appearing
  await page.evaluate(() => localStorage.setItem("onboarding-tour-completed", "true"));

  // Also click close if it's already showing
  const closeTour = page.getByRole("button", { name: "Close tour" });
  if (await closeTour.isVisible().catch(() => false)) {
    await closeTour.click();
    await page.waitForTimeout(300);
  }
}

// ── App load helpers ────────────────────────────────────────────────────────

/**
 * Wait for the app to fully load (past loading spinners).
 */
export async function waitForAppLoad(page: Page) {
  await page.waitForFunction(
    () => {
      const spinners = document.querySelectorAll(".animate-spin");
      return spinners.length === 0;
    },
    { timeout: 30_000 },
  ).catch(() => {});
}

/**
 * Full page setup: wait for load, ensure auth, dismiss tour.
 * Use this in beforeEach for any test that needs the admin dashboard.
 */
export async function setupAdminPage(page: Page) {
  await page.goto("/");
  await waitForAppLoad(page);
  await ensureAuthenticated(page);
  await waitForAppLoad(page);
  await dismissTour(page);
  // Wait for sidebar to render
  await page.waitForTimeout(1000);
}

// ── Navigation helpers ──────────────────────────────────────────────────────

/**
 * Navigate to admin tab by clicking sidebar item.
 * Uses exact: true to avoid matching buttons like "Add Content".
 */
export async function navigateToAdminTab(page: Page, tabName: string) {
  // On mobile, open hamburger menu first
  const hamburger = page.getByRole("button", { name: "Open navigation menu" });
  if (await hamburger.isVisible().catch(() => false)) {
    await hamburger.click();
    await page.waitForTimeout(300);
  }

  // Use exact match to avoid "Content" matching "Add Content"
  await page.getByRole("button", { name: tabName, exact: true }).click();
  await page.waitForTimeout(1000);
}

// ── Content helpers ─────────────────────────────────────────────────────────

/**
 * Create a content item via the admin UI.
 */
export async function createContent(
  page: Page,
  options: {
    title: string;
    description?: string;
    attachmentType?: string;
    isPublic?: boolean;
  },
) {
  const createBtn = page.getByRole("button", { name: /add content/i });
  await createBtn.click();
  await page.waitForTimeout(500);
  await page.getByLabel("Title").fill(options.title);

  if (options.attachmentType) {
    await page.locator("select#attachmentType, [id='attachmentType']").selectOption(options.attachmentType);
  }

  if (options.isPublic) {
    const publicCheckbox = page.getByLabel(/public/i);
    if (await publicCheckbox.isVisible()) {
      await publicCheckbox.check();
    }
  }

  await page.getByRole("button", { name: /create|save|submit/i }).click();
  await page.waitForTimeout(1000);
}
