const { createClient } = require('@supabase/supabase-js');
const supabase = createClient('https://nkfimvovosdehmyyjubn.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k');

(async () => {
  const { data: fund } = await supabase.from('funds').select('id').eq('asset', 'ETH').eq('status', 'active').single();

  const { data: preview } = await supabase.rpc('preview_daily_yield_to_fund_v3', {
    p_fund_id: fund.id,
    p_yield_date: '2026-01-16',
    p_new_aum: 295,
    p_purpose: 'reporting'
  });

  const babak = preview.distributions?.find(d => d.investorName?.includes('Babak'));
  if (babak) {
    console.log('═'.repeat(50));
    console.log('  BABAK FEE VERIFICATION (CORRECTED)');
    console.log('═'.repeat(50));
    console.log('\n  Gross Yield:', babak.grossYield?.toFixed(4), 'ETH');
    console.log('\n  FEE BREAKDOWN:');
    console.log('    Total Fee %:', babak.feePct + '%', '(charged to Babak)');
    console.log('    Fee Amount:', babak.feeAmount?.toFixed(4), 'ETH');
    console.log('    → Lars (IB):', babak.ibAmount?.toFixed(4), 'ETH', '(' + babak.ibPct + '%)');
    console.log('    → INDIGO:', (babak.feeAmount - babak.ibAmount)?.toFixed(4), 'ETH', '(' + (babak.feePct - babak.ibPct) + '%)');
    console.log('\n  Net to Babak:', babak.netYield?.toFixed(4), 'ETH');

    // Verify
    const expectedIndigoFee = babak.grossYield * 0.18;
    const expectedIbFee = babak.grossYield * 0.02;
    const actualIndigoFee = babak.feeAmount - babak.ibAmount;

    console.log('\n  VERIFICATION:');
    if (babak.feePct === 20 && babak.ibPct === 2) {
      console.log('    ✓ Total fee: 20% (correct)');
      console.log('    ✓ IB fee: 2% to Lars (correct)');
      console.log('    ✓ INDIGO: 18% (correct)');
    } else {
      console.log('    ✗ Fee mismatch!');
    }
    console.log('═'.repeat(50));
  }
})();
