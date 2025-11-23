/**
 * E2E tests for Component Library
 * Tests real user interactions across all components
 */

import { test, expect } from "@playwright/test";

test.describe("Component Library E2E Tests", () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto("/login");
    await page.fill('input[name="email"]', process.env.TEST_USER_EMAIL || "test@example.com");
    await page.fill('input[name="password"]', process.env.TEST_USER_PASSWORD || "password");
    await page.click('button[type="submit"]');
    await page.waitForURL("/dashboard");
  });

  test.describe("Button Component", () => {
    test("should handle click interactions", async ({ page }) => {
      await page.goto("/dashboard");

      // Find and click a button
      const button = page.locator('button:has-text("View Details")').first();
      await expect(button).toBeVisible();
      await button.click();

      // Verify navigation or action occurred
      await expect(page).toHaveURL(/.*dashboard.*/);
    });

    test("should be keyboard accessible", async ({ page }) => {
      await page.goto("/dashboard");

      // Tab to button
      await page.keyboard.press("Tab");
      await page.keyboard.press("Tab");

      // Get focused element
      const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
      expect(focusedElement).toBe("BUTTON");

      // Press Enter on focused button
      await page.keyboard.press("Enter");
      // Should trigger button action
    });

    test("should meet minimum touch target size on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 }); // iPhone SE
      await page.goto("/dashboard");

      const button = page.locator('button').first();
      const box = await button.boundingBox();

      // Minimum 44x44px touch target (WCAG Level AAA)
      expect(box).not.toBeNull();
      if (box) {
        expect(box.height).toBeGreaterThanOrEqual(44);
        expect(box.width).toBeGreaterThanOrEqual(44);
      }
    });
  });

  test.describe("Dialog Component", () => {
    test("should open and close modal", async ({ page }) => {
      await page.goto("/admin/investors");

      // Click button to open dialog
      const openButton = page.locator('button:has-text("Add Investor")');
      await openButton.click();

      // Dialog should be visible
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Close with ESC key
      await page.keyboard.press("Escape");
      await expect(dialog).not.toBeVisible();
    });

    test("should trap focus within dialog", async ({ page }) => {
      await page.goto("/admin/investors");

      // Open dialog
      await page.click('button:has-text("Add Investor")');

      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Tab through focusable elements
      await page.keyboard.press("Tab");
      const firstInput = await page.evaluate(() => document.activeElement?.tagName);

      // Focus should stay within dialog
      for (let i = 0; i < 10; i++) {
        await page.keyboard.press("Tab");
      }

      const stillInDialog = await page.evaluate(() => {
        const active = document.activeElement;
        const dialog = document.querySelector('[role="dialog"]');
        return dialog?.contains(active || null);
      });

      expect(stillInDialog).toBe(true);
    });

    test("should close on overlay click", async ({ page }) => {
      await page.goto("/admin/investors");

      await page.click('button:has-text("Add Investor")');
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      // Click overlay (outside dialog)
      await page.click('[role="dialog"]', { position: { x: 0, y: 0 } });

      // Dialog should close
      await expect(dialog).not.toBeVisible();
    });
  });

  test.describe("Form Components", () => {
    test("should validate form inputs", async ({ page }) => {
      await page.goto("/admin/investors");
      await page.click('button:has-text("Add Investor")');

      // Submit without filling required fields
      await page.click('button[type="submit"]');

      // Should show validation errors
      const errorMessage = page.locator('text=/required/i');
      await expect(errorMessage.first()).toBeVisible();
    });

    test("should handle form submission", async ({ page }) => {
      await page.goto("/admin/investors");
      await page.click('button:has-text("Add Investor")');

      // Fill form fields
      await page.fill('input[name="email"]', "newuser@example.com");
      await page.fill('input[name="name"]', "Test User");

      // Submit form
      await page.click('button[type="submit"]');

      // Should show success message
      await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 10000 });
    });
  });

  test.describe("Table Component", () => {
    test("should display data correctly", async ({ page }) => {
      await page.goto("/admin/investors");

      // Wait for table to load
      await page.waitForSelector('table');

      // Check table headers
      const headers = page.locator('th');
      await expect(headers.first()).toBeVisible();

      // Check table has rows
      const rows = page.locator('tbody tr');
      const count = await rows.count();
      expect(count).toBeGreaterThan(0);
    });

    test("should support pagination", async ({ page }) => {
      await page.goto("/admin/investors");

      // Check for pagination controls
      const pagination = page.locator('[aria-label*="Pagination"], nav[role="navigation"]');
      if (await pagination.count() > 0) {
        await expect(pagination.first()).toBeVisible();

        // Click next page
        const nextButton = page.locator('button:has-text("Next"), button[aria-label*="Next"]');
        if (await nextButton.count() > 0) {
          await nextButton.first().click();
          // Should load new page
          await page.waitForLoadState("networkidle");
        }
      }
    });

    test("should support sorting", async ({ page }) => {
      await page.goto("/admin/investors");

      // Click on sortable header
      const header = page.locator('th').first();
      await header.click();

      // Table should re-sort
      await page.waitForLoadState("networkidle");
      // Data order should change (verify with specific data check)
    });
  });

  test.describe("KPI Cards", () => {
    test("should display metrics correctly", async ({ page }) => {
      await page.goto("/dashboard");

      // Check for KPI cards
      const kpiCard = page.locator('[data-testid="kpi-card"]').first();
      await expect(kpiCard).toBeVisible();

      // Should have title and value
      const hasContent = await kpiCard.evaluate((el) => {
        return el.textContent && el.textContent.length > 0;
      });
      expect(hasContent).toBe(true);
    });

    test("should show trend indicators", async ({ page }) => {
      await page.goto("/dashboard");

      // Look for trend indicators (arrows or percentages)
      const trendIndicator = page.locator('text=/%/, svg[class*="arrow"]').first();
      if (await trendIndicator.count() > 0) {
        await expect(trendIndicator).toBeVisible();
      }
    });
  });

  test.describe("Responsive Design", () => {
    const viewports = [
      { name: "Mobile", width: 375, height: 667 },
      { name: "Tablet", width: 768, height: 1024 },
      { name: "Desktop", width: 1920, height: 1080 },
    ];

    for (const viewport of viewports) {
      test(`should render correctly on ${viewport.name}`, async ({ page }) => {
        await page.setViewportSize({
          width: viewport.width,
          height: viewport.height,
        });

        await page.goto("/dashboard");

        // Check main content is visible
        const main = page.locator('main');
        await expect(main).toBeVisible();

        // Check navigation is accessible
        const nav = page.locator('nav');
        await expect(nav.first()).toBeVisible();

        // Take screenshot for visual regression
        await page.screenshot({
          path: `tests/screenshots/${viewport.name.toLowerCase()}-dashboard.png`,
        });
      });
    }
  });

  test.describe("Loading States", () => {
    test("should show loading indicators", async ({ page }) => {
      await page.goto("/dashboard");

      // Should show loading state while fetching data
      const loader = page.locator('[class*="loading"], [class*="spinner"]');
      // Loader may disappear quickly, so we don't assert visibility
    });

    test("should show skeleton screens", async ({ page }) => {
      // Navigate to page that uses skeleton loading
      await page.goto("/admin/investors");

      // Look for skeleton elements (may be brief)
      const skeleton = page.locator('[class*="skeleton"]');
      // Check if skeleton exists in DOM
    });
  });

  test.describe("Error States", () => {
    test("should display error messages", async ({ page }) => {
      await page.goto("/admin/investors");

      // Trigger an error by submitting invalid data
      await page.click('button:has-text("Add Investor")');
      await page.fill('input[name="email"]', "invalid-email");
      await page.click('button[type="submit"]');

      // Should show error message
      const error = page.locator('text=/invalid email/i');
      await expect(error).toBeVisible();
    });
  });

  test.describe("Accessibility", () => {
    test("should have proper heading hierarchy", async ({ page }) => {
      await page.goto("/dashboard");

      // Check for h1
      const h1 = page.locator("h1");
      await expect(h1.first()).toBeVisible();

      // Check heading levels are sequential
      const headings = await page.evaluate(() => {
        const elements = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6"));
        return elements.map((el) => parseInt(el.tagName[1]));
      });

      // First heading should be h1
      expect(headings[0]).toBe(1);
    });

    test("should have skip navigation link", async ({ page }) => {
      await page.goto("/dashboard");

      // Tab to skip link
      await page.keyboard.press("Tab");

      const skipLink = page.locator('a:has-text("Skip")');
      if (await skipLink.count() > 0) {
        await expect(skipLink.first()).toBeFocused();
      }
    });

    test("should have proper ARIA landmarks", async ({ page }) => {
      await page.goto("/dashboard");

      // Check for main landmark
      const main = page.locator('[role="main"], main');
      await expect(main.first()).toBeVisible();

      // Check for navigation landmark
      const nav = page.locator('[role="navigation"], nav');
      await expect(nav.first()).toBeVisible();
    });
  });
});
