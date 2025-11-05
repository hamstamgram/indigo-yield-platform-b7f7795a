-- =============================================================================
-- MIGRATION SCRIPT: Migrate Existing Investor Data to Monthly Reports System
-- =============================================================================
-- Date: January 2025
-- Purpose: Populate investor_monthly_reports with existing position data
-- Source: positions table (current balances as of Sep 22, 2025)
-- Target: investor_monthly_reports table (September 2025 data)
--
-- IMPORTANT: This migrates CURRENT positions as September 2025 baseline
-- Historical months (Jun 2024 - Aug 2025) must be entered manually via admin UI
-- =============================================================================

-- Step 1: Create backup tables (safety measure)
-- =============================================================================

DO $$
BEGIN
  -- Backup positions table
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'positions_backup_20250106') THEN
    CREATE TABLE positions_backup_20250106 AS SELECT * FROM positions;
    RAISE NOTICE 'Created backup: positions_backup_20250106';
  END IF;

  -- Backup investor_monthly_reports table
  IF NOT EXISTS (SELECT FROM pg_tables WHERE tablename = 'investor_monthly_reports_backup_20250106') THEN
    CREATE TABLE investor_monthly_reports_backup_20250106 AS SELECT * FROM investor_monthly_reports;
    RAISE NOTICE 'Created backup: investor_monthly_reports_backup_20250106';
  END IF;
END $$;


-- Step 2: Migrate Current Positions to September 2025
-- =============================================================================

WITH
-- Map auth user_id to investor_id
user_investor_map AS (
  SELECT
    p.id as user_id,
    i.id as investor_id,
    p.full_name,
    p.email
  FROM profiles p
  JOIN investors i ON i.profile_id = p.id
),

-- Get current positions with investor mapping
current_positions AS (
  SELECT
    uim.investor_id,
    uim.full_name,
    uim.email,
    pos.asset_code,
    pos.principal,
    pos.total_earned,
    pos.current_balance,
    pos.updated_at
  FROM positions pos
  JOIN user_investor_map uim ON pos.user_id = uim.user_id
  WHERE pos.current_balance::numeric > 0
)

-- Insert into investor_monthly_reports
INSERT INTO investor_monthly_reports (
  investor_id,
  report_month,
  asset_code,
  opening_balance,
  closing_balance,
  additions,
  withdrawals,
  yield_earned,
  created_at,
  updated_at
)
SELECT
  cp.investor_id,
  '2025-09-01'::date as report_month,
  cp.asset_code,
  0 as opening_balance,  -- Will be updated in Step 3 or set manually
  cp.current_balance as closing_balance,
  0 as additions,  -- Will be updated in Step 3 from transactions
  0 as withdrawals,  -- Will be updated in Step 3 from transactions
  0 as yield_earned,  -- Will be calculated in Step 3
  NOW() as created_at,
  NOW() as updated_at
FROM current_positions cp
ON CONFLICT (investor_id, report_month, asset_code)
DO UPDATE SET
  closing_balance = EXCLUDED.closing_balance,
  updated_at = NOW();

-- Log migration results
DO $$
DECLARE
  migrated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO migrated_count
  FROM investor_monthly_reports
  WHERE report_month = '2025-09-01';

  RAISE NOTICE '✅ Step 2 Complete: Migrated % position records to September 2025', migrated_count;
END $$;


-- Step 3: Calculate and Update Additions/Withdrawals from Transactions
-- =============================================================================

WITH
-- Map user_id to investor_id
user_investor_map AS (
  SELECT
    p.id as user_id,
    i.id as investor_id
  FROM profiles p
  JOIN investors i ON i.profile_id = p.id
),

-- Aggregate September 2025 transactions
september_transactions AS (
  SELECT
    t.user_id,
    t.asset_code,
    SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount::numeric ELSE 0 END) as total_deposits,
    SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN t.amount::numeric ELSE 0 END) as total_withdrawals,
    COUNT(*) as transaction_count
  FROM transactions t
  WHERE DATE_TRUNC('month', t.created_at) = '2025-09-01'::date
    AND t.status = 'confirmed'  -- Only confirmed transactions
  GROUP BY t.user_id, t.asset_code
),

-- Join with investor_id
investor_transactions AS (
  SELECT
    uim.investor_id,
    st.asset_code,
    st.total_deposits,
    st.total_withdrawals,
    st.transaction_count
  FROM september_transactions st
  JOIN user_investor_map uim ON st.user_id = uim.user_id
)

