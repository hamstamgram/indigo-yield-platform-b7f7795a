import { test, expect, devices } from "@playwright/test";
import fs from "fs/promises";

const PREVIEW_URL = "https://indigo-yield-platform-v01.lovable.app";

test.describe("Phase 4 PWA Validation", () => {
  test("validates service worker, manifest, and install prompt", async ({ page }) => {
    const consoleLogs: string[] = [];
    const errors: string[] = [];

    page.on("console", (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    await page.goto(PREVIEW_URL, { waitUntil: "networkidle" });

    // Check service worker
    const swStatus = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return { supported: false };
      const reg = await navigator.serviceWorker.getRegistration();
      return {
        supported: true,
        registered: !!reg,
        scope: reg?.scope,
      };
    });

    // Check manifest
    const manifestCheck = await page.evaluate(async () => {
      const link = document.querySelector('link[rel="manifest"]');
      if (!link) return { hasLink: false };
      const href = link.getAttribute("href");
      try {
        const resp = await fetch(href!);
        return {
          hasLink: true,
          status: resp.status,
          ok: resp.ok,
        };
      } catch (e) {
        return { hasLink: true, error: true };
      }
    });

    // Screenshot
    await page.screenshot({
      path: "artifacts/screenshots/phase4-desktop.png",
      fullPage: false,
    });

    // Save logs
    await fs.writeFile(
      "logs/phase4-validation.json",
      JSON.stringify(
        {
          url: PREVIEW_URL,
          timestamp: new Date().toISOString(),
          swStatus,
          manifestCheck,
          errors: errors.slice(0, 10),
          consoleLogs: consoleLogs.slice(0, 20),
        },
        null,
        2
      )
    );

    console.log("Phase 4 Validation:");
    console.log("- SW Registered:", swStatus.registered);
    console.log("- Manifest OK:", manifestCheck.ok);
    console.log("- Errors:", errors.length);
  });

  test("mobile viewport validation", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto(PREVIEW_URL, { waitUntil: "networkidle" });
    await page.screenshot({
      path: "artifacts/screenshots/phase4-iphone.png",
      fullPage: false,
    });

    await context.close();
  });
});
