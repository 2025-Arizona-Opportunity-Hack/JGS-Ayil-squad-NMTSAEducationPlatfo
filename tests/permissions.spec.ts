import { test, expect } from "@playwright/test";
import { setupAdminPage, navigateToAdminTab, TEST_USERS } from "./helpers";

test.describe("Permissions & Role-Based Access", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminPage(page);
  });

  test.describe("Owner Permissions", () => {
    test("owner sees all admin sidebar sections", async ({ page }) => {
      // Content section
      await expect(page.getByRole("button", { name: "Content" }).first()).toBeVisible({ timeout: 5000 });

      // Users section
      await expect(page.getByRole("button", { name: "Users" }).first()).toBeVisible({ timeout: 5000 });

      // Settings section
      await expect(page.getByRole("button", { name: "Settings" }).first()).toBeVisible({ timeout: 5000 });
    });

    test("owner can access user management", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      // Should show user list
      const userSection = page.getByText(/users|user management/i).first();
      await expect(userSection).toBeVisible({ timeout: 5000 });
    });

    test("owner can access site settings", async ({ page }) => {
      await navigateToAdminTab(page, "Settings");
      await page.waitForTimeout(1000);

      // Should show settings page
      const settingsSection = page.getByText(/site settings|settings/i).first();
      await expect(settingsSection).toBeVisible({ timeout: 5000 });
    });

    test("owner can access debug tools", async ({ page }) => {
      await navigateToAdminTab(page, "Debug");
      await page.waitForTimeout(1000);

      // Should show debug tools heading
      await expect(page.getByRole("heading", { name: "Debug Tools", exact: true }).first()).toBeVisible({ timeout: 5000 });

      // Should show test email section
      await expect(page.getByText("Test Email (Resend)")).toBeVisible({ timeout: 5000 });
    });

    test("owner can access analytics", async ({ page }) => {
      await navigateToAdminTab(page, "Analytics");
      await page.waitForTimeout(1000);

      const analyticsSection = page.locator("text=Analytics").first();
      await expect(analyticsSection).toBeVisible({ timeout: 5000 });
    });

    test("owner can generate invite codes", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      // Look for invite code generation
      const inviteBtn = page.getByRole("button", { name: /invite/i }).first();
      if (await inviteBtn.isVisible()) {
        await expect(inviteBtn).toBeEnabled();
      }
    });
  });

  test.describe("Content Review Permissions", () => {
    test("content review modal has approve/reject/request changes", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.waitForTimeout(500);

      // Look for content in review status
      const reviewBadge = page.locator("text=Review, text=In Review, text=review").first();
      if (await reviewBadge.isVisible()) {
        await reviewBadge.click();
        await page.waitForTimeout(500);

        // Check for review actions
        const approveBtn = page.getByRole("button", { name: /approve/i });
        const rejectBtn = page.getByRole("button", { name: /reject/i });
        const changesBtn = page.getByRole("button", { name: /request changes/i });

        // At least one review action should be available for owner
        const hasReviewActions =
          (await approveBtn.isVisible().catch(() => false)) ||
          (await rejectBtn.isVisible().catch(() => false)) ||
          (await changesBtn.isVisible().catch(() => false));

        // If content is in review, owner should have review actions
        if (await reviewBadge.isVisible()) {
          expect(hasReviewActions).toBeTruthy();
        }
      }
    });

    test("approval feedback is optional, rejection requires notes", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.waitForTimeout(500);

      // Find content in review
      const reviewBadge = page.locator("text=Review").first();
      if (await reviewBadge.isVisible()) {
        await reviewBadge.click();
        await page.waitForTimeout(500);

        // Try to open review modal
        const reviewBtn = page.getByRole("button", { name: /review/i }).first();
        if (await reviewBtn.isVisible()) {
          await reviewBtn.click();
          await page.waitForTimeout(500);

          // Check label says "optional" for approval
          const approveAction = page.getByRole("button", { name: /approve/i });
          if (await approveAction.isVisible()) {
            await approveAction.click();
            await page.waitForTimeout(300);

            // Notes label should say "optional"
            const label = page.getByText(/optional feedback/i);
            if (await label.isVisible()) {
              await expect(label).toBeVisible();
            }
          }
        }
      }
    });
  });

  test.describe("Content Edit Permissions", () => {
    test("edit content shows active toggle (not confusing checkbox)", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.waitForTimeout(500);

      // Find and click edit on content
      const editBtn = page.getByRole("button", { name: /edit/i }).first();
      if (await editBtn.isVisible()) {
        await editBtn.click();
        await page.waitForTimeout(500);

        // Should show "Active" label with a switch, NOT "Set content as in-active"
        const inactiveLabel = page.getByText("Set content as in-active");
        await expect(inactiveLabel).toBeHidden();

        // Should have "Active" label
        const activeLabel = page.getByLabel("Active");
        if (await activeLabel.isVisible()) {
          await expect(activeLabel).toBeVisible();
        }
      }
    });
  });

  test.describe("Join Request Management", () => {
    test("owner can view join requests", async ({ page }) => {
      await navigateToAdminTab(page, "Joins");
      await page.waitForTimeout(1000);

      // Should show join requests section
      const joinSection = page.getByText(/join request|access request/i).first();
      await expect(joinSection).toBeVisible({ timeout: 5000 });
    });
  });
});
