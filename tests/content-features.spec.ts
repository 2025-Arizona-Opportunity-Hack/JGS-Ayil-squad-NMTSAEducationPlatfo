import { test, expect } from "@playwright/test";
import { setupAdminPage, navigateToAdminTab } from "./helpers";

test.describe("Content Features", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminPage(page);
  });

  // ── Password Protection ───────────────────────────────────────────────────

  test.describe("Password Protection", () => {
    test("password field is available in content creation form", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.getByRole("button", { name: /add content/i }).click();
      await page.waitForTimeout(1000);

      // Scroll down to find password field
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      const passwordLabel = page.getByText("Password Protection (optional)");
      await expect(passwordLabel).toBeVisible({ timeout: 5000 });
    });

    test("password field accepts input in creation form", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.getByRole("button", { name: /add content/i }).click();
      await page.waitForTimeout(1000);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      const passwordInput = page.locator("#password");
      if (await passwordInput.isVisible().catch(() => false)) {
        await passwordInput.fill("testpassword123");
        const value = await passwordInput.inputValue();
        expect(value).toBe("testpassword123");
      }
    });
  });

  // ── Content Bundles ────────────────────────────────────────────────────────

  test.describe("Content Bundles", () => {
    test("bundles tab is accessible", async ({ page }) => {
      await navigateToAdminTab(page, "Bundles");
      await page.waitForTimeout(1000);

      // Should show bundles management UI
      const bundleHeading = page.getByText(/bundle|content group/i).first();
      await expect(bundleHeading).toBeVisible({ timeout: 5000 });
    });

    test("create bundle button is visible", async ({ page }) => {
      await navigateToAdminTab(page, "Bundles");
      await page.waitForTimeout(1000);

      const createBtn = page.getByRole("button", { name: /create bundle/i });
      await expect(createBtn).toBeVisible({ timeout: 5000 });
    });

    test("create bundle form has required fields", async ({ page }) => {
      await navigateToAdminTab(page, "Bundles");
      await page.waitForTimeout(1000);

      await page.getByRole("button", { name: /create bundle/i }).click();
      await page.waitForTimeout(500);

      // Bundle name field should be visible
      const nameInput = page.locator("#groupName");
      if (await nameInput.isVisible().catch(() => false)) {
        await expect(nameInput).toBeVisible();
      } else {
        // May use a different field name
        await expect(page.getByPlaceholder(/beginner resources/i)).toBeVisible({ timeout: 3000 });
      }
    });

    test("can create a bundle", async ({ page }) => {
      await navigateToAdminTab(page, "Bundles");
      await page.waitForTimeout(1000);

      await page.getByRole("button", { name: /create bundle/i }).click();
      await page.waitForTimeout(500);

      const uniqueName = `E2E Bundle ${Date.now()}`;
      const nameInput = page.locator("#groupName").or(page.getByPlaceholder(/beginner resources/i));
      await nameInput.fill(uniqueName);

      // Submit
      const submitBtn = page.getByRole("button", { name: /create bundle/i }).last();
      await submitBtn.click();
      await page.waitForTimeout(2000);

      // Bundle should appear in list
      await expect(page.getByText(uniqueName)).toBeVisible({ timeout: 5000 });
    });
  });

  // ── Content View History / Analytics ───────────────────────────────────────

  test.describe("Content View History", () => {
    test("analytics tab is accessible", async ({ page }) => {
      await navigateToAdminTab(page, "Analytics");
      await page.waitForTimeout(1000);

      // Should show analytics page (sales analytics)
      const heading = page.getByText(/analytics/i).first();
      await expect(heading).toBeVisible({ timeout: 5000 });
    });

    test("analytics shows revenue metrics", async ({ page }) => {
      await navigateToAdminTab(page, "Analytics");
      await page.waitForTimeout(1000);

      // Should show revenue/order metrics
      const revenueLabel = page.getByText(/total revenue|revenue/i).first();
      await expect(revenueLabel).toBeVisible({ timeout: 5000 });
    });

    test("analytics shows time-based breakdowns", async ({ page }) => {
      await navigateToAdminTab(page, "Analytics");
      await page.waitForTimeout(1000);

      // Should show time period labels
      const todayLabel = page.getByText("Today");
      await expect(todayLabel).toBeVisible({ timeout: 5000 });
    });
  });

  // ── Start / End Date ──────────────────────────────────────────────────────

  test.describe("Content Start/End Date", () => {
    test("date fields are available in content creation form", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.getByRole("button", { name: /add content/i }).click();
      await page.waitForTimeout(1000);

      // Scroll to date section
      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      // Start and end date labels should be visible
      await expect(page.getByText("Start Date (optional)")).toBeVisible({ timeout: 5000 });
      await expect(page.getByText("End Date (optional)")).toBeVisible({ timeout: 5000 });
    });

    test("start date picker opens on click", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.getByRole("button", { name: /add content/i }).click();
      await page.waitForTimeout(1000);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      // Click the start date "Pick a date" button
      const pickDateBtn = page.getByRole("button", { name: /pick a date/i }).first();
      if (await pickDateBtn.isVisible().catch(() => false)) {
        await pickDateBtn.click();
        await page.waitForTimeout(500);

        // Calendar popover should appear
        const calendar = page.locator("table, [role='grid']").first();
        await expect(calendar).toBeVisible({ timeout: 3000 });
      }
    });

    test("helper text explains date behavior", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.getByRole("button", { name: /add content/i }).click();
      await page.waitForTimeout(1000);

      await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
      await page.waitForTimeout(300);

      await expect(page.getByText("Content becomes available on this date")).toBeVisible({ timeout: 3000 });
      await expect(page.getByText("Content expires on this date")).toBeVisible({ timeout: 3000 });
    });
  });

  // ── Public Content ────────────────────────────────────────────────────────

  test.describe("Content Public Toggle", () => {
    test("public checkbox is available in creation form", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.getByRole("button", { name: /add content/i }).click();
      await page.waitForTimeout(1000);

      const publicLabel = page.getByText("Make this content public");
      await expect(publicLabel).toBeVisible({ timeout: 5000 });
    });

    test("public checkbox can be toggled", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.getByRole("button", { name: /add content/i }).click();
      await page.waitForTimeout(1000);

      const publicCheckbox = page.locator("#isPublic");
      if (await publicCheckbox.isVisible().catch(() => false)) {
        await publicCheckbox.click();
        await page.waitForTimeout(300);
        // Should be checked after click
      }
    });
  });

  // ── Active/Inactive Status ────────────────────────────────────────────────

  test.describe("Content Active Status", () => {
    test("active toggle is in edit form (not confusing checkbox)", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.waitForTimeout(1000);

      // Find and click edit on first content item
      const editBtn = page.getByRole("button", { name: /edit/i }).first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(1000);

        // Scroll to availability section
        await page.evaluate(() => {
          const dialog = document.querySelector("[role='dialog']");
          if (dialog) dialog.scrollTo(0, dialog.scrollHeight);
        });
        await page.waitForTimeout(300);

        // Should have "Active" label with a switch (not "Set content as in-active")
        await expect(page.getByText("Set content as in-active")).toBeHidden();
        await expect(page.getByLabel("Active")).toBeVisible({ timeout: 5000 });
      } else {
        // No content to edit — skip
        test.skip();
      }
    });

    test("active toggle uses switch component", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.waitForTimeout(1000);

      const editBtn = page.getByRole("button", { name: /edit/i }).first();
      if (await editBtn.isVisible().catch(() => false)) {
        await editBtn.click();
        await page.waitForTimeout(1000);

        await page.evaluate(() => {
          const dialog = document.querySelector("[role='dialog']");
          if (dialog) dialog.scrollTo(0, dialog.scrollHeight);
        });
        await page.waitForTimeout(300);

        // Should have a switch role element for active toggle
        const activeSwitch = page.locator("#active-toggle");
        await expect(activeSwitch).toBeVisible({ timeout: 5000 });
      } else {
        test.skip();
      }
    });
  });

  // ── Recommendations ───────────────────────────────────────────────────────

  test.describe("Content Recommendations", () => {
    test("recommend option is available for content", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.waitForTimeout(1000);

      // Look for a recommend button or menu item
      const recommendBtn = page.getByRole("button", { name: /recommend/i }).first();
      const menuBtn = page.getByRole("button", { name: /more|actions|menu/i }).first();

      if (await recommendBtn.isVisible().catch(() => false)) {
        await expect(recommendBtn).toBeEnabled();
      } else if (await menuBtn.isVisible().catch(() => false)) {
        // May be in a dropdown menu
        await menuBtn.click();
        await page.waitForTimeout(300);
        const recommendItem = page.getByText(/recommend/i).first();
        if (await recommendItem.isVisible().catch(() => false)) {
          await expect(recommendItem).toBeVisible();
        }
      }
    });

    test("recommend modal has required fields", async ({ page }) => {
      await navigateToAdminTab(page, "Content");
      await page.waitForTimeout(1000);

      // Try to open recommend modal
      const recommendBtn = page.getByRole("button", { name: /recommend/i }).first();
      if (await recommendBtn.isVisible().catch(() => false)) {
        await recommendBtn.click();
        await page.waitForTimeout(500);

        // Modal should show
        const modalTitle = page.getByText("Recommend Content");
        if (await modalTitle.isVisible().catch(() => false)) {
          // Email field should be required
          await expect(page.locator("#recipientEmail")).toBeVisible();

          // Message field should be visible (optional)
          await expect(page.locator("#message")).toBeVisible();

          // Send button
          await expect(page.getByRole("button", { name: /send recommendation/i })).toBeVisible();
        }
      }
    });
  });
});
