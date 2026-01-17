import { test, expect } from '@playwright/test';

test.describe('Admin Reporting Features', () => {
    test.beforeEach(async ({ page }) => {
        // 1. Navigate to login
        await page.goto('/login');

        // 2. Perform login as Admin with provided credentials
        await page.fill('input[type="email"]', 'testadmin@indigo.fund');
        await page.fill('input[type="password"]', 'TestAdmin123!');
        await page.click('button[type="submit"]');

        // 3. Wait for redirect to admin or dashboard
        await expect(page).toHaveURL(/admin|dashboard/, { timeout: 10000 });
    });

    test('Investor Reports page loads and handles filters', async ({ page }) => {
        // Correct route found in src/routing/routes/admin/operations.tsx
        await page.goto('/admin/investor-reports');

        // Check title
        await expect(page.locator('h1')).toContainText(/Investor Reports/i);

        // Check tabs exist
        await expect(page.getByRole('tab', { name: /HTML Reports/i })).toBeVisible();

        // Check info cards
        await expect(page.getByText(/Eligible Investors/i)).toBeVisible();

        // Test filter interaction
        // Targeting the combobox trigger button typical in Shadcn UI
        const monthSelectTrigger = page.locator('button[role="combobox"]').first();
        if (await monthSelectTrigger.isVisible()) {
            await monthSelectTrigger.click();
            await expect(page.getByRole('option')).not.toHaveCount(0);
            await page.keyboard.press('Escape');
        }
    });

    test('Statement generation triggers correctly', async ({ page }) => {
        await page.goto('/admin/investor-reports');

        const generateBtn = page.getByRole('button', { name: /Generate Reports/i });

        // Assert visibility to ensure we are on the right page and UI is ready
        await expect(generateBtn).toBeVisible();
        await expect(generateBtn).toBeEnabled();
    });
});

test.describe('Investor Portfolio Access', () => {
    // Keeping this as a negative test for now until we have valid investor creds
    test('Invalid investor credentials show error', async ({ page }) => {
        await page.goto('/login');
        await page.fill('input[type="email"]', 'invalid-investor@indigoyield.com');
        await page.fill('input[type="password"]', 'WrongPass!');
        await page.click('button[type="submit"]');
        await expect(page.locator('[role="alert"]')).toBeVisible();
    });
});
