#!/usr/bin/env node

import puppeteer from 'puppeteer';
import lighthouse from 'lighthouse';
import { exec } from 'child_process';
import { promisify } from 'util';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const execAsync = promisify(exec);
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration
const CONFIG = {
  baseUrl: process.env.BASE_URL || 'http://localhost:8080',
  pages: [
    { path: '/', name: 'Home' },
    { path: '/dashboard', name: 'Dashboard' },
    { path: '/portfolio', name: 'Portfolio' },
    { path: '/reports', name: 'Reports' },
    { path: '/settings', name: 'Settings' },
  ],
  lighthouse: {
    performance: 95,
    accessibility: 95,
    bestPractices: 95,
    seo: 90,
    pwa: 80,
  },
  webVitals: {
    LCP: 2500,
    FID: 100,
    CLS: 0.1,
    FCP: 1800,
    TTFB: 600,
  },
  loadTesting: {
    concurrent: 10,
    duration: 60, // seconds
    rampUp: 10,   // seconds
  },
};

// ANSI colors
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
};

/**
 * Run Lighthouse audit on a single page
 */
async function auditPage(url, browser) {
  console.log(`${colors.blue}Auditing: ${url}${colors.reset}`);

  const { lhr } = await lighthouse(url, {
    port: new URL(browser.wsEndpoint()).port,
    output: 'json',
    logLevel: 'error',
    onlyCategories: ['performance', 'accessibility', 'best-practices', 'seo', 'pwa'],
  });

  const scores = {
    performance: Math.round(lhr.categories.performance.score * 100),
    accessibility: Math.round(lhr.categories.accessibility.score * 100),
    bestPractices: Math.round(lhr.categories['best-practices'].score * 100),
    seo: Math.round(lhr.categories.seo.score * 100),
    pwa: Math.round(lhr.categories.pwa.score * 100),
  };

  const metrics = {
    FCP: lhr.audits['first-contentful-paint'].numericValue,
    LCP: lhr.audits['largest-contentful-paint'].numericValue,
    CLS: lhr.audits['cumulative-layout-shift'].numericValue,
    TBT: lhr.audits['total-blocking-time'].numericValue,
    TTI: lhr.audits['interactive'].numericValue,
    SpeedIndex: lhr.audits['speed-index'].numericValue,
  };

  return { scores, metrics, fullReport: lhr };
}

/**
 * Test Core Web Vitals using Puppeteer
 */
async function testWebVitals(page, url) {
  await page.goto(url, { waitUntil: 'networkidle0' });

  const vitals = await page.evaluate(() => {
    return new Promise((resolve) => {
      let metrics = {};

      // Observe LCP
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        const lastEntry = entries[entries.length - 1];
        metrics.LCP = lastEntry.renderTime || lastEntry.loadTime;
      }).observe({ type: 'largest-contentful-paint', buffered: true });

      // Observe FID
      new PerformanceObserver((list) => {
        const entries = list.getEntries();
        if (entries.length > 0) {
          metrics.FID = entries[0].processingStart - entries[0].startTime;
        }
      }).observe({ type: 'first-input', buffered: true });

      // Observe CLS
      let clsValue = 0;
      new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (!entry.hadRecentInput) {
            clsValue += entry.value;
          }
        }
        metrics.CLS = clsValue;
      }).observe({ type: 'layout-shift', buffered: true });

      // Get other timing metrics
      setTimeout(() => {
        const timing = performance.getEntriesByType('navigation')[0];
        metrics.TTFB = timing.responseStart - timing.requestStart;
        metrics.FCP = timing.responseStart;
        metrics.DOMContentLoaded = timing.domContentLoadedEventEnd - timing.domContentLoadedEventStart;
        metrics.Load = timing.loadEventEnd - timing.loadEventStart;

        resolve(metrics);
      }, 5000);
    });
  });

  return vitals;
}

/**
 * Load test using concurrent requests
 */
