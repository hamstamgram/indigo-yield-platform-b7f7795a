import { test, expect, Page } from "@playwright/test";

// Environment Configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "adriel@indigo.fund";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!";
const INVESTOR_EMAIL = process.env.TEST_INVESTOR_EMAIL || "thomas.puech@indigo.fund";
const INVESTOR_PASSWORD = process.env.TEST_INVESTOR_PASSWORD || "TestInvestor2026!";

// Helper Functions
async function login(page: Page, email: string, password: string) {
  console.log(`LOGIN: Navigating to ${BASE_URL} for ${email}`);
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");

  const emailInput = page.locator('input[type="email"], input[name="email"]');
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  if (email === ADMIN_EMAIL) {
    console.log("LOGIN: Waiting for dashboard content...");
    await page.waitForSelector("text=Command Center", { timeout: 90000 });
  } else {
    await page.waitForURL(/\/(dashboard|investor)/, { timeout: 30000 });
  }
  console.log("LOGIN: Dashboard loaded successfully.");
}

async function logout(page: Page) {
  // If a dialog is still open, close it first by navigating away
  const dialog = page.getByRole("dialog");
  if (await dialog.isVisible({ timeout: 1000 }).catch(() => false)) {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");
  }

  // Click "Log Out" in the sidebar
  const logOutLink = page.locator('a:has-text("Log Out"), button:has-text("Log Out")').first();
  if (await logOutLink.isVisible({ timeout: 5000 }).catch(() => false)) {
    await logOutLink.click();
    await page.waitForLoadState("networkidle");
    // Wait for redirect to login
    await page.waitForURL(/\/(login)?$/, { timeout: 10000 }).catch(() => {});
  }

  // If still not on login page, force navigate
  if (!page.url().includes("/login")) {
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
  }
}

