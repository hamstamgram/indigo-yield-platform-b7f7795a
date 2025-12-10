-- ====================================================================
-- CRITICAL FIXES MIGRATION
-- Generated: 2025-12-08
-- Purpose: Fix broken FKs, deprecated views, column naming, and indexes
-- ====================================================================

-- ====================================================================
-- STEP 1: Fix investor_emails table (FK references dropped investors table)
-- ====================================================================

-- Option: Drop the table if not actively used
DROP TABLE IF EXISTS investor_emails CASCADE;

-- ====================================================================
-- STEP 2: Verify and fix withdrawal_requests FK
-- ====================================================================

-- First, check if the FK is correct (should reference profiles, not investors)
DO $$
BEGIN
  -- Drop old FK if it exists and references investors
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'withdrawal_requests_investor_id_fkey'
    AND confrelid = 'investors'::regclass
  ) THEN
    ALTER TABLE withdrawal_requests DROP CONSTRAINT withdrawal_requests_investor_id_fkey;
    ALTER TABLE withdrawal_requests
      ADD CONSTRAINT withdrawal_requests_investor_id_fkey
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE CASCADE;
    RAISE NOTICE 'Fixed withdrawal_requests FK to reference profiles instead of investors';
  END IF;
EXCEPTION WHEN undefined_table THEN
  -- investors table doesn't exist, which is expected after one_id_unification
  -- Just ensure the FK to profiles exists
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'withdrawal_requests_investor_id_fkey'
  ) THEN
    ALTER TABLE withdrawal_requests
      ADD CONSTRAINT withdrawal_requests_investor_id_fkey
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- ====================================================================
-- STEP 3: Fix/Recreate withdrawal_queue view
-- ====================================================================

DROP VIEW IF EXISTS withdrawal_queue;

CREATE OR REPLACE VIEW withdrawal_queue AS
SELECT
  wr.id,
  wr.request_date,
  wr.status,
  wr.requested_amount,
  wr.approved_amount,
  CONCAT(p.first_name, ' ', p.last_name) as investor_name,
  p.email as investor_email,
  p.id as investor_id,
  f.name as fund_name,
  f.code as fund_code,
  f.asset as fund_asset,
  ip.current_value as current_position_value
FROM withdrawal_requests wr
JOIN profiles p ON wr.investor_id = p.id
JOIN funds f ON wr.fund_id = f.id
LEFT JOIN investor_positions ip
  ON wr.investor_id = ip.investor_id
  AND wr.fund_id = ip.fund_id
WHERE wr.status IN ('pending', 'approved', 'processing')
ORDER BY wr.request_date ASC;

-- Grant access to authenticated users
GRANT SELECT ON withdrawal_queue TO authenticated;

-- ====================================================================
-- STEP 4: Rename investor_fund_performance.user_id to investor_id
-- ====================================================================

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'investor_fund_performance'
    AND column_name = 'user_id'
  ) THEN
    -- First drop any existing constraints
    ALTER TABLE investor_fund_performance
      DROP CONSTRAINT IF EXISTS investor_fund_performance_user_id_fkey;

    -- Rename the column
    ALTER TABLE investor_fund_performance
      RENAME COLUMN user_id TO investor_id;

    -- Add FK constraint to profiles
    ALTER TABLE investor_fund_performance
      ADD CONSTRAINT investor_fund_performance_investor_id_fkey
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE CASCADE;

    -- Update unique constraint if it exists
    ALTER TABLE investor_fund_performance
      DROP CONSTRAINT IF EXISTS investor_fund_performance_user_id_period_id_fund_name_key;

    -- Add new unique constraint
    ALTER TABLE investor_fund_performance
      ADD CONSTRAINT investor_fund_performance_investor_period_fund_key
      UNIQUE (investor_id, period_id, fund_name);

    RAISE NOTICE 'Renamed user_id to investor_id in investor_fund_performance';
  END IF;
END $$;

-- ====================================================================
-- STEP 5: Add missing performance indexes
-- ====================================================================

-- Index for AUM calculations
CREATE INDEX IF NOT EXISTS idx_investor_positions_current_value
  ON investor_positions(current_value)
  WHERE current_value > 0;

-- Index for fund transaction history
CREATE INDEX IF NOT EXISTS idx_transactions_v2_fund_date
  ON transactions_v2(fund_id, tx_date DESC);

