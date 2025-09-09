import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

/**
 * Comprehensive Accessibility Test Suite
 * Tests all critical pages for WCAG 2.1 AA compliance
 */

// Helper function to test accessibility
async function testAccessibility(page, url: string, pageName: string) {
  await page.goto(url);
  
  // Wait for page to be fully loaded
  await page.waitForLoadState('networkidle');
  
  // Run axe accessibility checks
  const accessibilityScanResults = await new AxeBuilder({ page })
    .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
    .analyze();
  
  // Log violations for debugging
  if (accessibilityScanResults.violations.length > 0) {
    console.log(`Accessibility violations on ${pageName}:`);
    accessibilityScanResults.violations.forEach(violation => {
      console.log(`- ${violation.id}: ${violation.description}`);
      console.log(`  Impact: ${violation.impact}`);
      console.log(`  Affected elements: ${violation.nodes.length}`);
    });
  }
  
  // Assert no violations
  expect(accessibilityScanResults.violations).toEqual([]);
  
  return accessibilityScanResults;
}

test.describe('Accessibility Tests - Public Pages', () => {
  test('Homepage accessibility', async ({ page }) => {
    await testAccessibility(page, '/', 'Homepage');
  });
  
  test('Login page accessibility', async ({ page }) => {
    await testAccessibility(page, '/login', 'Login');
  });
  
  test('Terms page accessibility', async ({ page }) => {
    await testAccessibility(page, '/terms', 'Terms');
  });
  
  test('Privacy page accessibility', async ({ page }) => {
    await testAccessibility(page, '/privacy', 'Privacy');
  });
  
  test('Contact page accessibility', async ({ page }) => {
    await testAccessibility(page, '/contact', 'Contact');
  });
  
  test('About page accessibility', async ({ page }) => {
    await testAccessibility(page, '/about', 'About');
  });
  
  test('FAQ page accessibility', async ({ page }) => {
    await testAccessibility(page, '/faq', 'FAQ');
  });
});

test.describe('Accessibility Tests - Keyboard Navigation', () => {
  test('Homepage keyboard navigation', async ({ page }) => {
    await page.goto('/');
    
    // Test tab navigation
    await page.keyboard.press('Tab');
    const firstFocusedElement = await page.evaluate(() => document.activeElement?.tagName);
    expect(firstFocusedElement).toBeTruthy();
    
    // Test skip to main content link
    await page.keyboard.press('Enter');
    const mainContent = await page.locator('#main-content');
    await expect(mainContent).toBeFocused();
  });
  
  test('Form keyboard navigation', async ({ page }) => {
    await page.goto('/login');
    
    // Tab through form fields
    await page.keyboard.press('Tab'); // Skip link
    await page.keyboard.press('Tab'); // First form field
    
    const emailInput = await page.locator('input[type="email"]');
    await expect(emailInput).toBeFocused();
    
    // Type in field
    await page.keyboard.type('test@example.com');
    
    // Tab to password field
    await page.keyboard.press('Tab');
    const passwordInput = await page.locator('input[type="password"]');
    await expect(passwordInput).toBeFocused();
    
    // Tab to submit button
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    const submitButton = await page.locator('button[type="submit"]');
    await expect(submitButton).toBeFocused();
  });
  
  test('Modal keyboard trap', async ({ page }) => {
    await page.goto('/');
    
    // Open a modal (if exists)
    const modalTrigger = await page.locator('[data-testid="modal-trigger"]').first();
    if (await modalTrigger.isVisible()) {
      await modalTrigger.click();
      
      // Check focus is trapped in modal
      await page.keyboard.press('Tab');
      const focusedElement = await page.evaluate(() => document.activeElement?.closest('[role="dialog"]'));
      expect(focusedElement).toBeTruthy();
      
      // Test Escape key closes modal
      await page.keyboard.press('Escape');
      const modal = await page.locator('[role="dialog"]');
      await expect(modal).not.toBeVisible();
    }
  });
});

test.describe('Accessibility Tests - Screen Reader', () => {
  test('ARIA labels and roles', async ({ page }) => {
    await page.goto('/');
    
    // Check for proper heading hierarchy
    const h1Count = await page.locator('h1').count();
    expect(h1Count).toBe(1);
    
    // Check for ARIA landmarks
    const main = await page.locator('main');
    await expect(main).toHaveCount(1);
    
    const nav = await page.locator('nav');
    await expect(nav).toHaveCount(1);
    
    // Check for proper button labels
    const buttons = await page.locator('button');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < buttonCount; i++) {
      const button = buttons.nth(i);
      const hasText = await button.textContent();
      const hasAriaLabel = await button.getAttribute('aria-label');
      const hasTitle = await button.getAttribute('title');
      
      // Button should have either text content, aria-label, or title
      expect(hasText || hasAriaLabel || hasTitle).toBeTruthy();
    }
  });
  
  test('Form labels and error messages', async ({ page }) => {
    await page.goto('/login');
    
    // Check all inputs have labels
    const inputs = await page.locator('input');
    const inputCount = await inputs.count();
    
    for (let i = 0; i < inputCount; i++) {
      const input = inputs.nth(i);
      const id = await input.getAttribute('id');
      const ariaLabel = await input.getAttribute('aria-label');
      const ariaLabelledby = await input.getAttribute('aria-labelledby');
      
      if (id) {
        const label = await page.locator(`label[for="${id}"]`);
        const hasLabel = await label.count() > 0;
        expect(hasLabel || ariaLabel || ariaLabelledby).toBeTruthy();
      }
    }
    
    // Test error message association
    await page.click('button[type="submit"]');
    await page.waitForTimeout(500);
    
    const errorMessages = await page.locator('[role="alert"]');
    if (await errorMessages.count() > 0) {
      const firstError = errorMessages.first();
      const errorId = await firstError.getAttribute('id');
      
      if (errorId) {
        const associatedInput = await page.locator(`[aria-describedby*="${errorId}"]`);
        expect(await associatedInput.count()).toBeGreaterThan(0);
      }
    }
  });
  
  test('Live regions for dynamic content', async ({ page }) => {
    await page.goto('/dashboard');
    
    // Check for aria-live regions
    const liveRegions = await page.locator('[aria-live]');
    const liveRegionCount = await liveRegions.count();
    
    if (liveRegionCount > 0) {
      for (let i = 0; i < liveRegionCount; i++) {
        const region = liveRegions.nth(i);
        const ariaLive = await region.getAttribute('aria-live');
        expect(['polite', 'assertive', 'off']).toContain(ariaLive);
      }
    }
  });
});

