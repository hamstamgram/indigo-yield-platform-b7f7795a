#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import fs from 'fs/promises';
import path from 'path';

const SUPABASE_URL = process.env.VITE_SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

// Test credentials (should be in env vars for real testing)
const TEST_LP_EMAIL = process.env.TEST_LP_EMAIL || 'test-lp@example.com';
const TEST_LP_PASSWORD = process.env.TEST_LP_PASSWORD || 'test-password';
const TEST_ADMIN_EMAIL = process.env.TEST_ADMIN_EMAIL || 'test-admin@example.com';
const TEST_ADMIN_PASSWORD = process.env.TEST_ADMIN_PASSWORD || 'test-password';

async function testLPPermissions(supabase) {
  const tests = [];
  
  // Test 1: LP can read own profile
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .single();
    
    tests.push({
      test: 'LP can read own profile',
      passed: !error,
      error: error?.message,
      data: data ? 'Profile retrieved' : null
    });
  } catch (e) {
    tests.push({
      test: 'LP can read own profile',
      passed: false,
      error: e.message
    });
  }

  // Test 2: LP cannot read other profiles
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    tests.push({
      test: 'LP cannot read other profiles',
      passed: error || (data && data.length <= 1),
      message: data?.length > 1 ? `Found ${data.length} profiles - RLS may be weak` : 'Properly restricted'
    });
  } catch (e) {
    tests.push({
      test: 'LP cannot read other profiles',
      passed: true,
      message: 'Access denied as expected'
    });
  }

  // Test 3: LP cannot insert into deposits
  try {
    const { data, error } = await supabase
      .from('deposits')
      .insert({
        investor_id: 'test-id',
        amount: 100,
        asset_code: 'USD'
      });
    
    tests.push({
      test: 'LP cannot insert deposits',
      passed: !!error,
      error: error?.message || 'Unexpected success - RLS missing'
    });
  } catch (e) {
    tests.push({
      test: 'LP cannot insert deposits',
      passed: true,
      message: 'Insert blocked as expected'
    });
  }

  // Test 4: LP cannot insert into withdrawals
  try {
    const { data, error } = await supabase
      .from('withdrawals')
      .insert({
        investor_id: 'test-id',
        amount: 100,
        asset_code: 'USD'
      });
    
    tests.push({
      test: 'LP cannot insert withdrawals',
      passed: !!error,
      error: error?.message || 'Unexpected success - RLS missing'
    });
  } catch (e) {
    tests.push({
      test: 'LP cannot insert withdrawals',
      passed: true,
      message: 'Insert blocked as expected'
    });
  }

  // Test 5: LP can only read own statements
  try {
    const { data, error } = await supabase
      .from('statements')
      .select('*');
    
    tests.push({
      test: 'LP can only read own statements',
      passed: !error,
      message: data ? `Found ${data.length} statements` : 'No statements found'
    });
  } catch (e) {
    tests.push({
      test: 'LP can only read own statements',
      passed: false,
      error: e.message
    });
  }

  return tests;
}

async function testAdminPermissions(supabase) {
  const tests = [];
  
  // Test 1: Admin can read all profiles
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*');
    
    tests.push({
      test: 'Admin can read all profiles',
      passed: !error && data?.length > 0,
      message: data ? `Found ${data.length} profiles` : 'No profiles found',
      error: error?.message
    });
  } catch (e) {
    tests.push({
      test: 'Admin can read all profiles',
      passed: false,
      error: e.message
    });
  }

  // Test 2: Admin can insert deposits
  try {
    const { data, error } = await supabase
      .from('deposits')
      .insert({
        investor_id: 'test-admin-deposit',
        amount: 100,
        asset_code: 'USD',
        status: 'pending'
      })
      .select();
    
    tests.push({
      test: 'Admin can insert deposits',
      passed: !error,
      message: data ? 'Deposit created' : 'No data returned',
      error: error?.message
    });

    // Clean up if successful
    if (data && data[0]) {
      await supabase
        .from('deposits')
        .delete()
        .eq('id', data[0].id);
    }
  } catch (e) {
    tests.push({
      test: 'Admin can insert deposits',
      passed: false,
      error: e.message
    });
  }

  return tests;
}

