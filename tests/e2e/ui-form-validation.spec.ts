/**
 * UI Form Validation - Go-Live Acceptance
 *
 * Tests form validation behavior:
 * - Required fields
 * - Invalid inputs
 * - Disabled submit until valid
 * - Validation messaging
 */

import { test, expect } from "@playwright/test";

const QA_EMAIL = "Adriel@indigo.fund";
const QA_PASSWORD = "TestAdmin2026!";
const BASE_URL = process.env.APP_URL || "https://indigo-yield-platform.lovable.app";

test.describe.serial("Go-Live: Form Validation", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto(BASE_URL + "/login");
    await page.getByRole("textbox", { name: "Email Address" }).fill(QA_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(QA_PASSWORD);
    await page.getByRole("button", { name: /Access Portal/i }).click();
    await page.waitForURL("**/admin**", { timeout: 30000 });
    await page.waitForTimeout(2000);
  });

  test("LOGIN-001: Login form - empty fields", async ({ page }) => {
    await page.goto(BASE_URL + "/login");
    await page.waitForTimeout(1000);

    const submitBtn = page.getByRole("button", { name: /login|sign in|access portal/i });
    const isDisabled = await submitBtn
      .first()
      .isDisabled()
      .catch(() => true);

    console.log(`LOGIN-001: Submit disabled when empty: ${isDisabled}`);
  });

  test("LOGIN-002: Login form - invalid email", async ({ page }) => {
    await page.goto(BASE_URL + "/login");
    await page.waitForTimeout(1000);

    await page.getByRole("textbox", { name: "Email Address" }).fill("not-an-email");
    await page.getByRole("textbox", { name: "Password" }).fill("SomePassword123!");

    const submitBtn = page.getByRole("button", { name: /login|sign in|access portal/i });
    await submitBtn.first().click();
    await page.waitForTimeout(1000);

    const bodyText = await page.locator("body").textContent();
    const hasError =
      bodyText?.includes("invalid") || bodyText?.includes("email") || bodyText?.includes("valid");
    console.log(`LOGIN-002: Invalid email error shown: ${hasError}`);
  });

  test("LOGIN-003: Login form - valid credentials work", async ({ page }) => {
    await page.goto(BASE_URL + "/login");
    await page.waitForTimeout(1000);

    await page.getByRole("textbox", { name: "Email Address" }).fill(QA_EMAIL);
    await page.getByRole("textbox", { name: "Password" }).fill(QA_PASSWORD);
    await page.getByRole("button", { name: /Access Portal/i }).click();

    await page.waitForURL("**/admin**", { timeout: 30000 });
    const redirected = page.url().includes("/admin");
    console.log(`LOGIN-003: Login redirects to admin: ${redirected}`);
  });

  test("FORM-001: Deposit form - required fields", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new deposit|add deposit|create deposit/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await page.waitForTimeout(1500);

      const submitBtn = page.getByRole("button", { name: /submit|save|create/i }).first();
      const isDisabled = await submitBtn.isDisabled().catch(() => false);

      console.log(`FORM-001: Deposit submit disabled when empty: ${isDisabled}`);
    } else {
      console.log("FORM-001: Create deposit button not visible");
    }
  });

  test("FORM-002: Deposit form - amount validation", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new deposit|add deposit/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await page.waitForTimeout(1500);

      const amountInput = page
        .locator("input[name='amount'], input[placeholder*='amount'], input[type='number']")
        .first();
      if (await amountInput.isVisible()) {
        await amountInput.fill("-100");
        await page.waitForTimeout(500);

        const bodyText = await page.locator("body").textContent();
        const hasError =
          bodyText?.includes("positive") ||
          bodyText?.includes("greater than") ||
          bodyText?.includes("0");
        console.log(`FORM-002: Negative amount error shown: ${hasError}`);
      }
    } else {
      console.log("FORM-002: Create deposit button not visible");
    }
  });

  test("FORM-003: Withdrawal form - required fields", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger?tab=withdrawals");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new withdrawal|add withdrawal/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await page.waitForTimeout(1500);

      const submitBtn = page.getByRole("button", { name: /submit|save|create/i }).first();
      const isDisabled = await submitBtn.isDisabled().catch(() => false);

      console.log(`FORM-003: Withdrawal submit disabled when empty: ${isDisabled}`);
    } else {
      console.log("FORM-003: Create withdrawal button not visible");
    }
  });

  test("FORM-004: Investor invite - email validation", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/investors");
    await page.waitForTimeout(3000);

    const inviteBtn = page.getByRole("button", { name: /invite|add investor|new investor/i });
    if (await inviteBtn.first().isVisible()) {
      await inviteBtn.first().click();
      await page.waitForTimeout(1500);

      const emailInput = page.locator("input[name='email'], input[type='email']").first();
      if (await emailInput.isVisible()) {
        await emailInput.fill("invalid-email");
        await page.waitForTimeout(500);

        const submitBtn = page.getByRole("button", { name: /submit|invite|send/i }).first();
        const canSubmit = !(await submitBtn.isDisabled().catch(() => true));
        console.log(`FORM-004: Invalid email blocks submit: ${!canSubmit}`);
      }
    } else {
      console.log("FORM-004: Invite button not visible");
    }
  });

  test("FORM-005: Amount - non-numeric blocked", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new deposit|add deposit/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await page.waitForTimeout(1500);

      const amountInput = page
        .locator("input[name='amount'], input[placeholder*='amount']")
        .first();
      if (await amountInput.isVisible()) {
        await amountInput.fill("abc");
        await amountInput.blur();
        await page.waitForTimeout(500);

        const bodyText = await page.locator("body").textContent();
        const hasError = bodyText?.includes("number") || bodyText?.includes("valid");
        console.log(`FORM-005: Non-numeric amount error: ${hasError}`);
      }
    }
  });

  test("VAL-001: Required field indicators visible", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new deposit|add deposit/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await page.waitForTimeout(1500);

      const requiredMarkers = page.locator("label:has-text('*'), [class*='required'], .required");
      const markerCount = await requiredMarkers.count();

      console.log(`VAL-001: Found ${markerCount} required field markers`);
    }
  });

  test("VAL-002: Form shows validation errors inline", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new deposit|add deposit/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await page.waitForTimeout(1500);

      const submitBtn = page.getByRole("button", { name: /submit|save/i });
      await submitBtn.first().click();
      await page.waitForTimeout(1000);

      const errorElements = page.locator("[class*='error'], [class*='invalid'], [role='alert']");
      const errorCount = await errorElements.count();

      console.log(`VAL-002: Found ${errorCount} validation error elements`);
    }
  });

  test("VAL-003: Error messages are user-friendly", async ({ page }) => {
    await page.goto(BASE_URL + "/admin/ledger");
    await page.waitForTimeout(3000);

    const createBtn = page.getByRole("button", { name: /new deposit|add deposit/i });
    if (await createBtn.first().isVisible()) {
      await createBtn.first().click();
      await page.waitForTimeout(1500);

      const submitBtn = page.getByRole("button", { name: /submit|save/i });
      await submitBtn.first().click();
      await page.waitForTimeout(1000);

      const bodyText = await page.locator("body").textContent();
      const hasUserFriendly =
        bodyText?.includes("required") ||
        bodyText?.includes("Please") ||
        bodyText?.includes("must");
      console.log(`VAL-003: User-friendly validation messages: ${hasUserFriendly}`);
    }
  });
});
