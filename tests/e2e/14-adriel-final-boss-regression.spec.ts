import { test, expect, Page } from "@playwright/test";
import { format } from "date-fns";

const BASE_URL = process.env.BASE_URL || "https://indigo-yield-platform.lovable.app";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "adriel@indigo.fund";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!";

async function login(page: Page, email: string, password: string) {
  console.log(`LOGIN: Navigating to ${BASE_URL} for ${email}`);
  await page.goto(`${BASE_URL}/`);
  await page.waitForLoadState("networkidle");

  // Wait for login form elements to appear on home page or /login
  const emailInput = page.locator('input[type="email"], input[name="email"]');
  const passwordInput = page.locator('input[type="password"], input[name="password"]');
  const submitBtn = page.locator('button[type="submit"], button:has-text("Access Portal")');

  if (!(await emailInput.isVisible())) {
    console.log("LOGIN: Email input not visible on root, trying /login...");
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");
  }

  console.log("LOGIN: Filling credentials...");
  await expect(emailInput.first()).toBeVisible({ timeout: 15000 });
  await emailInput.first().fill(email);
  await passwordInput.first().fill(password);
  await submitBtn.first().click();

  console.log("LOGIN: Waiting for dashboard content...");
  await page.waitForSelector("text=Command Center", { timeout: 30000 });
  console.log("LOGIN: Dashboard loaded successfully.");
}

/**
 * MISSION: FINAL BOSS REGRESSION (THE ADRIEL STOPPER BUGS)
 * 1. UI Inequality Blocker ("On est plus égal")
 * 2. The "Hard Cut-Off" PDF Bleed Test (Chronological Rule)
 */
test.describe("Adriel Final Boss Regression Suite", () => {
  let adminPage: Page;

  test.beforeAll(async ({ browser }) => {
    const context = await browser.newContext();
    adminPage = await context.newPage();
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);
  });

  test.afterAll(async () => {
    await adminPage.close();
  });

  test("SCENARIO 1: The UI Inequality Blocker ('On est plus égal')", async () => {
    await adminPage.goto(`${BASE_URL}/admin/yields/calculate`);
    await adminPage.waitForSelector('select[name="fundId"]');
    await adminPage.selectOption('select[name="fundId"]', { index: 1 });
    await adminPage.fill('input[name="newTotalAUM"]', "1000000");
    await adminPage.click('button:has-text("Preview Distribution")');

    await adminPage.click('button:has-text("Confirm & Apply")');
    const tableHeader = adminPage.locator("table thead");
    await expect(tableHeader).toContainText("Ending Balance");

    const grossVal = await adminPage.locator('[data-testid="summary-gross"]').innerText();
    const netVal = await adminPage.locator('[data-testid="summary-net"]').innerText();
    const ibVal = await adminPage.locator('[data-testid="summary-ib"]').innerText();
    const indigoVal = await adminPage.locator('[data-testid="summary-fees"]').innerText();

    const parseVal = (v: string) => parseFloat(v.replace(/[^0-9.-]/g, ""));
    const gross = parseVal(grossVal);
    const net = parseVal(netVal);
    const ib = parseVal(ibVal);
    const indigo = parseVal(indigoVal);

    expect(Math.abs(gross - (net + ib + indigo))).toBeLessThan(0.0001);
  });

  test("SCENARIO 2: The 'Hard Cut-Off' PDF Bleed Test", async () => {
    // 1. Setup: Deposit 135,003 XRP (Nov 17)
    await adminPage.goto(`${BASE_URL}/admin/transactions/new`);
    await adminPage.waitForSelector('select[name="investorId"]');
    await adminPage.selectOption('select[name="investorId"]', { index: 1 });
    await adminPage.fill('input[name="amount"]', "135003");
    await adminPage.selectOption('select[name="type"]', "DEPOSIT");
    await adminPage.click('button:has-text("Create Transaction")');
    await expect(adminPage.getByText(/success|created/i).first()).toBeVisible();

    // 2. Setup: Deposit 49,000 XRP (Nov 25)
    await adminPage.goto(`${BASE_URL}/admin/transactions/new`);
    await adminPage.selectOption('select[name="investorId"]', { index: 1 });
    await adminPage.fill('input[name="amount"]', "49000");
    await adminPage.selectOption('select[name="type"]', "DEPOSIT");
    await adminPage.click('button:has-text("Create Transaction")');
    await expect(adminPage.getByText(/success|created/i).first()).toBeVisible();

    // 3. The Cut-Off: Record a Reporting Yield (Nov 30)
    await adminPage.goto(`${BASE_URL}/admin/yields/calculate`);
    await adminPage.selectOption('select[name="fundId"]', { index: 1 });
    // Sum = 184,003. Target AUM = 184,287 (Yield = 284)
    await adminPage.fill('input[name="newTotalAUM"]', "184287");
    await adminPage.click('button:has-text("Preview Distribution")');
    await adminPage.click('button:has-text("Confirm & Apply")');
    await adminPage.click('button:has-text("Submit Distribution")');
    await expect(adminPage.getByText(/success|applied/i).first()).toBeVisible({ timeout: 30000 });

    // 4. Post Cut-Off: Admin logs a Deposit of 45,000 XRP (Nov 30)
    await adminPage.goto(`${BASE_URL}/admin/transactions/new`);
    await adminPage.selectOption('select[name="investorId"]', { index: 1 });
    await adminPage.fill('input[name="amount"]', "45000");
    await adminPage.selectOption('select[name="type"]', "DEPOSIT");
    await adminPage.click('button:has-text("Create Transaction")');
    await expect(adminPage.getByText(/success|created/i).first()).toBeVisible();

    // 5. Assertion: Generate Statement and verify Ending Balance (Hard Cut-Off)
    console.log("WAITING for report generation...");
    await adminPage.goto(`${BASE_URL}/admin/reports/statements`);
    await adminPage.waitForTimeout(5000); // Give background task a moment
    await adminPage.reload();

    // Nov Ending Balance must be 184,287 XRP, NOT 229,287.
    const reportRow = adminPage.locator("table tbody tr").first();
    await expect(reportRow).toContainText("184,287");
    await expect(reportRow).not.toContainText("229,287");

    // 6. VALIDATE HTML PREVIEW (Adriel's Specific Request)
    console.log("OPENING HTML PREVIEW...");
    await reportRow
      .locator('button:has-text("Actions"), button:has(.lucide-more-horizontal)')
      .first()
      .click();
    await adminPage.locator('div[role="menuitem"]:has-text("Preview")').click();

    const previewModal = adminPage.locator('div[role="dialog"]:has-text("Statement Preview")');
    await expect(previewModal).toBeVisible({ timeout: 15000 });

    const iframe = adminPage.frameLocator('iframe[title="Statement Preview"]');
    await expect(iframe.locator("body")).toContainText("184,287");
    await expect(iframe.locator("body")).not.toContainText("229,287");

    await adminPage.click('button:has-text("Close")');
    console.log("SCENARIO 2 PASSED: Hard Cut-Off verified in UI + HTML Preview.");
  });
});