-- Index for withdrawal queue
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_date
  ON withdrawal_requests(status, request_date DESC);

-- Index for investor performance lookup
CREATE INDEX IF NOT EXISTS idx_investor_fund_performance_investor
  ON investor_fund_performance(investor_id);

-- ====================================================================
-- STEP 6: Drop deprecated RPC functions
-- ====================================================================

DROP FUNCTION IF EXISTS can_access_investor(UUID);
DROP FUNCTION IF EXISTS get_investor_positions_by_class(UUID);
DROP FUNCTION IF EXISTS process_excel_import_with_classes();
DROP FUNCTION IF EXISTS distribute_yield_v2(UUID, TEXT, NUMERIC, UUID);

-- ====================================================================
-- STEP 7: Fix v_investor_kpis view if it references investors table
-- ====================================================================

-- Drop and recreate to use profiles
DROP VIEW IF EXISTS v_investor_kpis;

CREATE OR REPLACE VIEW v_investor_kpis AS
SELECT
  p.id as investor_id,
  CONCAT(p.first_name, ' ', p.last_name) as investor_name,
  p.email,
  p.status,
  p.fee_percentage,
  COALESCE(pos.total_value, 0) as total_portfolio_value,
  COALESCE(pos.fund_count, 0) as fund_count,
  COALESCE(tx.total_deposits, 0) as total_deposits,
  COALESCE(tx.total_withdrawals, 0) as total_withdrawals,
  COALESCE(tx.total_interest, 0) as total_interest_earned,
  COALESCE(tx.total_fees, 0) as total_fees_paid
FROM profiles p
LEFT JOIN (
  SELECT
    investor_id,
    SUM(current_value) as total_value,
    COUNT(DISTINCT fund_id) as fund_count
  FROM investor_positions
  WHERE current_value > 0
  GROUP BY investor_id
) pos ON p.id = pos.investor_id
LEFT JOIN (
  SELECT
    investor_id,
    SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN type = 'WITHDRAWAL' THEN amount ELSE 0 END) as total_withdrawals,
    SUM(CASE WHEN type = 'INTEREST' THEN amount ELSE 0 END) as total_interest,
    SUM(CASE WHEN type = 'FEE' THEN amount ELSE 0 END) as total_fees
  FROM transactions_v2
  GROUP BY investor_id
) tx ON p.id = tx.investor_id
WHERE p.is_admin = false;

-- Grant access
GRANT SELECT ON v_investor_kpis TO authenticated;

-- ====================================================================
-- STEP 8: Ensure fund codes are consistent (use BTCYF pattern per CLAUDE.md)
-- ====================================================================

-- Update fund codes to match CLAUDE.md specification
UPDATE funds SET code = 'BTCYF' WHERE asset = 'BTC' AND code != 'BTCYF';
UPDATE funds SET code = 'ETHYF' WHERE asset = 'ETH' AND code != 'ETHYF';
UPDATE funds SET code = 'USDTYF' WHERE asset = 'USDT' AND code != 'USDTYF';
UPDATE funds SET code = 'SOLYF' WHERE asset = 'SOL' AND code != 'SOLYF';
UPDATE funds SET code = 'XRPYF' WHERE asset = 'XRP' AND code != 'XRPYF';

-- Update fund names to be consistent
UPDATE funds SET name = 'BTC Yield Fund' WHERE asset = 'BTC';
UPDATE funds SET name = 'ETH Yield Fund' WHERE asset = 'ETH';
UPDATE funds SET name = 'USDT Yield Fund' WHERE asset = 'USDT';
UPDATE funds SET name = 'SOL Yield Fund' WHERE asset = 'SOL';
UPDATE funds SET name = 'XRP Yield Fund' WHERE asset = 'XRP';

-- ====================================================================
-- VERIFICATION QUERIES
-- ====================================================================

-- Verify FKs are correct
SELECT
  tc.table_name,
  kcu.column_name,
  ccu.table_name AS foreign_table_name
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
  ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.constraint_column_usage AS ccu
  ON ccu.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND kcu.column_name = 'investor_id'
ORDER BY tc.table_name;

-- Verify indexes exist
SELECT indexname, indexdef
FROM pg_indexes
WHERE schemaname = 'public'
  AND indexname LIKE '%investor%' OR indexname LIKE '%transaction%' OR indexname LIKE '%withdrawal%';

-- Verify fund codes
SELECT id, code, name, asset, status FROM funds ORDER BY code;
