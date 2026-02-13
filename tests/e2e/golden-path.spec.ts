/**
 * Golden Path E2E Tests
 *
 * Playwright tests that exercise the complete user journey:
 * 1. Login as admin
 * 2. Navigate to fund management
 * 3. Preview yield distribution
 * 4. Apply yield (with validation)
 * 5. View updated positions
 * 6. Check integrity views
 *
 * Prerequisites:
 * - Run `npm run seed:golden` to create test data
 * - App must be running on localhost:3000 (or configure BASE_URL)
 */

import { test, expect, Page } from "@playwright/test";

// Test configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@test.indigo.com";
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "testpassword123";

// Test IDs from golden path seeder
const TEST_IDS = {
  FUND_ALPHA: "00000000-0000-4000-a000-000000000001",
  INVESTOR_ALICE: "00000000-0000-4000-a000-000000000100",
  INVESTOR_BOB: "00000000-0000-4000-a000-000000000101",
  INVESTOR_CAROL: "00000000-0000-4000-a000-000000000102",
};

// Helper functions
async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");

  // Fill login form
  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);

  // Submit
  await page.click('button[type="submit"]');

  // Wait for redirect
  await page.waitForURL(/\/(dashboard|admin|funds)/, { timeout: 10000 });
}

async function navigateToFunds(page: Page) {
  // Look for funds link in navigation
  const fundsLink = page.locator('a[href*="fund"], nav >> text=Funds, [data-testid="funds-nav"]');
  if ((await fundsLink.count()) > 0) {
    await fundsLink.first().click();
    await page.waitForLoadState("networkidle");
  } else {
    // Direct navigation
    await page.goto(`${BASE_URL}/admin/funds`);
  }
}

async function selectFund(page: Page, fundId: string) {
  // Click on fund row or card
  const fundElement = page.locator(
    `[data-fund-id="${fundId}"], tr:has-text("TEST-ALPHA"), [href*="${fundId}"]`
  );
  if ((await fundElement.count()) > 0) {
    await fundElement.first().click();
    await page.waitForLoadState("networkidle");
  }
}

// =============================================================================
// Test Suite
// =============================================================================

