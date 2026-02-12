/**
 * Issue 6: Remove YIELD from Transaction Type Dropdown
 *
 * BEFORE: Transaction type select included YIELD, which allowed manual yield creation
 *         bypassing the V5 engine. GlobalYieldFlow conditional also existed.
 * AFTER: Only FIRST_INVESTMENT, DEPOSIT, WITHDRAWAL in the dropdown.
 *        GlobalYieldFlow conditional removed from AddTransactionDialog.
 *
 * Tests:
 * - Transaction type dropdown has exactly 3 options
 * - YIELD is NOT in the options
 * - FIRST_INVESTMENT, DEPOSIT, WITHDRAWAL are present
 */

import { test, expect } from "@playwright/test";
import {
  loginAsAdmin,
  takeEvidence,
  navigateAndSettle,
  dismissBanners,
} from "./helpers/fix-test-utils";

test.describe("Issue 6: YIELD Removed from Transaction Type Dropdown", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  async function openNewTransactionDialog(page: import("@playwright/test").Page) {
    await navigateAndSettle(page, "/admin/transactions");

    // Wait for page content to render
    await page
      .locator("table, [role='table'], :has-text('Transaction')")
      .first()
      .waitFor({ state: "visible", timeout: 15000 });

    // Click "New Transaction" or "Add Transaction" button
    const newTxBtn = page
      .locator(
        'button:has-text("New Transaction"), button:has-text("Add Transaction"), a:has-text("New Transaction")'
      )
      .first();

    await expect(newTxBtn).toBeVisible({ timeout: 10000 });
    await newTxBtn.click();

    // Wait for dialog to fully render
    const dialog = page.locator('[role="dialog"]').first();
    await expect(dialog).toBeVisible({ timeout: 10000 });
    await page.waitForTimeout(500);
  }

  async function openTypeDropdown(page: import("@playwright/test").Page) {
    // The SelectTrigger renders as a button with role="combobox"
    // Look inside the dialog for the transaction type selector
    const dialog = page.locator('[role="dialog"]');
    const typeTrigger = dialog.locator('button[role="combobox"]').first();

    await expect(typeTrigger).toBeVisible({ timeout: 10000 });
    await typeTrigger.click();
    await page.waitForTimeout(300);
  }

  test("transaction type dropdown does not contain YIELD", async ({ page }) => {
    await openNewTransactionDialog(page);
    await openTypeDropdown(page);

    // Get all options
    const options = page.locator('[role="option"]');
    const optionTexts = await options.allTextContents();
    const normalizedTexts = optionTexts.map((t) => t.trim().toUpperCase());

    // YIELD should NOT be present
    expect(
      normalizedTexts.some((t) => t === "YIELD"),
      `YIELD should NOT be in transaction type options. Found: ${optionTexts.join(", ")}`
    ).toBeFalsy();

    // Expected options should be present
    const hasDeposit = normalizedTexts.some((t) => t.includes("DEPOSIT"));
    const hasWithdrawal = normalizedTexts.some((t) => t.includes("WITHDRAWAL"));
    const hasFirstInvestment = normalizedTexts.some(
      (t) => t.includes("FIRST") && t.includes("INVESTMENT")
    );

    expect(hasDeposit, "DEPOSIT should be in options").toBeTruthy();
    expect(hasWithdrawal, "WITHDRAWAL should be in options").toBeTruthy();
    expect(hasFirstInvestment, "FIRST INVESTMENT should be in options").toBeTruthy();

    await takeEvidence(page, "issue-06-tx-type-no-yield");

    // Close dropdown
    await page.keyboard.press("Escape");
  });

  test("transaction type dropdown has exactly 3 options", async ({ page }) => {
    await openNewTransactionDialog(page);
    await openTypeDropdown(page);

    const options = page.locator('[role="option"]');
    const count = await options.count();

    expect(count).toBe(3);

    await takeEvidence(page, "issue-06-exactly-3-options");
    await page.keyboard.press("Escape");
  });
});
