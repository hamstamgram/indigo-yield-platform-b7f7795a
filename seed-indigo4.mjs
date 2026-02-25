import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
);

const INVESTOR_ID = '44801beb-4476-4a9b-9751-4e70267f6953';
const SOL_FUND = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';
const XRP_FUND = '2c123c4f-76b4-4504-867e-059649855417';

// Login
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'qa.admin@indigo.fund',
  password: 'QaTest2026!'
});
if (authError) { console.error('Auth error:', authError.message); process.exit(1); }
const adminId = authData.session.user.id;
console.log('✅ Logged in. Admin ID:', adminId);

// Apply deposit for SOL fund with correct purpose value
console.log('\n=== Apply DEPOSIT 1000 for SOL fund ===');
const solRefId = randomUUID();
const { data: solD, error: solE } = await supabase.rpc('apply_investor_transaction', {
  p_investor_id: INVESTOR_ID,
  p_fund_id: SOL_FUND,
  p_admin_id: adminId,
  p_amount: 1000,
  p_tx_date: '2026-01-15',
  p_tx_type: 'DEPOSIT',
  p_purpose: 'transaction',
  p_reference_id: solRefId,
  p_notes: 'QA seed deposit SOL'
});
console.log('SOL deposit result:', JSON.stringify(solD));
console.log('SOL deposit error:', solE?.message || 'none');

// Apply deposit for XRP fund
console.log('\n=== Apply DEPOSIT 500 for XRP fund ===');
const xrpRefId = randomUUID();
const { data: xrpD, error: xrpE } = await supabase.rpc('apply_investor_transaction', {
  p_investor_id: INVESTOR_ID,
  p_fund_id: XRP_FUND,
  p_admin_id: adminId,
  p_amount: 500,
  p_tx_date: '2026-01-15',
  p_tx_type: 'DEPOSIT',
  p_purpose: 'transaction',
  p_reference_id: xrpRefId,
  p_notes: 'QA seed deposit XRP'
});
console.log('XRP deposit result:', JSON.stringify(xrpD));
console.log('XRP deposit error:', xrpE?.message || 'none');

// Recompute positions
console.log('\n=== Recompute positions ===');
const { error: recompE } = await supabase.rpc('recompute_investor_positions_for_investor', {
  p_investor_id: INVESTOR_ID
});
console.log('Recompute error:', recompE?.message || 'none (success)');

// Check positions
const { data: positions } = await supabase
  .from('investor_positions')
  .select('fund_id, shares, current_value, cost_basis, is_active')
  .eq('investor_id', INVESTOR_ID);
console.log('\nPositions after deposits:', JSON.stringify(positions, null, 2));

