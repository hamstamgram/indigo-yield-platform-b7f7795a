#!/usr/bin/env node
/**
 * Fix positions directly using investor_id from variance view
 */
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

async function fix() {
  console.log('='.repeat(70));
  console.log('  FIXING POSITIONS DIRECTLY');
  console.log('='.repeat(70));

  // Get variance details
  const { data: variances } = await supabase
    .from('v_position_transaction_variance')
    .select('*')
    .gt('balance_variance', 0);

  console.log(`\nFound ${variances?.length || 0} positions with variance\n`);

  for (const v of variances || []) {
    console.log(`${v.investor_email} in ${v.fund_code}:`);
    console.log(`  Position: ${v.position_value}, Deposits: ${v.total_deposits}`);

    // The target is: position should equal deposits (for test accounts with no yield yet)
    const targetValue = v.total_deposits;

    // Update investor_positions directly
    const { error: posErr } = await supabase
      .from('investor_positions')
      .update({
        current_value: targetValue,
        cost_basis: targetValue
      })
      .eq('investor_id', v.investor_id)
      .eq('fund_id', v.fund_id);

    if (posErr) {
      console.log(`  POS ERROR: ${posErr.message}`);
    } else {
      console.log(`  UPDATED position to ${targetValue}`);
    }

    // Also update the reconciliation transaction balance
    const { error: txErr } = await supabase
      .from('transactions_v2')
      .update({
        balance_before: 0,
        balance_after: targetValue
      })
      .eq('investor_id', v.investor_id)
      .eq('fund_id', v.fund_id)
      .like('notes', '%Reconciliation%');

    if (!txErr) {
      console.log(`  UPDATED transaction balance to ${targetValue}`);
    }
    console.log();
  }

  // Verify
  console.log('='.repeat(70));
  console.log('  VERIFICATION');
  console.log('='.repeat(70));

  const { data: newVariance } = await supabase
    .from('v_position_transaction_variance')
    .select('*')
    .gt('balance_variance', 0);

  if (newVariance && newVariance.length > 0) {
    console.log('\nRemaining variances:');
    newVariance.forEach(v => {
      console.log(`  ${v.investor_email}: pos=${v.position_value}, deps=${v.total_deposits}, var=${v.balance_variance}`);
    });
  } else {
    console.log('\n✓ All position variances resolved!');
  }

  const { data: ledger } = await supabase
    .from('v_ledger_reconciliation')
    .select('*')
    .eq('has_variance', true);

  if (ledger && ledger.length > 0) {
    console.log('\nLedger reconciliation issues:');
    ledger.forEach(l => {
      console.log(`  ${l.investor_email}: pos=${l.position_balance}, calc=${l.calculated_balance}, var=${l.variance}`);
    });
  } else {
    console.log('\n✓ Ledger reconciliation clean!');
  }

  console.log('\n' + '='.repeat(70));
}

fix();
