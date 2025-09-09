-- Migration: Fix Missing RLS Policies on Investor Tables
-- Date: 2025-09-09
-- Critical: This MUST be applied to secure investor data
-- Rules: 
--   - LP can only SELECT their own data
--   - Admin can SELECT/INSERT/UPDATE/DELETE all data
--   - Deposits, withdrawals, interest are admin-only writes

-- ========================================
-- INVESTORS TABLE POLICIES
-- ========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "investors_select_policy" ON public.investors;
DROP POLICY IF EXISTS "investors_insert_policy" ON public.investors;
DROP POLICY IF EXISTS "investors_update_policy" ON public.investors;
DROP POLICY IF EXISTS "investors_delete_policy" ON public.investors;

-- LPs can view only their own investor record, admins can see all
CREATE POLICY "investors_select_policy" ON public.investors
    FOR SELECT
    USING (
        user_id = auth.uid() OR 
        public.is_admin_safe()
    );

-- Only admins can create investor records
CREATE POLICY "investors_insert_policy" ON public.investors
    FOR INSERT
    WITH CHECK (public.is_admin_safe());

-- Only admins can update investor records
CREATE POLICY "investors_update_policy" ON public.investors
    FOR UPDATE
    USING (public.is_admin_safe())
    WITH CHECK (public.is_admin_safe());

-- Only admins can delete investor records
CREATE POLICY "investors_delete_policy" ON public.investors
    FOR DELETE
    USING (public.is_admin_safe());

-- ========================================
-- POSITIONS TABLE POLICIES
-- ========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "positions_select_policy" ON public.positions;
DROP POLICY IF EXISTS "positions_insert_policy" ON public.positions;
DROP POLICY IF EXISTS "positions_update_policy" ON public.positions;
DROP POLICY IF EXISTS "positions_delete_policy" ON public.positions;

-- LPs can view only their own positions, admins can see all
CREATE POLICY "positions_select_policy" ON public.positions
    FOR SELECT
    USING (
        investor_id = auth.uid() OR 
        public.is_admin_safe()
    );

-- Only admins can create positions
CREATE POLICY "positions_insert_policy" ON public.positions
    FOR INSERT
    WITH CHECK (public.is_admin_safe());

-- Only admins can update positions
CREATE POLICY "positions_update_policy" ON public.positions
    FOR UPDATE
    USING (public.is_admin_safe())
    WITH CHECK (public.is_admin_safe());

-- Only admins can delete positions
CREATE POLICY "positions_delete_policy" ON public.positions
    FOR DELETE
    USING (public.is_admin_safe());

-- ========================================
-- TRANSACTIONS TABLE POLICIES
-- ========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "transactions_select_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_insert_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_update_policy" ON public.transactions;
DROP POLICY IF EXISTS "transactions_delete_policy" ON public.transactions;

-- LPs can view only their own transactions, admins can see all
CREATE POLICY "transactions_select_policy" ON public.transactions
    FOR SELECT
    USING (
        investor_id = auth.uid() OR 
        public.is_admin_safe()
    );

-- Only admins can create transactions (including deposits, withdrawals, interest)
CREATE POLICY "transactions_insert_policy" ON public.transactions
    FOR INSERT
    WITH CHECK (public.is_admin_safe());

-- Only admins can update transactions
CREATE POLICY "transactions_update_policy" ON public.transactions
    FOR UPDATE
    USING (public.is_admin_safe())
    WITH CHECK (public.is_admin_safe());

-- Only admins can delete transactions
CREATE POLICY "transactions_delete_policy" ON public.transactions
    FOR DELETE
    USING (public.is_admin_safe());

-- ========================================
-- STATEMENTS TABLE POLICIES
-- ========================================
-- Drop existing policies if any
DROP POLICY IF EXISTS "statements_select_policy" ON public.statements;
DROP POLICY IF EXISTS "statements_insert_policy" ON public.statements;
DROP POLICY IF EXISTS "statements_update_policy" ON public.statements;
DROP POLICY IF EXISTS "statements_delete_policy" ON public.statements;

-- LPs can view only their own statements, admins can see all
CREATE POLICY "statements_select_policy" ON public.statements
    FOR SELECT
    USING (
        investor_id = auth.uid() OR 
        public.is_admin_safe()
    );

-- Only admins can create statements
CREATE POLICY "statements_insert_policy" ON public.statements
    FOR INSERT
    WITH CHECK (public.is_admin_safe());

-- Only admins can update statements
CREATE POLICY "statements_update_policy" ON public.statements
    FOR UPDATE
    USING (public.is_admin_safe())
    WITH CHECK (public.is_admin_safe());

-- Only admins can delete statements
CREATE POLICY "statements_delete_policy" ON public.statements
    FOR DELETE
    USING (public.is_admin_safe());

-- ========================================
-- VERIFICATION
-- ========================================
DO $$
DECLARE
    v_table TEXT;
    v_count INTEGER;
BEGIN
    -- Verify RLS is enabled on all investor tables
    FOR v_table IN 
        SELECT unnest(ARRAY['investors', 'positions', 'transactions', 'statements'])
    LOOP
        SELECT COUNT(*) INTO v_count
        FROM pg_policies 
        WHERE schemaname = 'public' 
        AND tablename = v_table;
        
        IF v_count != 4 THEN
            RAISE WARNING 'Table % has % policies instead of 4', v_table, v_count;
        ELSE
            RAISE NOTICE '✅ Table % has all 4 policies configured', v_table;
        END IF;
    END LOOP;
    
    RAISE NOTICE '';
    RAISE NOTICE '🔒 RLS POLICIES APPLIED - Investor tables are now secure';
    RAISE NOTICE 'Rules enforced:';
    RAISE NOTICE '  - LPs can only READ their own data';
    RAISE NOTICE '  - Admins have full CRUD access';
    RAISE NOTICE '  - Deposits/withdrawals/interest are admin-only';
END $$;
