import { test, expect, type Page } from '@playwright/test';
import * as fs from 'fs';

// Get base URL from environment or preview file
const getBaseUrl = () => {
  if (process.env.PREVIEW_URL) {
    return process.env.PREVIEW_URL;
  }
  
  try {
    const previewUrl = fs.readFileSync('.preview-url', 'utf8').trim();
    return previewUrl;
  } catch {
    return 'http://localhost:5173'; // Default dev server
  }
};

const BASE_URL = getBaseUrl();

// Auth credentials from environment
const ADMIN_EMAIL = process.env.PLAYWRIGHT_ADMIN_EMAIL;
const ADMIN_PASSWORD = process.env.PLAYWRIGHT_ADMIN_PASSWORD;
const LP_EMAIL = process.env.PLAYWRIGHT_LP_EMAIL;
const LP_PASSWORD = process.env.PLAYWRIGHT_LP_PASSWORD;

// Helper function to login as admin
async function loginAsAdmin(page: Page) {
  if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
    throw new Error('Admin credentials not provided in environment variables');
  }
  
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', ADMIN_EMAIL);
  await page.fill('input[type="password"]', ADMIN_PASSWORD);
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForURL(/\/admin|\/dashboard/, { timeout: 10000 });
}

// Helper function to login as LP
async function loginAsLP(page: Page) {
  if (!LP_EMAIL || !LP_PASSWORD) {
    throw new Error('LP credentials not provided in environment variables');
  }
  
  await page.goto(`${BASE_URL}/login`);
  await page.fill('input[type="email"]', LP_EMAIL);
  await page.fill('input[type="password"]', LP_PASSWORD);
  await page.click('button[type="submit"]');
  
  // Wait for navigation after login
  await page.waitForURL(/\/dashboard/, { timeout: 10000 });
}

// Helper to check for console errors
function setupConsoleErrorCapture(page: Page) {
  const errors: string[] = [];
  
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      errors.push(msg.text());
    }
  });
  
  page.on('pageerror', (exception) => {
    errors.push(exception.message);
  });
  
  return errors;
}

test.describe('Admin Routes and Guards', () => {
  test.beforeEach(async ({ page }) => {
    // Skip tests if credentials are not provided
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      test.skip('Admin credentials not provided - skipping admin tests');
    }
  });

  test('admin can access admin dashboard', async ({ page }) => {
    const errors = setupConsoleErrorCapture(page);
    
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    
    // Check that admin dashboard loads
    await expect(page.locator('text=Admin Dashboard')).toBeVisible();
    await expect(page.locator('text=Total AUM')).toBeVisible();
    await expect(page.locator('text=Investors')).toBeVisible();
    await expect(page.locator('text=24h Interest')).toBeVisible();
    await expect(page.locator('text=Pending Withdrawals')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/admin-dashboard.png' });
    
    // Check for console errors
    expect(errors.filter(e => !e.includes('DevTools'))).toHaveLength(0);
  });

  test('admin can access yield settings', async ({ page }) => {
    const errors = setupConsoleErrorCapture(page);
    
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/yield-settings`);
    
    // Check that yield settings page loads
    await expect(page.locator('text=Yield Settings')).toBeVisible();
    await expect(page.locator('text=Configure yield rates')).toBeVisible();
    
    // Check that yield sources table is visible
    await expect(page.locator('table')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/admin-yield-settings.png' });
    
    // Check for console errors
    expect(errors.filter(e => !e.includes('DevTools'))).toHaveLength(0);
  });

  test('admin can access investors list', async ({ page }) => {
    const errors = setupConsoleErrorCapture(page);
    
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin/investors`);
    
    // Check that investors page loads
    await expect(page.locator('text=Investor Management')).toBeVisible();
    await expect(page.locator('text=All Investors')).toBeVisible();
    
    // Check that search functionality exists
    await expect(page.locator('input[placeholder*="Search"]')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/admin-investors.png' });
    
    // Check for console errors
    expect(errors.filter(e => !e.includes('DevTools'))).toHaveLength(0);
  });

  test('admin can access investor detail page', async ({ page }) => {
    const errors = setupConsoleErrorCapture(page);
    
    await loginAsAdmin(page);
    
    // Use a demo ID from our stubs
    await page.goto(`${BASE_URL}/admin/investors/inv-001`);
    
    // Check that investor detail page loads
    await expect(page.locator('text=Investor Details')).toBeVisible();
    await expect(page.locator('text=Total Principal')).toBeVisible();
    await expect(page.locator('text=Asset Positions')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/admin-investor-detail.png' });
    
    // Check for console errors
    expect(errors.filter(e => !e.includes('DevTools'))).toHaveLength(0);
  });

  test('legacy admin routes redirect correctly', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Test /admin-dashboard -> /admin redirect
    await page.goto(`${BASE_URL}/admin-dashboard`);
    await page.waitForURL(/\/admin$/, { timeout: 5000 });
    expect(page.url()).toBe(`${BASE_URL}/admin`);
    
    // Test /admin-investors -> /admin/investors redirect
    await page.goto(`${BASE_URL}/admin-investors`);
    await page.waitForURL(/\/admin\/investors$/, { timeout: 5000 });
    expect(page.url()).toBe(`${BASE_URL}/admin/investors`);
  });

  test('admin query tab redirects to yield settings', async ({ page }) => {
    await loginAsAdmin(page);
    
    // Test /admin?tab=yields -> /admin/yield-settings redirect
    await page.goto(`${BASE_URL}/admin?tab=yields`);
    await page.waitForURL(/\/admin\/yield-settings$/, { timeout: 5000 });
    expect(page.url()).toBe(`${BASE_URL}/admin/yield-settings`);
  });

  test('admin navigation works between pages', async ({ page }) => {
    await loginAsAdmin(page);
    await page.goto(`${BASE_URL}/admin`);
    
    // Navigate to investors via quick action button
    await page.click('text=Manage Investors');
    await page.waitForURL(/\/admin\/investors$/, { timeout: 5000 });
    await expect(page.locator('text=Investor Management')).toBeVisible();
    
    // Navigate to yield settings via quick action button
    await page.goto(`${BASE_URL}/admin`);
    await page.click('text=Configure Yields');
    await page.waitForURL(/\/admin\/yield-settings$/, { timeout: 5000 });
    await expect(page.locator('text=Yield Settings')).toBeVisible();
  });
});

