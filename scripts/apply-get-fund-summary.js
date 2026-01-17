#!/usr/bin/env node
/**
 * Apply the get_fund_summary function to the database
 */
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

async function apply() {
  console.log('Creating get_fund_summary function...\n');

  // Read the SQL file
  const sqlPath = path.join(__dirname, '../supabase/migrations/20260117_get_fund_summary.sql');
  const sql = fs.readFileSync(sqlPath, 'utf-8');

  // Execute via RPC (raw SQL execution)
  const { error } = await supabase.rpc('exec_sql', { sql_query: sql });

  if (error) {
    // If exec_sql doesn't exist, try direct execution
    console.log('Note: exec_sql RPC not available, testing function directly...');
  }

  // Test the function
  console.log('Testing get_fund_summary()...\n');

  const { data: auth } = await supabase.auth.signInWithPassword({
    email: 'testadmin@indigo.fund',
    password: 'TestAdmin123!'
  });

  if (auth.user) {
    console.log('Authenticated as:', auth.user.email);
  }

  const { data, error: testErr } = await supabase.rpc('get_fund_summary');

  if (testErr) {
    console.log('Function Error:', testErr.message);
    console.log('\nThe function needs to be applied via Supabase Dashboard or CLI.');
    console.log('Migration file created at:', sqlPath);
    return;
  }

  console.log('\n✓ get_fund_summary() working!\n');
  console.log('Fund Summary:');
  console.log('-'.repeat(80));

  data?.forEach(f => {
    console.log(`${f.fund_code} (${f.asset}):`);
    console.log(`  AUM: ${f.total_aum} | Investors: ${f.active_investor_count}/${f.investor_count}`);
    console.log(`  Deposits: ${f.total_deposits} | Withdrawals: ${f.total_withdrawals}`);
    console.log(`  Yield Distributed: ${f.total_yield_distributed} | Fees: ${f.total_fees_collected}`);
    console.log();
  });
}

apply();
