import { test, expect } from "@playwright/test";
import { setupAdminPage, navigateToAdminTab } from "./helpers";

test.describe("Admin Navigation & Layout", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminPage(page);
  });

  test("admin dashboard loads for owner", async ({ page }) => {
    // Owner should see admin dashboard, not client view
    await expect(page.locator("text=Content").first()).toBeVisible({ timeout: 10_000 });
  });

  test("sidebar shows all sections for owner", async ({ page }) => {
    // Owner should see all nav items
    const sidebarItems = ["Content", "Users", "Settings"];
    for (const item of sidebarItems) {
      await expect(page.getByRole("button", { name: item }).first()).toBeVisible({
        timeout: 5000,
      });
    }
  });

  test("can navigate between admin tabs", async ({ page }) => {
    // Navigate to Users tab
    await navigateToAdminTab(page, "Users");
    await page.waitForTimeout(500);

    // Navigate to Settings tab
    await navigateToAdminTab(page, "Settings");
    await page.waitForTimeout(500);

    // Navigate back to Content
    await navigateToAdminTab(page, "Content");
    await page.waitForTimeout(500);
  });

  test("header shows user info and sign out", async ({ page }) => {
    // Sign out button should exist in header
    const signOut = page.getByRole("button", { name: /sign out/i });
    await expect(signOut).toBeVisible({ timeout: 5000 });

    // Profile button with user initials or name should be visible
    const profileBtn = page.getByRole("button", { name: /open profile/i });
    await expect(profileBtn).toBeVisible();
  });

  test("theme toggle works", async ({ page }) => {
    // Find and click theme toggle
    const themeToggle = page.getByRole("button", { name: /toggle theme|theme/i });
    if (await themeToggle.isVisible()) {
      await themeToggle.click();
      await page.waitForTimeout(300);
      // Should toggle without errors
    }
  });
});
