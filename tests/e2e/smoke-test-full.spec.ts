import { test, expect } from "@playwright/test";
import path from "path";

const BASE_URL = "http://localhost:8080";
const SCREENSHOTS_DIR = path.join(__dirname, "../screenshots");

// QA Credentials
const INVESTOR_EMAIL = "qa.investor@indigo.fund";
const INVESTOR_PASSWORD = "QaTest2026!";
const ADMIN_EMAIL = "qa.admin@indigo.fund";
const ADMIN_PASSWORD = "QaTest2026!";

test.describe("Indigo Platform Smoke Tests - Bug Fix Verification", () => {
  test("Test 1: Investor Withdrawal Form - Verify Group A + B Fixes", async ({ page }) => {
    console.log("\n=== Test 1: Investor Withdrawal Form ===");

    // Navigate to login page
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Log in as investor
    console.log("Logging in as investor...");
    await page.fill('input[type="email"]', INVESTOR_EMAIL);
    await page.fill('input[type="password"]', INVESTOR_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL(/\/(dashboard|investor)/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    console.log("Logged in successfully");

    // Navigate to withdrawals page
    console.log("Navigating to withdrawal form...");

    // Try multiple possible navigation paths
    const withdrawalPageFound = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const withdrawalLink = links.find(
        (link) =>
          link.textContent?.toLowerCase().includes("withdraw") || link.href.includes("/withdraw")
      );
      if (withdrawalLink) {
        (withdrawalLink as HTMLAnchorElement).click();
        return true;
      }
      return false;
    });

    if (!withdrawalPageFound) {
      // Try direct navigation
      await page.goto(`${BASE_URL}/withdrawals/new`);
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000); // Wait for any dynamic content to load

    // Take screenshot of the withdrawal form
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "smoke-withdrawal-form.png"),
      fullPage: true,
    });
    console.log("Screenshot saved: smoke-withdrawal-form.png");

    // Verify: NO "NaN" text visible anywhere on the page
    const pageText = await page.textContent("body");
    const hasNaN = pageText?.includes("NaN");
    console.log(`✓ Check for NaN: ${hasNaN ? "FAIL - NaN found!" : "PASS - No NaN"}`);
    expect(hasNaN).toBe(false);

    // Verify: Balance shows correct decimal places (2 for USDT/USDC, not 8 or 10)
    const balanceElements = await page.locator("text=/balance|available/i").all();
    let balanceCheckPassed = true;
    for (const element of balanceElements) {
      const text = await element.textContent();
      console.log(`  Found balance text: ${text}`);

      // Check for excessive decimal places (more than 4 decimals is suspicious for USDT/USDC)
      const excessiveDecimals = /\d+\.\d{5,}/.test(text || "");
      if (excessiveDecimals) {
        console.log(`  ⚠ WARNING: Found excessive decimals: ${text}`);
        balanceCheckPassed = false;
      }
    }
    console.log(`✓ Balance decimal check: ${balanceCheckPassed ? "PASS" : "FAIL"}`);

    // Verify: NO TOTP/2FA/MFA input field on the form
    const totpField = await page
      .locator(
        'input[name*="totp"], input[name*="2fa"], input[name*="mfa"], input[placeholder*="code"], label:has-text("Authenticator")'
      )
      .count();
    console.log(
      `✓ Check for TOTP/2FA field: ${totpField > 0 ? "FAIL - 2FA field found!" : "PASS - No 2FA field"}`
    );
    expect(totpField).toBe(0);

    console.log("Test 1 complete\n");
  });

  test("Test 2: Admin Deposit Form - Verify Group C (tx_hash field)", async ({ page }) => {
    console.log("\n=== Test 2: Admin Deposit Form ===");

    // Navigate to login page
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Log out if already logged in
    const logoutButton = await page
      .locator('button:has-text("Logout"), button:has-text("Sign Out")')
      .first();
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }

    // Log in as admin
    console.log("Logging in as admin...");
    await page.fill('input[type="email"]', ADMIN_EMAIL);
    await page.fill('input[type="password"]', ADMIN_PASSWORD);
    await page.click('button[type="submit"]');

    // Wait for navigation after login
    await page.waitForURL(/\/(admin|dashboard)/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    console.log("Logged in as admin");

    // Navigate to transactions page
    console.log("Navigating to admin transactions page...");

    // Try to find and click transactions link
    const transactionsLinkFound = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const txLink = links.find(
        (link) =>
          link.textContent?.toLowerCase().includes("transaction") ||
          link.href.includes("/transaction")
      );
      if (txLink) {
        (txLink as HTMLAnchorElement).click();
        return true;
      }
      return false;
    });

    if (!transactionsLinkFound) {
      // Try direct navigation
      await page.goto(`${BASE_URL}/admin/transactions`);
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Look for "Add Transaction" or "New Transaction" button
    const addButton = await page
      .locator('button:has-text("Add"), button:has-text("New"), button:has-text("Create")')
      .first();
    if (await addButton.isVisible().catch(() => false)) {
      console.log("Clicking Add/New Transaction button...");
      await addButton.click();
      await page.waitForTimeout(2000);
    }

    // Take screenshot of the deposit form
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "smoke-admin-deposit-form.png"),
      fullPage: true,
    });
    console.log("Screenshot saved: smoke-admin-deposit-form.png");

    // Verify: There is a "Transaction Hash" or "tx_hash" field on the form
    const txHashField = await page
      .locator(
        'input[name*="hash"], input[name*="tx"], label:has-text("Transaction Hash"), label:has-text("Tx Hash"), label:has-text("Hash")'
      )
      .count();
    console.log(
      `✓ Check for tx_hash field: ${txHashField > 0 ? "PASS - tx_hash field found" : "FAIL - No tx_hash field"}`
    );
    expect(txHashField).toBeGreaterThan(0);

    console.log("Test 2 complete\n");
  });

  test("Test 3: Admin Dashboard - Verify 2FA Banner Removed", async ({ page }) => {
    console.log("\n=== Test 3: Admin Dashboard ===");

    // Navigate to login page
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Log in as admin (if not already logged in)
    const emailField = await page.locator('input[type="email"]').first();
    if (await emailField.isVisible().catch(() => false)) {
      console.log("Logging in as admin...");
      await page.fill('input[type="email"]', ADMIN_EMAIL);
      await page.fill('input[type="password"]', ADMIN_PASSWORD);
      await page.click('button[type="submit"]');
      await page.waitForURL(/\/(admin|dashboard)/, { timeout: 10000 });
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Navigate to main admin dashboard
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "smoke-admin-dashboard-no-2fa.png"),
      fullPage: true,
    });
    console.log("Screenshot saved: smoke-admin-dashboard-no-2fa.png");

    // Verify: NO "Two-Factor" or "2FA" warning banner visible
    const pageText = await page.textContent("body");
    const has2FABanner =
      pageText?.toLowerCase().includes("two-factor") ||
      pageText?.toLowerCase().includes("2fa") ||
      pageText?.toLowerCase().includes("authenticator");
    console.log(
      `✓ Check for 2FA banner: ${has2FABanner ? "FAIL - 2FA banner found!" : "PASS - No 2FA banner"}`
    );
    expect(has2FABanner).toBe(false);

    console.log("Test 3 complete\n");
  });

  test("Test 4: Investor Settings - Verify 2FA Removed", async ({ page }) => {
    console.log("\n=== Test 4: Investor Settings ===");

    // Navigate to login page
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");

    // Log out if logged in as admin
    const logoutButton = await page
      .locator('button:has-text("Logout"), button:has-text("Sign Out")')
      .first();
    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      await page.waitForTimeout(1000);
    }

    // Log in as investor
    console.log("Logging in as investor...");
    await page.fill('input[type="email"]', INVESTOR_EMAIL);
    await page.fill('input[type="password"]', INVESTOR_PASSWORD);
    await page.click('button[type="submit"]');

    await page.waitForURL(/\/(dashboard|investor)/, { timeout: 10000 });
    await page.waitForLoadState("networkidle");
    console.log("Logged in as investor");

    // Navigate to settings/profile page
    console.log("Navigating to investor settings/profile...");

    const settingsLinkFound = await page.evaluate(() => {
      const links = Array.from(document.querySelectorAll("a"));
      const settingsLink = links.find(
        (link) =>
          link.textContent?.toLowerCase().includes("setting") ||
          link.textContent?.toLowerCase().includes("profile") ||
          link.href.includes("/settings") ||
          link.href.includes("/profile")
      );
      if (settingsLink) {
        (settingsLink as HTMLAnchorElement).click();
        return true;
      }
      return false;
    });

    if (!settingsLinkFound) {
      // Try direct navigation
      await page.goto(`${BASE_URL}/settings`);
    }

    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(2000);

    // Take screenshot
    await page.screenshot({
      path: path.join(SCREENSHOTS_DIR, "smoke-investor-settings-no-2fa.png"),
      fullPage: true,
    });
    console.log("Screenshot saved: smoke-investor-settings-no-2fa.png");

    // Verify: NO "Two-Factor" or "TOTP" or "2FA" section/toggle visible
    const pageText = await page.textContent("body");
    const has2FASection =
      pageText?.toLowerCase().includes("two-factor") ||
      pageText?.toLowerCase().includes("2fa") ||
      pageText?.toLowerCase().includes("totp") ||
      pageText?.toLowerCase().includes("authenticator");
    console.log(
      `✓ Check for 2FA section: ${has2FASection ? "FAIL - 2FA section found!" : "PASS - No 2FA section"}`
    );
    expect(has2FASection).toBe(false);

    console.log("Test 4 complete\n");
  });
});
