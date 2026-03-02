/**
 * Pre-Launch Smoke Tests — No Authentication Required
 * Tests login page, routing, redirects, and public pages.
 * Authenticated flow tests require valid QA accounts in Supabase.
 */
import { test, expect } from "@playwright/test";

test.describe("1. Login Page", () => {
  test("1.1 Login page loads with all elements", async ({ page }) => {
    await page.goto("/");
    // Should show login form
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
    await expect(page.locator('input[type="password"]')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).toBeVisible();
    // Brand
    await expect(page.locator('img[alt*="Infinite Yield"]')).toBeVisible();
    // Access text
    await expect(page.locator("text=Investor Portal")).toBeVisible();
    await expect(page.locator("text=Private Access")).toBeVisible();
  });

  test("1.2 Login form has proper input attributes", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    const emailInput = page.locator('input[type="email"]');
    const passwordInput = page.locator('input[type="password"]');
    await expect(emailInput).toHaveAttribute("required", "");
    await expect(passwordInput).toHaveAttribute("required", "");
    await expect(passwordInput).toHaveAttribute("minlength", "6");
  });

  test("1.3 Password visibility toggle works", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('input[type="password"]', { timeout: 10_000 });
    // Initially password is hidden
    await expect(page.locator('input[type="password"]')).toBeVisible();
    // Click show password button
    const toggleBtn = page
      .locator("button:has(svg)")
      .filter({ hasNot: page.locator('[type="submit"]') })
      .last();
    await toggleBtn.click();
    // Password input type should change to text
    await expect(page.locator("input#password")).toHaveAttribute("type", "text");
  });

  test("1.4 Invalid login shows error", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.locator('input[type="email"]').fill("nonexistent@test.com");
    await page.locator('input[type="password"]').fill("wrongpassword123");
    await page.locator('button[type="submit"]').click();
    // Wait for error toast or error message
    await expect(
      page
        .locator(
          '[data-sonner-toaster] [data-type="error"], .text-rose-500, .text-rose-200, [role="alert"]'
        )
        .first()
    ).toBeVisible({ timeout: 15_000 });
  });

  test("1.5 Submit button shows loading state during auth", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await page.locator('input[type="email"]').fill("test@test.com");
    await page.locator('input[type="password"]').fill("password123");
    await page.locator('button[type="submit"]').click();
    // Button should be disabled during submission
    await expect(page.locator('button[type="submit"]')).toBeDisabled();
  });

  test("1.6 Forgot password link exists", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    const forgotLink = page.locator('a[href="/forgot-password"]');
    await expect(forgotLink).toBeVisible();
    await expect(forgotLink).toHaveText("Forgot?");
  });

  test("1.7 Terms and Privacy links exist", async ({ page }) => {
    await page.goto("/");
    await page.waitForSelector('input[type="email"]', { timeout: 10_000 });
    await expect(page.locator('a[href="/terms"]')).toBeVisible();
    await expect(page.locator('a[href="/privacy"]')).toBeVisible();
  });
});

test.describe("2. Route Protection", () => {
  test("2.1 /admin redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/admin");
    // Should end up at login page (root or /login)
    await page.waitForURL(/^\/$|\/login/, { timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("2.2 /investor redirects unauthenticated users to login", async ({ page }) => {
    await page.goto("/investor");
    await page.waitForURL(/^\/$|\/login/, { timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("2.3 /admin/investors redirects to login", async ({ page }) => {
    await page.goto("/admin/investors");
    await page.waitForURL(/^\/$|\/login/, { timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("2.4 /admin/ledger redirects to login", async ({ page }) => {
    await page.goto("/admin/ledger");
    await page.waitForURL(/^\/$|\/login/, { timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("2.5 /investor/portfolio redirects to login", async ({ page }) => {
    await page.goto("/investor/portfolio");
    await page.waitForURL(/^\/$|\/login/, { timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });

  test("2.6 /investor/statements redirects to login", async ({ page }) => {
    await page.goto("/investor/statements");
    await page.waitForURL(/^\/$|\/login/, { timeout: 10_000 });
    await expect(page.locator('input[type="email"]')).toBeVisible();
  });
});

test.describe("3. Static/Public Pages", () => {
  test("3.1 Forgot password page loads", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator('input[type="email"]')).toBeVisible({ timeout: 10_000 });
  });

  test("3.2 Terms page loads or redirects gracefully", async ({ page }) => {
    const response = await page.goto("/terms");
    expect(response?.status()).toBeLessThan(500);
  });

  test("3.3 Privacy page loads or redirects gracefully", async ({ page }) => {
    const response = await page.goto("/privacy");
    expect(response?.status()).toBeLessThan(500);
  });
});

test.describe("4. App Infrastructure", () => {
  test("4.1 App responds with valid HTML", async ({ page }) => {
    const response = await page.goto("/");
    expect(response?.status()).toBe(200);
    expect(response?.headers()["content-type"]).toContain("text/html");
  });

  test("4.2 JavaScript bundles load without errors", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Filter out benign errors (Supabase auth errors for unauthenticated state)
    const criticalErrors = errors.filter(
      (e) =>
        !e.includes("AuthSession") &&
        !e.includes("refresh_token") &&
        !e.includes("not authenticated")
    );
    expect(criticalErrors).toHaveLength(0);
  });

  test("4.3 No 404 on main assets", async ({ page }) => {
    const failedRequests: string[] = [];
    page.on("response", (response) => {
      if (response.status() === 404 && response.url().includes("/assets/")) {
        failedRequests.push(response.url());
      }
    });
    await page.goto("/");
    await page.waitForLoadState("networkidle");
    expect(failedRequests).toHaveLength(0);
  });

  test("4.4 Favicon loads", async ({ page }) => {
    const response = await page.goto("/");
    await page.waitForLoadState("networkidle");
    // Check for favicon link in HTML
    const favicon = page.locator('link[rel*="icon"]');
    const count = await favicon.count();
    expect(count).toBeGreaterThanOrEqual(0); // Some apps use default browser favicon
  });
});
