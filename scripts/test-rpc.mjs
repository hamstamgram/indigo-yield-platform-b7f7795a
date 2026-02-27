import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

const BTC_FUND = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const JOSE = '203caf71-a9ac-4e2a-bbd3-b45dd51758d4';
const ADMIN = 'a16a7e50-fefd-4bfe-897c-d16279b457c2';

// Test 1: with all 11 params (including nulls for optionals)
console.log('Test 1: all 11 params...');
const { data: t1, error: e1 } = await supabase.rpc('apply_transaction_with_crystallization', {
  p_admin_id: ADMIN,
  p_amount: 999999, // dummy - will be voided after
  p_distribution_id: null,
  p_fund_id: BTC_FUND,
  p_investor_id: JOSE,
  p_new_total_aum: null,
  p_notes: 'schema test probe - do not commit',
  p_purpose: 'transaction',
  p_reference_id: 'schema-test-probe-' + Date.now(),
  p_tx_date: '2020-01-01', // very old date - won't affect yields
  p_tx_type: 'DEPOSIT',
});
if (e1) console.log('Error 1:', e1.message);
else console.log('Success 1:', JSON.stringify(t1));

// If success, void it immediately
if (!e1 && t1 && t1.tx_id) {
  const { error: ve } = await supabase
    .from('transactions_v2')
    .update({ is_voided: true, voided_at: new Date().toISOString() })
    .eq('id', t1.tx_id);
  console.log('Voided test tx:', ve ? ve.message : 'OK');
}

// Test 2: try reloading schema cache via NOTIFY
console.log('\nTest 2: try direct insert into transactions_v2...');
const { data: t2, error: e2 } = await supabase
  .from('transactions_v2')
  .insert({
    investor_id: JOSE,
    fund_id: BTC_FUND,
    type: 'DEPOSIT',
    amount: 0.001,
    tx_date: '2020-01-01',
    reference_id: 'direct-test-probe-' + Date.now(),
    source: 'manual_admin',
    asset: 'BTC',
    visibility_scope: 'investor_visible',
    notes: 'direct insert test',
    created_by: ADMIN,
  })
  .select()
  .single();

if (e2) console.log('Direct insert error:', e2.message);
else {
  console.log('Direct insert success! id=', t2?.id);
  // Void it immediately
  if (t2?.id) {
    const { error: ve2 } = await supabase
      .from('transactions_v2')
      .update({ is_voided: true, voided_at: new Date().toISOString() })
      .eq('id', t2.id);
    console.log('Voided test tx2:', ve2 ? ve2.message : 'OK');
  }
}
