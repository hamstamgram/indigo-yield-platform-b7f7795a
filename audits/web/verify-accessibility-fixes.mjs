#!/usr/bin/env node
import puppeteer from 'puppeteer';
import axe from 'axe-core';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Define staging URLs to test
const STAGING_BASE_URL = 'https://indigo-yield-platform-v01.vercel.app';
const TEST_URLS = [
  { name: 'homepage', url: '/' },
  { name: 'about', url: '/about' },
  { name: 'strategies', url: '/strategies' },
  { name: 'faq', url: '/faq' },
  { name: 'privacy', url: '/privacy' },
  { name: 'terms', url: '/terms' }
];

async function runAccessibilityCheck(page, pageInfo) {
  console.log(`\n📊 Testing: ${pageInfo.name} (${pageInfo.url})`);
  
  const fullUrl = STAGING_BASE_URL + pageInfo.url;
  await page.goto(fullUrl, { waitUntil: 'networkidle0' });
  
  // Inject axe-core
  const axeSource = await fs.readFile(
    path.join(process.cwd(), 'node_modules/axe-core/axe.min.js'),
    'utf8'
  );
  await page.evaluate(axeSource);
  
  // Run accessibility check
  const results = await page.evaluate(() => {
    return new Promise((resolve) => {
      window.axe.run((err, results) => {
        if (err) throw err;
        resolve(results);
      });
    });
  });
  
  return results;
}

async function main() {
  console.log('🔍 Verifying Accessibility Fixes on Staging Environment');
  console.log('=' .repeat(60));
  
  const browser = await puppeteer.launch({ headless: 'new' });
  const page = await browser.newPage();
  
  // Track overall results
  const summary = {
    totalPages: TEST_URLS.length,
    pagesWithIssues: 0,
    criticalIssues: [],
    fixedIssues: []
  };
  
  for (const pageInfo of TEST_URLS) {
    try {
      const results = await runAccessibilityCheck(page, pageInfo);
      
      // Check for violations
      const violations = results.violations || [];
      
      if (violations.length > 0) {
        summary.pagesWithIssues++;
        console.log(`  ⚠️  Found ${violations.length} accessibility issues:`);
        
        violations.forEach(violation => {
          const severity = violation.impact;
          const violationInfo = {
            page: pageInfo.name,
            id: violation.id,
            impact: severity,
            description: violation.description,
            nodes: violation.nodes.length
          };
          
          // Check if this is a known issue we tried to fix
          if (violation.id === 'meta-viewport' || 
              violation.id === 'color-contrast' ||
              violation.id === 'landmark-unique') {
            console.log(`  ❌ ${severity.toUpperCase()}: ${violation.id} - Still present!`);
            summary.criticalIssues.push(violationInfo);
          } else {
            console.log(`  ⚠️  ${severity}: ${violation.id}`);
          }
        });
      } else {
        console.log('  ✅ No accessibility violations found!');
      }
      
      // Check specifically for our fixed issues
      const passedChecks = results.passes || [];
      const fixedChecks = ['meta-viewport', 'color-contrast'];
      
      fixedChecks.forEach(checkId => {
        const passed = passedChecks.some(p => p.id === checkId);
        if (passed) {
          console.log(`  ✅ Fixed: ${checkId}`);
          summary.fixedIssues.push({ page: pageInfo.name, issue: checkId });
        }
      });
      
    } catch (error) {
      console.error(`  ❌ Error testing ${pageInfo.name}:`, error.message);
    }
  }
  
  await browser.close();
  
  // Print summary
  console.log('\n' + '=' .repeat(60));
  console.log('📈 VERIFICATION SUMMARY');
  console.log('=' .repeat(60));
  console.log(`Total pages tested: ${summary.totalPages}`);
  console.log(`Pages with issues: ${summary.pagesWithIssues}`);
  
  if (summary.fixedIssues.length > 0) {
    console.log('\n✅ Successfully Fixed Issues:');
    summary.fixedIssues.forEach(fix => {
      console.log(`  - ${fix.issue} on ${fix.page}`);
    });
  }
  
  if (summary.criticalIssues.length > 0) {
    console.log('\n❌ Issues Still Present:');
    summary.criticalIssues.forEach(issue => {
      console.log(`  - ${issue.id} (${issue.impact}) on ${issue.page} - ${issue.nodes} instances`);
    });
  }
  
  // Save detailed results
  const reportPath = path.join(__dirname, 'accessibility', 'verification-report.json');
  await fs.mkdir(path.dirname(reportPath), { recursive: true });
  await fs.writeFile(reportPath, JSON.stringify({
    timestamp: new Date().toISOString(),
    summary,
    url: STAGING_BASE_URL
  }, null, 2));
  
  console.log(`\n📁 Detailed report saved to: ${reportPath}`);
  
  // Return exit code based on critical issues
  if (summary.criticalIssues.length > 0) {
    console.log('\n⚠️  Some accessibility issues remain. Review the report for details.');
    process.exit(1);
  } else {
    console.log('\n✅ All critical accessibility issues have been resolved!');
    process.exit(0);
  }
}

main().catch(console.error);
