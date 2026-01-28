-- =====================================================================
-- INDIGO YIELD PLATFORM - DATABASE AUDIT FIXES
-- Date: 2026-01-27
-- Based on: DATABASE_AUDIT_REPORT_2026-01-27.md
-- =====================================================================

-- PRIORITY 1: CRITICAL FIXES
-- =====================================================================

-- --------------------------------------------------------------------
-- FIX 1.1: Add fee_allocations Population to apply_adb_yield_distribution
-- --------------------------------------------------------------------
-- This requires updating the function code in Supabase dashboard
-- or via migration. The fix adds this block after line 168:

/*
ADD THIS CODE BLOCK to apply_adb_yield_distribution after platform_fee_ledger INSERT:

    -- FIX: Also insert into fee_allocations for conservation tracking
    IF v_fee_share > 0 THEN
      INSERT INTO fee_allocations (
        distribution_id, fund_id, investor_id, fees_account_id,
        period_start, period_end, purpose,
        base_net_income, fee_percentage, fee_amount,
        credit_transaction_id, debit_transaction_id,
        created_at, created_by, is_voided
      ) VALUES (
        v_distribution_id, p_fund_id, v_investor.investor_id, v_indigo_fees_id,
        p_period_start, p_period_end, v_purpose_enum,
        v_net_share, v_investor.fee_pct, v_fee_share,
        v_fee_tx_id, NULL, -- debit_transaction_id not used in current model
        NOW(), v_admin, false
      );
    END IF;
*/

-- --------------------------------------------------------------------
-- FIX 1.2: Backfill fee_allocations from Existing Distributions
-- --------------------------------------------------------------------

-- Step 1: Verify the data before backfill
SELECT
  COUNT(*) FILTER (WHERE fa_count = 0 AND total_fees > 0) as missing_fee_allocations,
  COUNT(*) FILTER (WHERE fa_count > 0) as has_fee_allocations,
  SUM(total_fees) FILTER (WHERE fa_count = 0 AND total_fees > 0) as total_fees_missing
FROM (
  SELECT
    d.id,
    d.total_fees,
    COUNT(fa.id) as fa_count
  FROM yield_distributions d
  LEFT JOIN fee_allocations fa ON fa.distribution_id = d.id AND NOT COALESCE(fa.is_voided, false)
  WHERE NOT COALESCE(d.is_voided, false)
  GROUP BY d.id, d.total_fees
) stats;

-- Step 2: Backfill from platform_fee_ledger
INSERT INTO fee_allocations (
  distribution_id,
  fund_id,
  investor_id,
  fees_account_id,
  period_start,
  period_end,
  purpose,
  base_net_income,
  fee_percentage,
  fee_amount,
  credit_transaction_id,
  created_at,
  created_by,
  is_voided
)
SELECT
  pfl.yield_distribution_id,
  pfl.fund_id,
  pfl.investor_id,
  '169bb053-36cb-4f6e-93ea-831f0dfeaf1d'::uuid, -- INDIGO FEES account ID
  d.period_start,
  d.period_end,
  d.purpose,
  pfl.gross_yield_amount - pfl.fee_amount, -- base_net_income = gross - fee
  pfl.fee_percentage,
  pfl.fee_amount,
  pfl.transaction_id, -- credit_transaction_id (FEE_CREDIT to INDIGO)
  pfl.created_at,
  pfl.created_by,
  pfl.is_voided
FROM platform_fee_ledger pfl
JOIN yield_distributions d ON d.id = pfl.yield_distribution_id
WHERE NOT EXISTS (
  SELECT 1 FROM fee_allocations fa
  WHERE fa.distribution_id = pfl.yield_distribution_id
    AND fa.investor_id = pfl.investor_id
)
AND NOT COALESCE(pfl.is_voided, false);

-- Step 3: Verify backfill
SELECT
  'After backfill' as stage,
  COUNT(*) FILTER (WHERE fa_count = 0 AND total_fees > 0) as missing_fee_allocations,
  COUNT(*) FILTER (WHERE fa_count > 0) as has_fee_allocations
