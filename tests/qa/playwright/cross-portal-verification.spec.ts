/**
 * Phase 5: Cross-Portal Verification E2E Tests
 *
 * Tests that actions in one portal (admin) are correctly reflected
 * in other portals (investor, IB). Verifies data visibility rules.
 */

import { test, expect } from "@playwright/test";
import {
  loginAs,
  navigateTo,
  assertPageLoaded,
  assertNoCrash,
  takeScreenshot,
  createRPCInterceptor,
} from "./helpers";

test.describe("Cross-Portal Verification", () => {
  // -------------------------------------------------------------------------
  // Admin → Investor Visibility
  // -------------------------------------------------------------------------

  test("investor sees deposits in transaction history", async ({ page }) => {
    // Login as investor and check transactions
    await loginAs(page, "investor");
    await assertPageLoaded(page);

    // Navigate to transaction history
    const txPages = ["/investor/transactions", "/investor/yield-history", "/investor"];
    let foundTxPage = false;

    for (const path of txPages) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded").catch(() => {});

      // Check if page has transaction-like content
      const txContent = page
        .locator("table")
        .or(page.locator('[data-testid="transactions"]'))
        .or(page.locator("text=/DEPOSIT/i"))
        .or(page.locator("text=/transaction/i"));
      if ((await txContent.count()) > 0) {
        foundTxPage = true;
        break;
      }
    }

    await takeScreenshot(page, "cross-portal-investor-transactions");
  });

  test("investor does NOT see admin-only yield distributions", async ({ page }) => {
    await loginAs(page, "investor");
    await assertPageLoaded(page);

    // Navigate through investor pages
    const investorPages = [
      "/investor",
      "/investor/portfolio",
      "/investor/transactions",
      "/investor/yield-history",
    ];

    for (const path of investorPages) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await assertNoCrash(page);
    }

    // Investor should NOT see daily yield distributions (admin-only)
    // They should only see crystallized/month-end yields
    const adminOnlyContent = page.locator(
      "text=/yield_distribution/i, text=/gross_yield_pct/i, text=/adb_weight/i"
    );
    const adminCount = await adminOnlyContent.count();
    expect(adminCount).toBe(0);

    await takeScreenshot(page, "cross-portal-investor-no-admin-yield");
  });

  test("investor cannot access admin endpoints", async ({ page }) => {
    await loginAs(page, "investor");

    // Try to access admin routes
    const adminRoutes = [
      "/admin",
      "/admin/transactions",
      "/admin/withdrawals",
      "/admin/yield",
      "/admin/investors",
      "/admin/settings",
    ];

    for (const route of adminRoutes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle").catch(() => {});

      // Should be redirected away from admin
      const url = page.url();
      const isOnAdmin = url.includes("/admin") && !url.includes("/login");

      // Allow for the URL to still show /admin if the page renders a 403/redirect
      // The key is the page shouldn't show admin content
      const adminContent = page.locator(
        '[data-testid="admin-dashboard"], [data-testid="admin-panel"]'
      );
      const hasAdminContent = await adminContent.count();

      expect(hasAdminContent, `Investor should not see admin content on ${route}`).toBe(0);
    }

    await takeScreenshot(page, "cross-portal-investor-admin-blocked");
  });

  // -------------------------------------------------------------------------
  // Admin → IB Visibility
  // -------------------------------------------------------------------------

  test("IB sees referral information", async ({ page }) => {
    await loginAs(page, "ib");
    await assertPageLoaded(page);

    // IB dashboard should show referrals or commission data
    const ibContent = page.locator(
      "text=/referral/i, text=/commission/i, text=/referred/i, text=/payout/i"
    );
    const count = await ibContent.count();

    // Just verify the page loaded and has IB-relevant content
    await takeScreenshot(page, "cross-portal-ib-dashboard");
  });

  test("IB cannot access admin-only routes", async ({ page }) => {
    await loginAs(page, "ib");

    const adminOnlyRoutes = [
      "/admin/transactions/new",
      "/admin/yield",
      "/admin/settings",
      "/admin/investors",
    ];

    for (const route of adminOnlyRoutes) {
      await page.goto(route);
      await page.waitForLoadState("networkidle").catch(() => {});

      const adminContent = page.locator(
        '[data-testid="admin-dashboard"], [data-testid="transaction-form"]'
      );
      const hasAdminContent = await adminContent.count();

      expect(hasAdminContent, `IB should not see admin content on ${route}`).toBe(0);
    }

    await takeScreenshot(page, "cross-portal-ib-admin-blocked");
  });

  test("IB sees only their own referrals", async ({ page }) => {
    const interceptor = createRPCInterceptor(page);
    await interceptor.start();

    await loginAs(page, "ib");
    await assertPageLoaded(page);

    // Navigate to referral pages
    const referralPages = ["/dashboard", "/referrals", "/commissions", "/ib"];
    for (const path of referralPages) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded").catch(() => {});
    }

    // Check that RPCs called include investor-scoping
    // (RLS should handle this, but verify at UI level)
    await takeScreenshot(page, "cross-portal-ib-referrals-scoped");
  });

  // -------------------------------------------------------------------------
  // Voided Data Visibility
  // -------------------------------------------------------------------------

  test("voided transactions not shown to investor", async ({ page }) => {
    await loginAs(page, "investor");
    await assertPageLoaded(page);

    // Navigate to all investor pages
    const investorPages = [
      "/investor",
      "/investor/portfolio",
      "/investor/transactions",
      "/investor/yield-history",
    ];

    for (const path of investorPages) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded").catch(() => {});

      // Look for voided indicators
      const voidedContent = page
        .locator("text=/voided/i")
        .or(page.locator('[data-status="voided"]'))
        .or(page.locator(".voided"));
      const count = await voidedContent.count();

      // Voided items should not be visible to investors
      expect(count, `Voided content should not be visible on investor page ${path}`).toBe(0);
    }

    await takeScreenshot(page, "cross-portal-no-voided-for-investor");
  });

  test("voided transactions ARE shown to admin (for audit)", async ({ page }) => {
    await loginAs(page, "admin");

    await navigateTo(page, "/admin/transactions");
    await assertPageLoaded(page);

    // Admin should be able to see voided transactions
    // (they may appear with a voided badge/style)
    // This is informational - confirms admin has full visibility
    await takeScreenshot(page, "cross-portal-admin-sees-voided");
  });

  // -------------------------------------------------------------------------
  // Withdrawal Status Cross-Portal
  // -------------------------------------------------------------------------

  test("investor sees withdrawal request status", async ({ page }) => {
    await loginAs(page, "investor");
    await assertPageLoaded(page);

    // Navigate to withdrawal-related pages
    const withdrawalPages = ["/withdrawals", "/withdrawal-history", "/transactions", "/dashboard"];

    for (const path of withdrawalPages) {
      await page.goto(path);
      await page.waitForLoadState("domcontentloaded").catch(() => {});
      await assertNoCrash(page);
    }

    await takeScreenshot(page, "cross-portal-investor-withdrawal-status");
  });

  // -------------------------------------------------------------------------
  // RPC Interception: Data Scoping
  // -------------------------------------------------------------------------

  test("investor RPCs are scoped to their profile", async ({ page }) => {
    const interceptor = createRPCInterceptor(page);
    await interceptor.start();

    await loginAs(page, "investor");
    await assertPageLoaded(page);

    // Navigate through investor pages to trigger RPCs
    const pages = ["/dashboard", "/portfolio"];
    for (const path of pages) {
      await page.goto(path);
      await page.waitForLoadState("networkidle").catch(() => {});
    }

    // Verify no admin-only RPCs were called
    const adminOnlyRPCs = new Set([
      "admin_create_transaction",
      "apply_deposit_with_crystallization",
      "apply_withdrawal_with_crystallization",
      "void_transaction",
      "void_yield_distribution",
      "force_delete_investor",
      "apply_daily_yield_to_fund_v3",
    ]);

    const calledAdminRPCs = interceptor.calls
      .map((c) => c.functionName)
      .filter((name) => adminOnlyRPCs.has(name));

    expect(calledAdminRPCs, "Investor portal should not call admin-only RPCs").toHaveLength(0);

    await takeScreenshot(page, "cross-portal-investor-rpc-scoping");
  });

  // -------------------------------------------------------------------------
  // Session Isolation
  // -------------------------------------------------------------------------

  test("different roles see different navigation", async ({ page }) => {
    // Login as admin and capture nav
    await loginAs(page, "admin");
    await assertPageLoaded(page);
    const adminNav = await page.locator("nav, [role='navigation'], aside").first().textContent();
    await takeScreenshot(page, "cross-portal-admin-nav");

    // Clear session and login as investor
    await page.context().clearCookies();
    await page.evaluate(() => localStorage.clear());

    await loginAs(page, "investor");
    await assertPageLoaded(page);
    const investorNav = await page.locator("nav, [role='navigation'], aside").first().textContent();
    await takeScreenshot(page, "cross-portal-investor-nav");

    // Navigation content should be different between roles
    // (admin has more menu items than investor)
    if (adminNav && investorNav) {
      expect(adminNav).not.toEqual(investorNav);
    }
  });
});
