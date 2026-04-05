import { test, expect } from "@playwright/test";
import { setupAdminPage, navigateToAdminTab } from "./helpers";

test.describe("Site Settings & Debug Tools", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminPage(page);
  });

  test.describe("Site Settings", () => {
    test("settings page shows organization info", async ({ page }) => {
      await navigateToAdminTab(page, "Settings");
      await page.waitForTimeout(1000);

      // Should show organization name field
      const orgField = page.getByLabel(/organization name/i);
      if (await orgField.isVisible()) {
        const value = await orgField.inputValue();
        expect(value.length).toBeGreaterThan(0);
      }
    });

    test("notification settings are accessible", async ({ page }) => {
      await navigateToAdminTab(page, "Settings");
      await page.waitForTimeout(1000);

      // Look for notification settings section
      const notifSection = page.getByText(/notification/i).first();
      await expect(notifSection).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Debug Tools", () => {
    test("debug page shows config status section", async ({ page }) => {
      await navigateToAdminTab(page, "Debug");
      await page.waitForTimeout(1000);

      await expect(page.getByText("Configuration Status")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("Notification Logs", { exact: true })).toBeVisible({ timeout: 5000 });
    });

    test("can load debug configuration", async ({ page }) => {
      await navigateToAdminTab(page, "Debug");
      await page.waitForTimeout(1000);

      const loadBtn = page.getByRole("button", { name: /load configuration/i });
      if (await loadBtn.isVisible()) {
        await loadBtn.click();
        await page.waitForTimeout(3000);

        // Should show environment badge
        const envBadge = page.getByText(/PRODUCTION|TESTING|DEVELOPMENT/).first();
        await expect(envBadge).toBeVisible({ timeout: 5000 });

        // Should show email/SMS config sections
        await expect(page.getByText(/Resend/i).first()).toBeVisible();
        await expect(page.getByText(/Twilio/i).first()).toBeVisible();
      }
    });

    test("notification logs section renders", async ({ page }) => {
      await navigateToAdminTab(page, "Debug");
      await page.waitForTimeout(1000);

      // Scroll to bottom to find notification logs
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // Notification logs card title should be visible
      const logsTitle = page.getByText("Notification Logs", { exact: true }).first();
      await expect(logsTitle).toBeVisible({ timeout: 5000 });
    });

    test("notification log filters work", async ({ page }) => {
      await navigateToAdminTab(page, "Debug");
      await page.waitForTimeout(1000);

      // Scroll to notification logs
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(500);

      // Click Email filter
      await page.getByRole("button", { name: "Email", exact: true }).click();
      await page.waitForTimeout(500);

      // Click SMS filter
      await page.getByRole("button", { name: "SMS", exact: true }).click();
      await page.waitForTimeout(500);

      // Click All filter
      await page.getByRole("button", { name: "All", exact: true }).click();
      await page.waitForTimeout(500);
    });

    test("test email form is present", async ({ page }) => {
      await navigateToAdminTab(page, "Debug");
      await page.waitForTimeout(1000);

      await expect(page.getByText("Test Email (Resend)")).toBeVisible();
      await expect(page.getByLabel("Recipient Email")).toBeVisible();
      await expect(page.getByLabel("Subject")).toBeVisible();
    });

    test("test SMS form is present", async ({ page }) => {
      await navigateToAdminTab(page, "Debug");
      await page.waitForTimeout(1000);

      await expect(page.getByText("Test SMS (Twilio)")).toBeVisible();
      await expect(page.getByLabel("Phone Number")).toBeVisible();
    });
  });
});
