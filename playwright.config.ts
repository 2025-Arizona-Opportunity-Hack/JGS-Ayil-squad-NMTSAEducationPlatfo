import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests",
  fullyParallel: false, // Tests share state (auth), run sequentially
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: 1, // Sequential — tests build on each other
  reporter: [["html", { open: "never" }], ["list"]],
  timeout: 60_000, // 60s per test — Convex can be slow on first load
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:5173",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
  },
  projects: [
    // Auth setup — runs first, saves auth state for other tests
    {
      name: "setup",
      testMatch: /.*\.setup\.ts/,
    },
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        storageState: "tests/.auth/owner.json",
      },
      dependencies: ["setup"],
    },
    {
      name: "mobile",
      use: {
        // Use Chromium with mobile viewport (avoids needing WebKit installed)
        ...devices["Desktop Chrome"],
        viewport: { width: 375, height: 667 },
        isMobile: true,
        hasTouch: true,
        storageState: "tests/.auth/owner.json",
      },
      dependencies: ["setup"],
      // Only run mobile-specific tests
      testMatch: /mobile\.spec\.ts/,
    },
  ],
  webServer: {
    command: "npm run dev",
    url: "http://localhost:5173",
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
  },
});
