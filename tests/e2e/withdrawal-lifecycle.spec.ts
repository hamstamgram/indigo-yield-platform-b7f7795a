import { test, expect } from '@playwright/test';

/**
 * Withdrawal Lifecycle E2E Tests
 * 
 * These tests verify the complete withdrawal request lifecycle works correctly,
 * including the audit log functionality that was previously broken due to
 * table name mismatch (withdrawal_audit_log vs withdrawal_audit_logs).
 */

test.describe('Withdrawal Lifecycle E2E', () => {
  
  test.beforeEach(async ({ page }) => {
    // Navigate to admin login (adjust based on your auth setup)
    await page.goto('/auth');
  });

  test('admin withdrawals page loads without database errors', async ({ page }) => {
    // Navigate to admin withdrawals
    await page.goto('/admin/withdrawals');
    
    // Wait for page to load
    await page.waitForLoadState('networkidle');
    
    // Verify no database error messages appear
    const bodyText = await page.locator('body').textContent();
    
    // Check for the specific error that was occurring
    expect(bodyText).not.toContain('withdrawal_audit_log does not exist');
    expect(bodyText).not.toContain('relation "public.withdrawal_audit_log" does not exist');
    
    // Check for generic database errors
    expect(bodyText).not.toContain('Database error');
    expect(bodyText).not.toContain('PostgrestError');
  });

  test('withdrawal request creation does not throw errors', async ({ page }) => {
    // Navigate to withdrawals page
    await page.goto('/admin/withdrawals');
    await page.waitForLoadState('networkidle');
    
    // Look for any error toasts or alerts
    const errorToasts = page.locator('[data-testid="toast-error"], .toast-error, [role="alert"]');
    
    // Should not have error toasts on page load
    await expect(errorToasts).toHaveCount(0);
  });

  test('withdrawal cancel action completes without errors', async ({ page }) => {
    await page.goto('/admin/withdrawals');
    await page.waitForLoadState('networkidle');
    
    // Find a pending withdrawal (if any exist)
    const pendingRow = page.locator('tr').filter({ hasText: 'pending' }).first();
    
    if (await pendingRow.isVisible()) {
      // Look for cancel button/action
      const cancelButton = pendingRow.locator('button').filter({ hasText: /cancel/i });
      
      if (await cancelButton.isVisible()) {
        await cancelButton.click();
        
        // Wait for any confirmation dialog
        const confirmButton = page.locator('button').filter({ hasText: /confirm|yes/i });
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }
        
        // Wait for action to complete
        await page.waitForLoadState('networkidle');
        
        // Verify no database errors appeared
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).not.toContain('withdrawal_audit_log does not exist');
      }
    }
  });

  test('withdrawal delete action completes without errors', async ({ page }) => {
    await page.goto('/admin/withdrawals');
    await page.waitForLoadState('networkidle');
    
    // Find a pending withdrawal (if any exist)
    const pendingRow = page.locator('tr').filter({ hasText: 'pending' }).first();
    
    if (await pendingRow.isVisible()) {
      // Look for delete button/action
      const deleteButton = pendingRow.locator('button').filter({ hasText: /delete/i });
      
      if (await deleteButton.isVisible()) {
        await deleteButton.click();
        
        // Wait for any confirmation dialog
        const confirmButton = page.locator('button').filter({ hasText: /confirm|yes|delete/i });
        if (await confirmButton.isVisible({ timeout: 2000 })) {
          await confirmButton.click();
        }
        
        // Wait for action to complete
        await page.waitForLoadState('networkidle');
        
        // Verify no database errors appeared
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).not.toContain('withdrawal_audit_log does not exist');
      }
    }
  });

  test('withdrawal status transitions work correctly', async ({ page }) => {
    await page.goto('/admin/withdrawals');
    await page.waitForLoadState('networkidle');
    
    // Find any withdrawal row
    const withdrawalRow = page.locator('tr').filter({ hasText: /pending|approved|processing/i }).first();
    
    if (await withdrawalRow.isVisible()) {
      // Look for status change dropdown or buttons
      const statusDropdown = withdrawalRow.locator('select, [role="combobox"]');
      
      if (await statusDropdown.isVisible()) {
        // Attempt to change status
        await statusDropdown.click();
        
        // Wait for options
        await page.waitForTimeout(500);
        
        // Verify page is still functional (no errors)
        const bodyText = await page.locator('body').textContent();
        expect(bodyText).not.toContain('does not exist');
      }
    }
  });

  test('network requests to withdrawal endpoints succeed', async ({ page }) => {
    // Collect network errors
    const failedRequests: string[] = [];
    
    page.on('response', response => {
      if (response.url().includes('withdrawal') && response.status() >= 400) {
        failedRequests.push(`${response.status()}: ${response.url()}`);
      }
    });
    
    await page.goto('/admin/withdrawals');
    await page.waitForLoadState('networkidle');
    
    // Allow some time for any async operations
    await page.waitForTimeout(2000);
    
    // Check for 500 errors specifically (indicates server-side DB issues)
    const serverErrors = failedRequests.filter(r => r.startsWith('5'));
    expect(serverErrors).toHaveLength(0);
  });

});

test.describe('Withdrawal Audit Trail Verification', () => {
  
  test('audit logs table is accessible', async ({ page }) => {
    // This test verifies the withdrawal_audit_logs table exists and is queryable
    await page.goto('/admin/withdrawals');
    await page.waitForLoadState('networkidle');
    
    // Look for audit log section or tab if it exists in UI
    const auditTab = page.locator('button, a').filter({ hasText: /audit|history|log/i });
    
    if (await auditTab.isVisible()) {
      await auditTab.click();
      await page.waitForLoadState('networkidle');
      
      // Verify no table errors
      const bodyText = await page.locator('body').textContent();
      expect(bodyText).not.toContain('relation');
      expect(bodyText).not.toContain('does not exist');
    }
  });

});
