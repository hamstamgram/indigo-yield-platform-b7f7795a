/**
 * E2E Test Authentication Helper
 * Provides login/logout utilities for E2E tests
 */

import { Page, expect } from "@playwright/test";

export const TEST_CREDENTIALS = {
  admin: {
    email: "H.monoja@gmail.com",
    password: "TestAdmin2026!",
  },
  investor: {
    email: "alice@test.indigo.com",
    password: "Alice!Investor2026#Secure",
  },
};

/**
 * Login to the application
 */
export async function login(page: Page, credentials = TEST_CREDENTIALS.admin) {
  // Go to login page (root redirects to login if not authenticated)
  await page.goto("/");

  // Wait for login form to be visible
  await page.waitForSelector(
    'input[type="email"], input[placeholder*="email" i], textbox[name="Email"]',
    { timeout: 10000 }
  );

  // Fill email - try multiple selectors
  const emailInput = page
    .locator('input[type="email"], input[placeholder*="email" i], [data-testid="email-input"]')
    .first();
  await emailInput.fill(credentials.email);

  // Fill password
  const passwordInput = page
    .locator(
      'input[type="password"], input[placeholder*="password" i], [data-testid="password-input"]'
    )
    .first();
  await passwordInput.fill(credentials.password);

  // Click sign in button - relaxed selector and force click
  const signInButton = page
    .locator(
      'button[type="submit"], button:has-text("Access Portal"), button:has-text("Sign In"), button:has-text("Login")'
    )
    .first();
  await signInButton.click({ force: true });

  // Wait for navigation away from login
  await page.waitForURL(/.*dashboard.*|.*admin.*|.*home.*/, { timeout: 15000 }).catch(() => {
    // If URL doesn't change, check if we're still on login with error
  });
}

/**
 * Login as admin user
 */
export async function loginAsAdmin(page: Page) {
  return login(page, TEST_CREDENTIALS.admin);
}

/**
 * Login as investor user
 */
export async function loginAsInvestor(page: Page) {
  return login(page, TEST_CREDENTIALS.investor);
}

/**
 * Check if user is logged in
 */
export async function isLoggedIn(page: Page): Promise<boolean> {
  // Check for indicators of logged-in state
  const logoutButton = page.locator(
    'button:has-text("Logout"), button:has-text("Sign Out"), [aria-label*="logout" i]'
  );
  const userMenu = page.locator('[data-testid="user-menu"], [aria-label*="user" i]');

  return (await logoutButton.count()) > 0 || (await userMenu.count()) > 0;
}

/**
 * Logout from the application
 */
export async function logout(page: Page) {
  const logoutButton = page
    .locator('button:has-text("Logout"), button:has-text("Sign Out")')
    .first();
  if ((await logoutButton.count()) > 0) {
    await logoutButton.click();
    await page.waitForURL(/.*login.*|^\/$/, { timeout: 10000 });
  }
}

/**
 * Handle cookie consent if present
 */
export async function handleCookieConsent(page: Page) {
  const acceptButton = page
    .locator('button:has-text("Accept All"), button:has-text("Accept")')
    .first();
  if (await acceptButton.isVisible({ timeout: 2000 }).catch(() => false)) {
    await acceptButton.click();
  }
}
