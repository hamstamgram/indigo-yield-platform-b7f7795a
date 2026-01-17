#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

async function verify() {
  // Check reconciliation transactions created
  const { data: txs } = await supabase
    .from('transactions_v2')
    .select('*')
    .like('notes', '%Reconciliation%');

  console.log('=== RECONCILIATION TRANSACTIONS CREATED ===');
  console.log('Found:', txs?.length || 0, 'reconciliation transactions\n');
  txs?.forEach(tx => {
    console.log(`- ${tx.type} ${tx.amount} on ${tx.tx_date}`);
    console.log(`  Investor: ${tx.investor_id.slice(0,8)}...`);
    console.log(`  Balance: ${tx.balance_before} -> ${tx.balance_after}`);
    console.log();
  });

  // Check current positions for test accounts
  const testEmails = ['alice@test.indigo.com', 'bob@test.indigo.com', 'carol@test.indigo.com'];

  console.log('=== CURRENT POSITIONS ===\n');

  for (const email of testEmails) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .single();

    if (profile) {
      const { data: positions } = await supabase
        .from('investor_positions')
        .select('*, funds(code, asset)')
        .eq('investor_id', profile.id);

      console.log(`${profile.full_name} (${email}):`);
      positions?.forEach(p => {
        console.log(`  ${p.funds.code}: ${p.current_value} ${p.funds.asset}`);
        console.log(`    cost_basis: ${p.cost_basis}, cumulative_yield: ${p.cumulative_yield_earned}`);
      });
      console.log();
    }
  }

  // Check transactions for these investors
  console.log('=== TRANSACTIONS FOR TEST ACCOUNTS ===\n');

  for (const email of testEmails) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, full_name')
      .eq('email', email)
      .single();

    if (profile) {
      const { data: txs } = await supabase
        .from('transactions_v2')
        .select('type, amount, tx_date, balance_before, balance_after, notes')
        .eq('investor_id', profile.id)
        .order('tx_date', { ascending: true });

      console.log(`${profile.full_name}:`);
      if (txs?.length === 0) {
        console.log('  No transactions found');
      } else {
        txs?.forEach(t => {
          console.log(`  ${t.tx_date}: ${t.type} ${t.amount} (${t.balance_before} -> ${t.balance_after})`);
        });
      }
      console.log();
    }
  }

  // Check variance view again
  console.log('=== CURRENT VARIANCE VIEW ===\n');
  const { data: variance } = await supabase
    .from('v_position_transaction_variance')
    .select('*');

  variance?.forEach(v => {
    console.log(`${v.investor_email} in ${v.fund_code}:`);
    console.log(`  position_value: ${v.position_value}`);
    console.log(`  total_deposits: ${v.total_deposits}`);
    console.log(`  balance_variance: ${v.balance_variance}`);
    console.log();
  });
}

verify();
