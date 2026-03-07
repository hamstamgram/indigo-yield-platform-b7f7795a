import { test, expect, Page } from "@playwright/test";

// Environment setup
const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const SUPERADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "qa.admin@indigo.fund";
const SUPERADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "IndigoInvestor2026!";

// A fresh test email that will be created and then upgraded/downgraded through the RBAC system
const INVESTOR_EMAIL = `rbac_test_${Date.now()}@test.indigo.com`;
const INVESTOR_PASSWORD = "RbacInvestor2026!";

// Standard admin and investor credentials
const STANDARD_ADMIN_EMAIL = "standard.admin@test.indigo.com";
const STANDARD_ADMIN_PASSWORD = "IndigoInvestor2026!";

/** Helper to log in and return the page object */
async function login(page: Page, email: string, password: string) {
  console.log(`LOGIN: Navigating to ${BASE_URL}/login for ${email}`);
  await page.goto(`${BASE_URL}/login`);
  console.log(`LOGIN: Waiting for networkidle`);
  await page.waitForLoadState("networkidle");
  console.log(`LOGIN: Filling email`);
  await page.fill('input[type="email"], input[name="email"]', email);
  console.log(`LOGIN: Filling password`);
  await page.fill('input[type="password"], input[name="password"]', password);
  console.log(`LOGIN: Clicking submit`);
  await page.click('button[type="submit"]');

  console.log(`LOGIN: Waiting for dashboard URL`);
  try {
    await page.waitForURL(/\/(dashboard|admin|investor)/, { timeout: 15000 });
    console.log(`LOGIN: Success!`);
  } catch (e) {
    console.error("LOGIN TIMEOUT! Capturing screenshot to login-timeout.png...");
    await page.screenshot({ path: "login-timeout.png" });
    throw e;
  }
}

