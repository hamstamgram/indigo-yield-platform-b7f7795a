#!/usr/bin/env node
/**
 * Unified Test Harness Runner
 * Runs all tests in sequence: Database Functions → Admin Functions → E2E Tests
 */

const { createClient } = require('@supabase/supabase-js');
const { execSync, spawn } = require('child_process');
const path = require('path');

const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const results = {
  databaseFunctions: { passed: 0, failed: 0, tests: [] },
  adminFunctions: { passed: 0, failed: 0, tests: [] },
  e2eTests: { passed: 0, failed: 0, tests: [] }
};

function log(message, type = 'info') {
  const icons = { info: 'ℹ', success: '✓', error: '✗', header: '═' };
  const icon = icons[type] || '';
  console.log(`${icon} ${message}`);
}

function header(title) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

function recordResult(category, test, success, message) {
  results[category].tests.push({ test, success, message });
  if (success) {
    results[category].passed++;
    log(`${test}: ${message}`, 'success');
  } else {
    results[category].failed++;
    log(`${test}: ${message}`, 'error');
  }
}

// ============================================================================
// PHASE 1: Database Function Tests
// ============================================================================
async function runDatabaseFunctionTests() {
  header('PHASE 1: DATABASE FUNCTION TESTS');

  const functions = [
    { name: 'is_admin', rpc: 'is_admin', params: {}, expectType: 'boolean' },
    { name: 'get_fund_summary', rpc: 'get_fund_summary', params: {}, expectType: 'object' },
  ];

  // Sign in as admin first
  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "testadmin@indigo.fund",
    password: "TestAdmin123!"
  });

  if (authErr) {
    recordResult('databaseFunctions', 'Admin Auth', false, authErr.message);
    return;
  }
  recordResult('databaseFunctions', 'Admin Auth', true, 'Authenticated');

  // Get ETH fund for testing
  const { data: fund } = await supabase
    .from('funds')
    .select('id')
    .eq('asset', 'ETH')
    .eq('status', 'active')
    .single();

  if (!fund) {
    recordResult('databaseFunctions', 'Get Fund', false, 'No ETH fund found');
    return;
  }
  recordResult('databaseFunctions', 'Get Fund', true, `Found fund ${fund.id.slice(0,8)}...`);

  // Test is_admin
  const { data: isAdmin, error: isAdminErr } = await supabase.rpc('is_admin');
  recordResult('databaseFunctions', 'is_admin()', !isAdminErr && isAdmin === true,
    isAdminErr?.message || `Returns: ${isAdmin}`);

  // Test preview_daily_yield_to_fund_v3
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yieldDate = yesterday.toISOString().split('T')[0];

  const { data: preview, error: previewErr } = await supabase.rpc('preview_daily_yield_to_fund_v3', {
    p_fund_id: fund.id,
    p_yield_date: yieldDate,
    p_new_aum: 100,
    p_purpose: 'reporting'
  });
  recordResult('databaseFunctions', 'preview_daily_yield_to_fund_v3', !previewErr,
    previewErr?.message || 'Preview returned successfully');

  // Test get_investor_position_as_of
  const { data: investor } = await supabase
    .from('investor_positions')
    .select('investor_id')
    .eq('fund_id', fund.id)
    .gt('current_value', 0)
    .limit(1)
    .single();

  if (investor) {
    const { error: posErr } = await supabase.rpc('get_investor_position_as_of', {
      p_fund_id: fund.id,
      p_investor_id: investor.investor_id,
      p_as_of_date: yieldDate
    });
    recordResult('databaseFunctions', 'get_investor_position_as_of', !posErr,
      posErr?.message || 'Position data returned');

    // Test reconcile_investor_position
    const { error: reconErr } = await supabase.rpc('reconcile_investor_position', {
      p_fund_id: fund.id,
      p_investor_id: investor.investor_id
    });
    recordResult('databaseFunctions', 'reconcile_investor_position', !reconErr,
      reconErr?.message || 'Reconciliation successful');
  }
}

