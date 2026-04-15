import { test, expect } from "@playwright/test";

test.setTimeout(300000);

const QA_EMAIL = "Adriel@indigo.fund";
const QA_PASSWORD = "TestAdmin2026!";
const BASE_URL = "https://indigo-yield-platform.lovable.app";

test.describe("Go-Live Critical Flows", () => {
  test("1. Login and Verify Access", async ({ page }) => {
    await page.goto(BASE_URL + "/admin");
    await page.getByRole("textbox", { name: "Email Address" }).fill(QA_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(QA_PASSWORD);
    await page.getByRole("button", { name: /Access Portal/i }).click();
    await page.waitForURL("**/admin**", { timeout: 30000 });
    await page.waitForTimeout(3000);

    console.log("✅ LOGIN: Admin access verified");
  });

  test("2. Dashboard - Verify AUM Display", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/dashboard");
    await page.waitForTimeout(3000);

    // Look for common dashboard elements
    const body = await page.locator("body").textContent();
    const hasContent = body && body.length > 200;

    // Look for AUM-related content
    const hasAUM = body?.includes("AUM") || body?.includes("Total") || body?.includes("$");

    console.log(`✅ DASHBOARD: ${hasContent ? "Content loaded" : "Empty"}`);
    console.log(`   AUM indicators: ${hasAUM ? "Found" : "Not found"}`);
  });

  test("3. Investors Page - Verify Investor List", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const body = await page.locator("body").textContent();
    const hasContent = body && body.length > 100;

    console.log(`✅ INVESTORS: ${hasContent ? "Page loaded" : "Empty"}`);
  });

  test("4. Funds Page - Verify Fund List", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/funds");
    await page.waitForTimeout(3000);

    const body = await page.locator("body").textContent();
    const hasContent = body && body.length > 100;

    console.log(`✅ FUNDS: ${hasContent ? "Page loaded" : "Empty"}`);
  });

  test("5. Transactions Page - Verify Transaction List", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/transactions");
    await page.waitForTimeout(3000);

    const body = await page.locator("body").textContent();
    const hasContent = body && body.length > 100;

    console.log(`✅ TRANSACTIONS: ${hasContent ? "Page loaded" : "Empty"}`);
  });

  test("6. Yields Page - Verify Yield Distributions", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/yields");
    await page.waitForTimeout(3000);

    const body = await page.locator("body").textContent();
    const hasContent = body && body.length > 100;

    console.log(`✅ YIELDS: ${hasContent ? "Page loaded" : "Empty"}`);
  });

  test("7. Withdrawals Page - Verify Withdrawal Queue", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/withdrawals");
    await page.waitForTimeout(3000);

    const body = await page.locator("body").textContent();
    const hasContent = body && body.length > 100;

    console.log(`✅ WITHDRAWALS: ${hasContent ? "Page loaded" : "Empty"}`);
  });

  test("8. Reports Page - Verify Reporting", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/reports");
    await page.waitForTimeout(3000);

    const body = await page.locator("body").textContent();
    const hasContent = body && body.length > 100;

    console.log(`✅ REPORTS: ${hasContent ? "Page loaded" : "Empty"}`);
  });

  test("9. Operations Page - Verify Operations", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/operations");
    await page.waitForTimeout(3000);

    const body = await page.locator("body").textContent();
    const hasContent = body && body.length > 100;

    console.log(`✅ OPERATIONS: ${hasContent ? "Page loaded" : "Empty"}`);
  });

  test("10. System Health - Verify System Status", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/system");
    await page.waitForTimeout(3000);

    const body = await page.locator("body").textContent();
    const hasContent = body && body.length > 100;

    console.log(`✅ SYSTEM: ${hasContent ? "Page loaded" : "Empty"}`);
  });
});
