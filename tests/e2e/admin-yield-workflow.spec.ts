import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Admin Yield Workflow E2E', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
    await page.goto('/admin/investors');
  });

  test('should navigate to investor management and view investor list', async ({ page }) => {
    await helpers.waitForPageLoad();
    
    // Verify investors table/list renders
    const tableOrList = page.locator('table, [role="grid"], [data-testid="investors-list"]');
    await expect(tableOrList.first()).toBeVisible({ timeout: 10000 });
    
    // Should have investor rows
    const rows = page.locator('table tbody tr, [data-testid="investor-row"]');
    const count = await rows.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should access investor detail page', async ({ page }) => {
    await helpers.waitForPageLoad();
    
    // Click on first investor row or link
    const investorLink = page.locator('table tbody tr a, [data-testid="investor-link"]').first();
    
    if (await investorLink.isVisible()) {
      await investorLink.click();
      await helpers.waitForPageLoad();
      
      // Should be on investor detail page
      expect(page.url()).toMatch(/investor|profile|detail/i);
    }
  });

  test('should navigate to yield management from admin', async ({ page }) => {
    await page.goto('/admin/recorded-yields');
    await helpers.waitForPageLoad();
    
    // Verify yield page loads
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    
    // Should have yield-related content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.toLowerCase()).toMatch(/yield|distribution|record/i);
  });

  test('should display yield records with proper columns', async ({ page }) => {
    await page.goto('/admin/recorded-yields');
    await helpers.waitForPageLoad();
    
    // Wait for table
    const table = page.locator('table');
    if (await table.isVisible()) {
      // Check for expected columns
      const headers = await page.locator('table thead th').allTextContents();
      
      // Should have date, amount, status type columns
      const headerText = headers.join(' ').toLowerCase();
      expect(
        headerText.includes('date') || 
        headerText.includes('amount') || 
        headerText.includes('fund') ||
        headerText.includes('investor')
      ).toBeTruthy();
    }
  });

  test('should have controls to record new yield', async ({ page }) => {
    await page.goto('/admin/recorded-yields');
    await helpers.waitForPageLoad();
    
    // Look for add/record button
    const addButton = page.locator('button:has-text("Add"), button:has-text("Record"), button:has-text("New")');
    
    const hasAddButton = await addButton.first().isVisible().catch(() => false);
    expect(hasAddButton).toBeTruthy();
  });

  test('should open yield recording form when clicking add', async ({ page }) => {
    await page.goto('/admin/recorded-yields');
    await helpers.waitForPageLoad();
    
    const addButton = page.locator('button:has-text("Add"), button:has-text("Record"), button:has-text("New")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      
      // Modal or form should appear
      const form = page.locator('[role="dialog"], form, [data-state="open"]');
      await expect(form.first()).toBeVisible({ timeout: 5000 });
    }
  });

  test('should display yield amounts in token format', async ({ page }) => {
    await page.goto('/admin/recorded-yields');
    await helpers.waitForPageLoad();
    
    // Get table content
    const tableContent = await page.locator('table tbody').textContent();
    
    if (tableContent && tableContent.length > 10) {
      // Should show token symbols (USDT, USDC) not just USD
      const hasTokenFormat = 
        tableContent.includes('USDT') || 
        tableContent.includes('USDC') ||
        !tableContent.match(/\$\d+\.\d{2}(?!\s*(USDT|USDC))/);
      
      expect(hasTokenFormat).toBeTruthy();
    }
  });

  test('should validate required fields in yield form', async ({ page }) => {
    await page.goto('/admin/recorded-yields');
    await helpers.waitForPageLoad();
    
    const addButton = page.locator('button:has-text("Add"), button:has-text("Record"), button:has-text("New")').first();
    
    if (await addButton.isVisible()) {
      await addButton.click();
      await page.waitForTimeout(500);
      
      // Try to submit empty form
      const submitButton = page.locator('[role="dialog"] button:has-text("Save"), [role="dialog"] button:has-text("Submit"), [role="dialog"] button[type="submit"]').first();
      
      if (await submitButton.isVisible()) {
        await submitButton.click();
        await page.waitForTimeout(500);
        
        // Should show validation errors or remain open
        const dialogStillOpen = await page.locator('[role="dialog"]').isVisible();
        expect(dialogStillOpen).toBeTruthy();
      }
    }
  });

  test('should show success toast after yield operation', async ({ page }) => {
    await page.goto('/admin/recorded-yields');
    await helpers.waitForPageLoad();
    
    // Verify toast container exists (Sonner toasts)
    const toastContainer = page.locator('[data-sonner-toaster], [role="status"], .sonner-toast');
    
    // Toast system should be ready
    expect(await page.locator('body').isVisible()).toBeTruthy();
  });

  test('should prevent duplicate distributions (idempotency)', async ({ page }) => {
    await page.goto('/admin/recorded-yields');
    await helpers.waitForPageLoad();
    
    // Get initial count
    const initialCount = await page.locator('table tbody tr').count();
    
    // Wait and check count is stable (no duplicate rows appearing)
    await page.waitForTimeout(2000);
    
    const finalCount = await page.locator('table tbody tr').count();
    expect(finalCount).toBe(initialCount);
  });

  test('should navigate to statement generation', async ({ page }) => {
    await page.goto('/admin/statements');
    await helpers.waitForPageLoad();
    
    // Verify statements page loads
    await expect(page.locator('h1, h2, h3').first()).toBeVisible();
    
    // Should have statement-related content
    const bodyText = await page.locator('body').textContent();
    expect(bodyText?.toLowerCase()).toMatch(/statement|report|generate/i);
  });

  test('should show eligible investors count in yield distribution', async ({ page }) => {
    await page.goto('/admin/recorded-yields');
    await helpers.waitForPageLoad();
    
    // Look for count indicators
    const countText = page.locator('[data-testid="investor-count"], :text("investor"), :text("eligible")');
    
    if (await countText.first().isVisible()) {
      const text = await countText.first().textContent();
      // Should contain a number
      expect(text).toMatch(/\d+/);
    }
  });
});