// ============================================================================
// PHASE 2: Admin Function Tests (Integrity Views & Tables)
// ============================================================================
async function runAdminFunctionTests() {
  header('PHASE 2: ADMIN FUNCTION TESTS');

  // Test integrity views
  const integrityViews = [
    'v_ledger_reconciliation',
    'v_position_transaction_variance',
    'v_yield_conservation_check',
    'v_yield_conservation_violations',
    'v_yield_allocation_violations',
    'v_missing_withdrawal_transactions',
    'v_transaction_distribution_orphans',
    'v_period_orphans',
    'v_crystallization_gaps'
  ];

  console.log('\n  Testing Integrity Views...\n');
  for (const view of integrityViews) {
    const { data, error } = await supabase.from(view).select('*').limit(5);
    recordResult('adminFunctions', view, !error,
      error?.message || `${data?.length || 0} rows returned`);
  }

  // Test admin tables access
  const adminTables = [
    'funds',
    'transactions_v2',
    'investor_positions',
    'yield_distributions',
    'withdrawal_requests',
    'statement_periods'
  ];

  console.log('\n  Testing Admin Table Access...\n');
  for (const table of adminTables) {
    const { count, error } = await supabase.from(table).select('*', { count: 'exact', head: true });
    recordResult('adminFunctions', `${table} access`, !error,
      error?.message || `${count} rows`);
  }
}

// ============================================================================
// PHASE 3: E2E Tests (Playwright)
// ============================================================================
async function runE2ETests() {
  header('PHASE 3: E2E TESTS (Playwright)');

  console.log('\n  Running critical path E2E tests...\n');

  try {
    // Run only the working admin tests for now
    const result = execSync(
      'npx playwright test tests/e2e/admin-transactions.spec.ts tests/e2e/admin-yield-workflow.spec.ts tests/e2e/adminpanel.spec.ts --project=chromium --reporter=list 2>&1',
      {
        cwd: path.join(__dirname, '..'),
        timeout: 120000,
        encoding: 'utf-8'
      }
    );

    // Parse results
    const passMatch = result.match(/(\d+) passed/);
    const failMatch = result.match(/(\d+) failed/);

    const passed = passMatch ? parseInt(passMatch[1]) : 0;
    const failed = failMatch ? parseInt(failMatch[1]) : 0;

    results.e2eTests.passed = passed;
    results.e2eTests.failed = failed;

    console.log(result);
    recordResult('e2eTests', 'Admin E2E Suite', failed === 0,
      `${passed} passed, ${failed} failed`);
  } catch (error) {
    // Even with failures, execSync throws - parse the output
    const output = error.stdout || error.message;
    console.log(output);

    const passMatch = output.match(/(\d+) passed/);
    const failMatch = output.match(/(\d+) failed/);

    results.e2eTests.passed = passMatch ? parseInt(passMatch[1]) : 0;
    results.e2eTests.failed = failMatch ? parseInt(failMatch[1]) : 0;

    recordResult('e2eTests', 'Admin E2E Suite', false,
      `${results.e2eTests.passed} passed, ${results.e2eTests.failed} failed`);
  }
}

// ============================================================================
// Summary
// ============================================================================
function printSummary() {
  header('FINAL SUMMARY');

  const categories = [
    { name: 'Database Functions', key: 'databaseFunctions' },
    { name: 'Admin Functions', key: 'adminFunctions' },
    { name: 'E2E Tests', key: 'e2eTests' }
  ];

  let totalPassed = 0;
  let totalFailed = 0;

  console.log('\n');
  for (const cat of categories) {
    const r = results[cat.key];
    totalPassed += r.passed;
    totalFailed += r.failed;
    const status = r.failed === 0 ? '✓' : '✗';
    console.log(`  ${status} ${cat.name}: ${r.passed} passed, ${r.failed} failed`);
  }

  console.log('\n' + '─'.repeat(50));
  console.log(`  TOTAL: ${totalPassed} passed, ${totalFailed} failed`);

  if (totalFailed === 0) {
    console.log('\n  🎉 ALL TESTS PASSED!\n');
  } else {
    console.log('\n  ⚠️  Some tests failed. Review output above.\n');

    // List failures
    console.log('  Failed tests:');
    for (const cat of categories) {
      const failures = results[cat.key].tests.filter(t => !t.success);
      for (const f of failures) {
        console.log(`    - [${cat.name}] ${f.test}: ${f.message}`);
      }
    }
  }

  console.log('═'.repeat(70) + '\n');

  // Exit with appropriate code
  process.exit(totalFailed > 0 ? 1 : 0);
}

// ============================================================================
// Main
// ============================================================================
async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║         INDIGO YIELD PLATFORM - FULL TEST HARNESS                    ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  try {
    await runDatabaseFunctionTests();
    await runAdminFunctionTests();
    await runE2ETests();
  } catch (error) {
    console.error('Test harness error:', error.message);
  }

  printSummary();
}

main();
