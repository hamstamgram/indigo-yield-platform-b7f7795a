import { test, expect, devices } from "@playwright/test";

const BASE_URL = "http://localhost:8080";

// Test on both desktop and mobile
const testDevices = [
  { name: "Desktop", viewport: { width: 1440, height: 900 } },
  { name: "iPhone 15 Pro", device: devices["iPhone 15 Pro"] },
];

test.describe("Core Product Pages", () => {
  testDevices.forEach(({ name, viewport, device }) => {
    test.describe(`${name} Tests`, () => {
      test.use(device || { viewport });

      test.beforeEach(async ({ page }) => {
        // Mock authentication - you'll need to implement actual auth in production
        await page.goto(`${BASE_URL}/login`);
        // Add login steps here when auth is ready
      });

      test("Dashboard page loads with KPI cards", async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`);

        // Wait for KPI cards to load
        await page.waitForSelector('[data-testid="kpi-card"]', { timeout: 10000 });

        // Check for MTD, QTD, YTD, ITD cards
        const kpiTitles = ["Month to Date", "Quarter to Date", "Year to Date", "Inception to Date"];
        for (const title of kpiTitles) {
          await expect(page.locator(`text=${title}`).first()).toBeVisible();
        }

        // Check for portfolio value
        await expect(page.locator("text=Total Portfolio Value").first()).toBeVisible();

        // Take screenshot
        await page.screenshot({
          path: `artifacts/dashboard-${name.toLowerCase().replace(" ", "-")}.png`,
          fullPage: true,
        });

        // Check for no console errors
        const consoleErrors = [];
        page.on("console", (msg) => {
          if (msg.type() === "error") {
            consoleErrors.push(msg.text());
          }
        });

        expect(consoleErrors).toHaveLength(0);
      });

      test("Statements page loads and handles empty state", async ({ page }) => {
        await page.goto(`${BASE_URL}/statements`);

        // Wait for page to load
        await page.waitForSelector('h1:has-text("Statements")', { timeout: 10000 });

        // Check for either empty state or statements table
        const hasStatements = await page
          .locator("table")
          .isVisible()
          .catch(() => false);

        if (!hasStatements) {
          // Check empty state
          await expect(page.locator("text=No statements yet")).toBeVisible();
        } else {
          // Check table headers
          await expect(page.locator('th:has-text("Period")')).toBeVisible();
          await expect(page.locator('th:has-text("Asset")')).toBeVisible();
          await expect(page.locator('th:has-text("Ending Balance")')).toBeVisible();
        }

        // Take screenshot
        await page.screenshot({
          path: `artifacts/statements-${name.toLowerCase().replace(" ", "-")}.png`,
          fullPage: true,
        });
      });

      test("Transactions page loads with filters", async ({ page }) => {
        await page.goto(`${BASE_URL}/transactions`);

        // Wait for page to load
        await page.waitForSelector('h1:has-text("Transactions")', { timeout: 10000 });

        // Check for filter section
        await expect(page.locator("text=Filters").first()).toBeVisible();

        // Check for filter controls
        await expect(page.locator("text=Asset").first()).toBeVisible();
        await expect(page.locator("text=Type").first()).toBeVisible();
        await expect(page.locator("text=Date").first()).toBeVisible();
        await expect(page.locator("text=Search").first()).toBeVisible();

        // Check for transactions table
        await expect(page.locator("text=Transaction History").first()).toBeVisible();

        // Test filter interaction (click asset dropdown)
        const assetDropdown = page.locator('button:has-text("All assets")').first();
        if (await assetDropdown.isVisible()) {
          await assetDropdown.click();
          // Check dropdown opened
          await expect(page.locator('[role="option"]').first()).toBeVisible();
          await page.keyboard.press("Escape"); // Close dropdown
        }

        // Take screenshot
        await page.screenshot({
          path: `artifacts/transactions-${name.toLowerCase().replace(" ", "-")}.png`,
          fullPage: true,
        });
      });

      test("Navigation between pages works", async ({ page }) => {
        // Start at dashboard
        await page.goto(`${BASE_URL}/dashboard`);
        await page.waitForSelector("h1", { timeout: 10000 });

        // Navigate to statements
        const statementsLink = page.locator('a[href="/statements"]').first();
        if (await statementsLink.isVisible()) {
          await statementsLink.click();
          await expect(page).toHaveURL(`${BASE_URL}/statements`);
          await expect(page.locator('h1:has-text("Statements")')).toBeVisible();
        }

        // Navigate to transactions
        const transactionsLink = page.locator('a[href="/transactions"]').first();
        if (await transactionsLink.isVisible()) {
          await transactionsLink.click();
          await expect(page).toHaveURL(`${BASE_URL}/transactions`);
          await expect(page.locator('h1:has-text("Transactions")')).toBeVisible();
        }
      });

      test("Responsive layout adjusts properly", async ({ page }) => {
        await page.goto(`${BASE_URL}/dashboard`);

        // Check if mobile menu button exists on mobile
        if (name === "iPhone 15 Pro") {
          // Mobile specific checks
          const mobileMenuButton = page.locator('button[aria-label="Toggle menu"]');
          if (await mobileMenuButton.isVisible()) {
            await expect(mobileMenuButton).toBeVisible();
          }

          // Check cards stack vertically on mobile
          const kpiCards = page.locator('[data-testid="kpi-card"]');
          const count = await kpiCards.count();
          if (count > 0) {
            // Cards should be in a single column on mobile
            const firstCard = kpiCards.first();
            const lastCard = kpiCards.last();
            const firstBox = await firstCard.boundingBox();
            const lastBox = await lastCard.boundingBox();

            if (firstBox && lastBox) {
              // Check if cards are stacked (same x position, different y)
              expect(Math.abs(firstBox.x - lastBox.x)).toBeLessThan(10);
            }
          }
        } else {
          // Desktop specific checks
          // Check cards are in a grid on desktop
          const kpiCards = page.locator('[data-testid="kpi-card"]');
          const count = await kpiCards.count();
          if (count >= 2) {
            const firstCard = kpiCards.first();
            const secondCard = kpiCards.nth(1);
            const firstBox = await firstCard.boundingBox();
            const secondBox = await secondCard.boundingBox();

            if (firstBox && secondBox) {
              // Check if cards are side by side (different x position, same y)
              expect(firstBox.x).not.toBe(secondBox.x);
            }
          }
        }
      });
    });
  });
});

test.describe("Accessibility Tests", () => {
  test("Pages have proper heading hierarchy", async ({ page }) => {
    const pages = ["/dashboard", "/statements", "/transactions"];

    for (const path of pages) {
      await page.goto(`${BASE_URL}${path}`);

      // Check for h1
      const h1 = await page.locator("h1").count();
      expect(h1).toBeGreaterThan(0);

      // Check heading order (no h3 before h2, etc.)
      const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
      let lastLevel = 0;

      for (const heading of headings) {
        const tagName = await heading.evaluate((el) => el.tagName);
        const level = parseInt(tagName.substring(1));

        // Allow same level or one level deeper
        if (lastLevel > 0) {
          expect(level).toBeLessThanOrEqual(lastLevel + 1);
        }
        lastLevel = level;
      }
    }
  });

  test("Interactive elements are keyboard accessible", async ({ page }) => {
    await page.goto(`${BASE_URL}/transactions`);

    // Test tab navigation
    await page.keyboard.press("Tab");

    // Check that focused element is visible
    const focusedElement = await page.locator(":focus");
    await expect(focusedElement).toBeVisible();

    // Test filter dropdown keyboard interaction
    const assetDropdown = page.locator('button:has-text("All assets")').first();
    if (await assetDropdown.isVisible()) {
      await assetDropdown.focus();
      await page.keyboard.press("Enter");

      // Check dropdown opened
      await expect(page.locator('[role="option"]').first()).toBeVisible();

      // Navigate with arrow keys
      await page.keyboard.press("ArrowDown");
      await page.keyboard.press("Enter");

      // Check dropdown closed
      await expect(page.locator('[role="option"]').first()).not.toBeVisible();
    }
  });
});
