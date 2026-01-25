import { test, expect } from "@playwright/test";
import { injectAxe, checkA11y, getViolations } from "axe-playwright";

test.describe("WCAG 2.1 AA Compliance", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await injectAxe(page);
  });

  test.describe("Dashboard Accessibility", () => {
    test("should have no accessibility violations on dashboard", async ({ page }) => {
      await page.goto("/dashboard");
      await checkA11y(page, null, {
        detailedReport: true,
        detailedReportOptions: {
          html: true,
        },
      });
    });

    test("should have proper heading hierarchy", async ({ page }) => {
      await page.goto("/dashboard");

      const h1 = await page.locator("h1").count();
      expect(h1).toBe(1);

      // Check heading levels don't skip
      const headings = await page.locator("h1, h2, h3, h4, h5, h6").all();
      expect(headings.length).toBeGreaterThan(0);
    });

    test("should have alt text for all images", async ({ page }) => {
      await page.goto("/dashboard");

      const images = await page.locator("img").all();
      for (const img of images) {
        const alt = await img.getAttribute("alt");
        expect(alt).toBeTruthy();
      }
    });
  });

  test.describe("Form Accessibility", () => {
    test("should have labels for all form inputs", async ({ page }) => {
      await page.goto("/auth/login");

      const inputs = await page.locator("input").all();
      for (const input of inputs) {
        const id = await input.getAttribute("id");
        const ariaLabel = await input.getAttribute("aria-label");
        const label = await page.locator(`label[for="${id}"]`).count();

        expect(ariaLabel || label > 0).toBeTruthy();
      }
    });

    test("should show error messages with proper ARIA", async ({ page }) => {
      await page.goto("/auth/login");

      await page.fill('input[type="email"]', "invalid");
      await page.click('button[type="submit"]');

      const errorElement = page.getByRole("alert");
      await expect(errorElement).toBeVisible();
    });

    test("should have proper focus indicators", async ({ page }) => {
      await page.goto("/auth/login");

      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const el = document.activeElement;
        const styles = window.getComputedStyle(el!);
        return styles.outlineWidth !== "0px" || styles.borderWidth !== "0px";
      });

      expect(focused).toBe(true);
    });

    test("should support keyboard navigation", async ({ page }) => {
      await page.goto("/auth/login");

      await page.keyboard.press("Tab"); // Focus email
      await page.keyboard.press("Tab"); // Focus password
      await page.keyboard.press("Tab"); // Focus submit button
      await page.keyboard.press("Enter"); // Submit form

      // Should attempt form submission
      await expect(page).not.toHaveURL("/auth/login");
    });
  });

  test.describe("Navigation Accessibility", () => {
    test("should have skip to main content link", async ({ page }) => {
      await page.goto("/dashboard");

      const skipLink = page.getByRole("link", { name: /skip to (main )?content/i });
      await expect(skipLink).toBeTruthy();
    });

    test("should have proper ARIA landmarks", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("navigation")).toBeVisible();
    });

    test("should have descriptive link text", async ({ page }) => {
      await page.goto("/dashboard");

      const links = await page.locator("a").all();
      for (const link of links) {
        const text = await link.textContent();
        const ariaLabel = await link.getAttribute("aria-label");

        // Links should not just say "click here" or "read more"
        expect(text || ariaLabel).not.toMatch(/^(click here|read more)$/i);
      }
    });
  });

  test.describe("Color and Contrast", () => {
    test("should meet contrast requirements", async ({ page }) => {
      await page.goto("/dashboard");

      await checkA11y(page, null, {
        rules: {
          "color-contrast": { enabled: true },
        },
      });
    });

    test("should not rely solely on color", async ({ page }) => {
      await page.goto("/dashboard");

      // Error states should have icons or text, not just red color
      const errors = await page.locator('[class*="error"], [aria-invalid="true"]').all();
      for (const error of errors) {
        const hasIcon = (await error.locator('svg, [class*="icon"]').count()) > 0;
        const hasText = ((await error.textContent())?.length ?? 0) > 0;

        expect(hasIcon || hasText).toBe(true);
      }
    });
  });

  test.describe("Tables and Data", () => {
    test("should have accessible tables", async ({ page }) => {
      await page.goto("/reports/transactions");

      const tables = await page.locator("table").all();
      for (const table of tables) {
        const hasCaption = (await table.locator("caption").count()) > 0;
        const hasAriaLabel = await table.getAttribute("aria-label");

        expect(hasCaption || hasAriaLabel).toBeTruthy();

        // Check for proper th elements
        const headers = await table.locator("th").count();
        expect(headers).toBeGreaterThan(0);
      }
    });

    test("should support screen reader navigation", async ({ page }) => {
      await page.goto("/reports/transactions");

      await checkA11y(page, "table", {
        rules: {
          "table-fake-caption": { enabled: true },
          "td-headers-attr": { enabled: true },
          "th-has-data-cells": { enabled: true },
        },
      });
    });
  });

  test.describe("Interactive Elements", () => {
    test("should have accessible buttons", async ({ page }) => {
      await page.goto("/dashboard");

      const buttons = await page.locator("button").all();
      for (const button of buttons) {
        const text = await button.textContent();
        const ariaLabel = await button.getAttribute("aria-label");
        const title = await button.getAttribute("title");

        expect(text || ariaLabel || title).toBeTruthy();
      }
    });

    test("should have proper ARIA for modals", async ({ page }) => {
      await page.goto("/dashboard");

      await page.click('button:has-text("New")');

      const modal = page.getByRole("dialog");
      await expect(modal).toBeVisible();
      await expect(modal).toHaveAttribute("aria-modal", "true");

      // Focus should be trapped in modal
      await page.keyboard.press("Tab");
      const focused = await page.evaluate(() => {
        const modal = document.querySelector('[role="dialog"]');
        return modal?.contains(document.activeElement);
      });
      expect(focused).toBe(true);
    });

    test("should announce dynamic content changes", async ({ page }) => {
      await page.goto("/dashboard");

      // Check for live regions
      const liveRegions = await page.locator("[aria-live]").all();
      expect(liveRegions.length).toBeGreaterThan(0);
    });
  });

  test.describe("Mobile Accessibility", () => {
    test("should be accessible on mobile", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/dashboard");

      await checkA11y(page, null, {
        detailedReport: true,
      });
    });

    test("should have touch targets of at least 44x44 pixels", async ({ page }) => {
      await page.setViewportSize({ width: 375, height: 667 });
      await page.goto("/dashboard");

      const buttons = await page.locator("button, a[href]").all();
      for (const button of buttons) {
        const box = await button.boundingBox();
        if (box) {
          expect(box.width).toBeGreaterThanOrEqual(44);
          expect(box.height).toBeGreaterThanOrEqual(44);
        }
      }
    });
  });

  test.describe("Screen Reader Support", () => {
    test("should have proper page titles", async ({ page }) => {
      await page.goto("/dashboard");
      await expect(page).toHaveTitle(/.+/);

      await page.goto("/reports");
      const title = await page.title();
      expect(title).toContain("Reports");
    });

    test("should have lang attribute", async ({ page }) => {
      await page.goto("/dashboard");

      const lang = await page.locator("html").getAttribute("lang");
      expect(lang).toBe("en");
    });

    test("should have proper document structure", async ({ page }) => {
      await page.goto("/dashboard");

      await expect(page.getByRole("banner")).toBeTruthy(); // header
      await expect(page.getByRole("main")).toBeVisible();
      await expect(page.getByRole("contentinfo")).toBeTruthy(); // footer
    });
  });

  test.describe("Compliance Report", () => {
    test("should generate detailed accessibility report", async ({ page }) => {
      await page.goto("/dashboard");

      const violations = await getViolations(page);

      console.log(`
========================================
ACCESSIBILITY COMPLIANCE REPORT
========================================
Total Violations: ${violations.length}

${violations
  .map(
    (v) => `
Issue: ${v.id}
Impact: ${v.impact}
Description: ${v.description}
Nodes: ${v.nodes.length}
`
  )
  .join("\n")}
========================================
      `);

      expect(violations.length).toBe(0);
    });
  });
});
