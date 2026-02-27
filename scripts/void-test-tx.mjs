import { createClient } from '@supabase/supabase-js';

// Use anon key to sign in as admin (this gives proper JWT with user context)
const anonSupabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
);

// Sign in as admin
console.log('Signing in as admin...');
const { data: authData, error: authErr } = await anonSupabase.auth.signInWithPassword({
  email: 'adriel@indigo.fund',
  password: 'TestAdmin2026!',
});

if (authErr) {
  console.error('Auth error:', authErr.message);
  process.exit(1);
}

console.log('Signed in as:', authData.user?.email, 'id:', authData.user?.id);

const ADMIN_ID = authData.user?.id;
const TEST_TX_ID = 'd401f4c1-019c-4c4e-af8f-d93aaaeea91e';

// Void the test transaction using the authenticated client
const { data: vt, error: vte } = await anonSupabase.rpc('void_transaction', {
  p_admin_id: ADMIN_ID,
  p_transaction_id: TEST_TX_ID,
  p_reason: 'test probe cleanup',
});

if (vte) {
  console.error('Error voiding TX:', vte.message);
} else {
  console.log('Voided TX:', JSON.stringify(vt));
}

// Verify
const serviceSupabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

const BTC = '0a048d9b-c4cf-46eb-b428-59e10307df93';
const { data: liveTx } = await serviceSupabase
  .from('transactions_v2')
  .select('id, type, amount, tx_date, is_voided')
  .eq('fund_id', BTC)
  .eq('is_voided', false);
console.log('\nLive BTC txs after cleanup:', liveTx?.length, JSON.stringify(liveTx));
