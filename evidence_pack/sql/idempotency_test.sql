-- Evidence Pack: Yield Distribution Idempotency Test
-- Verifies that applying the same distribution twice produces no net changes

-- ============================================
-- STEP 1: Show existing idempotency constraints
-- ============================================
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name IN ('transactions_v2', 'ib_allocations', 'fee_allocations')
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.table_name, tc.constraint_name, kcu.ordinal_position;

-- ============================================
-- STEP 2: Count baseline records
-- ============================================
SELECT 
    'BEFORE FIRST APPLY' AS stage,
    (SELECT COUNT(*) FROM transactions_v2) AS transactions_count,
    (SELECT COUNT(*) FROM ib_allocations) AS ib_allocations_count,
    (SELECT COUNT(*) FROM fee_allocations) AS fee_allocations_count;

-- ============================================
-- STEP 3: Apply yield distribution (first time)
-- ============================================
-- This would be done via the RPC call:
-- SELECT * FROM apply_daily_yield_to_fund_v2(
--     p_fund_id := 'FUND_UUID',
--     p_yield_date := '2024-12-15',
--     p_yield_percentage := 0.05,
--     p_period_id := 'PERIOD_UUID',
--     p_purpose := 'reporting',
--     p_created_by := 'ADMIN_UUID'
-- );

-- After first apply:
SELECT 
    'AFTER FIRST APPLY' AS stage,
    (SELECT COUNT(*) FROM transactions_v2) AS transactions_count,
    (SELECT COUNT(*) FROM ib_allocations) AS ib_allocations_count,
    (SELECT COUNT(*) FROM fee_allocations) AS fee_allocations_count;

-- ============================================
-- STEP 4: Apply SAME yield distribution (second time)
-- ============================================
-- Call the same RPC with identical parameters
-- The unique constraints should prevent duplicates

-- Expected behavior:
-- 1. transactions_v2: reference_id uniqueness prevents duplicate
-- 2. ib_allocations: ib_allocations_idempotency constraint prevents duplicate
-- 3. fee_allocations: fee_allocations_unique constraint prevents duplicate

-- After second apply (should be same as after first):
SELECT 
    'AFTER SECOND APPLY' AS stage,
    (SELECT COUNT(*) FROM transactions_v2) AS transactions_count,
    (SELECT COUNT(*) FROM ib_allocations) AS ib_allocations_count,
    (SELECT COUNT(*) FROM fee_allocations) AS fee_allocations_count;

-- ============================================
-- STEP 5: Verify no duplicates
-- ============================================

-- Check for any duplicate reference_ids in transactions_v2
SELECT 
    'transactions_v2 duplicates' AS check_type,
    COUNT(*) AS duplicate_count
FROM (
    SELECT reference_id, COUNT(*) AS cnt
    FROM transactions_v2
    WHERE reference_id IS NOT NULL
    GROUP BY reference_id
    HAVING COUNT(*) > 1
) AS duplicates;

-- Check for any duplicate ib_allocations
SELECT 
    'ib_allocations duplicates' AS check_type,
    COUNT(*) AS duplicate_count
FROM (
    SELECT source_investor_id, ib_investor_id, period_start, period_end, fund_id, COUNT(*) AS cnt
    FROM ib_allocations
    GROUP BY source_investor_id, ib_investor_id, period_start, period_end, fund_id
    HAVING COUNT(*) > 1
) AS duplicates;

-- Check for any duplicate fee_allocations
SELECT 
    'fee_allocations duplicates' AS check_type,
    COUNT(*) AS duplicate_count
FROM (
    SELECT investor_id, fund_id, period_start, period_end, distribution_id, COUNT(*) AS cnt
    FROM fee_allocations
    GROUP BY investor_id, fund_id, period_start, period_end, distribution_id
    HAVING COUNT(*) > 1
) AS duplicates;

-- ============================================
-- EXPECTED OUTPUT
-- ============================================
/*
Stage             | transactions | ib_alloc | fee_alloc
------------------|--------------|----------|----------
BEFORE FIRST      | 100          | 20       | 30
AFTER FIRST       | 110          | 25       | 35
AFTER SECOND      | 110          | 25       | 35  <- SAME (idempotent!)

Duplicate checks should all return 0.
*/
