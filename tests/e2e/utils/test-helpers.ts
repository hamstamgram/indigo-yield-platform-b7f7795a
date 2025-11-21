import { Page, expect } from "@playwright/test";

export class TestHelpers {
  constructor(private page: Page) {}

  /**
   * Wait for page to be fully loaded including network idle
   */
  async waitForPageLoad() {
    await this.page.waitForLoadState("networkidle");
    await this.page.waitForLoadState("domcontentloaded");
  }

  /**
   * Take a screenshot with a descriptive name
   */
  async takeScreenshot(name: string, fullPage: boolean = true) {
    const screenshotPath = `test-reports/screenshots/${name.replace(/\s+/g, "-").toLowerCase()}.png`;
    await this.page.screenshot({
      path: screenshotPath,
      fullPage,
    });
    return screenshotPath;
  }

  /**
   * Wait for element to be visible
   */
  async waitForElement(selector: string, timeout: number = 10000) {
    await this.page.waitForSelector(selector, {
      state: "visible",
      timeout,
    });
  }

  /**
   * Check if element exists
   */
  async elementExists(selector: string): Promise<boolean> {
    try {
      const element = await this.page.$(selector);
      return element !== null;
    } catch {
      return false;
    }
  }

  /**
   * Verify table renders correctly
   */
  async verifyTableRenders(tableSelector: string = "table") {
    await this.waitForElement(tableSelector);
    const tableExists = await this.elementExists(tableSelector);
    expect(tableExists).toBeTruthy();

    // Check for table headers
    const headers = await this.page.$$(`${tableSelector} thead th`);
    expect(headers.length).toBeGreaterThan(0);

    // Check for table rows
    const rows = await this.page.$$(`${tableSelector} tbody tr`);
    return rows.length;
  }

  /**
   * Test search functionality
   */
  async testSearch(searchSelector: string, searchTerm: string, resultSelector: string) {
    await this.page.fill(searchSelector, searchTerm);
    await this.page.waitForTimeout(500); // Debounce

    const results = await this.page.$$(resultSelector);
    expect(results.length).toBeGreaterThan(0);

    return results.length;
  }

  /**
   * Test filter functionality
   */
  async testFilter(filterSelector: string, filterValue: string, resultSelector: string) {
    await this.page.click(filterSelector);
    await this.page.click(`text=${filterValue}`);
    await this.page.waitForTimeout(500);

    const results = await this.page.$$(resultSelector);
    return results.length;
  }

  /**
   * Verify chart renders (Recharts)
   */
  async verifyChartRenders(chartContainerSelector: string = ".recharts-wrapper") {
    await this.waitForElement(chartContainerSelector);

    // Check for SVG element
    const svg = await this.page.$(`${chartContainerSelector} svg`);
    expect(svg).toBeTruthy();

    // Check for chart data elements
    const hasDataElements = await this.elementExists(
      `${chartContainerSelector} path, ${chartContainerSelector} rect, ${chartContainerSelector} circle`
    );
    expect(hasDataElements).toBeTruthy();

    return true;
  }

  /**
   * Test pagination
   */
  async testPagination(nextButtonSelector: string = '[aria-label="Next page"]') {
    const hasNextButton = await this.elementExists(nextButtonSelector);
    if (hasNextButton) {
      const isDisabled = await this.page.getAttribute(nextButtonSelector, "disabled");
      if (!isDisabled) {
        await this.page.click(nextButtonSelector);
        await this.page.waitForTimeout(500);
        return true;
      }
    }
    return false;
  }

  /**
   * Test sorting functionality
   */
  async testSorting(columnHeaderSelector: string) {
    const header = await this.page.$(columnHeaderSelector);
    if (header) {
      await header.click();
      await this.page.waitForTimeout(500);

      // Click again to reverse sort
      await header.click();
      await this.page.waitForTimeout(500);

      return true;
    }
    return false;
  }

