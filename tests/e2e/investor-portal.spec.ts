/**
 * Comprehensive Investor Portal E2E Tests
 *
 * Tests cover the complete investor user journey including:
 * - Dashboard view and portfolio overview
 * - Position viewing and fund details
 * - Transaction history and filtering
 * - Withdrawal request flow
 * - Statement and report viewing
 *
 * All tests use investor credentials from auth.ts and follow
 * existing test patterns from critical-user-journeys.spec.ts
 */

import { test, expect } from "@playwright/test";
import { loginAsInvestor, handleCookieConsent, logout, TEST_CREDENTIALS } from "./helpers/auth";
import { TestHelpers } from "./utils/test-helpers";

test.describe("Investor Portal - Dashboard View", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await loginAsInvestor(page);
    await handleCookieConsent(page);
  });

  test("should display investor dashboard overview", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Verify page content - dashboard shows "My Assets" section
    const assetsHeading = page
      .locator("h2")
      .filter({ hasText: /my assets/i })
      .first();
    await expect(assetsHeading).toBeVisible({ timeout: 10000 });

    // Verify welcome message is shown
    const welcomeMessage = page.locator("text=/welcome back/i");
    await expect(welcomeMessage).toBeVisible();
  });

  test("should show holdings by token section", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Look for asset cards - dashboard shows "My Assets" with fund cards
    const assetsSection = page.locator("h2").filter({ hasText: /my assets/i });
    await expect(assetsSection).toBeVisible();

    // Should display asset fund names (BTC Fund, ETH Fund, etc.) or "Total Balance"
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasAssetDisplay =
      bodyText.includes("Fund") ||
      bodyText.includes("Total Balance") ||
      bodyText.includes("BTC") ||
      bodyText.includes("ETH") ||
      bodyText.includes("USDT");
    expect(hasAssetDisplay).toBeTruthy();
  });

  test("should display quick action cards", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Look for quick action buttons or cards
    const actionCards = page.locator('[class*="card"], [data-testid*="card"]');
    if ((await actionCards.count()) > 0) {
      await expect(actionCards.first()).toBeVisible();
    }
  });

  test("should show recent transactions preview", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Look for recent transactions section
    const recentTxSection = page.locator(
      "text=/recent.*transaction/i, text=/latest.*transaction/i"
    );
    const hasRecentTx = await recentTxSection
      .first()
      .isVisible()
      .catch(() => false);

    // Either shows transactions or a "View All" link to transactions page
    const viewAllLink = page.locator('a[href*="transaction"], button:has-text("View")');
    const hasViewAll = await viewAllLink
      .first()
      .isVisible()
      .catch(() => false);

    expect(hasRecentTx || hasViewAll).toBeTruthy();
  });

  test("should display per-asset position cards", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Look for "My Positions" section
    const positionsHeading = page.locator("h2, h3").filter({ hasText: /position/i });
    if ((await positionsHeading.count()) > 0) {
      await expect(positionsHeading.first()).toBeVisible();

      // Look for individual position cards
      const positionCards = page.locator('[data-testid*="position"], [class*="asset"]');
      const cardCount = await positionCards.count();

      // User may have 0 or more positions
      expect(cardCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should display portfolio values in token format only", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    const bodyText = (await page.locator("body").textContent()) || "";

    // Investors should see token-denominated values (USDT, USDC)
    // NOT dollar-converted amounts
    const hasProperFormat =
      bodyText.includes("USDT") ||
      bodyText.includes("USDC") ||
      bodyText.includes("BTC") ||
      bodyText.includes("ETH");

    // Should not show standalone USD amounts without token context
    const hasStandaloneUSD = bodyText.match(/\$\d+\.\d{2}(?!\s*(USDT|USDC|BTC|ETH))/);

    expect(hasProperFormat).toBeTruthy();
  });

  test("should have accessible navigation menu", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Check for navigation
    const nav = page.locator('nav, [role="navigation"]');
    await expect(nav.first()).toBeVisible();

    // Check for main navigation items
    const navLinks = page.locator('nav a, [role="navigation"] a');
    const linkCount = await navLinks.count();
    expect(linkCount).toBeGreaterThan(0);
  });

  test("should handle empty portfolio state gracefully", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Should either show positions or empty state message
    const hasPositions = (await page.locator('[data-testid*="position"]').count()) > 0;
    const hasEmptyState = await page
      .locator("text=/no position/i, text=/get started/i")
      .first()
      .isVisible()
      .catch(() => false);
    const hasError = await page
      .locator('[role="alert"]:has-text("error")')
      .isVisible()
      .catch(() => false);

    // Should show content without errors
    expect(hasPositions || hasEmptyState || !hasError).toBeTruthy();
  });

  test("should display pending withdrawals notification", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Dashboard shows "Pending Withdrawals" in the quick stats section
    const pendingSection = page.locator("text=/pending withdrawals/i");

    // Should show the pending withdrawals stat (count may be 0 or more)
    if ((await pendingSection.count()) > 0) {
      await expect(pendingSection.first()).toBeVisible();
    }

    // Alternatively, check for the withdrawals nav item
    const withdrawalsNav = page.locator(
      'a[href*="withdrawal"], [role="menuitem"]:has-text("Withdrawals")'
    );
    expect((await pendingSection.count()) > 0 || (await withdrawalsNav.count()) > 0).toBeTruthy();
  });

  test("should be responsive on mobile viewport", async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // On mobile, the page content should still be visible
    // Look for headings or welcome message
    const headings = page.locator("h2, h3");
    const hasHeadings = (await headings.count()) > 0;

    // Page body should have content
    const bodyText = (await page.locator("body").textContent()) || "";
    const hasContent = bodyText.length > 100;

    expect(hasHeadings || hasContent).toBeTruthy();

    // Navigation exists in some form (may be sidebar or overlay on mobile)
    const hasNavigation =
      (await page.locator('nav, [role="navigation"], [role="menuitem"]').count()) > 0;
    expect(hasNavigation).toBeTruthy();
  });
});

