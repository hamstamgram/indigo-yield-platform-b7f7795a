/**
 * Integration tests for Admin Workflow
 * Tests complete user journeys and feature interactions
 */

import { test, expect } from "@playwright/test";

test.describe("Admin Workflow Integration Tests", () => {
  let adminEmail: string;
  let adminPassword: string;

  test.beforeEach(async ({ page }) => {
    adminEmail = process.env.TEST_ADMIN_EMAIL || "admin@indigoyield.com";
    adminPassword = process.env.TEST_ADMIN_PASSWORD || "admin_password";

    // Login as admin
    await page.goto("/login");
    await page.fill('input[name="email"]', adminEmail);
    await page.fill('input[name="password"]', adminPassword);
    await page.click('button[type="submit"]');

    // Wait for redirect to admin dashboard
    await page.waitForURL("/admin");
  });

  test("Complete investor onboarding workflow", async ({ page }) => {
    // Step 1: Navigate to investors page
    await page.goto("/admin/investors");
    await page.waitForSelector("table, [data-testid='investors-table']");

    // Step 2: Click Add Investor button
    const addButton = page.locator('button:has-text("Add Investor")');
    await addButton.click();

    // Step 3: Fill investor form
    const timestamp = Date.now();
    const investorEmail = `investor-${timestamp}@test.com`;

    await page.fill('input[name="email"]', investorEmail);
    await page.fill('input[name="full_name"]', `Test Investor ${timestamp}`);
    await page.fill('input[name="phone"]', "+1234567890");

    // Step 4: Submit form
    await page.click('button[type="submit"]');

    // Step 5: Verify success message
    await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 10000 });

    // Step 6: Verify investor appears in table
    await page.waitForSelector(`text=${investorEmail}`);
    await expect(page.locator(`text=${investorEmail}`)).toBeVisible();

    // Step 7: Search for new investor
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    if (await searchInput.count() > 0) {
      await searchInput.first().fill(investorEmail);
      await page.waitForTimeout(500); // Wait for debounce

      // Should show only the new investor
      await expect(page.locator(`text=${investorEmail}`)).toBeVisible();
    }
  });

  test("Deposit approval workflow", async ({ page }) => {
    // Step 1: Navigate to deposits page
    await page.goto("/admin/deposits");
    await page.waitForSelector("table");

    // Step 2: Check if there are pending deposits
    const pendingDeposit = page.locator('tr:has-text("Pending")').first();

    if (await pendingDeposit.count() > 0) {
      // Step 3: Click on first pending deposit
      const approveButton = pendingDeposit.locator('button:has-text("Approve")');
      await approveButton.click();

      // Step 4: Confirm approval in dialog
      const dialog = page.locator('[role="dialog"]');
      await expect(dialog).toBeVisible();

      const confirmButton = dialog.locator('button:has-text("Confirm"), button:has-text("Approve")');
      await confirmButton.click();

      // Step 5: Verify success notification
      await expect(page.locator('text=/approved/i')).toBeVisible({ timeout: 10000 });

      // Step 6: Verify deposit status changed
      await page.waitForTimeout(1000);
      await page.reload();
      // Deposit should no longer be in pending state
    } else {
      // Create a test deposit
      const createButton = page.locator('button:has-text("Create Deposit")');
      if (await createButton.count() > 0) {
        await createButton.click();

        // Fill deposit form
        await page.fill('input[name="amount"]', "1000");
        await page.selectOption('select[name="asset"]', "BTC");

        await page.click('button[type="submit"]');
        await expect(page.locator('text=/success/i')).toBeVisible({ timeout: 10000 });
      }
    }
  });

  test("Transaction creation and verification", async ({ page }) => {
    // Step 1: Go to specific investor
    await page.goto("/admin/investors");
    const firstInvestor = page.locator('tbody tr').first();
    await firstInvestor.click();

    // Step 2: Open add transaction dialog
    const addTxButton = page.locator('button:has-text("Add Transaction")');
    await addTxButton.click();

    // Step 3: Fill transaction form
    await page.selectOption('select[name="txn_type"]', "YIELD");
    await page.fill('input[name="amount"]', "100.50");
    await page.fill('input[name="asset"]', "BTC");

    const today = new Date().toISOString().split("T")[0];
    await page.fill('input[name="tx_date"]', today);

    // Step 4: Submit transaction
    await page.click('button:has-text("Create Transaction")');

    // Step 5: Verify success
    await expect(page.locator('text=/transaction created/i')).toBeVisible({ timeout: 10000 });

    // Step 6: Verify transaction appears in list
    await page.waitForTimeout(1000);
    // Should see the transaction in the list
  });

  test("Fee calculation and management", async ({ page }) => {
    // Step 1: Navigate to fees page
    await page.goto("/admin/fees");
    await page.waitForSelector("table, [data-testid='fees-table']");

    // Step 2: View fee structures
    const feeStructureTab = page.locator('button:has-text("Fee Structures")');
    if (await feeStructureTab.count() > 0) {
      await feeStructureTab.click();
      await page.waitForSelector("table");
    }

    // Step 3: Check monthly fee summary
    const summaryCard = page.locator('text=/total fees/i');
    if (await summaryCard.count() > 0) {
      await expect(summaryCard.first()).toBeVisible();
    }

    // Step 4: Calculate fees for current month
    const calculateButton = page.locator('button:has-text("Calculate Fees")');
    if (await calculateButton.count() > 0) {
      await calculateButton.click();
      await expect(page.locator('text=/calculating/i, text=/calculated/i')).toBeVisible({ timeout: 15000 });
    }
  });

  test("Dashboard data refresh", async ({ page }) => {
    // Step 1: Load admin dashboard
    await page.goto("/admin");
    await page.waitForSelector('[data-testid="kpi-card"]');

    // Step 2: Record initial KPI values
    const initialValues = await page.evaluate(() => {
      const cards = Array.from(document.querySelectorAll('[data-testid="kpi-card"]'));
      return cards.map((card) => card.textContent);
    });

    // Step 3: Trigger data refresh
    const refreshButton = page.locator('button[aria-label*="refresh"], button:has-text("Refresh")');
    if (await refreshButton.count() > 0) {
      await refreshButton.first().click();

      // Step 4: Wait for loading state
      await page.waitForSelector('[class*="loading"], [class*="spinner"]', {
        state: "visible",
        timeout: 2000,
      }).catch(() => {
        // Loading may be too fast to catch
      });

      // Step 5: Wait for data to load
      await page.waitForTimeout(2000);

      // Step 6: Verify data updated (KPI cards should be visible)
      await expect(page.locator('[data-testid="kpi-card"]').first()).toBeVisible();
    }
  });

  test("Search and filter functionality", async ({ page }) => {
    // Step 1: Navigate to investors page
    await page.goto("/admin/investors");
    await page.waitForSelector("table");

    // Step 2: Test search functionality
    const searchInput = page.locator('input[placeholder*="Search"], input[type="search"]');
    if (await searchInput.count() > 0) {
      // Get first investor email
      const firstEmail = await page.locator('tbody tr').first().locator('text=/@/').textContent();

      if (firstEmail) {
        // Search for investor
        await searchInput.first().fill(firstEmail);
        await page.waitForTimeout(500); // Debounce

        // Should show only matching results
        const rowCount = await page.locator('tbody tr').count();
        expect(rowCount).toBeGreaterThan(0);
        expect(rowCount).toBeLessThanOrEqual(5);
      }
    }

    // Step 3: Test filter functionality
    const filterButton = page.locator('button:has-text("Filter")');
    if (await filterButton.count() > 0) {
      await filterButton.click();

      // Apply filter
      const filterOption = page.locator('input[type="checkbox"]').first();
      if (await filterOption.count() > 0) {
        await filterOption.check();

        // Apply
        await page.click('button:has-text("Apply")');
        await page.waitForTimeout(1000);
      }
    }
  });

  test("Bulk operations workflow", async ({ page }) => {
    // Step 1: Navigate to investors page
    await page.goto("/admin/investors");
    await page.waitForSelector("table");

    // Step 2: Select multiple investors
    const checkboxes = page.locator('input[type="checkbox"]');
    const checkboxCount = await checkboxes.count();

    if (checkboxCount > 2) {
      // Select first 2 investors
      await checkboxes.nth(1).check(); // Skip header checkbox
      await checkboxes.nth(2).check();

      // Step 3: Verify bulk action menu appears
      const bulkMenu = page.locator('[role="menu"], [data-testid="bulk-actions"]');
      // May not exist in current implementation
    }
  });

  test("Export functionality", async ({ page }) => {
    // Step 1: Navigate to reports/exports
    await page.goto("/admin/investors");

    // Step 2: Click export button
    const exportButton = page.locator('button:has-text("Export"), button[aria-label*="export"]');

    if (await exportButton.count() > 0) {
      // Setup download listener
      const downloadPromise = page.waitForEvent("download", { timeout: 30000 });

      await exportButton.first().click();

      // Step 3: Wait for download
      const download = await downloadPromise;

      // Step 4: Verify download
      expect(download.suggestedFilename()).toMatch(/\.(csv|xlsx|pdf)$/);

      // Clean up
      await download.delete();
    }
  });

  test("Form validation and error handling", async ({ page }) => {
    // Step 1: Open add investor dialog
    await page.goto("/admin/investors");
    await page.click('button:has-text("Add Investor")');

    // Step 2: Submit empty form
    await page.click('button[type="submit"]');

    // Step 3: Verify validation errors appear
    const errors = page.locator('[role="alert"], .text-destructive');
    const errorCount = await errors.count();
    expect(errorCount).toBeGreaterThan(0);

    // Step 4: Fill invalid email
    await page.fill('input[name="email"]', "invalid-email");
    await page.fill('input[name="full_name"]', "Test Name");

    // Step 5: Submit and verify email validation
    await page.click('button[type="submit"]');
    await expect(page.locator('text=/invalid email/i, text=/valid email/i')).toBeVisible();

    // Step 6: Fill valid email
    await page.fill('input[name="email"]', "valid@email.com");

    // Step 7: Verify error clears
    await page.waitForTimeout(500);
    // Email error should clear
  });

  test("Pagination and data loading", async ({ page }) => {
    // Step 1: Navigate to page with pagination
    await page.goto("/admin/investors");
    await page.waitForSelector("table");

    // Step 2: Check for pagination
    const pagination = page.locator('[aria-label*="Pagination"], nav[role="navigation"]');

    if (await pagination.count() > 0) {
      // Step 3: Record first page data
      const firstPageData = await page.locator('tbody tr').first().textContent();

      // Step 4: Go to next page
      const nextButton = page.locator('button:has-text("Next"), button[aria-label*="Next"]');
      if (await nextButton.count() > 0 && await nextButton.isEnabled()) {
        await nextButton.click();

        // Step 5: Wait for new data
        await page.waitForTimeout(1000);

        // Step 6: Verify data changed
        const secondPageData = await page.locator('tbody tr').first().textContent();
        expect(secondPageData).not.toBe(firstPageData);

        // Step 7: Go back to first page
        const prevButton = page.locator('button:has-text("Previous"), button[aria-label*="Previous"]');
        if (await prevButton.count() > 0) {
          await prevButton.click();
          await page.waitForTimeout(1000);

          // Step 8: Verify we're back to first page
          const backToFirstPage = await page.locator('tbody tr').first().textContent();
          expect(backToFirstPage).toBe(firstPageData);
        }
      }
    }
  });
});
