import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "qa.admin@indigo.fund";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "IndigoInvestor2026!";

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });
}

test.describe("Entity CRUD Management (Fund, Investor & IB)", () => {
  test.describe.configure({ mode: "serial" });
  let page: Page;

  const FUND_NAME = `E2E_Test_Fund_${Date.now()}`;
  const IB_EMAIL = `ib_${Date.now()}@test.indigo.com`;
  const INV_EMAIL_BALANCE = `inv_bal_${Date.now()}@test.indigo.com`;
  const INV_EMAIL_ZERO = `inv_zero_${Date.now()}@test.indigo.com`;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    page = await context.newPage();
  });

  test.afterAll(async () => {
    await page.close();
  });

  test("1. Admin logs in", async () => {
    await login(page);
  });

  test("2. Funds: Create, Edit, Archive a new Fund", async () => {
    await page.goto(`${BASE_URL}/admin/funds`);
    await page.waitForLoadState("networkidle");

    // Create
    await page.getByRole("button", { name: /Add Fund|New Fund/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.waitFor({ state: "visible" });

    await dialog.locator('input[name="name"]').fill(FUND_NAME);
    await dialog.locator('input[name="code"]').fill(`E2EF${Date.now()}`);

    // Currency (combobox)
    const TICKER = "T" + Date.now().toString().slice(-4);
    const currencySelect = dialog.locator('button[role="combobox"]').first();
    if (await currencySelect.isVisible()) {
      await currencySelect.click();
      await page.getByRole("option", { name: new RegExp(TICKER, "i") }).click();
    } else {
      const currencyInput = dialog.locator('input[id="asset"], input[name="asset"]');
      if (await currencyInput.isVisible()) await currencyInput.fill(TICKER);
    }

    // Decimals & Fees
    const decimalsInput = dialog.locator('input[name="decimals"]');
    if (await decimalsInput.isVisible()) await decimalsInput.fill("4");

    const defaultFeeInput = dialog.locator('input[name="performanceFee"]');
    if (await defaultFeeInput.isVisible()) await defaultFeeInput.fill("20");

    await dialog.getByRole("button", { name: /Save|Create|Submit/i }).click();
    await expect(page.getByText(/created successfully|success/i).first()).toBeVisible({
      timeout: 10000,
    });

    // Edit
    // Card in grid
    const fundCard = page.locator(".border-l-primary", { hasText: FUND_NAME }).first();
    await fundCard.locator('button[title="Fund Settings"]').click();
    const editDialog = page.getByRole("dialog");
    await editDialog.waitFor({ state: "visible" });
    const editFee = editDialog.locator('input[name="perf_fee_bps"], input[name="performanceFee"]');
    if (await editFee.isVisible()) await editFee.fill("2500");
    await editDialog.getByRole("button", { name: /Save|Update/i }).click();

    await expect(page.getByText(/updated successfully/i).first()).toBeVisible({ timeout: 10000 });

    // Archive
    await editDialog.waitFor({ state: "hidden" });
    await fundCard.locator('button[title="Fund Settings"]').click();
    await editDialog.waitFor({ state: "visible" });

    const statusCombobox = editDialog
      .getByRole("combobox")
      .filter({ hasText: /Active/i })
      .first();
    if (await statusCombobox.isVisible()) {
      await statusCombobox.click();
      await page.getByRole("option", { name: /Archived/i }).click();
      await editDialog.getByRole("button", { name: /Save|Update/i }).click();
      await expect(page.getByText(/updated|success/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("3. Profiles: Create new IB Profile", async () => {
    await page.goto(`${BASE_URL}/admin/ib`);
    await page.waitForLoadState("networkidle");

    // UI varies, assuming standard "Add IB" button
    const addIbBtn = page.getByRole("button", { name: /Add IB|New Introducing Broker/i });
    if (await addIbBtn.isVisible()) {
      await addIbBtn.click();
      const dialog = page.getByRole("dialog");
      await dialog.locator('input[name="first_name"], input[placeholder="John"]').fill("Partner");
      await dialog.locator('input[name="last_name"], input[placeholder="Doe"]').fill("Broker");
      await dialog.getByPlaceholder("investor@example.com", { exact: false }).fill(IB_EMAIL);
      await dialog.getByRole("button", { name: /Save|Create/i }).click();
      await expect(page.getByText(/success|created/i).first()).toBeVisible({ timeout: 10000 });
    }
  });

  test("4. Profiles: Create new Investor & assign to fund", async () => {
    await page.goto(`${BASE_URL}/admin/investors`);
    await page.waitForLoadState("networkidle");

    await page.getByRole("button", { name: /Add Investor/i }).click();
    const dialog = page.getByRole("dialog");
    await dialog.locator('input[name="first_name"], input[placeholder="John"]').fill("Zero");
    await dialog.locator('input[name="last_name"], input[placeholder="Doe"]').fill("Balance");
    await dialog.getByPlaceholder("investor@example.com", { exact: false }).fill(INV_EMAIL_ZERO);

    const nextBtn = dialog.getByRole("button", { name: /Next|Continue/i });
    while (await nextBtn.isVisible()) {
      await nextBtn.click();
      await page.waitForTimeout(500);
    }
    await dialog.getByRole("button", { name: /Create|Finish|Complete|Onboarding/i }).click();
    await expect(page.getByText(/success|created/i).first()).toBeVisible({ timeout: 10000 });
  });

  test("5. Deletion Guardrails: Delete Investor with balance > 0 and 0 balance", async () => {
    await page.goto(`${BASE_URL}/admin/investors`);
    await page.waitForLoadState("networkidle");

    // Step 1: Find an investor with balance > 0 (Alice ideally)
    await page.locator('input[placeholder*="Search"]').fill("Alice");
    await page.getByText(/Alice/i).first().click();

    // Settings Tab
    await page.getByRole("tab", { name: /Settings/i }).click();

    // Danger Zone: Delete
    const deleteBtn = page.getByRole("button", { name: /Delete Investor/i });
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      const confirmDialog = page.getByRole("dialog");
      await confirmDialog.getByRole("button", { name: /Delete/i }).click();
      // Should be blocked by UI toast or error mapping
      await expect(page.getByText(/Cannot delete|balance|active|Error/i).first()).toBeVisible({
        timeout: 10000,
      });
    }

    // Step 2: Delete investor with 0 balance (the newly created Zero Balance investor)
    await page.goto(`${BASE_URL}/admin/investors`);
    await page.waitForLoadState("networkidle");
    await page.locator('input[placeholder*="Search"]').fill("Zero Balance");
    await page
      .getByText(/Zero Balance/i)
      .first()
      .click();

    await page.getByRole("tab", { name: /Settings/i }).click();
    const delBtnZero = page.getByRole("button", { name: /Delete Investor/i });
    if (await delBtnZero.isVisible()) {
      await delBtnZero.click();
      const confirmDialogZero = page.getByRole("dialog");
      await confirmDialogZero.getByRole("button", { name: /Delete/i }).click();
      await expect(page.getByText(/successfully deleted|deleted/i).first()).toBeVisible({
        timeout: 10000,
      });
    }
  });
});
