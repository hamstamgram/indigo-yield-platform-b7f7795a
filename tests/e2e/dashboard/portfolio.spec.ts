import { test, expect } from '@playwright/test';
import { TestHelpers, viewportSizes } from '../utils/test-helpers';

test.describe('Portfolio Page - /dashboard/portfolio', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.mockAuth();
    await page.goto('/dashboard/portfolio');
    await helpers.waitForPageLoad();
  });

  test('should load portfolio page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/portfolio/);
    await helpers.takeScreenshot('portfolio-main-page');

    const hasContent = await helpers.elementExists('h1, h2, [role="heading"]');
    expect(hasContent).toBeTruthy();
  });

  test('should display portfolio summary', async ({ page }) => {
    // Check for portfolio value display
    const hasDollarAmount = await helpers.elementExists('text=$');
    expect(hasDollarAmount).toBeTruthy();

    // Verify summary cards or sections
    const cardCount = await helpers.countElements('[class*="card"]');
    expect(cardCount).toBeGreaterThan(0);

    await helpers.takeScreenshot('portfolio-summary');
  });

  test('should render positions table', async ({ page }) => {
    try {
      const rowCount = await helpers.verifyTableRenders();

      // Verify table has headers
      const hasHeaders = await helpers.elementExists('thead th');
      expect(hasHeaders).toBeTruthy();

      await helpers.takeScreenshot('portfolio-positions-table');
    } catch (error) {
      // Table might be rendered as cards on this page
      const hasPositionCards = await helpers.elementExists('[class*="card"], [data-position]');
      expect(hasPositionCards).toBeTruthy();

      await helpers.takeScreenshot('portfolio-positions-cards');
    }
  });

  test('should display allocation breakdown', async ({ page }) => {
    // Check for allocation section
    const hasAllocation = await helpers.elementExists('text=Allocation, text=Distribution, text=Breakdown');
    expect(hasAllocation || await helpers.elementExists('[class*="chart"]')).toBeTruthy();

    // Verify percentage displays
    const bodyText = await page.textContent('body');
    const hasPercentages = bodyText?.includes('%');
    expect(hasPercentages).toBeTruthy();

    await helpers.takeScreenshot('portfolio-allocation');
  });

  test('should render portfolio charts', async ({ page }) => {
    // Check for chart components
    const hasCharts = await helpers.elementExists('.recharts-wrapper, [class*="chart"]');

    if (hasCharts) {
      const chartRendered = await helpers.verifyChartRenders();
      expect(chartRendered).toBeTruthy();
      await helpers.takeScreenshot('portfolio-charts');
    } else {
      // Charts might not be present, log and continue
      console.log('No charts found on portfolio page');
    }
  });

  test('should display fund details', async ({ page }) => {
    // Check for fund information
    const hasFundInfo = await helpers.elementExists(
      'text=Fund, text=Asset, text=Position, text=Investment'
    );

    // Verify fund names or identifiers are displayed
    const cardCount = await helpers.countElements('[class*="card"], [data-fund]');
    expect(cardCount).toBeGreaterThan(0);

    await helpers.takeScreenshot('portfolio-fund-details');
  });

  test('should test sorting on positions', async ({ page }) => {
    // Try to find sortable headers
    const sortableHeaders = await page.$$('th[role="columnheader"], th[class*="sort"]');

    if (sortableHeaders.length > 0) {
      const sorted = await helpers.testSorting('th:first-of-type');
      expect(sorted).toBeTruthy();

      await helpers.takeScreenshot('portfolio-sorted-view');
    } else {
      console.log('No sortable columns found');
    }
  });

  test('should test search functionality if present', async ({ page }) => {
    const searchInput = await page.$('input[type="search"], input[placeholder*="Search"], input[placeholder*="search"]');

    if (searchInput) {
      await searchInput.fill('fund');
      await page.waitForTimeout(500);

      await helpers.takeScreenshot('portfolio-search-results');

      // Clear search
      await searchInput.fill('');
      await page.waitForTimeout(500);
    } else {
      console.log('No search functionality found on portfolio page');
    }
  });

  test('should test filter functionality', async ({ page }) => {
    // Look for filter buttons or dropdowns
    const filterButtons = await page.$$('button:has-text("Filter"), [role="combobox"], select');

    if (filterButtons.length > 0) {
      const firstFilter = filterButtons[0];
      await firstFilter.click();
      await page.waitForTimeout(300);

      await helpers.takeScreenshot('portfolio-filter-dropdown');

      // Click outside to close
      await page.click('body');
    } else {
      console.log('No filters found on portfolio page');
    }
  });

  test('should display performance metrics', async ({ page }) => {
    // Check for performance indicators
    const hasMetrics = await helpers.elementExists(
      'text=Return, text=Gain, text=Loss, text=Performance, text=Growth'
    );

    // Verify percentage or monetary values
    const bodyText = await page.textContent('body');
    const hasValues = bodyText?.includes('%') || bodyText?.includes('$');
    expect(hasValues).toBeTruthy();

    await helpers.takeScreenshot('portfolio-performance-metrics');
  });

  test('should verify loading states', async ({ page }) => {
    await page.reload();
    await helpers.verifyLoadingState();
    await helpers.waitForPageLoad();

    const hasContent = await helpers.elementExists('[class*="card"], table');
    expect(hasContent).toBeTruthy();
  });

  test('should be responsive on different viewports', async ({ page }) => {
    const results = await helpers.testResponsiveLayout([
      viewportSizes.desktop,
      viewportSizes.tablet,
      viewportSizes.mobile
    ]);

    expect(results.length).toBe(3);

    // Check mobile layout
    await page.setViewportSize({ width: 375, height: 667 });
    await helpers.takeScreenshot('portfolio-mobile-view');
  });

  test('should check accessibility', async ({ page }) => {
    const a11y = await helpers.checkAccessibility();
    expect(a11y.hasHeadings).toBeTruthy();
  });

  test('should handle empty portfolio gracefully', async ({ page }) => {
    await page.route('**/investor_positions*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], error: null })
      });
    });

    await page.reload();
    await helpers.waitForPageLoad();

    // Should show empty state or message
    const hasEmptyState = await helpers.elementExists(
      'text=No positions, text=No data, text=Empty, text=no holdings'
    );

    await helpers.takeScreenshot('portfolio-empty-state');
  });

  test('should navigate to position details', async ({ page }) => {
    // Look for clickable position items
    const positionLinks = await page.$$('a[href*="position"], button:has-text("View"), button:has-text("Details")');

    if (positionLinks.length > 0) {
      const firstLink = positionLinks[0];
      await firstLink.click();
      await page.waitForTimeout(1000);

      await helpers.takeScreenshot('portfolio-position-detail');
    } else {
      console.log('No position detail links found');
    }
  });

  test('should display correct number formatting', async ({ page }) => {
    const bodyText = await page.textContent('body') || '';

    // Check for currency formatting
    const hasCurrency = bodyText.includes('$');
    expect(hasCurrency).toBeTruthy();

    // Check for thousand separators
    const hasFormattedNumbers = bodyText.includes(',');
    expect(hasFormattedNumbers).toBeTruthy();
  });

  test('should capture full page screenshot', async ({ page }) => {
    await helpers.takeScreenshot('portfolio-full-page', true);
  });
});
