import { test, expect } from '@playwright/test';
import { loginAsAdmin } from './helpers/auth';

test.describe('Monitoring: System Integrity', () => {
    test.beforeEach(async ({ page }) => {
        await loginAsAdmin(page);
    });

    test('should display integrity checks in System Health dashboard', async ({ page }) => {
        await page.goto('/admin/system-health');

        // Verify Page Title
        await expect(page.getByRole('heading', { name: 'System Health' })).toBeVisible({ timeout: 10000 });

        // Verify Data Integrity Panel exists (Header within card)
        await expect(page.getByRole('heading', { name: 'Data Integrity' }).first()).toBeVisible();

        // Verify specific checks are listed - wait for data load
        await expect(page.getByText('Fund AUM Reconciliation')).toBeVisible({ timeout: 15000 });
        await expect(page.getByText('Position vs Ledger')).toBeVisible({ timeout: 15000 });

        // Check for overall status (Assuming 'All Clear' or a specific status badge)
        // We verify that the badge exists, content depends on system state.
        const statusBadge = page.locator('.bg-green-100, .bg-yellow-100, .bg-red-100').first();
        await expect(statusBadge).toBeVisible();
    });
});
