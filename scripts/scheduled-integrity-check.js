#!/usr/bin/env node
/**
 * SCHEDULED INTEGRITY CHECK
 *
 * Runs all integrity views to check for data consistency issues.
 * Logs violations to admin_alerts table and sends webhook notifications
 * when critical issues are found.
 *
 * Usage:
 *   node scripts/scheduled-integrity-check.js
 *   node scripts/scheduled-integrity-check.js --dry-run
 *   node scripts/scheduled-integrity-check.js --webhook-url=https://hooks.slack.com/...
 *
 * Environment Variables:
 *   SUPABASE_URL - Supabase project URL (required)
 *   SUPABASE_SERVICE_ROLE_KEY - Service role key (required)
 *   SLACK_WEBHOOK_URL - Webhook URL for Slack notifications
 *   ALERT_WEBHOOK_URL - Generic webhook URL for alerts
 *   ALERT_EMAIL - Email for alerts (future use)
 *
 * Exit Codes:
 *   0 - All checks passed
 *   1 - Critical violations found
 *   2 - Configuration/runtime error
 */

const { createClient } = require('@supabase/supabase-js');
const path = require('path');

// Load environment from .env file if available
try {
  require('dotenv').config({ path: path.join(__dirname, '..', '.env') });
} catch (e) {
  // dotenv not available, rely on environment variables
}

// ============================================================================
// Configuration
// ============================================================================

const CONFIG = {
  // Supabase credentials (env vars or hardcoded fallback for local dev)
  supabaseUrl: process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || "https://nkfimvovosdehmyyjubn.supabase.co",
  supabaseKey: process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_SERVICE_KEY,

  // Webhook configuration
  webhookUrl: process.env.SLACK_WEBHOOK_URL || process.env.ALERT_WEBHOOK_URL,
  alertEmail: process.env.ALERT_EMAIL,

  // Check configuration
  toleranceThreshold: 0.01, // Amount below which variance is ignored
  sampleLimit: 5, // Max samples per check type
};

// Parse command line arguments
const args = process.argv.slice(2);
const isDryRun = args.includes('--dry-run');
const isVerbose = args.includes('--verbose') || args.includes('-v');
const webhookOverride = args.find(a => a.startsWith('--webhook-url='));
if (webhookOverride) {
  CONFIG.webhookUrl = webhookOverride.split('=')[1];
}

// ============================================================================
// Integrity Check Definitions
// ============================================================================

const INTEGRITY_CHECKS = [
  {
    name: 'Ledger Reconciliation',
    view: 'v_ledger_reconciliation',
    severity: 'critical',
    description: 'Position current_value does not match sum of ledger transactions',
    query: null, // Use view directly
  },
  {
    name: 'Position Transaction Variance',
    view: 'v_position_transaction_variance',
    severity: 'critical',
    description: 'Detailed breakdown of position/ledger variance by transaction type',
    query: null,
  },
  {
    name: 'Yield Conservation Violations',
    view: 'v_yield_conservation_violations',
    severity: 'critical',
    description: 'Yield distributions that violate conservation identity (gross != investor + platform + ib)',
    query: null,
  },
  {
    name: 'Yield Allocation Violations',
    view: 'v_yield_allocation_violations',
    severity: 'critical',
    description: 'Yield allocations that do not sum to distribution total',
    query: null,
  },
  {
    name: 'Crystallization Gaps',
    view: 'v_crystallization_gaps',
    severity: 'warning',
    description: 'Positions with stale or missing crystallization records',
    query: null,
  },
  {
    name: 'Fund AUM Mismatch',
    view: 'fund_aum_mismatch',
    severity: 'critical',
    description: 'Fund AUM does not match sum of investor positions',
    query: null,
  },
  {
    name: 'Transaction Distribution Orphans',
    view: 'v_transaction_distribution_orphans',
    severity: 'critical',
    description: 'Transactions missing required distribution links',
    query: null,
  },
  {
    name: 'Period Orphans',
    view: 'v_period_orphans',
    severity: 'warning',
    description: 'Statement periods with orphaned or inconsistent data',
    query: null,
  },
  {
    name: 'IB Allocation Orphans',
    view: 'v_ib_allocation_orphans',
    severity: 'warning',
    description: 'Introducing broker allocations missing distribution references',
    query: null,
  },
  {
    name: 'Fee Allocation Orphans',
    view: 'v_fee_allocation_orphans',
    severity: 'warning',
    description: 'Fee allocations with missing references',
    query: null,
  },
  {
    name: 'Missing Withdrawal Transactions',
    view: 'v_missing_withdrawal_transactions',
    severity: 'critical',
    description: 'Completed withdrawals without corresponding ledger transactions',
    query: null,
  },
  {
    name: 'Potential Duplicate Profiles',
    view: 'v_potential_duplicate_profiles',
    severity: 'warning',
    description: 'Duplicate investor profiles detected',
    query: null,
    filter: "duplicate_type = 'email_duplicate'",
  },
];

