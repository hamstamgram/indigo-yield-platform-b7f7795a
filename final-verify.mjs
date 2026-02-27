import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
);

const INVESTOR_ID = '44801beb-4476-4a9b-9751-4e70267f6953';
const SOL_FUND = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';
const XRP_FUND = '2c123c4f-76b4-4504-867e-059649855417';

// Login as thomas to simulate investor portal
const { data: thomasAuth, error: thomasErr } = await supabase.auth.signInWithPassword({
  email: 'thomas.puech@indigo.fund',
  password: 'QaTest2026!'
});

if (thomasErr) {
  console.log('Thomas login error (trying QaInvestor2026!):', thomasErr.message);
  // Try alternate password
  const { data: t2, error: t2Err } = await supabase.auth.signInWithPassword({
    email: 'thomas.puech@indigo.fund',
    password: 'QaInvestor2026!'
  });
  if (t2Err) {
    console.log('Second try error:', t2Err.message);
    // Fall back to admin view
    console.log('Will use admin view instead');
    const { data: aData } = await supabase.auth.signInWithPassword({
      email: 'qa.admin@indigo.fund',
      password: 'QaTest2026!'
    });
  }
} else {
  console.log('✅ Thomas logged in as investor');
}

// Check positions from investor view (may be RLS-gated)
const { data: pos } = await supabase
  .from('investor_positions')
  .select('fund_id, shares, current_value, is_active')
  .eq('investor_id', INVESTOR_ID)
  .eq('is_active', true);
console.log('Active positions (investor view):', JSON.stringify(pos, null, 2));

// Check fund info
const { data: funds } = await supabase
  .from('funds')
  .select('id, name, symbol')
  .in('id', [SOL_FUND, XRP_FUND]);
console.log('\nFund info:', JSON.stringify(funds, null, 2));

// Count yield_allocations
const { data: ya, error: yaErr } = await supabase
  .from('yield_allocations')
  .select('id, distribution_id, net_amount, gross_amount, period_end, is_voided')
  .eq('investor_id', INVESTOR_ID)
  .eq('is_voided', false);
console.log('\nNon-voided yield allocations:', JSON.stringify(ya, null, 2));

// Total AUM
const totalAUM = pos?.reduce((sum, p) => sum + p.current_value, 0) || 0;
console.log(`\n=== FINAL AUM for thomas.puech: ${totalAUM} ===`);