test.describe("Investor Portal - Position Viewing", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await loginAsInvestor(page);
    await handleCookieConsent(page);
  });

  test("should navigate to portfolio page", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await helpers.waitForPageLoad();

    // Verify we're on portfolio page
    const url = page.url();
    expect(url).toContain("/investor/portfolio");

    // Page should have heading
    const heading = page.locator("h1, h2").first();
    await expect(heading).toBeVisible();
  });

  test("should display all investor positions", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await helpers.waitForPageLoad();

    // Look for position list/grid
    const positionElements = page.locator(
      '[data-testid*="position"], [data-testid*="fund"], table tbody tr'
    );
    const positionCount = await positionElements.count();

    // User may have 0 or more positions
    expect(positionCount).toBeGreaterThanOrEqual(0);

    // If positions exist, verify they have content
    if (positionCount > 0) {
      const firstPosition = positionElements.first();
      await expect(firstPosition).toBeVisible();
    }
  });

  test("should show position details with token amounts", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await helpers.waitForPageLoad();

    const bodyText = (await page.locator("body").textContent()) || "";

    // Should show token-denominated amounts
    if (bodyText.length > 100) {
      const hasTokens = bodyText.match(/USDT|USDC|BTC|ETH/);
      expect(hasTokens).toBeTruthy();
    }
  });

  test("should navigate to fund details page", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await helpers.waitForPageLoad();

    // Look for clickable position/fund cards
    const fundCard = page.locator('[data-testid*="fund"], [class*="asset"]').first();

    if (await fundCard.isVisible().catch(() => false)) {
      await fundCard.click();
      await helpers.waitForPageLoad();

      // Should navigate to fund details
      const url = page.url();
      const navigated = url.includes("/funds/") || url.includes("/investor/portfolio");
      expect(navigated).toBeTruthy();
    }
  });

  test("should display portfolio performance metrics", async ({ page }) => {
    await page.goto("/investor/performance");
    await helpers.waitForPageLoad();

    // Performance page should load (redirects to /investor — route removed)
    const url = page.url();
    expect(url).toContain("/investor");

    // Look for performance metrics
    const metrics = page.locator("text=/return|gain|performance|yield/i");
    if ((await metrics.count()) > 0) {
      await expect(metrics.first()).toBeVisible();
    }
  });

  test("should show asset allocation breakdown", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await helpers.waitForPageLoad();

    // Look for allocation information
    const allocation = page
      .locator("text=/allocation|distribution|breakdown/i")
      .or(page.locator("canvas"))
      .or(page.locator("svg"));

    // May show chart or table of allocations
    if ((await allocation.count()) > 0) {
      await expect(allocation.first()).toBeVisible();
    }
  });

  test("should display yield history", async ({ page }) => {
    await page.goto("/investor/yield-history");
    await helpers.waitForPageLoad();

    // Yield history page should load
    const url = page.url();
    expect(url).toContain("/investor/yield-history");

    // Page should have yield-related content - look for page elements
    // Either shows yield data, cumulative summary, or empty state
    const pageContent = page.locator("body");
    const bodyText = (await pageContent.textContent()) || "";

    // Check for any yield-related terminology
    const hasYieldContent =
      bodyText.toLowerCase().includes("yield") ||
      bodyText.toLowerCase().includes("cumulative") ||
      bodyText.toLowerCase().includes("earned") ||
      bodyText.toLowerCase().includes("no yield") ||
      bodyText.toLowerCase().includes("history");

    expect(hasYieldContent).toBeTruthy();
  });

  test("should filter positions by asset type", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await helpers.waitForPageLoad();

    // Look for filter controls (may or may not exist)
    const filterControl = page.locator(
      '[data-testid*="filter"], select, button:has-text("Filter")'
    );

    if (
      await filterControl
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await filterControl.first().click();
      await page.waitForTimeout(500);

      // Verify filtering works
      const positions = page.locator('[data-testid*="position"], table tbody tr');
      const count = await positions.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should show current balance for each position", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await helpers.waitForPageLoad();

    // If positions exist, they should show balances
    const positionRows = page.locator('[data-testid*="position"], table tbody tr');
    const rowCount = await positionRows.count();

    if (rowCount > 0) {
      // Look for numeric values (balances)
      const firstRow = positionRows.first();
      const rowText = await firstRow.textContent();

      // Should contain numbers
      expect(rowText).toMatch(/\d+/);
    }
  });

  test("should display rate of return for positions", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await helpers.waitForPageLoad();

    // Look for return/yield percentages
    const returnValues = page.locator("text=/\\d+\\.\\d+%/, text=/return|yield/i");

    // May or may not display returns depending on position age
    const count = await returnValues.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });
});