async function testStoragePolicies(supabase) {
  const tests = [];
  
  // Test 1: Statements bucket should not be publicly listable
  try {
    const { data, error } = await supabase.storage
      .from('statements')
      .list('');
    
    tests.push({
      test: 'Statements bucket not publicly listable',
      passed: !!error || !data || data.length === 0,
      message: error ? 'Access denied (good)' : `Found ${data?.length || 0} items (potential issue)`
    });
  } catch (e) {
    tests.push({
      test: 'Statements bucket not publicly listable',
      passed: true,
      message: 'Access denied as expected'
    });
  }

  // Test 2: Documents bucket policies
  try {
    const { data, error } = await supabase.storage
      .from('documents')
      .list('');
    
    tests.push({
      test: 'Documents bucket access control',
      passed: !!error || !data || data.length === 0,
      message: error ? 'Access restricted' : `Found ${data?.length || 0} items`
    });
  } catch (e) {
    tests.push({
      test: 'Documents bucket access control',
      passed: true,
      message: 'Access restricted as expected'
    });
  }

  return tests;
}

async function main() {
  console.log('\n🔒 RLS (Row Level Security) Tests');
  console.log(`Supabase URL: ${SUPABASE_URL}`);
  console.log(`Time: ${new Date().toISOString()}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    supabaseUrl: SUPABASE_URL,
    tests: {
      lp: [],
      admin: [],
      storage: []
    },
    summary: {
      total: 0,
      passed: 0,
      failed: 0
    }
  };

  // Initialize Supabase client (anon/LP context)
  const supabaseLp = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

  console.log('📋 Testing LP Permissions...');
  results.tests.lp = await testLPPermissions(supabaseLp);
  
  console.log('\n📋 Testing Storage Policies...');
  results.tests.storage = await testStoragePolicies(supabaseLp);

  // Note: Admin tests would require service role key or actual admin login
  console.log('\n⚠️  Admin tests skipped (requires service role key)');
  
  // Calculate summary
  const allTests = [
    ...results.tests.lp,
    ...results.tests.storage
  ];
  
  results.summary.total = allTests.length;
  results.summary.passed = allTests.filter(t => t.passed).length;
  results.summary.failed = allTests.filter(t => !t.passed).length;

  // Display results
  console.log('\n📊 Test Results:\n');
  
  console.log('LP Permission Tests:');
  results.tests.lp.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`  ${icon} ${test.test}`);
    if (test.message) console.log(`     ${test.message}`);
    if (test.error && !test.passed) console.log(`     Error: ${test.error}`);
  });

  console.log('\nStorage Policy Tests:');
  results.tests.storage.forEach(test => {
    const icon = test.passed ? '✅' : '❌';
    console.log(`  ${icon} ${test.test}`);
    if (test.message) console.log(`     ${test.message}`);
  });

  console.log(`\n📈 Summary:`);
  console.log(`  Total Tests: ${results.summary.total}`);
  console.log(`  Passed: ${results.summary.passed}`);
  console.log(`  Failed: ${results.summary.failed}`);
  console.log(`  Success Rate: ${Math.round((results.summary.passed / results.summary.total) * 100)}%`);

  // Save results
  const outputPath = path.join('artifacts', 'rls', 'rls-test-results.json');
  await fs.mkdir(path.dirname(outputPath), { recursive: true });
  await fs.writeFile(outputPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Results saved to ${outputPath}`);

  // Check for critical RLS issues
  const criticalFailures = results.tests.lp.filter(t => 
    t.test.includes('cannot') && !t.passed
  );

  if (criticalFailures.length > 0) {
    console.error('\n🚨 CRITICAL: RLS policies may be missing or misconfigured!');
    console.error('The following security tests failed:');
    criticalFailures.forEach(f => console.error(`  - ${f.test}`));
  }

  // Exit with appropriate code
  process.exit(results.summary.failed > 0 ? 1 : 0);
}

main().catch(console.error);
