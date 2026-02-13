import { test, expect } from "@playwright/test";

// Production Credentials
const ADMIN_EMAIL = "adriel@indigo.fund";
const ADMIN_PASSWORD = "TestAdmin2026!";
const BASE_URL = "https://indigo-yield-platform.lovable.app";

test.describe("Production Verification", () => {
  test("Admin Login and Dashboard Access", async ({ page }) => {
    console.log(`Navigating to ${BASE_URL}...`);
    await page.goto(`${BASE_URL}/login`);

    // Check if we are on login page
    await expect(page).toHaveURL(/.*login/);

    console.log("Filling credentials...");
    await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);

    console.log("Submitting...");
    await page.click('button[type="submit"]');

    // Wait for dashboard redirect
    console.log("Waiting for dashboard...");
    try {
      await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });
      console.log("✅ Login successful, reached dashboard.");
    } catch (e) {
      console.log("Login timeout or failure. Current URL:", page.url());
      const content = await page.content();
      console.log("Page Content Dump (Partial):", content.substring(0, 2000));
      throw e;
    }

    // Verify key dashboard elements present (Read-Only Check)
    // Verify key dashboard elements present (Read-Only Check)
    try {
      // Try alternatives since specific text might vary
      await Promise.any([
        expect(page.locator("text=Total Assets")).toBeVisible({ timeout: 15000 }),
        expect(page.locator("text=AUM")).toBeVisible({ timeout: 15000 }),
        expect(page.locator("text=Overview")).toBeVisible({ timeout: 15000 }),
        // Check for a specific dashboard component class or ID if text fails
        expect(page.locator(".lucide-pie-chart")).toBeVisible({ timeout: 15000 }),
      ]);
      console.log("✅ Dashboard verified.");
    } catch (e) {
      console.log("Dashboard element missing. Dumping content...");
      const content = await page.content();
      console.log("Dashboard Dump:", content.substring(0, 3000));
      throw e;
    }
  });
});
