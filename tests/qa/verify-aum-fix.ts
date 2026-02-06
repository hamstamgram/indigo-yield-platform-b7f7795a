/**
 * UI Verification: Verify that fund AUM displays correctly after fix
 * Tests that the Stablecoin Fund shows 1500 USDT (not 1425)
 */
import { chromium } from "@playwright/test";
import * as fs from "fs";

const ADMIN_EMAIL = "qa.admin@indigo.fund";
const ADMIN_PASSWORD = "QaTest2026!";
const BASE_URL = "http://localhost:8081";
const OUTPUT_DIR = "/tmp/playwright-output";

async function verifyAUMFix() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1024 },
  });
  const page = await context.newPage();

  try {
    console.log("🔐 Logging in as admin...");
    await page.goto(`${BASE_URL}/login`);
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin**", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    console.log("✅ Logged in successfully");

    // Wait for dashboard to load
    await page.waitForTimeout(3000);

    // Screenshot 1: Admin Dashboard
    console.log("📸 Capturing admin dashboard...");
    await page.screenshot({
      path: `${OUTPUT_DIR}/aum-fix-verification-dashboard.png`,
      fullPage: false,
    });

    // Look for the Stablecoin Fund card and check AUM
    console.log("🔍 Looking for Stablecoin Fund / USDT fund...");

    // Check for any text containing "1,500" or "1500" USDT
    const pageContent = await page.content();
    const has1500 = pageContent.includes("1,500") || pageContent.includes("1500");
    const has1400 = pageContent.includes("1,400") || pageContent.includes("1400");
    const has1425 = pageContent.includes("1,425") || pageContent.includes("1425");

    console.log("\n=== AUM VERIFICATION RESULTS ===");
    console.log(`Contains 1500 (correct AUM): ${has1500 ? "✅ YES" : "❌ NO"}`);
    console.log(
      `Contains 1400 (investor-only): ${has1400 ? "⚠️ YES (expected in investor breakdown)" : "NO"}`
    );
    console.log(`Contains 1425 (buggy AUM): ${has1425 ? "❌ BUG STILL PRESENT!" : "✅ NO (good)"}`);

    // Find and click on USDT/Stablecoin fund if visible
    const fundCard = page.locator("text=USDT").first();
    if ((await fundCard.count()) > 0) {
      console.log("📸 Found USDT fund reference, capturing...");
      await fundCard.scrollIntoViewIfNeeded();
      await page.screenshot({
        path: `${OUTPUT_DIR}/aum-fix-usdt-fund.png`,
        fullPage: false,
      });
    }

    // Navigate to Fund Financials or similar page
    const fundFinancialsLink = page.locator("text=Fund Financials").first();
    if ((await fundFinancialsLink.count()) > 0) {
      await fundFinancialsLink.click();
      await page.waitForLoadState("networkidle");
      await page.waitForTimeout(2000);
      await page.screenshot({
        path: `${OUTPUT_DIR}/aum-fix-fund-financials.png`,
        fullPage: false,
      });
      console.log("📸 Captured Fund Financials page");
    }

    console.log("\n✅ UI verification complete!");
    console.log(`📁 Screenshots saved to: ${OUTPUT_DIR}`);

    // Return result
    return {
      success: has1500 && !has1425,
      has1500,
      has1400,
      has1425,
    };
  } catch (error) {
    console.error("❌ Error:", error);
    await page.screenshot({ path: `${OUTPUT_DIR}/aum-fix-error.png` });
    return { success: false, error: String(error) };
  } finally {
    await browser.close();
  }
}

verifyAUMFix()
  .then((result) => {
    console.log("\n=== FINAL RESULT ===");
    console.log(JSON.stringify(result, null, 2));
    if (result.success) {
      console.log("✅ AUM FIX VERIFIED IN UI");
    } else {
      console.log("❌ VERIFICATION FAILED");
    }
  })
  .catch(console.error);