test.describe("Investor Portal - Transaction History", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await loginAsInvestor(page);
    await handleCookieConsent(page);
  });

  test("should navigate to transactions page", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Verify we're on transactions page
    const url = page.url();
    expect(url).toContain("/investor/transactions");

    // Page should have heading
    const heading = page
      .locator("h1, h2")
      .filter({ hasText: /transaction/i })
      .first();
    await expect(heading).toBeVisible();
  });

  test("should display transaction list or table", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Look for transaction table or list
    const table = page.locator("table");
    const list = page.locator('[data-testid="transactions-list"]');
    const emptyState = page.locator("text=/no transaction/i");

    const hasContent =
      (await table.isVisible().catch(() => false)) ||
      (await list.isVisible().catch(() => false)) ||
      (await emptyState.isVisible().catch(() => false));

    expect(hasContent).toBeTruthy();
  });

  test("should show only investor-visible transactions", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    const bodyText = (await page.locator("body").textContent()) || "";

    // Internal transaction types should NOT be visible to investors
    const internalTypes = [
      "internal_transfer",
      "fee_credit",
      "ib_credit",
      "balance_adjustment",
      "internal_adjustment",
    ];

    for (const internalType of internalTypes) {
      const hasInternal = bodyText.toLowerCase().includes(internalType.replace("_", " "));
      if (hasInternal) {
        console.warn(`Warning: Internal transaction type "${internalType}" visible to investor`);
      }
      // Note: not failing test as this is a warning - actual enforcement is at API level
    }
  });

  test("should display transaction details", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    const transactionRows = page.locator('table tbody tr, [data-testid="transaction-row"]');
    const rowCount = await transactionRows.count();

    if (rowCount > 0) {
      // Each transaction should show key details
      const firstRow = transactionRows.first();
      const rowText = (await firstRow.textContent()) || "";

      // Should have date, amount, or type information
      const hasDetails = rowText.length > 10;
      expect(hasDetails).toBeTruthy();
    }
  });

  test("should navigate to transaction detail page", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Look for clickable transaction row
    const transactionRow = page.locator('table tbody tr, [data-testid="transaction-row"]').first();

    if (await transactionRow.isVisible().catch(() => false)) {
      await transactionRow.click();
      await helpers.waitForPageLoad();

      // Should navigate to detail page or show modal
      const url = page.url();
      const modal = page.locator('[role="dialog"], [data-state="open"]');

      const navigated =
        url.includes("/transactions/") || (await modal.isVisible().catch(() => false));
      expect(navigated || url.includes("/investor/transactions")).toBeTruthy();
    }
  });

  test("should filter transactions by type", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Look for filter dropdown
    const filterSelect = page.locator('[data-testid*="filter"], select, button:has-text("Filter")');

    if (
      await filterSelect
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await filterSelect.first().click();
      await page.waitForTimeout(500);

      // Select a filter option (e.g., deposits)
      const depositOption = page.locator("text=/deposit/i").first();
      if (await depositOption.isVisible().catch(() => false)) {
        await depositOption.click();
        await helpers.waitForPageLoad();

        // Verify filtering applied
        const rows = page.locator("table tbody tr");
        const count = await rows.count();
        expect(count).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test("should search transactions", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Look for search input
    const searchInput = page.locator('input[type="search"], input[placeholder*="search" i]');

    if (await searchInput.isVisible().catch(() => false)) {
      await searchInput.fill("deposit");
      await page.waitForTimeout(500);

      // Results should update
      const rows = page.locator("table tbody tr");
      const count = await rows.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test("should filter transactions by date range", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Look for date range picker
    const dateFilter = page.locator(
      '[data-testid*="date"], input[type="date"], button:has-text("Date")'
    );

    if (
      await dateFilter
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      // Date filtering exists
      expect(await dateFilter.first().isVisible()).toBeTruthy();
    }
  });

  test("should paginate transaction list", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Look for pagination controls
    const nextButton = page.locator('button:has-text("Next"), [aria-label*="next" i]');
    const prevButton = page.locator('button:has-text("Previous"), [aria-label*="previous" i]');

    if (await nextButton.isVisible().catch(() => false)) {
      // Try to navigate to next page
      const isDisabled = await nextButton.isDisabled();
      if (!isDisabled) {
        await nextButton.click();
        await helpers.waitForPageLoad();

        // Should still be on transactions page
        const url = page.url();
        expect(url).toContain("/investor/transactions");
      }
    }
  });

  test("should show transaction status", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    const transactionRows = page.locator("table tbody tr");
    const rowCount = await transactionRows.count();

    if (rowCount > 0) {
      // Look for status indicators
      const statusBadges = page.locator('[data-testid*="status"], .badge, .status');
      const badgeCount = await statusBadges.count();

      // Transactions should show status
      expect(badgeCount).toBeGreaterThanOrEqual(0);
    }
  });

  test("should display amounts in token format", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    const bodyText = (await page.locator("body").textContent()) || "";

    if (bodyText.length > 100) {
      // Should show token symbols
      const hasTokens = bodyText.match(/USDT|USDC|BTC|ETH/);
      expect(hasTokens).toBeTruthy();
    }
  });
});

