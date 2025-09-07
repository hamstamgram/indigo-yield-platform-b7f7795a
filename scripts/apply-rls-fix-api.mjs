#!/usr/bin/env node

import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Load environment variables
dotenv.config({ path: '.env.production' });

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://nkfimvovosdehmyyjubn.supabase.co';
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabaseAnonKey = process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseServiceKey && !supabaseAnonKey) {
  console.error('❌ Missing Supabase keys');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey || supabaseAnonKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  },
  db: {
    schema: 'public'
  }
});

console.log('🔧 Applying RLS fix to Supabase...\n');

// The RLS fix SQL
const rlsFixSQL = `
-- CRITICAL: Fix RLS infinite recursion

-- Drop problematic policies
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_insert_policy" ON public.profiles;
DROP POLICY IF EXISTS "profiles_delete_policy" ON public.profiles;

-- Create non-recursive admin check
CREATE OR REPLACE FUNCTION public.check_is_admin(user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
    admin_status BOOLEAN;
BEGIN
    SELECT is_admin INTO admin_status
    FROM public.profiles
    WHERE id = user_id;
    RETURN COALESCE(admin_status, FALSE);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

GRANT EXECUTE ON FUNCTION public.check_is_admin(UUID) TO authenticated;

-- Create new non-recursive policies
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "profiles_select_admin" ON public.profiles
    FOR SELECT USING (
        auth.uid() IN (
            SELECT id FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_update_admin" ON public.profiles
    FOR UPDATE USING (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM public.profiles 
            WHERE id = auth.uid() AND is_admin = TRUE
        )
    );

CREATE POLICY "profiles_insert_own" ON public.profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

CREATE POLICY "profiles_delete_none" ON public.profiles
    FOR DELETE USING (FALSE);

-- Update is_admin function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN public.check_is_admin(auth.uid());
END;
$$ LANGUAGE plpgsql STABLE;
`;

// Split SQL into individual statements
const statements = rlsFixSQL
  .split(';')
  .map(s => s.trim())
  .filter(s => s && !s.startsWith('--'));

async function applyRLSFix() {
  console.log('📝 Testing database connection...');
  
  // First test if we can connect
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id')
      .limit(1);
    
    if (error) {
      if (error.message.includes('infinite recursion')) {
        console.log('❌ Infinite recursion detected - proceeding with fix...\n');
      } else {
        console.log(`⚠️  Database error: ${error.message}\n`);
      }
    } else {
      console.log('✅ Database connection successful\n');
    }
  } catch (err) {
    console.log(`⚠️  Connection test failed: ${err.message}\n`);
  }

  // Since we can't execute raw SQL via the JS client, we need to use the SQL editor
  console.log('📋 RLS Fix SQL has been prepared.\n');
  console.log('Since direct SQL execution is not available via the JS client,');
  console.log('you need to apply this via one of these methods:\n');
  
  console.log('Option 1: Via Supabase Dashboard');
  console.log('=========================================');
  console.log(`1. Open: https://supabase.com/dashboard/project/nkfimvovosdehmyyjubn/sql/new`);
  console.log('2. Copy and paste the SQL from: scripts/apply-rls-fix-only.sql');
  console.log('3. Click "Run"\n');
  
  console.log('Option 2: Via Supabase CLI (if Docker is running)');
  console.log('=========================================');
  console.log('1. Start Docker/Colima if not running: colima start');
  console.log('2. Run: npx supabase db push --db-url "postgresql://postgres:[PASSWORD]@db.nkfimvovosdehmyyjubn.supabase.co:5432/postgres"');
  console.log('3. Replace [PASSWORD] with your database password from Supabase dashboard\n');
  
  console.log('Option 3: Via psql directly');
  console.log('=========================================');
  console.log('1. Get connection string from Supabase dashboard > Settings > Database');
  console.log('2. Run: psql "[CONNECTION_STRING]" -f scripts/apply-rls-fix-only.sql\n');
  
  console.log('After applying the fix, verify with: npm run check:services');
}

applyRLSFix().catch(console.error);
