/**
 * Automated Report Generation Test Runner
 * Tests all 13 report types across all 4 formats (52 combinations)
 *
 * Usage:
 *   ts-node test-reports/automated-test-runner.ts
 *
 * Or integrate into test suite:
 *   import { runAllReportTests } from './test-reports/automated-test-runner';
 */

import { ReportsApi } from '../src/services/api/reportsApi';
import { ReportType, ReportFormat } from '../src/types/reports';
import { writeFileSync } from 'fs';
import { format } from 'date-fns';

// Test configuration
const TEST_CONFIG = {
  dateRangeStart: '2024-01-01',
  dateRangeEnd: '2024-12-31',
  timeout: 30000, // 30 seconds per test
  saveReports: true, // Save generated reports to disk
  outputDir: './test-reports/generated',
};

// All report types to test
const REPORT_TYPES: ReportType[] = [
  // Investor Reports
  'portfolio_performance',
  'transaction_history',
  'tax_report',
  'monthly_statement',
  'annual_summary',
  'custom_date_range',

  // Admin Reports
  'aum_report',
  'investor_activity',
  'transaction_volume',
  'compliance_report',
  'fund_performance',
  'fee_analysis',
  'audit_trail',
];

// All formats to test
const FORMATS: ReportFormat[] = ['pdf', 'excel', 'csv', 'json'];

interface TestResult {
  reportType: ReportType;
  format: ReportFormat;
  status: 'pass' | 'fail' | 'skip';
  duration: number;
  fileSize?: number;
  error?: string;
  timestamp: string;
}

interface TestSummary {
  totalTests: number;
  passed: number;
  failed: number;
  skipped: number;
  totalDuration: number;
  passRate: number;
  results: TestResult[];
}

/**
 * Test a single report type/format combination
 */
