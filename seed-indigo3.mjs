import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';

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
if (authError) { console.error('Auth error:', authError.message); process.exit(1); }
const adminToken = authData.session.access_token;
const adminId = authData.session.user.id;
console.log('✅ Logged in. Admin ID:', adminId);

// Step 2: Check existing ib_allocations for the investor
console.log('\n=== STEP 2: Check existing transactions (ib_allocations) ===');
const { data: existingTx, error: txErr } = await supabase
  .from('ib_allocations')
  .select('id, fund_id, type, amount, purpose, tx_date, created_at')
  .eq('investor_id', INVESTOR_ID)
  .order('tx_date', { ascending: true });
console.log('Existing transactions:', JSON.stringify(existingTx, null, 2));
if (txErr) console.error('Tx error:', txErr.message);

// Step 3: Apply deposit for SOL fund
console.log('\n=== STEP 3: Apply DEPOSIT 1000 SOL ===');
const solRefId = randomUUID();
const { data: solDepositData, error: solDepositErr } = await supabase.rpc('apply_investor_transaction', {
  p_investor_id: INVESTOR_ID,
  p_fund_id: SOL_FUND,
  p_admin_id: adminId,
  p_amount: 1000,
  p_tx_date: '2026-01-15',
  p_tx_type: 'DEPOSIT',
  p_purpose: 'capital_flow',
  p_reference_id: solRefId,
  p_notes: 'QA seed deposit - SOL fund'
});
console.log('SOL deposit result:', JSON.stringify(solDepositData));
console.log('SOL deposit error:', solDepositErr?.message || 'none');

// Step 4: Apply deposit for XRP fund
console.log('\n=== STEP 4: Apply DEPOSIT 500 XRP ===');
const xrpRefId = randomUUID();
const { data: xrpDepositData, error: xrpDepositErr } = await supabase.rpc('apply_investor_transaction', {
  p_investor_id: INVESTOR_ID,
  p_fund_id: XRP_FUND,
  p_admin_id: adminId,
  p_amount: 500,
  p_tx_date: '2026-01-15',
  p_tx_type: 'DEPOSIT',
  p_purpose: 'capital_flow',
  p_reference_id: xrpRefId,
  p_notes: 'QA seed deposit - XRP fund'
});
console.log('XRP deposit result:', JSON.stringify(xrpDepositData));
console.log('XRP deposit error:', xrpDepositErr?.message || 'none');

// Step 5: Recompute all positions for investor
console.log('\n=== STEP 5: Recompute investor positions ===');
const { data: recompData, error: recompErr } = await supabase.rpc('recompute_investor_positions_for_investor', {
  p_investor_id: INVESTOR_ID
});
console.log('Recompute result:', JSON.stringify(recompData));
console.log('Recompute error:', recompErr?.message || 'none');

// Step 6: Check updated positions
console.log('\n=== STEP 6: Check updated positions ===');
const { data: positions, error: posErr2 } = await supabase
  .from('investor_positions')
  .select('fund_id, shares, current_value, cost_basis, is_active')
  .eq('investor_id', INVESTOR_ID);
console.log('Updated positions:', JSON.stringify(positions, null, 2));
if (posErr2) console.error('Pos error:', posErr2.message);

// Step 7: Yield distribution for SOL fund
const solPositions = positions?.find(p => p.fund_id === SOL_FUND);
if (solPositions && solPositions.current_value > 0) {
  console.log('\n=== STEP 7: Apply yield distribution for SOL fund ===');
  const { data: yieldData, error: yieldErr } = await supabase.rpc('apply_adb_yield_distribution_v3', {
    p_fund_id: SOL_FUND,
    p_recorded_aum: solPositions.current_value,
    p_distribution_date: '2026-01-31',
    p_purpose: 'reporting'
  });
  console.log('Yield result:', JSON.stringify(yieldData));
  console.log('Yield error:', yieldErr?.message || 'none');
} else {
  console.log('\n=== STEP 7: Skipping yield (no SOL position or value=0) ===');
  // Try apply_daily_yield_with_validation instead
  console.log('Trying apply_daily_yield_with_validation...');
  const { data: yieldData2, error: yieldErr2 } = await supabase.rpc('apply_daily_yield_with_validation', {
    p_fund_id: SOL_FUND,
    p_gross_yield_pct: 0.02,
    p_yield_date: '2026-01-31',
    p_created_by: adminId,
    p_purpose: 'reporting'
  });
  console.log('Daily yield result:', JSON.stringify(yieldData2));
  console.log('Daily yield error:', yieldErr2?.message || 'none');
}

// Final positions
console.log('\n=== FINAL: All positions for thomas.puech ===');
const { data: finalPos, error: finalErr } = await supabase
  .from('investor_positions')
  .select('fund_id, shares, current_value, cost_basis, cumulative_yield_earned, is_active')
  .eq('investor_id', INVESTOR_ID);
console.log('Final positions:', JSON.stringify(finalPos, null, 2));
if (finalErr) console.error('Final error:', finalErr.message);

