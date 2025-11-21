import { chromium, devices } from "playwright";

const BASE_URL = "http://localhost:8082";
const routes = ["/", "/dashboard", "/login", "/admin-dashboard"];
const iPhone = devices["iPhone 15 Pro"];

(async () => {
  const browser = await chromium.launch({ headless: false });

  // Desktop context
  const desktopContext = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });

  // Mobile context
  const mobileContext = await browser.newContext({
    ...iPhone,
  });

  const desktopPage = await desktopContext.newPage();
  const mobilePage = await mobileContext.newPage();

  // Collect console messages and errors
  const consoleMessages = [];
  const pageErrors = [];

  desktopPage.on("console", (msg) => {
    consoleMessages.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location(),
    });
  });

  desktopPage.on("pageerror", (error) => {
    pageErrors.push(error.toString());
  });

  for (const route of routes) {
    console.log(`\nAuditing route: ${route}`);

    try {
      // Desktop screenshots
      await desktopPage.goto(BASE_URL + route, { waitUntil: "domcontentloaded", timeout: 10000 });
      await desktopPage.waitForTimeout(2000);

      const routeName = route === "/" ? "index" : route.replace(/\//g, "-").substring(1);
      await desktopPage.screenshot({
        path: `artifacts/${routeName}-desktop.png`,
        fullPage: true,
      });
      console.log(`✅ Desktop screenshot saved: ${routeName}-desktop.png`);

      // Mobile screenshots
      await mobilePage.goto(BASE_URL + route, { waitUntil: "domcontentloaded", timeout: 10000 });
      await mobilePage.waitForTimeout(2000);

      await mobilePage.screenshot({
        path: `artifacts/${routeName}-mobile.png`,
        fullPage: true,
      });
      console.log(`✅ Mobile screenshot saved: ${routeName}-mobile.png`);
    } catch (error) {
      console.error(`❌ Error on route ${route}:`, error.message);
    }
  }

  // Log console messages and errors
  console.log("\n=== Console Messages ===");
  consoleMessages.forEach((msg) => {
    if (msg.type === "error") {
      console.error(`ERROR: ${msg.text}`);
    } else if (msg.type === "warning") {
      console.warn(`WARN: ${msg.text}`);
    }
  });

  console.log("\n=== Page Errors ===");
  pageErrors.forEach((error) => console.error(error));

  await browser.close();

  // Report summary
  console.log("\n=== Audit Summary ===");
  console.log(`Routes audited: ${routes.length}`);
  console.log(`Console errors: ${consoleMessages.filter((m) => m.type === "error").length}`);
  console.log(`Page errors: ${pageErrors.length}`);
})();
