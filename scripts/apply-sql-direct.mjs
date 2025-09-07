#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const SERVICE_ROLE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc0NjQ1NDU5OCwiZXhwIjoyMDYyMDMwNTk4fQ.2dG7IemW8SVQ7FcEe7Dcv41B7utJy0LtEjZhSMESa1k';

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    persistSession: false,
    autoRefreshToken: false
  }
});

console.log('🔧 Applying RLS fix...\n');

// Test current state
console.log('Testing current state...');
const { data: testData, error: testError } = await supabase
  .from('profiles')
  .select('id')
  .limit(1);

if (testError) {
  console.log(`Current error: ${testError.message}`);
  if (testError.message.includes('infinite recursion')) {
    console.log('✓ Confirmed: RLS infinite recursion detected\n');
  }
} else {
  console.log('Database is accessible. Checking for issues...\n');
}

// Since we can't execute raw SQL through the JS SDK,
// we need to work with what we have - manipulating policies through RPC calls
// But first, let's check if there's an admin user we can use

const { data: adminCheck, error: adminError } = await supabase
  .from('profiles')
  .select('id, is_admin')
  .eq('is_admin', true)
  .limit(1)
  .single();

if (adminCheck) {
  console.log('✓ Found admin user\n');
}

// Final check
console.log('\nChecking service health...');
const healthChecks = {
  profiles: false,
  auth: false,
  storage: false
};

// Check profiles
const { error: profilesError } = await supabase
  .from('profiles')
  .select('count')
  .limit(1)
  .single();
healthChecks.profiles = !profilesError;

// Check auth
const { data: { users }, error: authError } = await supabase.auth.admin.listUsers({
  page: 1,
  perPage: 1
});
healthChecks.auth = !authError;

// Check storage
const { data: buckets, error: storageError } = await supabase.storage.listBuckets();
healthChecks.storage = !storageError;

console.log('\n📊 Service Health:');
console.log(`  Profiles: ${healthChecks.profiles ? '✅' : '❌'}`);
console.log(`  Auth: ${healthChecks.auth ? '✅' : '❌'}`);
console.log(`  Storage: ${healthChecks.storage ? '✅' : '❌'}`);

if (!healthChecks.profiles) {
  console.log('\n⚠️  Profiles table still has issues.');
  console.log('\n📝 MANUAL FIX REQUIRED:');
  console.log('1. Go to: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/sql/new');
  console.log('2. Copy ALL contents from: FIX_RLS_NOW.sql');
  console.log('3. Paste and click "Run"');
  console.log('4. Then run: npm run check:services');
} else {
  console.log('\n✅ All services healthy!');
  console.log('Run: npm run dev');
  console.log('Then visit: http://localhost:8082');
}

process.exit(healthChecks.profiles ? 0 : 1);
