import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 2 : 0,
  workers: process.env.CI ? 1 : undefined,
  reporter: [
    ["html", { outputFolder: "test-reports/playwright" }],
    ["json", { outputFile: "test-reports/playwright/results.json" }],
    ["list"],
  ],
  use: {
    baseURL: process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080",
    trace: "on-first-retry",
    screenshot: "only-on-failure",
    video: "retain-on-failure",
  },

  projects: [
    // Comprehensive E2E test suite - financial verification (UI)
    {
      name: "comprehensive",
      testDir: "./tests/e2e/comprehensive/suites",
      use: {
        ...devices["Desktop Chrome"],
        // Longer timeouts for financial operations
        actionTimeout: 30000,
        navigationTimeout: 30000,
      },
      // Run serially to avoid DB conflicts
      fullyParallel: false,
    },
    // Comprehensive tests - admin operations only (UI)
    {
      name: "comprehensive:admin",
      testDir: "./tests/e2e/comprehensive/suites/admin",
      use: {
        ...devices["Desktop Chrome"],
        actionTimeout: 30000,
        navigationTimeout: 30000,
      },
      fullyParallel: false,
    },
    // Comprehensive tests - calculation verification only
    {
      name: "comprehensive:calculations",
      testDir: "./tests/e2e/comprehensive/suites/calculations",
      use: {
        ...devices["Desktop Chrome"],
        actionTimeout: 30000,
        navigationTimeout: 30000,
      },
      fullyParallel: false,
    },
    // Comprehensive tests - data integrity only (UI)
    {
      name: "comprehensive:data-integrity",
      testDir: "./tests/e2e/comprehensive/suites/data-integrity",
      use: {
        ...devices["Desktop Chrome"],
        actionTimeout: 30000,
        navigationTimeout: 30000,
      },
      fullyParallel: false,
    },
    // API/Database tests - no browser needed
    {
      name: "api",
      testDir: "./tests/comprehensive",
      use: {
        actionTimeout: 60000,
        navigationTimeout: 60000,
      },
      fullyParallel: false,
    },
    // API tests - transactions
    {
      name: "api:transactions",
      testDir: "./tests/comprehensive/transactions",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - yields
    {
      name: "api:yields",
      testDir: "./tests/comprehensive/yields",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - fees
    {
      name: "api:fees",
      testDir: "./tests/comprehensive/fees",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - investors
    {
      name: "api:investors",
      testDir: "./tests/comprehensive/investors",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - IB
    {
      name: "api:ib",
      testDir: "./tests/comprehensive/ib",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - void
    {
      name: "api:void",
      testDir: "./tests/comprehensive/void",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - withdrawals
    {
      name: "api:withdrawals",
      testDir: "./tests/comprehensive/withdrawals",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - reports
    {
      name: "api:reports",
      testDir: "./tests/comprehensive/reports",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - periods
    {
      name: "api:periods",
      testDir: "./tests/comprehensive/periods",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - admin
    {
      name: "api:admin",
      testDir: "./tests/comprehensive/admin",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // API tests - data integrity
    {
      name: "api:data-integrity",
      testDir: "./tests/comprehensive/data-integrity",
      use: { actionTimeout: 60000 },
      fullyParallel: false,
    },
    // Standard browser tests
    {
      name: "chromium",
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "firefox",
      use: { ...devices["Desktop Firefox"] },
    },
    {
      name: "webkit",
      use: { ...devices["Desktop Safari"] },
    },
    {
      name: "Mobile Chrome",
      use: { ...devices["Pixel 5"] },
    },
    {
      name: "Mobile Safari",
      use: { ...devices["iPhone 12"] },
    },
  ],

  webServer: {
    command: "npm run dev",
    url: "http://localhost:8080",
    reuseExistingServer: !process.env.CI,
    timeout: 120000,
  },
});
