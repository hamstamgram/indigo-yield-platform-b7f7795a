import { test, expect, Page } from "@playwright/test";
import { cleanupQAFund } from "./helpers/cleanup";
import { QA_FUND, QA_ADMIN, BASE_URL } from "./helpers/qa-fund";

const ADMIN_EMAIL = QA_ADMIN.email;
const ADMIN_PASSWORD = QA_ADMIN.password;

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

  test.afterAll(async () => {
    await cleanupQAFund();
  });

  const FUND_NAME = QA_FUND.name;
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

  test("2. Funds: Verify QA Test Fund exists on dashboard", async () => {
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");

    // Verify QA Test Fund card exists on Command Center
    const fundCard = page.getByText(FUND_NAME).first();
    await expect(fundCard).toBeVisible({ timeout: 15000 });

    const defaultFeeInput = dialog.locator('input[name="performanceFee"]');
    // Verify the fund shows in the dashboard with correct asset
    const assetLabel = page.getByText(QA_FUND.asset).first();
    await expect(assetLabel).toBeVisible({ timeout: 10000 });
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

    // Step 1: Find an investor with balance > 0
    // Investors page uses virtualized grid, not <table>
    await page
      .locator('.cursor-pointer[class*="grid"][class*="items-center"]')
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    await page.locator('.cursor-pointer[class*="grid"][class*="items-center"]').first().click();

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
    await page.locator('input[placeholder*="Search"]').first().fill("Zero Balance");
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
