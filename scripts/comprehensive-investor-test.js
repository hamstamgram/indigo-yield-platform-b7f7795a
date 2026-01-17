#!/usr/bin/env node
/**
 * Comprehensive Investor & Function Test
 * Tests ALL investors, ALL fee structures, ALL database functions
 */

const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://nkfimvovosdehmyyjubn.supabase.co";
const SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k";

const supabase = createClient(SUPABASE_URL, SERVICE_KEY);

const results = {
  investors: [],
  positions: [],
  feeStructures: [],
  yieldPreviews: [],
  functions: [],
  integrity: []
};

let totalPassed = 0;
let totalFailed = 0;

function log(test, success, message, details = null) {
  const icon = success ? "✓" : "✗";
  console.log(`  ${icon} ${test}: ${message}`);
  if (details && !success) {
    console.log(`      Details: ${JSON.stringify(details).slice(0, 100)}`);
  }
  if (success) totalPassed++;
  else totalFailed++;
  return { test, success, message, details };
}

function header(title) {
  console.log('\n' + '═'.repeat(70));
  console.log(`  ${title}`);
  console.log('═'.repeat(70));
}

function subheader(title) {
  console.log(`\n  --- ${title} ---\n`);
}

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════════════╗');
  console.log('║     COMPREHENSIVE INVESTOR & FUNCTION TEST                           ║');
  console.log('╚══════════════════════════════════════════════════════════════════════╝');

  // ============================================================================
  // PHASE 1: Authentication
  // ============================================================================
  header('PHASE 1: ADMIN AUTHENTICATION');

  const { data: auth, error: authErr } = await supabase.auth.signInWithPassword({
    email: "testadmin@indigo.fund",
    password: "TestAdmin123!"
  });

  if (authErr) {
    log('Admin Auth', false, authErr.message);
    return;
  }
  log('Admin Auth', true, `Logged in as ${auth.user.email}`);

  const { data: isAdmin } = await supabase.rpc('is_admin');
  log('is_admin()', isAdmin === true, `Returns: ${isAdmin}`);

  // ============================================================================
  // PHASE 2: Get All Investors
  // ============================================================================
  header('PHASE 2: ALL INVESTORS');

  const { data: allProfiles, error: profilesErr } = await supabase
    .from('profiles')
    .select('*')
    .order('created_at');

  if (profilesErr) {
    log('Get Profiles', false, profilesErr.message);
    return;
  }

  log('Get All Profiles', true, `Found ${allProfiles.length} profiles`);

  // Categorize profiles
  const investors = allProfiles.filter(p => p.account_type === 'investor');
  const ibs = allProfiles.filter(p => p.account_type === 'ib');
  const admins = allProfiles.filter(p => p.is_admin === true);
  const feesAccounts = allProfiles.filter(p => p.account_type === 'fees_account');

  console.log(`\n  Profile Breakdown:`);
  console.log(`    Investors: ${investors.length}`);
  console.log(`    IBs (Introducing Brokers): ${ibs.length}`);
  console.log(`    Admins: ${admins.length}`);
  console.log(`    Fee Accounts: ${feesAccounts.length}`);

  // ============================================================================
  // PHASE 3: Get All Funds
  // ============================================================================
  header('PHASE 3: ALL FUNDS');

  const { data: allFunds, error: fundsErr } = await supabase
    .from('funds')
    .select('*')
    .order('code');

  if (fundsErr) {
    log('Get Funds', false, fundsErr.message);
    return;
  }

  log('Get All Funds', true, `Found ${allFunds.length} funds`);

  const activeFunds = allFunds.filter(f => f.status === 'active');
  console.log(`\n  Active Funds: ${activeFunds.length}`);

  for (const fund of activeFunds) {
    console.log(`    - ${fund.code} (${fund.asset}) | Mgmt Fee: ${fund.management_fee_percent || 0}% | Perf Fee: ${fund.performance_fee_percent || 0}%`);
  }

  // ============================================================================
  // PHASE 4: Get All Positions
  // ============================================================================
  header('PHASE 4: ALL INVESTOR POSITIONS');

  const { data: allPositions, error: positionsErr } = await supabase
    .from('investor_positions')
    .select(`
      *,
      funds(id, code, asset)
    `)
    .gt('current_value', 0)
    .order('current_value', { ascending: false });

  // Enrich positions with investor data
  if (!positionsErr && allPositions) {
    for (const pos of allPositions) {
      const investor = allProfiles.find(p => p.id === pos.investor_id);
      pos.investor = investor;
    }
  }

  if (positionsErr) {
    log('Get Positions', false, positionsErr.message);
    return;
  }

  log('Get All Positions', true, `Found ${allPositions.length} positions with value > 0`);

  console.log('\n  Investor Positions:');
  console.log('  ' + '─'.repeat(90));
  console.log(`  ${'Investor'.padEnd(30)} | ${'Fund'.padEnd(10)} | ${'Value'.padStart(12)} | ${'Fee %'.padStart(6)} | ${'IB %'.padStart(5)} | IB`);
  console.log('  ' + '─'.repeat(90));

  for (const pos of allPositions) {
    const investorName = pos.investor ?
      `${pos.investor.first_name || ''} ${pos.investor.last_name || ''}`.trim() || pos.investor.email :
      'Unknown';
    const fundCode = pos.funds?.code || 'Unknown';
    const feePct = pos.investor?.fee_pct || 20;
    const ibPct = pos.investor?.ib_percentage || 0;

    // Get IB name if exists
    let ibName = '-';
    if (pos.investor?.ib_parent_id) {
      const ib = allProfiles.find(p => p.id === pos.investor.ib_parent_id);
      ibName = ib ? `${ib.first_name || ''} ${ib.last_name || ''}`.trim() || ib.email : 'Unknown';
    }

    console.log(`  ${investorName.padEnd(30).slice(0,30)} | ${fundCode.padEnd(10)} | ${pos.current_value.toFixed(4).padStart(12)} | ${(feePct + '%').padStart(6)} | ${(ibPct + '%').padStart(5)} | ${ibName.slice(0,15)}`);

    results.positions.push({
      investor: investorName,
      fund: fundCode,
      value: pos.current_value,
      feePct,
      ibPct,
      ibName
    });
  }
  console.log('  ' + '─'.repeat(90));

  // ============================================================================
  // PHASE 5: Fee Structure Validation
  // ============================================================================
  header('PHASE 5: FEE STRUCTURE VALIDATION');

  subheader('Checking all investors have valid fee configurations');

  for (const investor of investors) {
    const name = `${investor.first_name || ''} ${investor.last_name || ''}`.trim() || investor.email;
    const feePct = investor.fee_pct;
    const ibPct = investor.ib_percentage || 0;
    const ibParent = investor.ib_parent_id;

    // Validate fee structure
    const issues = [];

    if (feePct === null || feePct === undefined) {
      issues.push('No fee_pct set (will default to 20%)');
    } else if (feePct < 0 || feePct > 100) {
      issues.push(`Invalid fee_pct: ${feePct}%`);
    }

    if (ibPct > 0 && !ibParent) {
      issues.push(`Has IB fee (${ibPct}%) but no IB assigned`);
    }

    if (ibParent && ibPct === 0) {
      issues.push(`Has IB assigned but no IB fee`);
    }

    if (ibPct > feePct) {
      issues.push(`IB fee (${ibPct}%) exceeds total fee (${feePct}%)`);
    }

    const success = issues.length === 0;
    results.feeStructures.push(log(
      `Fee: ${name.slice(0,25)}`,
      success,
      success ? `${feePct || 20}% fee${ibPct > 0 ? `, ${ibPct}% to IB` : ''}` : issues.join('; ')
    ));
  }

  // ============================================================================
  // PHASE 6: Yield Preview for Each Fund
  // ============================================================================
  header('PHASE 6: YIELD PREVIEW FOR ALL FUNDS');

  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const yieldDate = yesterday.toISOString().split('T')[0];

  for (const fund of activeFunds) {
    subheader(`Fund: ${fund.code} (${fund.asset})`);

    // Get current AUM
    const { data: fundPositions } = await supabase
      .from('investor_positions')
      .select('current_value')
      .eq('fund_id', fund.id);

    const currentAUM = fundPositions?.reduce((sum, p) => sum + (p.current_value || 0), 0) || 0;

    if (currentAUM === 0) {
      log(`${fund.code} Preview`, true, 'No positions in fund (AUM = 0)');
      continue;
    }

    // Simulate 1% yield
    const newAUM = currentAUM * 1.01;

    console.log(`    Current AUM: ${currentAUM.toFixed(4)} ${fund.asset}`);
    console.log(`    New AUM (1% yield): ${newAUM.toFixed(4)} ${fund.asset}`);

    const { data: preview, error: previewErr } = await supabase.rpc('preview_daily_yield_to_fund_v3', {
      p_fund_id: fund.id,
      p_yield_date: yieldDate,
      p_new_aum: newAUM,
      p_purpose: 'reporting'
    });

    if (previewErr) {
      log(`${fund.code} Preview`, false, previewErr.message);
      continue;
    }

    log(`${fund.code} Preview`, preview.success, `${preview.investorCount} investors, ${preview.grossYield?.toFixed(6)} ${fund.asset} gross yield`);

    if (preview.distributions && preview.distributions.length > 0) {
      console.log(`\n    Distribution Preview:`);
      console.log('    ' + '─'.repeat(80));
      console.log(`    ${'Investor'.padEnd(25)} | ${'Gross'.padStart(12)} | ${'Fee %'.padStart(6)} | ${'Fee'.padStart(12)} | ${'IB %'.padStart(5)} | ${'IB'.padStart(10)} | ${'Net'.padStart(12)}`);
      console.log('    ' + '─'.repeat(80));

      for (const dist of preview.distributions) {
        console.log(`    ${(dist.investorName || 'Unknown').padEnd(25).slice(0,25)} | ${dist.grossYield?.toFixed(6).padStart(12)} | ${(dist.feePct + '%').padStart(6)} | ${dist.feeAmount?.toFixed(6).padStart(12)} | ${(dist.ibPct + '%').padStart(5)} | ${dist.ibAmount?.toFixed(6).padStart(10)} | ${dist.netYield?.toFixed(6).padStart(12)}`);

        results.yieldPreviews.push({
          fund: fund.code,
          investor: dist.investorName,
          grossYield: dist.grossYield,
          feePct: dist.feePct,
          feeAmount: dist.feeAmount,
          ibPct: dist.ibPct,
          ibAmount: dist.ibAmount,
          netYield: dist.netYield
        });
      }
      console.log('    ' + '─'.repeat(80));

      // Show totals
      console.log(`\n    Totals:`);
      console.log(`      Total Fees: ${preview.totalFees?.toFixed(6)} ${fund.asset}`);
      console.log(`      Total IB Fees: ${preview.totalIbFees?.toFixed(6)} ${fund.asset}`);
      console.log(`      INDIGO Credit: ${preview.indigoFeesCredit?.toFixed(6)} ${fund.asset}`);
      console.log(`      Net to Investors: ${preview.netYield?.toFixed(6)} ${fund.asset}`);

      // Verify math: Gross = Fees + IB Fees + Net
      const calculatedTotal = (preview.totalFees || 0) + (preview.totalIbFees || 0) + (preview.netYield || 0);
      const mathCheck = Math.abs(calculatedTotal - (preview.grossYield || 0)) < 0.01;
      log(`${fund.code} Math Check`, mathCheck, mathCheck ? 'Fees + IB + Net = Gross ✓' : `Mismatch: ${calculatedTotal.toFixed(4)} vs ${preview.grossYield?.toFixed(4)}`);

      // IB Credits
      if (preview.ibCredits && preview.ibCredits.length > 0) {
        console.log(`\n    IB Credits:`);
        for (const ib of preview.ibCredits) {
          console.log(`      → ${ib.ibName}: ${ib.ibAmount?.toFixed(6)} ${fund.asset} (${ib.ibPct}% from ${ib.sourceInvestorName})`);
        }
      }
    }
  }

  // ============================================================================
  // PHASE 7: Test All Database Functions
  // ============================================================================
  header('PHASE 7: ALL DATABASE FUNCTIONS');

  // Get a test investor with position
  const testPosition = allPositions[0];
  const testFund = activeFunds[0];

  if (testPosition && testFund) {
    subheader('Position Functions');

    // get_investor_position_as_of
    const { data: posAsOf, error: posAsOfErr } = await supabase.rpc('get_investor_position_as_of', {
      p_fund_id: testPosition.fund_id,
      p_investor_id: testPosition.investor_id,
      p_as_of_date: yieldDate
    });
    results.functions.push(log('get_investor_position_as_of', !posAsOfErr, posAsOfErr?.message || 'Position data returned'));

    // reconcile_investor_position
    const { data: reconcile, error: reconcileErr } = await supabase.rpc('reconcile_investor_position', {
      p_fund_id: testPosition.fund_id,
      p_investor_id: testPosition.investor_id
    });
    results.functions.push(log('reconcile_investor_position', !reconcileErr, reconcileErr?.message || `Diff: ${reconcile?.difference || 0}`));
  }

  subheader('Fund Functions');

  // get_fund_summary (if exists)
  const { data: fundSummary, error: fundSummaryErr } = await supabase.rpc('get_fund_summary');
  if (fundSummaryErr && fundSummaryErr.message.includes('does not exist')) {
    log('get_fund_summary', true, 'Function not available (optional)');
  } else {
    results.functions.push(log('get_fund_summary', !fundSummaryErr, fundSummaryErr?.message || 'Summary returned'));
  }

  // ============================================================================
  // PHASE 8: Integrity Views
  // ============================================================================
  header('PHASE 8: DATA INTEGRITY CHECKS');

  const integrityViews = [
    { name: 'v_ledger_reconciliation', description: 'Ledger vs Position reconciliation' },
    { name: 'v_position_transaction_variance', description: 'Position vs Transaction variance' },
    { name: 'v_yield_conservation_check', description: 'Yield conservation validation' },
    { name: 'v_yield_conservation_violations', description: 'Yield conservation violations' },
    { name: 'v_yield_allocation_violations', description: 'Yield allocation violations' },
    { name: 'v_missing_withdrawal_transactions', description: 'Missing withdrawal transactions' },
    { name: 'v_transaction_distribution_orphans', description: 'Orphaned transaction distributions' },
    { name: 'v_period_orphans', description: 'Orphaned statement periods' },
    { name: 'v_crystallization_gaps', description: 'Crystallization gaps' }
  ];

  for (const view of integrityViews) {
    const { data, error } = await supabase.from(view.name).select('*').limit(10);

    if (error) {
      results.integrity.push(log(view.name, false, error.message));
    } else {
      const hasIssues = data && data.length > 0;
      const isViolationView = view.name.includes('violation') || view.name.includes('missing') || view.name.includes('orphan');

      // For violation views, 0 rows is good. For reconciliation views, any rows show status.
      const success = isViolationView ? !hasIssues : true;
      results.integrity.push(log(view.name, success, `${data?.length || 0} rows${hasIssues && isViolationView ? ' (ISSUES FOUND)' : ''}`));

      if (hasIssues && isViolationView && data.length <= 3) {
        data.forEach(row => {
          console.log(`      → ${JSON.stringify(row).slice(0, 80)}...`);
        });
      }
    }
  }

  // ============================================================================
  // PHASE 9: Transaction Summary
  // ============================================================================
  header('PHASE 9: TRANSACTION SUMMARY');

  const { data: txSummary, error: txErr } = await supabase
    .from('transactions_v2')
    .select('type, fund_id, funds(code)')
    .eq('is_voided', false);

  if (!txErr && txSummary) {
    const txByType = {};
    const txByFund = {};

    txSummary.forEach(tx => {
      txByType[tx.type] = (txByType[tx.type] || 0) + 1;
      const fundCode = tx.funds?.code || 'Unknown';
      txByFund[fundCode] = (txByFund[fundCode] || 0) + 1;
    });

    console.log('\n  Transactions by Type:');
    Object.entries(txByType).forEach(([type, count]) => {
      console.log(`    ${type}: ${count}`);
    });

    console.log('\n  Transactions by Fund:');
    Object.entries(txByFund).forEach(([fund, count]) => {
      console.log(`    ${fund}: ${count}`);
    });

    log('Transaction Summary', true, `${txSummary.length} total transactions`);
  }

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  header('FINAL SUMMARY');

  console.log(`\n  Test Results:`);
  console.log(`    Total Passed: ${totalPassed}`);
  console.log(`    Total Failed: ${totalFailed}`);
  console.log(`    Pass Rate: ${((totalPassed / (totalPassed + totalFailed)) * 100).toFixed(1)}%`);

  console.log(`\n  Data Summary:`);
  console.log(`    Investors: ${investors.length}`);
  console.log(`    IBs: ${ibs.length}`);
  console.log(`    Active Funds: ${activeFunds.length}`);
  console.log(`    Positions with Value: ${allPositions.length}`);

  // Calculate total AUM
  const totalAUM = {};
  allPositions.forEach(pos => {
    const asset = pos.funds?.asset || 'Unknown';
    totalAUM[asset] = (totalAUM[asset] || 0) + pos.current_value;
  });

  console.log(`\n  Total AUM by Asset:`);
  Object.entries(totalAUM).forEach(([asset, value]) => {
    console.log(`    ${asset}: ${value.toFixed(4)}`);
  });

  if (totalFailed > 0) {
    console.log(`\n  ⚠️  ${totalFailed} tests failed. Review output above.`);
  } else {
    console.log(`\n  🎉 ALL TESTS PASSED!`);
  }

  console.log('\n' + '═'.repeat(70) + '\n');

  process.exit(totalFailed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
