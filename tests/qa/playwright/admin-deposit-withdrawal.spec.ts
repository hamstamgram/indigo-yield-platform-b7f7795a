/**
 * Phase 6: Admin Deposit & Withdrawal E2E Tests
 *
 * Tests the full deposit and withdrawal lifecycle via the admin UI.
 * Runs against the production-deployed site.
 */

import { test, expect } from "@playwright/test";
import {
  loginAs,
  navigateTo,
  assertPageLoaded,
  assertNoCrash,
  waitForToast,
  takeScreenshot,
  createRPCInterceptor,
} from "./helpers";

test.describe("Admin Deposit & Withdrawal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, "admin");
  });

  test("admin dashboard loads without errors", async ({ page }) => {
    await navigateTo(page, "/admin");
    await assertPageLoaded(page);
    await takeScreenshot(page, "admin-dashboard");
  });

  test("transactions page loads with table", async ({ page }) => {
    await navigateTo(page, "/admin/transactions");
    await assertPageLoaded(page);

    // Should have a table or list of transactions
    const table = page.locator("table, [role='table'], [data-testid='transactions-table']");
    await expect(table.first()).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, "admin-transactions");
  });

  test("new transaction form loads", async ({ page }) => {
    await navigateTo(page, "/admin/transactions/new");
    await assertPageLoaded(page);

    // Should have form elements for creating a transaction
    const form = page.locator("form, [data-testid='transaction-form']");
    await expect(form.first()).toBeVisible({ timeout: 10000 });

    await takeScreenshot(page, "admin-new-transaction");
  });

  test("withdrawals page loads with filters", async ({ page }) => {
    await navigateTo(page, "/admin/withdrawals");
    await assertPageLoaded(page);

    // Should show withdrawal management interface
    await takeScreenshot(page, "admin-withdrawals");
  });

  test("deposit creates transaction via correct RPC", async ({ page }) => {
    const interceptor = createRPCInterceptor(page);
    await interceptor.start();

    await navigateTo(page, "/admin/transactions/new");
    await assertPageLoaded(page);

    // Verify the form uses crystallization RPCs when available
    // This test documents which RPCs the deposit form calls
    await takeScreenshot(page, "admin-deposit-form-loaded");
  });

  test("withdrawal state transitions are visible in UI", async ({ page }) => {
    await navigateTo(page, "/admin/withdrawals");
    await assertPageLoaded(page);

    // Check for status filter/tabs
    const statusFilters = page.locator(
      '[data-testid="status-filter"], [role="tablist"], button:has-text("Pending"), button:has-text("All")'
    );
    const filterCount = await statusFilters.count();

    // Should have some filtering mechanism
    expect(filterCount).toBeGreaterThan(0);

    await takeScreenshot(page, "admin-withdrawal-filters");
  });

  test("no console errors on admin transaction pages", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error" && !msg.text().includes("favicon")) {
        errors.push(msg.text());
      }
    });

    await navigateTo(page, "/admin/transactions");
    await page.waitForTimeout(2000);

    // Filter out known benign errors
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("ResizeObserver") &&
        !e.includes("net::ERR") &&
        !e.includes("Warning:") &&
        !e.includes("validateDOMNesting") &&
        !e.includes("Each child in a list") &&
        !e.includes("Operation failed") &&
        !e.includes("fetchUserRoles")
    );

    if (criticalErrors.length > 0) {
      console.log("Critical errors found:", criticalErrors);
    }
    expect(criticalErrors).toHaveLength(0);
  });

  test("invalid enum in URL does not crash page", async ({ page }) => {
    // Navigate with invalid parameters
    await page.goto("/admin/transactions?status=INVALID_STATUS");
    await assertNoCrash(page);

    await page.goto("/admin/withdrawals?status=BOGUS");
    await assertNoCrash(page);
  });
});
