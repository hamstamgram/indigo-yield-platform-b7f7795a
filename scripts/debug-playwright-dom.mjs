import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`[PAGE ERROR]`, err));

    console.log("Navigating to http://localhost:8080/login ...");
    const response = await page.goto("http://localhost:8080/login", { waitUntil: "domcontentloaded" });

    console.log("Status:", response?.status());

    await page.waitForTimeout(3000);

    const content = await page.content();
    console.log("\nDOM snippet:");
    console.log(content.substring(0, 500));

    const inputs = await page.locator("input").count();
    console.log(`Found ${inputs} input elements.`);

    await browser.close();
})();