// ============================================================================
// Supabase Client
// ============================================================================

function createSupabaseClient() {
  if (!CONFIG.supabaseUrl || !CONFIG.supabaseKey) {
    console.error('ERROR: Missing Supabase credentials.');
    console.error('Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY environment variables.');
    process.exit(2);
  }

  return createClient(CONFIG.supabaseUrl, CONFIG.supabaseKey);
}

// ============================================================================
// Check Execution
// ============================================================================

async function runCheck(supabase, check) {
  const startTime = Date.now();

  try {
    let query = supabase.from(check.view).select('*');

    // Apply filter if specified
    if (check.filter) {
      // Parse simple equality filters
      const match = check.filter.match(/(\w+)\s*=\s*'([^']+)'/);
      if (match) {
        query = query.eq(match[1], match[2]);
      }
    }

    query = query.limit(CONFIG.sampleLimit);

    const { data, error } = await query;

    if (error) {
      // View might not exist - this is not a failure, just skip
      if (error.code === '42P01' || error.message.includes('does not exist')) {
        return {
          name: check.name,
          view: check.view,
          status: 'skipped',
          severity: check.severity,
          count: 0,
          description: `View ${check.view} does not exist`,
          sample: null,
          duration_ms: Date.now() - startTime,
        };
      }

      return {
        name: check.name,
        view: check.view,
        status: 'error',
        severity: check.severity,
        count: -1,
        description: `Error: ${error.message}`,
        sample: null,
        duration_ms: Date.now() - startTime,
      };
    }

    const count = data ? data.length : 0;
    const hasIssues = count > 0;

    return {
      name: check.name,
      view: check.view,
      status: hasIssues ? 'fail' : 'pass',
      severity: check.severity,
      count: count,
      description: check.description,
      sample: hasIssues ? data.slice(0, 3) : null,
      duration_ms: Date.now() - startTime,
    };

  } catch (err) {
    return {
      name: check.name,
      view: check.view,
      status: 'error',
      severity: check.severity,
      count: -1,
      description: `Exception: ${err.message}`,
      sample: null,
      duration_ms: Date.now() - startTime,
    };
  }
}

async function runAllChecks(supabase) {
  console.log('Running integrity checks...\n');

  const results = [];

  for (const check of INTEGRITY_CHECKS) {
    const result = await runCheck(supabase, check);
    results.push(result);

    // Log progress
    const icon = result.status === 'pass' ? '[PASS]' :
                 result.status === 'fail' ? '[FAIL]' :
                 result.status === 'skipped' ? '[SKIP]' : '[ERR ]';
    const severityTag = result.severity === 'critical' ? 'CRIT' : 'WARN';

    console.log(`${icon} [${severityTag}] ${result.name}: ${result.count >= 0 ? result.count + ' issues' : result.description}`);

    if (isVerbose && result.sample) {
      console.log('  Sample:', JSON.stringify(result.sample[0], null, 2).split('\n').map(l => '    ' + l).join('\n'));
    }
  }

  return results;
}

// ============================================================================
// Alert Logging
// ============================================================================

async function logToAdminAlerts(supabase, results, runId) {
  const failures = results.filter(r => r.status === 'fail');
  const criticalFailures = failures.filter(r => r.severity === 'critical');

  if (criticalFailures.length === 0) {
    return; // No critical issues, no alert needed
  }

  const alertData = {
    alert_type: 'integrity_violation',
    severity: 'critical',
    title: `Integrity Check Failed: ${criticalFailures.length} critical issues`,
    message: criticalFailures.map(f => `${f.name}: ${f.count} violations`).join('; '),
    metadata: {
      total_checks: results.length,
      total_failures: failures.length,
      critical_failures: criticalFailures.length,
      triggered_by: 'scheduled_integrity_check',
      run_id: runId,
      check_details: failures.map(f => ({
        name: f.name,
        view: f.view,
        count: f.count,
        severity: f.severity,
      })),
    },
    related_run_id: runId,
  };

  const { error } = await supabase.from('admin_alerts').insert(alertData);

  if (error) {
    console.error('Failed to log to admin_alerts:', error.message);
  } else {
    console.log('\nAlert logged to admin_alerts table.');
  }
}

async function logIntegrityRun(supabase, results, runtimeMs) {
  const failures = results.filter(r => r.status === 'fail');

  const violations = failures.map(f => ({
    view: f.view,
    name: f.name,
    count: f.count,
    severity: f.severity,
    description: f.description,
    sample: f.sample || [],
  }));

  const runData = {
    status: failures.length === 0 ? 'pass' : 'fail',
    violations: violations,
    runtime_ms: runtimeMs,
    triggered_by: 'scheduled_integrity_check',
    context: `script:${isDryRun ? 'dry_run' : 'production'}`,
  };

  const { data, error } = await supabase
    .from('admin_integrity_runs')
    .insert(runData)
    .select('id')
    .single();

  if (error) {
    console.error('Failed to log integrity run:', error.message);
    return null;
  }

  console.log(`\nIntegrity run logged with ID: ${data.id}`);
  return data.id;
}

