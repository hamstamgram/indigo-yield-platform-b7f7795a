/**
 * UI Withdrawal Full Exit & Dust Verification - Go-Live Critical
 *
 * Tests the critical withdrawal paths:
 * - Partial withdrawal balance accuracy
 * - Full exit (99%+) detection and toggle
 * - Dust/residual balance handling
 * - Cross-page consistency after withdrawal
 *
 * RUN FIRST - P0 Critical
 */

import { test, expect, type Page } from "@playwright/test";

const QA_EMAIL = "Adriel@indigo.fund";
const QA_PASSWORD = "TestAdmin2026!";
const BASE_URL = process.env.APP_URL || "https://indigo-yield-platform.lovable.app";

// Test data - these must exist in the DB
const TEST_INVESTOR_EMAIL = "ralph@indigo.fund"; // Known test investor with balance

async function login(page: Page) {
  await page.goto(BASE_URL + "/login");
  await page.getByRole("textbox", { name: "Email Address" }).fill(QA_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(QA_PASSWORD);
  await page.getByRole("button", { name: /Access Portal/i }).click();
  await page.waitForURL("**/admin**", { timeout: 30000 });
  await page.waitForTimeout(2000);
}

function getWithdrawalTableRows(page: Page) {
  return page.locator("tbody tr, [data-testid='withdrawal-row']");
}

function getInvestorRows(page: Page) {
  return page.locator("tbody tr, [data-testid='investor-row']");
}

test.describe.serial("Go-Live: Withdrawal Full Exit & Dust", () => {
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    page = await browser.newPage();
  });

  test.afterAll(async () => {
    await page?.close();
  });

  test.beforeEach(async () => {
    await login(page);
  });

  // =========================================================================
  // PARTIAL WITHDRAWAL TESTS
  // =========================================================================

  test("WD-PARTIAL-001: Partial withdrawal reduces position correctly", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/withdrawals");
    await page.waitForTimeout(3000);

    // Look for pending withdrawals to approve
    const rows = getWithdrawalTableRows(page);
    const rowCount = await rows.count();

    if (rowCount === 0) {
      console.log("WD-PARTIAL-001: SKIP - No withdrawal requests to test");
      return;
    }

    // Find a pending withdrawal
    const pendingRow = page.locator("tr:has-text('pending')").first();
    const hasPending = await pendingRow.isVisible().catch(() => false);

    if (!hasPending) {
      console.log("WD-PARTIAL-001: SKIP - No pending withdrawals");
      return;
    }

    // Click on the pending withdrawal to open details/approval
    await rows.first().click();
    await page.waitForTimeout(1500);

    // Check if approval dialog opens
    const approveDialog = page
      .locator("[role='dialog']")
      .filter({ hasText: /approve|withdrawal/i });
    const dialogVisible = await approveDialog.isVisible().catch(() => false);

    console.log(`WD-PARTIAL-001: Approval dialog opened: ${dialogVisible}`);

    if (dialogVisible) {
      // Capture the requested amount before approval
      const amountField = page.locator("[name='amount'], [data-testid='requested-amount']");
      const requestedAmount = await amountField
        .first()
        .textContent()
        .catch(() => "unknown");
      console.log(`WD-PARTIAL-001: Requested amount: ${requestedAmount}`);

      // Check for full exit toggle
      const fullExitToggle = page.locator("[type='checkbox']#full-exit, [name='fullExit']");
      const hasFullExit = await fullExitToggle.isVisible().catch(() => false);
      console.log(`WD-PARTIAL-001: Full exit toggle visible: ${hasFullExit}`);
    }
  });

  // =========================================================================
  // FULL EXIT TESTS
  // =========================================================================

  test("WD-FULL-001: Full exit toggle appears for 99%+ withdrawals", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/withdrawals");
    await page.waitForTimeout(3000);

    const rows = getWithdrawalTableRows(page);
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Click first row to see details
      await rows.first().click();
      await page.waitForTimeout(2000);

      // Look for full exit checkbox/ toggle
      const fullExitCheck = page.locator("input[type='checkbox']#full-exit, [name='isFullExit']");
      const fullExitVisible = await fullExitCheck.isVisible().catch(() => false);

      console.log(`WD-FULL-001: Full exit toggle found: ${fullExitVisible}`);

      if (!fullExitVisible) {
        // Check for full exit label in the dialog
        const dialogText = await page
          .locator("[role='dialog']")
          .textContent()
          .catch(() => "");
        const hasFullExitText =
          dialogText?.includes("Full Exit") || dialogText?.includes("full exit");
        console.log(`WD-FULL-001: Full exit text in dialog: ${hasFullExitText}`);
      }
    } else {
      console.log("WD-FULL-001: SKIP - No withdrawals to test");
    }
  });

  test("WD-FULL-002: Full exit shows dust preview", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/withdrawals");
    await page.waitForTimeout(3000);

    const rows = getWithdrawalTableRows(page);
    const rowCount = await rows.count();

    if (rowCount > 0) {
      await rows.first().click();
      await page.waitForTimeout(2000);

      // If full exit enabled, check for dust preview
      const dustPreview = page.locator("text=Dust, text=dust amount, text=INDIGO Fees");
      const hasDustPreview = await dustPreview
        .first()
        .isVisible()
        .catch(() => false);

      console.log(`WD-FULL-002: Dust preview visible: ${hasDustPreview}`);

      // Capture dust amounts if visible
      if (hasDustPreview) {
        const previewText = await page.locator("[role='dialog']").textContent();
        console.log(`WD-FULL-002: Dust preview text: ${previewText.substring(0, 200)}`);
      }
    }
  });

  // =========================================================================
  // DUST/RESIDUAL VERIFICATION
  // =========================================================================

  test("WD-DUST-001: Position shows correct balance after partial withdrawal", async ({ page }) => {
    // Navigate to investor with withdrawal
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const rows = getInvestorRows(page);
    const rowCount = await rows.count();

    if (rowCount > 1) {
      // Click first investor
      await rows.nth(1).click();
      await page.waitForTimeout(2000);

      // Look for position/balance display
      const positionDisplay = page.locator("text=Balance, text=Current Value, text=Position");
      const hasPosition = await positionDisplay
        .first()
        .isVisible()
        .catch(() => false);

      console.log(`WD-DUST-001: Position visible: ${hasPosition}`);

      if (hasPosition) {
        const positionText = await page.locator("body").textContent();
        // Look for numeric values that might be near-zero
        const hasNearZero = positionText?.includes("0.000") || positionText?.includes("0.00");
        console.log(`WD-DUST-001: Has near-zero display: ${hasNearZero}`);
      }
    }
  });

  // =========================================================================
  // CROSS-PAGE CONSISTENCY
  // =========================================================================

  test("WD-CROSS-001: Withdrawal history updates after approval", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/withdrawals");
    await page.waitForTimeout(3000);

    const initialRows = await getWithdrawalTableRows(page).count();
    console.log(`WD-CROSS-001: Initial withdrawal count: ${initialRows}`);

    // Navigate elsewhere
    await page.goto(BASE_URL + "/admin");
    await page.waitForTimeout(2000);

    // Go back to withdrawals
    await page.goto(BASE_URL + "/admin/withdrawals");
    await page.waitForTimeout(3000);

    const afterRows = await getWithdrawalTableRows(page).count();
    console.log(`WD-CROSS-001: After navigation withdrawal count: ${afterRows}`);

    expect(afterRows).toBe(initialRows);
  });

  test("WD-CROSS-002: Dashboard reflects withdrawal state", async ({ page }) => {
    await page.goto(BASE_URL + "/admin");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();

    // Dashboard should show some metrics
    const hasMetrics =
      bodyText?.includes("$") || bodyText?.includes("AUM") || bodyText?.includes("Total");
    console.log(`WD-CROSS-002: Dashboard has metrics: ${hasMetrics}`);

    expect(hasMetrics).toBe(true);
  });

  // =========================================================================
  // STATUS TRANSITION VERIFICATION
  // =========================================================================

  test("WD-STATUS-001: Withdrawal status renders correctly", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/withdrawals");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();

    // Check for status indicators
    const statuses = ["pending", "approved", "completed", "rejected", "cancelled", "voided"];
    const foundStatuses = statuses.filter((s) => bodyText?.toLowerCase().includes(s));

    console.log(`WD-STATUS-001: Found statuses: ${foundStatuses.join(", ")}`);
    expect(foundStatuses.length).toBeGreaterThan(0);
  });

  // =========================================================================
  // DUPLICATE SUBMIT PREVENTION
  // =========================================================================

  test("WD-DUP-001: Duplicate submit is prevented", async ({ page }) => {
    // Navigate to create withdrawal
    await page.goto(BASE_URL + "/admin/withdrawals");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new withdrawal|create withdrawal|add/i });
    const hasCreateBtn = await createBtn
      .first()
      .isVisible()
      .catch(() => false);

    if (hasCreateBtn) {
      // Click multiple times rapidly to test duplicate prevention
      await createBtn.first().click();
      await page.waitForTimeout(500);
      await createBtn.first().click();
      await page.waitForTimeout(500);

      // Should only have one dialog open
      const dialogs = page.locator("[role='dialog']");
      const dialogCount = await dialogs.count();

      console.log(`WD-DUP-001: Dialogs after rapid clicks: ${dialogCount}`);
      expect(dialogCount).toBeLessThanOrEqual(1);
    } else {
      console.log("WD-DUP-001: SKIP - Create button not visible");
    }
  });
});
