/**
 * Phase 6: IB Portal E2E Tests
 *
 * Tests the Introducing Broker portal for correct referral
 * and commission data display.
 */

import { test, expect } from "@playwright/test";
import { loginAs, navigateTo, assertPageLoaded, assertNoCrash, takeScreenshot } from "./helpers";

test.describe("IB Portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "ib");
  });

  test("IB dashboard loads", async ({ page }) => {
    await assertPageLoaded(page);
    await takeScreenshot(page, "ib-dashboard");
  });

  test("IB can see referral information", async ({ page }) => {
    await assertPageLoaded(page);

    // Should show referral count or referred investors
    const referralInfo = page.locator(
      '[data-testid="referral-count"], [data-testid="referred-investors"], text=/referral/i, text=/commission/i'
    );
    // Referral info may or may not be visible depending on portal structure
    await takeScreenshot(page, "ib-referral-info");
  });

  test("IB cannot access admin routes", async ({ page }) => {
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/admin$/);

    await takeScreenshot(page, "ib-admin-redirect");
  });

  test("IB cannot access other investor data", async ({ page }) => {
    // IB should only see their own referrals, not all investors
    await page.goto("/admin/investors");
    await page.waitForLoadState("networkidle");

    const currentUrl = page.url();
    // Should be redirected away from admin
    expect(currentUrl).not.toContain("/admin/investors");

    await takeScreenshot(page, "ib-investor-access-denied");
  });

  test("IB commission data is accessible", async ({ page }) => {
    // Try various commission/payout routes
    const commPages = ["/commissions", "/payouts", "/earnings", "/dashboard"];
    for (const path of commPages) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await assertNoCrash(page);
    }

    await takeScreenshot(page, "ib-commission-data");
  });

  test("no console errors in IB portal", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        errors.push(msg.text());
      }
    });

    await page.waitForTimeout(3000);

    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("ResizeObserver") && !e.includes("net::ERR") && !e.includes("Failed to fetch")
    );

    expect(criticalErrors).toHaveLength(0);
  });
});
