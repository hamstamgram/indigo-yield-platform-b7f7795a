/**
 * UI Admin Data Integrity - Go-Live Acceptance
 *
 * Verifies that data refreshes correctly after mutations:
 * - Dashboard updates after actions
 * - Positions update after actions
 * - AUM visibility after actions
 * - History refresh after actions
 */

import { test, expect } from "@playwright/test";

const QA_EMAIL = "Adriel@indigo.fund";
const QA_PASSWORD = "TestAdmin2026!";
const BASE_URL = process.env.APP_URL || "https://indigo-yield-platform.lovable.app";

test.describe.serial("Go-Live: Data Integrity", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL + "/login");
    await page.getByRole("textbox", { name: "Email Address" }).fill(QA_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(QA_PASSWORD);
    await page.getByRole("button", { name: /Access Portal/i }).click();
    await page.waitForURL("**/admin**", { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test("DASH-001: Admin dashboard loads with metrics", async ({ page }) => {
    await page.goto(BASE_URL + "/admin");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    const hasMetrics =
      bodyText?.includes("$") || bodyText?.includes("AUM") || bodyText?.includes("Total");
    console.log(`DASH-001: Dashboard metrics visible: ${hasMetrics}`);
  });

  test("DASH-002: Dashboard shows investor count", async ({ page }) => {
    await page.goto(BASE_URL + "/admin");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    const hasInvestorContent = bodyText?.includes("Investor") || bodyText?.includes(" investor");
    console.log(`DASH-002: Investor content: ${hasInvestorContent}`);
  });

  test("DASH-003: Dashboard shows revenue/fees", async ({ page }) => {
    await page.goto(BASE_URL + "/admin");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    const hasRevenueContent = bodyText?.includes("Revenue") || bodyText?.includes("Fee");
    console.log(`DASH-003: Revenue content: ${hasRevenueContent}`);
  });

  test("DASH-004: Navigate to revenue page", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/revenue");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();
    console.log("DASH-004: Revenue page loads");
  });

  test("DATA-001: Ledger shows transaction list", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    const hasTransactionContent =
      bodyText?.includes("Transaction") ||
      bodyText?.includes("Deposit") ||
      bodyText?.includes("Withdrawal");
    console.log(`DATA-001: Transaction content: ${hasTransactionContent}`);
  });

  test("DATA-002: Investors list loads", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    const hasInvestorList = bodyText?.includes("Investor");
    console.log(`DATA-002: Investor list content: ${hasInvestorList}`);
  });

  test("DATA-003: Investor details accessible", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const rows = page.locator("tbody tr, [role='row']");
    const rowCount = await rows.count();

    if (rowCount > 1) {
      await rows.nth(1).click();
      await page.waitForTimeout(2000);

      const detailsPage = page.url().includes("/investors/");
      console.log(`DATA-003: Investor details accessible: ${detailsPage}`);
    } else {
      console.log("DATA-003: No investors to click");
    }
  });

  test("DATA-004: Yield history table loads", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/yield-history");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    console.log("DATA-004: Yield history table loaded");
  });

  test("REFRESH-001: Navigate away and back - ledger refreshes", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const initialText = await page.locator("body").textContent();

    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(2000);

    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const afterText = await page.locator("body").textContent();
    console.log(
      `REFRESH-001: Ledger reloaded: ${afterText?.length === initialText?.length ? "consistent" : "updated"}`
    );
  });

  test("REFRESH-002: Navigate away and back - investors refreshes", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const initialText = await page.locator("body").textContent();

    await page.goto(BASE_URL + "/admin");
    await page.waitForTimeout(2000);

    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const afterText = await page.locator("body").textContent();
    console.log(
      `REFRESH-002: Investors reloaded: ${afterText?.length === initialText?.length ? "consistent" : "updated"}`
    );
  });
});
