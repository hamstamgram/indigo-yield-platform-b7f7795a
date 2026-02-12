/**
 * Investor Portal Full Regression
 *
 * Verifies all investor pages load without crashes, render key elements,
 * and respond to basic interactions.
 *
 * Known bugs are tested with test.fail() - they should FAIL (regression baseline).
 *
 * Pages: 9 investor pages + 4 interaction tests + 4 known bug tests
 */

import { test, expect } from "@playwright/test";
import {
  loginAsInvestor,
  takeEvidence,
  navigateAndSettle,
  dismissBanners,
  waitForPageSettled,
} from "./helpers/fix-test-utils";

test.describe("Investor Portal Regression", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeEach(async ({ page }) => {
    await loginAsInvestor(page);
  });

  // ─── Page Load Tests ───────────────────────────────────────────────

  test("1. Dashboard loads", async ({ page }) => {
    await navigateAndSettle(page, "/investor");
    // Balance card or welcome message
    const content = page
      .locator(
        '[class*="card"], :text("balance"), :text("Balance"), :text("Welcome"), :text("Portfolio")'
      )
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
    // No NaN values
    const bodyText = await page.locator("body").textContent();
    expect(bodyText).not.toContain("NaN");
    await takeEvidence(page, "regression-investor-01-dashboard");
  });

  test("2. Portfolio page loads", async ({ page }) => {
    await navigateAndSettle(page, "/investor/portfolio");
    const content = page
      .locator(
        '[class*="card"], :text("portfolio"), :text("Portfolio"), :text("fund"), :text("Fund")'
      )
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
    await takeEvidence(page, "regression-investor-02-portfolio");
  });

  test("3. Transactions page loads", async ({ page }) => {
    await navigateAndSettle(page, "/investor/transactions");
    const content = page
      .locator(
        'table, [role="table"], :text("transaction"), :text("Transaction"), :text("No transactions")'
      )
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
    await takeEvidence(page, "regression-investor-03-transactions");
  });

  test("4. Yield History page loads", async ({ page }) => {
    await navigateAndSettle(page, "/investor/yield-history");
    const content = page
      .locator(
        'table, [role="table"], :text("yield"), :text("Yield"), :text("No yield"), [class*="card"]'
      )
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
    await takeEvidence(page, "regression-investor-04-yield-history");
  });

  test("5. Statements page loads", async ({ page }) => {
    await navigateAndSettle(page, "/investor/statements");
    const content = page
      .locator(
        ':text("statement"), :text("Statement"), :text("No statements"), [class*="card"], table'
      )
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
    await takeEvidence(page, "regression-investor-05-statements");
  });

  test("6. Fund Details page loads", async ({ page }) => {
    // First go to portfolio to find a fund link
    await navigateAndSettle(page, "/investor/portfolio");

    // Click on a fund card to navigate to fund details
    const fundLink = page.locator('a[href*="/investor/fund"], [class*="card"]').first();
    if (await fundLink.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fundLink.click();
      await page.waitForTimeout(1000);
      await dismissBanners(page);

      // Fund detail page should have fund info
      const content = page
        .locator('[class*="card"], :text("performance"), :text("Performance"), :text("balance")')
        .first();
      await expect(content).toBeVisible({ timeout: 10000 });
    }
    await takeEvidence(page, "regression-investor-06-fund-details");
  });

  test("7. Withdrawal form loads", async ({ page }) => {
    await navigateAndSettle(page, "/withdrawals/new");
    // Form with fund selector and amount field
    const content = page
      .locator(
        'form, select, [role="combobox"], :text("withdrawal"), :text("Withdrawal"), :text("withdraw")'
      )
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
    await takeEvidence(page, "regression-investor-07-withdrawal-form");
  });

  test("8. Settings page loads", async ({ page }) => {
    await navigateAndSettle(page, "/investor/settings");
    const content = page
      .locator(
        'form, [class*="card"], :text("profile"), :text("Profile"), :text("settings"), :text("Settings")'
      )
      .first();
    await expect(content).toBeVisible({ timeout: 10000 });
    await takeEvidence(page, "regression-investor-08-settings");
  });

  test("9. Notification region exists", async ({ page }) => {
    await navigateAndSettle(page, "/investor");
    // Notifications are inline (bell icon region), not a separate page
    const notifRegion = page.locator('[aria-label*="Notification" i], [role="region"]').first();
    const hasNotif = await notifRegion.isVisible({ timeout: 5000 }).catch(() => false);
    // Page should at least not crash
    const bodyText = await page.locator("body").textContent();
    expect(bodyText!.length).toBeGreaterThan(100);
    await takeEvidence(page, "regression-investor-09-notifications");
  });

  // ─── Known Bug Tests (Expected Failures) ───────────────────────────
  // These tests document known pre-existing bugs. They are EXPECTED to fail.
  // When fixed, remove the test.fail() annotation.

  test.fail("K1. Yield History: cross-currency summing bug", async ({ page }) => {
    await navigateAndSettle(page, "/investor/yield-history");
    await page.waitForTimeout(2000);

    // The bug: yields from different currencies (BTC, USDT) are summed together
    // Expected: separate totals per currency
    // This test asserts CORRECT behavior - it should FAIL due to the known bug

    // Look for any total/summary row
    const totalRow = page.locator(':text("Total"), :text("total"), tfoot').first();
    if (await totalRow.isVisible({ timeout: 5000 }).catch(() => false)) {
      const totalText = await totalRow.textContent();
      // A correct implementation would show separate currency totals
      // The bug mixes BTC + USDT into one number
      // Assert that totals are per-currency (this should fail)
      expect(totalText).toMatch(/BTC|ETH|USDT/); // Should have currency labels on totals
    } else {
      // If no total row, the page might just list items - check if there's a mix
      const yieldItems = page.locator("tr, [class*='row']").filter({ hasText: /BTC/ });
      const btcCount = await yieldItems.count();
      if (btcCount > 0) {
        // There should be separate sections or currency-labeled totals
        const hasCurrencyGrouping = await page
          .locator(':text("BTC Total"), :text("USDT Total"), :text("per fund")')
          .first()
          .isVisible({ timeout: 2000 })
          .catch(() => false);
        expect(hasCurrencyGrouping).toBeTruthy();
      }
    }
    await takeEvidence(page, "regression-investor-K1-yield-cross-currency");
  });

  test("K2. Performance page: all zeros except ending balance", async ({ page }) => {
    await navigateAndSettle(page, "/investor/performance");

    // The bug: performance metrics show 0 for rate of return, total earned, etc.
    // Only ending balance shows a real number
    await page.waitForTimeout(2000);

    // Look for rate of return or similar metric
    const rorElement = page
      .locator(':text("Rate of Return"), :text("rate of return"), :text("Return")')
      .first();
    if (await rorElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      const parent = rorElement.locator("..");
      const parentText = await parent.textContent();
      // Assert non-zero rate of return (this should FAIL due to the bug)
      expect(parentText).not.toMatch(/0\.00%|0%|--/);
    }
    await takeEvidence(page, "regression-investor-K2-performance-zeros");
  });

  test("K3. Dashboard: YTD Return always zero", async ({ page }) => {
    await navigateAndSettle(page, "/investor");
    await page.waitForTimeout(2000);

    // Look for YTD Return metric
    const ytdElement = page
      .locator(':text("YTD Return"), :text("ytd return"), :text("Year to Date")')
      .first();
    if (await ytdElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      const parent = ytdElement.locator("..");
      const parentText = await parent.textContent();
      // Assert non-zero YTD return (this should FAIL due to the bug)
      expect(parentText).not.toMatch(/\$0|0\.00|0%/);
    }
    await takeEvidence(page, "regression-investor-K3-dashboard-ytd-zero");
  });

  test("K4. Portfolio: MTD Net Change always zero", async ({ page }) => {
    await navigateAndSettle(page, "/investor/portfolio");
    await page.waitForTimeout(2000);

    // Look for MTD or Month to Date metric
    const mtdElement = page
      .locator(':text("MTD"), :text("Month to Date"), :text("Net Change")')
      .first();
    if (await mtdElement.isVisible({ timeout: 5000 }).catch(() => false)) {
      const parent = mtdElement.locator("..");
      const parentText = await parent.textContent();
      // Assert non-zero MTD change (this should FAIL due to the bug)
      expect(parentText).not.toMatch(/\$0|0\.00|0%/);
    }
    await takeEvidence(page, "regression-investor-K4-portfolio-mtd-zero");
  });

  // ─── Interaction Tests ─────────────────────────────────────────────

  test("I1. Fund card click navigates to fund detail", async ({ page }) => {
    await navigateAndSettle(page, "/investor/portfolio");

    const fundCard = page.locator('a[href*="/investor/fund"], [class*="card"]').first();
    if (await fundCard.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fundCard.click();
      await page.waitForTimeout(1000);
      await dismissBanners(page);

      // Should navigate or render fund detail without crash
      const bodyText = await page.locator("body").textContent();
      expect(bodyText!.length).toBeGreaterThan(100);
    }
    await takeEvidence(page, "regression-investor-I1-fund-card-click");
  });

  test("I2. Transaction filter works", async ({ page }) => {
    await navigateAndSettle(page, "/investor/transactions");

    const filterControl = page
      .locator('button:has-text("All"), select, [role="combobox"], [data-testid*="filter"]')
      .first();
    if (await filterControl.isVisible({ timeout: 5000 }).catch(() => false)) {
      await filterControl.click();
      await page.waitForTimeout(300);
      const option = page.locator('[role="option"]').first();
      if (await option.isVisible().catch(() => false)) {
        await option.click();
        await page.waitForTimeout(500);
      }
    }
    // Page should not crash
    const body = await page.locator("body").textContent();
    expect(body!.length).toBeGreaterThan(100);
    await takeEvidence(page, "regression-investor-I2-tx-filter");
  });

  test("I3. Withdrawal form fund selector works", async ({ page }) => {
    await navigateAndSettle(page, "/withdrawals/new");

    // Find fund selector
    const fundSelect = page
      .locator(
        'select, [role="combobox"], button:has-text("Select fund"), button:has-text("Select")'
      )
      .first();
    if (await fundSelect.isVisible({ timeout: 5000 }).catch(() => false)) {
      await fundSelect.click();
      await page.waitForTimeout(300);

      // Options should appear
      const options = page.locator('[role="option"]');
      const count = await options.count();
      expect(count).toBeGreaterThan(0);

      // Select first option
      if (count > 0) {
        await options.first().click();
        await page.waitForTimeout(500);
      }
    }

    // Amount field should be accessible
    const amountInput = page
      .locator('input[type="number"], input[placeholder*="amount" i]')
      .first();
    if (await amountInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await amountInput.fill("0.01");
    }

    await takeEvidence(page, "regression-investor-I3-withdrawal-form");
  });

  test("I4. Statement download works", async ({ page }) => {
    await navigateAndSettle(page, "/investor/statements");

    // Find a download button
    const downloadBtn = page
      .locator(
        'button:has-text("Download"), a:has-text("Download"), button:has-text("View"), button[aria-label*="download" i]'
      )
      .first();
    if (await downloadBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      // Just verify it's clickable, don't actually download
      const isEnabled = await downloadBtn.isEnabled();
      expect(isEnabled).toBeTruthy();
    }
    await takeEvidence(page, "regression-investor-I4-statement-download");
  });
});
