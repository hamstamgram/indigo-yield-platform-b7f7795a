#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

console.log('🚀 Applying migrations to Supabase database...');
console.log(`📍 Database: ${supabaseUrl}\n`);

// Initialize Supabase client with service role key
const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

// Read the combined migrations file
const migrationsPath = join(__dirname, '..', 'APPLY_ALL_MIGRATIONS.sql');
const migrationsSQL = readFileSync(migrationsPath, 'utf8');

// Split into individual statements by transaction blocks
const blocks = migrationsSQL
  .split(/^BEGIN;$/gm)
  .filter(block => block.trim())
  .map(block => 'BEGIN;\n' + block);

console.log(`📋 Found ${blocks.length} migration blocks to execute\n`);

async function executeSQLBlock(sql, description) {
  console.log(`⚙️  Executing: ${description}`);
  
  try {
    // Since we can't directly execute raw SQL through the JS client,
    // we'll need to use the REST API directly
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/exec_sql`, {
      method: 'POST',
      headers: {
        'apikey': supabaseServiceKey,
        'Authorization': `Bearer ${supabaseServiceKey}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation'
      },
      body: JSON.stringify({ query: sql })
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`HTTP ${response.status}: ${error}`);
    }

    console.log(`   ✅ Success\n`);
    return true;
  } catch (error) {
    console.error(`   ❌ Error: ${error.message}\n`);
    return false;
  }
}

// Since we can't execute raw SQL directly, let's check the current state
// and provide instructions for manual application
async function checkDatabaseState() {
  console.log('🔍 Checking current database state...\n');
  
  // Test if we can query profiles (will fail if RLS recursion exists)
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('infinite recursion')) {
        console.error('❌ RLS infinite recursion detected!');
        console.log('   The profiles table has the recursion issue.\n');
        return false;
      }
      console.error(`❌ Database error: ${error.message}\n`);
      return false;
    }
    
    console.log('✅ Profiles table accessible (RLS may already be fixed)\n');
  } catch (err) {
    console.error(`❌ Unexpected error: ${err.message}\n`);
    return false;
  }
  
  // Check if new tables exist
  const tables = ['funds', 'investors', 'transactions_v2', 'withdrawal_requests', 'system_config'];
  console.log('📊 Checking for required tables:');
  
  for (const table of tables) {
    try {
      const { count, error } = await supabase
        .from(table)
        .select('*', { count: 'exact', head: true });
      
      if (error) {
        console.log(`   ❌ ${table}: Not found or inaccessible`);
      } else {
        console.log(`   ✅ ${table}: Exists`);
      }
    } catch {
      console.log(`   ❌ ${table}: Not found`);
    }
  }
  
  return true;
}

// Main execution
async function main() {
  // First check the current state
  const stateOk = await checkDatabaseState();
  
  console.log('\n' + '='.repeat(60));
  console.log('📝 MANUAL APPLICATION REQUIRED');
  console.log('='.repeat(60) + '\n');
  
  if (!stateOk) {
    console.log('⚠️  Critical RLS issue detected!\n');
  }
  
  console.log('Since direct SQL execution requires database access,');
  console.log('please apply the migrations manually:\n');
  
  console.log('1. Go to Supabase SQL Editor:');
  console.log(`   ${supabaseUrl.replace('.supabase.co', '.supabase.com')}/sql\n`);
  
  console.log('2. Copy the entire contents of:');
  console.log('   APPLY_ALL_MIGRATIONS.sql\n');
  
  console.log('3. Paste into the SQL editor and click "Run"\n');
  
  console.log('4. After successful execution, run:');
  console.log('   npm run check:services\n');
  
  console.log('The migrations will:');
  console.log('   • Fix the RLS infinite recursion (CRITICAL)');
  console.log('   • Create Excel import tables');
  console.log('   • Set up withdrawal system');
  console.log('   • Add fund classes support');
  console.log('   • Configure cutover guards\n');
  
  // Try to check service health
  console.log('🏥 Current Service Health:');
  const { data: healthData } = await supabase.from('profiles').select('count', { count: 'exact', head: true });
  
  if (healthData !== null) {
    console.log('   ✅ Database connection successful');
    console.log('   ✅ Authentication working');
  } else {
    console.log('   ❌ Database queries failing (apply migrations to fix)');
  }
  
  // Generate a direct link to the SQL editor with the project
  const projectRef = supabaseUrl.match(/https:\/\/(\w+)\.supabase\.co/)?.[1];
  if (projectRef) {
    console.log('\n🔗 Direct link to SQL Editor:');
    console.log(`   https://supabase.com/dashboard/project/${projectRef}/sql/new`);
  }
}

main().catch(console.error);
