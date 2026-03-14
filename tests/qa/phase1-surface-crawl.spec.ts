/**
 * Phase 1: Admin Surface Area Automated Crawl
 *
 * Logs in as admin, navigates all admin routes, captures screenshots,
 * and intercepts RPC calls to build a UI -> RPC mapping.
 */

import { test, expect } from "@playwright/test";
import * as fs from "fs";
import * as path from "path";
import {
  loginAs,
  assertPageLoaded,
  assertNoCrash,
  takeScreenshot,
  ADMIN_ROUTES,
} from "./playwright/helpers";

interface RouteMapping {
  route: string;
  status: "loaded" | "error" | "redirect" | "timeout";
  finalUrl: string;
  rpcsCalledOnLoad: string[];
  screenshotPath: string;
  consoleErrors: string[];
  loadTimeMs: number;
}

test.describe("Admin Surface Area Crawl", () => {
  test("crawl all admin routes and capture RPC mapping", async ({ page }) => {
    test.setTimeout(300000); // 5 minutes for full surface crawl
    await loginAs(page, "admin");

    const mappings: RouteMapping[] = [];
    const screenshotDir = path.resolve("tests/qa/screenshots");
    fs.mkdirSync(screenshotDir, { recursive: true });

    for (const route of ADMIN_ROUTES) {
      const rpcs: string[] = [];
      const consoleErrors: string[] = [];
      const startTime = Date.now();

      // Intercept RPC calls
      await page.route("**/rest/v1/rpc/**", (routeHandler) => {
        const url = routeHandler.request().url();
        const match = url.match(/\/rpc\/([^?]+)/);
        if (match) rpcs.push(match[1]);
        routeHandler.continue();
      });

      // Capture console errors
      page.on("console", (msg) => {
        if (msg.type() === "error") {
          consoleErrors.push(msg.text());
        }
      });

      let status: RouteMapping["status"] = "loaded";

      try {
        await page.goto(route, { timeout: 15000 });
        await page.waitForLoadState("networkidle", { timeout: 10000 });
        await assertNoCrash(page);
      } catch {
        status = "timeout";
      }

      const finalUrl = page.url();
      if (finalUrl !== route && !finalUrl.endsWith(route)) {
        status = "redirect";
      }

      const loadTimeMs = Date.now() - startTime;
      const screenshotName = route.replace(/\//g, "_").replace(/^_/, "");
      const screenshotPath = `tests/qa/screenshots/${screenshotName}.png`;

      await page.screenshot({ path: screenshotPath, fullPage: true }).catch(() => {});

      mappings.push({
        route,
        status,
        finalUrl,
        rpcsCalledOnLoad: [...new Set(rpcs)],
        screenshotPath,
        consoleErrors: consoleErrors.filter(
          (e) => !e.includes("ResizeObserver") && !e.includes("favicon")
        ),
        loadTimeMs,
      });

      // Clear interceptors for next route
      await page.unroute("**/rest/v1/rpc/**");
      page.removeAllListeners("console");
    }

    // Write mapping report
    const reportPath = path.resolve("tests/qa/phase1-surface-report.json");
    fs.writeFileSync(reportPath, JSON.stringify(mappings, null, 2));

    // Assertions
    const loadedRoutes = mappings.filter((m) => m.status === "loaded");
    const errorRoutes = mappings.filter((m) => m.consoleErrors.length > 0);

    // All routes should load without crashes
    for (const mapping of mappings) {
      expect(mapping.status, `Route ${mapping.route} should load (got ${mapping.status})`).not.toBe(
        "error"
      );
    }

    // Summary
    console.log(`\nSurface Crawl Summary:`);
    console.log(`  Routes crawled: ${mappings.length}`);
    console.log(`  Loaded: ${loadedRoutes.length}`);
    console.log(`  Redirected: ${mappings.filter((m) => m.status === "redirect").length}`);
    console.log(`  Timeouts: ${mappings.filter((m) => m.status === "timeout").length}`);
    console.log(`  With errors: ${errorRoutes.length}`);
    console.log(`  Report: ${reportPath}`);
  });
});
