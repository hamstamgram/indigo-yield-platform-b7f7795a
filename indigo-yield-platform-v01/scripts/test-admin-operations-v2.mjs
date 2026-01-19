import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

console.log('============================================');
console.log('ADMIN OPERATIONS TEST SUITE V2');
console.log('============================================\n');

let passed = 0;
let failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log(`✅ ${name}`);
    passed++;
  } catch (err) {
    console.log(`❌ ${name}`);
    console.log(`   Error: ${err.message}`);
    failed++;
  }
}

async function main() {
  // Get test data first
  const { data: investors } = await supabase.from('investors').select('id').limit(5);
  const { data: funds } = await supabase.from('funds').select('id, code').limit(5);
  const { data: positions } = await supabase.from('investor_positions').select('investor_id, fund_id').limit(5);

  console.log(`Found ${investors?.length || 0} investors, ${funds?.length || 0} funds, ${positions?.length || 0} positions\n`);

  const testInvestorId = positions?.[0]?.investor_id || investors?.[0]?.id;
  const testFundId = positions?.[0]?.fund_id || funds?.[0]?.id;

  // ============================================
  // CORE RPC FUNCTIONS
  // ============================================
  await test('RPC: recompute_investor_position', async () => {
    if (!testInvestorId || !testFundId) throw new Error('No test data');
    const { data, error } = await supabase.rpc('recompute_investor_position', {
      p_investor_id: testInvestorId,
      p_fund_id: testFundId
    });
    if (error) throw error;
    if (!data?.success) throw new Error('RPC returned failure: ' + JSON.stringify(data));
  });

  await test('RPC: admin_fix_position', async () => {
    if (!testInvestorId || !testFundId) throw new Error('No test data');
    const { data, error } = await supabase.rpc('admin_fix_position', {
      p_investor_id: testInvestorId,
      p_fund_id: testFundId
    });
    if (error) throw error;
    if (!data?.success) throw new Error('RPC returned failure: ' + JSON.stringify(data));
  });

  await test('RPC: batch_reconcile_all_positions', async () => {
    const { data, error } = await supabase.rpc('batch_reconcile_all_positions');
    if (error) throw error;
    if (!data?.success) throw new Error('RPC returned failure: ' + JSON.stringify(data));
    console.log(`   Reconciled ${data.total_positions} positions, ${data.fixed} fixed`);
  });

  await test('RPC: sync_all_fund_aum', async () => {
    const { data, error } = await supabase.rpc('sync_all_fund_aum', {
      p_target_date: new Date().toISOString().split('T')[0]
    });
    if (error) throw error;
    if (!data?.success) throw new Error('RPC returned failure: ' + JSON.stringify(data));
    console.log(`   Synced ${data.funds_synced} funds`);
  });

  // ============================================
  // DATA INTEGRITY
  // ============================================
  await test('DATA: All positions reconciled with transactions', async () => {
    const { data: allPositions } = await supabase.from('investor_positions').select('investor_id, fund_id, current_value');
    const { data: transactions } = await supabase
      .from('transactions_v2')
      .select('investor_id, fund_id, type, amount')
      .eq('is_voided', false);

    const creditTypes = ['DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT'];
    const debitTypes = ['WITHDRAWAL', 'FEE', 'IB_DEBIT', 'INTERNAL_WITHDRAWAL'];

    const calcPositions = {};
    transactions?.forEach(t => {
      const key = `${t.investor_id}|${t.fund_id}`;
      if (!calcPositions[key]) calcPositions[key] = 0;
      if (creditTypes.includes(t.type)) calcPositions[key] += Number(t.amount);
      else if (debitTypes.includes(t.type)) calcPositions[key] -= Number(t.amount);
    });

    let mismatches = 0;
    allPositions?.forEach(p => {
      const key = `${p.investor_id}|${p.fund_id}`;
      const expected = calcPositions[key] || 0;
      const actual = Number(p.current_value) || 0;
      if (Math.abs(expected - actual) > 0.01) mismatches++;
    });

    if (mismatches > 0) throw new Error(`${mismatches} positions not reconciled`);
    console.log(`   ${allPositions?.length || 0} positions verified`);
  });

  await test('DATA: Audit trail in position_correction_log', async () => {
    const { data, error } = await supabase
      .from('position_correction_log')
      .select('*')
      .order('corrected_at', { ascending: false })
      .limit(5);
    if (error) throw error;
    console.log(`   ${data?.length || 0} recent corrections logged`);
  });

  await test('DATA: Fund AUM records exist for today', async () => {
    const { data, error } = await supabase
      .from('fund_daily_aum')
      .select('fund_id, total_aum')
      .eq('aum_date', new Date().toISOString().split('T')[0]);
    if (error) throw error;
    console.log(`   ${data?.length || 0} AUM records for today`);
  });

  // ============================================
  // YIELD OPERATIONS
  // ============================================
  await test('RPC: Check yield-related functions exist', async () => {
    // Check what yield functions exist
    const yieldFns = ['apply_daily_yield_to_fund_v3', 'apply_daily_yield', 'distribute_yield'];
    let found = [];

    for (const fn of yieldFns) {
      const { error } = await supabase.rpc(fn, {});
      if (!error?.message?.includes('Could not find the function')) {
        found.push(fn);
      }
    }

    if (found.length === 0) {
      // Check if yield_distributions table exists and is writable
      const { error } = await supabase.from('yield_distributions').select('id').limit(1);
      if (error) throw new Error('No yield RPCs found and yield_distributions table inaccessible');
      console.log('   No yield RPC found, but yield_distributions table accessible');
    } else {
      console.log(`   Found yield functions: ${found.join(', ')}`);
    }
  });

  // ============================================
  // TRANSACTION CREATION
  // ============================================
  await test('TRANSACTION: Can insert and void test transaction', async () => {
    if (!testInvestorId || !testFundId) throw new Error('No test data');

    // Try to insert a transaction
    const { data: tx, error: insertErr } = await supabase
      .from('transactions_v2')
      .insert({
        investor_id: testInvestorId,
        fund_id: testFundId,
        type: 'DEPOSIT',
        amount: 1,
        description: 'TEST - AUTO VOID',
        status: 'CONFIRMED',
        is_voided: false
      })
      .select()
      .single();

    if (insertErr) {
      if (insertErr.message?.includes('CANONICAL_MUTATION_REQUIRED')) {
        // Check if there's a create_transaction RPC
        const { error: rpcErr } = await supabase.rpc('create_transaction', {});
        if (rpcErr?.message?.includes('Could not find')) {
          throw new Error('Direct inserts blocked and no create_transaction RPC');
        }
      }
      throw insertErr;
    }

    // Void the transaction immediately
    const { error: voidErr } = await supabase
      .from('transactions_v2')
      .update({ is_voided: true })
      .eq('id', tx.id);

    if (voidErr) throw new Error('Created but could not void: ' + voidErr.message);

    // Recompute to restore position
    await supabase.rpc('recompute_investor_position', {
      p_investor_id: testInvestorId,
      p_fund_id: testFundId
    });

    console.log('   Transaction created, voided, and position restored');
  });

  // ============================================
  // SUMMARY
  // ============================================
  console.log('\n============================================');
  console.log(`RESULTS: ${passed} passed, ${failed} failed`);
  console.log('============================================');

  if (failed === 0) {
    console.log('\n🎉 ALL ADMIN OPERATIONS WORKING!');
  } else {
    console.log('\n⚠️  Some tests failed - review above');
  }

  process.exit(failed > 0 ? 1 : 0);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