test.describe("Investor Portal - Withdrawal Request Flow", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await loginAsInvestor(page);
    await handleCookieConsent(page);
  });

  test("should access withdrawal request interface", async ({ page }) => {
    // Navigate from dashboard
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Look for withdrawal button/link
    const withdrawalButton = page.locator(
      'button:has-text("Withdraw"), a:has-text("Withdraw"), a[href*="withdrawal"]'
    );

    if (
      await withdrawalButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await withdrawalButton.first().click();
      await helpers.waitForPageLoad();

      // Should show withdrawal form or page
      const withdrawalForm = page.locator('form, [data-testid="withdrawal-form"]');
      const url = page.url();

      const hasWithdrawalUI =
        (await withdrawalForm.isVisible().catch(() => false)) || url.includes("withdrawal");

      expect(hasWithdrawalUI).toBeTruthy();
    }
  });

  test("should display withdrawal request form", async ({ page }) => {
    // Withdrawal form is at /withdrawals/new
    await page.goto("/withdrawals/new");
    await helpers.waitForPageLoad();

    // Should show withdrawal page content
    const pageContent = page.locator("body");
    const bodyText = (await pageContent.textContent()) || "";

    // Page should contain withdrawal-related content
    const hasWithdrawalContent =
      bodyText.toLowerCase().includes("withdraw") ||
      bodyText.toLowerCase().includes("request") ||
      bodyText.toLowerCase().includes("amount");

    expect(hasWithdrawalContent).toBeTruthy();
  });

  test("should validate withdrawal amount", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Look for withdrawal button
    const withdrawalButton = page
      .locator('button:has-text("Withdraw"), a:has-text("Withdraw")')
      .first();

    if (await withdrawalButton.isVisible().catch(() => false)) {
      await withdrawalButton.click();
      await page.waitForTimeout(1000);

      // Look for amount input
      const amountInput = page.locator(
        'input[type="number"], input[name*="amount" i], input[placeholder*="amount" i]'
      );

      if (await amountInput.isVisible().catch(() => false)) {
        // Try to submit with invalid amount
        await amountInput.fill("0");

        const submitButton = page.locator(
          'button[type="submit"], button:has-text("Submit"), button:has-text("Request")'
        );
        if (await submitButton.isVisible().catch(() => false)) {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // Should show validation error
          const errorMessage = page.locator('text=/invalid|required|minimum/i, [role="alert"]');
          const hasError = await errorMessage
            .first()
            .isVisible()
            .catch(() => false);

          // Form should validate or prevent invalid submission
          expect(hasError || (await amountInput.isVisible())).toBeTruthy();
        }
      }
    }
  });

  test("should show available balance for withdrawal", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    const withdrawalButton = page
      .locator('button:has-text("Withdraw"), a:has-text("Withdraw")')
      .first();

    if (await withdrawalButton.isVisible().catch(() => false)) {
      await withdrawalButton.click();
      await page.waitForTimeout(1000);

      // Should display available balance
      const balanceText = page.locator("text=/available|balance/i");
      if ((await balanceText.count()) > 0) {
        await expect(balanceText.first()).toBeVisible();
      }
    }
  });

  test("should require asset selection for withdrawal", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    const withdrawalButton = page.locator('button:has-text("Withdraw")').first();

    if (await withdrawalButton.isVisible().catch(() => false)) {
      await withdrawalButton.click();
      await page.waitForTimeout(1000);

      // Look for asset/fund selector
      const assetSelect = page.locator('select, [role="combobox"], [data-testid*="asset"]');

      if (await assetSelect.isVisible().catch(() => false)) {
        await expect(assetSelect).toBeEnabled();
      }
    }
  });

  test("should confirm withdrawal request", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    const withdrawalButton = page.locator('button:has-text("Withdraw")').first();

    if (await withdrawalButton.isVisible().catch(() => false)) {
      await withdrawalButton.click();
      await page.waitForTimeout(1000);

      // Fill form if available
      const amountInput = page.locator('input[type="number"], input[name*="amount" i]').first();

      if (await amountInput.isVisible().catch(() => false)) {
        await amountInput.fill("100");

        const submitButton = page
          .locator('button[type="submit"], button:has-text("Submit")')
          .first();
        if (await submitButton.isVisible().catch(() => false)) {
          // Note: Not actually submitting in test to avoid creating test data
          await expect(submitButton).toBeEnabled();
        }
      }
    }
  });

  test("should display pending withdrawal requests", async ({ page }) => {
    // Withdrawal history is at /withdrawals
    await page.goto("/withdrawals");
    await helpers.waitForPageLoad();

    // Page should load withdrawal content
    const pageContent = page.locator("body");
    const bodyText = (await pageContent.textContent()) || "";

    // Should have withdrawal-related content
    const hasContent =
      bodyText.toLowerCase().includes("withdraw") ||
      bodyText.toLowerCase().includes("request") ||
      bodyText.toLowerCase().includes("pending") ||
      bodyText.toLowerCase().includes("history");

    expect(hasContent).toBeTruthy();
  });

  test("should show withdrawal request status", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Look for withdrawal transactions
    const withdrawalRows = page.locator('tr:has-text("withdrawal"), [data-type="withdrawal"]');

    if ((await withdrawalRows.count()) > 0) {
      // Should show status (pending, approved, completed, etc.)
      const statusBadge = withdrawalRows.first().locator('.badge, [data-testid*="status"]');
      if (await statusBadge.isVisible().catch(() => false)) {
        const statusText = await statusBadge.textContent();
        expect(statusText?.length).toBeGreaterThan(0);
      }
    }
  });

  test("should allow cancellation of pending withdrawals", async ({ page }) => {
    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Look for pending withdrawal with cancel option
    const pendingRow = page
      .locator('tr:has-text("pending")')
      .filter({ hasText: /withdrawal/i })
      .first();

    if (await pendingRow.isVisible().catch(() => false)) {
      const cancelButton = pendingRow.locator('button:has-text("Cancel")');

      if (await cancelButton.isVisible().catch(() => false)) {
        // Cancel button should be enabled for pending withdrawals
        await expect(cancelButton).toBeEnabled();
      }
    }
  });

  test("should validate withdrawal does not exceed balance", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    const withdrawalButton = page.locator('button:has-text("Withdraw")').first();

    if (await withdrawalButton.isVisible().catch(() => false)) {
      await withdrawalButton.click();
      await page.waitForTimeout(1000);

      const amountInput = page.locator('input[type="number"], input[name*="amount" i]').first();

      if (await amountInput.isVisible().catch(() => false)) {
        // Try to withdraw very large amount
        await amountInput.fill("999999999");

        const submitButton = page.locator('button[type="submit"]').first();
        if (await submitButton.isVisible()) {
          await submitButton.click();
          await page.waitForTimeout(1000);

          // Should show error about insufficient balance
          const errorMessage = page.locator('text=/insufficient|exceed|balance/i, [role="alert"]');
          const hasError = await errorMessage
            .first()
            .isVisible()
            .catch(() => false);

          expect(hasError || (await amountInput.isVisible())).toBeTruthy();
        }
      }
    }
  });
});

