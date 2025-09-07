import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

const base = process.env.PREVIEW_URL || readFileSync('.preview-url','utf8').trim();

test('security settings renders', async ({ page }) => {
  await page.goto(base + '/settings/security');
  // Check for security page header or TOTP component
  await expect(page.locator('h1, h2').first()).toBeVisible(); 
  const errors: string[] = [];
  page.on('console', m => { if (m.type()==='error') errors.push(m.text()); });
  expect(errors).toEqual([]);
});
