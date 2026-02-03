-- Migration: Comprehensive RLS Policies for Security
-- Created: 2025-01-09
-- Purpose: Implement strict RLS policies per project rules

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Create helper function for RLS policies
CREATE OR REPLACE FUNCTION public.is_admin_for_jwt()
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Check if the user has the admin flag in their profile
  -- This runs as security definer to bypass RLS on the profiles table itself
  RETURN EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
    AND is_admin = true
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.is_admin_for_jwt() TO authenticated;

-- ============================================
-- PROFILES TABLE RLS POLICIES
-- ============================================

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "profiles_select_own" ON profiles;
DROP POLICY IF EXISTS "profiles_select_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON profiles;
DROP POLICY IF EXISTS "profiles_update_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_insert_admin" ON profiles;
DROP POLICY IF EXISTS "profiles_delete_admin" ON profiles;

-- Enable RLS on profiles
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;

-- LP can select their own profile
CREATE POLICY "profiles_select_own" ON profiles
    FOR SELECT
    USING (id = auth.uid());

-- Admin can select all profiles
CREATE POLICY "profiles_select_admin" ON profiles
    FOR SELECT
    USING (public.is_admin_for_jwt());

-- LP can update their own profile
CREATE POLICY "profiles_update_own" ON profiles
    FOR UPDATE
    USING (id = auth.uid())
    WITH CHECK (id = auth.uid() AND is_admin = false); -- Prevent LP from making themselves admin

-- Admin can update all profiles
CREATE POLICY "profiles_update_admin" ON profiles
    FOR UPDATE
    USING (public.is_admin_for_jwt());

-- Only admin can insert profiles
CREATE POLICY "profiles_insert_admin" ON profiles
    FOR INSERT
    WITH CHECK (public.is_admin_for_jwt());

-- Only admin can delete profiles
CREATE POLICY "profiles_delete_admin" ON profiles
    FOR DELETE
    USING (public.is_admin_for_jwt());

-- ============================================
-- TRANSACTIONS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "transactions_select_admin" ON transactions;
DROP POLICY IF EXISTS "transactions_insert_admin" ON transactions;
DROP POLICY IF EXISTS "transactions_update_admin" ON transactions;
DROP POLICY IF EXISTS "transactions_delete_admin" ON transactions;

-- Enable RLS on transactions
ALTER TABLE transactions ENABLE ROW LEVEL SECURITY;

-- LP can only read their own transactions
CREATE POLICY "transactions_select_own" ON transactions
    FOR SELECT
    USING (investor_id = auth.uid());

-- Admin can read all transactions
CREATE POLICY "transactions_select_admin" ON transactions
    FOR SELECT
    USING (public.is_admin_for_jwt());

-- Only admin can insert transactions (deposits, withdrawals, interest)
CREATE POLICY "transactions_insert_admin" ON transactions
    FOR INSERT
    WITH CHECK (public.is_admin_for_jwt());

-- Only admin can update transactions
CREATE POLICY "transactions_update_admin" ON transactions
    FOR UPDATE
    USING (public.is_admin_for_jwt());

-- Only admin can delete transactions
CREATE POLICY "transactions_delete_admin" ON transactions
    FOR DELETE
    USING (public.is_admin_for_jwt());

-- ============================================
-- PORTFOLIOS TABLE RLS POLICIES
-- ============================================

DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'portfolios' AND table_schema = 'public') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "portfolios_select_own" ON portfolios;
        DROP POLICY IF EXISTS "portfolios_select_admin" ON portfolios;
        DROP POLICY IF EXISTS "portfolios_insert_admin" ON portfolios;
        DROP POLICY IF EXISTS "portfolios_update_admin" ON portfolios;
        DROP POLICY IF EXISTS "portfolios_delete_admin" ON portfolios;

        -- Enable RLS on portfolios
        ALTER TABLE portfolios ENABLE ROW LEVEL SECURITY;

        -- LP can only read their own portfolios
        EXECUTE 'CREATE POLICY "portfolios_select_own" ON portfolios
            FOR SELECT
            USING (profile_id = auth.uid())';

        -- Admin can read all portfolios
        EXECUTE 'CREATE POLICY "portfolios_select_admin" ON portfolios
            FOR SELECT
            USING (public.is_admin_for_jwt())';

        -- Only admin can insert portfolios
        EXECUTE 'CREATE POLICY "portfolios_insert_admin" ON portfolios
            FOR INSERT
            WITH CHECK (public.is_admin_for_jwt())';

        -- Only admin can update portfolios
        EXECUTE 'CREATE POLICY "portfolios_update_admin" ON portfolios
            FOR UPDATE
            USING (public.is_admin_for_jwt())';

        -- Only admin can delete portfolios
        EXECUTE 'CREATE POLICY "portfolios_delete_admin" ON portfolios
            FOR DELETE
            USING (public.is_admin_for_jwt())';
    END IF;
END $$;

-- ============================================
-- STATEMENTS TABLE RLS POLICIES
-- ============================================

-- Drop existing policies
DROP POLICY IF EXISTS "statements_select_own" ON statements;
DROP POLICY IF EXISTS "statements_select_admin" ON statements;
DROP POLICY IF EXISTS "statements_insert_admin" ON statements;
DROP POLICY IF EXISTS "statements_update_admin" ON statements;
DROP POLICY IF EXISTS "statements_delete_admin" ON statements;

-- Enable RLS on statements
ALTER TABLE statements ENABLE ROW LEVEL SECURITY;