test.describe('LP User Guards', () => {
  test.beforeEach(async ({ page }) => {
    // Skip tests if LP credentials are not provided
    if (!LP_EMAIL || !LP_PASSWORD) {
      test.skip('LP credentials not provided - skipping LP guard tests');
    }
  });

  test('LP user cannot access admin dashboard', async ({ page }) => {
    await loginAsLP(page);
    
    // Try to access admin dashboard directly
    await page.goto(`${BASE_URL}/admin`);
    
    // Should be redirected to LP dashboard or see access denied
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
    
    // Should not see admin content
    await expect(page.locator('text=Admin Dashboard')).not.toBeVisible();
    await expect(page.locator('text=Total AUM')).not.toBeVisible();
  });

  test('LP user cannot access yield settings', async ({ page }) => {
    await loginAsLP(page);
    
    // Try to access yield settings directly
    await page.goto(`${BASE_URL}/admin/yield-settings`);
    
    // Should be redirected to LP dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('LP user cannot access investors page', async ({ page }) => {
    await loginAsLP(page);
    
    // Try to access investors page directly
    await page.goto(`${BASE_URL}/admin/investors`);
    
    // Should be redirected to LP dashboard
    await page.waitForURL(/\/dashboard/, { timeout: 5000 });
    expect(page.url()).toContain('/dashboard');
  });

  test('LP user can access their own dashboard', async ({ page }) => {
    const errors = setupConsoleErrorCapture(page);
    
    await loginAsLP(page);
    await page.goto(`${BASE_URL}/dashboard`);
    
    // Should see LP dashboard content
    await expect(page.locator('text=Portfolio')).toBeVisible();
    
    // Take screenshot
    await page.screenshot({ path: 'tests/screenshots/lp-dashboard.png' });
    
    // Check for console errors
    expect(errors.filter(e => !e.includes('DevTools'))).toHaveLength(0);
  });
});

test.describe('Route Structure', () => {
  test('admin routes are properly structured', async ({ page }) => {
    if (!ADMIN_EMAIL || !ADMIN_PASSWORD) {
      test.skip('Admin credentials not provided');
    }
    
    await loginAsAdmin(page);
    
    // Test each admin route is accessible and returns correct content
    const routes = [
      { path: '/admin', expectedText: 'Admin Dashboard' },
      { path: '/admin/yield-settings', expectedText: 'Yield Settings' },
      { path: '/admin/investors', expectedText: 'Investor Management' },
      { path: '/admin/investors/inv-001', expectedText: 'Investor Details' }
    ];
    
    for (const route of routes) {
      await page.goto(`${BASE_URL}${route.path}`);
      await expect(page.locator(`text=${route.expectedText}`)).toBeVisible({ timeout: 10000 });
    }
  });
});
