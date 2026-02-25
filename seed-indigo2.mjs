import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg'
);

const INVESTOR_ID = '44801beb-4476-4a9b-9751-4e70267f6953';
const SOL_FUND = '7574bc81-aab3-4175-9e7f-803aa6f9eb8f';

// Login
const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
  email: 'qa.admin@indigo.fund',
  password: 'QaTest2026!'
});
if (authError) { console.error('Auth error:', authError.message); process.exit(1); }
const adminToken = authData.session.access_token;
console.log('✅ Logged in');

// Check investor_positions schema
console.log('\n=== Checking investor_positions columns ===');
const { data: posCheck, error: posCheckErr } = await supabase
  .from('investor_positions')
  .select('*')
  .eq('investor_id', INVESTOR_ID)
  .limit(5);
console.log('Positions data:', JSON.stringify(posCheck));
console.log('Positions err:', posCheckErr?.message || 'none');

// Check transactions table
console.log('\n=== Checking transactions for investor ===');
const { data: txData, error: txErr } = await supabase
  .from('transactions')
  .select('*')
  .eq('investor_id', INVESTOR_ID)
  .limit(10);
console.log('Transactions:', JSON.stringify(txData, null, 2));
console.log('Tx err:', txErr?.message || 'none');

// Try direct insert into transactions
console.log('\n=== Try direct INSERT into transactions ===');
const { data: insertData, error: insertErr } = await supabase
  .from('transactions')
  .insert({
    investor_id: INVESTOR_ID,
    fund_id: SOL_FUND,
    type: 'DEPOSIT',
    amount: 1000,
    transaction_date: '2026-01-15',
    notes: 'QA test deposit via API'
  })
  .select();
console.log('Insert result:', JSON.stringify(insertData));
console.log('Insert error:', insertErr?.message || 'none');

