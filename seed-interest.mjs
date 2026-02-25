import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
);

const INVESTOR_ID = '44801beb-4476-4a9b-9751-4e70267f6953';
const SOL_FUND = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';
const XRP_FUND = '2c123c4f-76b4-4504-867e-059649855417';

const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'qa.admin@indigo.fund',
  password: 'QaTest2026!'
});
const adminId = authData.session.user.id;
console.log('✅ Logged in');

// Try INTEREST type transaction for SOL
console.log('\n=== Apply INTEREST to SOL fund ===');
const { data: intD, error: intE } = await supabase.rpc('apply_investor_transaction', {
  p_investor_id: INVESTOR_ID,
  p_fund_id: SOL_FUND,
  p_admin_id: adminId,
  p_amount: 15.5,
  p_tx_date: '2026-01-31',
  p_tx_type: 'INTEREST',
  p_purpose: 'reporting',
  p_reference_id: randomUUID(),
  p_notes: 'QA seed yield interest SOL Jan 2026'
});
console.log('SOL interest result:', JSON.stringify(intD));
console.log('SOL interest error:', intE?.message || 'none');

// Try INTEREST for XRP
console.log('\n=== Apply INTEREST to XRP fund ===');
const { data: intD2, error: intE2 } = await supabase.rpc('apply_investor_transaction', {
  p_investor_id: INVESTOR_ID,
  p_fund_id: XRP_FUND,
  p_admin_id: adminId,
  p_amount: 8.75,
  p_tx_date: '2026-01-31',
  p_tx_type: 'INTEREST',
  p_purpose: 'reporting',
  p_reference_id: randomUUID(),
  p_notes: 'QA seed yield interest XRP Jan 2026'
});
console.log('XRP interest result:', JSON.stringify(intD2));
console.log('XRP interest error:', intE2?.message || 'none');

// Also try adjust_investor_position to bump up value
console.log('\n=== Try adjust_investor_position for SOL ===');
const { data: adjD, error: adjE } = await supabase.rpc('adjust_investor_position', {
  p_investor_id: INVESTOR_ID,
  p_fund_id: SOL_FUND,
  p_admin_id: adminId,
  p_amount: 5.0,
  p_reason: 'QA seed yield adjustment',
  p_tx_date: '2026-02-01'
});
console.log('Adjust result:', JSON.stringify(adjD));
console.log('Adjust error:', adjE?.message || 'none');

// Recompute
console.log('\n=== Recompute positions ===');
await supabase.rpc('recompute_investor_positions_for_investor', { p_investor_id: INVESTOR_ID });

// Final positions
const { data: finalPos } = await supabase
  .from('investor_positions')
  .select('fund_id, shares, current_value, cumulative_yield_earned, is_active')
  .eq('investor_id', INVESTOR_ID);
console.log('\nFinal positions:', JSON.stringify(finalPos, null, 2));

// Summary for reporting
const active = finalPos?.filter(p => p.is_active);
console.log('\n=== SUMMARY ===');
active?.forEach(p => {
  const fundName = p.fund_id === '7574bc81-aab3-4175-9e7f-803aa6f9eb8f' ? 'Solana Yield Fund' 
    : p.fund_id === '2c123c4f-76b4-4504-867e-059649855417' ? 'Ripple Yield Fund'
    : p.fund_id === '0a048d9b-c4cf-46eb-b428-59e10307df93' ? 'Bitcoin Yield Fund'
    : p.fund_id;
  console.log(`  ${fundName}: ${p.current_value} (shares: ${p.shares}, yield: ${p.cumulative_yield_earned})`);
});

