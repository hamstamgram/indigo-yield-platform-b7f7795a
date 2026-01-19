import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

async function verify() {
  console.log('============================================');
  console.log('DEPLOYMENT VERIFICATION');
  console.log('============================================\n');

  // 1. Check position correction log
  console.log('1. POSITION CORRECTIONS MADE:');
  const { data: corrections, error: corrErr } = await supabase
    .from('position_correction_log')
    .select('*')
    .order('corrected_at', { ascending: false })
    .limit(20);

  if (corrErr) {
    console.log('   Error reading corrections:', corrErr.message);
  } else if (!corrections?.length) {
    console.log('   No corrections logged (positions may have been correct already)');
  } else {
    console.log(`   Found ${corrections.length} corrections:`);
    let totalVariance = 0;
    corrections.forEach(c => {
      const variance = Math.abs(Number(c.variance) || 0);
      totalVariance += variance;
      console.log(`   - Investor ${c.investor_id?.substring(0, 8)}... variance: ${variance.toLocaleString()}`);
    });
    console.log(`   TOTAL VARIANCE FIXED: ${totalVariance.toLocaleString()}`);
  }

  // 2. Check current reconciliation status
  console.log('\n2. CURRENT RECONCILIATION STATUS:');
  const { data: positions } = await supabase.from('investor_positions').select('investor_id, fund_id, current_value');
  const { data: transactions } = await supabase
    .from('transactions_v2')
    .select('investor_id, fund_id, type, amount, is_voided')
    .eq('is_voided', false);

  const creditTypes = ['DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT'];
  const debitTypes = ['WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL'];

  // Calculate expected positions from transactions
  const calcPositions = {};
  transactions?.forEach(t => {
    const key = `${t.investor_id}|${t.fund_id}`;
    if (!calcPositions[key]) calcPositions[key] = 0;
    if (creditTypes.includes(t.type)) calcPositions[key] += Number(t.amount);
    else if (debitTypes.includes(t.type)) calcPositions[key] -= Number(t.amount);
  });

  // Compare
  let mismatches = 0;
  let totalMismatch = 0;
  positions?.forEach(p => {
    const key = `${p.investor_id}|${p.fund_id}`;
    const expected = calcPositions[key] || 0;
    const actual = Number(p.current_value) || 0;
    const diff = Math.abs(expected - actual);
    if (diff > 0.01) {
      mismatches++;
      totalMismatch += diff;
      console.log(`   MISMATCH: Expected ${expected.toLocaleString()}, Actual ${actual.toLocaleString()}, Diff ${diff.toLocaleString()}`);
    }
  });

  if (mismatches === 0) {
    console.log('   ✅ ALL POSITIONS RECONCILED - No mismatches found!');
  } else {
    console.log(`   ❌ ${mismatches} mismatches remaining, total variance: ${totalMismatch.toLocaleString()}`);
  }

  // 3. Check fund AUM
  console.log('\n3. FUND AUM STATUS:');
  const { data: aum } = await supabase
    .from('fund_daily_aum')
    .select('fund_id, aum_date, total_aum')
    .eq('aum_date', new Date().toISOString().split('T')[0])
    .order('total_aum', { ascending: false });

  if (!aum?.length) {
    console.log('   No AUM records for today');
  } else {
    console.log(`   ${aum.length} funds with AUM today:`);
    aum.forEach(a => {
      console.log(`   - Fund ${a.fund_id?.substring(0, 8)}... AUM: ${Number(a.total_aum).toLocaleString()}`);
    });
  }

  // 4. Test RPC functions exist
  console.log('\n4. RPC FUNCTION STATUS:');
  const rpcs = ['recompute_investor_position', 'admin_fix_position', 'batch_reconcile_all_positions', 'sync_all_fund_aum', 'set_fund_daily_aum'];
  for (const fn of rpcs) {
    // Try calling with null params to see if function exists
    const { error } = await supabase.rpc(fn, fn.includes('position') && fn !== 'batch_reconcile_all_positions' ? { p_investor_id: null, p_fund_id: null } : {});
    if (error?.message?.includes('Could not find the function')) {
      console.log(`   ❌ ${fn}: NOT FOUND`);
    } else {
      console.log(`   ✅ ${fn}: EXISTS`);
    }
  }

  console.log('\n============================================');
  console.log('VERIFICATION COMPLETE');
  console.log('============================================');
}

verify().catch(console.error);
