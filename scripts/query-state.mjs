import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

// 1. Query profiles
const { data: profiles, error: profilesErr } = await supabase
  .from('profiles')
  .select('id, first_name, last_name, email, account_type, ib_parent_id')
  .order('first_name');

if (profilesErr) { console.error('profiles error:', profilesErr.message); process.exit(1); }

console.log('\n=== PROFILES ===');
profiles.forEach(p => {
  console.log(`  ${p.first_name} ${p.last_name} | ${p.account_type} | ib_parent=${p.ib_parent_id} | id=${p.id}`);
});

// 2. Query funds
const { data: funds } = await supabase
  .from('funds')
  .select('id, name, asset, symbol, status')
  .order('asset');

console.log('\n=== FUNDS ===');
funds.forEach(f => {
  console.log(`  ${f.asset} | ${f.name} | ${f.status} | id=${f.id}`);
});

// 3. Check system_mode
const { data: sysConfig } = await supabase
  .from('system_config')
  .select('key, value')
  .eq('key', 'system_mode')
  .single();
console.log('\n=== SYSTEM MODE ===');
console.log('  system_mode:', sysConfig?.value);

// 4. Count live transactions per fund
const { data: txCounts } = await supabase.rpc('execute_sql', {
  query: `
    SELECT f.asset, t.type, COUNT(*) as cnt
    FROM transactions_v2 t
    JOIN funds f ON f.id = t.fund_id
    WHERE t.is_voided = false
    GROUP BY f.asset, t.type
    ORDER BY f.asset, t.type
  `
}).catch(() => ({ data: null }));

// Fallback using direct query
const { data: txCountsDirect, error: txErr } = await supabase
  .from('transactions_v2')
  .select('fund_id, type')
  .eq('is_voided', false);

if (txCountsDirect) {
  const counts = {};
  txCountsDirect.forEach(t => {
    const key = `${t.fund_id}|${t.type}`;
    counts[key] = (counts[key] || 0) + 1;
  });

  console.log('\n=== LIVE TX COUNTS BY FUND+TYPE ===');
  const fundMap = {};
  funds.forEach(f => { fundMap[f.id] = f.asset; });
  Object.entries(counts)
    .sort()
    .forEach(([key, cnt]) => {
      const [fid, type] = key.split('|');
      console.log(`  ${fundMap[fid] || fid} ${type}: ${cnt}`);
    });
}

// 5. Check live yield distributions
const { data: ydCounts } = await supabase
  .from('yield_distributions')
  .select('fund_id, period_end')
  .eq('is_voided', false)
  .order('period_end');

console.log('\n=== LIVE YIELD DISTRIBUTIONS ===');
const fundMap2 = {};
funds.forEach(f => { fundMap2[f.id] = f.asset; });
ydCounts.forEach(yd => {
  console.log(`  ${fundMap2[yd.fund_id] || yd.fund_id} | ${yd.period_end}`);
});
console.log(`  Total: ${ydCounts.length}`);

// 6. Check RPCs available
const { data: rpcs } = await supabase.rpc('execute_sql', { query: 'SELECT proname FROM pg_proc WHERE proname LIKE \'apply%\' AND proname NOT LIKE \'%_v4%\' ORDER BY proname' }).catch(() => ({ data: null }));
if (!rpcs) {
  // Try direct pg_proc query - not available via RPC, skip
  console.log('\n(Cannot query pg_proc via supabase-js directly)');
}

// 7. Check investor_positions for BTC/ETH/USDT
const BTC_FUND = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const ETH_FUND = '717614a2-9e24-4abc-a89d-02209a3a772a';
const USDT_FUND = '8ef9dc49-e76c-4882-84ab-a449ef4326db';

const { data: positions } = await supabase
  .from('investor_positions')
  .select('investor_id, fund_id, current_value, cost_basis, is_active')
  .in('fund_id', [BTC_FUND, ETH_FUND, USDT_FUND])
  .eq('is_active', true);

console.log('\n=== ACTIVE POSITIONS (BTC/ETH/USDT) ===');
if (positions && positions.length > 0) {
  const profMap = {};
  profiles.forEach(p => { profMap[p.id] = `${p.first_name} ${p.last_name}`; });
  positions.forEach(pos => {
    console.log(`  ${fundMap2[pos.fund_id]} | ${profMap[pos.investor_id] || pos.investor_id} | value=${pos.current_value}`);
  });
} else {
  console.log('  (no active positions for BTC/ETH/USDT)');
}