  /**
   * Check loading state
   */
  async verifyLoadingState(loadingSelector: string = '[data-loading="true"], .loading, .spinner') {
    // Wait for loading to appear
    try {
      await this.page.waitForSelector(loadingSelector, { timeout: 2000 });

      // Wait for loading to disappear
      await this.page.waitForSelector(loadingSelector, {
        state: "hidden",
        timeout: 10000,
      });
      return true;
    } catch {
      // Loading might be too fast to catch
      return false;
    }
  }

  /**
   * Test responsive layout
   */
  async testResponsiveLayout(viewports: Array<{ width: number; height: number; name: string }>) {
    const results = [];

    for (const viewport of viewports) {
      await this.page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      await this.page.waitForTimeout(500);

      const screenshot = await this.takeScreenshot(`responsive-${viewport.name}`, false);
      results.push({
        viewport: viewport.name,
        screenshot,
        width: viewport.width,
        height: viewport.height,
      });
    }

    return results;
  }

  /**
   * Verify error state
   */
  async verifyErrorState(errorSelector: string = '[role="alert"], .error, .alert-error') {
    const hasError = await this.elementExists(errorSelector);
    return hasError;
  }

  /**
   * Get element text content
   */
  async getTextContent(selector: string): Promise<string> {
    const element = await this.page.$(selector);
    if (element) {
      return (await element.textContent()) || "";
    }
    return "";
  }

  /**
   * Count elements matching selector
   */
  async countElements(selector: string): Promise<number> {
    const elements = await this.page.$$(selector);
    return elements.length;
  }

  /**
   * Verify card renders with content
   */
  async verifyCardRenders(cardSelector: string = ".card, [data-card]") {
    await this.waitForElement(cardSelector);
    const cards = await this.page.$$(cardSelector);
    expect(cards.length).toBeGreaterThan(0);
    return cards.length;
  }

  /**
   * Mock authentication
   */
  async mockAuth() {
    // Set mock auth tokens in localStorage
    await this.page.evaluate(() => {
      const mockAuth = {
        access_token: "mock-access-token",
        refresh_token: "mock-refresh-token",
        user: {
          id: "test-user-id",
          email: "test@example.com",
        },
      };
      localStorage.setItem("supabase.auth.token", JSON.stringify(mockAuth));
    });
  }

  /**
   * Wait for API response
   */
  async waitForAPIResponse(urlPattern: string | RegExp, timeout: number = 10000) {
    try {
      const response = await this.page.waitForResponse(
        (response) => {
          const url = response.url();
          if (typeof urlPattern === "string") {
            return url.includes(urlPattern);
          }
          return urlPattern.test(url);
        },
        { timeout }
      );
      return response;
    } catch {
      return null;
    }
  }

  /**
   * Check accessibility
   */
  async checkAccessibility() {
    // Check for basic accessibility attributes
    const hasMainLandmark = await this.elementExists('main, [role="main"]');
    const hasHeadings = await this.elementExists("h1, h2, h3");
    const hasProperButtonRoles = await this.page.$$eval("button", (buttons) =>
      buttons.every((btn) => btn.hasAttribute("type") || btn.hasAttribute("role"))
    );

    return {
      hasMainLandmark,
      hasHeadings,
      hasProperButtonRoles,
    };
  }
}

export const viewportSizes = {
  desktop: { width: 1920, height: 1080, name: "desktop" },
  laptop: { width: 1366, height: 768, name: "laptop" },
  tablet: { width: 768, height: 1024, name: "tablet" },
  mobile: { width: 375, height: 667, name: "mobile" },
};

export const mockTransactionData = {
  id: "txn-123456",
  amount: 5000,
  type: "deposit",
  status: "completed",
  date: "2025-01-15T10:30:00Z",
};

export const mockPortfolioData = {
  totalValue: 150000,
  totalGain: 15000,
  positions: [
    { id: "pos-1", name: "Fund A", value: 50000, allocation: 33.3 },
    { id: "pos-2", name: "Fund B", value: 60000, allocation: 40 },
    { id: "pos-3", name: "Fund C", value: 40000, allocation: 26.7 },
  ],
};
