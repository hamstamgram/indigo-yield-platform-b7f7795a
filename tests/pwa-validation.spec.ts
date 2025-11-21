import { test, expect, devices } from "@playwright/test";
import fs from "fs/promises";

const PREVIEW_URL = "https://indigo-yield-platform-v01-i1gh61jyi-hamstamgrams-projects.vercel.app";

test.describe("PWA Service Worker Validation", () => {
  test("validates service worker registration and manifest", async ({ page }) => {
    const consoleLogs: string[] = [];
    const errors: string[] = [];

    // Capture console logs
    page.on("console", (msg) => {
      consoleLogs.push(`[${msg.type()}] ${msg.text()}`);
      if (msg.type() === "error") {
        errors.push(msg.text());
      }
    });

    // Navigate to preview URL
    await page.goto(PREVIEW_URL, { waitUntil: "networkidle" });

    // Check service worker registration
    const swRegistered = await page.evaluate(async () => {
      if (!("serviceWorker" in navigator)) return false;
      const registration = await navigator.serviceWorker.getRegistration();
      return registration !== undefined;
    });

    // Check manifest
    const manifestResponse = await page.evaluate(async () => {
      const manifestLink = document.querySelector('link[rel="manifest"]');
      if (!manifestLink) return null;
      const href = manifestLink.getAttribute("href");
      if (!href) return null;

      try {
        const response = await fetch(href);
        return {
          status: response.status,
          ok: response.ok,
          url: response.url,
        };
      } catch (e) {
        return { error: e.message };
      }
    });

    // Take desktop screenshot
    await page.screenshot({
      path: "artifacts/screenshots/desktop-pwa.png",
      fullPage: false,
    });

    // Save console logs
    await fs.writeFile(
      "logs/console.json",
      JSON.stringify(
        {
          url: PREVIEW_URL,
          timestamp: new Date().toISOString(),
          consoleLogs,
          errors,
          swRegistered,
          manifestResponse,
        },
        null,
        2
      )
    );

    // Assertions
    expect(errors.length, `Console errors found: ${errors.join(", ")}`).toBe(0);
    expect(swRegistered, "Service Worker should be registered").toBe(true);
    expect(manifestResponse?.ok, "Manifest should load successfully").toBe(true);

    console.log("PWA Validation Results:");
    console.log("- Service Worker Registered:", swRegistered);
    console.log("- Manifest Status:", manifestResponse?.status);
    console.log("- Console Errors:", errors.length);
  });

  test("validates PWA on mobile viewport", async ({ browser }) => {
    const context = await browser.newContext({
      ...devices["iPhone 13"],
      ignoreHTTPSErrors: true,
    });
    const page = await context.newPage();

    await page.goto(PREVIEW_URL, { waitUntil: "networkidle" });

    // Take iPhone screenshot
    await page.screenshot({
      path: "artifacts/screenshots/iphone-pwa.png",
      fullPage: false,
    });

    await context.close();
  });
});
