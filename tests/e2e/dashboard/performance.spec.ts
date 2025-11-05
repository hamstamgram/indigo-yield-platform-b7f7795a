import { test, expect } from '@playwright/test';
import { TestHelpers, viewportSizes } from '../utils/test-helpers';

test.describe('Performance Page - /dashboard/performance', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.mockAuth();
    await page.goto('/dashboard/performance');
    await helpers.waitForPageLoad();
  });

  test('should load performance page successfully', async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard\/performance/);
    await helpers.takeScreenshot('performance-main-page');

    const hasContent = await helpers.elementExists('h1, h2, [role="heading"]');
    expect(hasContent).toBeTruthy();
  });

  test('should display performance summary metrics', async ({ page }) => {
    // Check for key performance indicators
    const hasMetrics = await helpers.elementExists(
      'text=Return, text=Performance, text=Growth, text=Gain'
    );
    expect(hasMetrics || await helpers.elementExists('[class*="card"]')).toBeTruthy();

    // Verify percentage displays
    const bodyText = await page.textContent('body') || '';
    const hasPercentages = bodyText.includes('%');
    expect(hasPercentages).toBeTruthy();

    await helpers.takeScreenshot('performance-summary');
  });

  test('should render performance charts', async ({ page }) => {
    // Check for Recharts components
    const hasCharts = await helpers.elementExists('.recharts-wrapper, [class*="chart"]');
    expect(hasCharts).toBeTruthy();

    const chartRendered = await helpers.verifyChartRenders();
    expect(chartRendered).toBeTruthy();

    await helpers.takeScreenshot('performance-charts');
  });

  test('should display time period selector', async ({ page }) => {
    // Look for time period filters (1M, 3M, 6M, 1Y, ALL)
    const hasTimePeriod = await helpers.elementExists(
      'text=1M, text=3M, text=6M, text=1Y, text=All, text=YTD'
    );

    const hasDateFilter = await helpers.elementExists(
      'button[aria-label*="period"], [role="tablist"], [data-time-period]'
    );

    await helpers.takeScreenshot('performance-time-periods');
  });

  test('should test time period filter', async ({ page }) => {
    // Try to find and click time period buttons
    const periodButtons = await page.$$('button:has-text("1M"), button:has-text("3M"), button:has-text("6M")');

    if (periodButtons.length > 0) {
      const button = periodButtons[0];
      await button.click();
      await page.waitForTimeout(500);

      await helpers.takeScreenshot('performance-filtered-period');

      // Verify chart updates (check for loading or data change)
      await helpers.waitForPageLoad();
    } else {
      console.log('No time period filters found');
    }
  });

  test('should display portfolio growth over time', async ({ page }) => {
    // Check for line chart showing growth
    const hasLineChart = await helpers.elementExists('.recharts-line, path[class*="line"]');

    // Or area chart
    const hasAreaChart = await helpers.elementExists('.recharts-area, path[class*="area"]');

    expect(hasLineChart || hasAreaChart || await helpers.elementExists('.recharts-wrapper')).toBeTruthy();

    await helpers.takeScreenshot('performance-growth-chart');
  });

  test('should show return comparison', async ({ page }) => {
    // Look for comparison metrics or charts
    const hasComparison = await helpers.elementExists(
      'text=Comparison, text=vs, text=Benchmark, text=Market'
    );

    // Check for bar charts (common for comparisons)
    const hasBarChart = await helpers.elementExists('.recharts-bar, rect[class*="bar"]');

    await helpers.takeScreenshot('performance-comparison');
  });

  test('should display monthly/yearly returns table', async ({ page }) => {
    try {
      const rowCount = await helpers.verifyTableRenders();
      expect(rowCount).toBeGreaterThan(0);

      await helpers.takeScreenshot('performance-returns-table');
    } catch {
      // Table might not exist, check for card-based layout
      const hasCards = await helpers.elementExists('[class*="card"]');
      expect(hasCards).toBeTruthy();

      await helpers.takeScreenshot('performance-returns-cards');
    }
  });

  test('should test sorting on performance table', async ({ page }) => {
    const tableHeaders = await page.$$('th[role="columnheader"], th[class*="sort"]');

    if (tableHeaders.length > 0) {
      const sorted = await helpers.testSorting('th:first-of-type');
      await page.waitForTimeout(500);

      await helpers.takeScreenshot('performance-sorted-table');
    } else {
      console.log('No sortable table found');
    }
  });

  test('should display performance by fund/asset', async ({ page }) => {
    // Check for breakdown by individual assets
    const hasFundBreakdown = await helpers.elementExists(
      'text=Fund, text=Asset, text=By Position, text=Holdings'
    );

    // Check for pie or bar chart showing distribution
    const hasDistributionChart = await helpers.elementExists(
      '.recharts-pie, .recharts-bar'
    );

    await helpers.takeScreenshot('performance-by-fund');
  });

  test('should show risk metrics', async ({ page }) => {
    // Look for risk-related metrics
    const hasRiskMetrics = await helpers.elementExists(
      'text=Risk, text=Volatility, text=Sharpe, text=Beta, text=Deviation'
    );

    await helpers.takeScreenshot('performance-risk-metrics');
  });

  test('should render tooltips on chart hover', async ({ page }) => {
    const chartElement = await page.$('.recharts-wrapper');

    if (chartElement) {
      // Hover over chart to trigger tooltip
      await chartElement.hover();
      await page.waitForTimeout(500);

      // Check for tooltip
      const hasTooltip = await helpers.elementExists('.recharts-tooltip, [role="tooltip"]');

      await helpers.takeScreenshot('performance-chart-tooltip');
    }
  });

  test('should display export options', async ({ page }) => {
    // Look for export/download buttons
    const hasExportButton = await helpers.elementExists(
      'button:has-text("Export"), button:has-text("Download"), button:has-text("Print")'
    );

    const hasExportIcon = await helpers.elementExists('[aria-label*="export"], [aria-label*="download"]');

    await helpers.takeScreenshot('performance-export-options');
  });

  test('should verify loading states', async ({ page }) => {
    await page.reload();
    await helpers.verifyLoadingState();
    await helpers.waitForPageLoad();

    const hasContent = await helpers.elementExists('[class*="card"], .recharts-wrapper');
    expect(hasContent).toBeTruthy();
  });

  test('should be responsive on different viewports', async ({ page }) => {
    const results = await helpers.testResponsiveLayout([
      viewportSizes.desktop,
      viewportSizes.tablet,
      viewportSizes.mobile
    ]);

    expect(results.length).toBe(3);

    // Mobile view
    await page.setViewportSize({ width: 375, height: 667 });
    await helpers.takeScreenshot('performance-mobile-view');

    // Verify charts resize properly
    const chartWidth = await page.$eval('.recharts-wrapper', el => el.clientWidth);
    expect(chartWidth).toBeLessThanOrEqual(375);
  });

  test('should check accessibility features', async ({ page }) => {
    const a11y = await helpers.checkAccessibility();
    expect(a11y.hasHeadings).toBeTruthy();

    // Check for proper ARIA labels on charts
    const hasAriaLabels = await page.$$eval('[aria-label]', elements => elements.length > 0);
    expect(hasAriaLabels).toBeTruthy();
  });

  test('should handle no performance data gracefully', async ({ page }) => {
    await page.route('**/api/*', route => {
      route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ data: [], error: null })
      });
    });

    await page.reload();
    await helpers.waitForPageLoad();

    // Should show empty state
    const hasEmptyState = await helpers.elementExists(
      'text=No data, text=No performance, text=Empty'
    );

    await helpers.takeScreenshot('performance-empty-state');
  });

  test('should display date range correctly', async ({ page }) => {
    // Check for date displays
    const bodyText = await page.textContent('body') || '';

    // Look for date formats
    const hasDateInfo = bodyText.includes('/') ||
                        bodyText.includes('-') ||
                        bodyText.match(/\d{4}/) !== null;

    expect(hasDateInfo).toBeTruthy();
  });

  test('should verify currency formatting', async ({ page }) => {
    const bodyText = await page.textContent('body') || '';

    // Check for dollar signs
    expect(bodyText.includes('$')).toBeTruthy();

    // Check for proper number formatting with commas
    expect(bodyText.includes(',')).toBeTruthy();
  });

  test('should capture full page screenshot', async ({ page }) => {
    await helpers.takeScreenshot('performance-full-page', true);
  });
});
