#!/usr/bin/env node
/**
 * Execute New Tables Migration
 * Creates: investor_emails, email_logs, onboarding_submissions
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const SUPABASE_URL = 'https://nkfimvovosdehmyyjubn.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5rZmltdm92b3NkZWhteXlqdWJuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDY0NTQ1OTgsImV4cCI6MjA2MjAzMDU5OH0.pZrIyCCd7dlvvNMGdW8-71BxSVfoKhxs9a5Ezbkmjgg';

console.log('='.repeat(60));
console.log('EXECUTING NEW TABLES MIGRATION');
console.log('='.repeat(60));
console.log('');

// Read migration SQL
const migrationPath = path.join(__dirname, 'deploy_new_tables_migration.sql');
const migrationSQL = fs.readFileSync(migrationPath, 'utf8');

console.log('📄 Migration file: deploy_new_tables_migration.sql');
console.log('📊 Creating tables:');
console.log('   1. investor_emails (multi-email support)');
console.log('   2. email_logs (email delivery tracking)');
console.log('   3. onboarding_submissions (Airtable integration)');
console.log('');

// Try using Supabase REST API with pg_admin extension
console.log('🚀 Attempting execution via Supabase REST API...\n');

try {
  // Check if we have database password for direct connection
  const dbPassword = process.env.SUPABASE_DB_PASSWORD;

  if (dbPassword) {
    console.log('✅ Database password found - using direct connection');
    console.log('');

    // Use pg module for direct connection
    const pkg = await import('pg');
    const { Pool } = pkg.default;

    const pool = new Pool({
      connectionString: `postgresql://postgres.nkfimvovosdehmyyjubn:${dbPassword}@aws-0-us-east-1.pooler.supabase.com:6543/postgres`,
      ssl: { rejectUnauthorized: false }
    });

    console.log('🔗 Connecting to database...');
    const client = await pool.connect();

    console.log('⚡ Executing migration SQL...');
    await client.query(migrationSQL);

    console.log('✅ Migration executed successfully!');
    console.log('');
    console.log('📊 Tables created:');
    console.log('   ✅ investor_emails');
    console.log('   ✅ email_logs');
    console.log('   ✅ onboarding_submissions');
    console.log('');

    client.release();
    await pool.end();

  } else {
    console.log('⚠️  Database password not provided');
    console.log('');
    console.log('To execute with direct connection, set SUPABASE_DB_PASSWORD:');
    console.log('');
    console.log('export SUPABASE_DB_PASSWORD="your-password"');
    console.log('node execute-new-tables.mjs');
    console.log('');
    console.log('Alternative: Use Supabase Dashboard SQL Editor');
    console.log('URL: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/sql');
    console.log('');
    console.log('📋 Steps:');
    console.log('1. Open the SQL Editor');
    console.log('2. Copy contents of: deploy_new_tables_migration.sql');
    console.log('3. Paste and click "Run"');
    console.log('4. Wait for success message');
    console.log('');
    process.exit(1);
  }

} catch (error) {
  console.error('❌ Migration failed:', error.message);
  console.error('');
  console.error('Stack trace:', error.stack);
  console.error('');
  console.error('⚠️  Please use Supabase Dashboard SQL Editor instead:');
  console.error('URL: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/sql');
  process.exit(1);
}

console.log('='.repeat(60));
console.log('MIGRATION COMPLETE ✅');
console.log('='.repeat(60));