// ============================================================================
// Webhook Notifications
// ============================================================================

async function sendWebhookNotification(results) {
  if (!CONFIG.webhookUrl) {
    if (isVerbose) {
      console.log('\nNo webhook URL configured, skipping notification.');
    }
    return;
  }

  const failures = results.filter(r => r.status === 'fail');
  if (failures.length === 0) {
    if (isVerbose) {
      console.log('\nNo failures, skipping webhook notification.');
    }
    return;
  }

  const criticalCount = failures.filter(r => r.severity === 'critical').length;
  const warningCount = failures.filter(r => r.severity === 'warning').length;

  // Build Slack-compatible block format
  const blocks = [
    {
      type: 'header',
      text: {
        type: 'plain_text',
        text: 'Indigo Platform Integrity Alert',
        emoji: false,
      },
    },
    {
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `*${criticalCount} critical* and *${warningCount} warning* issues detected.`,
      },
    },
    { type: 'divider' },
  ];

  // Add failure details
  for (const f of failures.slice(0, 10)) { // Limit to 10 to avoid message size limits
    const icon = f.severity === 'critical' ? ':red_circle:' : ':warning:';
    blocks.push({
      type: 'section',
      text: {
        type: 'mrkdwn',
        text: `${icon} *${f.name}*\n${f.description}\nAffected records: ${f.count}`,
      },
    });
  }

  blocks.push({
    type: 'context',
    elements: [
      {
        type: 'mrkdwn',
        text: `Checked at ${new Date().toISOString()} | View: Admin Dashboard`,
      },
    ],
  });

  try {
    const response = await fetch(CONFIG.webhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ blocks }),
    });

    if (!response.ok) {
      console.error(`Webhook failed with status ${response.status}`);
    } else {
      console.log('\nWebhook notification sent successfully.');
    }
  } catch (err) {
    console.error('Failed to send webhook:', err.message);
  }
}

// ============================================================================
// Summary Report
// ============================================================================

function printSummary(results, runtimeMs) {
  const total = results.length;
  const passed = results.filter(r => r.status === 'pass').length;
  const failed = results.filter(r => r.status === 'fail').length;
  const skipped = results.filter(r => r.status === 'skipped').length;
  const errors = results.filter(r => r.status === 'error').length;
  const criticalFailed = results.filter(r => r.status === 'fail' && r.severity === 'critical').length;

  console.log('\n' + '='.repeat(70));
  console.log('  INTEGRITY CHECK SUMMARY');
  console.log('='.repeat(70));
  console.log(`  Total Checks:     ${total}`);
  console.log(`  Passed:           ${passed}`);
  console.log(`  Failed:           ${failed} (${criticalFailed} critical)`);
  console.log(`  Skipped:          ${skipped}`);
  console.log(`  Errors:           ${errors}`);
  console.log(`  Runtime:          ${runtimeMs}ms`);
  console.log('='.repeat(70));

  if (criticalFailed > 0) {
    console.log('\n  CRITICAL ISSUES:');
    results
      .filter(r => r.status === 'fail' && r.severity === 'critical')
      .forEach(r => {
        console.log(`    - ${r.name}: ${r.count} violations`);
      });
  }

  console.log();
}

// ============================================================================
// Main
// ============================================================================

async function main() {
  console.log('='.repeat(70));
  console.log('  SCHEDULED INTEGRITY CHECK');
  console.log(`  ${new Date().toISOString()}`);
  if (isDryRun) console.log('  Mode: DRY RUN (no alerts will be sent)');
  console.log('='.repeat(70) + '\n');

  const supabase = createSupabaseClient();
  const startTime = Date.now();

  // Run all integrity checks
  const results = await runAllChecks(supabase);
  const runtimeMs = Date.now() - startTime;

  // Print summary
  printSummary(results, runtimeMs);

  // Skip logging and notifications in dry run mode
  if (isDryRun) {
    console.log('DRY RUN: Skipping database logging and notifications.\n');

    const criticalFailed = results.filter(r => r.status === 'fail' && r.severity === 'critical').length;
    process.exit(criticalFailed > 0 ? 1 : 0);
    return;
  }

  // Log the run to admin_integrity_runs
  const runId = await logIntegrityRun(supabase, results, runtimeMs);

  // Log critical failures to admin_alerts
  if (runId) {
    await logToAdminAlerts(supabase, results, runId);
  }

  // Send webhook notification
  await sendWebhookNotification(results);

  // Exit with appropriate code
  const criticalFailed = results.filter(r => r.status === 'fail' && r.severity === 'critical').length;
  if (criticalFailed > 0) {
    console.log(`\nExit code 1: ${criticalFailed} critical issues found.`);
    process.exit(1);
  } else {
    console.log('\nExit code 0: No critical issues.\n');
    process.exit(0);
  }
}

// Run with error handling
main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(2);
});
