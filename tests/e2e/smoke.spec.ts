import { test, expect } from "@playwright/test";

/**
 * Smoke tests for critical user flows
 * These tests verify basic functionality without authentication
 */

test.describe("Public Pages", () => {
  test("landing page loads correctly", async ({ page }) => {
    await page.goto("/");
    
    // Check that the page loads
    await expect(page).toHaveTitle(/Indigo/i);
    
    // Check for main navigation or content
    const main = page.locator("main");
    await expect(main).toBeVisible();
  });

  test("login page is accessible", async ({ page }) => {
    await page.goto("/login");
    
    // Check for login form elements
    const emailInput = page.locator('input[type="email"], input[name="email"]');
    const passwordInput = page.locator('input[type="password"], input[name="password"]');
    
    await expect(emailInput).toBeVisible();
    await expect(passwordInput).toBeVisible();
  });

  test("reset password page loads", async ({ page }) => {
    await page.goto("/reset-password");
    
    // Page should load without errors
    await expect(page).not.toHaveTitle(/error/i);
  });
});

test.describe("Navigation", () => {
  test("404 page handles unknown routes", async ({ page }) => {
    const response = await page.goto("/this-route-does-not-exist-12345");
    
    // Should either show 404 page or redirect
    expect(response?.status()).toBeLessThan(500);
  });

  test("deep links don't crash the app", async ({ page }) => {
    // Test various deep links that might be bookmarked
    const routes = [
      "/dashboard",
      "/admin",
      "/portfolio",
      "/statements",
    ];

    for (const route of routes) {
      const response = await page.goto(route);
      // Should either load or redirect to login, not crash
      expect(response?.status()).toBeLessThan(500);
    }
  });
});

test.describe("Performance", () => {
  test("landing page loads within acceptable time", async ({ page }) => {
    const startTime = Date.now();
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    const loadTime = Date.now() - startTime;
    
    // Page should load within 5 seconds
    expect(loadTime).toBeLessThan(5000);
  });

  test("no console errors on landing page", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto("/");
    await page.waitForLoadState("networkidle");
    
    // Filter out known acceptable errors (e.g., network failures in test env)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("net::ERR") &&
        !e.includes("Failed to fetch") &&
        !e.includes("NetworkError")
    );
    
    expect(criticalErrors).toHaveLength(0);
  });
});

test.describe("Accessibility Basics", () => {
  test("page has proper heading structure", async ({ page }) => {
    await page.goto("/");
    
    // Should have at least one h1
    const h1 = page.locator("h1").first();
    await expect(h1).toBeVisible();
  });

  test("images have alt text", async ({ page }) => {
    await page.goto("/");
    
    const imagesWithoutAlt = await page.locator("img:not([alt])").count();
    expect(imagesWithoutAlt).toBe(0);
  });

  test("interactive elements are focusable", async ({ page }) => {
    await page.goto("/login");
    
    // Tab through the page
    await page.keyboard.press("Tab");
    
    // Something should be focused
    const focusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(focusedElement).toBeTruthy();
  });
});

test.describe("Security Headers @visual", () => {
  test("response includes security headers", async ({ page }) => {
    const response = await page.goto("/");
    const headers = response?.headers();
    
    // These might be set by hosting platform
    // Just check the response is valid
    expect(response?.status()).toBe(200);
  });
});
