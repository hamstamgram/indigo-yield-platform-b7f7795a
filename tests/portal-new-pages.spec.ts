import { test, expect } from '@playwright/test';
import { readFileSync } from 'fs';

const base = process.env.PREVIEW_URL || readFileSync('.preview-url','utf8').trim();

const testPages = [
  { path: '/onboarding', title: 'Welcome to Indigo Yield' },
  { path: '/settings/profile', title: 'Profile Settings' },
  { path: '/settings/notifications', title: 'Notification Settings' },
  { path: '/support', title: 'Support Center' },
  { path: '/documents', title: 'Document Vault' },
  { path: '/admin', title: 'Admin Dashboard' },
  { path: '/admin/investors', title: 'Investors' },
  { path: '/admin/yield-settings', title: 'Yield Settings' },
  { path: '/admin/requests', title: 'Requests' },
  { path: '/admin/statements', title: 'Statements' },
  { path: '/admin/support', title: 'Support' },
  { path: '/admin/audit', title: 'Audit' },
];

test.describe('Portal Pages Render', () => {
  testPages.forEach(({ path, title }) => {
    test(`${path} renders without errors`, async ({ page }) => {
      const errors: string[] = [];
      page.on('console', msg => {
        if (msg.type() === 'error') {
          errors.push(msg.text());
        }
      });

      await page.goto(base + path);
      
      // Wait for any loading to complete
      await page.waitForTimeout(2000);
      
      // Check that some content is visible (either the title or a heading)
      await expect(
        page.locator('h1, h2, h3').first()
      ).toBeVisible();

      // Check for major console errors (but allow some minor ones)
      const majorErrors = errors.filter(error => 
        !error.includes('favicon') && 
        !error.includes('chunk-') &&
        !error.includes('404') &&
        !error.includes('401') &&
        !error.includes('403') &&
        !error.includes('Provider\'s accounts list is empty') &&
        !error.includes('Failed to load resource') &&
        !error.includes('GSI_LOGGER') &&
        !error.includes('FedCM') &&
        !error.includes('NetworkError')
      );
      
      expect(majorErrors).toEqual([]);
    });
  });
});

test.describe('Responsive Design', () => {
  test('pages work on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 }); // iPhone 13 Pro
    
    await page.goto(base + '/onboarding');
    await expect(page.locator('h1')).toBeVisible();
    
    await page.goto(base + '/settings/profile');
    await expect(page.locator('h1')).toBeVisible();
  });

  test('pages work on desktop', async ({ page }) => {
    await page.setViewportSize({ width: 1440, height: 900 });
    
    await page.goto(base + '/admin');
    await expect(page.locator('h1')).toBeVisible();
    
    await page.goto(base + '/documents');
    await expect(page.locator('h1')).toBeVisible();
  });
});
