import { test, expect } from "@playwright/test";
import { readFileSync } from "fs";

const base = process.env.PREVIEW_URL || readFileSync(".preview-url", "utf8").trim();

const lpRoutes = [
  "/dashboard",
  "/assets/usdc", // Fixed: changed from /portfolio/USDC to actual route
  "/transactions",
  "/statements",
  "/support",
  "/documents",
  "/settings/profile",
  "/settings/notifications",
  "/settings/security",
  "/withdrawals",
  "/notifications",
];

test.describe("LP Routes Audit", () => {
  lpRoutes.forEach((route) => {
    test(`LP Route ${route} loads without critical errors`, async ({ page }) => {
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
        path: `artifacts/screenshots/lp/${route.replace(/[\/\\:*?"<>|]/g, "_")}.png`,
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
        // Save logs to artifacts (will be written by test runner)
        console.log("AUDIT_LOG:", JSON.stringify(data));
      }, logData);

      // Expect no critical console errors
      expect(criticalErrors.length).toBe(0);
      expect(networkErrors.length).toBe(0);
    });
  });
});
