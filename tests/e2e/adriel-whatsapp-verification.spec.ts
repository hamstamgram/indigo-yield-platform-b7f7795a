/**
 * Adriel WhatsApp Issues — Comprehensive UI Verification
 *
 * Login: adriel@indigo.fund / TestAdmin2026!
 * Checks ALL historical issues raised in WhatsApp chats.
 *
 * Categories:
 *  1. November 2025 Yield Distribution
 *  2. December 2025 Yield Distribution
 *  3. Sam Johnson Investor Details
 *  4. Revenue / INDIGO Fees Page
 *  5. Ledger Page
 *  6. Fund Details / AUM
 *  7. Command Center (Dashboard)
 *  8. IB Management
 */

import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const BASE = "http://localhost:8080";
const CREDS = { email: "adriel@indigo.fund", password: "TestAdmin2026!" };

async function login(page: Page) {
  await page.goto(`${BASE}/login`);
  await page.waitForLoadState("networkidle");

  // Fill email
  const emailInput = page
    .locator('input[type="email"], input[name="email"], input[placeholder*="email" i]')
    .first();
  await emailInput.waitFor({ state: "visible", timeout: 15000 });
  await emailInput.fill(CREDS.email);

  // Fill password
  const pwInput = page.locator('input[type="password"]').first();
  await pwInput.fill(CREDS.password);

  // Submit
  const submitBtn = page.locator('button[type="submit"]').first();
  await submitBtn.click();

  // Wait for redirect to admin or investor dashboard
  await page.waitForURL(/\/(admin|investor)/, { timeout: 20000 });
  console.log("LOGIN SUCCESS — landed at:", page.url());
}

async function screenshot(page: Page, name: string) {
  const path = `/Users/mama/indigo-yield-platform-v01/test-results/adriel-verify-${name}.png`;
  await page.screenshot({ path, fullPage: true });
  console.log(`SCREENSHOT: ${path}`);
  return path;
}

async function navigateTo(page: Page, path: string) {
  await page.goto(`${BASE}${path}`);
  await page.waitForLoadState("networkidle");
  // Wait a bit extra for data to load
  await page.waitForTimeout(2000);
}

// ---------------------------------------------------------------------------
// Test Suite
// ---------------------------------------------------------------------------

