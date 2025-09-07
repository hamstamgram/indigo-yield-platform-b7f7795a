#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import 'dotenv/config';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { readFileSync } from 'fs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Initialize Supabase client with service role key
const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('❌ Missing required environment variables');
  console.error('Please ensure VITE_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are set');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

console.log('🔧 Applying RLS recursion fix migration...\n');

// Read the migration file
const migrationPath = join(__dirname, '..', 'supabase', 'migrations', '009_fix_profiles_rls_recursion.sql');
const migrationSQL = readFileSync(migrationPath, 'utf8');

// Split the migration into individual statements
// Remove comments and empty lines, then split by semicolon
const statements = migrationSQL
  .split('\n')
  .filter(line => !line.trim().startsWith('--') && line.trim() !== '')
  .join('\n')
  .split(/;\s*(?=\n|$)/)
  .filter(stmt => stmt.trim() !== '')
  .map(stmt => stmt.trim() + ';');

console.log(`📋 Found ${statements.length} SQL statements to execute\n`);

let successCount = 0;
let errorCount = 0;

// Execute each statement
for (let i = 0; i < statements.length; i++) {
  const statement = statements[i];
  
  // Skip if it's just a semicolon or empty
  if (statement === ';' || statement.trim() === '') continue;
  
  // Extract the first line for logging
  const firstLine = statement.split('\n')[0].substring(0, 60);
  console.log(`[${i + 1}/${statements.length}] Executing: ${firstLine}...`);
  
  try {
    const { error } = await supabase.rpc('exec_sql', {
      sql_query: statement
    }).single();
    
    if (error) {
      // Try direct execution if RPC doesn't work
      const { data, error: directError } = await supabase
        .from('_sql')
        .insert({ query: statement })
        .select()
        .single();
      
      if (directError) {
        console.error(`   ❌ Error: ${directError.message}`);
        errorCount++;
        
        // For critical statements, we may want to continue
        if (statement.includes('DROP POLICY')) {
          console.log('   ⚠️  Policy drop failed (may not exist), continuing...');
        } else if (statement.includes('CREATE OR REPLACE')) {
          console.log('   ⚠️  Function creation failed, this might be critical');
        }
      } else {
        console.log('   ✅ Success');
        successCount++;
      }
    } else {
      console.log('   ✅ Success');
      successCount++;
    }
  } catch (err) {
    console.error(`   ❌ Unexpected error: ${err.message}`);
    errorCount++;
  }
}

console.log('\n' + '='.repeat(60));
console.log(`📊 Migration Summary:`);
console.log(`   ✅ Successful statements: ${successCount}`);
console.log(`   ❌ Failed statements: ${errorCount}`);

if (errorCount === 0) {
  console.log('\n🎉 Migration completed successfully!');
  
  // Test the fix
  console.log('\n🧪 Testing profiles access...');
  
  const { data: testResult, error: testError } = await supabase
    .from('profiles')
    .select('id')
    .limit(1);
  
  if (testError) {
    if (testError.message.includes('infinite recursion')) {
      console.error('❌ Infinite recursion still detected!');
      console.error('   This may require manual database intervention');
    } else {
      console.error(`❌ Test failed: ${testError.message}`);
    }
  } else {
    console.log('✅ Profiles table is accessible without recursion!');
  }
  
} else {
  console.log('\n⚠️  Migration completed with errors');
  console.log('   Some statements failed, manual intervention may be required');
}

process.exit(errorCount > 0 ? 1 : 0);
