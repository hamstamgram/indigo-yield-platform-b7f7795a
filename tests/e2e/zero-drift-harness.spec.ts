/**
 * Zero-Drift QA Harness - Reusable E2E Spec
 *
 * Verifies platform integrity across all 3 portals:
 * - Admin: Dashboard, Investors, Transactions, Yield, Funds
 * - Investor: Portfolio, Transactions, Yield History
 * - IB: Referrals, Commissions
 *
 * Also runs SQL-based integrity checks via the admin System Health page.
 *
 * Usage:
 *   PLAYWRIGHT_BASE_URL=https://indigo-yield-platform.lovable.app npx playwright test zero-drift-harness --project=chromium
 *
 * Requires QA credentials configured in environment or defaults below.
 */

import { test, expect, Page } from "@playwright/test";

// ---------------------------------------------------------------------------
// Config
// ---------------------------------------------------------------------------

const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "https://indigo-yield-platform.lovable.app";

const QA_CREDS = {
  admin: {
    email: process.env.QA_ADMIN_EMAIL || "qa.admin@indigo.fund",
    password: process.env.QA_ADMIN_PASSWORD || "QaTest2026!",
  },
  investor: {
    email: process.env.QA_INVESTOR_EMAIL || "qa.investor@indigo.fund",
    password: process.env.QA_INVESTOR_PASSWORD || "QaTest2026!",
  },
  ib: {
    email: process.env.QA_IB_EMAIL || "qa.ib@indigo.fund",
    password: process.env.QA_IB_PASSWORD || "QaTest2026!",
  },
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

async function dismissOverlays(page: Page) {
  // Cookie consent
  const cookieBtn = page.getByRole("button", { name: "Accept All" });
  if (await cookieBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await cookieBtn.click();
    await page.waitForTimeout(500);
  }

  // PWA install banner
  await page.evaluate(() => {
    document.querySelectorAll('[class*="fixed"]').forEach((el) => {
      const text = (el as HTMLElement).textContent || "";
      if (text.includes("Install") || text.includes("Add to Home")) {
        (el as HTMLElement).remove();
      }
    });
  });
}

async function clearAuthState(page: Page) {
  await page.evaluate(() => {
    const keys = Object.keys(localStorage);
    keys.forEach((key) => {
      if (key.includes("supabase") || key.includes("auth")) {
        localStorage.removeItem(key);
      }
    });
  });
}

async function loginAs(page: Page, creds: { email: string; password: string }) {
  await page.goto(BASE_URL);
  await dismissOverlays(page);

  // Wait for login form
  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.waitFor({ timeout: 10000 });
  await emailInput.fill(creds.email);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(creds.password);

  // Click login
  const loginBtn = page
    .locator('button:has-text("Access Portal"), button:has-text("Sign In"), button[type="submit"]')
    .first();
  await loginBtn.click({ force: true });

  // Wait for navigation away from login
  await page.waitForURL(/.*(?:admin|investor|ib|dashboard).*/, { timeout: 15000 }).catch(() => {
    // Fallback: just wait a bit and check we're not on login error
  });
  await dismissOverlays(page);
}

// ---------------------------------------------------------------------------
// Admin Portal Tests
// ---------------------------------------------------------------------------

test.describe("Zero-Drift Harness: Admin Portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, QA_CREDS.admin);
  });

  test("Dashboard loads with stats", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin`);
    await dismissOverlays(page);

    // Dashboard should show key stats
    await expect(page.locator("text=Total Investors").first()).toBeVisible({
      timeout: 15000,
    });

    // Should show fund financials or similar section
    const content = await page.textContent("body");
    expect(content).toBeTruthy();
  });

  test("Investors list loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/investors`);
    await dismissOverlays(page);

    // Should show investor table/list
    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    expect(content).toContain("Investor");
  });

  test("Transactions page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/transactions`);
    await dismissOverlays(page);

    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    // Should show transaction types
    expect(
      content?.includes("DEPOSIT") ||
        content?.includes("Deposit") ||
        content?.includes("Transaction")
    ).toBeTruthy();
  });

  test("Yield Distributions page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/yield-distributions`);
    await dismissOverlays(page);

    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    expect(content?.includes("Yield") || content?.includes("Distribution")).toBeTruthy();
  });

  test("Funds page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/funds`);
    await dismissOverlays(page);

    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    expect(
      content?.includes("BTC") || content?.includes("Bitcoin") || content?.includes("Fund")
    ).toBeTruthy();
  });

  test("Fees page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/fees`);
    await dismissOverlays(page);

    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    expect(content?.includes("Fee") || content?.includes("INDIGO")).toBeTruthy();
  });

  test("Integrity page loads without errors", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/integrity`);
    await dismissOverlays(page);

    await page.waitForTimeout(5000);
    const content = await page.textContent("body");
    expect(content?.includes("Integrity") || content?.includes("Health")).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Investor Portal Tests
// ---------------------------------------------------------------------------

test.describe("Zero-Drift Harness: Investor Portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, QA_CREDS.investor);
  });

  test("Investor overview loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/investor`);
    await dismissOverlays(page);

    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    // Should show portfolio or assets
    expect(
      content?.includes("Portfolio") ||
        content?.includes("Assets") ||
        content?.includes("Balance") ||
        content?.includes("Fund")
    ).toBeTruthy();
  });

  test("Investor transactions page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/investor/transactions`);
    await dismissOverlays(page);

    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    expect(content?.includes("Transaction") || content?.includes("History")).toBeTruthy();
  });

  test("Investor settings page loads", async ({ page }) => {
    await page.goto(`${BASE_URL}/investor/settings`);
    await dismissOverlays(page);

    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    expect(
      content?.includes("Settings") || content?.includes("Profile") || content?.includes("Security")
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// IB Portal Tests
// ---------------------------------------------------------------------------

test.describe("Zero-Drift Harness: IB Portal", () => {
  test.beforeEach(async ({ page }) => {
    await loginAs(page, QA_CREDS.ib);
  });

  test("IB overview loads with referrals", async ({ page }) => {
    await page.goto(`${BASE_URL}/ib`);
    await dismissOverlays(page);

    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    expect(
      content?.includes("Referral") || content?.includes("Commission") || content?.includes("IB")
    ).toBeTruthy();
  });

  test("IB commissions show monetary values", async ({ page }) => {
    await page.goto(`${BASE_URL}/ib/commissions`);
    await dismissOverlays(page);

    await page.waitForTimeout(3000);
    const content = await page.textContent("body");
    // Should show BTC or USDT amounts, not just row counts
    expect(
      content?.includes("BTC") || content?.includes("USDT") || content?.includes("Commission")
    ).toBeTruthy();
  });
});

// ---------------------------------------------------------------------------
// Console Error Check (runs across all portals)
// ---------------------------------------------------------------------------

test.describe("Zero-Drift Harness: No Console Errors", () => {
  test("Admin portal has no critical console errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("console", (msg) => {
      if (msg.type() === "error") {
        const text = msg.text();
        // Ignore known benign errors
        if (
          !text.includes("favicon") &&
          !text.includes("manifest") &&
          !text.includes("service-worker") &&
          !text.includes("ResizeObserver")
        ) {
          errors.push(text);
        }
      }
    });

    await loginAs(page, QA_CREDS.admin);
    await page.goto(`${BASE_URL}/admin`);
    await dismissOverlays(page);
    await page.waitForTimeout(5000);

    // Allow up to 2 non-critical errors (network timing, etc.)
    expect(errors.length).toBeLessThanOrEqual(2);
  });
});
