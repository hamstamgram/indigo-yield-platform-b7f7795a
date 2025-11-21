import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";

const base = process.env.PREVIEW_URL || readFileSync(".preview-url", "utf8").trim();

const adminRoutes = [
  "/admin",
  "/admin/investors",
  "/admin/investors/new",
  "/admin/investors/sample-id", // Stub ID
  "/admin/yield-settings",
  "/admin/requests",
  "/admin/statements",
  "/admin/support",
  "/admin/audit",
];

test.describe("Admin Routes Audit", () => {
  adminRoutes.forEach((route) => {
    test(`Admin Route ${route} loads without critical errors`, async ({ page }) => {
      const errors: string[] = [];
      const networkErrors: string[] = [];

      page.on("console", (msg) => {
        if (msg.type() === "error") {
          errors.push(msg.text());
        }
      });

      page.on("response", (response) => {
        if (response.status() >= 400 && response.status() < 600) {
          // Skip expected auth errors, redirects, and assets
          if (
            !response.url().includes("favicon") &&
            !response.url().includes("auth") &&
            ![401, 403, 302, 307].includes(response.status()) &&
            !response.url().includes("supabase.co/auth") &&
            !response.url().includes("_next/") &&
            !response.url().includes("/assets/")
          ) {
            networkErrors.push(`${response.status()} ${response.url()}`);
          }
        }
      });

      await page.goto(base + route);
      await page.waitForTimeout(3000); // Wait for app to load

      // Take screenshot for evidence
      await page.screenshot({
        path: `artifacts/screenshots/admin/${route.replace(/[\/\\:*?"<>|]/g, "_")}.png`,
        fullPage: true,
      });

      // Filter out expected errors
      const criticalErrors = errors.filter(
        (error) =>
          !error.includes("favicon") &&
          !error.includes("401") &&
          !error.includes("403") &&
          !error.includes("NetworkError") &&
          !error.includes("Failed to load resource") &&
          !error.includes("Provider's accounts list is empty") &&
          !error.includes("GSI_LOGGER")
      );

      // Save console logs
      const logData = {
        route,
        timestamp: new Date().toISOString(),
        errors: criticalErrors,
        networkErrors,
        totalErrors: errors.length,
        criticalErrorsCount: criticalErrors.length,
      };

      await page.evaluate((data) => {
        console.log("AUDIT_LOG:", JSON.stringify(data));
      }, logData);

      // Check that page shows either admin content or access denied (but loads properly)
      const hasContent = (await page.locator('h1, h2, h3, [role="main"], .admin').count()) > 0;
      expect(hasContent).toBe(true);

      // Expect no critical console errors
      expect(criticalErrors.length).toBe(0);
      expect(networkErrors.length).toBe(0);
    });
  });
});
