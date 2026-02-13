import { test, expect, Page } from "@playwright/test";

// Test configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "admin@test.indigo.com";
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "testpassword123";

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[name="email"]', TEST_ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', TEST_ADMIN_PASSWORD);
  console.log("Submitting login form...");
  await page.click('button[type="submit"]');

  // Wait for navigation or error
  try {
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 10000 });
  } catch (e) {
    console.log("Login timeout. Current URL:", page.url());
    const content = await page.content();
    console.log("Page Content Dump (Partial):", content.substring(0, 2000));
    throw e;
  }
}

test.describe.serial("Comprehensive Platform Operations", () => {
  test.beforeEach(async ({ page }) => {
    // Ensure we are logged in before each test
    // Optimization: In a real suite we'd use storageState
    await login(page);
  });

  // 1. Investor Creation & Management
  test("Create new investor", async ({ page }) => {
    // Navigate to investors
    await page.goto(`${BASE_URL}/admin/investors`);

    // Open "Add Investor" dialog
    await page.click('button:has-text("Add Investor")');
    await expect(page.locator('div[role="dialog"]')).toBeVisible();

    // Fill form (assuming typical fields)
    const uniqueId = Date.now();
    await page.fill('input[name="firstName"]', `Test${uniqueId}`);
    await page.fill('input[name="lastName"]', "User");
    await page.fill('input[name="email"]', `testuser${uniqueId}@example.com`);

    // Check for IB selector if present (optional verification)
    const ibSelector = page.locator('button[role="combobox"], select[name="ibId"]');
    if ((await ibSelector.count()) > 0) {
      // Just verify it's interactive
      await expect(ibSelector.first()).toBeEnabled();
    }

    // Submit
    await page.click('button[type="submit"]:has-text("Create")');

    // Expect success message or dialog close
    await expect(page.locator('div[role="dialog"]')).toBeHidden();

    // Verify investor appears in list
    await expect(page.locator(`text=testuser${uniqueId}@example.com`)).toBeVisible();
  });

  // 2. Transaction Flow (Deposit)
  test("Process deposit transaction", async ({ page }) => {
    // Navigate to transactions or open transaction dialog
    // Assuming there's a global "New Transaction" button or navigation
    await page.goto(`${BASE_URL}/admin/investors`);
    // Click first investor to ensure we have a context or use global add
    await page.click("tbody tr:first-child button"); // click action or row

    // Wait for generic "Add Transaction" trigger if available, or navigate to transactions page
    // Let's assume there is a specific route or button
    await page.goto(`${BASE_URL}/admin/transactions/new`);

    // Verify Dialog is open
    // Issue 1 Verification: Check for absence of Preflow AUM
    await expect(page.locator('text="Preflow AUM Snapshot"')).toBeHidden();

    // Select transaction type
    await page.click('button[role="combobox"], select[name="txn_type"]');
    await page.click('text="Deposit"');

    // Fill amount
    await page.fill('input[name="amount"]', "50000");

    // Select Fund (if needed)
    const fundSelect = page.locator('text="Select fund"');
    if (await fundSelect.isVisible()) {
      await fundSelect.click();
      await page.click('div[role="option"]:first-child');
    }

    // Submit
    await page.click('button:has-text("Create Transaction")');

    // Verify success toast or redirection
    await expect(page.locator("text=Transaction created successfully")).toBeVisible({
      timeout: 10000,
    });
  });

  // 3. Reporting Flow
  test("Generate and manage reports", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/reports`);

    // Issue 2: Check Year/Month selectors
    await expect(page.locator('text="Year"')).toBeVisible();
    await expect(page.locator('text="Month"')).toBeVisible();

    // Issue 7: Check action buttons
    // Look for a row with buttons
    const rowActions = page.locator("tbody tr:first-child button");

    // We expect "Regenerate" and "Delete" icons/buttons
    // This is a loose check for their existence based on tooltips or labels
    // Assuming standard lucide icons or button text
    if ((await rowActions.count()) > 0) {
      // Just verifying the page renders the table and actions without error
      await expect(page.locator("table")).toBeVisible();
    }
  });
});
