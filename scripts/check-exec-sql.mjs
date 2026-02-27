import { createClient } from '@supabase/supabase-js';

const sb = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k',
  { auth: { autoRefreshToken: false, persistSession: false } }
);

// Check if any SQL execution functions exist
const tests = [
  ['exec_sql', { query: 'SELECT 1' }],
  ['execute_sql', { sql: 'SELECT 1' }],
  ['run_sql', { query: 'SELECT 1' }],
  ['pg_execute', { statement: 'SELECT 1' }],
];

for (const [name, params] of tests) {
  const { error } = await sb.rpc(name, params);
  if (!error || !error.message.includes('Could not find')) {
    console.log(`FOUND: ${name} - ${error?.message || 'OK'}`);
  }
}
console.log('Done checking exec functions');

// Also check what functions are available
const { data: fns } = await sb
  .from('pg_proc')
  .select('proname')
  .ilike('proname', '%exec%')
  .limit(10);
console.log('Exec functions in pg_proc:', fns);
