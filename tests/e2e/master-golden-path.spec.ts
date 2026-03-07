import { test, expect, Page } from "@playwright/test";

// Environment Configuration
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "qa.admin@indigo.fund";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "IndigoInvestor2026!";
const INVESTOR_EMAIL = process.env.TEST_INVESTOR_EMAIL || "alice@test.indigo.com";
const INVESTOR_PASSWORD = process.env.TEST_INVESTOR_PASSWORD || "Alice!Investor2026#Secure";

// Helper Functions
async function login(page: Page, email: string, password: string) {
  console.log(`LOGIN: Navigating to ${BASE_URL} for ${email}`);
  await page.goto(BASE_URL);
  await page.waitForLoadState("networkidle");

  if (page.url().includes("/login")) {
    await page.fill('input[type="email"], input[name="email"]', email);
    await page.fill('input[type="password"], input[name="password"]', password);
    await page.click('button[type="submit"]');
  }

  if (email.includes("admin")) {
    console.log("LOGIN: Waiting for dashboard content...");
    await page.waitForSelector("text=Command Center", { timeout: 30000 });
  } else {
    await page.waitForURL(/\/(dashboard|investor)/, { timeout: 15000 });
  }
  console.log("LOGIN: Dashboard loaded successfully.");
}

async function logout(page: Page) {
  // Try finding a logout button, nav link, or profile menu trigger
  const userMenu = page.locator('button:has-text("Profile"), [data-testid="user-menu"]');
  if ((await userMenu.count()) > 0) {
    await userMenu.first().click();
  }

  const logoutButton = page
    .locator(
      'button:has-text("Logout"), button:has-text("Log Out"), a:has-text("Logout"), a:has-text("Log Out"), [data-testid="logout"]'
    )
    .first();
  if (await logoutButton.isVisible()) {
    await logoutButton.click();
    await page.waitForLoadState("networkidle");
    await expect(page).toHaveURL(/\/(login)?$/);
  } else {
    // Force redirect to clear session if UI button isn't found
    await page.goto(`${BASE_URL}/login`);
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
      await options.filter({ hasText: /Indigo Alpha Fund/i }).click();
    }

    // 3. Investor
    const investorContainer = modal.locator('div.space-y-2:has(label:has-text("Investor"))');
    const investorTrigger = investorContainer.locator('button[role="combobox"]');
    if (await investorTrigger.isVisible()) {
      await investorTrigger.click();
      await page.getByPlaceholder("Search by name or email...").fill("Alice");
      await page.getByRole("option", { name: /Alice/i }).first().click();
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
    // Navigate to Command Center
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Click "Apply Yield" from the quick actions
    await page.getByRole("button", { name: "Apply Yield" }).click();

    // Select the "Indigo Alpha Fund" fund from the modal
    const alphaFundBtn = page.locator("button").filter({ hasText: /Indigo Alpha Fund/i });
    await alphaFundBtn.waitFor({ state: "visible" });
    await alphaFundBtn.click();

    // Fill New AUM
    const newAumInput = page.locator('input#new-aum, input[placeholder*="AUM"]');
    await newAumInput.waitFor({ state: "visible" });
    await newAumInput.fill("10500"); // Represents a 5% positive yield if baseline is 10000

    // Preview Distribution
    const previewBtn = page
      .locator('button:has-text("Preview Distribution"), button:has-text("Preview")')
      .first();
    await previewBtn.waitFor({ state: "visible" });
    await previewBtn.click();

    // Click "Distribute Yield to X Investors" in the preview
    const distributeBtn = page.locator("button").filter({ hasText: /Distribute Yield to/i });
    await distributeBtn.waitFor({ state: "visible", timeout: 10000 });
    await distributeBtn.click();

    // Check the confirmation checkbox in the final modal
    const confirmCheckbox = page.locator('button[id="confirm-distribution"], [role="checkbox"]');
    await confirmCheckbox.waitFor({ state: "visible" });
    await confirmCheckbox.click();

    // Click "Confirm Distribution"
    const finalConfirmBtn = page.getByRole("button", { name: /Confirm Distribution/i });
    await expect(finalConfirmBtn).toBeEnabled();
    await finalConfirmBtn.click();

    // Verify Success Phase ("Distribution complete")
    const successMessage = page.getByText(/Distribution complete/i);
    await expect(successMessage).toBeVisible({ timeout: 15000 });

    // Close modal
    const doneBtn = page.getByRole("button", { name: "Done" });
    if (await doneBtn.isVisible()) {
      await doneBtn.click();
    }

    await expect(page.getByRole("dialog")).toBeHidden();
  });

  test("4. Void Cascade Verification", async () => {
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
    const voidMenuOption = page.locator('[role="menuitem"]').filter({ hasText: "Void" });
    await voidMenuOption.waitFor({ state: "visible" });
    await voidMenuOption.click();

    // Confirm Void Modal - V5 requires reason and explicit "VOID" typing
    const reasonInput = page.locator('textarea[id="reason"]');
    await reasonInput.waitFor({ state: "visible" });
    await reasonInput.fill("E2E Test Void");

    const confirmInput = page.locator('input[id="confirm"]');
    await confirmInput.fill("VOID");

    const confirmBtn = page.locator('button:has-text("Void Transaction")');
    await expect(confirmBtn).toBeEnabled();
    await confirmBtn.click();

    // Verify Void Success Toast
    const toastMessage = page.getByText(/Transaction voided successfully/i);
    await expect(toastMessage).toBeVisible({ timeout: 15000 });
  });

  test("5. Investor Perspective Verification", async () => {
    await logout(page);

    // Login as Investor
    await login(page, INVESTOR_EMAIL, INVESTOR_PASSWORD);

    // Verify Dashboard loads
    await expect(page).toHaveURL(/\/investor/);

    // Verify Initial Deposit value. It should be 10,000 exactly because the yield was voided.
    // Looking for a balance indicator. We use regex since it might be formatted like $10,000.00
    const balanceIndicator = page.locator("text=/10,?000(\\.00)?/");
    await expect(balanceIndicator.first()).toBeVisible({ timeout: 10000 });
  });
});
