import { test, expect } from '@playwright/test';

test('Admin Precision Audit - Live Platform', async ({ page }) => {
  await page.goto('/');
  await page.getByPlaceholder('Email address').fill('adriel@indigo.fund');
  await page.getByPlaceholder('Password').fill('TestAdmin2026!');
  await page.getByRole('button', { name: 'Sign in' }).click();
  await expect(page).toHaveURL(/.*admin/);
  await page.getByRole('link', { name: 'Investors' }).click();
  await page.locator('table tr').nth(1).click();
  const sharesText = await page.locator('span.font-mono.tabular-nums').first().textContent();
  console.log('Detected Shares Precision:', sharesText);
  if (sharesText && sharesText.includes('.')) {
    const decimals = sharesText.split('.')[1].length;
    console.log('Decimal Count:', decimals);
    expect(decimals).toBeGreaterThanOrEqual(6);
  }
});