-- LP can only read their own statements
CREATE POLICY "statements_select_own" ON statements
    FOR SELECT
    USING (investor_id = auth.uid());

-- Admin can read all statements
CREATE POLICY "statements_select_admin" ON statements
    FOR SELECT
    USING (public.is_admin_for_jwt());

-- Only admin can insert statements
CREATE POLICY "statements_insert_admin" ON statements
    FOR INSERT
    WITH CHECK (public.is_admin_for_jwt());

-- Only admin can update statements
CREATE POLICY "statements_update_admin" ON statements
    FOR UPDATE
    USING (public.is_admin_for_jwt());

-- Only admin can delete statements
CREATE POLICY "statements_delete_admin" ON statements
    FOR DELETE
    USING (public.is_admin_for_jwt());

-- ============================================
-- POSITIONS TABLE RLS POLICIES (if exists)
-- ============================================

-- Check if positions table exists
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'positions') THEN
        -- Drop existing policies
        DROP POLICY IF EXISTS "positions_select_own" ON positions;
        DROP POLICY IF EXISTS "positions_select_admin" ON positions;
        DROP POLICY IF EXISTS "positions_insert_admin" ON positions;
        DROP POLICY IF EXISTS "positions_update_admin" ON positions;
        DROP POLICY IF EXISTS "positions_delete_admin" ON positions;

        -- Enable RLS
        ALTER TABLE positions ENABLE ROW LEVEL SECURITY;

        -- LP can only read positions in their portfolios
        EXECUTE 'CREATE POLICY "positions_select_own" ON positions
            FOR SELECT
            USING (investor_id = auth.uid())';

        -- Admin can read all positions
        EXECUTE 'CREATE POLICY "positions_select_admin" ON positions
            FOR SELECT
            USING (public.is_admin_for_jwt())';

        -- Only admin can insert positions
        EXECUTE 'CREATE POLICY "positions_insert_admin" ON positions
            FOR INSERT
            WITH CHECK (public.is_admin_for_jwt())';

        -- Only admin can update positions
        EXECUTE 'CREATE POLICY "positions_update_admin" ON positions
            FOR UPDATE
            USING (public.is_admin_for_jwt())';

        -- Only admin can delete positions
        EXECUTE 'CREATE POLICY "positions_delete_admin" ON positions
            FOR DELETE
            USING (public.is_admin_for_jwt())';
    END IF;
END $$;

-- ============================================
-- ASSETS TABLE RLS POLICIES
-- ============================================

-- Assets table should be readable by all authenticated users
-- but only admin can modify

-- Drop existing policies
DROP POLICY IF EXISTS "assets_select_authenticated" ON assets;
DROP POLICY IF EXISTS "assets_insert_admin" ON assets;
DROP POLICY IF EXISTS "assets_update_admin" ON assets;
DROP POLICY IF EXISTS "assets_delete_admin" ON assets;

-- Enable RLS on assets
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read assets
CREATE POLICY "assets_select_authenticated" ON assets
    FOR SELECT
    USING (auth.uid() IS NOT NULL);

-- Only admin can insert assets
CREATE POLICY "assets_insert_admin" ON assets
    FOR INSERT
    WITH CHECK (public.is_admin_for_jwt());

-- Only admin can update assets
CREATE POLICY "assets_update_admin" ON assets
    FOR UPDATE
    USING (public.is_admin_for_jwt());

-- Only admin can delete assets
CREATE POLICY "assets_delete_admin" ON assets
    FOR DELETE
    USING (public.is_admin_for_jwt());

-- ============================================
-- AUDIT LOGGING
-- ============================================

-- Create audit log table if it doesn't exist
CREATE TABLE IF NOT EXISTS audit_logs (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID REFERENCES profiles(id),
    action TEXT NOT NULL,
    table_name TEXT NOT NULL,
    record_id UUID,
    changes JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS on audit_logs
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;

-- Only admin can read audit logs
CREATE POLICY "audit_logs_select_admin" ON audit_logs
    FOR SELECT
    USING (public.is_admin_for_jwt());

-- System can insert audit logs (via triggers)
CREATE POLICY "audit_logs_insert_system" ON audit_logs
    FOR INSERT
    WITH CHECK (true);

-- ============================================
-- VERIFICATION COMMENTS
-- ============================================

COMMENT ON POLICY "profiles_select_own" ON profiles IS 'LP can only view their own profile';
COMMENT ON POLICY "profiles_select_admin" ON profiles IS 'Admin can view all profiles';
COMMENT ON POLICY "transactions_insert_admin" ON transactions IS 'Only admin can create deposits, withdrawals, and interest entries';
-- COMMENT ON POLICY "portfolios_select_own" ON portfolios IS 'LP can only view their own portfolios';
COMMENT ON POLICY "statements_insert_admin" ON statements IS 'Only admin can create statements';

-- ============================================
-- VALIDATION QUERIES
-- ============================================

-- Verify RLS is enabled on critical tables
DO $$
DECLARE
    table_name TEXT;
    tables TEXT[] := ARRAY['profiles', 'transactions', 'portfolios', 'statements', 'assets'];
BEGIN
    FOREACH table_name IN ARRAY tables
    LOOP
        IF NOT EXISTS (
            SELECT 1 FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = table_name 
            AND rowsecurity = true
        ) THEN
            RAISE WARNING 'RLS not enabled on table: %', table_name;
        END IF;
    END LOOP;
END $$;
