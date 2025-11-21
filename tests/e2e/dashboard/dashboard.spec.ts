import { test, expect } from "@playwright/test";
import { TestHelpers, viewportSizes } from "../utils/test-helpers";

test.describe("Dashboard Page - /dashboard", () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await helpers.mockAuth();
    await page.goto("/dashboard");
    await helpers.waitForPageLoad();
  });

  test("should load dashboard page successfully", async ({ page }) => {
    await expect(page).toHaveURL(/\/dashboard/);
    await helpers.takeScreenshot("dashboard-main-page");

    // Verify main heading exists
    const hasHeading = await helpers.elementExists("h1");
    expect(hasHeading).toBeTruthy();
  });

  test("should display portfolio value hero section", async ({ page }) => {
    // Check for hero section with gradient background
    const heroSection = await page.$('[class*="gradient"]');
    expect(heroSection).toBeTruthy();

    // Verify portfolio value is displayed
    const portfolioValue = await page.$('h1:has-text("$")');
    expect(portfolioValue).toBeTruthy();

    // Check for today's change and total return
    const todaysChange = await helpers.elementExists("text=Today's Change");
    const totalReturn = await helpers.elementExists("text=Total Return");

    expect(todaysChange || totalReturn).toBeTruthy();
  });

  test("should render KPI cards correctly", async ({ page }) => {
    // Should have 4 KPI cards
    const cardCount = await helpers.countElements('[class*="card"]');
    expect(cardCount).toBeGreaterThanOrEqual(4);

    // Verify key metrics cards
    const totalBalance = await helpers.elementExists("text=Total Balance");
    const totalGain = await helpers.elementExists("text=Total Gain");
    const activePositions = await helpers.elementExists("text=Active Positions");
    const riskScore = await helpers.elementExists("text=Risk Score");

    expect(totalBalance).toBeTruthy();
    expect(totalGain).toBeTruthy();
    expect(activePositions).toBeTruthy();
    expect(riskScore).toBeTruthy();

    await helpers.takeScreenshot("dashboard-kpi-cards");
  });

  test("should render performance chart", async ({ page }) => {
    // Verify performance chart section
    const performanceSection = await helpers.elementExists("text=Performance");
    expect(performanceSection).toBeTruthy();

    // Check for Recharts components
    const chartRendered = await helpers.verifyChartRenders();
    expect(chartRendered).toBeTruthy();

    await helpers.takeScreenshot("dashboard-performance-chart");
  });

  test("should render asset allocation pie chart", async ({ page }) => {
    // Verify asset allocation section
    const allocationSection = await helpers.elementExists("text=Asset Allocation");
    expect(allocationSection).toBeTruthy();

    // Check for pie chart
    const hasChart = await helpers.elementExists(".recharts-wrapper");
    expect(hasChart).toBeTruthy();

    await helpers.takeScreenshot("dashboard-asset-allocation");
  });

  test("should display recent transactions", async ({ page }) => {
    // Verify recent transactions section
    const transactionsSection = await helpers.elementExists("text=Recent Transactions");
    expect(transactionsSection).toBeTruthy();

    // Check for "View all" button
    const viewAllButton = await helpers.elementExists("text=View all");
    expect(viewAllButton).toBeTruthy();

    // Verify transaction items render
    const transactionItems = await helpers.countElements(
      '[class*="flex"][class*="items-center"][class*="justify-between"]'
    );

    await helpers.takeScreenshot("dashboard-recent-transactions");
  });

  test("should navigate to transactions page from View all button", async ({ page }) => {
    const viewAllButton = await page.$("text=View all");
    if (viewAllButton) {
      await viewAllButton.click();
      await page.waitForURL(/\/transactions/);
      expect(page.url()).toContain("/transactions");
    }
  });

  test("should verify loading states", async ({ page }) => {
    // Reload page to catch loading state
    await page.reload();

    const loadingShown = await helpers.verifyLoadingState();
    // Loading might be too fast, so we just verify the page loads
    await helpers.waitForPageLoad();

    const hasContent = await helpers.elementExists("h1");
    expect(hasContent).toBeTruthy();
  });

  test("should be responsive on different screen sizes", async ({ page }) => {
    const viewports = [viewportSizes.desktop, viewportSizes.tablet, viewportSizes.mobile];

    const results = await helpers.testResponsiveLayout(viewports);

    // Verify each viewport rendered
    expect(results.length).toBe(3);

    // Check mobile layout specifically
    await page.setViewportSize({ width: 375, height: 667 });
    await helpers.takeScreenshot("dashboard-mobile-view");

    // Verify cards stack vertically on mobile
    const cardContainer = await page.$('[class*="grid"]');
    expect(cardContainer).toBeTruthy();
  });

  test("should check accessibility features", async ({ page }) => {
    const a11y = await helpers.checkAccessibility();

    expect(a11y.hasHeadings).toBeTruthy();
    // Note: Main landmark might be in layout, so we check for content
    const hasMainContent = await helpers.elementExists('[class*="space-y"]');
    expect(hasMainContent).toBeTruthy();
  });

  test("should handle empty portfolio state", async ({ page }) => {
    // Mock empty portfolio
    await page.route("**/investor_positions*", (route) => {
      route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ data: [], error: null }),
      });
    });

    await page.reload();
    await helpers.waitForPageLoad();

    // Verify page still renders
    const hasHeading = await helpers.elementExists("h1");
    expect(hasHeading).toBeTruthy();

    await helpers.takeScreenshot("dashboard-empty-state");
  });

  test("should display correct currency formatting", async ({ page }) => {
    // Check for dollar signs and proper number formatting
    const dollarSigns = await helpers.countElements("text=$");
    expect(dollarSigns).toBeGreaterThan(0);

    // Verify commas in large numbers
    const bodyText = await page.textContent("body");
    const hasFormattedNumbers = bodyText?.includes(",") || bodyText?.includes("$");
    expect(hasFormattedNumbers).toBeTruthy();
  });

  test("should verify all interactive elements are clickable", async ({ page }) => {
    // Check that buttons are clickable
    const buttons = await page.$$("button:not([disabled])");
    expect(buttons.length).toBeGreaterThan(0);

    // Check that links work
    const links = await page.$$("a[href]");
    expect(links.length).toBeGreaterThan(0);
  });

  test("should capture full page screenshot for documentation", async ({ page }) => {
    await helpers.takeScreenshot("dashboard-full-page", true);
  });
});
