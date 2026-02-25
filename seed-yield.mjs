import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
);

const SOL_FUND = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';
const XRP_FUND = '2c123c4f-76b4-4504-867e-059649855417';
const INVESTOR_ID = '44801beb-4476-4a9b-9751-4e70267f6953';

// Login
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'qa.admin@indigo.fund',
  password: 'QaTest2026!'
});
const adminId = authData.session.user.id;
console.log('✅ Admin logged in');

// Get total AUM for SOL fund (all active positions)
console.log('\n=== Getting total AUM for SOL fund ===');
const { data: solPositions } = await supabase
  .from('investor_positions')
  .select('shares, current_value')
  .eq('fund_id', SOL_FUND)
  .eq('is_active', true);
const solTotalAUM = solPositions?.reduce((sum, p) => sum + p.current_value, 0) || 1000;
console.log('SOL positions:', JSON.stringify(solPositions));
console.log('SOL total AUM:', solTotalAUM);

// Get total AUM for XRP fund
const { data: xrpPositions } = await supabase
  .from('investor_positions')
  .select('shares, current_value')
  .eq('fund_id', XRP_FUND)
  .eq('is_active', true);
const xrpTotalAUM = xrpPositions?.reduce((sum, p) => sum + p.current_value, 0) || 500;
console.log('XRP total AUM:', xrpTotalAUM);

// Run yield distribution for SOL fund
console.log('\n=== Running yield distribution for SOL fund ===');
const { data: solYield, error: solYieldErr } = await supabase.rpc('apply_segmented_yield_distribution_v5', {
  p_fund_id: SOL_FUND,
  p_period_end: '2026-01-31',
  p_recorded_aum: solTotalAUM,
  p_distribution_date: '2026-01-31',
  p_purpose: 'reporting',
  p_created_by: adminId
});
console.log('SOL yield result:', JSON.stringify(solYield));
console.log('SOL yield error:', solYieldErr?.message || 'none');

// Run yield distribution for XRP fund  
console.log('\n=== Running yield distribution for XRP fund ===');
const { data: xrpYield, error: xrpYieldErr } = await supabase.rpc('apply_segmented_yield_distribution_v5', {
  p_fund_id: XRP_FUND,
  p_period_end: '2026-01-31',
  p_recorded_aum: xrpTotalAUM,
  p_distribution_date: '2026-01-31',
  p_purpose: 'reporting',
  p_created_by: adminId
});
console.log('XRP yield result:', JSON.stringify(xrpYield));
console.log('XRP yield error:', xrpYieldErr?.message || 'none');

// Final check - positions and yield history
console.log('\n=== Final positions ===');
const { data: finalPos } = await supabase
  .from('investor_positions')
  .select('fund_id, shares, current_value, cumulative_yield_earned, is_active')
  .eq('investor_id', INVESTOR_ID);
console.log('Final positions:', JSON.stringify(finalPos, null, 2));

// Check yield_distributions
console.log('\n=== Recent yield distributions ===');
const { data: yieldDist } = await supabase
  .from('yield_distributions')
  .select('id, fund_id, distribution_date, recorded_aum, is_voided')
  .in('fund_id', [SOL_FUND, XRP_FUND])
  .order('distribution_date', { ascending: false })
  .limit(5);
console.log('Yield distributions:', JSON.stringify(yieldDist, null, 2));

// Check investor yield allocations
console.log('\n=== Investor yield allocations ===');
const { data: yieldAlloc } = await supabase
  .from('yield_allocations')
  .select('fund_id, period_end, net_yield, gross_yield_amount, investor_id')
  .eq('investor_id', INVESTOR_ID)
  .order('period_end', { ascending: false })
  .limit(10);
console.log('Yield allocations:', JSON.stringify(yieldAlloc, null, 2));

