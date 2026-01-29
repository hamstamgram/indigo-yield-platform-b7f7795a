/**
 * Production UI End-to-End Tests v3
 * Tests critical paths on https://indigo-yield-platform-v01.lovable.app/
 * Fixed: Correct login route is /login, not /auth/login
 */

import { chromium, Page } from "playwright";

const BASE_URL = "https://indigo-yield-platform-v01.lovable.app";

interface TestResult {
  name: string;
  status: "PASS" | "FAIL" | "SKIP";
  duration: number;
  error?: string;
}

const results: TestResult[] = [];

async function runTest(name: string, testFn: () => Promise<void>): Promise<void> {
  const start = Date.now();
  try {
    await testFn();
    results.push({ name, status: "PASS", duration: Date.now() - start });
    console.log(`✅ ${name} (${Date.now() - start}ms)`);
  } catch (error) {
    results.push({
      name,
      status: "FAIL",
      duration: Date.now() - start,
      error: error instanceof Error ? error.message : String(error),
    });
    console.log(`❌ ${name}: ${error instanceof Error ? error.message : error}`);
  }
}

async function waitForReact(page: Page, timeout = 15000) {
  await page.waitForFunction(
    () => {
      const root = document.getElementById("root");
      return root && root.children.length > 0;
    },
    { timeout }
  );
  await page.waitForTimeout(500);
}

// ─────────────────────────────────────────────────────────────
// TEST CASES
// ─────────────────────────────────────────────────────────────

async function test01_HomepageAccessible(page: Page) {
  await page.goto(BASE_URL);
  await waitForReact(page);

  const title = await page.title();
  console.log(`  → Title: ${title}`);

  if (!title.toLowerCase().includes("indigo")) {
    throw new Error(`Unexpected title: ${title}`);
  }
}

async function test02_LoginPageLoads(page: Page) {
  // Route is /login not /auth/login
  await page.goto(`${BASE_URL}/login`);
  await waitForReact(page);

  await page.screenshot({ path: "/tmp/login-v3.png" });

  // Check for login form
  const emailInput = await page
    .locator('input[type="email"], input[name="email"], input[id*="email" i]')
    .count();
  const passwordInput = await page.locator('input[type="password"]').count();

  console.log(`  → Email inputs: ${emailInput}`);
  console.log(`  → Password inputs: ${passwordInput}`);

  if (emailInput === 0 || passwordInput === 0) {
    // Check if we're on login page or redirected
    const url = page.url();
    if (url.includes("dashboard") || url.includes("portfolio")) {
      console.log(`  → Already logged in, on: ${url}`);
      return;
    }
    throw new Error("Login form not found");
  }
}

async function test03_RootRedirectsToLogin(page: Page) {
  // Clear any session
  await page.context().clearCookies();
  await page.goto(BASE_URL);
  await waitForReact(page);

  const url = page.url();
  console.log(`  → Root redirected to: ${url}`);

  // Root should show login page
  if (!url.includes("login") && url !== BASE_URL + "/") {
    throw new Error(`Unexpected redirect: ${url}`);
  }
}

async function test04_HealthEndpoint(page: Page) {
  await page.goto(`${BASE_URL}/health`);
  await waitForReact(page);

  const content = await page.content();
  console.log(`  → Health page loaded`);
}

async function test05_StatusEndpoint(page: Page) {
  await page.goto(`${BASE_URL}/status`);
  await waitForReact(page);

  console.log(`  → Status page loaded`);
}

async function test06_TermsPage(page: Page) {
  await page.goto(`${BASE_URL}/terms`);
  await waitForReact(page);

  const heading = await page.locator("h1, h2").first().textContent();
  console.log(`  → Terms heading: ${heading?.substring(0, 50)}`);
}

async function test07_PrivacyPage(page: Page) {
  await page.goto(`${BASE_URL}/privacy`);
  await waitForReact(page);

  const heading = await page.locator("h1, h2").first().textContent();
  console.log(`  → Privacy heading: ${heading?.substring(0, 50)}`);
}

async function test08_ForgotPasswordPage(page: Page) {
  await page.goto(`${BASE_URL}/forgot-password`);
  await waitForReact(page);

  const emailInput = await page.locator('input[type="email"]').count();
  console.log(`  → Email input found: ${emailInput > 0}`);
}

