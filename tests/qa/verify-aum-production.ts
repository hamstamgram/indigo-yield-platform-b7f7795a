/**
 * Production UI Verification: Verify AUM displays correctly in production
 */
import { chromium } from "@playwright/test";
import * as fs from "fs";

const ADMIN_EMAIL = "qa.admin@indigo.fund";
const ADMIN_PASSWORD = "QaTest2026!";
const BASE_URL = "https://indigo-yield-platform-v01.lovable.app";
const OUTPUT_DIR = "/tmp/playwright-output";

async function verifyAUMProduction() {
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    viewport: { width: 1600, height: 1024 },
  });
  const page = await context.newPage();

  try {
    console.log(`🌐 Testing PRODUCTION: ${BASE_URL}`);
    console.log("🔐 Logging in as admin...");
    await page.goto(`${BASE_URL}/login`, { timeout: 30000 });
    await page.waitForLoadState("networkidle");

    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL("**/admin**", { timeout: 20000 });
    await page.waitForLoadState("networkidle");
    console.log("✅ Logged in successfully");

    await page.waitForTimeout(3000);

    console.log("📸 Capturing production admin dashboard...");
    await page.screenshot({
      path: `${OUTPUT_DIR}/production-aum-verification.png`,
      fullPage: false,
    });

    const pageContent = await page.content();
    const has1500 = pageContent.includes("1,500") || pageContent.includes("1500");
    const has1425 = pageContent.includes("1,425") || pageContent.includes("1425");

    console.log("\n=== PRODUCTION AUM VERIFICATION ===");
    console.log(`Contains 1500 (correct AUM): ${has1500 ? "✅ YES" : "❌ NO"}`);
    console.log(`Contains 1425 (buggy AUM): ${has1425 ? "❌ BUG!" : "✅ NO (good)"}`);

    console.log("\n✅ Production verification complete!");
    console.log(`📁 Screenshot: ${OUTPUT_DIR}/production-aum-verification.png`);

    return { success: has1500 && !has1425, has1500, has1425 };
  } catch (error) {
    console.error("❌ Error:", error);
    await page.screenshot({ path: `${OUTPUT_DIR}/production-error.png` });
    return { success: false, error: String(error) };
  } finally {
    await browser.close();
  }
}

verifyAUMProduction()
  .then((result) => {
    console.log("\n=== FINAL RESULT ===");
    console.log(JSON.stringify(result, null, 2));
    console.log(result.success ? "✅ PRODUCTION AUM FIX VERIFIED" : "❌ VERIFICATION FAILED");
  })
  .catch(console.error);
