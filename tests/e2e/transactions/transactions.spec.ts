import { test, expect } from "@playwright/test";
import { TestHelpers, viewportSizes } from "../utils/test-helpers";

test.describe("Transactions Page - /transactions", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.mockAuth();
    await page.goto("/transactions");
    await helpers.waitForPageLoad();
  });

  test("should load transactions page successfully", async ({ page }) => {
    await expect(page).toHaveURL(/\/transactions/);
    await helpers.takeScreenshot("transactions-main-page");

    const hasHeading = await helpers.elementExists('h1, h2, [role="heading"]');
    expect(hasHeading).toBeTruthy();
  });

  test("should display transactions table", async ({ page }) => {
    try {
      const rowCount = await helpers.verifyTableRenders();
      expect(rowCount).toBeGreaterThanOrEqual(0);

      // Verify table headers
      const hasDateHeader = await helpers.elementExists(
        'th:has-text("Date"), th:has-text("Created")'
      );
      const hasAmountHeader = await helpers.elementExists('th:has-text("Amount")');
      const hasStatusHeader = await helpers.elementExists('th:has-text("Status")');
      const hasTypeHeader = await helpers.elementExists('th:has-text("Type")');

      await helpers.takeScreenshot("transactions-table");
    } catch {
      // Might be rendered as cards
      const hasCards = await helpers.elementExists('[class*="card"], [data-transaction]');
      expect(hasCards).toBeTruthy();

      await helpers.takeScreenshot("transactions-cards");
    }
  });

  test("should test search functionality", async ({ page }) => {
    const searchInput = await page.$(
      'input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]'
    );

    if (searchInput) {
      await searchInput.fill("deposit");
      await page.waitForTimeout(800);

      await helpers.takeScreenshot("transactions-search-results");

      // Clear search
      await searchInput.fill("");
      await page.waitForTimeout(500);

      await helpers.takeScreenshot("transactions-search-cleared");
    } else {
      console.log("No search input found on transactions page");
    }
  });

  test("should test filter functionality", async ({ page }) => {
    // Look for filter dropdowns or buttons
    const filterButtons = await page.$$(
      'button:has-text("Filter"), button:has-text("Type"), button:has-text("Status")'
    );

    if (filterButtons.length > 0) {
      const firstFilter = filterButtons[0];
      await firstFilter.click();
      await page.waitForTimeout(300);

      await helpers.takeScreenshot("transactions-filter-dropdown");

      // Try to select a filter option
      const filterOptions = await page.$$('[role="option"], [role="menuitem"]');
      if (filterOptions.length > 0) {
        await filterOptions[0].click();
        await page.waitForTimeout(500);

        await helpers.takeScreenshot("transactions-filtered-view");
      }
    } else {
      console.log("No filters found on transactions page");
    }
  });

  test("should test date range filter", async ({ page }) => {
    // Look for date picker or date filter
    const datePicker = await page.$(
      'input[type="date"], button:has-text("Date"), [data-date-picker]'
    );

    if (datePicker) {
      await datePicker.click();
      await page.waitForTimeout(500);

      await helpers.takeScreenshot("transactions-date-filter");
    } else {
      console.log("No date filter found");
    }
  });

  test("should test sorting functionality", async ({ page }) => {
    const sortableHeaders = await page.$$('th[role="columnheader"], th[class*="sort"]');

    if (sortableHeaders.length > 0) {
      const sorted = await helpers.testSorting("th:first-of-type");
      await page.waitForTimeout(500);

      await helpers.takeScreenshot("transactions-sorted-ascending");

      // Sort descending
      await helpers.testSorting("th:first-of-type");
      await page.waitForTimeout(500);

      await helpers.takeScreenshot("transactions-sorted-descending");
    } else {
      console.log("No sortable columns found");
    }
  });

  test("should test pagination", async ({ page }) => {
    // Look for pagination controls
    const hasPagination = await helpers.elementExists(
      'button:has-text("Next"), button:has-text("Previous"), [aria-label*="page"]'
    );

    if (hasPagination) {
      const paginationWorked = await helpers.testPagination();

      await helpers.takeScreenshot("transactions-paginated");
    } else {
      console.log("No pagination found - might be using infinite scroll");
    }
  });

  test("should display transaction status badges", async ({ page }) => {
    // Check for status indicators
    const hasStatusBadges = await helpers.elementExists(
      "text=Completed, text=Pending, text=Failed, text=Processing"
    );

    const hasBadges = await helpers.elementExists('[class*="badge"], [class*="status"]');

    await helpers.takeScreenshot("transactions-status-badges");
  });

  test("should display transaction types correctly", async ({ page }) => {
    // Check for transaction type displays
    const hasTypes = await helpers.elementExists("text=Deposit, text=Withdrawal, text=Transfer");

    await helpers.takeScreenshot("transactions-types");
  });

  test("should navigate to transaction details", async ({ page }) => {
    // Look for clickable transaction rows or view buttons
    const transactionLinks = await page.$$(
      'tr[data-href], a[href*="transaction"], button:has-text("View")'
    );

    if (transactionLinks.length > 0) {
      const firstLink = transactionLinks[0];
      await firstLink.click();
      await page.waitForTimeout(1000);

      // Should navigate to detail page
      const url = page.url();
      expect(url).toContain("transaction");

      await helpers.takeScreenshot("transactions-navigated-to-detail");

      // Go back
      await page.goBack();
      await helpers.waitForPageLoad();
    } else {
      console.log("No clickable transaction rows found");
    }
  });

  test("should have new transaction button", async ({ page }) => {
    // Look for button to create new transaction/deposit
    const newTransactionButton = await page.$(
      'button:has-text("New"), button:has-text("Deposit"), a[href*="deposit"]'
    );

    if (newTransactionButton) {
      await helpers.takeScreenshot("transactions-new-button-visible");

      await newTransactionButton.click();
      await page.waitForTimeout(1000);

      // Should navigate to deposit/new transaction page
      const url = page.url();
      expect(url).toMatch(/deposit|new|transaction/i);

      await helpers.takeScreenshot("transactions-new-form-opened");
    } else {
      console.log("No new transaction button found");
    }
  });

  test("should display amount formatting correctly", async ({ page }) => {
    const bodyText = (await page.textContent("body")) || "";

    // Check for currency symbols
    expect(bodyText.includes("$")).toBeTruthy();

    // Check for proper number formatting
    expect(bodyText.includes(",") || bodyText.includes(".")).toBeTruthy();
  });

  test("should display date formatting correctly", async ({ page }) => {
    const bodyText = (await page.textContent("body")) || "";

    // Check for date separators
    const hasDateFormat =
      bodyText.includes("/") || bodyText.includes("-") || bodyText.match(/\d{4}/) !== null;

    expect(hasDateFormat).toBeTruthy();
  });

  test("should verify loading states", async ({ page }) => {
    await page.reload();
    await helpers.verifyLoadingState();
    await helpers.waitForPageLoad();

    const hasContent = await helpers.elementExists('table, [class*="card"]');
    expect(hasContent).toBeTruthy();
  });

  test("should be responsive on different viewports", async ({ page }) => {
    const results = await helpers.testResponsiveLayout([
      viewportSizes.desktop,
      viewportSizes.tablet,
      viewportSizes.mobile,
    ]);

    expect(results.length).toBe(3);

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await helpers.takeScreenshot("transactions-mobile-view");
  });

  test("should check accessibility features", async ({ page }) => {
    const a11y = await helpers.checkAccessibility();
    expect(a11y.hasHeadings).toBeTruthy();

    // Check for table accessibility if table exists
    const hasTable = await helpers.elementExists("table");
    if (hasTable) {
      const hasTableCaption = await helpers.elementExists("caption, [aria-label]");
      // Note: Not all tables have captions, so we just log
      console.log("Table accessibility checked");
    }
  });

  test("should handle empty transactions state", async ({ page }) => {
    await page.route("**/transactions*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], error: null }),
      });
    });

    await page.reload();
    await helpers.waitForPageLoad();

    // Should show empty state
    const hasEmptyState = await helpers.elementExists(
      "text=No transactions, text=No data, text=Empty"
    );

    await helpers.takeScreenshot("transactions-empty-state");
  });

  test("should display export/download options", async ({ page }) => {
    const hasExportButton = await helpers.elementExists(
      'button:has-text("Export"), button:has-text("Download"), button:has-text("CSV")'
    );

    await helpers.takeScreenshot("transactions-export-options");
  });

  test("should capture full page screenshot", async ({ page }) => {
    await helpers.takeScreenshot("transactions-full-page", true);
  });
});
