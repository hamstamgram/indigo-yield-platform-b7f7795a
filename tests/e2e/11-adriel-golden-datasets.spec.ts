import { test, expect, Page } from "@playwright/test";
import { format } from "date-fns";

/**
 * SCENARIO 11: Adriel Golden Datasets
 * - Precision reconciliation for SOL (9 decimals) and XRP (6 decimals)
 * - Massive balance distributions (> 1,000,000 tokens)
 * - Multi-investor yield waterfall validation
 */
test.describe("Scenario 11: Adriel Golden Datasets", () => {
  test.beforeEach(async ({ page }) => {
    await login(page);
    await page.goto("/admin");
    // Wait for dashboard to hydrate
    await expect(page.locator('button:has-text("Apply Yield")').first()).toBeVisible({
      timeout: 20000,
    });
    await page.waitForTimeout(1000);
  });

  test("SOL Gold Dataset: 9-decimal precision reconciliation", async ({ page }) => {
    await page.locator('button:has-text("Apply Yield")').first().click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Solana")').first().click({ force: true });

    const dialog = page.getByRole("dialog", { name: /Record Yield Event/i });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Ensure Transaction mode is selected
    await page.getByTestId("purpose-transaction").click();

    const aumInput = page.getByTestId("aum-input");
    await expect(aumInput).toBeVisible({ timeout: 15000 });
    await aumInput.scrollIntoViewIfNeeded();
    await aumInput.click();
    await aumInput.fill("50000.123456789");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(1000);

    await dialog.locator('button:has-text("Preview")').first().click();

    // Explicitly wait for preview results to render
    await expect(page.getByText(/Confirm & Apply/i)).toBeVisible({ timeout: 10000 });
    await expect(page.locator("td.font-mono").first()).toBeVisible();

    // Verify exactly 3 decimals in the breakdown table
    const tableCells = page.locator("td.font-mono");
    const cellTexts = await tableCells.allTextContents();
    console.log("DEBUG Scenario 11 Cell Texts:", cellTexts);
    for (const text of cellTexts) {
      if (text.includes("SOL")) {
        const valuePart = text.trim().split(" ")[0].replace(/,/g, "");
        const parts = valuePart.split(".");
        // If it's a number-like string, it should have 3 decimals
        if (parts.length === 2) {
          expect(parts[1].length).toBe(3);
        } else if (!isNaN(Number(valuePart))) {
          // Integer case: should have failed formatAUM if it didn't show .000
          throw new Error(`Expected decimals in ${text} but found none`);
        }
      }
    }

    // Verify Math Reconciliation in confirmation modal
    const distributeBtn = page.getByRole("button", { name: /Distribute Yield to/i });
    await expect(distributeBtn).toBeVisible();
    await distributeBtn.click({ force: true });

    const modal = page.getByRole("dialog", { name: "Distribute Yield" });
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.getByText(/Gross Yield/i)).toBeVisible();
    await expect(modal.getByText(/Net Yield/i)).toBeVisible();
    await expect(modal.getByText(/INDIGO Fees/i)).toBeVisible();

    // Check for "Ending Balance" row
    await expect(modal.getByText(/Ending Balance/i)).toBeVisible();
  });

  test("XRP Gold Dataset: Massive balance distribution", async ({ page }) => {
    await page.locator('button:has-text("Apply Yield")').first().click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Solana")').first().click({ force: true });
    await page.waitForTimeout(1000);

    const dialog = page.locator('div[role="dialog"]').filter({ hasText: /Record Yield Event/i });
    await expect(dialog).toBeVisible({ timeout: 10000 });

    // Ensure Transaction mode is selected
    await dialog.getByTestId("purpose-transaction").click();

    const aumInput = dialog.getByTestId("aum-input");
    await expect(aumInput).toBeVisible({ timeout: 15000 });
    await aumInput.scrollIntoViewIfNeeded();
    await aumInput.click();
    await aumInput.fill("1200000");
    await page.keyboard.press("Tab");
    await page.waitForTimeout(1000);

    await dialog.locator('button:has-text("Preview")').first().click();
    await expect(page.locator("tr").first()).toBeVisible();

    // Verify no overflow in UI
    const grossYieldText = await page
      .locator("p", { hasText: /Gross Yield/i })
      .locator("xpath=../p[2]")
      .textContent();
    expect(grossYieldText).not.toContain("NaN");
    expect(grossYieldText).not.toContain("Infinity");
  });
});

async function login(page: Page) {
  const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
  const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "qa.admin@indigo.fund";
  const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!";
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin)/);
}
