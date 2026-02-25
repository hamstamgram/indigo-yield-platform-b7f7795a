import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
);

const INVESTOR_ID = '44801beb-4476-4a9b-9751-4e70267f6953';
const SOL_FUND = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';
const BTC_FUND = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const XRP_FUND = '2c123c4f-76b4-4504-867e-059649855417';

// Step 1: Login
console.log('=== STEP 1: Login as admin ===');
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'qa.admin@indigo.fund',
  password: 'QaTest2026!'
});

if (authError) {
  console.error('Auth error:', authError.message);
  process.exit(1);
}

const adminToken = authData.session.access_token;
console.log('✅ Logged in. Token starts with:', adminToken.substring(0, 30) + '...');

// Step 2: Check current positions
console.log('\n=== STEP 2: Current positions ===');
const { data: currentPositions, error: posErr } = await supabase
  .from('investor_positions')
  .select('fund_id, current_value, units')
  .eq('investor_id', INVESTOR_ID);

console.log('Current positions:', JSON.stringify(currentPositions, null, 2));
if (posErr) console.error('Position error:', posErr.message);

// Step 3: Try apply_transaction_with_crystallization RPC
console.log('\n=== STEP 3: Try RPC apply_transaction_with_crystallization ===');
const { data: rpcData, error: rpcError } = await supabase.rpc('apply_transaction_with_crystallization', {
  p_investor_id: INVESTOR_ID,
  p_fund_id: SOL_FUND,
  p_type: 'DEPOSIT',
  p_amount: 1000,
  p_tx_date: '2026-01-15',
  p_purpose: 'capital_flow',
  p_notes: 'QA test deposit'
});
console.log('RPC result:', JSON.stringify(rpcData));
console.log('RPC error:', rpcError?.message || 'none');

