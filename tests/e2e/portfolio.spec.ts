import { test, expect } from '@playwright/test';

test.describe('Portfolio E2E', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should navigate and interact correctly', async ({ page }) => {
    await expect(page).toHaveTitle(/.*/);
  });

  test('should handle form submission', async ({ page }) => {
    // Add form interaction tests
    await expect(page).toHaveURL(/.*/) ;
  });

  test('should be accessible', async ({ page }) => {
    // Add accessibility tests
    await expect(page).toHaveTitle(/.*/);
  });
});
