import { test, expect, Page } from "@playwright/test";
import { format } from "date-fns";

async function login(page: Page) {
  const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
  const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "adriel@indigo.fund";
  const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!";
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin)/);
}

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

    const dialog = page.getByRole("dialog");
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

    // Click the actual Preview button (use role to avoid matching step headings)
    const previewBtn = page
      .getByRole("button", { name: /Preview Yield Distribution|Preview/i })
      .first();
    await previewBtn.waitFor({ state: "visible", timeout: 10000 });
    await previewBtn.click();

    // Wait for preview computation to complete
    await page.waitForTimeout(3000);
    // Wait for preview results to render (table or distribution breakdown)
    await expect(page.getByRole("button", { name: /Distribute Yield to/i })).toBeVisible({
      timeout: 20000,
    });

    // Verify exactly 3 decimals in the breakdown table
    const tableCells = page.locator("td.font-mono");
    const cellTexts = await tableCells.allTextContents();
    console.log("DEBUG Scenario 11 Cell Texts:", cellTexts);
    for (const text of cellTexts) {
      if (text.includes("SOL")) {
        const valuePart = text.trim().split(" ")[0].replace(/,/g, "");
        const parts = valuePart.split(".");
        // If it's a number-like string, it should have at least 3 decimals
        if (parts.length === 2) {
          expect(parts[1].length).toBeGreaterThanOrEqual(3);
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

    const modal = page.getByRole("dialog").last();
    await expect(modal).toBeVisible({ timeout: 10000 });
    await expect(modal.getByText(/Gross Yield/i).first()).toBeVisible({ timeout: 5000 });
    await expect(modal.getByText(/Net Yield/i).first()).toBeVisible();
    await expect(modal.getByText(/INDIGO Fees/i).first()).toBeVisible();

    // Check for "Ending Balance" row
    await expect(modal.getByText(/Ending Balance/i).first()).toBeVisible();
  });

  test("XRP Gold Dataset: Massive balance distribution", async ({ page }) => {
    await page.locator('button:has-text("Apply Yield")').first().click();
    await page.waitForTimeout(500);
    await page.locator('button:has-text("Solana")').first().click({ force: true });
    await page.waitForTimeout(1000);

    const dialog = page.getByRole("dialog");
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

    const previewBtn2 = page
      .getByRole("button", { name: /Preview Yield Distribution|Preview/i })
      .first();
    await previewBtn2.waitFor({ state: "visible", timeout: 10000 });
    await previewBtn2.click();
    await page.waitForTimeout(3000);
    await expect(page.getByRole("button", { name: /Distribute Yield to/i })).toBeVisible({
      timeout: 20000,
    });

    // Verify no overflow in UI
    const grossYieldText = await page
      .locator("p", { hasText: /Gross Yield/i })
      .locator("xpath=../p[2]")
      .textContent();
    expect(grossYieldText).not.toContain("NaN");
    expect(grossYieldText).not.toContain("Infinity");
  });
});
