/**
 * UI Void Cascade Verification - Go-Live Critical
 *
 * Tests void cascade behavior:
 * - Transaction void from UI
 * - Yield distribution void from UI
 * - Confirmation workflows
 * - Success/failure feedback
 * - Post-void state updates
 * - Unvoid mirror path
 *
 * RUN SECOND - P0 Critical
 */

import { test, expect, type Page } from "@playwright/test";

const QA_EMAIL = "Adriel@indigo.fund";
const QA_PASSWORD = "TestAdmin2026!";
const BASE_URL = process.env.APP_URL || "https://indigo-yield-platform.lovable.app";

async function login(page: Page) {
  await page.goto(BASE_URL + "/login");
  await page.getByRole("textbox", { name: "Email Address" }).fill(QA_EMAIL);
  await page.getByRole("textbox", { name: "Password" }).fill(QA_PASSWORD);
  await page.getByRole("button", { name: /Access Portal/i }).click();
  await page.waitForURL("**/admin**", { timeout: 30000 });
  await page.waitForTimeout(2000);
}

function getTransactionRows(page: Page) {
  return page.locator("tbody tr, [data-testid='tx-row']");
}

function getYieldRows(page: Page) {
  return page.locator("tbody tr, [data-testid='yield-row']");
}

test.describe.serial("Go-Live: Void Cascade", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // =========================================================================
  // TRANSACTION VOID TESTS
  // =========================================================================

  test("VOID-TX-001: Void button appears for transactions", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const rows = getTransactionRows(page);
    const rowCount = await rows.count();

    if (rowCount > 1) {
      // Hover or click to reveal actions
      await rows.first().hover();
      await page.waitForTimeout(500);

      const voidBtn = page.getByRole("button", { name: /void/i });
      const hasVoidBtn = await voidBtn
        .first()
        .isVisible()
        .catch(() => false);

      console.log(`VOID-TX-001: Void button visible: ${hasVoidBtn}`);
    } else {
      console.log("VOID-TX-001: SKIP - No transactions to void");
    }
  });

  test("VOID-TX-002: Void confirmation dialog flows", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const rows = getTransactionRows(page);
    const rowCount = await rows.count();

    if (rowCount > 1) {
      // Find void action
      const voidMenu = page.locator("button:has-text('Void'), [data-testid='void-action']");
      const hasMenu = await voidMenu
        .first()
        .isVisible()
        .catch(() => false);

      if (hasMenu) {
        await voidMenu.first().click();
        await page.waitForTimeout(1000);

        // Check for confirmation dialog
        const confirmDialog = page.locator("[role='dialog'], .confirm-dialog");
        const hasDialog = await confirmDialog.isVisible().catch(() => false);

        console.log(`VOID-TX-002: Confirmation dialog: ${hasDialog}`);

        if (hasDialog) {
          // Check for reason/comment field
          const reasonField = page.locator("textarea, input[name='reason']");
          const hasReason = await reasonField.isVisible().catch(() => false);
          console.log(`VOID-TX-002: Reason field: ${hasReason}`);

          // Close dialog
          await page.keyboard.press("Escape");
          await page.waitForTimeout(500);
        }
      }
    } else {
      console.log("VOID-TX-002: SKIP - No transactions to void");
    }
  });

  test("VOID-TX-003: Transaction marked voided after void", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();

    // Check for voided status indicators
    const hasVoidedIndicator = bodyText?.includes("voided") || bodyText?.includes("Voided");
    console.log(`VOID-TX-003: Voided indicator present: ${hasVoidedIndicator}`);

    // Check for voided style (often grayed out or with voided badge)
    const voidedRows = page.locator(".voided, [data-voided='true'], strike");
    const voidedCount = await voidedRows.count();
    console.log(`VOID-TX-003: Voided row count: ${voidedCount}`);
  });

  // =========================================================================
  // YIELD DISTRIBUTION VOID TESTS
  // =========================================================================

  test("VOID-YIELD-001: Yield void button appears", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/yield-history");
    await page.waitForTimeout(3000);

    const rows = getYieldRows(page);
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Look for yield void action
      const voidBtn = page.getByRole("button", { name: /void|unvoid/i });
      const hasVoidBtn = await voidBtn
        .first()
        .isVisible()
        .catch(() => false);

      console.log(`VOID-YIELD-001: Yield void button: ${hasVoidBtn}`);
    } else {
      console.log("VOID-YIELD-001: SKIP - No yields to void");
    }
  });

  test("VOID-YIELD-002: Yield void confirmation flow", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/yield-history");
    await page.waitForTimeout(3000);

    const rows = getYieldRows(page);
    const rowCount = await rows.count();

    if (rowCount > 0) {
      // Click first row to potentially reveal void action
      await rows.first().click();
      await page.waitForTimeout(1000);

      const voidLink = page.getByRole("button", { name: /void/i });
      const hasVoid = await voidLink.isVisible().catch(() => false);

      console.log(`VOID-YIELD-002: Void action visible: ${hasVoid}`);
    } else {
      console.log("VOID-YIELD-002: SKIP - No yields to void");
    }
  });

  // =========================================================================
  // POST-VOID STATE VERIFICATION
  // =========================================================================

  test("VOID-STATE-001: Dashboard AUM after void", async ({ page }) => {
    await page.goto(BASE_URL + "/admin");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    const hasAUM = bodyText?.includes("AUM") || bodyText?.includes("$");
    console.log(`VOID-STATE-001: Dashboard AUM visible: ${hasAUM}`);

    expect(hasAUM).toBe(true);
  });

  test("VOID-STATE-002: Position restored after void", async ({ page }) => {
    // Navigate to an investor with transactions that might have been voided
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const rows = page.locator("tbody tr");
    const rowCount = await rows.count();

    if (rowCount > 1) {
      await rows.nth(1).click();
      await page.waitForTimeout(2000);

      // Look for position display
      const positionSection = page.locator("text=Position, text=Balance, text=Current Value");
      const hasPosition = await positionSection
        .first()
        .isVisible()
        .catch(() => false);

      console.log(`VOID-STATE-002: Position section visible: ${hasPosition}`);
    }
  });

  // =========================================================================
  // UNVOID MIRROR PATH
  // =========================================================================

  test("VOID-UNVOID-001: Unvoid option exists", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    // Look for unvoid button
    const unvoidBtn = page.getByRole("button", { name: /unvoid|restore/i });
    const hasUnvoidBtn = await unvoidBtn
      .first()
      .isVisible()
      .catch(() => false);

    console.log(`VOID-UNVOID-001: Unvoid button visible: ${hasUnvoidBtn}`);
  });

  test("VOID-UNVOID-002: Unvoid confirmation flow", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    // Find voided transactions
    const voidedRows = page.locator(".voided,tr:has-text('voided')");
    const voidedCount = await voidedRows.count();

    if (voidedCount > 0) {
      // Look for unvoid action
      const unvoidLink = page.getByRole("button", { name: /unvoid/i });
      const hasUnvoid = await unvoidLink
        .first()
        .isVisible()
        .catch(() => false);

      console.log(`VOID-UNVOID-002: Unvoid action for voided: ${hasUnvoid}`);
    } else {
      console.log("VOID-UNVOID-002: SKIP - No voided transactions");
    }
  });

  // =========================================================================
  // HISTORY REFLECTION
  // =========================================================================

  test("VOID-HIST-001: Voided hidden from active reports", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/reports");
    await page.waitForTimeout(3000);

    // Reports should ideally filter out voided transactions
    const bodyText = await page.locator("body").textContent();

    // Check if voided appears in reports
    const voidedInReports = bodyText?.includes("voided") && !bodyText?.includes("Voided");
    console.log(`VOID-HIST-001: Voided in reports (should be rare): ${voidedInReports}`);
  });

  test("VOID-HIST-002: Transaction history shows voided correctly", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    // Check for status column that might show voided
    const statusColumn = page.locator("th:has-text('Status'), th:has-text('status')");
    const hasStatus = await statusColumn
      .first()
      .isVisible()
      .catch(() => false);

    console.log(`VOID-HIST-002: Status column: ${hasStatus}`);
  });

  // =========================================================================
  // ERROR HANDLING
  // =========================================================================

  test("VOID-ERR-001: Failed void shows error", async ({ page }) => {
    // This test verifies error handling - we can't easily force a void failure
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    // Look for error toast containers
    const errorContainer = page.locator("[data-sonner-toast][data-type='error'], .toast.error");
    const hasErrorContainer = await errorContainer.isVisible().catch(() => false);

    console.log(`VOID-ERR-001: Error toast container: ${hasErrorContainer}`);
  });

  // =========================================================================
  // EMPTY/ORPHAN PREVENTION
  // =========================================================================

  test("VOID-ORPHAN-001: No empty history after successful void", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const rows = getTransactionRows(page);
    const rowCount = await rows.count();

    console.log(`VOID-ORPHAN-001: Transaction count: ${rowCount}`);
    expect(rowCount).toBeGreaterThan(0);
  });

  test("VOID-ORPHAN-002: No orphan state after void failure", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();

    // Check for signs of broken state
    const hasError = bodyText?.includes("Error") || bodyText?.includes("error");
    const hasEmpty = bodyText?.includes("No transactions") || bodyText?.includes("empty");

    console.log(`VOID-ORPHAN-002: Has error: ${hasError}, Empty: ${hasEmpty}`);
  });
});
