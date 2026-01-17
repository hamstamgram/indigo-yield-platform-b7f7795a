#!/usr/bin/env node
const { createClient } = require('@supabase/supabase-js');
const supabase = createClient(
  'https://nkfimvovosdehmyyjubn.supabase.co',
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k'
);

async function checkPurpose() {
  // Get a transaction to see what purpose values exist
  const { data } = await supabase
    .from('transactions_v2')
    .select('purpose, type')
    .not('purpose', 'is', null)
    .limit(10);

  console.log('Existing purpose values:');
  data?.forEach(d => console.log(' -', d.purpose, '(type:', d.type + ')'));
}

checkPurpose();
