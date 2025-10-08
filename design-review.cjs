const { chromium } = require('playwright');
const fs = require('fs');
const path = require('path');

const BREAKPOINTS = {
  mobile: [
    { name: 'iPhone SE', width: 375, height: 667 },
    { name: 'iPhone 12/13', width: 390, height: 844 },
    { name: 'iPhone 14 Pro Max', width: 430, height: 932 }
  ],
  tablet: [
    { name: 'iPad Mini', width: 768, height: 1024 },
    { name: 'iPad Pro 11"', width: 834, height: 1194 }
  ],
  desktop: [
    { name: 'Laptop', width: 1280, height: 720 },
    { name: 'Desktop HD', width: 1920, height: 1080 },
    { name: 'Desktop 4K', width: 2560, height: 1440 }
  ]
};

const BASE_URL = process.env.BASE_URL || 'http://localhost:8080';
const OUTPUT_DIR = './design-review-output';

async function ensureDir(dir) {
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
}

async function captureScreenshots(page, url, name) {
  const screenshotsDir = path.join(OUTPUT_DIR, 'screenshots', name);
  await ensureDir(screenshotsDir);

  const results = [];

  for (const [category, devices] of Object.entries(BREAKPOINTS)) {
    for (const device of devices) {
      await page.setViewportSize({ width: device.width, height: device.height });
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 15000 });
      await page.waitForTimeout(2000); // Wait for content to settle

      const filename = `${device.name.replace(/[^a-z0-9]/gi, '_')}_${device.width}x${device.height}.png`;
      const filepath = path.join(screenshotsDir, filename);

      await page.screenshot({
        path: filepath,
        fullPage: true
      });

      results.push({
        category,
        device: device.name,
        width: device.width,
        height: device.height,
        screenshot: filepath
      });

      console.log(`✓ Captured ${device.name} (${device.width}x${device.height})`);
    }
  }

  return results;
}

async function runAccessibilityAudit(page) {
  console.log('\n🔍 Running Accessibility Audit...');

  const issues = [];

  // Check for missing alt text
  const imagesWithoutAlt = await page.$$eval('img', imgs =>
    imgs.filter(img => !img.alt || img.alt.trim() === '')
      .map(img => ({ src: img.src, tag: 'img' }))
  );

  if (imagesWithoutAlt.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Accessibility',
      issue: 'Images missing alt text',
      count: imagesWithoutAlt.length,
      details: imagesWithoutAlt
    });
  }

  // Check for buttons without accessible names
  const buttonsWithoutLabel = await page.$$eval('button', buttons =>
    buttons.filter(btn =>
      !btn.textContent.trim() &&
      !btn.getAttribute('aria-label') &&
      !btn.getAttribute('aria-labelledby')
    ).length
  );

  if (buttonsWithoutLabel > 0) {
    issues.push({
      severity: 'critical',
      category: 'Accessibility',
      issue: 'Buttons without accessible names',
      count: buttonsWithoutLabel
    });
  }

  // Check for form inputs without labels
  const inputsWithoutLabel = await page.$$eval('input:not([type="hidden"])', inputs =>
    inputs.filter(input => {
      const id = input.id;
      const hasLabel = id && document.querySelector(`label[for="${id}"]`);
      const hasAriaLabel = input.getAttribute('aria-label');
      const hasAriaLabelledby = input.getAttribute('aria-labelledby');
      return !hasLabel && !hasAriaLabel && !hasAriaLabelledby;
    }).length
  );

  if (inputsWithoutLabel > 0) {
    issues.push({
      severity: 'critical',
      category: 'Accessibility',
      issue: 'Form inputs without labels',
      count: inputsWithoutLabel
    });
  }

  // Check heading hierarchy
  const headings = await page.$$eval('h1, h2, h3, h4, h5, h6', headings =>
    headings.map(h => ({ tag: h.tagName, text: h.textContent.trim().substring(0, 50) }))
  );

  const h1Count = headings.filter(h => h.tag === 'H1').length;
  if (h1Count === 0) {
    issues.push({
      severity: 'warning',
      category: 'Accessibility',
      issue: 'No H1 heading found'
    });
  } else if (h1Count > 1) {
    issues.push({
      severity: 'warning',
      category: 'Accessibility',
      issue: 'Multiple H1 headings found',
      count: h1Count
    });
  }

  // Check color contrast (basic check for very light text)
  const lowContrastElements = await page.$$eval('*', elements => {
    const results = [];
    elements.forEach(el => {
      const style = window.getComputedStyle(el);
      const bgColor = style.backgroundColor;
      const textColor = style.color;
      const text = el.textContent?.trim();

      if (text && text.length > 0) {
        // Very basic check for white/light text on white/light background
        if (
          (textColor.includes('255, 255, 255') || textColor.includes('rgb(255')) &&
          (bgColor.includes('255, 255, 255') || bgColor.includes('rgb(255'))
        ) {
          results.push({
            text: text.substring(0, 30),
            textColor,
            bgColor
          });
        }
      }
    });
    return results.slice(0, 5); // Limit results
  });

  if (lowContrastElements.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Accessibility',
      issue: 'Potential color contrast issues detected',
      details: lowContrastElements
    });
  }

  return issues;
}

