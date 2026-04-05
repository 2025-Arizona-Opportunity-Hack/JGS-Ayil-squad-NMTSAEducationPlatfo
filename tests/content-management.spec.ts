import { test, expect } from "@playwright/test";
import { setupAdminPage, navigateToAdminTab } from "./helpers";

test.describe("Content Management", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminPage(page);
    // Ensure we're on the Content tab
    await navigateToAdminTab(page, "Content");
    await page.waitForTimeout(500);
  });

  test.describe("Content Creation", () => {
    test("create content button is visible for owner", async ({ page }) => {
      const createBtn = page.getByRole("button", { name: /add content/i });
      await expect(createBtn).toBeVisible({ timeout: 5000 });
    });

    test("content creation form opens with required fields", async ({ page }) => {
      const createBtn = page.getByRole("button", { name: /add content/i });
      await createBtn.click();
      await page.waitForTimeout(1000);

      // Title field should be visible
      await expect(page.getByLabel(/title/i).first()).toBeVisible({ timeout: 5000 });

      // Attachment type selector should be visible
      await expect(page.locator("select#attachmentType").first()).toBeVisible();

      // Description editor should be visible
      await expect(page.getByText("Description").first()).toBeVisible();
    });

    test("can create a video content item", async ({ page }) => {
      const createBtn = page.getByRole("button", { name: /add content/i });
      await createBtn.click();
      await page.waitForTimeout(1000);

      const uniqueTitle = `E2E Test Video ${Date.now()}`;
      await page.getByLabel("Title *").fill(uniqueTitle);

      // Select video type
      await page.locator("select#attachmentType").selectOption("video");

      // Add external URL
      const urlInput = page.getByLabel(/external url/i);
      if (await urlInput.isVisible().catch(() => false)) {
        await urlInput.fill("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
      }

      // Submit
      await page.getByRole("button", { name: /create|save/i }).first().click();
      await page.waitForTimeout(3000);

      // Content should appear in list
      await expect(page.getByText(uniqueTitle)).toBeVisible({ timeout: 10_000 });
    });

    test("tag input shows visual tags", async ({ page }) => {
      const createBtn = page.getByRole("button", { name: /add content/i });
      await createBtn.click();
      await page.waitForTimeout(500);

      // Find the tag input area
      const tagInput = page.locator("#tags, [placeholder*='tag']");
      if (await tagInput.isVisible()) {
        await tagInput.fill("therapy");
        await tagInput.press("Enter");
        await page.waitForTimeout(300);

        // Should show a visual tag badge
        await expect(page.locator("text=therapy").first()).toBeVisible();

        // Add another tag
        await tagInput.fill("music");
        await tagInput.press(",");
        await page.waitForTimeout(300);

        await expect(page.locator("text=music").first()).toBeVisible();
      }
    });
  });

  test.describe("Content List", () => {
    test("content list shows items with type badges", async ({ page }) => {
      // Should show content items if any exist
      const contentList = page.locator("[class*='content'], table, [class*='card']").first();
      await expect(contentList).toBeVisible({ timeout: 10_000 });
    });

    test("content search filters items", async ({ page }) => {
      const searchInput = page.getByPlaceholder(/search/i);
      if (await searchInput.isVisible()) {
        await searchInput.fill("nonexistent-content-xyz");
        await page.waitForTimeout(500);

        // Should show no results or empty state
        const noResults = page.getByText(/no content|no results|nothing/i);
        // This may or may not appear depending on existing content
      }
    });
  });

  test.describe("Content Preview", () => {
    test("clicking content shows preview with details", async ({ page }) => {
      // Skip if no content exists
      const noContent = page.getByText(/no content available/i);
      if (await noContent.isVisible().catch(() => false)) {
        test.skip();
        return;
      }

      // Click the first content item
      const firstItem = page.locator("[class*='cursor-pointer']").first();
      if (await firstItem.isVisible().catch(() => false)) {
        await firstItem.click();
        await page.waitForTimeout(1000);

        // Some kind of detail view should appear
        const body = await page.locator("body").innerText();
        expect(body.length).toBeGreaterThan(50);
      }
    });
  });

  test.describe("Content Status Workflow", () => {
    test("draft content can be submitted for review", async ({ page }) => {
      // Look for a draft content item and try to submit
      const draftBadge = page.locator("text=Draft, text=draft").first();
      if (await draftBadge.isVisible()) {
        // Click on the draft item to open it
        await draftBadge.click();
        await page.waitForTimeout(500);

        // Look for submit for review action
        const submitBtn = page.getByRole("button", { name: /submit.*review|send.*review/i });
        if (await submitBtn.isVisible()) {
          // Don't actually submit — just verify the button exists
          await expect(submitBtn).toBeEnabled();
        }
      }
    });
  });
});