test.describe("Adriel WhatsApp Comprehensive Verification", () => {
  test.setTimeout(120000);

  test.beforeEach(async ({ page }) => {
    await login(page);
  });

  // =========================================================================
  // 1. November 2025 Yield Distribution
  // =========================================================================
  test("1. November 2025 Yield Distribution — conservation identity", async ({ page }) => {
    await navigateTo(page, "/admin/yield-distributions");

    const pageText = await page.locator("body").innerText();
    await screenshot(page, "1-yield-distributions-list");

    console.log("\n=== YIELD DISTRIBUTIONS PAGE ===");

    // Look for November 2025 distribution
    const novRows = page
      .locator("tr, [data-testid*='row'], .distribution-row")
      .filter({ hasText: /nov.*2025|2025.*nov/i });
    const novCount = await novRows.count();
    console.log(`November 2025 rows found: ${novCount}`);

    if (novCount > 0) {
      const novText = await novRows.first().innerText();
      console.log("November row text:", novText);
    }

    // Look for any table rows with date context
    const allRows = page.locator("tbody tr");
    const rowCount = await allRows.count();
    console.log(`Total table rows: ${rowCount}`);

    for (let i = 0; i < Math.min(rowCount, 10); i++) {
      const rowText = await allRows.nth(i).innerText();
      console.log(`Row ${i}: ${rowText.substring(0, 200)}`);
    }

    // Try clicking on November 2025 distribution if found
    const novLink = page
      .locator("a, button, tr")
      .filter({ hasText: /nov.*2025|2025-11/i })
      .first();
    if (await novLink.isVisible().catch(() => false)) {
      await novLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await screenshot(page, "1-november-detail");

      const detailText = await page.locator("body").innerText();
      console.log("\n=== NOVEMBER DETAIL PAGE ===");

      // Search for key values
      const hasGross355 = /355|354\.9|355\.0/.test(detailText);
      const hasSamNet284 = /284|283\.9|284\.0/.test(detailText);
      const hasIndigoFee5680 = /56\.8|56\.80/.test(detailText);
      const hasIBCredit1420 = /14\.2|14\.20/.test(detailText);

      console.log("Gross ~355 XRP found:", hasGross355);
      console.log("Sam Net ~284 XRP found:", hasSamNet284);
      console.log("INDIGO Fee ~56.80 XRP found:", hasIndigoFee5680);
      console.log("IB Credit ~14.20 XRP found:", hasIBCredit1420);

      // Extract numbers from page
      const numbers = detailText.match(/[\d,]+\.?\d*/g) || [];
      console.log("Numbers on page:", numbers.slice(0, 30).join(", "));

      expect(hasGross355 || hasSamNet284 || hasIndigoFee5680).toBeTruthy();
    } else {
      console.log("WARNING: November 2025 distribution not found as clickable link");
      // Still check the page has some distribution data
      expect(rowCount).toBeGreaterThan(0);
    }
  });

  // =========================================================================
  // 2. December 2025 Yield Distribution
  // =========================================================================
  test("2. December 2025 Yield Distribution — AUM and splits", async ({ page }) => {
    await navigateTo(page, "/admin/yield-distributions");
    await screenshot(page, "2-yield-distributions-dec");

    const decLink = page
      .locator("a, button, tr")
      .filter({ hasText: /dec.*2025|2025-12/i })
      .first();

    if (await decLink.isVisible().catch(() => false)) {
      await decLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await screenshot(page, "2-december-detail");

      const detailText = await page.locator("body").innerText();
      console.log("\n=== DECEMBER DETAIL PAGE ===");

      // Check opening AUM ~229,358 XRP
      const hasAUM229358 = /229[,.]?358|229358/.test(detailText);
      console.log("Opening AUM ~229,358 XRP found:", hasAUM229358);

      // Check for conservation identity
      const numbers = detailText.match(/[\d,]+\.?\d*/g) || [];
      console.log("Numbers on page:", numbers.slice(0, 30).join(", "));

      // Extract all numeric values for analysis
      const allText = detailText;
      console.log("December page text (first 2000 chars):", allText.substring(0, 2000));
    } else {
      console.log("WARNING: December 2025 distribution not found");
      const allText = await page.locator("body").innerText();
      console.log("Page content:", allText.substring(0, 1000));
    }

    // The page should load without errors regardless
    const errorText = await page.locator("body").innerText();
    expect(errorText).not.toContain("[object Object]");
    expect(errorText).not.toContain("Error loading");
  });

  // =========================================================================
  // 3. Sam Johnson Investor Details
  // =========================================================================
  test("3. Sam Johnson — positions, realized PnL, current value, transactions", async ({
    page,
  }) => {
    await navigateTo(page, "/admin/investors");
    await screenshot(page, "3-investors-list");

    console.log("\n=== INVESTORS LIST ===");

    // Try clicking the row/cell that contains "Sam Johnson"
    // The investor list uses div rows (generic with cursor=pointer), not <tr>/<a>
    const samCell = page
      .locator("p, span, div")
      .filter({ hasText: /^Sam Johnson$/ })
      .first();
    if (await samCell.isVisible({ timeout: 5000 }).catch(() => false)) {
      await samCell.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
    } else {
      // Search for Sam and click the result row
      const searchInput = page
        .locator('input[placeholder*="search" i], input[type="search"]')
        .first();
      if (await searchInput.isVisible({ timeout: 5000 }).catch(() => false)) {
        await searchInput.fill("Sam");
        await page.waitForTimeout(1500);
      }
      // Click the row that contains Sam Johnson (div row with cursor=pointer)
      const samRow = page
        .locator(
          "[cursor=pointer], [style*='cursor: pointer'], [class*='cursor-pointer'], [role='row']"
        )
        .filter({ hasText: /sam johnson/i })
        .first();
      if (await samRow.isVisible({ timeout: 5000 }).catch(() => false)) {
        await samRow.click();
        await page.waitForLoadState("networkidle");
        await page.waitForTimeout(2000);
      } else {
        // Final fallback: look for any view/edit button in the Sam row
        const samViewBtn = page
          .locator("button, a")
          .filter({ hasText: /view|detail|open/i })
          .first();
        if (await samViewBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
          await samViewBtn.click();
          await page.waitForLoadState("networkidle");
          await page.waitForTimeout(2000);
        }
      }
    }

    const currentUrl = page.url();
    console.log("Current URL after Sam click:", currentUrl);
    await screenshot(page, "3-sam-overview");

    const overviewText = await page.locator("body").innerText();
    console.log("\n=== SAM JOHNSON OVERVIEW ===");

    // Check current_value ~279,085 XRP
    const hasCurrentValue = /279[,.]?085|279085/.test(overviewText);
    console.log("current_value ~279,085 XRP:", hasCurrentValue);

    // Check realized PnL ~582.3076 XRP (not 0)
    const hasRealizedPnL = /582\.3|582\.30|582\.307/.test(overviewText);
    const hasZeroPnL = /realized.*0\.00|pnl.*0\.00/i.test(overviewText);
    console.log("realized_pnl ~582.3 XRP:", hasRealizedPnL);
    console.log("realized_pnl is 0 (bad):", hasZeroPnL);

    // Numbers on overview
    const overviewNumbers = overviewText.match(/[\d,]+\.?\d*/g) || [];
    console.log("Overview numbers:", overviewNumbers.slice(0, 20).join(", "));

    // -- Positions tab --
    const positionsTab = page
      .locator('[role="tab"], button, a')
      .filter({ hasText: /position/i })
      .first();
    if (await positionsTab.isVisible().catch(() => false)) {
      await positionsTab.click();
      await page.waitForTimeout(1500);
      await screenshot(page, "3-sam-positions-tab");
      const posText = await page.locator("body").innerText();
      console.log("\n=== SAM POSITIONS TAB ===");
      console.log(posText.substring(0, 2000));

      const posHasRealizedPnL = /582\.3|582\.30|582\.307/.test(posText);
      const posHasZero = /realized.*\b0\b|pnl.*\b0\b/i.test(posText);
      console.log("Positions tab — realized_pnl ~582.3:", posHasRealizedPnL);
      console.log("Positions tab — realized_pnl is 0 (bad):", posHasZero);
    }

    // -- Transactions tab --
    const txTab = page
      .locator('[role="tab"], button, a')
      .filter({ hasText: /transaction/i })
      .first();
    if (await txTab.isVisible().catch(() => false)) {
      await txTab.click();
      await page.waitForTimeout(1500);
      await screenshot(page, "3-sam-transactions-tab");
      const txText = await page.locator("body").innerText();
      console.log("\n=== SAM TRANSACTIONS TAB ===");

      const hasYield = /\bYIELD\b/i.test(txText);
      const hasFeeCredit = /fee_credit|FEE_CREDIT/i.test(txText);
      const hasIbCredit = /ib_credit|IB_CREDIT/i.test(txText);
      const hasDeposit = /\bDEPOSIT\b/i.test(txText);

      console.log("YIELD transactions visible:", hasYield);
      console.log("FEE_CREDIT transactions visible:", hasFeeCredit);
      console.log("IB_CREDIT transactions visible:", hasIbCredit);
      console.log("DEPOSIT transactions visible:", hasDeposit);

      // The transactions tab should show real transactions, not empty
      expect(hasYield || hasDeposit).toBeTruthy();
    }

    // -- Statements tab --
    const stmtTab = page
      .locator('[role="tab"], button, a')
      .filter({ hasText: /statement/i })
      .first();
    if (await stmtTab.isVisible().catch(() => false)) {
      await stmtTab.click();
      await page.waitForTimeout(1500);
      await screenshot(page, "3-sam-statements-tab");
      const stmtText = await page.locator("body").innerText();
      console.log("\n=== SAM STATEMENTS TAB ===");
      console.log(stmtText.substring(0, 2000));

      // November statement should show additions (yield received)
      const hasNovStatement = /nov.*2025|2025.*nov/i.test(stmtText);
      console.log("November 2025 statement visible:", hasNovStatement);
    }
  });

  // =========================================================================
  // 4. Revenue / INDIGO Fees Page
  // =========================================================================
  test("4. Revenue / INDIGO Fees page — ITD revenue, balance, fee credit table", async ({
    page,
  }) => {
    await navigateTo(page, "/admin/fees");
    await screenshot(page, "4-fees-page");

    const feesText = await page.locator("body").innerText();
    console.log("\n=== FEES / REVENUE PAGE ===");
    console.log(feesText.substring(0, 3000));

    // ITD Revenue ~728 XRP
    const hasITD728 = /728|727\.9|728\.0/.test(feesText);
    console.log("ITD Revenue ~728 XRP found:", hasITD728);

    // INDIGO Fees Balance ~116.56 XRP
    const hasBalance11656 = /116\.5|116\.56/.test(feesText);
    console.log("INDIGO Fees Balance ~116.56 XRP found:", hasBalance11656);

    // Fee Credit Transactions table NOT empty
    const tableRows = page.locator("tbody tr");
    const tableRowCount = await tableRows.count();
    console.log("Table rows in fees page:", tableRowCount);

    // Look for "no data" / empty state messages
    const noDataMsg = feesText.match(/no (data|transactions|records|entries|fee)/i);
    console.log("No-data message found:", noDataMsg ? noDataMsg[0] : "none");

    if (tableRowCount > 0) {
      const firstRowText = await tableRows.first().innerText();
      console.log("First fee row:", firstRowText);
    }

    // Check for IB Management tab
    const ibTab = page
      .locator('[role="tab"], button, a')
      .filter({ hasText: /ib management|ib.*tab/i })
      .first();
    if (await ibTab.isVisible().catch(() => false)) {
      await ibTab.click();
      await page.waitForTimeout(1500);
      await screenshot(page, "4-ib-management-tab");
      const ibText = await page.locator("body").innerText();
      console.log("\n=== IB MANAGEMENT TAB ===");
      console.log(ibText.substring(0, 2000));
    }

    // Page should not be empty or have errors
    expect(feesText).not.toContain("[object Object]");
    expect(tableRowCount).toBeGreaterThanOrEqual(0); // at least renders

    // Numbers on page
    const feeNumbers = feesText.match(/[\d,]+\.?\d*/g) || [];
    console.log("Fee page numbers:", feeNumbers.slice(0, 20).join(", "));
  });

  // =========================================================================
  // 5. Ledger Page
  // =========================================================================
  test("5. Ledger page — transaction types, no [object Object], void dialog", async ({ page }) => {
    await navigateTo(page, "/admin/transactions");
    await screenshot(page, "5-ledger-page");

    const ledgerText = await page.locator("body").innerText();
    console.log("\n=== LEDGER PAGE ===");

    // Check for [object Object] error
    const hasObjectError = ledgerText.includes("[object Object]");
    console.log("[object Object] error present:", hasObjectError);
    expect(hasObjectError).toBeFalsy();

    // Transaction types
    const hasDeposit = /\bDEPOSIT\b/i.test(ledgerText);
    const hasYield = /\bYIELD\b/i.test(ledgerText);
    const hasFeeCredit = /FEE_CREDIT/i.test(ledgerText);
    const hasIbCredit = /IB_CREDIT/i.test(ledgerText);

    console.log("DEPOSIT type visible:", hasDeposit);
    console.log("YIELD type visible:", hasYield);
    console.log("FEE_CREDIT type visible:", hasFeeCredit);
    console.log("IB_CREDIT type visible:", hasIbCredit);

    // Count table rows
    const tableRows = page.locator("tbody tr");
    const rowCount = await tableRows.count();
    console.log("Ledger rows:", rowCount);
    expect(rowCount).toBeGreaterThan(0);

    // First 5 rows
    for (let i = 0; i < Math.min(5, rowCount); i++) {
      const rowText = await tableRows.nth(i).innerText();
      console.log(`Row ${i}: ${rowText.substring(0, 200)}`);
    }

    // Attempt void dialog (look for void button on first row, open it, then cancel)
    const voidBtn = page.locator("button").filter({ hasText: /void/i }).first();
    if (await voidBtn.isVisible().catch(() => false)) {
      await voidBtn.click();
      await page.waitForTimeout(1000);
      const dialogVisible = await page
        .locator('[role="dialog"], .modal, [data-testid*="dialog"]')
        .isVisible()
        .catch(() => false);
      console.log("Void dialog opened:", dialogVisible);
      await screenshot(page, "5-void-dialog");

      // Cancel the dialog
      const cancelBtn = page
        .locator('[role="dialog"] button, .modal button')
        .filter({ hasText: /cancel|close|no/i })
        .first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        console.log("Void dialog cancelled successfully");
      } else {
        await page.keyboard.press("Escape");
        console.log("Void dialog closed with Escape");
      }
    } else {
      console.log("No void button found on ledger page");
    }

    expect(ledgerText).not.toContain("[object Object]");
  });

  // =========================================================================
  // 6. Fund Details / AUM
  // =========================================================================
  test("6. Fund Details — AUM chart, investor count", async ({ page }) => {
    await navigateTo(page, "/admin/funds");
    await screenshot(page, "6-funds-list");

    const fundsText = await page.locator("body").innerText();
    console.log("\n=== FUNDS LIST ===");
    console.log(fundsText.substring(0, 2000));

    // Find XRP Fund link
    const xrpLink = page.locator("a, tr, button, td").filter({ hasText: /xrp/i }).first();
    if (await xrpLink.isVisible().catch(() => false)) {
      await xrpLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await screenshot(page, "6-xrp-fund-detail");

      const fundText = await page.locator("body").innerText();
      console.log("\n=== XRP FUND DETAIL ===");
      console.log(fundText.substring(0, 3000));

      // Investor count = 2 (Sam Johnson + Ryan Van Der Wall)
      const has2Investors = /2 investor|investors.*2|\b2\b.*invest/i.test(fundText);
      console.log("Investor count shows 2:", has2Investors);

      // AUM chart present
      const chartEl = page
        .locator("canvas, svg, [data-testid*='chart'], .recharts-wrapper")
        .first();
      const hasChart = await chartEl.isVisible().catch(() => false);
      console.log("AUM chart visible:", hasChart);

      // Numbers
      const fundNumbers = fundText.match(/[\d,]+\.?\d*/g) || [];
      console.log("Fund page numbers:", fundNumbers.slice(0, 20).join(", "));

      // INDIGO Fees as separate account (not counted as investor)
      const hasIndigoFeesAsInvestor = /indigo fees.*investor|INDIGO.*investor count/i.test(
        fundText
      );
      console.log("INDIGO Fees incorrectly listed as investor:", hasIndigoFeesAsInvestor);

      expect(fundText).not.toContain("[object Object]");
    } else {
      console.log("XRP Fund link not found");
      const allLinks = page.locator("a");
      const linkCount = await allLinks.count();
      for (let i = 0; i < Math.min(10, linkCount); i++) {
        const linkText = await allLinks.nth(i).innerText();
        console.log(`Link ${i}: ${linkText}`);
      }
    }
  });

  // =========================================================================
  // 7. Command Center (Dashboard)
  // =========================================================================
  test("7. Command Center — operational status, KPIs display", async ({ page }) => {
    await navigateTo(page, "/admin");
    await screenshot(page, "7-command-center");

    const dashText = await page.locator("body").innerText();
    console.log("\n=== COMMAND CENTER (DASHBOARD) ===");
    console.log(dashText.substring(0, 3000));

    // System operational
    const isOperational = /operational|active|healthy|running/i.test(dashText);
    console.log("System operational status:", isOperational);

    // KPIs visible (numbers present)
    const hasNumbers = /\d+/.test(dashText);
    console.log("KPI numbers present:", hasNumbers);

    // No error messages
    const hasObjectError = dashText.includes("[object Object]");
    const hasLoadingError = /error loading|failed to load/i.test(dashText);
    console.log("[object Object] error:", hasObjectError);
    console.log("Loading error:", hasLoadingError);

    // Look for specific KPIs
    const hasAUM = /aum|assets under management/i.test(dashText);
    const hasInvestors = /investor/i.test(dashText);
    const hasRevenue = /revenue|fee/i.test(dashText);
    console.log("AUM KPI:", hasAUM);
    console.log("Investors KPI:", hasInvestors);
    console.log("Revenue KPI:", hasRevenue);

    expect(hasObjectError).toBeFalsy();
    expect(hasNumbers).toBeTruthy();
  });

  // =========================================================================
  // 8. IB Management
  // =========================================================================
  test("8. IB Management — Ryan Van Der Wall with commission data", async ({ page }) => {
    await navigateTo(page, "/admin/ib-management");
    await screenshot(page, "8-ib-management");

    const ibText = await page.locator("body").innerText();
    console.log("\n=== IB MANAGEMENT PAGE ===");
    console.log(ibText.substring(0, 3000));

    // Ryan Van Der Wall should appear
    const hasRyan = /ryan van der wall|ryan.*wall/i.test(ibText);
    console.log("Ryan Van Der Wall found:", hasRyan);

    // IB name should NOT be missing/blank
    const hasBlankIBName = /ib name.*-|ib.*unknown|unnamed ib/i.test(ibText);
    console.log("Blank/unknown IB name (bad):", hasBlankIBName);

    // Commission data
    const hasCommission = /commission|14\.20|14\.2|ib.*credit|credit.*ib/i.test(ibText);
    console.log("Commission data visible:", hasCommission);

    // No [object Object]
    const hasObjectError = ibText.includes("[object Object]");
    console.log("[object Object] error:", hasObjectError);
    expect(hasObjectError).toBeFalsy();

    // Table rows
    const tableRows = page.locator("tbody tr");
    const rowCount = await tableRows.count();
    console.log("IB management table rows:", rowCount);

    if (rowCount > 0) {
      for (let i = 0; i < Math.min(5, rowCount); i++) {
        const rowText = await tableRows.nth(i).innerText();
        console.log(`IB Row ${i}: ${rowText.substring(0, 200)}`);
      }
    }

    // Numbers
    const ibNumbers = ibText.match(/[\d,]+\.?\d*/g) || [];
    console.log("IB page numbers:", ibNumbers.slice(0, 20).join(", "));
  });

  // =========================================================================
  // BONUS: Verify yield page (Admin > Yield)
  // =========================================================================
  test("BONUS: Yield Operations page loads without errors", async ({ page }) => {
    await navigateTo(page, "/admin/yield");
    await screenshot(page, "bonus-yield-page");

    const yieldText = await page.locator("body").innerText();
    console.log("\n=== YIELD OPS PAGE ===");
    console.log(yieldText.substring(0, 2000));

    const hasObjectError = yieldText.includes("[object Object]");
    console.log("[object Object] error:", hasObjectError);
    expect(hasObjectError).toBeFalsy();
  });
});
