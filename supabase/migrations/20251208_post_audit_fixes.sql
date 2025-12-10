-- ==============================================================================
-- Migration: Post-Audit Critical Fixes
-- Date: 2025-12-08
-- Description: Fixes remaining issues identified in DATABASE_AUDIT_REPORT.md
-- ==============================================================================

-- ==============================================================================
-- STEP 1: Fix onboarding_submissions FK constraint
-- ==============================================================================

DO $$
BEGIN
  -- Check if table exists
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'onboarding_submissions'
    AND table_schema = 'public'
  ) THEN

    -- Ensure investor_id column exists; if missing, create and backfill from created_investor_id
    IF NOT EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'onboarding_submissions'
      AND column_name = 'investor_id'
      AND table_schema = 'public'
    ) THEN
      ALTER TABLE onboarding_submissions
        ADD COLUMN investor_id uuid;
      UPDATE onboarding_submissions
        SET investor_id = created_investor_id
        WHERE investor_id IS NULL AND created_investor_id IS NOT NULL;
      RAISE NOTICE 'Added investor_id column to onboarding_submissions and backfilled from created_investor_id where possible';
    END IF;

    -- Drop old FK constraint if it exists
    IF EXISTS (
      SELECT 1 FROM information_schema.table_constraints
      WHERE constraint_name = 'onboarding_submissions_investor_id_fkey'
      AND table_name = 'onboarding_submissions'
    ) THEN
      ALTER TABLE onboarding_submissions
        DROP CONSTRAINT onboarding_submissions_investor_id_fkey;
      RAISE NOTICE 'Dropped old FK constraint on onboarding_submissions';
    END IF;

    -- Add new FK constraint to profiles
    ALTER TABLE onboarding_submissions
      ADD CONSTRAINT onboarding_submissions_investor_id_fkey
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE CASCADE;

    RAISE NOTICE 'Added new FK constraint: onboarding_submissions.investor_id -> profiles.id';
  END IF;
END $$;

-- ==============================================================================
-- STEP 2: Fix broken RLS policies that reference investors table
-- ==============================================================================

-- Fix withdrawal_requests policies
DO $$
BEGIN
  -- Drop potentially broken policies
  DROP POLICY IF EXISTS "withdrawal_requests_select_own" ON withdrawal_requests;
  DROP POLICY IF EXISTS "withdrawal_requests_insert_own" ON withdrawal_requests;
  DROP POLICY IF EXISTS "withdrawal_requests_update_own" ON withdrawal_requests;

  -- Create correct policies using direct profile reference
  CREATE POLICY "withdrawal_requests_select_own" ON withdrawal_requests
    FOR SELECT USING (
      investor_id = auth.uid() OR public.is_admin()
    );

  CREATE POLICY "withdrawal_requests_insert_own" ON withdrawal_requests
    FOR INSERT WITH CHECK (
      investor_id = auth.uid()
    );

  CREATE POLICY "withdrawal_requests_update_own" ON withdrawal_requests
    FOR UPDATE USING (
      investor_id = auth.uid()
    )
    WITH CHECK (
      investor_id = auth.uid()
    );

  RAISE NOTICE 'Fixed withdrawal_requests RLS policies';
END $$;

-- ==============================================================================
-- STEP 3: Update v_live_investor_balances view for consistency
-- ==============================================================================

DROP VIEW IF EXISTS v_live_investor_balances;

CREATE OR REPLACE VIEW v_live_investor_balances AS
WITH latest_report AS (
    SELECT DISTINCT ON (investor_id, fund_name)
        investor_id,
        fund_name,
        mtd_ending_balance as last_reported_balance,
        period.period_end_date as report_date
    FROM investor_fund_performance perf
    JOIN statement_periods period ON perf.period_id = period.id
    ORDER BY investor_id, fund_name, period.period_end_date DESC
),
recent_txs AS (
    SELECT
        investor_id,
        f.asset as fund_asset,
        SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as deposits,
        SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as withdrawals
    FROM transactions_v2 t
    JOIN funds f ON t.fund_id = f.id
    GROUP BY investor_id, f.asset
)
SELECT
    lr.investor_id,
    lr.fund_name,
    lr.last_reported_balance,
    COALESCE(rt.deposits, 0) as recent_deposits,
    COALESCE(rt.withdrawals, 0) as recent_withdrawals,
    (lr.last_reported_balance + COALESCE(rt.deposits, 0) - COALESCE(rt.withdrawals, 0)) as live_balance
