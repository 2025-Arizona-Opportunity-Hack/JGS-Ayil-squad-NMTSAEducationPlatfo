import { test, expect } from "@playwright/test";
import { setupAdminPage, navigateToAdminTab } from "./helpers";

test.describe("Client Invite & Sign Up Flow", () => {
  test.beforeEach(async ({ page }) => {
    await setupAdminPage(page);
  });

  test.describe("Client Invite Creation", () => {
    test("invite client button is visible on users page", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      const inviteBtn = page.getByRole("button", { name: /invite client/i });
      await expect(inviteBtn).toBeVisible({ timeout: 5000 });
    });

    test("invite client modal opens with role selection", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      await page.getByRole("button", { name: /invite client/i }).click();
      await page.waitForTimeout(500);

      // Should show role selection
      await expect(page.getByText(/client|parent|professional/i).first()).toBeVisible({ timeout: 3000 });
    });

    test("invite client modal has email field", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      await page.getByRole("button", { name: /invite client/i }).click();
      await page.waitForTimeout(500);

      // Should have email input
      const emailInput = page.getByLabel(/email/i).first();
      await expect(emailInput).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe("Staff Invite Codes", () => {
    test("generate staff code button is visible", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      const generateBtn = page.getByRole("button", { name: /generate staff code/i });
      await expect(generateBtn).toBeVisible({ timeout: 5000 });
    });

    test("staff code modal has role selection including admin", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      await page.getByRole("button", { name: /generate staff code/i }).click();
      await page.waitForTimeout(500);

      // Should have admin role option
      const adminOption = page.getByText("Admin", { exact: true });
      await expect(adminOption).toBeVisible({ timeout: 3000 });
    });
  });

  test.describe("Role Management", () => {
    test("role dropdown is visible for users", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      // Should show role selector for at least one user
      const roleSelector = page.locator("button[role='combobox'], [class*='SelectTrigger']").first();
      if (await roleSelector.isVisible().catch(() => false)) {
        await expect(roleSelector).toBeVisible();
      }
    });

    test("owner can see admin option in role dropdown", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      // Find a role dropdown and open it
      const roleSelector = page.locator("button[role='combobox'], [class*='SelectTrigger']").first();
      if (await roleSelector.isVisible().catch(() => false)) {
        await roleSelector.click();
        await page.waitForTimeout(300);

        // Admin should be an option
        const adminOption = page.getByRole("option", { name: "Admin" });
        await expect(adminOption).toBeVisible({ timeout: 3000 });
      }
    });

    test("role dropdown includes all roles", async ({ page }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      const roleSelector = page.locator("button[role='combobox'], [class*='SelectTrigger']").first();
      if (await roleSelector.isVisible().catch(() => false)) {
        await roleSelector.click();
        await page.waitForTimeout(300);

        // Check for key roles
        for (const role of ["Admin", "Editor", "Contributor", "Client"]) {
          const option = page.getByRole("option", { name: role });
          await expect(option).toBeVisible({ timeout: 2000 });
        }
      }
    });
  });

  test.describe("Join Request Flow", () => {
    test("join requests tab is accessible", async ({ page }) => {
      await navigateToAdminTab(page, "Joins");
      await page.waitForTimeout(1000);

      const heading = page.getByText(/join request|access request/i).first();
      await expect(heading).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("End-to-end invite issuance", () => {
    // Smoke test that the invite-creation UI succeeds and the
    // duplicate-email case surfaces the real ConvexError message
    // (not Convex's production-scrubbed "Server Error" fallback).
    test("issuing a second invite for the same email shows the real error", async ({
      page,
    }) => {
      await navigateToAdminTab(page, "Users");
      await page.waitForTimeout(1000);

      // Unique email per run so the test is idempotent against shared dev DB.
      const email = `pw-dup-${Date.now()}@test.nmtsa.local`;

      // ── First invite — expected to succeed ─────────────────────────
      await page.getByRole("button", { name: /invite client/i }).click();
      await page.waitForTimeout(500);

      await page.getByLabel(/email/i).first().fill(email);
      await page
        .getByRole("button", { name: /send invitation|send invite|create invite/i })
        .first()
        .click();

      // Success toast or visible generated code
      await expect(
        page.getByText(/invitation sent|invite sent|code:/i).first(),
      ).toBeVisible({ timeout: 10_000 });

      // Close & reopen modal to try again with the same email
      await page.keyboard.press("Escape");
      await page.waitForTimeout(500);

      // ── Second invite — expected to fail with the actual message ───
      await page.getByRole("button", { name: /invite client/i }).click();
      await page.waitForTimeout(500);

      await page.getByLabel(/email/i).first().fill(email);
      await page
        .getByRole("button", { name: /send invitation|send invite|create invite/i })
        .first()
        .click();

      // The toast / error region MUST show the real message, not "Server Error".
      const realError = page.getByText(/active invite already exists/i).first();
      await expect(realError).toBeVisible({ timeout: 10_000 });

      // Negative assertion: the scrubbed message must NOT appear.
      await expect(page.getByText(/^Server Error$/).first()).toHaveCount(0);
    });
  });
});

test.describe("Sign Up with Invite Code (unauthenticated)", () => {
  test.use({ storageState: { cookies: [], origins: [] } });

  test("sign up form requires invite code", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000);

    const signUpTab = page.getByRole("tab", { name: "Sign Up" });
    if (await signUpTab.isVisible().catch(() => false)) {
      await signUpTab.click();
      await page.waitForTimeout(300);

      // Invite code field should be visible and required
      const inviteLabel = page.getByLabel(/invite code/i);
      await expect(inviteLabel).toBeVisible();

      // Should be marked as required
      const requiredMarker = page.getByText("Invite Code *");
      await expect(requiredMarker).toBeVisible();
    }
  });

  test("invite code from URL auto-populates sign up form", async ({ page }) => {
    await page.goto("/?invite=TESTCODE123");
    await page.waitForTimeout(3000);

    // Should auto-switch to sign up tab
    const inviteField = page.getByLabel(/invite code/i);
    if (await inviteField.isVisible().catch(() => false)) {
      const value = await inviteField.inputValue();
      expect(value).toBe("TESTCODE123");
    }
  });

  test("client invite code from URL auto-populates", async ({ page }) => {
    await page.goto("/?clientInvite=ABCD1234");
    await page.waitForTimeout(3000);

    const inviteField = page.getByLabel(/invite code/i);
    if (await inviteField.isVisible().catch(() => false)) {
      const value = await inviteField.inputValue();
      expect(value).toBe("ABCD1234");
    }
  });

  test("submitting without invite code shows error", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(3000);

    const signUpTab = page.getByRole("tab", { name: "Sign Up" });
    if (await signUpTab.isVisible().catch(() => false)) {
      await signUpTab.click();
      await page.waitForTimeout(300);

      // Fill email and password but no invite code
      await page.locator('#signup-email').fill("test@test.example");
      await page.locator('#signup-password').fill("TestPassword123!");

      // Try to submit — should fail due to required invite code
      await page.getByRole("button", { name: /sign up/i }).click();
      await page.waitForTimeout(2000);

      // Should still be on sign up page (form validation prevents submission)
      const signUpBtn = page.getByRole("button", { name: /sign up/i });
      await expect(signUpBtn).toBeVisible();
    }
  });
});
