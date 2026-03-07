import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    console.log("Navigating to login...");
    await page.goto("http://localhost:8080/login", { waitUntil: "domcontentloaded" });

    await page.fill('input[type="email"]', "qa.admin@indigo.fund");
    await page.fill('input[type="password"]', "TestAdmin2026!");
    await page.click('button[type="submit"]');

    console.log("Waiting 5 seconds for page load...");
    await page.waitForTimeout(5000);

    await page.screenshot({ path: "test-results/qa-admin-login-debug.png" });
    console.log("Screenshot saved.");

    await browser.close();
})();
