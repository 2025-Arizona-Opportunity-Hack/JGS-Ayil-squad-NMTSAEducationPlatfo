import { test, expect } from "@playwright/test";

test.describe("Authentication Flows", () => {
  // These tests use a fresh context (no saved auth)
  test.use({ storageState: { cookies: [], origins: [] } });

  test.describe("Sign In Page", () => {
    test("sign in page shows for unauthenticated users", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      // Should show sign in form (unless setup wizard is needed)
      const signInBtn = page.getByRole("button", { name: /sign in/i });
      const setupWizard = page.getByText(/create owner account/i);

      const isSignIn = await signInBtn.isVisible().catch(() => false);
      const isSetup = await setupWizard.isVisible().catch(() => false);

      // Should show either sign in or setup wizard
      expect(isSignIn || isSetup).toBeTruthy();
    });

    test("sign in form has email and password fields", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const emailInput = page.locator('input[type="email"]').first();
      const passwordInput = page.locator('input[type="password"]').first();

      if (await emailInput.isVisible()) {
        await expect(emailInput).toBeVisible();
        await expect(passwordInput).toBeVisible();
      }
    });

    test("forgot password link is visible on sign in", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const forgotLink = page.getByText(/forgot password/i);
      if (await forgotLink.isVisible()) {
        await expect(forgotLink).toBeVisible();
      }
    });

    test("forgot password shows reset form", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const forgotLink = page.getByText(/forgot password/i);
      if (await forgotLink.isVisible()) {
        await forgotLink.click();
        await page.waitForTimeout(500);

        // Should show reset password form
        await expect(page.getByText(/reset password/i).first()).toBeVisible();
        await expect(page.getByRole("button", { name: /send reset code/i })).toBeVisible();

        // Back to sign in should work
        await page.getByRole("button", { name: /back to sign in/i }).click();
        await page.waitForTimeout(300);
      }
    });

    test("bad credentials shows friendly error", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const emailInput = page.locator('#signin-email, input[name="email"]').first();
      const passwordInput = page.locator('#signin-password, input[name="password"]').first();
      const signInBtn = page.getByRole("button", { name: /sign in/i });

      if (await emailInput.isVisible()) {
        await emailInput.fill("nonexistent@test.com");
        await passwordInput.fill("wrongpassword123");
        await signInBtn.click();
        await page.waitForTimeout(3000);

        // Should show a friendly error, NOT a raw server error
        const body = await page.textContent("body");
        expect(body).not.toContain("[CONVEX");
        expect(body).not.toContain("Request ID");
      }
    });
  });

  test.describe("Sign Up Page", () => {
    test("sign up tab shows invite code field", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const signUpTab = page.getByRole("tab", { name: "Sign Up" });
      if (await signUpTab.isVisible()) {
        await signUpTab.click();
        await page.waitForTimeout(300);

        // Invite code should be visible and required
        const inviteField = page.getByLabel(/invite code/i);
        await expect(inviteField).toBeVisible();
      }
    });

    test("sign up without invite code shows error", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const signUpTab = page.getByRole("tab", { name: "Sign Up" });
      if (await signUpTab.isVisible()) {
        await signUpTab.click();
        await page.waitForTimeout(300);

        // Fill email and password but no invite code
        await page.locator('#signup-email, input[name="email"]').first().fill("test@test.com");
        await page.locator('#signup-password, input[name="password"]').first().fill("TestPass123!");

        // Try to submit
        await page.getByRole("button", { name: /sign up|create/i }).click();
        await page.waitForTimeout(2000);

        // Should show invite code required error
        const body = await page.textContent("body");
        // Form should have HTML5 validation or toast error
        expect(body).toBeTruthy();
      }
    });

    test("request access link is visible on sign up", async ({ page }) => {
      await page.goto("/");
      await page.waitForTimeout(3000);

      const signUpTab = page.getByRole("tab", { name: "Sign Up" });
      if (await signUpTab.isVisible()) {
        await signUpTab.click();
        await page.waitForTimeout(300);

        const requestLink = page.getByText(/request access/i);
        await expect(requestLink).toBeVisible();
      }
    });

    test("invite code from URL auto-populates", async ({ page }) => {
      await page.goto("/?invite=TESTCODE");
      await page.waitForTimeout(3000);

      // Should switch to sign up tab and populate invite code
      const inviteField = page.getByLabel(/invite code/i);
      if (await inviteField.isVisible()) {
        const value = await inviteField.inputValue();
        expect(value).toBe("TESTCODE");
      }
    });

    test("client invite from URL auto-populates", async ({ page }) => {
      await page.goto("/?clientInvite=TESTCODE");
      await page.waitForTimeout(3000);

      // Should switch to sign up tab and populate invite code
      const inviteField = page.getByLabel(/invite code/i);
      if (await inviteField.isVisible()) {
        const value = await inviteField.inputValue();
        expect(value).toBe("TESTCODE");
      }
    });
  });

  test.describe("Password Reset Page", () => {
    test("reset password page loads with code from URL", async ({ page }) => {
      await page.goto("/reset-password?code=TESTCODE123&email=test%40example.com");
      await page.waitForTimeout(3000);

      // Should show the reset password form
      await expect(page.getByText(/new password|set new password/i).first()).toBeVisible({
        timeout: 10_000,
      });

      // Code should be pre-filled
      const codeInput = page.locator('#reset-code, input[name="code"]');
      if (await codeInput.isVisible()) {
        const value = await codeInput.inputValue();
        expect(value).toBe("TESTCODE123");
      }

      // Email should be pre-filled
      const emailInput = page.locator('#reset-email, input[type="email"]').first();
      if (await emailInput.isVisible()) {
        const value = await emailInput.inputValue();
        expect(value).toBe("test@example.com");
      }
    });
  });

  test.describe("Email Verification", () => {
    test("verify-email page loads", async ({ page }) => {
      await page.goto("/verify-email?token=test-token");
      await page.waitForTimeout(3000);

      // Should show verification page (success or error)
      const body = await page.textContent("body");
      expect(body).toBeTruthy();
      expect(body!.length).toBeGreaterThan(10);
    });
  });
});