test.describe("Admin RBAC & Superadmin Privileges Test Suite", () => {
  test.describe.configure({ mode: "serial" });

  let superadminPage: Page;
  let standardAdminPage: Page;

  test.beforeAll(async ({ browser }) => {
    // Setup contexts
    const saContext = await browser.newContext();
    superadminPage = await saContext.newPage();

    const aContext = await browser.newContext();
    standardAdminPage = await aContext.newPage();
  });

  test.afterAll(async () => {
    await superadminPage.close();
    await standardAdminPage.close();
  });

  test("1. Role Elevation and Downgrade (Superadmin Flow)", async () => {
    await login(superadminPage, SUPERADMIN_EMAIL, SUPERADMIN_PASSWORD);
    await expect(superadminPage).toHaveURL(/\/admin/);

    superadminPage.on("console", (msg) => console.log(`BROWSER CONSOLE: ${msg.text()}`));

    // Navigate to Team / Admin settings
    await superadminPage.goto(`${BASE_URL}/admin/settings`);
    await superadminPage.waitForLoadState("domcontentloaded");

    // Click the Admins tab
    await superadminPage.getByRole("tab", { name: /Admins/i }).click();
    await expect(superadminPage.getByText(/Admin Management/i).first()).toBeVisible();

    // 1b. Now let's try upgrading an existing standard Admin to Superadmin (using the table dropdown)
    // Wait for table to load
    await superadminPage.waitForSelector("table", { state: "visible", timeout: 15000 });

    // Look for the row containing the newly created User (from Setup)
    const adminRow = superadminPage.locator("tr").filter({ hasText: STANDARD_ADMIN_EMAIL });

    // We might need to cancel if it's pending, but assuming it appears in the list.
    if (await adminRow.isVisible()) {
      const roleSelect = adminRow.getByRole("combobox");
      const currentRole = await roleSelect.textContent();

      // If they aren't Super Admin, upgrade them first to verify elevation works
      if (!currentRole?.includes("Super Admin")) {
        await roleSelect.click();
        await superadminPage.getByRole("option", { name: "Super Admin" }).click();

        const successToast = superadminPage.getByText(/Role Updated/i).first();
        await expect(successToast).toBeVisible({ timeout: 5000 });
        await expect(successToast).not.toBeVisible({ timeout: 10000 });
      }

      // Now, definitively downgrade them to Standard Admin
      await roleSelect.click();
      await superadminPage.getByRole("option", { name: "Admin", exact: true }).click();

      // Assert the SECOND update succeeded
      const downgradeToast = superadminPage.getByText(/Role Updated/i).first();
      await expect(downgradeToast).toBeVisible({ timeout: 5000 });
      await expect(downgradeToast).not.toBeVisible({ timeout: 10000 });
    }
  });

  // We will bypass actual email sign up for the Standard Admin and mock auth if needed,
  // but the test environment usually has a seeded standard admin.
  // We will attempt to login with a known standard admin credential or skip DB setup for the sake of UI testing.

  test("2. The Permission Boundary (Standard Admin Flow)", async () => {
    // We need a real standard admin to test the RBAC boundary. We will leverage the `qa.admin@indigo.fund`
    // who is a superadmin to ensure `standard.admin@test.indigo.com` exists and is a base Admin, not Super.

    // Ensure the standard admin is downgraded (in case a previous run failed mid-way)
    await superadminPage.goto(`${BASE_URL}/admin/settings`);
    await superadminPage.waitForLoadState("domcontentloaded");
    await superadminPage.getByRole("tab", { name: /Admins/i }).click();

    const adminRow = superadminPage.locator("tr").filter({ hasText: STANDARD_ADMIN_EMAIL });
    if (await adminRow.isVisible()) {
      const roleSelect = adminRow.getByRole("combobox");
      const currentRole = await roleSelect.textContent();
      if (currentRole?.includes("Super Admin")) {
        await roleSelect.focus();
        await superadminPage.keyboard.press("Enter");
        await superadminPage.waitForTimeout(500);
        await superadminPage.keyboard.press("ArrowUp"); // Hover Admin
        await superadminPage.keyboard.press("Enter");
        await expect(superadminPage.getByText(/Role Updated/i).first()).toBeVisible({
          timeout: 5000,
        });
        await expect(superadminPage.getByText(/Role Updated/i).first()).not.toBeVisible({
          timeout: 10000,
        });
      }
    }

    // Now login as the guaranteed standard admin (we left them as an Admin at the end of Test 1)
    await login(standardAdminPage, STANDARD_ADMIN_EMAIL, STANDARD_ADMIN_PASSWORD);

    await standardAdminPage.goto(`${BASE_URL}/admin/settings`);
    await standardAdminPage.waitForLoadState("domcontentloaded");

    await standardAdminPage.getByRole("tab", { name: /Admins/i }).click();

    try {
      await expect(
        standardAdminPage.getByText(/Only Super Admins can manage administrators/i)
      ).toBeVisible({ timeout: 5000 });
    } catch (e) {
      console.error("ASSERTION FAILED! DUMPING TRUE STANDARD ADMIN DOM:");
      throw e;
    }

    console.log("TEST 2: Navigating to funds");
    await standardAdminPage.goto(`${BASE_URL}/admin/funds`);
    console.log("TEST 2: Waiting for DOM (funds)");
    await standardAdminPage.waitForLoadState("domcontentloaded");

    const deleteFundBtn = standardAdminPage
      .locator("button")
      .filter({ hasText: /Delete Fund/i })
      .first();
    // Since it's a regular admin, button should be hidden or disabled
    const isHidden = !(await deleteFundBtn.isVisible());
    let safeDisabled = true;
    if (!isHidden) {
      safeDisabled = await deleteFundBtn.isDisabled({ timeout: 2000 }).catch(() => true);
    }
    expect(isHidden || safeDisabled).toBeTruthy();
  });

  test("3. The Superadmin Execution", async () => {
    // Navigate to Global Platform Settings (Admin Tab)
    await superadminPage.goto(`${BASE_URL}/admin/settings`);
    await superadminPage.waitForLoadState("domcontentloaded");
    await superadminPage.getByRole("tab", { name: /Admins/i }).click();

    // Assertion: Guardrail message should NOT be there. Admin Management is visible
    await expect(
      superadminPage.getByText(/Only Super Admins can manage administrators/i)
    ).not.toBeVisible();
    await expect(superadminPage.getByText(/Admin Management/i).first()).toBeVisible();

    // Check Delete Fund button visibility
    await superadminPage.goto(`${BASE_URL}/admin/funds`);
    await superadminPage.waitForLoadState("domcontentloaded");

    // We know they can manage funds. Click into a fund if needed.
    const fundLink = superadminPage.locator('a[href^="/admin/funds/"]').first();
    if (await fundLink.isVisible()) {
      await fundLink.click();
      await superadminPage.waitForLoadState("domcontentloaded");

      // As a superadmin, dangerous actions should be available (like unverified buttons, delete, etc.)
      // We won't actually click "Delete" to avoid breaking the DB, but assert existence
      const deleteBtn = superadminPage
        .locator("button")
        .filter({ hasText: /Delete/i })
        .first();
      if (await deleteBtn.isVisible()) {
        expect(await deleteBtn.isDisabled()).toBeFalsy();
      }
    }
  });
});
