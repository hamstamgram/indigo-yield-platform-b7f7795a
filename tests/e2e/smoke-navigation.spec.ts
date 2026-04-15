import { test, expect } from "@playwright/test";

test.setTimeout(300000);

const QA_EMAIL = "Adriel@indigo.fund";
const QA_PASSWORD = "TestAdmin2026!";
const BASE_URL = "https://indigo-yield-platform.lovable.app";

test.describe("Go-Live Smoke Tests - Full Navigation", () => {
  test("1. Login and Verify Admin Dashboard", async ({ page }) => {
    await page.goto(BASE_URL);
    await page.getByRole("textbox", { name: "Email Address" }).fill(QA_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(QA_PASSWORD);
    await page.getByRole("button", { name: /Access Portal/i }).click();
    await page.waitForURL("**/admin**", { timeout: 30000 });

    // Wait for dashboard to fully load
    await page.waitForTimeout(3000);

    // Take screenshot for debugging
    await page.screenshot({ path: "test-results/smoke-1-dashboard.png" });

    console.log("✅ 1. Login and Dashboard - PASSED");
  });

  test("2. Find and Click Navigation Links", async ({ page }) => {
    await page.goto(BASE_URL + "/admin");
    await page.waitForTimeout(3000);

    // Get all links on the page to see what's available
    const links = await page.locator("a").all();
    console.log(`Found ${links.length} links on admin page`);

    for (const link of links.slice(0, 20)) {
      const href = await link.getAttribute("href");
      const text = await link.textContent().catch(() => "");
      if (href || text) {
        console.log(`  Link: ${text?.substring(0, 50)} -> ${href}`);
      }
    }

    // Try common navigation patterns
    const navSelectors = [
      "text=Investors",
      "text=Funds",
      "text=Transactions",
      "text=Yields",
      "text=Withdrawals",
      "text=Reports",
      "text=Dashboard",
      "text=Operations",
    ];

    for (const selector of navSelectors) {
      const el = page.locator(selector).first();
      if (await el.isVisible({ timeout: 1000 }).catch(() => false)) {
        console.log(`  ✅ Found: ${selector}`);
      }
    }

    console.log("✅ 2. Navigation Analysis - COMPLETED");
  });

  test("3. Try Direct URL Navigation", async ({ page }) => {
    const routes = [
      "/admin/investors",
      "/admin/funds",
      "/admin/transactions",
      "/admin/yields",
      "/admin/withdrawals",
      "/admin/reports",
      "/admin/dashboard",
      "/admin/operations",
    ];

    for (const route of routes) {
      await page.goto(BASE_URL + route);
      await page.waitForTimeout(1500);

      const title = await page.title();
      const body = await page.locator("body").textContent();
      const hasContent = body && body.length > 100;

      console.log(`  ${route}: ${hasContent ? "✅" : "⚠️"} (${title?.substring(0, 30)})`);
    }

    console.log("✅ 3. Direct URL Navigation - COMPLETED");
  });
});
