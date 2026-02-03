-- Fix RLS policies to use correct column names
-- This migration fixes the column references in RLS policies

-- First, drop the incorrect policies that might have been partially created
DROP POLICY IF EXISTS "transactions_select_own" ON transactions;
DROP POLICY IF EXISTS "statements_select_own" ON statements;
-- Now create the corrected policies
-- For transactions table - check which column exists and use it
DO $$
BEGIN
    -- Check if transactions table has profile_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'profile_id'
    ) THEN
        -- Use profile_id if it exists
        EXECUTE 'CREATE POLICY "transactions_select_own" ON transactions
            FOR SELECT
            USING (profile_id = auth.uid())';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'transactions' 
        AND column_name = 'user_id'
    ) THEN
        -- Use user_id if it exists
        EXECUTE 'CREATE POLICY "transactions_select_own" ON transactions
            FOR SELECT
            USING (user_id = auth.uid())';
    END IF;
END $$;
-- For statements table - check which column exists and use it
DO $$
BEGIN
    -- Check if statements table has profile_id column
    IF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'statements' 
        AND column_name = 'profile_id'
    ) THEN
        -- Use profile_id if it exists
        EXECUTE 'CREATE POLICY "statements_select_own" ON statements
            FOR SELECT
            USING (profile_id = auth.uid())';
    ELSIF EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'statements' 
        AND column_name = 'user_id'
    ) THEN
        -- Use user_id if it exists
        EXECUTE 'CREATE POLICY "statements_select_own" ON statements
            FOR SELECT
            USING (user_id = auth.uid())';
    END IF;
END $$;