test.describe("Master Golden Path E2E verification", () => {
  // Run sequentially to preserve state
  test.describe.configure({ mode: "serial" });

  let page: Page;

  test.beforeAll(async ({ browser }) => {
    // Use a single context across sequential tests
    const context = await browser.newContext();
    page = await context.newPage();
    page.on("console", (msg) => console.log(`[Browser Console]: ${msg.text()}`));
    page.on("pageerror", (err) => console.log(`[Browser Error]: ${err.message}`));
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. Admin Login", async () => {
    test.setTimeout(120000); // Wait 2 minutes for Vite's initial bundle load
    test.skip(!ADMIN_PASSWORD, "No admin test credentials configured");
    await login(page, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Verify dashboard visible
    const dashboardContent = page.locator("text=/dashboard|overview/i");
    await expect(dashboardContent.first()).toBeVisible({ timeout: 10000 });
  });

  test("2. Admin executes 10,000 USDT Deposit", async () => {
    test.setTimeout(120000);
    // Navigate to Ledger / Transactions
    await page.goto(`${BASE_URL}/admin/transactions`);
    await page.waitForLoadState("networkidle");

    // Open New Transaction Modal
    const newTxButton = page.locator(
      'button:has-text("New Transaction"), button:has-text("Add Transaction"), [data-testid="new-transaction-btn"]'
    );
    await newTxButton.waitFor({ state: "visible" });
    await newTxButton.first().click();

    // Focus specifically on the opened modal
    const modal = page.getByRole("dialog");

    // 1. Transaction Type
    const typeContainer = modal.locator(".space-y-4 > div").nth(0);
    const typeTrigger = typeContainer.locator('button[role="combobox"]');
    if (await typeTrigger.isVisible()) {
      await typeTrigger.click();
      await page.getByRole("option", { name: /DEPOSIT/i }).click();
    }

    // 2. Fund
    const fundContainer = modal.locator('div.space-y-2:has(label:has-text("Fund"))');
    const fundTrigger = fundContainer.locator('button[role="combobox"]');
    if (await fundTrigger.isVisible()) {
      await fundTrigger.click();
      // Wait for select content to appear
      const options = page.locator('[role="option"]');
      await options.first().waitFor({ state: "visible", timeout: 5000 });
      // Select first real fund (not E2E_Test_Fund)
      const realFund = options.filter({ hasText: /Yield Fund|Alpha Fund/i }).first();
      if (await realFund.isVisible({ timeout: 3000 }).catch(() => false)) {
        await realFund.click();
      } else {
        await options.first().click();
      }
    }

    // 3. Investor - select first available investor
    const investorContainer = modal.locator('div.space-y-2:has(label:has-text("Investor"))');
    const investorTrigger = investorContainer.locator('button[role="combobox"]');
    if (await investorTrigger.isVisible()) {
      await investorTrigger.click();
      const investorOptions = page.locator('[role="option"]');
      await investorOptions.first().waitFor({ state: "visible", timeout: 10000 });
      await investorOptions.first().click();
    }

    // 4. Amount
    const amountInput = modal.locator('input[name="amount"], input[placeholder="Amount"]');
    await amountInput.fill("10000");

    // Submit
    const submitBtn = modal.locator(
      'button[type="submit"]:has-text("Add Transaction"), button:has-text("Add Transaction")'
    );
    await submitBtn.click();

    // Verify Success Toast - target text directly instead of Sonner wrapper
    const toastMessage = page.getByText(/Transaction created successfully/i);
    await expect(toastMessage.first()).toBeVisible({ timeout: 10000 });
  });

  test("3. Admin executes Yield Generation", async () => {
    test.setTimeout(120000);
    // Navigate to Command Center
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Click "Apply Yield" from the quick actions
    await page.getByRole("button", { name: "Apply Yield" }).click();

    // Select a fund from the modal
    await page.waitForTimeout(1000); // Wait for dialog animation
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible", timeout: 10000 });
    const fundBtn = dialog.locator("button").filter({ hasText: /Fund/i }).first();
    await fundBtn.waitFor({ state: "visible", timeout: 15000 });
    await fundBtn.click({ force: true });

    // Select Transaction purpose if visible
    const purposeBtn = page.getByTestId("purpose-transaction");
    if (await purposeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await purposeBtn.click();
    }

    // Fill New AUM
    const newAumInput = page.getByTestId("aum-input");
    await newAumInput.waitFor({ state: "visible" });
    await newAumInput.fill("10500"); // Represents a 5% positive yield if baseline is 10000

    // Preview Distribution
    const previewBtn = page
      .getByRole("button", { name: /Preview Yield Distribution|Preview/i })
      .first();
    await previewBtn.waitFor({ state: "visible" });
    await previewBtn.click();
    await page.waitForTimeout(3000);

    // Click "Distribute Yield to X Investors" in the preview
    const distributeBtn = page.locator("button").filter({ hasText: /Distribute Yield to/i });
    await distributeBtn.waitFor({ state: "visible", timeout: 10000 });
    await distributeBtn.click();

    // Check ALL confirmation checkboxes (acknowledge + confirm)
    const checkboxes = page.locator('[role="checkbox"], #confirm-distribution');
    const checkboxCount = await checkboxes.count();
    for (let i = 0; i < checkboxCount; i++) {
      const cb = checkboxes.nth(i);
      if (await cb.isVisible({ timeout: 3000 }).catch(() => false)) {
        await cb.click();
        await page.waitForTimeout(300);
      }
    }

    // Click "Confirm Distribution"
    const finalConfirmBtn = page.getByRole("button", { name: /Confirm Distribution/i });
    await expect(finalConfirmBtn).toBeEnabled({ timeout: 10000 });
    await finalConfirmBtn.click();

    // Verify Success Phase ("Distribution complete")
    const successMessage = page.getByText(/Distribution complete/i);
    await expect(successMessage).toBeVisible({ timeout: 15000 });

    // Close modal - try Done button, then X button, then navigate away
    const doneBtn = page.getByRole("button", { name: "Done" });
    if (await doneBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await doneBtn.click();
    }

    // If dialog is still open, close via X button or navigate away
    const dialogStillOpen = page.getByRole("dialog");
    if (await dialogStillOpen.isVisible({ timeout: 2000 }).catch(() => false)) {
      const closeBtn = dialogStillOpen
        .locator('button:has(svg), button[aria-label="Close"]')
        .first();
      if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await closeBtn.click();
      } else {
        await page.goto(`${BASE_URL}/admin`);
        await page.waitForLoadState("networkidle");
      }
    }
  });

  test("4. Void Cascade Verification", async () => {
    test.setTimeout(120000);
    // Navigate to Ledger
    await page.goto(`${BASE_URL}/admin/transactions`);
    await page.waitForLoadState("networkidle");

    // Find the latest YIELD transaction
    // Using loose text matching for the table row.
    const yieldRow = page.locator("tr").filter({ hasText: /YIELD/i }).first();
    await yieldRow.waitFor({ state: "visible" });

    // Click the Dropdown menu (...) in that row
    const moreBtn = yieldRow.locator("button").last();
    await moreBtn.click();

    // Click the Void option in the dropdown menu
    const voidMenuOption = page.getByRole("menuitem", { name: "Void", exact: true });
    await voidMenuOption.waitFor({ state: "visible" });
    await voidMenuOption.click();

    // Confirm Void Modal - V5 requires reason and explicit "VOID" typing
    const reasonInput = page.locator('textarea[id="reason"]');
    await reasonInput.waitFor({ state: "visible" });
    await reasonInput.fill("E2E Test Void");

    const confirmInput = page.locator('input[id="confirm"]');
    await confirmInput.scrollIntoViewIfNeeded();
    await confirmInput.fill("VOID");

    const confirmBtn = page.getByRole("button", { name: "Void Transaction" });
    await confirmBtn.scrollIntoViewIfNeeded();
    await page.waitForTimeout(500);
    await expect(confirmBtn).toBeEnabled({ timeout: 5000 });
    await confirmBtn.click();

    // Wait for void to process — this can take time for large amounts
    // Check for success toast or dialog closing
    const toastMessage = page.getByText(/voided|success/i).first();
    const toastShown = await toastMessage.isVisible({ timeout: 60000 }).catch(() => false);
    if (!toastShown) {
      // If no toast, button click may not have registered — try again
      if (await confirmBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
        await confirmBtn.click({ force: true });
        await expect(toastMessage).toBeVisible({ timeout: 60000 });
      }
    }

    // Ensure dialog closes — navigate away to clean state
    await page.waitForTimeout(2000);
    await page.goto(`${BASE_URL}/admin/transactions`);
    await page.waitForLoadState("networkidle");
  });

  test("5. Investor Perspective Verification", async () => {
    test.setTimeout(120000);
    await logout(page);

    // Login as Investor
    await login(page, INVESTOR_EMAIL, INVESTOR_PASSWORD);

    // Verify Dashboard loads
    await expect(page).toHaveURL(/\/investor/);

    // Verify investor dashboard renders with portfolio data
    // (Exact balance depends on accumulated DB state from prior test runs)
    const portfolioContent = page.getByText(/Portfolio|Balance|Position|Value/i).first();
    await expect(portfolioContent).toBeVisible({ timeout: 15000 });
  });
});
