#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

async function check() {
  // Get test accounts by name pattern
  const { data: profiles } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .or('full_name.ilike.%Alice%,full_name.ilike.%Bob%,full_name.ilike.%Carol%');

  console.log('Test accounts found:');
  profiles?.forEach(p => {
    console.log(`  ${p.full_name}: ${p.email} (${p.id.slice(0,8)}...)`);
  });

  // Get variance info
  console.log('\nVariance accounts:');
  const { data: variance } = await supabase
    .from('v_position_transaction_variance')
    .select('investor_id, investor_email, balance_variance');

  variance?.forEach(v => {
    console.log(`  ${v.investor_email}: variance ${v.balance_variance} (${v.investor_id.slice(0,8)}...)`);
  });
}

check();
