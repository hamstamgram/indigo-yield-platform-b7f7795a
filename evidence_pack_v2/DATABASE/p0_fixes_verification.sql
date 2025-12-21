-- P0 Fixes Verification SQL
-- Run these queries to verify P0 fixes are working correctly
-- Date: 2024-12-21

-- ============================================
-- 1. DUPLICATE TRANSACTIONS CHECK
-- ============================================
-- Verify no duplicate transactions exist (same investor, fund, type, amount, date)

SELECT 
  'Duplicate Transactions' as check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END as status,
  COUNT(*) as duplicate_count
FROM (
  SELECT investor_id, fund_id, type, amount, tx_date, COUNT(*) as cnt
  FROM transactions_v2 
  GROUP BY investor_id, fund_id, type, amount, tx_date 
  HAVING COUNT(*) > 1
) duplicates;

-- ============================================
-- 2. REFERENCE_ID UNIQUENESS INDEX
-- ============================================
-- Verify unique index exists on reference_id

SELECT 
  'Reference ID Index' as check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END as status,
  string_agg(indexname, ', ') as indexes
FROM pg_indexes 
WHERE tablename = 'transactions_v2' 
  AND indexdef LIKE '%reference_id%'
  AND indexdef LIKE '%UNIQUE%';

-- ============================================
-- 3. TX_TYPE ENUM VALUES
-- ============================================
-- Verify INTERNAL_CREDIT and INTERNAL_WITHDRAWAL exist in enum

SELECT 
  'TX Type Enum - INTERNAL_CREDIT' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'tx_type' AND e.enumlabel = 'INTERNAL_CREDIT'
  ) THEN 'PASS ✅' ELSE 'FAIL ❌' END as status;

SELECT 
  'TX Type Enum - INTERNAL_WITHDRAWAL' as check_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM pg_enum e
    JOIN pg_type t ON e.enumtypid = t.oid
    WHERE t.typname = 'tx_type' AND e.enumlabel = 'INTERNAL_WITHDRAWAL'
  ) THEN 'PASS ✅' ELSE 'FAIL ❌' END as status;

-- ============================================
-- 4. ELIGIBLE INVESTOR COUNT
-- ============================================
-- Verify eligibility filtering works (investors with positions > 0)

SELECT 
  'Eligible Investors' as check_name,
  COUNT(DISTINCT investor_id) as eligible_count,
  (SELECT COUNT(*) FROM profiles WHERE role = 'investor') as total_investors
FROM investor_positions 
WHERE current_value > 0;

-- ============================================
-- 5. DUPLICATE REFERENCE_IDS
-- ============================================
-- Verify no duplicate reference_ids exist

SELECT 
  'Duplicate Reference IDs' as check_name,
  CASE WHEN COUNT(*) = 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END as status,
  COUNT(*) as duplicate_count
FROM (
  SELECT reference_id, COUNT(*) as cnt
  FROM transactions_v2 
  WHERE reference_id IS NOT NULL
  GROUP BY reference_id 
  HAVING COUNT(*) > 1
) dup_refs;

-- ============================================
-- 6. IDEMPOTENCY CONSTRAINTS ON RELATED TABLES
-- ============================================
-- Verify unique constraints on fee_allocations, ib_allocations, generated_statements

SELECT 
  'Fee Allocations Unique Constraint' as check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END as status
FROM pg_indexes 
WHERE tablename = 'fee_allocations' 
  AND indexdef LIKE '%UNIQUE%';

SELECT 
  'IB Allocations Unique Constraint' as check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END as status
FROM pg_indexes 
WHERE tablename = 'ib_allocations' 
  AND indexdef LIKE '%UNIQUE%';

SELECT 
  'Generated Statements Unique Constraint' as check_name,
  CASE WHEN COUNT(*) > 0 THEN 'PASS ✅' ELSE 'FAIL ❌' END as status
FROM pg_indexes 
WHERE tablename = 'generated_statements' 
  AND indexdef LIKE '%UNIQUE%';

-- ============================================
-- 7. TRANSACTIONS WITH MISSING REFERENCE_ID
-- ============================================
-- Check how many legacy transactions lack reference_id (expected for old data)

SELECT 
  'Transactions Missing Reference ID' as check_name,
  COUNT(*) as missing_count,
  CASE 
    WHEN COUNT(*) = 0 THEN 'All have reference_id ✅'
    ELSE 'Legacy transactions without reference_id (expected)'
  END as status
FROM transactions_v2 
WHERE reference_id IS NULL;

-- ============================================
-- SUMMARY QUERY
-- ============================================

SELECT 'P0 VERIFICATION SUMMARY' as title, NOW() as run_at;