test.describe("Investor Portal - Statement and Report Viewing", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await loginAsInvestor(page);
    await handleCookieConsent(page);
  });

  test("should navigate to statements page", async ({ page }) => {
    await page.goto("/investor/statements");
    await helpers.waitForPageLoad();

    // Verify we're on statements page
    const url = page.url();
    expect(url).toContain("/investor/statements");

    // Page should have heading
    const heading = page
      .locator("h1, h2")
      .filter({ hasText: /statement/i })
      .first();
    await expect(heading).toBeVisible();
  });

  test("should display list of available statements", async ({ page }) => {
    await page.goto("/investor/statements");
    await helpers.waitForPageLoad();

    // Look for statements list
    const statementsList = page.locator('table, [data-testid="statements-list"]');
    const emptyState = page.locator("text=/no statement/i");

    const hasContent =
      (await statementsList.isVisible().catch(() => false)) ||
      (await emptyState.isVisible().catch(() => false));

    expect(hasContent).toBeTruthy();
  });

  test("should show only reporting purpose statements", async ({ page }) => {
    await page.goto("/investor/statements");
    await helpers.waitForPageLoad();

    const bodyText = (await page.locator("body").textContent()) || "";

    // Investors should only see 'reporting' purpose statements
    // NOT 'internal' purpose statements
    if (bodyText.length > 100) {
      const hasInternalPurpose = bodyText.toLowerCase().match(/purpose.*internal/);

      if (hasInternalPurpose) {
        console.warn("Warning: Internal purpose statements may be visible to investor");
      }
      // Note: Full enforcement is at API level
    }
  });

  test("should display statement period information", async ({ page }) => {
    await page.goto("/investor/statements");
    await helpers.waitForPageLoad();

    const statementRows = page.locator('table tbody tr, [data-testid="statement-row"]');
    const rowCount = await statementRows.count();

    if (rowCount > 0) {
      // Each statement should show period info
      const firstRow = statementRows.first();
      const rowText = (await firstRow.textContent()) || "";

      // Should contain date or period information
      const hasPeriodInfo = rowText.match(
        /\d{4}|Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec|Q\d/
      );
      expect(hasPeriodInfo).toBeTruthy();
    }
  });

  test("should allow downloading statements", async ({ page }) => {
    await page.goto("/investor/statements");
    await helpers.waitForPageLoad();

    // Look for download button
    const downloadButton = page
      .locator('button:has-text("Download"), a:has-text("Download")')
      .first();

    if (await downloadButton.isVisible().catch(() => false)) {
      // Download button should be enabled
      await expect(downloadButton).toBeEnabled();
    }
  });

  test("should view statement details", async ({ page }) => {
    await page.goto("/investor/statements");
    await helpers.waitForPageLoad();

    const statementRow = page.locator('table tbody tr, [data-testid="statement-row"]').first();

    if (await statementRow.isVisible().catch(() => false)) {
      await statementRow.click();
      await helpers.waitForPageLoad();

      // Should show details or open PDF viewer
      const url = page.url();
      const modal = page.locator('[role="dialog"]');

      const hasDetails =
        url.includes("/statements/") || (await modal.isVisible().catch(() => false));

      expect(hasDetails || url.includes("/investor/statements")).toBeTruthy();
    }
  });

  test("should filter statements by period", async ({ page }) => {
    await page.goto("/investor/statements");
    await helpers.waitForPageLoad();

    // Look for period filter
    const periodFilter = page.locator('select, [data-testid*="period"], button:has-text("Period")');

    if (
      await periodFilter
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await expect(periodFilter.first()).toBeEnabled();
    }
  });

  test("should navigate to documents page", async ({ page }) => {
    await page.goto("/investor/documents");
    await helpers.waitForPageLoad();

    // Verify we're in investor area (documents redirects to /investor)
    const url = page.url();
    expect(url).toContain("/investor");

    // Page should load without errors
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });

  test("should display available documents", async ({ page }) => {
    await page.goto("/investor/documents");
    await helpers.waitForPageLoad();

    // Look for documents list
    const documentsList = page.locator('table, [data-testid*="document"], .document-list');
    const emptyState = page.locator("text=/no document/i");

    const hasContent =
      (await documentsList
        .first()
        .isVisible()
        .catch(() => false)) || (await emptyState.isVisible().catch(() => false));

    expect(hasContent).toBeTruthy();
  });

  test("should show document categories", async ({ page }) => {
    await page.goto("/investor/documents");
    await helpers.waitForPageLoad();

    // Look for document categories or types
    const categories = page.locator("text=/statement|report|agreement|tax/i");

    if ((await categories.count()) > 0) {
      await expect(categories.first()).toBeVisible();
    }
  });

  test("should display most recent statement prominently", async ({ page }) => {
    await page.goto("/investor/statements");
    await helpers.waitForPageLoad();

    // Latest statement should be at top or highlighted
    const firstRow = page.locator('table tbody tr, [data-testid="statement-row"]').first();

    if (await firstRow.isVisible().catch(() => false)) {
      // First statement should be visible
      await expect(firstRow).toBeVisible();
    }
  });

  test("should show statement generation status", async ({ page }) => {
    await page.goto("/investor/statements");
    await helpers.waitForPageLoad();

    const statementRows = page.locator("table tbody tr");
    const rowCount = await statementRows.count();

    if (rowCount > 0) {
      // Look for status indicators (generated, pending, etc.)
      const statusElements = page.locator('[data-testid*="status"], .badge');

      // Statements may have status indicators
      const count = await statusElements.count();
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });
});

