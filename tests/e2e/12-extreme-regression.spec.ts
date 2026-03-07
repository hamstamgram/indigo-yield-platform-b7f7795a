import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "https://indigo-yield-platform.lovable.app";
const ADRIEL_EMAIL = process.env.TEST_ADMIN_EMAIL || "qa.admin@indigo.fund";
const ADRIEL_PASS = process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!";

const TIMESTAMP = Date.now();

// Helpers
async function loginAsAdmin(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  await page.fill('input[type="email"]', ADRIEL_EMAIL);
  await page.fill('input[type="password"]', ADRIEL_PASS);
  await page.click('button[type="submit"]');
  await page.waitForSelector("text=Command Center", { timeout: 30000 });
}

async function createFund(page: Page, fundName: string, assetType: string) {
  await page.goto(`${BASE_URL}/admin/funds`);
  await page
    .getByRole("button", { name: /Add Fund/i })
    .first()
    .click();
  const dialog = page.getByRole("dialog").first();
  await dialog.locator('input[name="name"]').fill(fundName);
  const code = `EXP${TIMESTAMP.toString().slice(-4)}${Math.floor(Math.random() * 100)}`;
  await dialog.locator('input[name="code"]').fill(code);
  await dialog.locator('button[role="combobox"]').first().click();
  await page.getByRole("option", { name: new RegExp(assetType, "i") }).click();
  await dialog.locator('input[name="inception_date"]').fill("2024-01-01");
  await dialog.getByRole("button", { name: /Create/i }).click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
}

async function createProfileUser(page: Page, fullName: string, email: string) {
  await page.goto(`${BASE_URL}/admin/investors`);
  await page
    .getByRole("button", { name: /Add Investor/i })
    .first()
    .click();
  const dialog = page.getByRole("dialog").first();
  const [first, ...rest] = fullName.split(" ");
  await dialog.locator('input[name="first_name"]').fill(first);
  await dialog.locator('input[name="last_name"]').fill(rest.join(" ") || "Regression");
  await dialog.locator('input[name="email"]').fill(email);
  await dialog
    .getByRole("button", { name: /Create|Onboarding/i })
    .last()
    .click();
  await expect(dialog).toBeHidden({ timeout: 10000 });
}

async function executeDeposit(
  page: Page,
  fundName: string,
  investorName: string,
  amount: string,
  dateStr: string
) {
  await page.goto(`${BASE_URL}/admin/transactions`);
  await page
    .getByRole("button", { name: /Add Transaction/i })
    .first()
    .click();
  const modal = page.getByRole("dialog");
  await modal.locator('button[role="combobox"]').nth(0).click();
  await page.getByRole("option", { name: /DEPOSIT/i }).click();
  await modal.locator('button[role="combobox"]').nth(1).click();
  await page.getByRole("option", { name: new RegExp(fundName, "i") }).click();
  await modal.locator('button[role="combobox"]').nth(2).click();
  await page
    .locator('[role="option"]')
    .filter({ hasText: new RegExp(investorName, "i") })
    .first()
    .click();
  await modal.locator('input[name="amount"]').fill(amount);
  await modal.locator('input[type="date"]').fill(dateStr);
  await modal.getByRole("button", { name: /Add Transaction/i }).click();
  await expect(modal).toBeHidden({ timeout: 10000 });
}

async function distributeYield(
  page: Page,
  fundName: string,
  newAUM: string,
  dateStr: string,
  asserts?: any[]
) {
  await page.goto(`${BASE_URL}/admin`);
  await page.getByRole("button", { name: /Apply Yield/i }).click();
  await page.getByRole("button").filter({ hasText: fundName }).first().click();
  await page.locator('input[type="date"]').fill(dateStr);
  await page.locator('input[name="newAUM"]').fill(newAUM);
  await page.getByRole("button", { name: /Preview/i }).click();

  if (asserts) {
    for (const req of asserts) {
      await expect(page.locator("table").filter({ hasText: req.name }).first()).toContainText(
        req.value
      );
    }
  }

  await page
    .getByRole("button", { name: /Distribute/i })
    .last()
    .click();
  await page.getByRole("button", { name: /Confirm/i }).click();
  await expect(page.getByText(/complete/i)).toBeVisible({ timeout: 25000 });
  await page
    .getByRole("button", { name: /Done/i })
    .click()
    .catch(() => {});
}

