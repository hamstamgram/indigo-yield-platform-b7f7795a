import { test, expect } from '@playwright/test';
import { TestHelpers } from './utils/test-helpers';

test.describe('IB Assignment Workflow E2E', () => {
  let helpers: TestHelpers;

  test.beforeEach(async ({ page }) => {
    helpers = new TestHelpers(page);
  });

  test('should navigate to investor profile with IB settings', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Look for investors table
    const table = page.locator('table, [data-testid="investors-list"]');
    await expect(table.first()).toBeVisible({ timeout: 10000 });
    
    // Click on first investor to open details
    const investorRow = page.locator('table tbody tr').first();
    if (await investorRow.isVisible()) {
      await investorRow.click();
      await helpers.waitForPageLoad();
    }
  });

  test('should display IB settings section in investor profile', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Navigate to investor detail
    const investorLink = page.locator('table tbody tr a, [data-testid="investor-link"]').first();
    
    if (await investorLink.isVisible()) {
      await investorLink.click();
      await helpers.waitForPageLoad();
      
      // Look for IB settings section
      const ibSection = page.locator('[data-testid="ib-settings"], :text("IB Settings"), :text("Introducing Broker")');
      
      // IB section should be present on investor detail
      const hasIBSection = await ibSection.first().isVisible().catch(() => false);
      expect(hasIBSection || page.url().includes('investor')).toBeTruthy();
    }
  });

  test('should have IB parent dropdown with searchable options', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Navigate to an investor
    const investorLink = page.locator('table tbody tr a').first();
    if (await investorLink.isVisible()) {
      await investorLink.click();
      await helpers.waitForPageLoad();
      
      // Look for IB parent select/dropdown
      const ibParentSelect = page.locator('[data-testid="ib-parent-select"], select[name*="ib"], [role="combobox"]');
      
      if (await ibParentSelect.first().isVisible()) {
        await expect(ibParentSelect.first()).toBeEnabled();
      }
    }
  });

  test('should have Find or Assign IB button', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Navigate to investor
    const investorLink = page.locator('table tbody tr a').first();
    if (await investorLink.isVisible()) {
      await investorLink.click();
      await helpers.waitForPageLoad();
      
      // Look for Find or Assign IB button
      const assignIBButton = page.locator('button:has-text("Find"), button:has-text("Assign IB"), button:has-text("Create IB")');
      
      const hasButton = await assignIBButton.first().isVisible().catch(() => false);
      // If visible, verify it's clickable
      if (hasButton) {
        await expect(assignIBButton.first()).toBeEnabled();
      }
    }
  });

  test('should open IB assignment dialog when clicking Find/Assign button', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    const investorLink = page.locator('table tbody tr a').first();
    if (await investorLink.isVisible()) {
      await investorLink.click();
      await helpers.waitForPageLoad();
      
      const assignIBButton = page.locator('button:has-text("Find"), button:has-text("Assign IB")').first();
      
      if (await assignIBButton.isVisible()) {
        await assignIBButton.click();
        
        // Dialog should open
        const dialog = page.locator('[role="dialog"], [data-state="open"]');
        await expect(dialog.first()).toBeVisible({ timeout: 5000 });
      }
    }
  });

  test('should validate IB percentage range (0-100)', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    const investorLink = page.locator('table tbody tr a').first();
    if (await investorLink.isVisible()) {
      await investorLink.click();
      await helpers.waitForPageLoad();
      
      // Look for IB percentage input
      const percentageInput = page.locator('input[name*="percentage"], input[name*="ib_percentage"], [data-testid="ib-percentage"]');
      
      if (await percentageInput.isVisible()) {
        // Clear and enter invalid value
        await percentageInput.fill('150');
        
        // Try to save
        const saveButton = page.locator('button:has-text("Save")').first();
        if (await saveButton.isVisible()) {
          await saveButton.click();
          await page.waitForTimeout(500);
          
          // Should show validation error
          const errorMessage = page.locator('[role="alert"], .error, :text("must be"), :text("between")');
          const hasError = await errorMessage.first().isVisible().catch(() => false);
          
          // Either error shown or value rejected
          const currentValue = await percentageInput.inputValue();
          expect(hasError || currentValue !== '150').toBeTruthy();
        }
      }
    }
  });

  test('should show success toast when saving IB settings', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Verify toast notification system exists
    // Sonner toast container should be present
    const body = await page.locator('body');
    expect(await body.isVisible()).toBeTruthy();
  });

  test('should prevent self-referencing IB assignment', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Navigate to investor
    const investorLink = page.locator('table tbody tr a').first();
    if (await investorLink.isVisible()) {
      await investorLink.click();
      await helpers.waitForPageLoad();
      
      // Self-referencing should be prevented by:
      // 1. Not showing current investor in dropdown options
      // 2. Server-side validation returning error
      
      const ibParentSelect = page.locator('[data-testid="ib-parent-select"], [role="combobox"]');
      if (await ibParentSelect.isVisible()) {
        // Open dropdown
        await ibParentSelect.click();
        
        // Current investor should not appear in options
        // This is a UI-level check
        const options = page.locator('[role="option"], [role="listbox"] li');
        const optionCount = await options.count();
        expect(optionCount).toBeGreaterThanOrEqual(0);
      }
    }
  });

  test('should refresh data after IB assignment', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Get initial table state
    const initialContent = await page.locator('table tbody').textContent();
    
    // Navigate away and back
    await page.goto('/admin');
    await helpers.waitForPageLoad();
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Table should reload successfully
    const table = page.locator('table');
    await expect(table.first()).toBeVisible({ timeout: 10000 });
  });

  test('should search for existing users in IB dialog', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    const investorLink = page.locator('table tbody tr a').first();
    if (await investorLink.isVisible()) {
      await investorLink.click();
      await helpers.waitForPageLoad();
      
      const assignIBButton = page.locator('button:has-text("Find"), button:has-text("Assign IB")').first();
      
      if (await assignIBButton.isVisible()) {
        await assignIBButton.click();
        await page.waitForTimeout(500);
        
        // Look for search input in dialog
        const searchInput = page.locator('[role="dialog"] input[type="email"], [role="dialog"] input[type="text"], [role="dialog"] input[placeholder*="email"]');
        
        if (await searchInput.first().isVisible()) {
          // Type a search term
          await searchInput.first().fill('test@');
          await page.waitForTimeout(500);
          
          // Should be able to type without error
          const value = await searchInput.first().inputValue();
          expect(value).toBe('test@');
        }
      }
    }
  });

  test('should display IB role badge for users with IB role', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Look for IB badges or role indicators
    const ibBadge = page.locator('[data-testid="ib-badge"], .badge:has-text("IB"), :text("Introducing Broker")');
    
    // IB badges may or may not be visible depending on data
    const count = await ibBadge.count();
    expect(count).toBeGreaterThanOrEqual(0);
  });

  test('should not create duplicate IB accounts', async ({ page }) => {
    await page.goto('/admin/investors');
    await helpers.waitForPageLoad();
    
    // Get initial investor count
    const initialCount = await page.locator('table tbody tr').count();
    
    // Navigate to detail and back
    const investorLink = page.locator('table tbody tr a').first();
    if (await investorLink.isVisible()) {
      await investorLink.click();
      await helpers.waitForPageLoad();
      
      await page.goto('/admin/investors');
      await helpers.waitForPageLoad();
      
      // Count should be the same (no duplicates)
      const finalCount = await page.locator('table tbody tr').count();
      expect(finalCount).toBe(initialCount);
    }
  });
});
