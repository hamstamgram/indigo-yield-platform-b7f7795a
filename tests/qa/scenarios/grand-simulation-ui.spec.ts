import { test, expect } from "@playwright/test";

// Configuration
const ADMIN_ID = "26ebf5ff-9755-43a4-984c-ac7e093a6416"; // qa.admin@indigo.fund
const SOL_FUND_ID = "7574bc81-aab3-4175-9e7f-803aa6f9eb8f";
const XRP_FUND_ID = "2c123c4f-76b4-4504-867e-059649855417";

const PROFILES = {
  LP: "Indigo LP",
  PAUL: "Paul Johnson",
  ALEX: "Alex Jacobs",
  RYAN: "Ryan Van Der Wall",
  SAM: "Sam Johnson",
};

test.describe("Grand Simulation - UI Execution", () => {
  test.beforeEach(async ({ page }) => {
    // Navigate and login if necessary
    await page.goto("/login");
    await page.waitForLoadState("networkidle");

    // If not redirected, we are already logged in from auth.setup
    if (page.url().includes("/login")) {
      await expect(page.locator("#email")).toBeVisible({ timeout: 15000 });
      await page.fill("#email", "adriel@indigo.fund");
      await page.fill("#password", "TestAdmin2026!");
      await page.click('button[type="submit"]');
      await page.waitForURL((url) => !url.pathname.includes("/login"), { timeout: 30000 });
    }
  });

  async function addTransaction(
    page: any,
    investorName: string,
    fundName: string,
    amount: string,
    date: string
  ) {
    console.log(`[Tx] Starting: ${investorName} | ${fundName} | ${amount} | ${date}`);
    await page.goto("/admin/transactions");
    await page.waitForLoadState("networkidle");

    // Open Add Transaction dialog
    await page
      .getByRole("button", { name: /Add Transaction|New Transaction/i })
      .first()
      .click();
    const modal = page.getByRole("dialog");
    await modal.waitFor({ state: "visible" });

    // Type = DEPOSIT (first combobox)
    await modal.locator('button[role="combobox"]').nth(0).click();
    await page.getByRole("option", { name: /DEPOSIT/i }).click();

    // Fund (second combobox)
    await modal.locator('button[role="combobox"]').nth(1).click();
    await page
      .getByRole("option", { name: new RegExp(fundName.replace(/[()]/g, "\\$&"), "i") })
      .click();

    // Investor (third combobox)
    await modal.locator('button[role="combobox"]').nth(2).click();
    const searchInput = page.getByPlaceholder(/Search by name or email/i);
    if (await searchInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      const shortName = investorName.split(" (")[0];
      await searchInput.fill(shortName);
    }
    await page
      .locator('[role="option"]')
      .filter({ hasText: new RegExp(investorName.split(" (")[0], "i") })
      .first()
      .click();

    // Amount
    await modal.locator('input[name="amount"]').fill(amount);

    // Date (use native date input if available)
    const dateInput = modal.locator('input[type="date"]');
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill(date);
    }

    // Submit
    console.log(`[Tx] Submitting...`);
    await modal.getByRole("button", { name: /Add Transaction/i }).click();

    await expect(page.getByText(/success|created|Transaction Created/i).first()).toBeVisible({
      timeout: 30000,
    });
    console.log(`[Tx] Success!`);
  }

  async function recordYield(page: any, fundName: string, date: string, aum: string) {
    console.log(`[Yield] Starting: ${fundName} | ${date} | ${aum}`);
    await page.goto("/admin");
    await page.waitForLoadState("networkidle");

    // Open Apply Yield dialog
    console.log(`[Yield] Opening dialog for ${fundName}...`);
    await page.click('button:has-text("Apply Yield")');
    await page.locator(`button:has-text("${fundName}")`).click();

    // Select Transaction purpose
    console.log(`[Yield] Selecting Purpose: Transaction`);
    const purposeBtn = page.getByTestId("purpose-transaction");
    if (await purposeBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await purposeBtn.click();
    }

    // Fill date
    console.log(`[Yield] Entering Date: ${date}`);
    const dateInput = page.locator('input[type="date"]');
    if (await dateInput.isVisible({ timeout: 3000 }).catch(() => false)) {
      await dateInput.fill(date);
    }

    // Fill AUM (try multiple selectors)
    console.log(`[Yield] Entering AUM: ${aum}`);
    const aumInput = page.getByTestId("aum-input");
    if (await aumInput.isVisible({ timeout: 5000 }).catch(() => false)) {
      await aumInput.fill(aum);
    } else {
      await page.locator('input#new-aum, input[name="newAUM"], input[id*="aum"]').first().fill(aum);
    }

    // Preview
    console.log(`[Yield] Generating preview...`);
    await page
      .getByRole("button", { name: /Preview Yield Distribution|Preview/i })
      .first()
      .click();

    // Click Distribute Yield
    console.log(`[Yield] Confirming selection...`);
    const distributeBtn = page.getByRole("button", { name: /Distribute Yield to/i });
    if (await distributeBtn.isVisible({ timeout: 15000 }).catch(() => false)) {
      await distributeBtn.click();
    } else {
      await page
        .getByRole("button", { name: /Distribute/i })
        .last()
        .click();
    }

    // Confirm Dialog - check confirmation checkbox
    console.log(`[Yield] Final Confirmation...`);
    const checkbox = page.locator('[role="checkbox"], #confirm-distribution');
    if (await checkbox.isVisible({ timeout: 5000 }).catch(() => false)) {
      await checkbox.click();
    }

    const discrepancyCheckbox = page.locator('[role="checkbox"]:near(:text("discrepancy"))');
    if (await discrepancyCheckbox.isVisible({ timeout: 2000 }).catch(() => false)) {
      console.log(`[Yield] Acknowledging discrepancy...`);
      await discrepancyCheckbox.click();
    }

    // Final Confirm
    console.log(`[Yield] Applying final distribution...`);
    const confirmBtn = page.getByRole("button", { name: /Confirm Distribution/i });
    if (await confirmBtn.isVisible({ timeout: 5000 }).catch(() => false)) {
      await confirmBtn.click();
    } else {
      await page.getByRole("button", { name: /Confirm/i }).click();
    }

    // Wait for success
    await expect(
      page.getByText(/complete|success|Distributed|Distribution recorded/i).first()
    ).toBeVisible({ timeout: 60000 });
    console.log(`[Yield] Success!`);

    // Close modal
    await page
      .getByRole("button", { name: /Done/i })
      .click()
      .catch(() => {});
  }

  test("Execute Full Scenario through UI", async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for full simulation

    // PHASE 1: SOL (Deposit 100 on Month 1)
    await addTransaction(page, "Indigo LP (lp@", "Solana Yield Fund", "100", "2026-01-01");
    await recordYield(page, "Solana Yield Fund", "2026-01-31", "105");
    await page.waitForTimeout(5000); // Allow UI to settle

    // PHASE 2: SOL (Paul Johnson +50 SOL)
    await addTransaction(
      page,
      "Paul Johnson (paul.johnson@",
      "Solana Yield Fund",
      "50",
      "2026-02-01"
    );
    await recordYield(page, "Solana Yield Fund", "2026-02-28", "160");
    await page.waitForTimeout(5000);

    // PHASE 3: XRP (Sam Johnson +1000 XRP)
    await addTransaction(
      page,
      "Sam Johnson (sam.johnson@",
      "Ripple Yield Fund",
      "1000",
      "2026-03-01"
    );
    await recordYield(page, "Ripple Yield Fund", "2026-03-31", "1100");
    await page.waitForTimeout(5000);

    // PHASE 4: XRP (Withdrawal/Extra Tx)
    await addTransaction(
      page,
      "Sam Johnson (sam.johnson@",
      "Ripple Yield Fund",
      "500",
      "2026-04-01"
    );
    await recordYield(page, "Ripple Yield Fund", "2026-04-30", "1650");

    // Final verification of Dashboard
    await page.goto("/admin");
    await expect(page.locator("text=Command Center")).toBeVisible();
  });
});