test.describe("Scenario 12: Extreme Regression & Expert Financials", () => {
  test.beforeEach(async ({ page }) => {
    await loginAsAdmin(page);
  });

  test("Financial: Negative Yield Safety", async ({ page }) => {
    const FUND = `Expert Neg Fund ${TIMESTAMP}`;
    const INV = `neg${TIMESTAMP}@expert.com`;
    const NAME = `Neg User ${TIMESTAMP}`;
    await createFund(page, FUND, "USDT");
    await createProfileUser(page, NAME, INV);
    await executeDeposit(page, FUND, NAME, "1000", "2026-01-01");
    await distributeYield(page, FUND, "900", "2026-01-05", [
      { name: NAME, value: "-100" },
      { name: "Indigo Fees", value: "0" },
    ]);
  });

  test("Financial: INDIGO Fees Compounding & Withdrawal", async ({ page }) => {
    const FUND = `FeesComp Fund ${TIMESTAMP}`;
    const INV = `comp${TIMESTAMP}@test.com`;
    const NAME = `Comp User ${TIMESTAMP}`;
    await createFund(page, FUND, "USDC");
    await createProfileUser(page, NAME, INV);
    await executeDeposit(page, FUND, NAME, "1000", "2026-01-01");
    // Record 1100 AUM (+100 gross). 10% fee = 10.
    await distributeYield(page, FUND, "1100", "2026-01-05");
    // Record 1210 AUM (+110 gross). 10% fee on 110 = 11.
    // Total Indigo Fees = 10 + 11 = 21.
    await distributeYield(page, FUND, "1210", "2026-01-10", [
      { name: "Indigo Fees", value: "+11" },
    ]);
  });

  test("UX: Dust Editable Full Withdrawal", async ({ page }) => {
    const FUND = `Dust Fund ${TIMESTAMP}`;
    const INV = `dust${TIMESTAMP}@test.com`;
    const NAME = `Dust User ${TIMESTAMP}`;
    await createFund(page, FUND, "BTC");
    await createProfileUser(page, NAME, INV);
    await executeDeposit(page, FUND, NAME, "1.298", "2026-02-01");

    await page.goto(`${BASE_URL}/admin/transactions`);
    await page
      .getByRole("button", { name: /Add Transaction/i })
      .first()
      .click();
    const modal = page.getByRole("dialog");
    await modal.locator('button[role="combobox"]').nth(0).click();
    await page.getByRole("option", { name: /WITHDRAWAL/i }).click();
    await modal.locator('button[role="combobox"]').nth(1).click();
    await page.getByRole("option", { name: new RegExp(FUND, "i") }).click();
    await modal.locator('button[role="combobox"]').nth(2).click();
    await page.getByRole("option", { name: new RegExp(NAME, "i") }).click();

    const amtInput = modal.locator('input[name="amount"]');
    await expect(amtInput).not.toBeDisabled();
    await amtInput.fill("1.290"); // Leave 0.008 dust
    await modal.getByRole("button", { name: /Add Transaction/i }).click();
    await expect(modal).toBeHidden();
  });

  test("Math: Zero-Yield & Precision", async ({ page }) => {
    const FUND = `Zero Fund ${TIMESTAMP}`;
    const INV = `zero${TIMESTAMP}@test.com`;
    const NAME = `Zero User ${TIMESTAMP}`;
    await createFund(page, FUND, "ETH");
    await createProfileUser(page, NAME, INV);
    await executeDeposit(page, FUND, NAME, "100.000", "2026-04-01");

    // Record 100 AUM (No change)
    await distributeYield(page, FUND, "100", "2026-04-30", [{ name: NAME, value: "+0" }]);

    // Verify ledger precision
    await page.goto(`${BASE_URL}/admin/investors`);
    await page.getByPlaceholder("Search").fill(NAME);
    await page.locator("tr").filter({ hasText: NAME }).first().click();
    await page.getByRole("tab", { name: /Ledger/i }).click();
    await expect(page.locator("td").filter({ hasText: "100.000" }).first()).toBeVisible();
  });

  test("Resilience: Phantom Void Reversal", async ({ page }) => {
    const FUND = `Void Fund ${TIMESTAMP}`;
    const INV = `void${TIMESTAMP}@test.com`;
    const NAME = `Void User ${TIMESTAMP}`;
    await createFund(page, FUND, "USDT");
    await createProfileUser(page, NAME, INV);
    await executeDeposit(page, FUND, NAME, "500", "2026-05-01");

    // Record yield to 600
    await distributeYield(page, FUND, "600", "2026-05-05");

    // Void the 500 deposit
    await page.goto(`${BASE_URL}/admin/transactions`);
    const row = page.locator("tr").filter({ hasText: /500/ }).first();
    await row.locator('button[aria-haspopup="menu"]').click();
    await page.getByRole("menuitem", { name: /Void/i }).click();

    await page.locator("#reason").fill("Phantom test");
    await page.locator("#confirm").fill("VOID");
    await page.getByRole("button", { name: /Void Transaction/i }).click();

    // Verify AUM reflects 100 (600 - 500)
    await page.goto(`${BASE_URL}/admin/funds`);
    await expect(
      page.locator("tr").filter({ hasText: FUND }).locator("td").filter({ hasText: /100/ }).first()
    ).toBeVisible();
  });
});
