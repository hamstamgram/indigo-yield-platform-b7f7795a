import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// 1. Check calculate_yield_allocations is callable
const BTC_FUND = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const { data: allocs, error: ae } = await sb.rpc('calculate_yield_allocations', {
  p_fund_id: BTC_FUND,
  p_recorded_aum: 3.5,
  p_period_end: '2025-01-01',
});
console.log('calculate_yield_allocations:', ae ? `ERROR: ${ae.message}` : `OK (${allocs?.length} rows)`);
if (allocs?.length > 0) console.log('  first row keys:', Object.keys(allocs[0]));

// 2. Query funds for asset and fund_class
const { data: funds } = await sb.from('funds').select('id, name, asset, fund_class, code').eq('status', 'active');
console.log('\nFunds:');
funds?.forEach(f => console.log(`  ${f.code} | asset=${f.asset} | fund_class=${f.fund_class} | id=${f.id}`));

// 3. Check fees_account
const { data: feesAcct } = await sb.from('profiles').select('id, first_name, last_name, account_type').in('account_type', ['fees_account']);
console.log('\nFees accounts:', feesAcct?.map(p => `${p.first_name} ${p.last_name} (${p.id})`));

// 4. Check ib_commission_schedule in full
const { data: ibSched } = await sb.from('ib_commission_schedule').select('*');
console.log('\nAll IB schedules:', ibSched?.length);
ibSched?.forEach(r => console.log(`  investor=${r.investor_id.slice(0,8)} fund=${r.fund_id.slice(0,8)} eff=${r.effective_date} pct=${r.ib_percentage}`));

// 5. Check profiles with ib info
const { data: profiles } = await sb.from('profiles').select('id, first_name, last_name, account_type, ib_parent_id, fee_percentage');
console.log('\nAll profiles:');
profiles?.forEach(p => console.log(`  ${p.first_name} ${p.last_name} | ${p.account_type} | fee%=${p.fee_percentage} | ib_parent=${p.ib_parent_id?.slice(0,8)} | id=${p.id.slice(0,8)}`));
