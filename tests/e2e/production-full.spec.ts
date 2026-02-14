import { test, expect } from "@playwright/test";

// Production Config
const ADMIN_EMAIL = "adriel@indigo.fund";
const ADMIN_PASSWORD = "TestAdmin2026!";
const BASE_URL = "https://indigo-yield-platform.lovable.app";

const TIMESTAMP = Date.now();
const INVESTOR_EMAIL = `automation.test.${TIMESTAMP}@indigo.fund`;

// Only run on chromium for speed
test.use({ browserName: "chromium" });

async function loginAsAdmin(page: any) {
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"], input[name="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"], input[name="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  await page.waitForURL(/\/(dashboard|admin)/, { timeout: 15000 });

  // Dismiss cookie banner if present
  const acceptBtn = page.locator('button:has-text("Accept All")');
  if (await acceptBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
    await acceptBtn.click();
    console.log("Cookie banner dismissed.");
  }
}

test.describe("Production Critical Path", () => {
  test("1. Admin Login + Dashboard Loads", async ({ page }) => {
    await loginAsAdmin(page);
    console.log("✅ Login OK. URL:", page.url());

    // Verify dashboard elements
    await expect(page.locator("text=Command Center")).toBeVisible({ timeout: 10000 });
    await expect(page.locator("text=Fund Financials")).toBeVisible({ timeout: 10000 });
    console.log("✅ Dashboard verified.");
  });

  test("2. Investors Page Loads", async ({ page }) => {
    await loginAsAdmin(page);

    // Direct navigation instead of clicking sidebar
    page.on("console", (msg) => console.log("BROWSER LOG:", msg.text()));
    page.on("request", (request) => console.log(`>> ${request.method()} ${request.url()}`));
    page.on("response", (response) => console.log(`<< ${response.status()} ${response.url()}`));
    await page.goto(`${BASE_URL}/admin/investors`);

    // Wait for page content
    await expect(page.locator('h1:has-text("Investors")')).toBeVisible({
      timeout: 30000,
    });
    await expect(page.locator("table")).toBeVisible({ timeout: 30000 });
    console.log("✅ Investors page loaded.");
  });

  test("3. Create Investor", async ({ page }) => {
    test.setTimeout(60000);
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/investors`);

    await expect(page.locator('h1:has-text("Investors")')).toBeVisible({
      timeout: 15000,
    });

    const addBtn = page.locator('button:has-text("Add Investor")');
    await expect(addBtn).toBeVisible({ timeout: 10000 });
    await addBtn.click();

    // Fill dialog
    const dialog = page.locator('div[role="dialog"]');
    await expect(dialog).toBeVisible({ timeout: 10000 });

    await dialog.locator('input[name="email"]').fill(INVESTOR_EMAIL);
    await dialog.locator('input[name="firstName"]').fill("Auto");
    await dialog.locator('input[name="lastName"]').fill("TestUser");

    // Submit
    await dialog.locator('button[type="submit"]').click();

    // Wait for dialog to close (success)
    await expect(dialog).toBeHidden({ timeout: 15000 });
    console.log("✅ Investor created:", INVESTOR_EMAIL);
  });

  test("4. Transactions Page Loads", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/transactions`);

    await page.waitForSelector("table", { timeout: 15000 });
    console.log("✅ Transactions page loaded.");
  });

  test("5. Reports Page Loads", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/reports`);

    // Flexible check
    await page.waitForSelector("h1, h2", { timeout: 15000 });
    console.log("✅ Reports page loaded. URL:", page.url());
  });

  test("6. Yields Page Loads", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/yields`);

    await page.waitForSelector("h1, h2, table", { timeout: 15000 });
    console.log("✅ Yields page loaded. URL:", page.url());
  });

  test("7. Withdrawal Requests Page Loads", async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/withdrawals`);

    await page.waitForSelector("h1, h2, table", { timeout: 15000 });
    console.log("✅ Withdrawals page loaded. URL:", page.url());
  });
});
