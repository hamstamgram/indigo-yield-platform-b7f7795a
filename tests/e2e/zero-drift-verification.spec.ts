
import { test, expect } from '@playwright/test';
import { loginAsAdmin, loginAsInvestor } from './helpers/auth';

test.describe('Zero-Drift UI Verification', () => {
    test('Admin: Verify Transaction History & Integrity', async ({ page }) => {
        await loginAsAdmin(page);
        await page.goto('/admin/transactions');

        // Check for the verified transactions from Phase 3
        await expect(page.locator('text=Deposit')).toBeVisible();
        await expect(page.locator('text=Yield')).toBeVisible();
        await expect(page.locator('text=Withdrawal')).toBeVisible();

        // Check Data Integrity Panel if present
        const integrityPanel = page.locator('text=Data Integrity');
        if (await integrityPanel.isVisible()) {
            await expect(page.locator('text=Reconciliation OK')).toBeVisible();
        }
    });

    test('Investor: Verify Portfolio Balance Consistency', async ({ page }) => {
        await loginAsInvestor(page, 'testinvestor@indigo.fund', 'Indigo!Investor2026#Secure');
        await page.goto('/portfolio');

        // Verify balance is non-zero after Phase 3 flows
        const totalVested = page.locator('text=Total Vested');
        const balance = await page.locator('[data-testid="total-balance"]').innerText();
        expect(parseFloat(balance.replace(/[^0-9.]/g, ''))).toBeGreaterThan(0);
    });
});
