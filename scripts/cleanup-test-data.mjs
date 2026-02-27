import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

const ADMIN = 'a16a7e50-fefd-4bfe-897c-d16279b457c2';
const TEST_TX_ID = 'd401f4c1-019c-4c4e-af8f-d93aaaeea91e';
const TEST_DIST_ID = '3750c729-4e70-486f-9f25-8028a9d24924';

// Void the test yield distribution first (cascade)
console.log('Voiding test yield distribution:', TEST_DIST_ID);
const { data: vd, error: vde } = await supabase.rpc('void_yield_distribution', {
  p_admin_id: ADMIN,
  p_distribution_id: TEST_DIST_ID,
  p_reason: 'test probe cleanup',
  p_void_crystals: false,
});
if (vde) console.log('Error voiding YD:', vde.message);
else console.log('Voided YD:', JSON.stringify(vd));

// Void the test transaction
console.log('\nVoiding test transaction:', TEST_TX_ID);
const { data: vt, error: vte } = await supabase.rpc('void_transaction', {
  p_admin_id: ADMIN,
  p_transaction_id: TEST_TX_ID,
  p_reason: 'test probe cleanup',
});
if (vte) console.log('Error voiding TX:', vte.message);
else console.log('Voided TX:', JSON.stringify(vt));

// Also void any other test transactions with notes containing 'schema test probe'
const { data: testTxs } = await supabase
  .from('transactions_v2')
  .select('id, notes, type, amount, tx_date')
  .like('notes', '%schema test probe%')
  .eq('is_voided', false);

console.log('\nOther test transactions to void:', testTxs?.length || 0);
for (const tx of (testTxs || [])) {
  console.log('  Voiding:', tx.id, tx.notes);
  const { error } = await supabase.rpc('void_transaction', {
    p_admin_id: ADMIN,
    p_transaction_id: tx.id,
    p_reason: 'test probe cleanup',
  });
  if (error) console.log('  Error:', error.message);
  else console.log('  OK');
}

// Check current state
const BTC = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const { data: txCount } = await supabase
  .from('transactions_v2')
  .select('type')
  .eq('fund_id', BTC)
  .eq('is_voided', false);
console.log('\nLive BTC transactions after cleanup:', txCount?.length || 0);

const { data: ydCount } = await supabase
  .from('yield_distributions')
  .select('id')
  .eq('fund_id', BTC)
  .eq('is_voided', false);
console.log('Live BTC yield distributions after cleanup:', ydCount?.length || 0);
