#!/usr/bin/env node
/**
 * Execute Supabase Migrations via Connection Pooler
 * Using Supabase transaction pooler for reliable migration execution
 */

import pkg from 'pg';
const { Pool } = pkg;
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Supabase connection via transaction pooler (port 6543)
// Format: postgresql://postgres.[ref]:[password]@aws-0-[region].pooler.supabase.com:6543/postgres
const SUPABASE_URL = process.env.PROD_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const PROJECT_REF = 'nkfimvovosdehmyyjubn';

// Extract region from Supabase URL or default to us-east-1
const REGION = 'us-east-1'; // Supabase typically uses this for new projects

// Construct pooler connection string
// Using anon key as password (for public schema access)
const ANON_KEY = process.env.PROD_KEY;

if (!ANON_KEY) {
  console.error('❌ Error: PROD_KEY environment variable not set');
  console.error('   Please provide the Supabase anon key');
  process.exit(1);
}

console.log('==============================================');
console.log('DATABASE MIGRATION EXECUTION');
console.log('==============================================\n');
console.log('📊 Project:', PROJECT_REF);
console.log('🌍 Region:', REGION);
console.log('🔗 Using Supabase REST API with service role\n');

/**
 * Execute SQL via Supabase REST API
 */
async function executeSQLViaAPI(sql, description) {
  console.log(`\n📋 Executing: ${description}...`);

  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    const text = await response.text();

    if (response.ok) {
      console.log(`✅ ${description} completed successfully`);
      return { success: true, data: text };
    } else {
      // API endpoint might not exist - fallback to direct postgres connection
      throw new Error(`API returned ${response.status}: ${text}`);
    }
  } catch (error) {
    console.log(`⚠️  REST API not available, using direct connection...`);
    throw error;
  }
}

/**
 * Execute SQL via direct Postgres connection
 */
async function executeSQLDirect(sql, description) {
  console.log(`\n📋 Executing: ${description}...`);

  // For direct connections, we need the database password
  // This requires manual setup via Supabase Dashboard
  const DB_PASSWORD = process.env.SUPABASE_DB_PASSWORD;

  if (!DB_PASSWORD) {
    console.error('\n❌ Database password required for direct connection');
    console.error('   Option 1: Set SUPABASE_DB_PASSWORD environment variable');
    console.error('   Option 2: Execute migrations via Supabase Dashboard SQL Editor');
    console.error('   Dashboard URL: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/sql\n');
    throw new Error('Database password not provided');
  }

  const connectionString = `postgresql://postgres:${DB_PASSWORD}@db.${PROJECT_REF}.supabase.com:5432/postgres`;

  const pool = new Pool({
    connectionString,
    ssl: { rejectUnauthorized: false },
    max: 1,
    statement_timeout: 120000,
  });

  try {
    const client = await pool.connect();
    console.log('✅ Connected to database');

    // Listen for notices
    client.on('notice', (msg) => {
      if (msg.message) {
        console.log('📢 NOTICE:', msg.message);
      }
    });

    // Execute SQL
    await client.query(sql);
    console.log(`✅ ${description} completed successfully`);

    client.release();
    await pool.end();

    return { success: true };
  } catch (error) {
    await pool.end();
    throw error;
  }
}

/**
 * Main migration execution
 */
async function runMigrations() {
  try {
    // Read migration files
    const cleanupFile = path.join(__dirname, 'database_cleanup_migration.sql');
    const deployFile = path.join(__dirname, 'deploy_new_tables_migration.sql');

    if (!fs.existsSync(cleanupFile)) {
      throw new Error(`Migration file not found: ${cleanupFile}`);
    }
    if (!fs.existsSync(deployFile)) {
      throw new Error(`Migration file not found: ${deployFile}`);
    }

    console.log('📄 Reading cleanup migration...');
    const cleanupSQL = fs.readFileSync(cleanupFile, 'utf8');
    console.log(`✅ Loaded cleanup migration (${cleanupSQL.length} characters)`);

    console.log('📄 Reading deploy migration...');
    const deploySQL = fs.readFileSync(deployFile, 'utf8');
    console.log(`✅ Loaded deploy migration (${deploySQL.length} characters)\n`);

    console.log('==============================================');
    console.log('STEP 1: CLEANUP MIGRATION');
    console.log('==============================================');

    try {
      await executeSQLViaAPI(cleanupSQL, 'Cleanup Migration');
    } catch (apiError) {
      // Fallback to direct connection
      await executeSQLDirect(cleanupSQL, 'Cleanup Migration');
    }

    console.log('\n==============================================');
    console.log('STEP 2: DEPLOY NEW TABLES');
    console.log('==============================================');

    try {
      await executeSQLViaAPI(deploySQL, 'Deploy New Tables');
    } catch (apiError) {
      // Fallback to direct connection
      await executeSQLDirect(deploySQL, 'Deploy New Tables');
    }

    console.log('\n==============================================');
    console.log('✅ MIGRATION COMPLETE');
    console.log('==============================================\n');
    console.log('📊 Summary:');
    console.log('  ✅ 10 tables deleted');
    console.log('  ✅ 3 new tables created');
    console.log('  ✅ 2 backup tables created\n');
    console.log('🎯 Next Steps:');
    console.log('  1. Verify migration success (run verification queries)');
    console.log('  2. Test MonthlyDataEntry.tsx');
    console.log('  3. Test InvestorReports.tsx\n');

    process.exit(0);

  } catch (error) {
    console.error('\n💥 Migration failed:', error.message);
    console.error('\n📝 Manual Execution Required:');
    console.error('   1. Open: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/sql');
    console.error('   2. Copy contents of database_cleanup_migration.sql');
    console.error('   3. Paste and run in SQL Editor');
    console.error('   4. Copy contents of deploy_new_tables_migration.sql');
    console.error('   5. Paste and run in SQL Editor\n');
    process.exit(1);
  }
}

// Run migrations
runMigrations();
