/**
 * Shared test utilities for fix verification E2E tests.
 * Extends existing auth helpers with banner dismissal and evidence capture.
 */

import { Page, expect } from "@playwright/test";

export const BASE_URL = process.env.PLAYWRIGHT_BASE_URL || "http://localhost:8081";

export const SUPER_ADMIN = {
  email: "adriel@indigo.fund",
  password: "TestAdmin2026!",
};

export const QA_ADMIN = {
  email: process.env.QA_ADMIN_EMAIL || "qa.admin@indigo.fund",
  password: process.env.QA_ADMIN_PASSWORD || "QaTest2026!",
};

export const QA_INVESTOR = {
  email: process.env.QA_INVESTOR_EMAIL || "qa.investor@indigo.fund",
  password: process.env.QA_INVESTOR_PASSWORD || "QaTest2026!",
};

/**
 * Dismiss cookie consent and PWA install banners (Lovable Cloud).
 */
export async function dismissBanners(page: Page) {
  // Cookie consent
  const acceptBtn = page.getByRole("button", { name: "Accept All" });
  if (await acceptBtn.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptBtn.click();
    await page.waitForTimeout(300);
  }
  // PWA install banner
  await page.evaluate(() => {
    document.querySelectorAll('[class*="fixed"]').forEach((el) => {
      if (el.textContent?.includes("Install")) (el as HTMLElement).remove();
    });
  });
}

/**
 * Shared login logic - fills credentials, submits, waits for redirect.
 */
async function performLogin(
  page: Page,
  email: string,
  password: string,
  expectedUrlPattern: RegExp
) {
  await page.goto("/");
  await dismissBanners(page);
  await page.waitForSelector('input[type="email"]', { timeout: 15000 });

  const emailInput = page.locator('input[type="email"]').first();
  await emailInput.fill(email);

  const passwordInput = page.locator('input[type="password"]').first();
  await passwordInput.fill(password);

  const submitBtn = page.locator('button[type="submit"], button:has-text("Access Portal")').first();
  await submitBtn.click({ force: true });

  // Wait for navigation away from login/auth pages
  await page.waitForURL(
    (url) => {
      const path = url.pathname;
      return !path.includes("/login") && path !== "/" && path.length > 1;
    },
    { timeout: 30000 }
  );

  // Then verify we landed on the expected area
  const currentUrl = page.url();
  if (!expectedUrlPattern.test(currentUrl)) {
    // Navigate explicitly if redirected elsewhere
    const target = expectedUrlPattern.source.includes("admin") ? "/admin" : "/investor";
    await page.goto(target);
    await page.waitForLoadState("domcontentloaded", { timeout: 10000 });
  }

  await dismissBanners(page);
}

/**
 * Login as super admin (adriel@indigo.fund) - needed for IB promote/settings.
 */
export async function loginAsSuperAdmin(page: Page) {
  await performLogin(page, SUPER_ADMIN.email, SUPER_ADMIN.password, /.*admin.*/);
}

/**
 * Login as QA admin.
 */
export async function loginAsAdmin(page: Page) {
  await performLogin(page, QA_ADMIN.email, QA_ADMIN.password, /.*admin.*/);
}

/**
 * Login as QA investor.
 */
export async function loginAsInvestor(page: Page) {
  await performLogin(page, QA_INVESTOR.email, QA_INVESTOR.password, /.*investor.*/);
}

/**
 * Take a named screenshot as evidence.
 */
export async function takeEvidence(page: Page, name: string) {
  await page.screenshot({
    path: `screenshots/fix-verification/${name}.png`,
    fullPage: false,
  });
}

/**
 * Wait for page to settle (network idle + no loading spinners).
 */
export async function waitForPageSettled(page: Page, timeout = 10000) {
  await page.waitForLoadState("networkidle", { timeout }).catch(() => {
    // Fallback: just wait for DOM content
  });
  // Wait for loading spinners to disappear
  const spinner = page.locator('[class*="animate-spin"], [class*="skeleton"]').first();
  if (await spinner.isVisible({ timeout: 1000 }).catch(() => false)) {
    await spinner.waitFor({ state: "hidden", timeout }).catch(() => {});
  }
}

/**
 * Navigate to a page and wait for it to settle.
 */
export async function navigateAndSettle(page: Page, path: string) {
  await page.goto(path);
  await dismissBanners(page);
  await waitForPageSettled(page);
}