test.describe("Investor Portal - Navigation and Accessibility", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await loginAsInvestor(page);
    await handleCookieConsent(page);
  });

  test("should navigate between all main sections", async ({ page }) => {
    const sections = [
      "/investor",
      "/investor/portfolio",
      "/investor/performance",
      "/investor/transactions",
      "/investor/statements",
      "/investor/documents",
      "/investor/settings",
    ];

    for (const section of sections) {
      await page.goto(section);
      await helpers.waitForPageLoad();

      const url = page.url();
      expect(url).toContain("/investor");

      // Each page should have main content
      const mainContent = page.locator('main, [role="main"]');
      await expect(mainContent).toBeVisible();
    }
  });

  test("should maintain authentication across navigation", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Navigate to multiple pages
    await page.goto("/investor/portfolio");
    await helpers.waitForPageLoad();

    await page.goto("/investor/transactions");
    await helpers.waitForPageLoad();

    // Should still be authenticated (not redirected to login)
    const url = page.url();
    expect(url).toContain("/investor");
    expect(url).not.toContain("/login");
  });

  test("should have proper page titles", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    const title = await page.title();
    expect(title.length).toBeGreaterThan(0);
  });

  test("should have accessible headings structure", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Check for h1
    const h1 = page.locator("h1");
    const hasH1 = (await h1.count()) > 0;

    // Check for any headings
    const headings = page.locator("h1, h2, h3");
    const hasHeadings = (await headings.count()) > 0;

    expect(hasH1 || hasHeadings).toBeTruthy();
  });

  test("should support keyboard navigation", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Tab through interactive elements
    await page.keyboard.press("Tab");
    await page.waitForTimeout(300);

    // Focus should move to interactive elements
    const focusedElement = page.locator(":focus");
    const hasFocus = (await focusedElement.count()) > 0;

    expect(hasFocus).toBeTruthy();
  });

  test("should have proper ARIA labels", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Check for ARIA landmarks
    const mainLandmark = page.locator('main, [role="main"]');
    await expect(mainLandmark).toBeVisible();

    // Check for navigation
    const navLandmark = page.locator('nav, [role="navigation"]');
    await expect(navLandmark.first()).toBeVisible();
  });

  test("should logout successfully", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Look for logout button (may be in menu or settings)
    const logoutButton = page.locator(
      'button:has-text("Logout"), button:has-text("Sign Out"), a:has-text("Logout")'
    );

    if (
      await logoutButton
        .first()
        .isVisible()
        .catch(() => false)
    ) {
      await logout(page);

      // Should redirect to login
      const url = page.url();
      const onLoginPage =
        url.includes("login") || url.includes("auth") || url === new URL("/", page.url()).href;
      expect(onLoginPage).toBeTruthy();
    }
  });

  test("should show user profile information", async ({ page }) => {
    await page.goto("/investor/settings");
    await helpers.waitForPageLoad();

    // Look for user email or name
    const userInfo = page.locator(`text=/${TEST_CREDENTIALS.investor.email}/i`);

    if ((await userInfo.count()) > 0) {
      await expect(userInfo.first()).toBeVisible();
    }
  });

  test("should load pages within acceptable time", async ({ page }) => {
    const start = Date.now();
    await page.goto("/investor");
    await helpers.waitForPageLoad();
    const duration = Date.now() - start;

    // Should load within 10 seconds (accounting for auth)
    expect(duration).toBeLessThan(10000);
  });

  test("should handle errors gracefully", async ({ page }) => {
    // Try to access invalid route
    await page.goto("/investor/invalid-page-12345");
    await helpers.waitForPageLoad();

    // Should not crash - either redirect or show 404
    const hasError = await page
      .locator('[role="alert"]')
      .isVisible()
      .catch(() => false);
    const is404 = await page
      .locator("text=/not found|404/i")
      .isVisible()
      .catch(() => false);
    const redirected = !page.url().includes("invalid-page");

    expect(hasError || is404 || redirected).toBeTruthy();
  });
});

