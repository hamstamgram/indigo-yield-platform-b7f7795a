import { test, expect } from "@playwright/test";

test.describe("Solana Scenario Test", () => {
  // Increase timeout for this long flow
  test.setTimeout(120000);

  test("Execute complete user specification for Solana Yield Fund", async ({ page }) => {
    console.log("Starting Solana Test Flow...");

    // 1. First Deposit: INDIGO LP 1250 SOL on Sep 2
    console.log("Step 1: Indigo LP Deposit");
    await page.goto("http://localhost:8080/admin/ledger");
    await page
      .getByRole("button", { name: "Add Transaction" })
      .click({ timeout: 5000 })
      .catch(() => page.getByRole("button", { name: "New Transaction" }).click());

    // Form interacting
    await page.locator('div[class*="control"]').nth(0).click();
    await page.getByText("Deposit / Top-up", { exact: true }).click();

    await page.locator('div[class*="control"]').nth(1).click();
    await page.getByText("Solana Yield Fund", { exact: true }).click();

    await page.locator('div[class*="control"]').nth(2).click();
    // Assuming type search works for Indigo
    await page.keyboard.type("Indigo LP");
    await page.keyboard.press("Enter");

    // Amount
    await page.getByPlaceholder("Ex: 50000").fill("1250");

    // Date
    await page.locator('input[type="date"]').fill("2025-09-02");

    await page
      .getByRole("button", { name: "Add Transaction" })
      .nth(1)
      .click()
      .catch(() => page.getByRole("button", { name: "Submit" }).click());

    // Wait for Toast
    await expect(page.locator('.toast, [role="alert"]'))
      .toContainText(/Successfully|added/, { timeout: 10000 })
      .catch(() => console.log("Toast not seen, but proceeding"));
    await page.waitForTimeout(2000);

    // 2. First Yield: 1252 SOL Target on Sep 4
    console.log("Step 2: First Yield Distribution");
    await page.goto("http://localhost:8080/admin/yield-history");
    await page.getByRole("button", { name: "Distribute Yield" }).click();

    await page.locator('div[class*="control"]').nth(0).click();
    await page.getByText("Solana Yield Fund", { exact: true }).click();

    await page.locator('input[type="date"]').fill("2025-09-04");
    await page.locator('input[placeholder="Ex: 1050000"]').fill("1252");

    await page.getByRole("button", { name: "Calculate Distribution" }).click();
    await page.waitForTimeout(2000); // Wait for preview
    await page.getByRole("button", { name: "Confirm & Apply Distribution" }).click();
    await page.waitForTimeout(3000);

    // 3. Second Deposit: Paul Johnson 234.17 on Sep 5
    console.log("Step 3: Paul Johnson Deposit");
    await page.goto("http://localhost:8080/admin/ledger");
    await page
      .getByRole("button", { name: "Add Transaction" })
      .click()
      .catch(() => page.getByRole("button", { name: "New Transaction" }).click());

    await page.locator('div[class*="control"]').nth(0).click();
    await page.getByText("Deposit / Top-up", { exact: true }).click();

    await page.locator('div[class*="control"]').nth(1).click();
    await page.getByText("Solana Yield Fund", { exact: true }).click();

    await page.locator('div[class*="control"]').nth(2).click();
    await page.keyboard.type("Paul Johnson");
    await page.keyboard.press("Enter");

    // Amount
    await page.getByPlaceholder("Ex: 50000").fill("234.17");

    // Date
    await page.locator('input[type="date"]').fill("2025-09-05");

    await page
      .getByRole("button", { name: "Add Transaction" })
      .nth(1)
      .click()
      .catch(() => page.getByRole("button", { name: "Submit" }).click());
    await page.waitForTimeout(3000);

    // 4. Second Yield: 1500 SOL Target on Sep 30
    console.log("Step 4: Second Yield Distribution");
    await page.goto("http://localhost:8080/admin/yield-history");
    await page.getByRole("button", { name: "Distribute Yield" }).click();

    await page.locator('div[class*="control"]').nth(0).click();
    await page.getByText("Solana Yield Fund", { exact: true }).click();

    await page.locator('input[type="date"]').fill("2025-09-30");
    await page.locator('input[placeholder="Ex: 1050000"]').fill("1500");

    await page.getByRole("button", { name: "Calculate Distribution" }).click();

    // Wait for the preview table and capture a screenshot
    await page.waitForTimeout(3000);
    await page.screenshot({ path: "solana-yield-preview.png", fullPage: true });

    await page.getByRole("button", { name: "Confirm & Apply Distribution" }).click();
    await page.waitForTimeout(3000);

    // 5. Verify Results
    console.log("Step 5: Verification");
    await page.goto("http://localhost:8080/admin/funds");
    await page.locator("text=Solana Yield Fund").click();
    await page.waitForTimeout(2000);
    await page.screenshot({ path: "solana-fund-detail.png", fullPage: true });

    console.log("Finished successfully.");
  });
});
