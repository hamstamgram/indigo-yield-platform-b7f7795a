import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

// 1. Query funds
const { data: funds, error: fundsErr } = await supabase
  .from('funds')
  .select('id, name, asset, status')
  .order('asset');

if (fundsErr) { console.error('funds error:', fundsErr.message); }
else {
  console.log('=== FUNDS ===');
  funds.forEach(f => console.log(`  ${f.asset} | ${f.name} | ${f.status} | id=${f.id}`));
}

// 2. Check system_mode
const { data: sysConfig, error: sysErr } = await supabase
  .from('system_config')
  .select('key, value')
  .eq('key', 'system_mode')
  .single();
if (sysErr) { console.error('system_config error:', sysErr.message); }
else { console.log('\nsystem_mode:', sysConfig?.value); }

// 3. Count live txs for BTC/ETH/USDT
const BTC_FUND = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const ETH_FUND = '717614a2-9e24-4abc-a89d-02209a3a772a';
const USDT_FUND = '8ef9dc49-e76c-4882-84ab-a449ef4326db';

const { data: txs, error: txErr } = await supabase
  .from('transactions_v2')
  .select('fund_id, type, is_voided')
  .in('fund_id', [BTC_FUND, ETH_FUND, USDT_FUND]);

if (txErr) { console.error('txs error:', txErr.message); }
else {
  const fundNames = { [BTC_FUND]: 'BTC', [ETH_FUND]: 'ETH', [USDT_FUND]: 'USDT' };
  const counts = {};
  txs.forEach(t => {
    const k = `${fundNames[t.fund_id]}|${t.type}|${t.is_voided ? 'voided' : 'live'}`;
    counts[k] = (counts[k] || 0) + 1;
  });
  console.log('\n=== TX COUNTS (BTC/ETH/USDT) ===');
  Object.entries(counts).sort().forEach(([k, v]) => console.log(`  ${k}: ${v}`));
}

// 4. Check live yield distributions
const { data: yds, error: ydErr } = await supabase
  .from('yield_distributions')
  .select('fund_id, period_end, is_voided')
  .in('fund_id', [BTC_FUND, ETH_FUND, USDT_FUND])
  .eq('is_voided', false);

if (ydErr) { console.error('yield_distributions error:', ydErr.message); }
else {
  const fundNames = { [BTC_FUND]: 'BTC', [ETH_FUND]: 'ETH', [USDT_FUND]: 'USDT' };
  console.log(`\n=== LIVE YD (BTC/ETH/USDT): ${yds.length} total ===`);
  yds.forEach(yd => console.log(`  ${fundNames[yd.fund_id]} | ${yd.period_end}`));
}

// 5. Test apply_transaction_with_crystallization exists
const { data: testRpc, error: rpcErr } = await supabase.rpc('apply_transaction_with_crystallization', {
  p_fund_id: BTC_FUND,
  p_investor_id: '203caf71-a9ac-4e2a-bbd3-b45dd51758d4',
  p_type: 'DEPOSIT',
  p_amount: 0.001,
  p_economic_date: '2024-01-01',
  p_reference_id: 'test-probe-do-not-use',
  p_notes: 'test probe',
  p_actor_user_id: 'a16a7e50-fefd-4bfe-897c-d16279b457c2',
  p_source: 'manual_admin',
  p_asset: 'BTC',
  p_distribution_id: null
});
if (rpcErr) {
  console.log('\napply_transaction_with_crystallization test call error:', rpcErr.message);
} else {
  console.log('\napply_transaction_with_crystallization: EXISTS (test returned:', JSON.stringify(testRpc), ')');
}
