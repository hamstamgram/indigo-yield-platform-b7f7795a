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
      await page.fill("#email", "qa.admin@indigo.fund");
      await page.fill("#password", "QaTest2026!"); // Correct test password
      await page.click('button[type="submit"]');
      await page.waitForURL("/admin", { timeout: 30000 });
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
    await page.goto("/admin/transactions/new");
    await page.waitForLoadState("networkidle");

    // Handle cookie banner if it appears
    const cookieBanner = page.locator(
      'button:has-text("Reject Optional"), button:has-text("Accept All")'
    );
    if (await cookieBanner.first().isVisible()) {
      console.log(`[Tx] Handling cookie banner...`);
      await cookieBanner.first().click();
    }

    // Select Investor
    console.log(`[Tx] Selecting Investor: ${investorName}`);
    await page.click('button:has-text("Select Investor")');
    // Wait for the options to appear
    await page.waitForSelector('[role="option"]', { state: "visible" });

    // Find the specific option by name and click it
    const option = page.getByRole("option", { name: investorName, exact: false });
    await option.scrollIntoViewIfNeeded();
    await option.click();

    // Select Fund
    console.log(`[Tx] Selecting Fund: ${fundName}`);
    await page.click('button:has-text("Select Fund")');
    await page.waitForSelector('[role="option"]', { state: "visible" });
    await page.getByRole("option", { name: fundName, exact: false }).click();

    // Amount
    await page.fill('input[name="amount"]', amount);

    // Date
    console.log(`[Tx] Picking Date: ${date}`);
    await page.click('button:has-text("Pick a date"), button:has(svg.lucide-calendar)');
    const day = parseInt(date.split("-")[2]);
    // Click the day that is not muted (to avoid selecting from prev/next month in the same view)
    // We also use a more specific selector for the calendar cell
    await page.locator(`button[role="gridcell"]:has-text("${day}"):not(.muted)`).first().click();

    // Submit
    console.log(`[Tx] Submitting...`);
    const submitBtn = page.locator('button:has-text("Create Transaction")');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click();

    await expect(page.locator("text=Transaction Created")).toBeVisible({ timeout: 30000 });
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

    // Yield Input Form
    console.log(`[Yield] Selecting Purpose: Transaction`);
    // Be very specific to avoid clicking the explainer text
    await page.locator('div:has(> p:text("Transaction"))').click();

    console.log(`[Yield] Entering Date: ${date}`);
    await page.fill('input[type="date"]', date);

    console.log(`[Yield] Entering AUM: ${aum}`);
    await page.fill("input#new-aum", aum);

    // Preview
    console.log(`[Yield] Generating preview...`);
    await page.click('button:has-text("Preview Yield Distribution")');

    // Apply (from Preview)
    console.log(`[Yield] Confirming selection...`);
    await page.click('button:has-text("Apply Yield to")');

    // Confirm Dialog
    console.log(`[Yield] Final Confirmation...`);
    await page.locator("#confirm-distribution").check();

    const discrepancyCheckbox = page.locator(
      'input[type="checkbox"]:near(span:has-text("discrepancy"))'
    );
    if (await discrepancyCheckbox.isVisible()) {
      console.log(`[Yield] Acknowledging discrepancy...`);
      await discrepancyCheckbox.check();
    }

    // Final Confirm
    console.log(`[Yield] Applying final distribution...`);
    await page.click('button:has-text("Confirm & Apply")');

    // Wait for success
    await expect(
      page.locator("text=/Distributed/").or(page.locator("text=Distribution recorded"))
    ).toBeVisible({ timeout: 60000 });
    console.log(`[Yield] Success!`);
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
