-- ==============================================================================
-- Migration: Rename user_id to investor_id in investor_fund_performance
-- Date: 2025-12-08
-- Description: V2 Architecture consistency - all investor references use investor_id
-- ==============================================================================

-- ==============================================================================
-- STEP 1: Rename column in investor_fund_performance
-- ==============================================================================

DO $$
BEGIN
  -- Check if investor_fund_performance table exists and has user_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_fund_performance'
    AND column_name = 'user_id'
    AND table_schema = 'public'
  ) THEN
    -- Drop old FK constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'investor_fund_performance_user_id_fkey'
      AND table_name = 'investor_fund_performance'
    ) THEN
      ALTER TABLE investor_fund_performance
        DROP CONSTRAINT investor_fund_performance_user_id_fkey;
      RAISE NOTICE 'Dropped old FK constraint investor_fund_performance_user_id_fkey';
    END IF;

    -- Rename the column
    ALTER TABLE investor_fund_performance
      RENAME COLUMN user_id TO investor_id;

    -- Add new FK constraint with correct name
    ALTER TABLE investor_fund_performance
      ADD CONSTRAINT investor_fund_performance_investor_id_fkey
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE CASCADE;

    -- Update any indexes that referenced user_id
    DROP INDEX IF EXISTS idx_investor_fund_performance_user_id;
    CREATE INDEX IF NOT EXISTS idx_investor_fund_performance_investor_id
      ON investor_fund_performance(investor_id);

    RAISE NOTICE 'Renamed user_id to investor_id in investor_fund_performance';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_fund_performance'
    AND column_name = 'investor_id'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'investor_fund_performance already has investor_id column - no changes needed';
  ELSE
    RAISE NOTICE 'investor_fund_performance table does not exist';
  END IF;
END $$;

-- ==============================================================================
-- STEP 2: Update RLS policies to use investor_id
-- ==============================================================================

DO $$
BEGIN
  -- Drop existing policies
  DROP POLICY IF EXISTS "investor_fund_performance_select_own" ON investor_fund_performance;
  DROP POLICY IF EXISTS "Users can view own performance" ON investor_fund_performance;

  -- Create policy with investor_id
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'investor_fund_performance'
    AND table_schema = 'public'
  ) THEN
    CREATE POLICY "investor_fund_performance_select_own" ON investor_fund_performance
      FOR SELECT USING (
        investor_id = auth.uid() OR public.is_admin()
      );

    RAISE NOTICE 'Created RLS policy using investor_id on investor_fund_performance';
  END IF;
END $$;

-- ==============================================================================
-- STEP 3: Update positions table user_id to investor_id if applicable
-- ==============================================================================

DO $$
BEGIN
  -- Check if positions table exists and has user_id column
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'positions'
    AND column_name = 'user_id'
    AND table_schema = 'public'
  ) THEN
    -- Drop old FK constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'positions_user_id_fkey'
      AND table_name = 'positions'
    ) THEN
      ALTER TABLE positions DROP CONSTRAINT positions_user_id_fkey;
      RAISE NOTICE 'Dropped old FK constraint positions_user_id_fkey';
    END IF;

    -- Rename the column
    ALTER TABLE positions RENAME COLUMN user_id TO investor_id;

    -- Add new FK constraint
    ALTER TABLE positions
      ADD CONSTRAINT positions_investor_id_fkey
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE CASCADE;

    RAISE NOTICE 'Renamed user_id to investor_id in positions table';
  ELSIF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'positions'
    AND column_name = 'investor_id'
    AND table_schema = 'public'
  ) THEN
    RAISE NOTICE 'positions table already has investor_id column - no changes needed';
  ELSE
    RAISE NOTICE 'positions table does not exist or has different schema';
  END IF;
END $$;

-- ==============================================================================
-- Add documentation
-- ==============================================================================

COMMENT ON COLUMN investor_fund_performance.investor_id IS 'V2: References profiles.id (One ID: profiles.id = auth.user.id = investor_id)';

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================
