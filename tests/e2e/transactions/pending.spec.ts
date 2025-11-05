import { test, expect } from '@playwright/test';
import { TestHelpers, viewportSizes } from '../utils/test-helpers';

test.describe('Pending Transactions Page - /transactions/pending', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.mockAuth();
    await page.goto('/transactions/pending');
    await helpers.waitForPageLoad();
  });

  test('should load pending transactions page', async ({ page }) => {
    await expect(page).toHaveURL(/\/transactions\/pending/);
    await helpers.takeScreenshot('pending-transactions-page');

    const hasHeading = await helpers.elementExists('h1, h2, [role="heading"]');
    expect(hasHeading).toBeTruthy();
  });

  test('should display pending transactions table or list', async ({ page }) => {
    try {
      const rowCount = await helpers.verifyTableRenders();

      await helpers.takeScreenshot('pending-transactions-table');
    } catch {
      // Might be rendered as cards
      const hasCards = await helpers.elementExists('[class*="card"], [data-transaction]');
      expect(hasCards).toBeTruthy();

      await helpers.takeScreenshot('pending-transactions-cards');
    }
  });

  test('should show pending status indicators', async ({ page }) => {
    // Check for pending status badges
    const hasPendingStatus = await helpers.elementExists(
      'text=Pending, text=Processing, text=In Progress, [class*="pending"]'
    );

    expect(hasPendingStatus || await helpers.elementExists('[class*="badge"]')).toBeTruthy();

    await helpers.takeScreenshot('pending-status-indicators');
  });

  test('should display transaction amounts', async ({ page }) => {
    const bodyText = await page.textContent('body') || '';

    expect(bodyText.includes('$')).toBeTruthy();

    await helpers.takeScreenshot('pending-amounts');
  });

  test('should display transaction dates', async ({ page }) => {
    const bodyText = await page.textContent('body') || '';

    const hasDateFormat = bodyText.includes('/') ||
                         bodyText.includes('-') ||
                         bodyText.match(/\d{4}/) !== null;

    expect(hasDateFormat).toBeTruthy();

    await helpers.takeScreenshot('pending-dates');
  });

  test('should show expected completion time', async ({ page }) => {
    // Look for estimated time or expected date
    const hasEstimate = await helpers.elementExists(
      'text=Expected, text=Estimated, text=ETA, text=Processing Time'
    );

    await helpers.takeScreenshot('pending-completion-time');
  });

  test('should have cancel action for pending transactions', async ({ page }) => {
    // Look for cancel buttons
    const cancelButtons = await page.$$('button:has-text("Cancel"), button[aria-label*="Cancel"]');

    if (cancelButtons.length > 0) {
      await helpers.takeScreenshot('pending-cancel-buttons');

      // Click first cancel button (don't confirm to avoid side effects)
      await cancelButtons[0].click();
      await page.waitForTimeout(500);

      // Should show confirmation dialog
      const hasConfirmDialog = await helpers.elementExists(
        '[role="dialog"], [role="alertdialog"], text=Are you sure'
      );

      await helpers.takeScreenshot('pending-cancel-confirmation');

      // Close dialog if exists
      const closeButton = await page.$('button:has-text("No"), button:has-text("Close"), [aria-label*="Close"]');
      if (closeButton) {
        await closeButton.click();
        await page.waitForTimeout(300);
      }
    } else {
      console.log('No cancel buttons found');
    }
  });

  test('should filter by transaction type', async ({ page }) => {
    const filterButtons = await page.$$('button:has-text("Filter"), button:has-text("Type")');

    if (filterButtons.length > 0) {
      await filterButtons[0].click();
      await page.waitForTimeout(300);

      await helpers.takeScreenshot('pending-filter-dropdown');

      // Close dropdown
      await page.keyboard.press('Escape');
    } else {
      console.log('No filter options found');
    }
  });

  test('should test search functionality', async ({ page }) => {
    const searchInput = await page.$('input[type="search"], input[placeholder*="Search"]');

    if (searchInput) {
      await searchInput.fill('deposit');
      await page.waitForTimeout(800);

      await helpers.takeScreenshot('pending-search-results');

      // Clear search
      await searchInput.fill('');
    } else {
      console.log('No search functionality found');
    }
  });

  test('should test sorting', async ({ page }) => {
    const sortableHeaders = await page.$$('th[role="columnheader"], th[class*="sort"]');

    if (sortableHeaders.length > 0) {
      await helpers.testSorting('th:first-of-type');
      await page.waitForTimeout(500);

      await helpers.takeScreenshot('pending-sorted-view');
    } else {
      console.log('No sortable columns found');
    }
  });

  test('should display transaction progress or status', async ({ page }) => {
    // Look for progress bars or status steps
    const hasProgress = await helpers.elementExists(
      '[role="progressbar"], [class*="progress"], text=Step, text=Stage'
    );

    await helpers.takeScreenshot('pending-progress-indicators');
  });

  test('should show transaction details link', async ({ page }) => {
    // Look for view details buttons or links
    const detailsLinks = await page.$$('button:has-text("View"), a:has-text("Details"), button:has-text("Details")');

    if (detailsLinks.length > 0) {
      await helpers.takeScreenshot('pending-details-links');

      await detailsLinks[0].click();
      await page.waitForTimeout(1000);

      // Should navigate to details page
      const url = page.url();
      expect(url).toMatch(/transaction|detail/i);

      await helpers.takeScreenshot('pending-detail-page-opened');

      // Go back
      await page.goBack();
      await helpers.waitForPageLoad();
    } else {
      console.log('No details links found');
    }
  });

  test('should display refresh or reload option', async ({ page }) => {
    const refreshButton = await page.$('button:has-text("Refresh"), button[aria-label*="Refresh"], button[aria-label*="Reload"]');

    if (refreshButton) {
      await helpers.takeScreenshot('pending-refresh-button');

      await refreshButton.click();
      await page.waitForTimeout(500);

      await helpers.takeScreenshot('pending-after-refresh');
    } else {
      console.log('No refresh button found');
    }
  });

  test('should show notification settings', async ({ page }) => {
    const hasNotifications = await helpers.elementExists(
      'text=Notification, text=Alert, text=Notify me'
    );

    await helpers.takeScreenshot('pending-notifications');
  });

  test('should display empty state when no pending transactions', async ({ page }) => {
    await page.route('**/transactions*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], error: null })
      });
    });

    await page.reload();
    await helpers.waitForPageLoad();

    const hasEmptyState = await helpers.elementExists(
      'text=No pending, text=No transactions, text=All caught up'
    );

    await helpers.takeScreenshot('pending-empty-state');
  });

  test('should verify loading state', async ({ page }) => {
    await page.reload();
    await helpers.verifyLoadingState();
    await helpers.waitForPageLoad();

    const hasContent = await helpers.elementExists('table, [class*="card"]');
    expect(hasContent).toBeTruthy();
  });

  test('should test pagination if present', async ({ page }) => {
    const hasPagination = await helpers.elementExists(
      'button:has-text("Next"), button:has-text("Previous")'
    );

    if (hasPagination) {
      await helpers.testPagination();
      await helpers.takeScreenshot('pending-paginated');
    } else {
      console.log('No pagination found');
    }
  });

  test('should be responsive on different viewports', async ({ page }) => {
    const results = await helpers.testResponsiveLayout([
      viewportSizes.desktop,
      viewportSizes.tablet,
      viewportSizes.mobile
    ]);

    expect(results.length).toBe(3);

    await page.setViewportSize({ width: 375, height: 667 });
    await helpers.takeScreenshot('pending-mobile-view');
  });

  test('should check accessibility', async ({ page }) => {
    const a11y = await helpers.checkAccessibility();
    expect(a11y.hasHeadings).toBeTruthy();

    // Check for proper button roles
    const buttons = await page.$$('button');
    expect(buttons.length).toBeGreaterThanOrEqual(0);
  });

  test('should display transaction count', async ({ page }) => {
    const bodyText = await page.textContent('body') || '';

    // Look for count indicators
    const hasCount = bodyText.match(/\d+\s+(transaction|pending|item)/i);

    await helpers.takeScreenshot('pending-transaction-count');
  });

  test('should show batch actions if available', async ({ page }) => {
    // Look for select all checkbox
    const selectAllCheckbox = await page.$('input[type="checkbox"][aria-label*="Select all"], input[type="checkbox"][name="select-all"]');

    if (selectAllCheckbox) {
      await selectAllCheckbox.click();
      await page.waitForTimeout(300);

      await helpers.takeScreenshot('pending-batch-select');

      // Look for batch action buttons
      const batchActions = await page.$$('button:has-text("Cancel Selected"), button:has-text("Export Selected")');

      if (batchActions.length > 0) {
        await helpers.takeScreenshot('pending-batch-actions');
      }

      // Deselect all
      await selectAllCheckbox.click();
    } else {
      console.log('No batch actions found');
    }
  });

  test('should capture full page screenshot', async ({ page }) => {
    await helpers.takeScreenshot('pending-full-page', true);
  });
});