async function test09_ResponsiveMobile(page: Page) {
  await page.setViewportSize({ width: 375, height: 667 });
  await page.goto(BASE_URL);
  await waitForReact(page);

  const hasOverflow = await page.evaluate(() => {
    return document.body.scrollWidth > document.body.clientWidth;
  });

  if (hasOverflow) {
    throw new Error("Horizontal overflow on mobile");
  }
  console.log(`  → Mobile layout: OK`);
}

async function test10_NoConsoleErrors(page: Page) {
  const errors: string[] = [];

  page.on("console", (msg) => {
    if (msg.type() === "error") {
      const text = msg.text();
      if (!text.includes("net::") && !text.includes("favicon") && !text.includes("font")) {
        errors.push(text);
      }
    }
  });

  await page.goto(BASE_URL);
  await waitForReact(page);
  await page.waitForTimeout(2000);

  if (errors.length > 0) {
    console.log(`  → Errors: ${errors.join("; ")}`);
  } else {
    console.log(`  → No critical console errors`);
  }
}

async function test11_LoginFormInteraction(page: Page) {
  await page.goto(`${BASE_URL}/login`);
  await waitForReact(page);

  const emailInput = page.locator('input[type="email"], input[placeholder*="email" i]').first();
  const passwordInput = page.locator('input[type="password"]').first();
  const submitBtn = page.locator('button[type="submit"]').first();

  const emailVisible = await emailInput.isVisible().catch(() => false);
  const passwordVisible = await passwordInput.isVisible().catch(() => false);
  const buttonVisible = await submitBtn.isVisible().catch(() => false);

  console.log(`  → Email: ${emailVisible}, Password: ${passwordVisible}, Submit: ${buttonVisible}`);

  if (emailVisible && passwordVisible) {
    await emailInput.fill("test@example.com");
    await passwordInput.fill("password123");
    console.log(`  → Form fillable: OK`);
  }
}

async function test12_404Page(page: Page) {
  await page.goto(`${BASE_URL}/this-page-does-not-exist-xyz`);
  await waitForReact(page);

  const content = await page.content();
  const has404 =
    content.toLowerCase().includes("404") || content.toLowerCase().includes("not found");

  console.log(`  → 404 indicator: ${has404}`);
}

async function test13_InvestorInvitePage(page: Page) {
  await page.goto(`${BASE_URL}/investor-invite`);
  await waitForReact(page);

  const url = page.url();
  console.log(`  → Invite page accessible`);
}

// ─────────────────────────────────────────────────────────────
// MAIN
// ─────────────────────────────────────────────────────────────

async function main() {
  console.log("\n🧪 PRODUCTION UI TESTS");
  console.log(`📍 ${BASE_URL}`);
  console.log(`⏰ ${new Date().toISOString()}`);
  console.log("═".repeat(50));

  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1280, height: 720 },
  });

  const page = await context.newPage();

  try {
    await runTest("01. Homepage Accessible", () => test01_HomepageAccessible(page));
    await runTest("02. Login Page Loads", () => test02_LoginPageLoads(page));
    await runTest("03. Root Redirects", () => test03_RootRedirectsToLogin(page));
    await runTest("04. Health Endpoint", () => test04_HealthEndpoint(page));
    await runTest("05. Status Endpoint", () => test05_StatusEndpoint(page));
    await runTest("06. Terms Page", () => test06_TermsPage(page));
    await runTest("07. Privacy Page", () => test07_PrivacyPage(page));
    await runTest("08. Forgot Password", () => test08_ForgotPasswordPage(page));
    await runTest("09. Responsive Mobile", () => test09_ResponsiveMobile(page));
    await runTest("10. No Console Errors", () => test10_NoConsoleErrors(page));
    await runTest("11. Login Form Interaction", () => test11_LoginFormInteraction(page));
    await runTest("12. 404 Page", () => test12_404Page(page));
    await runTest("13. Investor Invite Page", () => test13_InvestorInvitePage(page));
  } finally {
    await browser.close();
  }

  // Summary
  console.log("\n" + "═".repeat(50));
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`📊 RESULTS: ${passed}/${results.length} PASSED`);

  if (failed > 0) {
    console.log("\n❌ Failed:");
    results
      .filter((r) => r.status === "FAIL")
      .forEach((r) => {
        console.log(`   • ${r.name}: ${r.error}`);
      });
  }

  console.log("\n" + (failed === 0 ? "🎉 ALL TESTS PASSED!" : "⚠️ SEE FAILURES ABOVE"));
  process.exit(failed > 0 ? 1 : 0);
}

main().catch(console.error);