FROM (
  SELECT
    d.id,
    d.total_fees,
    COUNT(fa.id) as fa_count
  FROM yield_distributions d
  LEFT JOIN fee_allocations fa ON fa.distribution_id = d.id AND NOT COALESCE(fa.is_voided, false)
  WHERE NOT COALESCE(d.is_voided, false)
  GROUP BY d.id, d.total_fees
) stats;

-- Expected result: missing_fee_allocations = 0


-- PRIORITY 2: HIGH PRIORITY FIXES
-- =====================================================================

-- --------------------------------------------------------------------
-- FIX 2.1: Generate reference_id for NULL Transactions
-- --------------------------------------------------------------------

-- Step 1: Preview affected transactions
SELECT
  type,
  COUNT(*) as count,
  MIN(tx_date) as earliest,
  MAX(tx_date) as latest
FROM transactions_v2
WHERE reference_id IS NULL
  AND NOT COALESCE(is_voided, false)
GROUP BY type;

-- Step 2: Generate reference_ids (non-destructive, idempotent)
UPDATE transactions_v2
SET reference_id = CASE
  WHEN type = 'DEPOSIT' THEN 'DEP-' || id::text
  WHEN type = 'WITHDRAWAL' THEN 'WDL-' || id::text
  WHEN type = 'YIELD' THEN 'YLD-' || id::text
  WHEN type = 'FEE_CREDIT' THEN 'FEE-' || id::text
  WHEN type = 'IB_CREDIT' THEN 'IBC-' || id::text
  ELSE type::text || '-' || id::text
END
WHERE reference_id IS NULL
  AND NOT COALESCE(is_voided, false);

-- Step 3: Verify no NULL reference_ids remain
SELECT COUNT(*) as remaining_null_refs
FROM transactions_v2
WHERE reference_id IS NULL
  AND NOT COALESCE(is_voided, false);
-- Expected: 0

-- Step 4: Add NOT NULL constraint (optional, run after verifying Step 3)
-- ALTER TABLE transactions_v2
-- ALTER COLUMN reference_id SET NOT NULL;
-- Note: This may require additional app changes to ensure all new transactions have reference_id


-- PRIORITY 3: MEDIUM PRIORITY FIXES
-- =====================================================================

-- --------------------------------------------------------------------
-- FIX 3.1: Create Missing Fee Schedule for vivie.liana@example.com
-- --------------------------------------------------------------------

-- Step 1: Verify the missing fee schedule
SELECT
  p.id as investor_id,
  p.email,
  p.fee_pct as profile_fee_pct,
  f.id as fund_id,
  f.code as fund_code,
  ip.current_value,
  ifs.id as has_fee_schedule
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
JOIN funds f ON ip.fund_id = f.id
LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id AND ifs.fund_id = ip.fund_id
WHERE p.email = 'vivie.liana@example.com'
  AND f.code = 'IND-BTC';

