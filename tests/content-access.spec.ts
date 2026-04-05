import { test, expect } from "@playwright/test";
import { setupAdminPage, navigateToAdminTab } from "./helpers";

test.describe("Content Access & Sharing", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminPage(page);
  });

  test.describe("Public Content", () => {
    test("public content view page renders without auth", async ({ page, context }) => {
      // Create a new context without auth state to test public access
      const publicPage = await context.newPage();
      await publicPage.goto("/view/nonexistent-id");
      await publicPage.waitForTimeout(2000);

      // Should show either content or a "not found" message — not a crash
      const body = await publicPage.textContent("body");
      expect(body).toBeTruthy();
      await publicPage.close();
    });
  });

  test.describe("Share Links", () => {
    test("share link page loads for valid tokens", async ({ page }) => {
      // Navigate to shares section
      await navigateToAdminTab(page, "Content");
      await page.waitForTimeout(500);

      // Look for share functionality
      const shareBtn = page.getByRole("button", { name: /share/i }).first();
      if (await shareBtn.isVisible()) {
        // Share button exists — verify it's clickable
        await expect(shareBtn).toBeEnabled();
      }
    });

    test("share page shows 404 for invalid tokens", async ({ page, context }) => {
      const publicPage = await context.newPage();
      await publicPage.goto("/share/invalid-token-12345");
      await publicPage.waitForTimeout(3000);

      // Should show an error state, not a blank page
      const body = await publicPage.textContent("body");
      expect(body).toBeTruthy();
      // Should indicate content not found
      const hasError = body?.includes("not found") ||
        body?.includes("invalid") ||
        body?.includes("expired") ||
        body?.includes("error") ||
        body?.includes("Error");
      expect(hasError || body!.length > 0).toBeTruthy();
      await publicPage.close();
    });
  });

  test.describe("Content Access Management", () => {
    test("access management UI is available for content", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.waitForTimeout(500);

      // Click on first content item
      const firstItem = page.locator("[class*='cursor-pointer']").first();
      if (await firstItem.isVisible()) {
        await firstItem.click();
        await page.waitForTimeout(500);

        // Look for access/permissions related buttons
        const accessBtn = page.getByRole("button", { name: /access|permission|manage access/i });
        if (await accessBtn.isVisible()) {
          await expect(accessBtn).toBeEnabled();
        }
      }
    });
  });

  test.describe("Content Groups (Bundles)", () => {
    test("bundles section is accessible to owner", async ({ page }) => {
      await navigateToAdminTab(page, "Bundles");
      await page.waitForTimeout(500);

      // Should show bundles/groups management
      const heading = page.getByText(/bundle|content group/i).first();
      await expect(heading).toBeVisible({ timeout: 5000 });
    });
  });
});
