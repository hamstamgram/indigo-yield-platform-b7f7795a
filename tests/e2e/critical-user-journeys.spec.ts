import { test, expect } from '@playwright/test';

test.describe('Critical User Journeys', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test.describe('Login Journey', () => {
    test('should login successfully with valid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('input[type="email"]', 'test@example.com');
      await page.fill('input[type="password"]', 'TestPassword123!');
      await page.click('button[type="submit"]');

      await expect(page).toHaveURL(/.*dashboard/);
      await expect(page.getByRole('heading', { name: /dashboard/i })).toBeVisible();
    });

    test('should show error with invalid credentials', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('input[type="email"]', 'invalid@example.com');
      await page.fill('input[type="password"]', 'wrongpassword');
      await page.click('button[type="submit"]');

      await expect(page.getByText(/invalid credentials/i)).toBeVisible();
    });

    test('should validate email format', async ({ page }) => {
      await page.goto('/auth/login');

      await page.fill('input[type="email"]', 'invalid-email');
      await page.fill('input[type="password"]', 'password123');
      await page.click('button[type="submit"]');

      await expect(page.getByText(/valid email/i)).toBeVisible();
    });
  });

  test.describe('Dashboard Journey', () => {
    test('should display portfolio overview', async ({ page }) => {
      // Assuming logged in
      await page.goto('/dashboard');

      await expect(page.getByRole('heading', { name: /portfolio/i })).toBeVisible();
      await expect(page.getByText(/total balance/i)).toBeVisible();
    });

    test('should show asset breakdown', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.getByText(/BTC|ETH|SOL|USDC/)).toBeVisible();
    });

    test('should display recent transactions', async ({ page }) => {
      await page.goto('/dashboard');

      await expect(page.getByRole('heading', { name: /recent transactions/i })).toBeVisible();
    });
  });

  test.describe('Withdrawal Journey', () => {
    test('should initiate withdrawal request', async ({ page }) => {
      await page.goto('/withdrawals');

      await page.click('button:has-text("New Withdrawal")');
      await page.selectOption('select[name="asset"]', 'BTC');
      await page.fill('input[name="amount"]', '0.5');
      await page.fill('input[name="address"]', 'bc1qxy2kgdygjrsqtzq2n0yrf2493p83kkfjhx0wlh');
      await page.click('button[type="submit"]');

      await expect(page.getByText(/withdrawal request submitted/i)).toBeVisible();
    });

    test('should validate withdrawal amount', async ({ page }) => {
      await page.goto('/withdrawals');

      await page.click('button:has-text("New Withdrawal")');
      await page.fill('input[name="amount"]', '-1');

      await expect(page.getByText(/must be positive/i)).toBeVisible();
    });

    test('should show withdrawal history', async ({ page }) => {
      await page.goto('/withdrawals');

      await expect(page.getByRole('heading', { name: /withdrawal history/i })).toBeVisible();
    });
  });

  test.describe('Reports Journey', () => {
    test('should generate monthly statement', async ({ page }) => {
      await page.goto('/reports');

      await page.click('button:has-text("Generate Statement")');
      await page.selectOption('select[name="month"]', '2024-01');
      await page.click('button:has-text("Download")');

      // Wait for download
      const download = await page.waitForEvent('download');
      expect(download.suggestedFilename()).toMatch(/statement.*\.pdf/);
    });

    test('should display transaction history', async ({ page }) => {
      await page.goto('/reports/transactions');

      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /date/i })).toBeVisible();
      await expect(page.getByRole('columnheader', { name: /amount/i })).toBeVisible();
    });
  });

  test.describe('Admin Journey', () => {
    test('should access admin panel', async ({ page }) => {
      // Assuming admin login
      await page.goto('/admin');

      await expect(page.getByRole('heading', { name: /admin/i })).toBeVisible();
    });

    test('should manage users', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page.getByRole('table')).toBeVisible();
      await expect(page.getByRole('button', { name: /add user/i })).toBeVisible();
    });

    test('should process withdrawals', async ({ page }) => {
      await page.goto('/admin/withdrawals');

      await expect(page.getByRole('heading', { name: /pending withdrawals/i })).toBeVisible();
    });
  });

  test.describe('Settings Journey', () => {
    test('should update profile', async ({ page }) => {
      await page.goto('/settings/profile');

      await page.fill('input[name="name"]', 'Updated Name');
      await page.click('button:has-text("Save")');

      await expect(page.getByText(/saved successfully/i)).toBeVisible();
    });

    test('should change password', async ({ page }) => {
      await page.goto('/settings/security');

      await page.fill('input[name="currentPassword"]', 'OldPass123!');
      await page.fill('input[name="newPassword"]', 'NewPass123!');
      await page.fill('input[name="confirmPassword"]', 'NewPass123!');
      await page.click('button:has-text("Update Password")');

      await expect(page.getByText(/password updated/i)).toBeVisible();
    });

    test('should enable 2FA', async ({ page }) => {
      await page.goto('/settings/security');

      await page.click('button:has-text("Enable 2FA")');
      await expect(page.getByRole('img', { name: /qr code/i })).toBeVisible();
    });
  });

  test.describe('Error Handling', () => {
    test('should handle network errors gracefully', async ({ page }) => {
      await page.route('**/*', (route) => route.abort());

      await page.goto('/dashboard').catch(() => {});

      await expect(page.getByText(/error|unable to connect/i)).toBeVisible();
    });

    test('should show 404 page for invalid routes', async ({ page }) => {
      await page.goto('/non-existent-page');

      await expect(page.getByText(/404|not found/i)).toBeVisible();
    });

    test('should redirect unauthorized users', async ({ page }) => {
      await page.goto('/admin/users');

      await expect(page).toHaveURL(/.*login/);
    });
  });

  test.describe('Performance', () => {
    test('should load dashboard within 3 seconds', async ({ page }) => {
      const startTime = Date.now();
      await page.goto('/dashboard');
      const loadTime = Date.now() - startTime;

      expect(loadTime).toBeLessThan(3000);
    });

    test('should handle large transaction lists', async ({ page }) => {
      await page.goto('/reports/transactions');

      await expect(page.getByRole('table')).toBeVisible();
      // Should still be responsive
      await page.click('button:has-text("Next")');
    });
  });

  test.describe('Mobile Responsiveness', () => {
    test('should work on mobile viewport', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      await expect(page.getByRole('button', { name: /menu/i })).toBeVisible();
    });

    test('should support touch interactions', async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto('/dashboard');

      // Test swipe gesture
      await page.touchscreen.tap(50, 100);
    });
  });
});
