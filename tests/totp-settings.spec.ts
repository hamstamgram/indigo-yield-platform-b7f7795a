import { test, expect } from '@playwright/test';
const base = process.env.PREVIEW_URL || require('fs').readFileSync('.preview-url','utf8').trim();

test('security settings renders', async ({ page }) => {
  await page.goto(base + '/settings/security');
  await expect(page.getByText('Two-Factor Authentication')).toBeVisible();
  const errors: string[] = [];
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  expect(errors).toEqual([]);
});