-- Update investor_monthly_reports with transaction data
UPDATE investor_monthly_reports imr
SET
  additions = it.total_deposits,
  withdrawals = it.total_withdrawals,
  updated_at = NOW()
FROM investor_transactions it
WHERE imr.investor_id = it.investor_id
  AND imr.report_month = '2025-09-01'
  AND imr.asset_code = it.asset_code;

-- Log transaction updates
DO $$
DECLARE
  updated_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO updated_count
  FROM investor_monthly_reports
  WHERE report_month = '2025-09-01'
    AND (additions > 0 OR withdrawals > 0);

  RAISE NOTICE '✅ Step 3 Complete: Updated % records with transaction data', updated_count;
END $$;


-- Step 4: Calculate Opening Balance and Yield for September 2025
-- =============================================================================
-- Formula: yield_earned = closing_balance - opening_balance - additions + withdrawals
-- Since we don't have opening_balance yet, we'll estimate:
-- opening_balance = closing_balance - additions + withdrawals - estimated_yield

-- For now, we'll leave opening_balance = 0 and let admin adjust manually
-- Yield will be calculated as: closing - opening - additions + withdrawals = closing - additions + withdrawals

UPDATE investor_monthly_reports
SET
  yield_earned = closing_balance - opening_balance - additions + withdrawals,
  updated_at = NOW()
WHERE report_month = '2025-09-01';

RAISE NOTICE '✅ Step 4 Complete: Calculated yield for September 2025';


-- Step 5: Summary Report
-- =============================================================================

DO $$
DECLARE
  total_investors INTEGER;
  total_records INTEGER;
  total_aum NUMERIC;
  total_yield NUMERIC;
BEGIN
  -- Get summary statistics
  SELECT
    COUNT(DISTINCT investor_id),
    COUNT(*),
    SUM(closing_balance),
    SUM(yield_earned)
  INTO total_investors, total_records, total_aum, total_yield
  FROM investor_monthly_reports
  WHERE report_month = '2025-09-01';

  RAISE NOTICE '';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'MIGRATION COMPLETE - SEPTEMBER 2025 DATA';
  RAISE NOTICE '=============================================================================';
  RAISE NOTICE 'Total Investors with Data: %', total_investors;
  RAISE NOTICE 'Total Position Records: %', total_records;
  RAISE NOTICE 'Total AUM (Closing Balance): $%', ROUND(total_aum, 2);
  RAISE NOTICE 'Total Yield (Calculated): $%', ROUND(total_yield, 2);
  RAISE NOTICE '';
  RAISE NOTICE 'NEXT STEPS:';
  RAISE NOTICE '1. Review migrated data in MonthlyDataEntry.tsx (select Sep 2025)';
  RAISE NOTICE '2. Adjust opening_balance for each investor/asset';
  RAISE NOTICE '3. Verify yield calculations';
  RAISE NOTICE '4. Begin backfill for Jun 2024 - Aug 2025 from PDF reports';
  RAISE NOTICE '=============================================================================';
END $$;


-- Step 6: Detailed Results by Asset
-- =============================================================================

SELECT
  report_month,
  asset_code,
  COUNT(DISTINCT investor_id) as investor_count,
  SUM(opening_balance)::numeric(20,8) as total_opening,
  SUM(additions)::numeric(20,8) as total_additions,
  SUM(withdrawals)::numeric(20,8) as total_withdrawals,
  SUM(yield_earned)::numeric(20,8) as total_yield,
  SUM(closing_balance)::numeric(20,8) as total_closing
FROM investor_monthly_reports
WHERE report_month = '2025-09-01'
GROUP BY report_month, asset_code
ORDER BY asset_code;


-- Step 7: Sample Data Check (First 10 Records)
-- =============================================================================

SELECT
  i.name as investor_name,
  imr.asset_code,
  imr.opening_balance::numeric(20,8),
  imr.additions::numeric(20,8),
  imr.withdrawals::numeric(20,8),
  imr.yield_earned::numeric(20,8),
  imr.closing_balance::numeric(20,8),
  imr.updated_at
FROM investor_monthly_reports imr
JOIN investors i ON imr.investor_id = i.id
WHERE imr.report_month = '2025-09-01'
ORDER BY i.name, imr.asset_code
LIMIT 10;

-- =============================================================================
-- END OF MIGRATION SCRIPT
-- =============================================================================
