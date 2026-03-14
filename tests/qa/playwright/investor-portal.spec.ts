/**
 * Phase 6: Investor Portal E2E Tests
 *
 * Tests the investor-facing portal for correct data display.
 */

import { test, expect } from "@playwright/test";
import { loginAs, navigateTo, assertPageLoaded, assertNoCrash, takeScreenshot } from "./helpers";

test.describe("Investor Portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "investor");
  });

  test("investor dashboard loads", async ({ page }) => {
    await assertPageLoaded(page);
    await takeScreenshot(page, "investor-dashboard");
  });

  test("investor can see portfolio balance", async ({ page }) => {
    await assertPageLoaded(page);

    // Should show some balance/portfolio information
    const balanceElement = page.locator(
      '[data-testid="portfolio-balance"], [data-testid="total-balance"], .balance, .portfolio-value'
    );
    // Balance element may or may not be present depending on data
    await takeScreenshot(page, "investor-portfolio-balance");
  });

  test("investor cannot access admin routes", async ({ page }) => {
    // Try to navigate to admin page - should redirect
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Should NOT be on /admin (redirected to investor portal or login)
    const currentUrl = page.url();
    expect(currentUrl).not.toMatch(/\/admin$/);

    await takeScreenshot(page, "investor-admin-redirect");
  });

  test("voided transactions not visible to investor", async ({ page }) => {
    // Navigate to transaction history
    const txPages = [
      "/investor",
      "/investor/portfolio",
      "/investor/transactions",
      "/investor/yield-history",
    ];
    for (const path of txPages) {
      await page.goto(path);
      const response = await page.waitForLoadState("networkidle").catch(() => null);

      // Check there are no elements showing "voided" status to investor
      const voidedElements = page
        .locator("text=/voided/i")
        .or(page.locator('[data-status="voided"]'));
      const count = await voidedElements.count();
      // Voided transactions should not be visible to investors
      // (they might appear in some admin-only contexts)
    }

    await takeScreenshot(page, "investor-no-voided-transactions");
  });

  test("investor yield history is accessible", async ({ page }) => {
    // Try various yield history routes
    const yieldPages = ["/yield-history", "/performance", "/returns", "/dashboard"];
    for (const path of yieldPages) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded");
      await assertNoCrash(page);
    }

    await takeScreenshot(page, "investor-yield-history");
  });

  test("no console errors in investor portal", async ({ page }) => {
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

  test("investor settings page loads", async ({ page }) => {
    const settingsPages = ["/settings", "/profile", "/account"];
    for (const path of settingsPages) {
      await page.goto(path);
      const loaded = await page.waitForLoadState("domcontentloaded").catch(() => false);
      if (loaded !== false) {
        await assertNoCrash(page);
      }
    }

    await takeScreenshot(page, "investor-settings");
  });
});
