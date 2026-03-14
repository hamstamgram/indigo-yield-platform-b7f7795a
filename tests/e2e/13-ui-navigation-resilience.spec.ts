import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const ADRIEL_EMAIL = process.env.TEST_ADMIN_EMAIL || "adriel@indigo.fund";
const ADRIEL_PASS = process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!";

test.describe("Platform Resilience: UI Navigation & Interaction Audit", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE_URL}/login`);
    await page.fill('input[type="email"]', ADRIEL_EMAIL);
    await page.fill('input[type="password"]', ADRIEL_PASS);
    await page.click('button[type="submit"]');
    await page.waitForSelector("text=Command Center", { timeout: 30000 });
  });

  test("Resilience: Admin Modules Navigation", async ({ page }) => {
    const modules = [
      { name: "Funds", path: "/admin/funds" },
      { name: "Investors", path: "/admin/investors" },
      { name: "IB / Partners", path: "/admin/ib-management" },
      { name: "Transactions", path: "/admin/transactions" },
    ];

    for (const mod of modules) {
      await page.goto(`${BASE_URL}${mod.path}`);
      await expect(page.locator("h1")).toBeVisible();
      const addBtn = page.getByRole("button", { name: /Add|New/i }).first();
      if (await addBtn.isVisible({ timeout: 3000 }).catch(() => false)) {
        // OK, button exists
      }
    }
  });

  test("Resilience: Search and Filter Logic", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/investors`);
    const searchInput = page.getByPlaceholder(/Search/i);
    await expect(searchInput).toBeVisible();
    await searchInput.fill("NonExistentUser123");
    await page.waitForTimeout(1000);
    // Table should show empty state or no results
    const rows = page.locator("table tr");
    // Count should be 1 (header only) if filters work correctly
    const count = await rows.count();
    expect(count).toBeLessThanOrEqual(1);
  });

  test("Resilience: Modal Forms Integrity", async ({ page }) => {
    // /admin/funds redirects to /admin - New Fund button is on dashboard
    await page.goto(`${BASE_URL}/admin`);
    await page.waitForSelector("text=Command Center", { timeout: 30000 });
    await page
      .getByRole("button", { name: /New Fund|Create Fund/i })
      .first()
      .waitFor({ state: "visible", timeout: 15000 });
    await page
      .getByRole("button", { name: /New Fund|Create Fund/i })
      .first()
      .click();
    const dialog = page.getByRole("dialog");
    await expect(dialog).toBeVisible();

    // Check core fields exist
    await expect(dialog.locator('input[name="name"]')).toBeVisible();
    await expect(dialog.locator('input[name="code"]')).toBeVisible();

    // Close modal — Radix dialogs may not close with Escape, use X button
    const closeBtn = page.locator('button:has(.lucide-x), button[aria-label="Close"]').first();
    if (await closeBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
      await closeBtn.click();
    } else {
      await page.keyboard.press("Escape");
    }
    await expect(dialog).toBeHidden({ timeout: 5000 });
  });

  test("Resilience: Settings & Audit Logs", async ({ page }) => {
    await page.goto(`${BASE_URL}/admin/settings`);
    await expect(
      page.getByText(/Admin Management|Settings|Profile|Security/i).first()
    ).toBeVisible();

    // Verify tabs if present
    const tabs = page.getByRole("tab");
    if ((await tabs.count()) > 0) {
      await tabs.first().click();
      await expect(tabs.first()).toHaveAttribute("aria-selected", "true");
    }
  });
});
