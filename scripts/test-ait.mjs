import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

const BTC_FUND = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const JOSE = '203caf71-a9ac-4e2a-bbd3-b45dd51758d4';
const ADMIN = 'a16a7e50-fefd-4bfe-897c-d16279b457c2';

// Test apply_investor_transaction
console.log('Test: apply_investor_transaction with 9 params (required + optional)...');

const { data, error } = await supabase.rpc('apply_investor_transaction', {
  p_fund_id: BTC_FUND,
  p_investor_id: JOSE,
  p_tx_type: 'DEPOSIT',
  p_amount: 0.001,
  p_tx_date: '2026-01-01',  // recent date to avoid historical lock
  p_reference_id: 'test-ait-probe-' + Date.now(),
  p_admin_id: ADMIN,
  p_notes: 'schema test probe',
  p_purpose: 'transaction',
});

if (error) {
  console.log('Error:', error.message);
} else {
  console.log('Success:', JSON.stringify(data));
  // Void the test transaction
  if (data?.transaction_id) {
    const { error: ve } = await supabase
      .from('transactions_v2')
      .update({ is_voided: true, voided_at: new Date().toISOString() })
      .eq('id', data.transaction_id);
    console.log('Voided:', ve ? ve.message : 'OK');
  }
}

// Also test apply_segmented_yield_distribution_v5
console.log('\nTest: apply_segmented_yield_distribution_v5 schema...');
const { data: v5data, error: v5error } = await supabase.rpc('apply_segmented_yield_distribution_v5', {
  p_fund_id: BTC_FUND,
  p_period_end: '2030-01-31', // future date - will fail but shows if schema cache recognizes it
  p_recorded_aum: 1.0,
  p_admin_id: ADMIN,
  p_purpose: 'transaction',
});

if (v5error) {
  console.log('V5 error (expected if future date fails):', v5error.message);
} else {
  console.log('V5 data:', JSON.stringify(v5data));
}
