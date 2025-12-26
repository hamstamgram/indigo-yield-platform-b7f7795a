-- ============================================================================
-- INDIGO Platform Golden Path Test Scenarios
-- Deterministic seed data and invariant assertions
-- Run this script to verify system integrity after operations
-- ============================================================================

-- ============================================================================
-- SETUP: Create test helper functions
-- ============================================================================

-- Function to assert invariants and return results
CREATE OR REPLACE FUNCTION test_assert_invariants()
RETURNS TABLE (
  test_name text,
  passed boolean,
  details text
)
LANGUAGE plpgsql
AS $$
BEGIN
  -- Test 1: Fund AUM Mismatch Check
  RETURN QUERY
  SELECT 
    'fund_aum_mismatch'::text,
    (SELECT COUNT(*) = 0 FROM fund_aum_mismatch),
    COALESCE(
      (SELECT string_agg(fund_code || ': ' || discrepancy::text, ', ') FROM fund_aum_mismatch),
      'No mismatches'
    );

  -- Test 2: Yield Conservation Check
  RETURN QUERY
  SELECT 
    'yield_conservation'::text,
    (SELECT COUNT(*) = 0 FROM yield_distribution_conservation_check),
    COALESCE(
      (SELECT string_agg(distribution_id::text || ': ' || discrepancy::text, ', ') 
       FROM yield_distribution_conservation_check),
      'Conservation intact'
    );

  -- Test 3: Position-Ledger Mismatch
  RETURN QUERY
  SELECT 
    'position_ledger_mismatch'::text,
    (SELECT COUNT(*) = 0 FROM investor_position_ledger_mismatch),
    COALESCE(
      (SELECT string_agg(investor_name || ': ' || discrepancy::text, ', ') 
       FROM investor_position_ledger_mismatch),
      'Positions match ledger'
    );

  -- Test 4: IB Allocation Consistency
  RETURN QUERY
  SELECT 
    'ib_allocation_consistency'::text,
    (SELECT COUNT(*) = 0 FROM ib_allocation_consistency 
     WHERE ib_changed_since_allocation = true OR ib_removed = true),
    COALESCE(
      (SELECT string_agg(source_investor_name || ': IB changed', ', ') 
       FROM ib_allocation_consistency
       WHERE ib_changed_since_allocation = true OR ib_removed = true),
      'IB allocations consistent'
    );

  -- Test 5: Period Orphans
  RETURN QUERY
  SELECT 
    'period_orphans'::text,
    (SELECT COUNT(*) = 0 FROM v_period_orphans),
    COALESCE(
      (SELECT string_agg(fund_code || ' ' || year::text || '-' || month::text, ', ') 
       FROM v_period_orphans),
      'No orphan periods'
    );

  -- Test 6: Transaction Distribution Orphans
  RETURN QUERY
  SELECT 
    'transaction_distribution_orphans'::text,
    (SELECT COUNT(*) = 0 FROM v_transaction_distribution_orphans),
    COALESCE(
      (SELECT string_agg(transaction_id::text || ': ' || issue_type, ', ') 
       FROM v_transaction_distribution_orphans LIMIT 5),
      'No orphan transactions'
    );

  -- Test 7: IB Allocation Orphans
  RETURN QUERY
  SELECT 
    'ib_allocation_orphans'::text,
    (SELECT COUNT(*) = 0 FROM v_ib_allocation_orphans),
    COALESCE(
      (SELECT string_agg(allocation_id::text || ': ' || issue_type, ', ') 
       FROM v_ib_allocation_orphans LIMIT 5),
      'No orphan IB allocations'
    );
END;
$$;

-- ============================================================================
-- SCENARIO 1: Basic Deposit Flow
-- ============================================================================
-- This scenario tests:
-- 1. Creating a deposit transaction
-- 2. Position update
-- 3. Fund AUM update
-- 4. Ledger consistency

/*
-- Execute manually to test:

-- Step 1: Record initial state
SELECT 'BEFORE DEPOSIT' as stage;
SELECT * FROM test_assert_invariants();

-- Step 2: Get a test investor and fund
SELECT id, email FROM profiles WHERE is_admin = false LIMIT 1;
SELECT id, code, name FROM funds WHERE status = 'active' LIMIT 1;

-- Step 3: Create deposit via RPC (replace IDs)
-- SELECT create_admin_transaction(
--   p_investor_id := '<investor_id>',
--   p_fund_id := '<fund_id>',
--   p_type := 'DEPOSIT',
--   p_amount := 1000.00,
--   p_tx_date := CURRENT_DATE,
--   p_notes := 'Golden path test deposit'
-- );

-- Step 4: Verify invariants still hold
SELECT 'AFTER DEPOSIT' as stage;
SELECT * FROM test_assert_invariants();
*/

-- ============================================================================
-- SCENARIO 2: Yield Distribution Flow
-- ============================================================================
-- This scenario tests:
-- 1. Yield preview calculation
-- 2. Yield apply atomicity
-- 3. Fee allocation correctness
-- 4. IB allocation correctness
-- 5. Transaction creation for interest and fees
-- 6. Conservation of value

