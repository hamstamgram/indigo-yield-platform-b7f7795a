/**
 * Production Smoke Test
 *
 * Run against the live Lovable Cloud app to verify critical flows:
 *   PLAYWRIGHT_BASE_URL=https://indigo-yield-platform.lovable.app npx playwright test tests/e2e/production-smoke.spec.ts --project=chromium
 *
 * Tests:
 *  1. Admin login + dashboard loads
 *  2. Admin key pages reachable (investors, transactions, withdrawals, integrity)
 *  3. Investor login + overview loads
 *  4. Investor portfolio and transactions pages load
 */

import { test, expect, Page } from "@playwright/test";

const ADMIN_EMAIL = process.env.QA_ADMIN_EMAIL || "qa.admin@indigo.fund";
const ADMIN_PASSWORD = process.env.QA_ADMIN_PASSWORD || "QaTest2026!";
const INVESTOR_EMAIL = process.env.QA_INVESTOR_EMAIL || "thomas.puech@indigo.fund";
const INVESTOR_PASSWORD = process.env.QA_INVESTOR_PASSWORD || "TestInvestor2026!";

async function dismissOverlays(page: Page) {
  // Accept cookie consent
  const acceptBtn = page.getByRole("button", { name: "Accept All" });
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
  }
  // Remove PWA install banner
  await page
    .evaluate(() => {
      document.querySelectorAll('[class*="fixed"]').forEach((el) => {
        if ((el as HTMLElement).textContent?.includes("Install")) (el as HTMLElement).remove();
      });
    })
    .catch(() => {});
}

async function loginAs(page: Page, email: string, password: string) {
  await page.goto("/");
  await dismissOverlays(page);

  // Fill credentials
  await page.locator('input[type="email"]').first().fill(email);
  await page.locator('input[type="password"]').first().fill(password);

  // Click login button
  await page
    .locator('button[type="submit"], button:has-text("Access Portal"), button:has-text("Sign In")')
    .first()
    .click({ force: true });

  // Wait for navigation
  await page.waitForURL(/.*(?:admin|investor|dashboard).*/, { timeout: 15000 });
  await dismissOverlays(page);
}

// ===== ADMIN SMOKE TESTS =====

test.describe("Admin Portal Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test("dashboard loads with stats", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");
    // Should see some dashboard content
    await expect(page.locator("body")).toContainText(/dashboard|overview|fund|aum/i);
  });

  test("investors page loads", async ({ page }) => {
    await page.goto("/admin/investors");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/investor/i);
  });

  test("transactions page loads", async ({ page }) => {
    await page.goto("/admin/transactions");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/transaction/i);
  });

  test("withdrawals page loads", async ({ page }) => {
    await page.goto("/admin/withdrawals");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/withdrawal/i);
  });

  test("yield distributions page loads", async ({ page }) => {
    await page.goto("/admin/yield-distributions");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/yield|distribution/i);
  });

  test("integrity page loads with no critical errors", async ({ page }) => {
    await page.goto("/admin/integrity");
    await page.waitForLoadState("networkidle");
    // Page should load without 500 errors
    await expect(page.locator("body")).toContainText(/integrity|check|health/i);
  });

  test("system health page loads", async ({ page }) => {
    await page.goto("/admin/system-health");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/system|health|status/i);
  });
});

// ===== INVESTOR SMOKE TESTS =====

test.describe("Investor Portal Smoke", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, INVESTOR_EMAIL, INVESTOR_PASSWORD);
  });

  test("overview page loads with assets", async ({ page }) => {
    await page.goto("/investor");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/wealth|balance|asset/i);
  });

  test("portfolio page loads", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/portfolio|position/i);
  });

  test("transactions page loads", async ({ page }) => {
    await page.goto("/investor/transactions");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/transaction|history/i);
  });

  test("statements page loads", async ({ page }) => {
    await page.goto("/investor/statements");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/statement/i);
  });

  test("settings page loads", async ({ page }) => {
    await page.goto("/investor/settings");
    await page.waitForLoadState("networkidle");
    await expect(page.locator("body")).toContainText(/setting|profile|security/i);
  });
});