async function testReportGeneration(
  reportType: ReportType,
  format: ReportFormat
): Promise<TestResult> {
  const startTime = Date.now();
  const result: TestResult = {
    reportType,
    format,
    status: 'fail',
    duration: 0,
    timestamp: new Date().toISOString(),
  };

  try {
    console.log(`Testing ${reportType} - ${format}...`);

    // Generate report
    const response = await Promise.race([
      ReportsApi.generateReportNow({
        reportType,
        format,
        filters: {
          dateRangeStart: TEST_CONFIG.dateRangeStart,
          dateRangeEnd: TEST_CONFIG.dateRangeEnd,
        },
        parameters: {
          includeCharts: true,
          includeTransactions: true,
          includeDisclosures: true,
        },
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Timeout')), TEST_CONFIG.timeout)
      ),
    ]);

    const duration = Date.now() - startTime;

    // Verify success
    if (!response.success) {
      result.error = response.error || 'Unknown error';
      result.status = 'fail';
    } else if (!response.data) {
      result.error = 'No data returned';
      result.status = 'fail';
    } else {
      // Success - verify file
      result.fileSize = response.data.length;

      // Basic validation
      if (result.fileSize === 0) {
        result.error = 'Empty file generated';
        result.status = 'fail';
      } else {
        result.status = 'pass';

        // Save report if configured
        if (TEST_CONFIG.saveReports && response.filename) {
          const filePath = `${TEST_CONFIG.outputDir}/${response.filename}`;
          try {
            writeFileSync(filePath, response.data);
            console.log(`  Saved: ${filePath}`);
          } catch (saveError) {
            console.warn(`  Failed to save: ${saveError}`);
          }
        }
      }
    }

    result.duration = duration;

    console.log(`  Result: ${result.status} (${duration}ms, ${result.fileSize || 0} bytes)`);
  } catch (error) {
    result.duration = Date.now() - startTime;
    result.error = error instanceof Error ? error.message : 'Unknown error';
    result.status = 'fail';
    console.error(`  Error: ${result.error}`);
  }

  return result;
}

/**
 * Test all combinations
 */
export async function runAllReportTests(): Promise<TestSummary> {
  console.log('Starting comprehensive report generation tests...\n');
  console.log(`Testing ${REPORT_TYPES.length} report types × ${FORMATS.length} formats = ${REPORT_TYPES.length * FORMATS.length} combinations\n`);

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;
  let skipped = 0;

  // Test each combination
  for (const reportType of REPORT_TYPES) {
    console.log(`\n📊 Testing ${reportType}:`);

    for (const format of FORMATS) {
      const result = await testReportGeneration(reportType, format);
      results.push(result);

      if (result.status === 'pass') passed++;
      else if (result.status === 'fail') failed++;
      else if (result.status === 'skip') skipped++;

      // Small delay between tests to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  // Calculate summary
  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);
  const summary: TestSummary = {
    totalTests: results.length,
    passed,
    failed,
    skipped,
    totalDuration,
    passRate: (passed / results.length) * 100,
    results,
  };

  // Print summary
  console.log('\n' + '='.repeat(80));
  console.log('TEST SUMMARY');
  console.log('='.repeat(80));
  console.log(`Total Tests: ${summary.totalTests}`);
  console.log(`Passed: ${summary.passed} ✅`);
  console.log(`Failed: ${summary.failed} ❌`);
  console.log(`Skipped: ${summary.skipped} ⏭️`);
  console.log(`Pass Rate: ${summary.passRate.toFixed(2)}%`);
  console.log(`Total Duration: ${(summary.totalDuration / 1000).toFixed(2)}s`);
  console.log(`Average Duration: ${(summary.totalDuration / summary.totalTests).toFixed(0)}ms`);
  console.log('='.repeat(80));

  // Print failures
  if (failed > 0) {
    console.log('\nFailed Tests:');
    results
      .filter(r => r.status === 'fail')
      .forEach(r => {
        console.log(`  ❌ ${r.reportType} - ${r.format}: ${r.error}`);
      });
  }

  // Save results to file
  const reportPath = `${TEST_CONFIG.outputDir}/test-results-${format(new Date(), 'yyyyMMdd-HHmmss')}.json`;
  writeFileSync(reportPath, JSON.stringify(summary, null, 2));
  console.log(`\nDetailed results saved to: ${reportPath}`);

  return summary;
}

/**
 * Test specific report type across all formats
 */
export async function testReportType(reportType: ReportType): Promise<TestSummary> {
  console.log(`Testing ${reportType} across all formats...\n`);

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const format of FORMATS) {
    const result = await testReportGeneration(reportType, format);
    results.push(result);

    if (result.status === 'pass') passed++;
    else if (result.status === 'fail') failed++;

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  return {
    totalTests: results.length,
    passed,
    failed,
    skipped: 0,
    totalDuration,
    passRate: (passed / results.length) * 100,
    results,
  };
}

/**
 * Test specific format across all report types
 */
export async function testFormat(format: ReportFormat): Promise<TestSummary> {
  console.log(`Testing ${format} format across all report types...\n`);

  const results: TestResult[] = [];
  let passed = 0;
  let failed = 0;

  for (const reportType of REPORT_TYPES) {
    const result = await testReportGeneration(reportType, format);
    results.push(result);

    if (result.status === 'pass') passed++;
    else if (result.status === 'fail') failed++;

    await new Promise(resolve => setTimeout(resolve, 100));
  }

  const totalDuration = results.reduce((sum, r) => sum + r.duration, 0);

  return {
    totalTests: results.length,
    passed,
    failed,
    skipped: 0,
    totalDuration,
    passRate: (passed / results.length) * 100,
    results,
  };
}

/**
 * Performance benchmark test
 */
export async function runPerformanceBenchmark(): Promise<void> {
  console.log('Running performance benchmark...\n');

  const benchmarks = [
    {
      name: 'Small Report (Portfolio Performance)',
      reportType: 'portfolio_performance' as ReportType,
      expected: { pdf: 2000, excel: 2000, csv: 1000, json: 1000 },
    },
    {
      name: 'Medium Report (Transaction History)',
      reportType: 'transaction_history' as ReportType,
      expected: { pdf: 5000, excel: 5000, csv: 2000, json: 2000 },
    },
    {
      name: 'Large Report (Annual Summary)',
      reportType: 'annual_summary' as ReportType,
      expected: { pdf: 10000, excel: 10000, csv: 5000, json: 5000 },
    },
  ];

  for (const benchmark of benchmarks) {
    console.log(`\n${benchmark.name}:`);

    for (const format of FORMATS) {
      const result = await testReportGeneration(benchmark.reportType, format);
      const expected = benchmark.expected[format];
      const status = result.duration <= expected ? '✅' : '⚠️';

      console.log(
        `  ${format.toUpperCase()}: ${result.duration}ms / ${expected}ms ${status}`
      );
    }
  }
}

// CLI execution
if (require.main === module) {
  const args = process.argv.slice(2);
  const command = args[0];

  (async () => {
    if (command === 'all') {
      await runAllReportTests();
    } else if (command === 'type' && args[1]) {
      await testReportType(args[1] as ReportType);
    } else if (command === 'format' && args[1]) {
      await testFormat(args[1] as ReportFormat);
    } else if (command === 'benchmark') {
      await runPerformanceBenchmark();
    } else {
      console.log('Usage:');
      console.log('  ts-node automated-test-runner.ts all');
      console.log('  ts-node automated-test-runner.ts type <report_type>');
      console.log('  ts-node automated-test-runner.ts format <pdf|excel|csv|json>');
      console.log('  ts-node automated-test-runner.ts benchmark');
    }
  })();
}
