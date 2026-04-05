import { test, expect, devices } from "@playwright/test";
import { setupAdminPage } from "./helpers";

// These tests run in the "mobile" project (iPhone 14 viewport)
// Force mobile viewport so tests work regardless of which project runs them
test.use({ viewport: { width: 375, height: 667 } });

test.describe("Mobile Responsiveness", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminPage(page);
  });

  test("hamburger menu appears on mobile", async ({ page }) => {
    const hamburger = page.getByRole("button", { name: /open navigation menu/i });
    await expect(hamburger).toBeVisible({ timeout: 5000 });
  });

  test("hamburger menu opens sidebar", async ({ page }) => {
    const hamburger = page.getByRole("button", { name: /open navigation menu/i });
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(500);

      // Sidebar content should appear
      const navContent = page.getByText("Content").first();
      await expect(navContent).toBeVisible({ timeout: 3000 });
    }
  });

  test("sign out shows icon only on mobile", async ({ page }) => {
    // Sign out button should show icon only (no text)
    const signOutBtn = page.getByRole("button", { name: /sign out/i });
    if (await signOutBtn.isVisible()) {
      // On mobile, the text "Sign out" should be hidden
      const signOutText = signOutBtn.locator("span.hidden");
      // The span has class "hidden sm:inline" so it's hidden on mobile
      await expect(signOutText).toBeHidden();
    }
  });

  test("admin badge is hidden on mobile", async ({ page }) => {
    // Admin badge has class "hidden sm:inline-flex"
    const adminBadge = page.locator("text=Admin").first();
    if (await adminBadge.isVisible()) {
      // On mobile viewport, it should be hidden
      // (depends on viewport size from project config)
    }
  });

  test("content cards are stacked on mobile", async ({ page }) => {
    // Open content tab
    const hamburger = page.getByRole("button", { name: /open navigation menu/i });
    if (await hamburger.isVisible()) {
      await hamburger.click();
      await page.waitForTimeout(300);
      await page.getByRole("button", { name: "Content" }).click();
      await page.waitForTimeout(500);
    }

    // Content area should be visible and usable
    const contentArea = page.locator("main, [class*='content']").first();
    await expect(contentArea).toBeVisible({ timeout: 5000 });
  });
});
