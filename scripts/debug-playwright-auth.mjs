import { chromium } from "playwright";

(async () => {
    const browser = await chromium.launch({ headless: true });
    const page = await browser.newPage();

    page.on("console", (msg) => console.log(`[BROWSER CONSOLE] ${msg.type()}: ${msg.text()}`));
    page.on("pageerror", (err) => console.error(`[PAGE ERROR]`, err));

    page.on("response", async (response) => {
        if (response.url().includes("token?grant_type=password")) {
            console.log(`[AUTH NETWORK] ${response.status()} ${response.url()}`);
            try {
                const body = await response.json();
                console.log(`[AUTH BODY]`, JSON.stringify(body));
            } catch (e) { }
        }
    });

    console.log("Navigating to http://localhost:8080/login ...");
    await page.goto("http://localhost:8080/login", { waitUntil: "domcontentloaded" });

    console.log("Filling out credentials...");
    await page.fill('input[type="email"]', "adriel@indigo.fund");
    await page.fill('input[type="password"]', "TestAdmin2026!");
    await page.click('button[type="submit"]');

    console.log("Waiting 3 seconds for response...");
    await page.waitForTimeout(3000);

    const content = await page.content();
    const alert = await page.locator('[role="alert"]').textContent({ timeout: 1000 }).catch(() => "No alert found");
    console.log(`\nAlert text: ${alert}`);

    await browser.close();
})();
