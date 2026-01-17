#!/usr/bin/env node
/**
 * Reset test account positions to match their deposit transactions
 */
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

const testAccounts = [
  { email: 'alice@test.indigo.com', targetBalance: 15 },
  { email: 'bob@test.indigo.com', targetBalance: 25 },
  { email: 'carol@test.indigo.com', targetBalance: 40 }
];

async function resetPositions() {
  console.log('='.repeat(70));
  console.log('  RESETTING TEST ACCOUNT POSITIONS');
  console.log('='.repeat(70));

  for (const account of testAccounts) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', account.email)
      .single();

    if (!profile) {
      console.log(`\nProfile not found: ${account.email}`);
      continue;
    }

    console.log(`\n${profile.full_name} (${account.email}):`);

    // Get current position
    const { data: positions } = await supabase
      .from('investor_positions')
      .select('id, current_value, cost_basis')
      .eq('investor_id', profile.id);

    if (!positions || positions.length === 0) {
      console.log('  No positions found');
      continue;
    }

    for (const pos of positions) {
      console.log(`  Current: ${pos.current_value}, Target: ${account.targetBalance}`);

      // Update position to target balance
      const { error } = await supabase
        .from('investor_positions')
        .update({
          current_value: account.targetBalance,
          cost_basis: account.targetBalance
        })
        .eq('id', pos.id);

      if (error) {
        console.log(`  ERROR: ${error.message}`);
      } else {
        console.log(`  UPDATED: Position set to ${account.targetBalance}`);
      }
    }

    // Also update the transaction balance_after to match
    const { data: txs } = await supabase
      .from('transactions_v2')
      .select('id, balance_after')
      .eq('investor_id', profile.id)
      .like('notes', '%Reconciliation%');

    for (const tx of txs || []) {
      await supabase
        .from('transactions_v2')
        .update({ balance_after: account.targetBalance, balance_before: 0 })
        .eq('id', tx.id);
      console.log(`  UPDATED: Transaction balance_after set to ${account.targetBalance}`);
    }
  }

  // Verify
  console.log('\n' + '='.repeat(70));
  console.log('  VERIFICATION');
  console.log('='.repeat(70));

  const { data: variance } = await supabase
    .from('v_position_transaction_variance')
    .select('*');

  if (variance && variance.length > 0) {
    console.log('\nRemaining variances:');
    variance.forEach(v => {
      console.log(`  ${v.investor_email}: ${v.balance_variance}`);
    });
  } else {
    console.log('\n✓ No variances remaining!');
  }

  const { data: ledger } = await supabase
    .from('v_ledger_reconciliation')
    .select('*')
    .eq('has_variance', true);

  if (ledger && ledger.length > 0) {
    console.log('\nLedger reconciliation issues:');
    ledger.forEach(l => {
      console.log(`  ${l.investor_email}: ${l.variance}`);
    });
  } else {
    console.log('\n✓ Ledger reconciliation clean!');
  }

  console.log('\n' + '='.repeat(70));
}

resetPositions();
