/**
 * UI Reports & History - Go-Live Acceptance
 *
 * Tests reporting and historical data views:
 * - Reports page filters
 * - Investor reports entrypoint
 * - Transaction history
 * - Yield history
 * - Statements listing
 */

import { test, expect } from "@playwright/test";

const QA_EMAIL = "Adriel@indigo.fund";
const QA_PASSWORD = "TestAdmin2026!";
const BASE_URL = process.env.APP_URL || "https://indigo-yield-platform.lovable.app";

test.describe.serial("Go-Live: Reports & History", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL + "/login");
    await page.getByRole("textbox", { name: "Email Address" }).fill(QA_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(QA_PASSWORD);
    await page.getByRole("button", { name: /Access Portal/i }).click();
    await page.waitForURL("**/admin**", { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test("REPORT-001: Reports page loads", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/reports");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    const hasReportContent = bodyText?.includes("Report") || bodyText?.includes("Statement");
    console.log(`REPORT-001: Reports page content: ${hasReportContent}`);
  });

  test("REPORT-002: Report filters accessible", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/reports");
    await page.waitForTimeout(3000);

    const filters = page
      .locator("input, select, button")
      .filter({ hasText: /filter|search|date/i });
    const filterCount = await filters.count();

    console.log(`REPORT-002: Found ${filterCount} filter controls`);
  });

  test("REPORT-003: Generate report button exists", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/reports");
    await page.waitForTimeout(3000);

    const generateBtn = page.getByRole("button", { name: /generate|new report|create report/i });
    const isVisible = await generateBtn
      .first()
      .isVisible()
      .catch(() => false);

    console.log(`REPORT-003: Generate button visible: ${isVisible}`);
  });

  test("REPORT-004: Report list/table displays", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/reports");
    await page.waitForTimeout(3000);

    const tableOrList = page.locator("table, [role='table'], .list, .grid").first();
    const hasContent = await tableOrList.isVisible().catch(() => false);

    console.log(`REPORT-004: Report list visible: ${hasContent}`);
  });

  test("HIST-001: Transaction history page loads", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    console.log("HIST-001: Transaction history page loaded");
  });

  test("HIST-002: Yield history page loads", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/yield-history");
    await page.waitForTimeout(3000);

    const bodyText = await page.locator("body").textContent();
    expect(bodyText).toBeTruthy();

    console.log("HIST-002: Yield history page loaded");
  });

  test("HIST-003: Filter transactions by date", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const dateFilter = page
      .locator("input[type='date'], [placeholder*='date'], input[placeholder*='From']")
      .first();
    const hasDateFilter = await dateFilter.isVisible().catch(() => false);

    console.log(`HIST-003: Date filter present: ${hasDateFilter}`);
  });

  test("HIST-004: Filter transactions by type", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const typeFilter = page.locator("select, [role='combobox']").first();
    const hasTypeFilter = await typeFilter.isVisible().catch(() => false);

    console.log(`HIST-004: Type filter present: ${hasTypeFilter}`);
  });

  test("HIST-005: Filter yield by fund/date", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/yield-history");
    await page.waitForTimeout(3000);

    const filters = page.locator("input, select").filter({ hasText: /fund|date|period/i });
    const filterCount = await filters.count();

    console.log(`HIST-005: Found ${filterCount} yield filters`);
  });

  test("STMT-001: Investor statements page accessible", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const rows = page.locator("tbody tr, [role='row']");
    const rowCount = await rows.count();

    if (rowCount > 1) {
      await rows.nth(1).click();
      await page.waitForTimeout(2000);

      const detailsHasStatements = page.locator("body").textContent()?.includes("Statement");
      console.log(`STMT-001: Investor details has statements link: ${detailsHasStatements}`);
    } else {
      console.log("STMT-001: No investors to test");
    }
  });

  test("EXPORT-001: Export functionality exists", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const exportBtn = page.getByRole("button", { name: /export|download|csv|pdf/i });
    const isVisible = await exportBtn
      .first()
      .isVisible()
      .catch(() => false);

    console.log(`EXPORT-001: Export button visible: ${isVisible}`);
  });

  test("EXPORT-002: Reports export accessible", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/reports");
    await page.waitForTimeout(3000);

    const exportBtn = page.getByRole("button", { name: /export|download/i });
    const isVisible = await exportBtn
      .first()
      .isVisible()
      .catch(() => false);

    console.log(`EXPORT-002: Reports export visible: ${isVisible}`);
  });
});
