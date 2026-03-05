import { test, expect, Page } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8080";

const TEST_ADMIN_EMAIL = "nathanael@indigo.fund";
const TEST_ADMIN_PASSWORD = "password123";

async function login(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");
  const emailInput = page.locator('input[type="email"]');
  if ((await emailInput.count()) > 0) {
    await emailInput.fill(TEST_ADMIN_EMAIL);
    await page.fill('input[type="password"]', TEST_ADMIN_PASSWORD);
    await page.click('button[type="submit"]');
    await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });
  }
}

async function selectRadix(page: Page, labelText: string, optionText: string | RegExp) {
  const label = page.locator("label").filter({ hasText: labelText });
  let trigger = page.locator(`button[aria-labelledby="${await label.getAttribute("id")}"]`);

  if ((await trigger.count()) === 0) {
    trigger = label.locator("..").locator('button[role="combobox"]');
  }
  if ((await trigger.count()) === 0) {
    trigger = page
      .locator("label")
      .filter({ hasText: labelText })
      .locator("~ div")
      .locator('button[role="combobox"]');
  }

  await trigger.first().click();
  await page.getByRole("option", { name: optionText }).click();
}

test("Import Historical Excel Data - XRP", async ({ page }) => {
  test.setTimeout(600000); // 10 minutes

  const dataPath = path.join(__dirname, "import_data.json");
  const data = JSON.parse(fs.readFileSync(dataPath, "utf8"));

  await login(page);

  for (const step of data.xrp) {
    if (step.action === "transaction") {
      console.log(
        `[XRP] Adding Transaction: ${step.date} - ${step.investor} - ${step.amount} FullExit=${step.isFullExit}`
      );
      await page.goto(`${BASE_URL}/admin/ledger`);
      await page.waitForLoadState("networkidle");
      // Wait a moment for tables to load
      await page.waitForTimeout(1000);

      await page.getByRole("button", { name: "Add Transaction" }).first().click();

      // Select Fund
      await selectRadix(page, "Fund", /XRP/i);

      // Select Investor
      await selectRadix(page, "Investor", new RegExp(step.investor, "i"));

      // Select Type
      await selectRadix(page, "Type", new RegExp(step.type, "i"));

      if (step.isFullExit) {
        // Click full exit to auto-calculate the dust
        await page.getByLabel(/Full Exit/i).click();
      } else {
        // Amount
        await page.getByLabel(/Amount/i).fill(String(step.amount).replace("-", ""));
      }

      // Date
      await page.getByLabel(/Date/i).fill(step.date);

      // Submit
      await page.getByRole("button", { name: "Add Transaction", exact: true }).click();

      // Wait for success
      await expect(page.getByText(/successfully/i)).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1000);
    } else if (step.action === "yield") {
      console.log(`[XRP] Recording Yield: ${step.date} - ${step.type} - AUM: ${step.aum}`);
      await page.goto(`${BASE_URL}/admin`);
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({ path: "test-debug-dashboard-yield.png", fullPage: true });

      await page.getByRole("button", { name: "Apply Yield" }).first().click();

      // Fund Picker
      await page
        .getByRole("button")
        .filter({ hasText: /Ripple Yield Fund|XRP/i })
        .click();

      // Inside Yield Dialog
      // Purpose
      await page.getByText(step.type, { exact: true }).click();

      if (step.type === "Reporting") {
        // Choose month
        await page.locator('button[role="combobox"]').nth(0).click();
        const monthMatch = new Date(step.date).toLocaleString("default", {
          month: "long",
          year: "numeric",
        });
        await page.getByRole("option", { name: new RegExp(monthMatch, "i") }).click();
      } else {
        // Transaction (Effective Date)
        await page.locator('input[type="date"]').fill(step.date);
      }

      await page.getByLabel(/New AUM/i).fill(String(step.aum));

      // Next
      await page.getByRole("button", { name: /Preview/i }).click();

      // Open Confirmation Dialog
      await page.getByRole("button", { name: /Distribute Yield/i }).click();

      // Check Confirmation Box
      await page.getByRole("checkbox").click();

      // Final Confirm
      await page.getByRole("button", { name: /Confirm Distribution/i }).click();

      // Wait for success
      await expect(page.getByText(/Distributed/i)).toBeVisible({ timeout: 15000 });
      await page.waitForTimeout(1000);
    }
  }
});
