import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

const ADMIN = 'a16a7e50-fefd-4bfe-897c-d16279b457c2';
const BTC_FUND = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const JOSE = '203caf71-a9ac-4e2a-bbd3-b45dd51758d4';

// Check profiles count
const { count: profileCount } = await sb.from('profiles').select('*', { count: 'exact', head: true });
console.log('Total profiles:', profileCount);

const { data: profileSample } = await sb.from('profiles').select('id, first_name, last_name, account_type, ib_parent_id, fee_percentage').limit(5);
console.log('Profile sample:', profileSample?.map(p => `${p.first_name} ${p.id.slice(0,8)}`));

// Try inserting a YIELD transaction directly (will void it after)
const refId = 'test-direct-yield-' + Date.now();
const { data: tx, error: txErr } = await sb
  .from('transactions_v2')
  .insert({
    fund_id: BTC_FUND,
    investor_id: JOSE,
    tx_date: '2020-01-01',
    value_date: '2020-01-01',
    asset: 'BTC',
    fund_class: 'BTC',
    amount: 0.001,
    type: 'YIELD',
    source: 'yield_distribution',
    distribution_id: null,
    reference_id: refId,
    is_system_generated: true,
    purpose: 'transaction',
    visibility_scope: 'admin_only',
    created_by: ADMIN,
    notes: 'test direct yield insert - will be voided',
  })
  .select()
  .single();

if (txErr) {
  console.log('DIRECT YIELD INSERT ERROR:', txErr.message);
} else {
  console.log('Direct YIELD insert: OK, id=', tx.id);
  // Void it immediately
  const { error: voidErr } = await sb
    .from('transactions_v2')
    .update({ is_voided: true, voided_at: new Date().toISOString() })
    .eq('id', tx.id);
  console.log('Voided:', voidErr ? voidErr.message : 'OK');
}