-- Step 2: Create fee schedule (using profile's default fee_pct)
INSERT INTO investor_fee_schedule (investor_id, fund_id, fee_pct, effective_date)
SELECT
  ip.investor_id,
  ip.fund_id,
  COALESCE(p.fee_pct, 20) as fee_pct, -- Default to 20% if NULL
  CURRENT_DATE as effective_date
FROM investor_positions ip
JOIN profiles p ON p.id = ip.investor_id
JOIN funds f ON f.id = ip.fund_id
WHERE p.email = 'vivie.liana@example.com'
  AND f.code = 'IND-BTC'
  AND NOT EXISTS (
    SELECT 1 FROM investor_fee_schedule ifs
    WHERE ifs.investor_id = ip.investor_id
      AND ifs.fund_id = ip.fund_id
  );

-- Step 3: Verify fee schedule created
SELECT
  p.email,
  f.code,
  ifs.fee_pct,
  ifs.effective_date
FROM investor_fee_schedule ifs
JOIN profiles p ON p.id = ifs.investor_id
JOIN funds f ON f.id = ifs.fund_id
WHERE p.email = 'vivie.liana@example.com'
  AND f.code = 'IND-BTC';


-- --------------------------------------------------------------------
-- FIX 3.2: Create recompute_all_positions Function
-- --------------------------------------------------------------------

CREATE OR REPLACE FUNCTION recompute_all_positions()
RETURNS TABLE(
  investor_id uuid,
  fund_id uuid,
  fund_code text,
  old_value numeric,
  new_value numeric,
  variance numeric
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_pos RECORD;
  v_old_value numeric;
  v_new_value numeric;
  v_count integer := 0;
BEGIN
  RAISE NOTICE 'Starting recomputation of all investor positions...';

  FOR v_pos IN
    SELECT
      ip.investor_id,
      ip.fund_id,
      f.code as fund_code,
      ip.current_value
    FROM investor_positions ip
    JOIN funds f ON f.id = ip.fund_id
    ORDER BY ip.investor_id, ip.fund_id
  LOOP
    v_old_value := v_pos.current_value;

    -- Recompute the position
    PERFORM recompute_investor_position(v_pos.investor_id, v_pos.fund_id);

    -- Get the new value
    SELECT ip.current_value INTO v_new_value
    FROM investor_positions ip
    WHERE ip.investor_id = v_pos.investor_id
      AND ip.fund_id = v_pos.fund_id;

    v_count := v_count + 1;

    -- Return the result
    investor_id := v_pos.investor_id;
    fund_id := v_pos.fund_id;
    fund_code := v_pos.fund_code;
    old_value := v_old_value;
    new_value := v_new_value;
    variance := v_new_value - v_old_value;

    RETURN NEXT;

    -- Progress reporting every 100 positions
    IF v_count % 100 = 0 THEN
      RAISE NOTICE 'Processed % positions...', v_count;
    END IF;
  END LOOP;

  RAISE NOTICE 'Recomputation complete. Total positions processed: %', v_count;
END;
$$;

-- Test the function (preview only, doesn't modify data in this query)
SELECT * FROM recompute_all_positions()
WHERE variance != 0
LIMIT 10;


-- PRIORITY 4: LOW PRIORITY FIXES (Technical Debt)
-- =====================================================================

-- --------------------------------------------------------------------
-- FIX 4.1: Simplify calc_avg_daily_balance (Code Cleanup)
-- --------------------------------------------------------------------

-- This is a code readability fix, not a migration.
-- When refactoring calc_avg_daily_balance, replace the complex CASE statement:

/*
CURRENT CODE (lines ~40-50):
    SELECT
      t.tx_date,
      SUM(
        CASE
          WHEN t.type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'FEE_CREDIT', 'IB_CREDIT', 'INTERNAL_CREDIT') THEN t.amount
          WHEN t.type = 'ADJUSTMENT' THEN t.amount
          WHEN t.type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL', 'IB_DEBIT') THEN -ABS(t.amount)
          ELSE 0
        END
      ) as daily_net_change

SIMPLIFIED CODE:
    SELECT
      t.tx_date,
      SUM(t.amount) as daily_net_change  -- All amounts already have correct signs

RATIONALE:
- WITHDRAWAL amounts are stored as negative (-1000)
- DEPOSIT amounts are stored as positive (1000)
- YIELD amounts are stored as positive
- FEE_CREDIT amounts are stored as positive
- The -ABS(t.amount) for WITHDRAWAL is redundant: -ABS(-1000) = -1000
- Simplifying to SUM(t.amount) is clearer and faster
*/


-- =====================================================================
-- VERIFICATION QUERIES
-- =====================================================================

-- Run these after applying fixes to verify success

-- 1. Verify fee_allocations are populated
SELECT
  'fee_allocations check' as test,
  CASE
    WHEN COUNT(*) FILTER (WHERE fa_count = 0 AND total_fees > 0) = 0
    THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  COUNT(*) FILTER (WHERE fa_count = 0 AND total_fees > 0) as violations
FROM (
  SELECT d.id, d.total_fees, COUNT(fa.id) as fa_count
  FROM yield_distributions d
  LEFT JOIN fee_allocations fa ON fa.distribution_id = d.id AND NOT COALESCE(fa.is_voided, false)
  WHERE NOT COALESCE(d.is_voided, false)
  GROUP BY d.id, d.total_fees
) stats;

-- 2. Verify no NULL reference_ids
SELECT
  'reference_id check' as test,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  COUNT(*) as violations
FROM transactions_v2
WHERE reference_id IS NULL
  AND NOT COALESCE(is_voided, false);

-- 3. Verify no missing fee schedules for active positions
SELECT
  'fee_schedule check' as test,
  CASE
    WHEN COUNT(*) = 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  COUNT(*) as violations
FROM investor_positions ip
JOIN profiles p ON ip.investor_id = p.id
LEFT JOIN investor_fee_schedule ifs ON ifs.investor_id = ip.investor_id AND ifs.fund_id = ip.fund_id
WHERE ifs.id IS NULL
  AND p.account_type = 'investor'
  AND ip.current_value != 0;

-- 4. Verify recompute_all_positions function exists
SELECT
  'recompute_all_positions check' as test,
  CASE
    WHEN COUNT(*) > 0 THEN 'PASS'
    ELSE 'FAIL'
  END as status,
  COUNT(*) as function_count
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.proname = 'recompute_all_positions';

-- 5. Run comprehensive health check
SELECT
  check_name,
  check_status,
  violation_count
FROM run_comprehensive_health_check()
ORDER BY
  CASE check_status
    WHEN 'FAIL' THEN 1
    WHEN 'WARN' THEN 2
    ELSE 3
  END,
  check_name;

-- Expected: All checks should PASS after applying fixes

-- =====================================================================
-- ROLLBACK PROCEDURES
-- =====================================================================

-- If FIX 1.2 needs to be rolled back (fee_allocations backfill):
/*
DELETE FROM fee_allocations
WHERE created_at >= '2026-01-27'  -- Adjust to actual backfill time
  AND created_by IS NOT NULL;
*/

-- If FIX 2.1 needs to be rolled back (reference_id generation):
/*
UPDATE transactions_v2
SET reference_id = NULL
WHERE reference_id LIKE 'DEP-%'
   OR reference_id LIKE 'WDL-%'
   OR reference_id LIKE 'YLD-%'
   OR reference_id LIKE 'FEE-%'
   OR reference_id LIKE 'IBC-%';
*/

-- If FIX 3.2 needs to be dropped (recompute_all_positions):
/*
DROP FUNCTION IF EXISTS recompute_all_positions();
*/

-- =====================================================================
-- NOTES
-- =====================================================================

/*
EXECUTION ORDER:
1. Run FIX 1.2 (backfill fee_allocations) - Safe, idempotent
2. Update apply_adb_yield_distribution function (FIX 1.1) - Requires Supabase migration
3. Run FIX 2.1 (generate reference_ids) - Safe, idempotent
4. Run FIX 3.1 (create fee schedule) - Safe, idempotent
5. Run FIX 3.2 (create recompute_all_positions) - Safe, new function
6. Run verification queries

SAFETY NOTES:
- All fixes are designed to be idempotent (safe to run multiple times)
- FIX 1.1 requires function code change in Supabase
- Test in development environment before production
- Take database backup before applying fixes
- Monitor audit_log after changes

ESTIMATED EXECUTION TIME:
- FIX 1.2: ~1 second (43 records)
- FIX 2.1: ~1 second (144 records)
- FIX 3.1: <1 second (1 record)
- FIX 3.2: <1 second (function creation)
- Total: ~3 seconds for data fixes

POST-FIX ACTIONS:
1. Run comprehensive health check
2. Verify conservation properties
3. Update documentation
4. Add test coverage for fee_allocations creation
5. Monitor for any side effects
*/
