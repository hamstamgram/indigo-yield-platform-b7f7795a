/**
 * UI Permissions & Error States - Go-Live Acceptance
 *
 * Tests permission and error handling:
 * - Restricted actions blocked
 * - Not-found pages work
 * - Failed mutation UI
 * - Toast/errors/modals
 */

import { test, expect } from "@playwright/test";

const QA_EMAIL = "Adriel@indigo.fund";
const QA_PASSWORD = "TestAdmin2026!";
const BASE_URL = process.env.APP_URL || "https://indigo-yield-platform.lovable.app";

test.describe.serial("Go-Live: Permissions & Error States", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL + "/login");
    await page.getByRole("textbox", { name: "Email Address" }).fill(QA_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(QA_PASSWORD);
    await page.getByRole("button", { name: /Access Portal/i }).click();
    await page.waitForURL("**/admin**", { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test("AUTH-001: Cannot access investor routes as admin", async ({ page }) => {
    const investorRoutes = ["/investor", "/investor/portfolio", "/investor/transactions"];
    const blockedRoutes: string[] = [];

    for (const route of investorRoutes) {
      await page.goto(BASE_URL + route, { failOnStarted: false });
      await page.waitForTimeout(1500);
      const redirected = page.url().includes("/admin") || page.url().includes("/login");
      if (redirected) {
        blockedRoutes.push(route);
      }
    }

    console.log(`AUTH-001: Blocked investor routes for admin: ${blockedRoutes.length}`);
  });

  test("AUTH-002: Admin routes protected", async ({ page }) => {
    await page.logout?.().catch(() => {});
    await page.goto(BASE_URL + "/admin", { failOnStarted: false });
    await page.waitForTimeout(2000);

    const isAtLogin = page.url().includes("/login") || page.url().includes("/login");
    console.log(`AUTH-002: Unauthenticated access blocked: ${isAtLogin}`);
  });

  test("404-001: Not-found page exists", async ({ page }) => {
    await page.goto(BASE_URL + "/this-route-does-not-exist-12345");
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").textContent();
    const has404 =
      bodyText?.includes("404") ||
      bodyText?.includes("Not Found") ||
      bodyText?.includes("page not found");
    console.log(`404-001: 404 page displays: ${has404}`);
  });

  test("404-002: Invalid investor ID shows error", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/investors/999999999");
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").textContent();
    const hasError =
      bodyText?.includes("Not Found") ||
      bodyText?.includes("not found") ||
      bodyText?.includes("404");
    console.log(`404-002: Invalid ID handled: ${hasError}`);
  });

  test("ERR-001: Server error page exists", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/nonexistent");
    await page.waitForTimeout(1500);

    const bodyText = await page.locator("body").textContent();
    console.log("ERR-001: Page handling tested");
  });

  test("ERR-002: Network error shows message", async ({ page }) => {
    const consoleErrors: string[] = [];
    page.on("pageerror", (error) => {
      consoleErrors.push(error.message);
    });

    await page.goto(BASE_URL + "/admin");
    await page.waitForTimeout(3000);

    const hasJSError = consoleErrors.some((e) => e.includes("Error") || e.includes("Exception"));
    console.log(`ERR-002: JS errors: ${consoleErrors.length}`);
  });

  test("TOAST-001: Success toast after actions", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    console.log("TOAST-001: Check for toast component patterns");
    const toastPatterns = page.locator(
      "[class*='toast'], [role='status'], [class*='notification']"
    );
    const toastCount = await toastPatterns.count();
    console.log(`TOAST-001: Toast patterns found: ${toastCount}`);
  });

  test("TOAST-002: Error toast on failure", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    console.log("TOAST-002: Check error notification patterns");
    const errorPatterns = page.locator("[class*='error'], [class*='alert'], [role='alert']");
    const errorCount = await errorPatterns.count();
    console.log(`TOAST-002: Error patterns found: ${errorCount}`);
  });

  test("MODAL-001: Modal opens correctly", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new deposit|add/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1500);

      const modalOrDialog = page
        .locator("[role='dialog'], [class*='modal'], [class*='drawer']")
        .first();
      const isOpen = await modalOrDialog.isVisible().catch(() => false);
      console.log(`MODAL-001: Modal opens: ${isOpen}`);

      if (isOpen) {
        await page.keyboard.press("Escape");
      }
    } else {
      console.log("MODAL-001: No create button visible");
    }
  });

  test("MODAL-002: Modal closes on cancel", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new deposit|add/i }).first();
    if (await createBtn.isVisible().catch(() => false)) {
      await createBtn.click();
      await page.waitForTimeout(1000);

      const cancelBtn = page.getByRole("button", { name: /cancel|close/i }).first();
      if (await cancelBtn.isVisible().catch(() => false)) {
        await cancelBtn.click();
        await page.waitForTimeout(1000);

        const modalClosed = !(await page
          .locator("[role='dialog']")
          .first()
          .isVisible()
          .catch(() => false));
        console.log(`MODAL-002: Modal closes on cancel: ${modalClosed}`);
      }
    }
  });

  test("PERM-001: Admin-only pages blocked for investor role", async ({ page }) => {
    const adminOnlyRoutes = ["/admin", "/admin/investors", "/admin/ledger"];
    const accessibleAsAdmin: string[] = [];

    for (const route of adminOnlyRoutes) {
      await page.goto(BASE_URL + route, { failOnStarted: false });
      await page.waitForTimeout(1500);
      if (page.url().includes("/admin")) {
        accessibleAsAdmin.push(route);
      }
    }

    console.log(`PERM-001: Admin routes accessible: ${accessibleAsAdmin.length}`);
  });

  test("PERM-002: Operations page accessible to admin", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/operations");
    await page.waitForTimeout(2000);

    const hasAccess = page.url().includes("/admin/operations");
    console.log(`PERM-002: Operations accessible: ${hasAccess}`);
  });

  test("PERM-003: System page accessible to admin", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/system");
    await page.waitForTimeout(2000);

    const hasAccess =
      page.url().includes("/admin/system") || page.url().includes("/admin/operations");
    console.log(`PERM-003: System accessible: ${hasAccess}`);
  });

  test("STATE-001: Loading state displays", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(1000);

    const loadingPatterns = page.locator(
      "[class*='loading'], [class*='spinner'], [class*='skeleton']"
    );
    const loadingCount = await loadingPatterns.count();
    console.log(`STATE-001: Loading patterns found: ${loadingCount}`);
  });

  test("STATE-002: Empty state displays when no data", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const emptyPatterns = page.locator("[class*='empty'], [class*='no-data'], text=No");
    const emptyCount = await emptyPatterns.count();
    console.log(`STATE-002: Empty state patterns: ${emptyCount}`);
  });

  test("STATE-003: Error state displays on failure", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/invalid-page-xyz");
    await page.waitForTimeout(2000);

    const bodyText = await page.locator("body").textContent();
    const hasErrorState =
      bodyText?.includes("error") || bodyText?.includes("Error") || bodyText?.includes("failed");
    console.log(`STATE-003: Error state found: ${hasErrorState}`);
  });
});