async function loadTest(url, config) {
  console.log(`${colors.cyan}Starting load test: ${config.concurrent} concurrent users${colors.reset}`);

  const results = {
    requests: 0,
    success: 0,
    errors: 0,
    responseTimes: [],
    errorDetails: [],
  };

  const startTime = Date.now();
  const endTime = startTime + (config.duration * 1000);

  const makeRequest = async () => {
    const requestStart = Date.now();

    try {
      const response = await fetch(url);
      const responseTime = Date.now() - requestStart;

      results.requests++;

      if (response.ok) {
        results.success++;
        results.responseTimes.push(responseTime);
      } else {
        results.errors++;
        results.errorDetails.push({
          status: response.status,
          statusText: response.statusText,
        });
      }
    } catch (error) {
      results.errors++;
      results.errorDetails.push({
        error: error.message,
      });
    }
  };

  // Start concurrent users
  const users = [];
  for (let i = 0; i < config.concurrent; i++) {
    // Ramp up users gradually
    await new Promise(resolve => setTimeout(resolve, (config.rampUp * 1000) / config.concurrent));

    users.push((async () => {
      while (Date.now() < endTime) {
        await makeRequest();
        // Small delay between requests
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    })());
  }

  await Promise.all(users);

  // Calculate statistics
  const stats = {
    totalRequests: results.requests,
    successRate: (results.success / results.requests * 100).toFixed(2),
    errorRate: (results.errors / results.requests * 100).toFixed(2),
    avgResponseTime: results.responseTimes.reduce((a, b) => a + b, 0) / results.responseTimes.length,
    minResponseTime: Math.min(...results.responseTimes),
    maxResponseTime: Math.max(...results.responseTimes),
    p50: percentile(results.responseTimes, 50),
    p95: percentile(results.responseTimes, 95),
    p99: percentile(results.responseTimes, 99),
    throughput: (results.requests / config.duration).toFixed(2),
  };

  return stats;
}

/**
 * Calculate percentile
 */
function percentile(arr, p) {
  const sorted = arr.slice().sort((a, b) => a - b);
  const index = Math.ceil(sorted.length * (p / 100)) - 1;
  return sorted[Math.max(0, index)];
}

/**
 * Generate HTML report
 */
async function generateHTMLReport(results) {
  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Performance Test Report - ${new Date().toISOString()}</title>
  <style>
    body {
      font-family: system-ui, -apple-system, sans-serif;
      line-height: 1.6;
      max-width: 1200px;
      margin: 0 auto;
      padding: 20px;
      background: #f5f5f5;
    }
    h1 { color: #333; border-bottom: 3px solid #007bff; padding-bottom: 10px; }
    h2 { color: #555; margin-top: 30px; }
    .summary { background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin: 20px 0; }
    .metric-card {
      background: white;
      padding: 15px;
      border-radius: 8px;
      box-shadow: 0 2px 4px rgba(0,0,0,0.1);
      text-align: center;
    }
    .metric-value { font-size: 2em; font-weight: bold; margin: 10px 0; }
    .metric-label { color: #666; font-size: 0.9em; }
    .good { color: #28a745; }
    .warning { color: #ffc107; }
    .error { color: #dc3545; }
    table { width: 100%; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
    th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
    th { background: #007bff; color: white; }
    tr:hover { background: #f8f9fa; }
    .chart { margin: 20px 0; padding: 20px; background: white; border-radius: 8px; }
  </style>
</head>
<body>
  <h1>🚀 Performance Test Report</h1>
  <div class="summary">
    <p><strong>Generated:</strong> ${new Date().toLocaleString()}</p>
    <p><strong>Environment:</strong> ${CONFIG.baseUrl}</p>
    <p><strong>Pages Tested:</strong> ${CONFIG.pages.length}</p>
  </div>

  <h2>📊 Lighthouse Scores</h2>
  <table>
    <thead>
      <tr>
        <th>Page</th>
        <th>Performance</th>
        <th>Accessibility</th>
        <th>Best Practices</th>
        <th>SEO</th>
        <th>PWA</th>
      </tr>
    </thead>
    <tbody>
      ${results.lighthouse.map(page => `
        <tr>
          <td>${page.name}</td>
          <td class="${getScoreClass(page.scores.performance)}">${page.scores.performance}</td>
          <td class="${getScoreClass(page.scores.accessibility)}">${page.scores.accessibility}</td>
          <td class="${getScoreClass(page.scores.bestPractices)}">${page.scores.bestPractices}</td>
          <td class="${getScoreClass(page.scores.seo, 90)}">${page.scores.seo}</td>
          <td class="${getScoreClass(page.scores.pwa, 80)}">${page.scores.pwa}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>⚡ Core Web Vitals</h2>
  <table>
    <thead>
      <tr>
        <th>Page</th>
        <th>LCP (ms)</th>
        <th>FID (ms)</th>
        <th>CLS</th>
        <th>FCP (ms)</th>
        <th>TTFB (ms)</th>
      </tr>
    </thead>
    <tbody>
      ${results.webVitals.map(page => `
        <tr>
          <td>${page.name}</td>
          <td class="${getVitalClass('LCP', page.metrics.LCP)}">${Math.round(page.metrics.LCP)}</td>
          <td class="${getVitalClass('FID', page.metrics.FID || 0)}">${Math.round(page.metrics.FID || 0)}</td>
          <td class="${getVitalClass('CLS', page.metrics.CLS)}">${page.metrics.CLS.toFixed(3)}</td>
          <td class="${getVitalClass('FCP', page.metrics.FCP)}">${Math.round(page.metrics.FCP)}</td>
          <td class="${getVitalClass('TTFB', page.metrics.TTFB)}">${Math.round(page.metrics.TTFB)}</td>
        </tr>
      `).join('')}
    </tbody>
  </table>

  <h2>🔥 Load Test Results</h2>
  ${results.loadTest ? `
    <div class="metric-grid">
      <div class="metric-card">
        <div class="metric-label">Total Requests</div>
        <div class="metric-value">${results.loadTest.totalRequests}</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Success Rate</div>
        <div class="metric-value ${results.loadTest.successRate > 95 ? 'good' : 'warning'}">${results.loadTest.successRate}%</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Avg Response Time</div>
        <div class="metric-value">${Math.round(results.loadTest.avgResponseTime)}ms</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P95 Response Time</div>
        <div class="metric-value">${Math.round(results.loadTest.p95)}ms</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">P99 Response Time</div>
        <div class="metric-value">${Math.round(results.loadTest.p99)}ms</div>
      </div>
      <div class="metric-card">
        <div class="metric-label">Throughput</div>
        <div class="metric-value">${results.loadTest.throughput} req/s</div>
      </div>
    </div>
  ` : '<p>Load test not performed</p>'}

  <h2>✅ Pass/Fail Summary</h2>
  <div class="summary">
    <p><strong>Lighthouse:</strong> ${results.summary.lighthouse.passed}/${results.summary.lighthouse.total} passed</p>
    <p><strong>Web Vitals:</strong> ${results.summary.webVitals.passed}/${results.summary.webVitals.total} passed</p>
    <p><strong>Overall Status:</strong> <span class="${results.summary.overall ? 'good' : 'error'}">${results.summary.overall ? 'PASSED' : 'FAILED'}</span></p>
  </div>

  <script>
    function getScoreClass(score, threshold = 95) {
      if (score >= threshold) return 'good';
      if (score >= threshold - 20) return 'warning';
      return 'error';
    }

    function getVitalClass(metric, value) {
      const thresholds = {
        LCP: { good: 2500, poor: 4000 },
        FID: { good: 100, poor: 300 },
        CLS: { good: 0.1, poor: 0.25 },
        FCP: { good: 1800, poor: 3000 },
        TTFB: { good: 600, poor: 1800 },
      };

      const threshold = thresholds[metric];
      if (value <= threshold.good) return 'good';
      if (value <= threshold.poor) return 'warning';
      return 'error';
    }
  </script>
</body>
</html>`;

  return html;
}

function getScoreClass(score, threshold = 95) {
  if (score >= threshold) return 'good';
  if (score >= threshold - 20) return 'warning';
  return 'error';
}

function getVitalClass(metric, value) {
  const thresholds = CONFIG.webVitals;
  if (value <= thresholds[metric]) return 'good';
  if (value <= thresholds[metric] * 1.5) return 'warning';
  return 'error';
}

/**
 * Main test runner
 */
async function runPerformanceTests() {
  console.log(`${colors.cyan}${colors.bright}🚀 Performance Testing Suite${colors.reset}\n`);
  console.log(`Testing: ${CONFIG.baseUrl}\n`);

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox'],
  });

  const results = {
    lighthouse: [],
    webVitals: [],
    loadTest: null,
    summary: {
      lighthouse: { passed: 0, total: 0 },
      webVitals: { passed: 0, total: 0 },
      overall: true,
    },
  };

  try {
    // Test each page
    for (const pageConfig of CONFIG.pages) {
      const url = `${CONFIG.baseUrl}${pageConfig.path}`;
      console.log(`\n${colors.bright}Testing: ${pageConfig.name}${colors.reset}`);
      console.log('═'.repeat(40));

      // Lighthouse audit
      const audit = await auditPage(url, browser);
      results.lighthouse.push({
        ...pageConfig,
        scores: audit.scores,
        metrics: audit.metrics,
      });

      // Check Lighthouse thresholds
      for (const [category, score] of Object.entries(audit.scores)) {
        const threshold = CONFIG.lighthouse[category];
        results.summary.lighthouse.total++;

        if (score >= threshold) {
          results.summary.lighthouse.passed++;
          console.log(`  ${colors.green}✓${colors.reset} ${category}: ${score} (threshold: ${threshold})`);
        } else {
          console.log(`  ${colors.red}✗${colors.reset} ${category}: ${score} (threshold: ${threshold})`);
          results.summary.overall = false;
        }
      }

      // Web Vitals test
      const page = await browser.newPage();
      const vitals = await testWebVitals(page, url);
      await page.close();

      results.webVitals.push({
        ...pageConfig,
        metrics: vitals,
      });

      // Check Web Vitals thresholds
      console.log('\nWeb Vitals:');
      for (const [metric, value] of Object.entries(vitals)) {
        if (CONFIG.webVitals[metric]) {
          results.summary.webVitals.total++;

          if (value <= CONFIG.webVitals[metric]) {
            results.summary.webVitals.passed++;
            console.log(`  ${colors.green}✓${colors.reset} ${metric}: ${Math.round(value)}ms (threshold: ${CONFIG.webVitals[metric]}ms)`);
          } else {
            console.log(`  ${colors.red}✗${colors.reset} ${metric}: ${Math.round(value)}ms (threshold: ${CONFIG.webVitals[metric]}ms)`);
            results.summary.overall = false;
          }
        }
      }
    }

    // Run load test on homepage
    console.log(`\n${colors.bright}Load Testing${colors.reset}`);
    console.log('═'.repeat(40));

    results.loadTest = await loadTest(`${CONFIG.baseUrl}/`, CONFIG.loadTesting);

    console.log(`  Total Requests: ${results.loadTest.totalRequests}`);
    console.log(`  Success Rate: ${results.loadTest.successRate}%`);
    console.log(`  Avg Response: ${Math.round(results.loadTest.avgResponseTime)}ms`);
    console.log(`  P95: ${Math.round(results.loadTest.p95)}ms`);
    console.log(`  Throughput: ${results.loadTest.throughput} req/s`);

  } finally {
    await browser.close();
  }

  // Generate reports
  console.log(`\n${colors.bright}Generating Reports${colors.reset}`);
  console.log('═'.repeat(40));

  // Save JSON report
  const jsonReport = path.join(process.cwd(), 'performance-report.json');
  await fs.writeFile(jsonReport, JSON.stringify(results, null, 2));
  console.log(`  ${colors.green}✓${colors.reset} JSON report: ${jsonReport}`);

  // Save HTML report
  const htmlReport = path.join(process.cwd(), 'performance-report.html');
  const html = await generateHTMLReport(results);
  await fs.writeFile(htmlReport, html);
  console.log(`  ${colors.green}✓${colors.reset} HTML report: ${htmlReport}`);

  // Summary
  console.log(`\n${colors.bright}Summary${colors.reset}`);
  console.log('═'.repeat(40));
  console.log(`  Lighthouse: ${results.summary.lighthouse.passed}/${results.summary.lighthouse.total} passed`);
  console.log(`  Web Vitals: ${results.summary.webVitals.passed}/${results.summary.webVitals.total} passed`);

  if (results.summary.overall) {
    console.log(`\n${colors.green}${colors.bright}✅ All performance tests PASSED!${colors.reset}`);
    process.exit(0);
  } else {
    console.log(`\n${colors.red}${colors.bright}❌ Some performance tests FAILED!${colors.reset}`);
    process.exit(1);
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);

  if (args.includes('--help') || args.includes('-h')) {
    console.log(`
Performance Testing Suite
-------------------------
Comprehensive performance testing including Lighthouse, Web Vitals, and load testing.

Usage:
  node performance-test.mjs [options]

Options:
  --url <url>        Base URL to test (default: http://localhost:3000)
  --concurrent <n>   Number of concurrent users for load test (default: 10)
  --duration <s>     Load test duration in seconds (default: 60)
  --help, -h         Show this help message

Examples:
  node performance-test.mjs
  node performance-test.mjs --url https://staging.example.com
  node performance-test.mjs --concurrent 50 --duration 120
    `);
    return;
  }

  // Parse arguments
  const urlIndex = args.indexOf('--url');
  if (urlIndex > -1 && args[urlIndex + 1]) {
    CONFIG.baseUrl = args[urlIndex + 1];
  }

  const concurrentIndex = args.indexOf('--concurrent');
  if (concurrentIndex > -1 && args[concurrentIndex + 1]) {
    CONFIG.loadTesting.concurrent = parseInt(args[concurrentIndex + 1]);
  }

  const durationIndex = args.indexOf('--duration');
  if (durationIndex > -1 && args[durationIndex + 1]) {
    CONFIG.loadTesting.duration = parseInt(args[durationIndex + 1]);
  }

  await runPerformanceTests();
}

// Run if executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { runPerformanceTests, auditPage, testWebVitals, loadTest };