async function analyzePerformance(page) {
  console.log('\n⚡ Analyzing Performance...');

  const metrics = await page.evaluate(() => {
    const perf = window.performance;
    const navigation = perf.getEntriesByType('navigation')[0];
    const paint = perf.getEntriesByType('paint');

    return {
      domContentLoaded: navigation?.domContentLoadedEventEnd - navigation?.domContentLoadedEventStart,
      loadComplete: navigation?.loadEventEnd - navigation?.loadEventStart,
      firstPaint: paint.find(p => p.name === 'first-paint')?.startTime,
      firstContentfulPaint: paint.find(p => p.name === 'first-contentful-paint')?.startTime,
      resourceCount: perf.getEntriesByType('resource').length,
      resources: perf.getEntriesByType('resource').map(r => ({
        name: r.name.split('/').pop(),
        type: r.initiatorType,
        size: r.transferSize,
        duration: r.duration
      }))
    };
  });

  const issues = [];

  if (metrics.firstContentfulPaint > 1800) {
    issues.push({
      severity: 'warning',
      category: 'Performance',
      issue: 'Slow First Contentful Paint',
      value: `${Math.round(metrics.firstContentfulPaint)}ms`,
      recommendation: 'Optimize critical rendering path, reduce blocking resources'
    });
  }

  if (metrics.resourceCount > 100) {
    issues.push({
      severity: 'warning',
      category: 'Performance',
      issue: 'High number of resources',
      count: metrics.resourceCount,
      recommendation: 'Consider bundling, lazy loading, or using HTTP/2'
    });
  }

  // Find large resources
  const largeResources = metrics.resources
    .filter(r => r.size > 500000)
    .sort((a, b) => b.size - a.size)
    .slice(0, 5);

  if (largeResources.length > 0) {
    issues.push({
      severity: 'warning',
      category: 'Performance',
      issue: 'Large resources detected',
      details: largeResources.map(r => ({
        name: r.name,
        type: r.type,
        size: `${Math.round(r.size / 1024)}KB`
      }))
    });
  }

  return { metrics, issues };
}

async function testInteractiveElements(page) {
  console.log('\n🖱️  Testing Interactive Elements...');

  const issues = [];

  // Test all buttons are clickable
  const buttons = await page.$$('button, [role="button"]');
  console.log(`Found ${buttons.length} buttons/clickable elements`);

  // Check for hover states
  const elementsWithoutHover = await page.$$eval(
    'button, a, [role="button"], [role="link"]',
    elements => {
      return elements.filter(el => {
        const style = window.getComputedStyle(el);
        const cursor = style.cursor;
        return cursor === 'auto' || cursor === 'default';
      }).length;
    }
  );

  if (elementsWithoutHover > 0) {
    issues.push({
      severity: 'warning',
      category: 'UX',
      issue: 'Interactive elements without pointer cursor',
      count: elementsWithoutHover,
      recommendation: 'Add cursor: pointer to interactive elements'
    });
  }

  // Check for forms
  const forms = await page.$$('form');
  if (forms.length > 0) {
    console.log(`Found ${forms.length} forms`);

    for (const form of forms) {
      const hasSubmitButton = await form.$('button[type="submit"], input[type="submit"]');
      if (!hasSubmitButton) {
        issues.push({
          severity: 'warning',
          category: 'UX',
          issue: 'Form without submit button detected'
        });
      }
    }
  }

  return issues;
}

async function checkConsoleErrors(page) {
  console.log('\n🔍 Monitoring Console...');

  const consoleMessages = [];
  const errors = [];

  page.on('console', msg => {
    const type = msg.type();
    const text = msg.text();

    if (type === 'error') {
      errors.push({ type: 'error', message: text });
    } else if (type === 'warning') {
      consoleMessages.push({ type: 'warning', message: text });
    }
  });

  page.on('pageerror', error => {
    errors.push({ type: 'exception', message: error.message });
  });

  // Wait a bit to collect messages
  await page.waitForTimeout(2000);

  return { consoleMessages, errors };
}

