import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
);

const SOL_FUND = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';
const XRP_FUND = '2c123c4f-76b4-4504-867e-059649855417';
const INVESTOR_ID = '44801beb-4476-4a9b-9751-4e70267f6953';
const SOL_DIST_ID = 'b20b1d1e-919c-4311-86df-db3d3c698d2c';
const XRP_DIST_ID = 'f00835a7-984c-4c88-b409-830ca9061909';

// Login as admin
const { data: authData } = await supabase.auth.signInWithPassword({
  email: 'qa.admin@indigo.fund',
  password: 'QaTest2026!'
});
console.log('✅ Admin logged in');

// Try fetching yield_distributions by specific ID
console.log('\n=== Check specific yield distribution ===');
const { data: yd, error: ydErr } = await supabase
  .from('yield_distributions')
  .select('*')
  .eq('id', SOL_DIST_ID);
console.log('SOL yield dist:', JSON.stringify(yd), 'error:', ydErr?.message);

// Try fetching all yield_distributions
const { data: allYd, error: allYdErr } = await supabase
  .from('yield_distributions')
  .select('id, fund_id, distribution_date, period_end, recorded_aum, is_voided')
  .order('distribution_date', { ascending: false })
  .limit(10);
console.log('\nAll yield dists:', JSON.stringify(allYd, null, 2));
console.log('Error:', allYdErr?.message || 'none');

// Check yield_allocations
const { data: ya, error: yaErr } = await supabase
  .from('yield_allocations')
  .select('*')
  .eq('investor_id', INVESTOR_ID)
  .limit(5);
console.log('\nYield allocations:', JSON.stringify(ya, null, 2));
console.log('YA error:', yaErr?.message || 'none');

// Check investor_fund_performance
const { data: ifp, error: ifpErr } = await supabase
  .from('investor_fund_performance')
  .select('*')
  .eq('investor_id', INVESTOR_ID)
  .limit(5);
console.log('\nInvestor fund performance:', JSON.stringify(ifp, null, 2));
console.log('IFP error:', ifpErr?.message || 'none');

// Check investor_daily_balance for thomas
const { data: idb, error: idbErr } = await supabase
  .from('investor_daily_balance')
  .select('fund_id, balance_date, end_of_day_balance')
  .eq('investor_id', INVESTOR_ID)
  .order('balance_date', { ascending: false })
  .limit(5);
console.log('\nInvestor daily balance:', JSON.stringify(idb, null, 2));
console.log('IDB error:', idbErr?.message || 'none');