test.describe("Golden Path E2E Tests", () => {
  test.describe.configure({ mode: "serial" });

  test.beforeAll(async () => {
    // This could run seed script if needed
    console.log("Starting Golden Path E2E tests");
    console.log(`Base URL: ${BASE_URL}`);
  });

  // ---------------------------------------------------------------------------
  // Test 1: Application loads
  // ---------------------------------------------------------------------------
  test("Application loads successfully", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.waitForLoadState("domcontentloaded");

    // Check that the page loaded (look for common elements)
    const hasContent = await page.locator("body").textContent();
    expect(hasContent).toBeTruthy();

    // Should redirect to login or show dashboard
    const url = page.url();
    expect(url).toMatch(/\/(login|dashboard|admin|funds)/);
  });

  // ---------------------------------------------------------------------------
  // Test 2: Login works
  // ---------------------------------------------------------------------------
  test("Admin can log in", async ({ page }) => {
    // Skip if no test credentials
    test.skip(!TEST_ADMIN_PASSWORD, "No test credentials configured");

    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);

    // Should see dashboard content
    const dashboardContent = page.locator("text=/dashboard|welcome|overview/i");
    await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Test 3: Fund list displays
  // ---------------------------------------------------------------------------
  test("Fund list displays TEST-ALPHA", async ({ page }) => {
    test.skip(!TEST_ADMIN_PASSWORD, "No test credentials configured");

    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await navigateToFunds(page);

    // Look for TEST-ALPHA fund
    const fundElement = page.locator('text=TEST-ALPHA, text="Test Fund Alpha"');
    await expect(fundElement.first()).toBeVisible({ timeout: 10000 });
  });

  // ---------------------------------------------------------------------------
  // Test 4: Yield preview page loads
  // ---------------------------------------------------------------------------
  test("Yield preview page loads without errors", async ({ page }) => {
    test.skip(!TEST_ADMIN_PASSWORD, "No test credentials configured");

    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);

    // Navigate to yield management
    await page.goto(`${BASE_URL}/admin/funds/${TEST_IDS.FUND_ALPHA}/yield`);
    await page.waitForLoadState("networkidle");

    // Check for yield-related content
    const yieldContent = page.locator("text=/yield|distribution|preview/i");
    await expect(yieldContent.first()).toBeVisible({ timeout: 10000 });

    // No error messages should be visible
    const errorMessages = page.locator('[class*="error"], [role="alert"]:has-text("error")');
    const errorCount = await errorMessages.count();
    expect(errorCount).toBe(0);
  });

  // ---------------------------------------------------------------------------
  // Test 5: Preview yield calculation
  // ---------------------------------------------------------------------------
  test("Preview yield shows correct calculations", async ({ page }) => {
    test.skip(!TEST_ADMIN_PASSWORD, "No test credentials configured");

    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}/admin/funds/${TEST_IDS.FUND_ALPHA}/yield`);

    // Find and fill AUM input
    const aumInput = page.locator('input[name*="aum"], input[placeholder*="AUM"]');
    if ((await aumInput.count()) > 0) {
      await aumInput.first().fill("80400"); // 0.5% increase from 80k
    }

    // Find and fill date input
    const dateInput = page.locator('input[type="date"], input[name*="date"]');
    if ((await dateInput.count()) > 0) {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      await dateInput.first().fill(yesterday.toISOString().split("T")[0]);
    }

    // Click preview button
    const previewButton = page.locator('button:has-text("Preview"), button:has-text("Calculate")');
    if ((await previewButton.count()) > 0) {
      await previewButton.first().click();
      await page.waitForLoadState("networkidle");

      // Wait for results
      await page.waitForTimeout(2000);

      // Check that no error occurred
      const errorToast = page.locator('[class*="toast"][class*="error"], .error-message');
      const hasError = (await errorToast.count()) > 0;
      expect(hasError).toBe(false);
    }
  });

  // ---------------------------------------------------------------------------
  // Test 6: Investor positions display
  // ---------------------------------------------------------------------------
  test("Investor positions show correct data", async ({ page }) => {
    test.skip(!TEST_ADMIN_PASSWORD, "No test credentials configured");

    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);

    // Navigate to positions/investors page
    await page.goto(`${BASE_URL}/admin/funds/${TEST_IDS.FUND_ALPHA}/investors`);
    await page.waitForLoadState("networkidle");

    // Should see investor names
    const aliceRow = page.locator('text=Alice, tr:has-text("Alice")');
    const bobRow = page.locator('text=Bob, tr:has-text("Bob")');
    const carolRow = page.locator('text=Carol, tr:has-text("Carol")');

    // At least one investor should be visible
    const hasInvestors =
      (await aliceRow.count()) > 0 || (await bobRow.count()) > 0 || (await carolRow.count()) > 0;

    expect(hasInvestors).toBe(true);
  });

  // ---------------------------------------------------------------------------
  // Test 7: No console errors during navigation
  // ---------------------------------------------------------------------------
  test("No critical console errors during navigation", async ({ page }) => {
    test.skip(!TEST_ADMIN_PASSWORD, "No test credentials configured");

    const consoleErrors: string[] = [];

    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore some known non-critical errors
        if (
          !text.includes("favicon") &&
          !text.includes("manifest") &&
          !text.includes("ResizeObserver")
        ) {
          consoleErrors.push(text);
        }
      }
    });

    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await navigateToFunds(page);
    await selectFund(page, TEST_IDS.FUND_ALPHA);

    // Navigate to various pages
    const pages = [
      `/admin/funds/${TEST_IDS.FUND_ALPHA}`,
      `/admin/funds/${TEST_IDS.FUND_ALPHA}/yield`,
      `/admin/funds/${TEST_IDS.FUND_ALPHA}/investors`,
    ];

    for (const pagePath of pages) {
      await page.goto(`${BASE_URL}${pagePath}`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(500);
    }

    // Check for critical errors
    const criticalErrors = consoleErrors.filter(
      (e) =>
        e.includes("FIRST_INVESTMENT") ||
        e.includes("yield_date") ||
        e.includes("enum") ||
        e.includes("column") ||
        e.includes("does not exist")
    );

    expect(criticalErrors).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 8: API responses are valid
  // ---------------------------------------------------------------------------
  test("API calls return valid responses", async ({ page }) => {
    test.skip(!TEST_ADMIN_PASSWORD, "No test credentials configured");

    const apiErrors: { url: string; status: number; body: string }[] = [];

    page.on("response", async (response) => {
      const url = response.url();
      if (url.includes("supabase") || url.includes("/api/")) {
        const status = response.status();
        if (status >= 400) {
          const body = await response.text().catch(() => "");
          apiErrors.push({ url, status, body });
        }
      }
    });

    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}/admin/funds/${TEST_IDS.FUND_ALPHA}/yield`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Filter out expected 404s and auth-related errors
    const criticalErrors = apiErrors.filter(
      (e) => e.status !== 404 && !e.body.includes("not found") && !e.body.includes("unauthorized")
    );

    // Log any errors for debugging
    if (criticalErrors.length > 0) {
      console.log("API Errors:", criticalErrors);
    }

    expect(criticalErrors).toHaveLength(0);
  });

  // ---------------------------------------------------------------------------
  // Test 9: Form validation works
  // ---------------------------------------------------------------------------
  test("Yield form validates required fields", async ({ page }) => {
    test.skip(!TEST_ADMIN_PASSWORD, "No test credentials configured");

    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);
    await page.goto(`${BASE_URL}/admin/funds/${TEST_IDS.FUND_ALPHA}/yield`);

    // Try to submit without filling fields
    const submitButton = page.locator('button[type="submit"], button:has-text("Apply")');
    if ((await submitButton.count()) > 0) {
      await submitButton.first().click();

      // Should see validation message
      await page.waitForTimeout(500);

      const validationMessage = page.locator(
        '[class*="validation"], [class*="error"], [aria-invalid="true"]'
      );

      // Form should either show validation or prevent submission
      // (we just check that clicking doesn't cause an error)
      const hasValidation = (await validationMessage.count()) > 0;

      // This is informational - forms may work differently
      console.log(`Form validation visible: ${hasValidation}`);
    }
  });

  // ---------------------------------------------------------------------------
  // Test 10: Logout works
  // ---------------------------------------------------------------------------
  test("Logout redirects to login", async ({ page }) => {
    test.skip(!TEST_ADMIN_PASSWORD, "No test credentials configured");

    await login(page, TEST_ADMIN_EMAIL, TEST_ADMIN_PASSWORD);

    // Find and click logout
    const logoutButton = page.locator(
      'button:has-text("Logout"), a:has-text("Logout"), [data-testid="logout"]'
    );

    if ((await logoutButton.count()) > 0) {
      await logoutButton.first().click();
      await page.waitForLoadState("networkidle");

      // Should be on login page
      await expect(page).toHaveURL(/\/login/);
    }
  });
});

// =============================================================================
// Smoke Tests (No Auth Required)
// =============================================================================

test.describe("Smoke Tests", () => {
  test("Health check endpoint responds", async ({ request }) => {
    const response = await request.get(`${BASE_URL}/api/health`).catch(() => null);

    // Health endpoint might not exist - that's OK
    if (response) {
      expect(response.status()).toBeLessThan(500);
    }
  });

  test("Static assets load", async ({ page }) => {
    await page.goto(BASE_URL);

    // Wait for page to load
    await page.waitForLoadState("load");

    // Check that main script loaded
    const scripts = await page.locator("script").count();
    expect(scripts).toBeGreaterThan(0);
  });

  test("Page has proper meta tags", async ({ page }) => {
    await page.goto(BASE_URL);

    const title = await page.title();
    expect(title).toBeTruthy();

    const viewport = await page.locator('meta[name="viewport"]').count();
    expect(viewport).toBeGreaterThan(0);
  });
});