async function generateReport(data) {
  const reportPath = path.join(OUTPUT_DIR, 'design-review-report.md');

  let report = `# 🎨 Design Review Report\n\n`;
  report += `**Generated:** ${new Date().toISOString()}\n`;
  report += `**URL:** ${BASE_URL}\n\n`;

  // Summary
  const criticalCount = data.allIssues.filter(i => i.severity === 'critical').length;
  const warningCount = data.allIssues.filter(i => i.severity === 'warning').length;
  const passCount = data.allIssues.filter(i => i.severity === 'pass').length;

  report += `## 📊 Summary\n\n`;
  report += `- 🔴 Critical Issues: ${criticalCount}\n`;
  report += `- 🟡 Warnings: ${warningCount}\n`;
  report += `- 🟢 Passed: ${passCount}\n\n`;

  // Screenshots
  report += `## 📸 Screenshots Captured\n\n`;
  for (const [category, shots] of Object.entries(data.screenshots)) {
    report += `### ${category.charAt(0).toUpperCase() + category.slice(1)}\n\n`;
    shots.forEach(shot => {
      report += `- ${shot.device} (${shot.width}×${shot.height}): \`${shot.screenshot}\`\n`;
    });
    report += `\n`;
  }

  // Issues by Category
  const categories = [...new Set(data.allIssues.map(i => i.category))];

  for (const category of categories) {
    const categoryIssues = data.allIssues.filter(i => i.category === category);

    report += `## ${category}\n\n`;

    for (const issue of categoryIssues) {
      const icon = issue.severity === 'critical' ? '🔴' :
                   issue.severity === 'warning' ? '🟡' : '🟢';

      report += `### ${icon} ${issue.issue}\n\n`;

      if (issue.count) report += `**Count:** ${issue.count}\n\n`;
      if (issue.value) report += `**Value:** ${issue.value}\n\n`;
      if (issue.recommendation) report += `**Recommendation:** ${issue.recommendation}\n\n`;

      if (issue.details && Array.isArray(issue.details)) {
        report += `**Details:**\n\`\`\`json\n${JSON.stringify(issue.details, null, 2)}\n\`\`\`\n\n`;
      }
    }
  }

  // Performance Metrics
  if (data.performance) {
    report += `## ⚡ Performance Metrics\n\n`;
    report += `- **First Contentful Paint:** ${Math.round(data.performance.metrics.firstContentfulPaint)}ms\n`;
    report += `- **DOM Content Loaded:** ${Math.round(data.performance.metrics.domContentLoaded)}ms\n`;
    report += `- **Resources Loaded:** ${data.performance.metrics.resourceCount}\n\n`;
  }

  // Console Errors
  if (data.console && data.console.errors.length > 0) {
    report += `## 🐛 Console Errors\n\n`;
    data.console.errors.forEach(error => {
      report += `- **[${error.type}]** ${error.message}\n`;
    });
    report += `\n`;
  }

  fs.writeFileSync(reportPath, report);
  console.log(`\n✅ Report generated: ${reportPath}`);

  return reportPath;
}

async function main() {
  console.log('🎨 Starting Design Review...\n');

  await ensureDir(OUTPUT_DIR);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36'
  });
  const page = await context.newPage();

  const data = {
    screenshots: {},
    allIssues: []
  };

  try {
    // Enable console monitoring
    const consoleData = await checkConsoleErrors(page);
    data.console = consoleData;

    // Navigate to main page
    console.log(`📍 Navigating to ${BASE_URL}...`);
    await page.goto(BASE_URL, { waitUntil: 'domcontentloaded', timeout: 15000 });
    await page.waitForTimeout(3000); // Wait for app to initialize

    // Capture screenshots
    console.log('\n📸 Capturing screenshots...');
    const screenshots = await captureScreenshots(page, BASE_URL, 'home');
    data.screenshots.home = screenshots;

    // Run accessibility audit
    const a11yIssues = await runAccessibilityAudit(page);
    data.allIssues.push(...a11yIssues);

    // Analyze performance
    const perfData = await analyzePerformance(page);
    data.performance = perfData;
    data.allIssues.push(...perfData.issues);

    // Test interactive elements
    const interactiveIssues = await testInteractiveElements(page);
    data.allIssues.push(...interactiveIssues);

    // Add console errors as issues
    if (consoleData.errors.length > 0) {
      data.allIssues.push({
        severity: 'critical',
        category: 'JavaScript',
        issue: 'Console errors detected',
        count: consoleData.errors.length,
        details: consoleData.errors
      });
    }

    // Generate report
    const reportPath = await generateReport(data);

    console.log('\n✨ Design review complete!');
    console.log(`📄 Full report: ${reportPath}`);
    console.log(`📁 Screenshots: ${path.join(OUTPUT_DIR, 'screenshots')}`);

  } catch (error) {
    console.error('❌ Error during design review:', error.message);
    throw error;
  } finally {
    await browser.close();
  }
}

main().catch(console.error);
