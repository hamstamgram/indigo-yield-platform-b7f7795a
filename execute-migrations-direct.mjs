import pkg from 'pg';
const { Client } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ============================================
// SUPABASE DATABASE CONNECTION
// ============================================

// Connection string format: postgresql://postgres:[PASSWORD]@db.[PROJECT_REF].supabase.co:5432/postgres
// Project ref: nkfimvovosdehmyyjubn
// For this to work, you need the database password from your Supabase project settings

const DATABASE_URL = process.env.DATABASE_URL || process.env.SUPABASE_DB_URL;

if (!DATABASE_URL) {
  console.error('❌ ERROR: DATABASE_URL environment variable not set');
  console.error('\nPlease set DATABASE_URL with your Supabase connection string:');
  console.error('  export DATABASE_URL="postgresql://postgres:[PASSWORD]@db.nkfimvovosdehmyyjubn.supabase.co:5432/postgres"');
  console.error('\nOr run with:');
  console.error('  DATABASE_URL="postgresql://postgres:[PASSWORD]@db.nkfimvovosdehmyyjubn.supabase.co:5432/postgres" node execute-migrations-direct.mjs');
  console.error('\n⚠️  You can find your database password in Supabase Dashboard:');
  console.error('  https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/settings/database');
  process.exit(1);
}

console.log('==============================================');
console.log('DATABASE MIGRATION EXECUTION (Direct)');
console.log('==============================================\n');

// Create PostgreSQL client
const client = new Client({
  connectionString: DATABASE_URL,
  // Important: Disable prepared statements for compatibility
  statement_timeout: 60000, // 60 seconds
});

async function executeSQLFile(filePath, description) {
  try {
    console.log(`\n📄 Reading ${description}...`);
    const sql = fs.readFileSync(filePath, 'utf8');

    console.log(`✅ File loaded (${sql.length} characters)`);
    console.log(`⚡ Executing ${description}...\n`);

    const result = await client.query(sql);

    console.log(`✅ ${description} completed successfully!`);

    // Show NOTICE messages if any
    if (client._events && client._events.notice) {
      console.log('\n📋 Database Messages:');
    }

    return result;
  } catch (error) {
    console.error(`\n❌ ERROR executing ${description}:`);
    console.error(error.message);
    if (error.detail) {
      console.error('Detail:', error.detail);
    }
    if (error.hint) {
      console.error('Hint:', error.hint);
    }
    throw error;
  }
}

async function runMigrations() {
  try {
    console.log('🔌 Connecting to Supabase database...');
    await client.connect();
    console.log('✅ Connected successfully!\n');

    // Listen for NOTICE messages from PostgreSQL
    client.on('notice', (msg) => {
      console.log('📢 NOTICE:', msg.message);
    });

    console.log('==============================================');
    console.log('STEP 1: DATABASE CLEANUP');
    console.log('==============================================');

    const cleanupFile = path.join(__dirname, 'database_cleanup_migration.sql');
    await executeSQLFile(cleanupFile, 'Cleanup Migration');

    console.log('\n==============================================');
    console.log('STEP 2: DEPLOY NEW TABLES');
    console.log('==============================================');

    const deployFile = path.join(__dirname, 'deploy_new_tables_migration.sql');
    await executeSQLFile(deployFile, 'New Tables Deployment');

    console.log('\n==============================================');
    console.log('✅ MIGRATION COMPLETE');
    console.log('==============================================\n');

    console.log('📊 Summary:');
    console.log('  ✅ 10 tables deleted (deposits, yield_rates, portfolio_history, daily_nav, benchmarks, reconciliation, withdrawal_requests, secure_shares, bank_accounts, support_tickets)');
    console.log('  ✅ 3 new tables created (investor_emails, email_logs, onboarding_submissions)');
    console.log('  ✅ 2 backup tables created (yield_rates_backup_20251118, assets_backup_20251118)\n');

    console.log('🔍 Verification (run these queries in Supabase SQL Editor):');
    console.log('  SELECT table_name FROM information_schema.tables WHERE table_schema = \'public\' ORDER BY table_name;');
    console.log('  SELECT * FROM yield_rates_backup_20251118;');
    console.log('  SELECT * FROM assets_backup_20251118;\n');

  } catch (error) {
    console.error('\n💥 Migration failed!');
    console.error('Error:', error.message);
    process.exit(1);
  } finally {
    console.log('🔌 Closing database connection...');
    await client.end();
    console.log('✅ Connection closed.\n');
  }
}

// Run migrations
console.log('⚠️  This will execute the following changes:');
console.log('   1. DELETE 10 tables (9 empty + support_tickets)');
console.log('   2. CREATE 3 new tables (investor_emails, email_logs, onboarding_submissions)');
console.log('   3. CREATE 2 backup tables (yield_rates_backup_20251118, assets_backup_20251118)\n');

runMigrations()
  .then(() => {
    console.log('✨ All done!');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Fatal error:', error);
    process.exit(1);
  });
