-- INDIGO Platform Idempotency Verification
-- Generated: 2024-12-22
--
-- Purpose: Verify that re-running operations produces the same result
-- and doesn't create duplicate records

-- =============================================================================
-- 1. YIELD DISTRIBUTION IDEMPOTENCY
-- Unique constraint prevents duplicate distributions
-- =============================================================================

-- Verify unique constraint exists
SELECT 
  tc.constraint_name,
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.constraint_type = 'UNIQUE'
  AND tc.table_name = 'yield_distributions'
ORDER BY kcu.ordinal_position;

-- Test: Attempt duplicate distribution (should fail)
-- This is a dry-run test - uncomment to execute
/*
INSERT INTO yield_distributions (fund_id, period_start, period_end, yield_rate)
SELECT fund_id, period_start, period_end, yield_rate
FROM yield_distributions
LIMIT 1
ON CONFLICT DO NOTHING;
-- Should insert 0 rows
*/

-- =============================================================================
-- 2. REPORT GENERATION IDEMPOTENCY
-- ON CONFLICT UPDATE ensures regeneration overwrites
-- =============================================================================

-- Verify unique index on generated_statements
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'generated_statements'
  AND indexdef LIKE '%UNIQUE%';

-- Verify only one report per investor per period
SELECT 
  investor_id,
  period_id,
  COUNT(*) as report_count
FROM generated_statements
GROUP BY investor_id, period_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows

-- =============================================================================
-- 3. TRANSACTION IDEMPOTENCY
-- Transactions with same reference should not duplicate
-- =============================================================================

-- Check for potential duplicate transactions
-- (same investor, fund, type, amount, date within 1 minute)
SELECT 
  t1.id as tx1_id,
  t2.id as tx2_id,
  t1.user_id,
  t1.fund_id,
  t1.type,
  t1.amount,
  t1.created_at as tx1_created,
  t2.created_at as tx2_created
FROM transactions_v2 t1
JOIN transactions_v2 t2 ON 
  t1.user_id = t2.user_id
  AND t1.fund_id = t2.fund_id
  AND t1.type = t2.type
  AND t1.amount = t2.amount
  AND t1.effective_date = t2.effective_date
  AND t1.id < t2.id
  AND ABS(EXTRACT(EPOCH FROM (t1.created_at - t2.created_at))) < 60
ORDER BY t1.created_at DESC
LIMIT 10;

-- Review any results for legitimate duplicates vs errors

-- =============================================================================
-- 4. FEE ALLOCATION IDEMPOTENCY
-- =============================================================================

-- Verify unique constraint on fee_allocations
SELECT 
  tc.constraint_name,
  string_agg(kcu.column_name, ', ' ORDER BY kcu.ordinal_position) as columns
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'fee_allocations'
  AND tc.constraint_type IN ('UNIQUE', 'PRIMARY KEY')
GROUP BY tc.constraint_name;

-- Check for duplicate fee allocations
SELECT 
  investor_id,
  fund_id,
  period_start,
  period_end,
  COUNT(*) as allocation_count
FROM fee_allocations
GROUP BY investor_id, fund_id, period_start, period_end
HAVING COUNT(*) > 1;

-- Expected: 0 rows

-- =============================================================================
-- 5. IB ALLOCATION IDEMPOTENCY
-- =============================================================================

-- Check for duplicate IB allocations
SELECT 
  ib_investor_id,
  source_investor_id,
  period_id,
  fund_id,
  COUNT(*) as allocation_count
FROM ib_allocations
GROUP BY ib_investor_id, source_investor_id, period_id, fund_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows

-- =============================================================================
-- 6. EMAIL DELIVERY IDEMPOTENCY
-- Only one delivery record per statement
-- =============================================================================

-- Verify unique constraint
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'statement_email_delivery';

-- Check for duplicate deliveries
SELECT 
  statement_id,
  COUNT(*) as delivery_count
FROM statement_email_delivery
GROUP BY statement_id
HAVING COUNT(*) > 1;

-- Expected: 0 rows (but multiple attempts for same statement is allowed with different timestamps)

-- =============================================================================
-- 7. PERFORMANCE RECORD IDEMPOTENCY
-- =============================================================================

-- Verify unique constraint on investor_fund_performance
SELECT 
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'investor_fund_performance'
  AND indexdef LIKE '%unique%';

-- Check for duplicates
SELECT 
  investor_id,
  period_id,
  fund_name,
  purpose,
  COUNT(*) as record_count
FROM investor_fund_performance
GROUP BY investor_id, period_id, fund_name, purpose
HAVING COUNT(*) > 1;

-- Expected: 0 rows

-- =============================================================================
-- 8. SAFE RE-RUN VERIFICATION
-- These operations should be safe to run multiple times
-- =============================================================================

-- List all ON CONFLICT clauses in codebase (run in shell):
-- grep -r "ON CONFLICT" src/ supabase/

-- Verify all have matching constraints:
SELECT 
  t.relname as table_name,
  c.conname as constraint_name,
  c.contype as constraint_type,
  pg_get_constraintdef(c.oid) as definition
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname IN (
  'yield_distributions',
  'generated_statements', 
  'investor_fund_performance',
  'fee_allocations',
  'ib_allocations',
  'statement_email_delivery'
)
AND c.contype IN ('u', 'p')  -- unique or primary key
ORDER BY t.relname, c.conname;
