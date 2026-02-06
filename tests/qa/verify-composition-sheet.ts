/**
 * Screenshot capture for verification of InvestorCompositionSheet changes
 */
import { chromium } from "@playwright/test";
import * as fs from "fs";

const ADMIN_EMAIL = "qa.admin@indigo.fund";
const ADMIN_PASSWORD = "QaTest2026!";
const BASE_URL = "http://localhost:8080";
const OUTPUT_DIR = "/tmp/playwright-output";

async function captureAdminDashboard() {
  // Ensure output directory exists
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

    // Wait for navigation to admin dashboard
    await page.waitForURL("**/admin**", { timeout: 15000 });
    await page.waitForLoadState("networkidle");
    console.log("✅ Logged in successfully");

    // Screenshot 1: Admin Dashboard with Financial Snapshot
    console.log("📸 Capturing admin dashboard...");
    await page.waitForTimeout(2000); // Wait for data to load
    await page.screenshot({
      path: `${OUTPUT_DIR}/admin-dashboard-financial-snapshot.png`,
      fullPage: false,
    });
    console.log("✅ Saved: admin-dashboard-financial-snapshot.png");

    // Try to click on a fund card to open the composition sheet
    console.log("🔍 Looking for fund cards...");
    const fundCard = page
      .locator('.glass-card, [class*="fund"], [class*="FundSnapshotCard"]')
      .first();

    if ((await fundCard.count()) > 0) {
      await fundCard.click();
      await page.waitForTimeout(1500); // Wait for sheet to open

      // Screenshot 2: Investor Composition Sheet
      console.log("📸 Capturing investor composition sheet...");
      await page.screenshot({
        path: `${OUTPUT_DIR}/investor-composition-sheet.png`,
        fullPage: false,
      });
      console.log("✅ Saved: investor-composition-sheet.png");
    } else {
      console.log("⚠️ No fund cards found on dashboard");
    }

    console.log("\n✅ Verification screenshots captured successfully!");
    console.log(`📁 Output directory: ${OUTPUT_DIR}`);
  } catch (error) {
    console.error("❌ Error:", error);
    await page.screenshot({ path: `${OUTPUT_DIR}/error-state.png` });
  } finally {
    await browser.close();
  }
}

captureAdminDashboard().catch(console.error);