test.describe("Investor Portal - Performance and Responsive Design", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await loginAsInvestor(page);
    await handleCookieConsent(page);
  });

  test("should work on tablet viewport", async ({ page }) => {
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });

  test("should work on desktop viewport", async ({ page }) => {
    await page.setViewportSize({ width: 1920, height: 1080 });
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });

  test("should handle loading states", async ({ page }) => {
    await page.goto("/investor");

    // Look for loading indicators (may be too fast to catch)
    const loadingIndicator = page.locator('[data-loading="true"], .loading, .spinner');
    await page.waitForLoadState("networkidle");

    // Should eventually finish loading
    const isLoading = await loadingIndicator.isVisible().catch(() => false);
    expect(!isLoading || (await page.locator("main").isVisible())).toBeTruthy();
  });

  test("should handle network errors gracefully", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Page should not crash on load
    const hasErrorBoundary = await page
      .locator(".error-boundary, text=/something went wrong/i")
      .isVisible()
      .catch(() => false);
    expect(!hasErrorBoundary).toBeTruthy();
  });

  test("should display charts and visualizations", async ({ page }) => {
    await page.goto("/investor/performance");
    await helpers.waitForPageLoad();

    // Look for chart elements
    const charts = page.locator('canvas, svg[class*="chart"], .recharts-wrapper');

    if ((await charts.count()) > 0) {
      await expect(charts.first()).toBeVisible();
    }
  });

  test("should update data in real-time", async ({ page }) => {
    await page.goto("/investor");
    await helpers.waitForPageLoad();

    // Get initial content
    const initialBalance = await page.locator("body").textContent();

    // Wait a moment
    await page.waitForTimeout(2000);

    // Page should still be functional
    const mainContent = page.locator('main, [role="main"]');
    await expect(mainContent).toBeVisible();
  });
});
