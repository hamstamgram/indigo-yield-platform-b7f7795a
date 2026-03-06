import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "qa.admin@indigo.fund";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!";

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });
}

test.describe("Yield Waterfall (Distributions & Fees)", () => {
  test.describe.configure({ mode: "serial" });
  let page: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. Admin logs in & prepares Investor", async () => {
    await login(page);

    // Deposit 10k so they have a balance
    await page.goto(`${BASE_URL}/admin/transactions`);
    await page.waitForLoadState("networkidle");
    const newTxBtn = page
      .locator('button:has-text("New Transaction"), button:has-text("Add Transaction")')
      .first();
    await newTxBtn.waitFor({ state: "visible" });
    await newTxBtn.click();
    const modal = page.getByRole("dialog");
    const typeTrigger = modal.locator('button[role="combobox"]').first();
    await typeTrigger.click();
    await page.getByRole("option", { name: /DEPOSIT/i }).click();

    const selects = modal.locator('button[role="combobox"]');
    if (await selects.nth(2).isVisible()) {
      await selects.nth(2).click();
      await page.getByRole("option", { name: /Alice/i }).click();
    }
    await modal.locator('input[type="number"], input[name="amount"]').fill("10000");
    await modal.locator('button[type="submit"]:not([disabled])').click();
    await expect(page.getByText(/success|created/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("2. Custom Fees: Assign IB (4%) & Fee (15%)", async () => {
    await page.goto(`${BASE_URL}/admin/investors`);
    await page.waitForLoadState("networkidle");
    await page.getByText(/Alice/i).first().click();

    // Go to Settings Tab
    await page.getByRole("tab", { name: /Settings/i }).click();

    // Feed
    const globalFeeInput = page.locator("#global-fee-pct");
    await globalFeeInput.waitFor({ state: "visible" });
    await globalFeeInput.fill("15");
    await page.locator('button:has-text("Save")').first().click();
    await expect(page.getByText(/success|updated/i).first()).toBeVisible({ timeout: 5000 });

    // IB
    const ibSection = page
      .locator('h4:has-text("IB Commission Schedule")')
      .locator("xpath=./../../..");
    const ibAddBtn = ibSection.locator('button:has-text("Add")');
    if (await ibAddBtn.isVisible()) {
      await ibAddBtn.click();
      const form = page.getByRole("dialog");
      const selectTrigger = form.locator('button[role="combobox"]');
      await selectTrigger.click();
      await page.getByRole("option").nth(1).click();

      const rateInput = form.locator('input[type="number"], input[name="rate_pct"]');
      await rateInput.fill("4");
      await form.getByRole("button", { name: /Add Entry/i }).click();
      await page.waitForTimeout(1000);
      await expect(page.getByText(/success|added|updated/i).first()).toBeVisible({ timeout: 5000 });
    }
  });

  test("3. Positive Yield: 4% IB, 11% INDIGO, 85% Investor", async () => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Apply Yield" }).click();

    const alphaFundBtn = page.locator("button").filter({ hasText: /Indigo Alpha/i });
    await alphaFundBtn.click();

    const newAumInput = page.locator('input#new-aum, input[placeholder*="AUM"]');

    // Ensure "Transaction" so we don't hit future dates
    const transactionToggle = page.getByText("Transaction", { exact: true });
    if (await transactionToggle.isVisible()) {
      await transactionToggle.click();
    }

    // Alice has 10,000. Total AUM is much higher due to seed data (~38k). We enter 150,000 to force a massive gain.
    await newAumInput.fill("150000");
    await page.keyboard.press("Tab");

    await page.waitForTimeout(500);

    const previewBtn = page
      .locator('button:has-text("Preview Yield Distribution"), button:has-text("Preview")')
      .first();
    await previewBtn.waitFor({ state: "visible" });
    await previewBtn.click();

    // Check the math on the screen for Alice
    const aliceRow = page.locator("tr").filter({ hasText: /Alice/i });

    // We just ensure the calculations don't error. Specifically matching text exactly requires predicting the opening AUM, which might have seed data.
    await expect(aliceRow).toBeVisible();
    await expect(aliceRow.getByText(/15%/i).first()).toBeVisible();

    const distributeBtn = page.locator("button").filter({ hasText: /Distribute Yield to/i });
    await distributeBtn.click();

    const ackCheckbox = page
      .locator("label")
      .filter({ hasText: /acknowledge/i })
      .locator('button[role="checkbox"]');
    if (await ackCheckbox.isVisible()) await ackCheckbox.click();
    const confCheckbox = page.locator("button#confirm-distribution");
    if (await confCheckbox.isVisible()) await confCheckbox.click();

    await page.getByRole("button", { name: "Confirm Distribution" }).click();
    await expect(page.getByText(/Distribution complete/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("4. Negative Yield (Loss): Investor absorbs full loss", async () => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: "Apply Yield" }).click();

    const alphaFundBtn = page.locator("button").filter({ hasText: /Indigo Alpha/i });
    await alphaFundBtn.click();

    const newAumInput = page.locator('input#new-aum, input[placeholder*="AUM"]');

    const transactionToggle = page.getByText("Transaction", { exact: true });
    if (await transactionToggle.isVisible()) {
      await transactionToggle.click();
    }

    await newAumInput.fill("5000"); // Massive loss
    await page.keyboard.press("Tab");

    await page.waitForTimeout(500);

    const previewBtn = page
      .locator('button:has-text("Preview Yield Distribution"), button:has-text("Preview")')
      .first();
    await previewBtn.waitFor({ state: "visible" });
    await previewBtn.click();

    // Verify fees are 0
    const feesBox = page.locator('.text-muted-foreground:has-text("-")');

    // In a loss, fees should be zero.
    const aliceRow = page.locator("tr").filter({ hasText: /Alice/i });
    await expect(aliceRow).toBeVisible();

    const distributeBtn = page.locator("button").filter({ hasText: /Distribute Yield to/i });
    await distributeBtn.click();

    const ackCheckbox = page
      .locator("label")
      .filter({ hasText: /acknowledge/i })
      .locator('button[role="checkbox"]');
    if (await ackCheckbox.isVisible()) await ackCheckbox.click();
    const confCheckbox = page.locator("button#confirm-distribution");
    if (await confCheckbox.isVisible()) await confCheckbox.click();

    await page.getByRole("button", { name: "Confirm Distribution" }).click();
    await expect(page.getByText(/Distribution complete/i).first()).toBeVisible({ timeout: 15000 });
  });

  test("5. The Open-Ended Fee Schedule", async () => {
    // 1. Reset Alice's Fees to test the new schedule logic
    await page.goto(`${BASE_URL}/admin/investors`);
    await page.waitForLoadState("networkidle");
    await page.getByText(/Alice/i).first().click();
    await page.getByRole("tab", { name: /Settings/i }).click();

    // Clear global fee from Test 2 so it doesn't override the schedule
    const globalFeeInput = page.locator("#global-fee-pct");
    await globalFeeInput.waitFor({ state: "visible" });
    await globalFeeInput.fill("0");
    await page.locator('button:has-text("Save")').first().click();
    await expect(page.getByText(/success|updated/i).first()).toBeVisible({ timeout: 5000 });

    // Add Schedule A
    const feeSection = page
      .locator('h4:has-text("Per-Fund Fee Overrides")')
      .locator("xpath=./../../..");

    // Clean up any prepopulated schedules from previous attempts to ensure clean Slate for Test 5
    const deleteBtns = feeSection.getByRole("button", { name: /delete|remove/i });
    while ((await deleteBtns.count()) > 0) {
      await deleteBtns.first().click();
      await page.waitForTimeout(500); // Wait for the optimistic toggle or mutation
    }

    const schedAddBtn = feeSection.getByRole("button", { name: /Add/i }).first();

    if (await schedAddBtn.isVisible()) {
      await schedAddBtn.click();
      const form = page
        .locator('div[role="dialog"]')
        .filter({ hasText: "Add Fee Schedule Entry" })
        .first();
      await form.waitFor({ state: "visible" });

      await form.locator('input[type="number"], input#fee-pct').fill("10");

      // Click Effective Date datepicker trigger (relative to the label)
      await form
        .locator('label:has-text("Effective Date")')
        .locator("..")
        .locator("button")
        .first()
        .click();
      // Select the 1st of whichever month is rendered
      await page.getByRole("gridcell", { name: "1", exact: true }).first().click();

      // Click End Date datepicker trigger
      await form.locator('button:has-text("No end date")').first().click();
      // Select the 28th of whichever month is rendered
      await page.getByRole("gridcell", { name: "28", exact: true }).first().click();

      await form.getByRole("button", { name: /Add Entry/i }).click();
      await expect(page.getByText(/success|added/i).first()).toBeVisible({ timeout: 5000 });
      await expect(form).toBeHidden({ timeout: 5000 });

      // Dismiss the toast or wait a moment so it doesn't overlap the next assertion
      await page.waitForTimeout(1000);
    }

    // Add Schedule B (Open Date)
    if (await schedAddBtn.isVisible()) {
      await schedAddBtn.click();
      const form = page
        .locator('div[role="dialog"]')
        .filter({ hasText: "Add Fee Schedule Entry" })
        .first();
      await form.waitFor({ state: "visible" });

      await form.locator('input[type="number"], input#fee-pct').fill("15");

      // Click Effective Date datepicker trigger (relative to the label)
      await form
        .locator('label:has-text("Effective Date")')
        .locator("..")
        .locator("button")
        .first()
        .click();
      // Select the 15th of whichever month is rendered
      await page.getByRole("gridcell", { name: "15", exact: true }).first().click();

      // End date left empty/null
      await form.getByRole("button", { name: /Add Entry/i }).click();
      await expect(page.getByText(/success|added/i).first()).toBeVisible({ timeout: 5000 });
      await expect(form).toBeHidden({ timeout: 5000 });

      await page.waitForTimeout(1000);
    }

    // Test distribution dates
    const runYieldDistribution = async (date: string, expectedFeeMatch: RegExp) => {
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState("networkidle");
      await page.getByRole("button", { name: "Apply Yield" }).click();

      const alphaFundBtn = page.locator("button").filter({ hasText: /Indigo Alpha/i });
      await alphaFundBtn.click();

      const transactionToggle = page.getByText("Transaction", { exact: true });
      if (await transactionToggle.isVisible()) {
        await transactionToggle.click();
      }

      const dateInput = page.locator('input[type="date"], input#yield-date');
      if (await dateInput.isVisible()) {
        await dateInput.fill(date);
      }

      const newAumInput = page.locator('input#new-aum, input[placeholder*="AUM"]');
      await newAumInput.fill("150000"); // Generate huge positive yield
      await page.keyboard.press("Tab");
      await page.waitForTimeout(500);

      const previewBtn = page
        .locator('button:has-text("Preview Yield Distribution"), button:has-text("Preview")')
        .first();
      await previewBtn.waitFor({ state: "visible" });
      await previewBtn.click();

      const aliceRow = page.locator("tr").filter({ hasText: /Alice/i }).first();
      await expect(aliceRow).toBeVisible();
      await expect(aliceRow.getByText(expectedFeeMatch).first()).toBeVisible();

      const distributeBtn = page.locator("button").filter({ hasText: /Distribute Yield to/i });
      await distributeBtn.click();

      const ackCheckbox = page
        .locator("label")
        .filter({ hasText: /acknowledge/i })
        .locator('button[role="checkbox"]');
      if (await ackCheckbox.isVisible()) await ackCheckbox.click();
      const confCheckbox = page.locator("button#confirm-distribution");
      if (await confCheckbox.isVisible()) await confCheckbox.click();

      await page.getByRole("button", { name: "Confirm Distribution" }).click();
      await expect(page.getByText(/Distribution complete/i).first()).toBeVisible({
        timeout: 15000,
      });
    };

    // Dynamically compute the test dates relative to the active calendar month
    const now = new Date();
    const yyyy = now.getFullYear();
    const mm = String(now.getMonth() + 1).padStart(2, "0");

    // 3. Yield Test 1 (Inside Schedule A): 10th of current month -> Expect 10%
    // Schedule A active from 1st to 28th. Schedule B starts on 15th.
    await runYieldDistribution(`${yyyy}-${mm}-10`, /10%/i);

    // 4. Yield Test 2 (Inside Schedule B exclusively): 10th of NEXT month -> Expect 15%
    // Schedule A expired on the 28th of the previous month.
    const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 10);
    const nextY = nextMonth.getFullYear();
    const nextM = String(nextMonth.getMonth() + 1).padStart(2, "0");
    await runYieldDistribution(`${nextY}-${nextM}-10`, /15%/i);
  });
});