FROM latest_report lr
LEFT JOIN recent_txs rt ON lr.investor_id = rt.investor_id AND lr.fund_name = rt.fund_asset;

GRANT SELECT ON v_live_investor_balances TO authenticated;

-- ==============================================================================
-- STEP 4: Add additional performance indexes
-- ==============================================================================

-- For investor dashboard queries
CREATE INDEX IF NOT EXISTS idx_transactions_v2_investor_type_date
  ON transactions_v2(investor_id, type, tx_date DESC);

-- For fund composition reports
CREATE INDEX IF NOT EXISTS idx_investor_positions_fund_value
  ON investor_positions(fund_id, current_value DESC)
  WHERE current_value > 0;

-- For statement generation
CREATE INDEX IF NOT EXISTS idx_statement_periods_end_date
  ON statement_periods(period_end_date)
  WHERE period_end_date IS NOT NULL;

-- For profile lookups by email
CREATE INDEX IF NOT EXISTS idx_profiles_email
  ON profiles(email);

-- For audit log queries
CREATE INDEX IF NOT EXISTS idx_audit_log_entity
  ON audit_log(entity, entity_id, created_at DESC);

-- ==============================================================================
-- STEP 5: Verify and clean up legacy tables
-- ==============================================================================

-- Check if legacy 'positions' table exists and conflicts with 'investor_positions'
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'positions' AND table_schema = 'public'
  ) THEN
    -- Add comment to identify as legacy
    COMMENT ON TABLE positions IS 'LEGACY TABLE - Replaced by investor_positions. Verify data migration before dropping.';
    RAISE NOTICE 'Legacy positions table exists - marked for review';
  END IF;
END $$;

-- Check if legacy 'transactions' table exists
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_name = 'transactions' AND table_schema = 'public'
  ) THEN
    COMMENT ON TABLE transactions IS 'LEGACY TABLE - Replaced by transactions_v2. Verify data migration before dropping.';
    RAISE NOTICE 'Legacy transactions table exists - marked for review';
  END IF;
END $$;

-- ==============================================================================
-- STEP 6: Add table comments for documentation
-- ==============================================================================

COMMENT ON TABLE profiles IS 'V2: Source of truth for investor identity. profiles.id = auth.user.id = investor_id';
COMMENT ON TABLE investor_positions IS 'V2: Current investor positions per fund. Uses investor_id -> profiles.id';
COMMENT ON TABLE transactions_v2 IS 'V2: Unified transaction ledger. All deposits, withdrawals, interest, fees';
COMMENT ON TABLE funds IS 'Active yield funds: BTCYF, ETHYF, USDTYF, SOLYF, XRPYF';
COMMENT ON TABLE withdrawal_requests IS 'Withdrawal workflow with admin approval process';
COMMENT ON TABLE investor_fund_performance IS 'Monthly performance metrics per investor per fund';

-- ==============================================================================
-- VERIFICATION QUERIES
-- ==============================================================================

-- 1. Check for broken FK constraints
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  confrelid::regclass AS referenced_table
FROM pg_constraint
WHERE confrelid::regclass::text = 'public.investors'
  AND contype = 'f';
-- Should return 0 rows

-- 2. Verify investor_positions integrity
SELECT
  'investor_positions' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT ip.investor_id) as unique_investors,
  SUM(CASE WHEN p.id IS NULL THEN 1 ELSE 0 END) as orphaned_records
FROM investor_positions ip
LEFT JOIN profiles p ON ip.investor_id = p.id;

-- 3. Verify transactions_v2 integrity
SELECT
  'transactions_v2' as table_name,
  COUNT(*) as total_records,
  COUNT(DISTINCT t.investor_id) as unique_investors,
  SUM(CASE WHEN p.id IS NULL THEN 1 ELSE 0 END) as orphaned_records
FROM transactions_v2 t
LEFT JOIN profiles p ON t.investor_id = p.id;

-- 4. Check RLS policies
SELECT
  schemaname,
  tablename,
  rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'funds', 'investor_positions',
    'transactions_v2', 'withdrawal_requests',
    'investor_fund_performance'
  )
ORDER BY tablename;

-- 5. Verify all funds
SELECT id, code, name, asset, status
FROM funds
WHERE status = 'active'
ORDER BY code;

-- ==============================================================================
-- END OF MIGRATION
-- ==============================================================================
