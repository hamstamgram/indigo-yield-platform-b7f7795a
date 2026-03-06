import { test, expect, Page } from "@playwright/test";

const BASE_URL = process.env.BASE_URL || "http://localhost:8080";
const ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || "qa.admin@indigo.fund";
const ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || "TestAdmin2026!";
const INVESTOR_EMAIL = process.env.TEST_INVESTOR_EMAIL || "alice@test.indigo.com";
const INVESTOR_PASSWORD = "Alice!Investor2026#Secure";

async function login(page: Page, email: string, password: string) {
  await page.goto(`${BASE_URL}/login`);
  await page.waitForLoadState("networkidle");

  await page.fill('input[type="email"], input[name="email"]', email);
  await page.fill('input[type="password"], input[name="password"]', password);
  await page.click('button[type="submit"]');

  await page.waitForURL(/\/(dashboard|admin|investor)/, { timeout: 15000 });
}

test.describe("Auth and Roles (Security & Access)", () => {
  test.describe.configure({ mode: "serial" });

  let adminPage: Page;
  let investorPage: Page;

  // Unique email for this test run to avoid unique constraint errors
  const NEW_INVESTOR_EMAIL = `new_inv_${Date.now()}@test.indigo.com`;

  test.beforeAll(async ({ browser }) => {
    const adminContext = await browser.newContext();
    adminPage = await adminContext.newPage();

    const investorContext = await browser.newContext();
    investorPage = await investorContext.newPage();
  });

  test.afterAll(async () => {
    await adminPage.close();
    await investorPage.close();
  });

  test("1. Admin Flow: Admin logs in, invites a new Investor email", async () => {
    await login(adminPage, ADMIN_EMAIL, ADMIN_PASSWORD);

    // Navigate to Investors
    await adminPage.goto(`${BASE_URL}/admin/investors`);
    await adminPage.waitForLoadState("networkidle");

    // Open Add Investor Wizard
    await adminPage.getByRole("button", { name: /Add Investor/i }).click();

    // Fill out profile step
    const modal = adminPage.getByRole("dialog");
    await modal.waitFor({ state: "visible" });
    await modal.locator('input[name="first_name"], input[placeholder="John"]').fill("Johnny");
    await modal.locator('input[name="last_name"], input[placeholder="Doe"]').fill("Test");
    await modal.getByPlaceholder("investor@example.com").fill(NEW_INVESTOR_EMAIL);

    // Need to hit Next/Continue through wizard steps
    const nextBtn = modal.getByRole("button", { name: /Next|Continue/i });
    while (await nextBtn.isVisible()) {
      await nextBtn.click();
      await adminPage.waitForTimeout(500); // transition
    }

    const inviteBtn = modal
      .locator("button")
      .filter({ hasText: /Complete|Onboarding|Create|Invite|Finish/i })
      .first();

    console.log("=== PRE-CLICK DOM DUMP ===");
    console.log(await modal.innerHTML());
    console.log("==========================");

    await inviteBtn.click();

    await expect(adminPage.getByText(/success|created|invited/i).first()).toBeVisible({
      timeout: 10000,
    });
  });

  test("2. Investor Flow: Password reset flow UI, successful login", async () => {
    // Test Reset Password UI Flow (just checking if it works since we can't intercept email)
    await investorPage.goto(`${BASE_URL}/login`);
    await investorPage.waitForLoadState("networkidle");

    const forgotPasswordLink = investorPage.getByText(/Forgot password/i);
    if (await forgotPasswordLink.isVisible()) {
      await forgotPasswordLink.click();
      await investorPage.fill('input[type="email"]', INVESTOR_EMAIL);
      await investorPage.getByRole("button", { name: /Reset|Send/i }).click();
      await expect(investorPage.getByText(/check your email|link sent/i).first()).toBeVisible({
        timeout: 5000,
      });
    }

    // Actually log in
    await login(investorPage, INVESTOR_EMAIL, INVESTOR_PASSWORD);
    await expect(investorPage).toHaveURL(/\/investor/);
  });

  test("3. RLS Guardrails: Investor attempts to access /admin via URL", async () => {
    // Investor is already logged in from previous test
    // Let's force navigation to admin path
    const response = await investorPage.goto(`${BASE_URL}/admin`);
    await investorPage.waitForLoadState("networkidle");

    // Verify the system either blocks with a 403, shows an Unauthorized message, or redirects back to /investor
    const appUrl = investorPage.url();
    const isRedirected = !appUrl.includes("/admin");

    const isUnauthorizedMessageVisible = await investorPage
      .getByText(/Unauthorized|Access Denied|Not Found/i)
      .isVisible();

    expect(isRedirected || isUnauthorizedMessageVisible).toBeTruthy();

    // Also explicitly check another admin sub-route
    await investorPage.goto(`${BASE_URL}/admin/transactions`);
    await investorPage.waitForLoadState("networkidle");
    expect(
      !investorPage.url().includes("/admin/transactions") ||
        (await investorPage.getByText(/Unauthorized|Access Denied|Not Found/i).isVisible())
    ).toBeTruthy();
  });
});