/*
-- Execute manually to test:

-- Step 1: Check current state
SELECT 'BEFORE YIELD' as stage;
SELECT * FROM test_assert_invariants();

-- Step 2: Preview yield for a fund
SELECT * FROM preview_yield_distribution(
  '<fund_id>',
  CURRENT_DATE,
  'transaction'::aum_purpose
);

-- Step 3: Apply yield (replace IDs and values from preview)
-- SELECT apply_yield_distribution(...);

-- Step 4: Verify invariants
SELECT 'AFTER YIELD' as stage;
SELECT * FROM test_assert_invariants();

-- Step 5: Verify conservation
SELECT 
  yd.id,
  yd.gross_yield,
  (SELECT COALESCE(SUM(amount), 0) FROM transactions_v2 
   WHERE distribution_id = yd.id AND type = 'interest' AND is_voided = false) as distributed_interest,
  (SELECT COALESCE(SUM(fee_amount), 0) FROM fee_allocations 
   WHERE distribution_id = yd.id AND is_voided = false) as total_fees,
  yd.gross_yield - 
    (SELECT COALESCE(SUM(amount), 0) FROM transactions_v2 
     WHERE distribution_id = yd.id AND type = 'interest' AND is_voided = false) -
    (SELECT COALESCE(SUM(fee_amount), 0) FROM fee_allocations 
     WHERE distribution_id = yd.id AND is_voided = false) as should_be_zero
FROM yield_distributions yd
WHERE yd.status = 'applied'
ORDER BY yd.created_at DESC
LIMIT 5;
*/

-- ============================================================================
-- SCENARIO 3: Withdrawal Flow
-- ============================================================================
-- This scenario tests:
-- 1. Withdrawal request creation
-- 2. Withdrawal approval flow
-- 3. Position reduction
-- 4. Fund AUM reduction

/*
-- Step 1: Create withdrawal request
SELECT create_withdrawal_request(
  p_investor_id := '<investor_id>',
  p_fund_id := '<fund_id>',
  p_amount := 100.00,
  p_type := 'partial',
  p_notes := 'Golden path test withdrawal'
);

-- Step 2: Check invariants (request shouldn't affect positions yet)
SELECT * FROM test_assert_invariants();

-- Step 3: Approve withdrawal
-- SELECT approve_withdrawal(p_withdrawal_id := '<withdrawal_id>');

-- Step 4: Verify position reduced
SELECT * FROM test_assert_invariants();
*/

-- ============================================================================
-- SCENARIO 4: IB Reassignment Mid-Cycle
-- ============================================================================
-- This scenario tests:
-- 1. IB assignment
-- 2. IB commission calculation
-- 3. Mid-cycle reassignment
-- 4. Historical allocation preservation

/*
-- Step 1: Check current IB assignment
SELECT id, email, ib_parent_id FROM profiles WHERE id = '<investor_id>';

-- Step 2: Assign IB
UPDATE profiles SET ib_parent_id = '<ib_investor_id>' WHERE id = '<investor_id>';

-- Step 3: Apply yield (IB should get commission)
-- Step 4: Reassign to different IB
UPDATE profiles SET ib_parent_id = '<new_ib_investor_id>' WHERE id = '<investor_id>';

-- Step 5: Verify historical allocations preserved
SELECT * FROM ib_allocation_consistency WHERE source_investor_id = '<investor_id>';
*/

-- ============================================================================
-- SCENARIO 5: Idempotency Test
-- ============================================================================
-- This scenario tests:
-- 1. Running the same operation twice produces no duplicate data

/*
-- Step 1: Count transactions before
SELECT COUNT(*) as before_count FROM transactions_v2 WHERE notes LIKE 'Idempotency test%';

-- Step 2: Create transaction with unique reference
-- (The unique constraint on reference_id should prevent duplicates)

-- Step 3: Try to create same transaction again
-- Should fail or be ignored due to idempotency

-- Step 4: Count should be same
SELECT COUNT(*) as after_count FROM transactions_v2 WHERE notes LIKE 'Idempotency test%';
*/

-- ============================================================================
-- SCENARIO 6: Edge Cases
-- ============================================================================

-- 6.1: Zero balance position
/*
SELECT * FROM investor_positions 
WHERE current_value = 0 
AND EXISTS (SELECT 1 FROM transactions_v2 t WHERE t.investor_id = investor_positions.investor_id);
*/

-- 6.2: Voided transactions don't affect balances
/*
SELECT 
  p.id,
  p.current_value as position_value,
  (SELECT COALESCE(SUM(
    CASE WHEN type IN ('deposit', 'interest', 'first_investment') THEN amount 
         WHEN type IN ('withdrawal', 'fee') THEN -amount 
         ELSE 0 END
  ), 0) FROM transactions_v2 t 
   WHERE t.investor_id = p.investor_id 
   AND t.fund_id = p.fund_id 
   AND t.is_voided = false) as calculated_balance,
  p.current_value - (SELECT COALESCE(SUM(
    CASE WHEN type IN ('deposit', 'interest', 'first_investment') THEN amount 
         WHEN type IN ('withdrawal', 'fee') THEN -amount 
         ELSE 0 END
  ), 0) FROM transactions_v2 t 
   WHERE t.investor_id = p.investor_id 
   AND t.fund_id = p.fund_id 
   AND t.is_voided = false) as discrepancy
FROM investor_positions p;
*/

-- ============================================================================
-- QUICK INTEGRITY CHECK (Run anytime)
-- ============================================================================

-- Run all invariant checks
SELECT * FROM test_assert_invariants();

-- Or use the built-in function
SELECT * FROM check_system_integrity();

-- ============================================================================
-- CLEANUP (if needed)
-- ============================================================================

-- DROP FUNCTION IF EXISTS test_assert_invariants();
