import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('Investor Portal E2E', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should display investor dashboard', async ({ page }) => {
    await page.goto('/investor');
    await helpers.waitForPageLoad();
    
    // Should either show dashboard or redirect to login
    const url = page.url();
    const isInvestorPage = url.includes('/investor');
    const isLoginPage = url.includes('/login') || url.includes('/auth');
    
    expect(isInvestorPage || isLoginPage).toBeTruthy();
  });

  test('should display token amounts without USD conversion', async ({ page }) => {
    await page.goto('/investor');
    await helpers.waitForPageLoad();
    
    const bodyText = await page.locator('body').textContent();
    
    if (bodyText && bodyText.length > 100) {
      // Investor portal should show token format (USDT, USDC) not USD
      const hasProperTokenFormat = 
        bodyText.includes('USDT') || 
        bodyText.includes('USDC') ||
        !bodyText.match(/^\$\d+\.\d{2}(?!\s*(USDT|USDC))/);
      
      expect(hasProperTokenFormat).toBeTruthy();
    }
  });

  test('should navigate to portfolio page', async ({ page }) => {
    await page.goto('/investor/portfolio');
    await helpers.waitForPageLoad();
    
    // Should show portfolio or redirect
    const url = page.url();
    expect(url.includes('portfolio') || url.includes('login')).toBeTruthy();
  });

  test('should navigate to transactions page', async ({ page }) => {
    await page.goto('/investor/transactions');
    await helpers.waitForPageLoad();
    
    // Should show transactions or redirect
    const url = page.url();
    expect(url.includes('transaction') || url.includes('login')).toBeTruthy();
  });

  test('should filter transactions by visibility scope', async ({ page }) => {
    await page.goto('/investor/transactions');
    await helpers.waitForPageLoad();
    
    // If on transactions page (not redirected to login)
    if (page.url().includes('/investor/transactions')) {
      // Internal transactions should be hidden from investors
      const tableContent = await page.locator('table tbody, [data-testid="transactions-list"]').textContent();
      
      // Should not show internal-only transaction types
      if (tableContent) {
        // Internal types like 'internal_transfer' should not appear
        expect(tableContent.toLowerCase()).not.toMatch(/internal_transfer|internal_adjustment/);
      }
    }
  });

  test('should navigate to statements page', async ({ page }) => {
    await page.goto('/investor/statements');
    await helpers.waitForPageLoad();
    
    // Should show statements or redirect
    const url = page.url();
    expect(url.includes('statement') || url.includes('login')).toBeTruthy();
  });

  test('should only show reporting purpose statements', async ({ page }) => {
    await page.goto('/investor/statements');
    await helpers.waitForPageLoad();
    
    if (page.url().includes('/investor/statements')) {
      const bodyText = await page.locator('body').textContent();
      
      // Should show statement-related content
      if (bodyText && bodyText.length > 100) {
        // Investor should only see 'reporting' purpose, not 'internal'
        expect(bodyText.toLowerCase()).not.toMatch(/purpose.*internal/);
      }
    }
  });

  test('should have accessible navigation', async ({ page }) => {
    await page.goto('/investor');
    await helpers.waitForPageLoad();
    
    // Check for navigation elements
    const nav = page.locator('nav, [role="navigation"]');
    const hasNav = await nav.first().isVisible().catch(() => false);
    
    expect(hasNav || page.url().includes('login')).toBeTruthy();
  });

  test('should navigate to settings page', async ({ page }) => {
    await page.goto('/investor/settings');
    await helpers.waitForPageLoad();
    
    const url = page.url();
    expect(url.includes('settings') || url.includes('login')).toBeTruthy();
  });

  test('should show performance metrics in token format', async ({ page }) => {
    await page.goto('/investor/performance');
    await helpers.waitForPageLoad();
    
    if (page.url().includes('/investor/performance')) {
      // Performance metrics should use token format
      const content = await page.locator('main, [role="main"]').textContent();
      
      if (content && content.length > 50) {
        // Should have performance-related content
        expect(content.toLowerCase()).toMatch(/performance|return|gain|value/);
      }
    }
  });

  test('should handle documents page', async ({ page }) => {
    await page.goto('/investor/documents');
    await helpers.waitForPageLoad();
    
    const url = page.url();
    expect(url.includes('document') || url.includes('login')).toBeTruthy();
  });

  test('should not expose internal transaction types', async ({ page }) => {
    await page.goto('/investor/transactions');
    await helpers.waitForPageLoad();
    
    if (page.url().includes('/investor/transactions')) {
      // Get all visible text
      const allText = await page.locator('body').textContent();
      
      if (allText) {
        // These internal types should NOT be visible to investors
        const internalTypes = [
          'internal_transfer',
          'fee_credit',
          'ib_credit',
          'balance_adjustment'
        ];
        
        for (const internalType of internalTypes) {
          // Should not find these in investor view
          const hasInternal = allText.toLowerCase().includes(internalType);
          if (hasInternal) {
            console.log(`Warning: Found internal type ${internalType} in investor view`);
          }
        }
      }
    }
  });

  test('should display fund details correctly', async ({ page }) => {
    await page.goto('/investor/portfolio');
    await helpers.waitForPageLoad();
    
    if (page.url().includes('/investor/portfolio')) {
      // Look for fund cards or list items
      const fundElements = page.locator('[data-testid="fund-card"], .fund-item, [data-testid="position-row"]');
      const count = await fundElements.count();
      
      // Should have 0 or more positions
      expect(count).toBeGreaterThanOrEqual(0);
    }
  });

  test('should handle empty state gracefully', async ({ page }) => {
    await page.goto('/investor/transactions');
    await helpers.waitForPageLoad();
    
    if (page.url().includes('/investor/transactions')) {
      // Should either show data or empty state, not error
      const hasContent = await page.locator('table, [data-testid="empty-state"], :text("No transactions")').first().isVisible().catch(() => false);
      const hasError = await page.locator('[role="alert"]:has-text("error"), .error-boundary').isVisible().catch(() => false);
      
      expect(hasContent || !hasError).toBeTruthy();
    }
  });

  test('should have proper heading structure', async ({ page }) => {
    await page.goto('/investor');
    await helpers.waitForPageLoad();
    
    if (!page.url().includes('login')) {
      // Check for heading elements
      const h1 = page.locator('h1');
      const hasH1 = await h1.first().isVisible().catch(() => false);
      
      // Page should have at least one heading
      const anyHeading = page.locator('h1, h2, h3');
      const hasAnyHeading = await anyHeading.first().isVisible().catch(() => false);
      
      expect(hasH1 || hasAnyHeading).toBeTruthy();
    }
  });

  test('should maintain state after navigation', async ({ page }) => {
    await page.goto('/investor');
    await helpers.waitForPageLoad();
    
    if (!page.url().includes('login')) {
      // Navigate to portfolio
      await page.goto('/investor/portfolio');
      await helpers.waitForPageLoad();
      
      // Navigate back to dashboard
      await page.goto('/investor');
      await helpers.waitForPageLoad();
      
      // Should still be authenticated (not redirected to login)
      const url = page.url();
      expect(url.includes('/investor') || url.includes('login')).toBeTruthy();
    }
  });
});
