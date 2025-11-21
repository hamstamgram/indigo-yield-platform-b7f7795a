#!/usr/bin/env node
/**
 * Check if database migrations have been executed
 */

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

console.log('🔍 Checking migration status...\n');

// Check if new tables exist
const newTables = ['investor_emails', 'email_logs', 'onboarding_submissions'];
const oldTables = ['deposits', 'yield_rates', 'support_tickets'];
const backupTables = ['yield_rates_backup_20251118', 'assets_backup_20251118'];

async function checkTableExists(tableName) {
  try {
    const response = await fetch(
      `${SUPABASE_URL}/rest/v1/${tableName}?limit=0`,
      {
        method: 'HEAD',
        headers: {
          'apikey': ANON_KEY,
          'Authorization': `Bearer ${ANON_KEY}`
        }
      }
    );

    return response.status === 200;
  } catch (error) {
    return false;
  }
}

console.log('📊 Checking new tables (should exist after migration):');
for (const table of newTables) {
  const exists = await checkTableExists(table);
  console.log(`  ${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
}

console.log('\n📊 Checking old tables (should NOT exist after migration):');
for (const table of oldTables) {
  const exists = await checkTableExists(table);
  console.log(`  ${exists ? '⚠️ ' : '✅'} ${table}: ${exists ? 'STILL EXISTS (not deleted)' : 'DELETED'}`);
}

console.log('\n📊 Checking backup tables (should exist after migration):');
for (const table of backupTables) {
  const exists = await checkTableExists(table);
  console.log(`  ${exists ? '✅' : '❌'} ${table}: ${exists ? 'EXISTS' : 'NOT FOUND'}`);
}

console.log('\n' + '='.repeat(60));

// Determine migration status
const newTablesExist = await Promise.all(newTables.map(checkTableExists));
const oldTablesExist = await Promise.all(oldTables.map(checkTableExists));

if (newTablesExist.every(e => e) && oldTablesExist.every(e => !e)) {
  console.log('✅ MIGRATIONS COMPLETED SUCCESSFULLY');
  console.log('   All new tables created, old tables deleted');
} else if (!newTablesExist.some(e => e)) {
  console.log('⏳ MIGRATIONS NOT YET RUN');
  console.log('   New tables not found - ready to execute migrations');
} else {
  console.log('⚠️  PARTIAL MIGRATION STATE');
  console.log('   Some tables exist - may need to investigate');
}

console.log('='.repeat(60));