test.describe('Accessibility Tests - Color and Contrast', () => {
  test('Color contrast ratios', async ({ page }) => {
    await page.goto('/');
    
    // This test uses axe-core which includes color contrast checks
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .include(['body'])
      .analyze();
    
    const contrastViolations = results.violations.filter(v => 
      v.id === 'color-contrast' || v.id === 'color-contrast-enhanced'
    );
    
    expect(contrastViolations).toHaveLength(0);
  });
  
  test('Focus indicators visibility', async ({ page }) => {
    await page.goto('/');
    
    // Tab to first interactive element
    await page.keyboard.press('Tab');
    await page.keyboard.press('Tab');
    
    // Check if focus is visible
    const focusedElement = await page.evaluate(() => {
      const el = document.activeElement;
      if (!el) return null;
      
      const styles = window.getComputedStyle(el);
      const outlineWidth = styles.outlineWidth;
      const outlineStyle = styles.outlineStyle;
      const boxShadow = styles.boxShadow;
      
      return {
        hasOutline: outlineStyle !== 'none' && outlineWidth !== '0px',
        hasBoxShadow: boxShadow !== 'none',
      };
    });
    
    expect(focusedElement?.hasOutline || focusedElement?.hasBoxShadow).toBeTruthy();
  });
});

test.describe('Accessibility Tests - Responsive and Zoom', () => {
  test('200% zoom functionality', async ({ page }) => {
    await page.goto('/');
    
    // Set zoom to 200%
    await page.evaluate(() => {
      document.body.style.zoom = '2';
    });
    
    // Check for horizontal scroll (there shouldn't be any)
    const hasHorizontalScroll = await page.evaluate(() => {
      return document.documentElement.scrollWidth > document.documentElement.clientWidth;
    });
    
    expect(hasHorizontalScroll).toBeFalsy();
    
    // Check main content is still accessible
    const mainContent = await page.locator('#main-content');
    await expect(mainContent).toBeVisible();
  });
  
  test('Mobile viewport accessibility', async ({ page }) => {
    // Set mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // Run accessibility checks on mobile
    const results = await new AxeBuilder({ page })
      .withTags(['wcag2aa'])
      .analyze();
    
    expect(results.violations).toHaveLength(0);
    
    // Check touch target sizes
    const buttons = await page.locator('button, a');
    const buttonCount = await buttons.count();
    
    for (let i = 0; i < Math.min(buttonCount, 5); i++) {
      const button = buttons.nth(i);
      const box = await button.boundingBox();
      
      if (box) {
        // WCAG 2.5.5: Target size should be at least 44x44 CSS pixels
        expect(box.width).toBeGreaterThanOrEqual(44);
        expect(box.height).toBeGreaterThanOrEqual(44);
      }
    }
  });
});

test.describe('Accessibility Tests - Media and Images', () => {
  test('Images have alt text', async ({ page }) => {
    await page.goto('/');
    
    const images = await page.locator('img');
    const imageCount = await images.count();
    
    for (let i = 0; i < imageCount; i++) {
      const img = images.nth(i);
      const alt = await img.getAttribute('alt');
      const role = await img.getAttribute('role');
      const ariaLabel = await img.getAttribute('aria-label');
      
      // Image should have alt text, or role="presentation" for decorative images
      expect(alt !== null || role === 'presentation' || ariaLabel !== null).toBeTruthy();
    }
  });
  
  test('Video and audio controls', async ({ page }) => {
    await page.goto('/');
    
    // Check for video elements
    const videos = await page.locator('video');
    const videoCount = await videos.count();
    
    for (let i = 0; i < videoCount; i++) {
      const video = videos.nth(i);
      const hasControls = await video.getAttribute('controls');
      const hasAriaLabel = await video.getAttribute('aria-label');
      
      // Videos should have controls or be properly labeled
      expect(hasControls !== null || hasAriaLabel !== null).toBeTruthy();
    }
    
    // Check for audio elements
    const audios = await page.locator('audio');
    const audioCount = await audios.count();
    
    for (let i = 0; i < audioCount; i++) {
      const audio = audios.nth(i);
      const hasControls = await audio.getAttribute('controls');
      
      expect(hasControls).toBeTruthy();
    }
  });
});

// Export helper function for use in other tests
export { testAccessibility };
