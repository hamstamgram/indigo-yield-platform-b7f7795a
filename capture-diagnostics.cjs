const { chromium, devices } = require('playwright');
const fs = require('fs');
const path = require('path');

async function captureRoute(page, route, device) {
  const consoleLogs = [];
  
  // Capture console messages
  page.on('console', msg => {
    consoleLogs.push({
      type: msg.type(),
      text: msg.text(),
      location: msg.location()
    });
  });
  
  // Capture errors
  page.on('pageerror', error => {
    consoleLogs.push({
      type: 'error',
      text: error.message,
      stack: error.stack
    });
  });
  
  try {
    await page.goto(`http://127.0.0.1:4321${route}`, { 
      waitUntil: 'networkidle',
      timeout: 30000 
    });
    
    // Take screenshot
    const screenshotName = `${device}-${route.replace(/\//g, '_') || 'index'}.png`;
    await page.screenshot({ 
      path: `artifacts/screenshots/${screenshotName}`,
      fullPage: true 
    });
    
    return { route, device, consoleLogs, success: true };
  } catch (error) {
    return { route, device, consoleLogs, error: error.message, success: false };
  }
}

async function main() {
  const routes = ['/', '/health', '/dashboard'];
  const results = [];
  
  // Ensure directories exist
  fs.mkdirSync('artifacts/screenshots', { recursive: true });
  fs.mkdirSync('logs', { recursive: true });
  
  // Desktop capture
  const browser = await chromium.launch();
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  
  for (const route of routes) {
    const page = await context.newPage();
    const result = await captureRoute(page, route, 'desktop');
    results.push(result);
    await page.close();
  }
  
  // iPhone 15 capture
  const iPhone = devices['iPhone 15'];
  const mobileContext = await browser.newContext({
    ...iPhone,
    viewport: { width: 393, height: 852 }
  });
  
  for (const route of routes) {
    const page = await mobileContext.newPage();
    const result = await captureRoute(page, route, 'iphone15');
    results.push(result);
    await page.close();
  }
  
  await browser.close();
  
  // Save console logs
  fs.writeFileSync('logs/console.json', JSON.stringify(results, null, 2));
  
  console.log('Capture complete!');
  console.log('Results summary:');
  results.forEach(r => {
    console.log(`- ${r.device} ${r.route}: ${r.success ? 'SUCCESS' : 'FAILED'} (${r.consoleLogs.length} console messages)`);
    if (r.error) console.log(`  Error: ${r.error}`);
  });
}

main().catch(console.error);
