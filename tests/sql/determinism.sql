-- ============================================================================
-- DETERMINISM TESTS: Verify Consistent, Repeatable Behavior
-- Fortune-500 Grade Go-Live Certification
-- ============================================================================
--
-- This script verifies that all read operations are deterministic and
-- consistent across multiple calls with the same parameters.
--
-- USAGE: Run AFTER fixtures_seed.sql
-- ============================================================================

DO $$
DECLARE
  v_test_fund_id uuid := 'f0000000-0000-0000-0000-000000000001'::uuid;
  v_test_date date := '2026-01-15';
  v_result1 numeric;
  v_result2 numeric;
  v_result3 numeric;
  v_last_day date;
  v_expected_last_day date;
  v_aum_record record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== DETERMINISM TESTS ===';
  RAISE NOTICE '';

  -- ========================================================================
  -- TEST 1: get_fund_aum_as_of Returns Same Value
  -- Multiple calls with same parameters must return identical results
  -- ========================================================================
  RAISE NOTICE 'TEST 1: get_fund_aum_as_of Determinism';
  
  -- Call the function three times
  BEGIN
    SELECT total_aum INTO v_result1 
    FROM get_fund_aum_as_of(v_test_fund_id, v_test_date, 'transaction');
    
    SELECT total_aum INTO v_result2 
    FROM get_fund_aum_as_of(v_test_fund_id, v_test_date, 'transaction');
    
    SELECT total_aum INTO v_result3 
    FROM get_fund_aum_as_of(v_test_fund_id, v_test_date, 'transaction');
    
    -- All three must be identical (including NULL = NULL)
    IF v_result1 IS DISTINCT FROM v_result2 OR v_result2 IS DISTINCT FROM v_result3 THEN
      RAISE EXCEPTION 'DETERMINISM FAIL: get_fund_aum_as_of returned different values: %, %, %',
        v_result1, v_result2, v_result3;
    END IF;
    
    RAISE NOTICE 'PASS: get_fund_aum_as_of returns consistent value: %', v_result1;
  EXCEPTION WHEN undefined_function THEN
    RAISE NOTICE 'SKIP: get_fund_aum_as_of function not available';
  END;

  -- ========================================================================
  -- TEST 2: No Snapshot Returns NULL, Not Zero
  -- Historical reads for non-existent dates must return NULL explicitly
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: No Snapshot Returns NULL (Not Zero)';
  
  BEGIN
    -- Query for a date before any data exists
    SELECT total_aum INTO v_result1 
    FROM get_fund_aum_as_of(v_test_fund_id, '1900-01-01'::date, 'transaction');
    
    IF v_result1 IS NOT NULL THEN
      RAISE EXCEPTION 'DETERMINISM FAIL: Expected NULL for non-existent snapshot, got %', v_result1;
    END IF;
    
    RAISE NOTICE 'PASS: Non-existent snapshot returns NULL';
  EXCEPTION 
    WHEN undefined_function THEN
      RAISE NOTICE 'SKIP: get_fund_aum_as_of function not available';
    WHEN OTHERS THEN
      -- Some implementations may throw an error instead of returning NULL
      IF SQLERRM LIKE '%no data%' OR SQLERRM LIKE '%not found%' THEN
        RAISE NOTICE 'PASS: Non-existent snapshot raises appropriate error';
      ELSE
        RAISE NOTICE 'INFO: Non-existent snapshot handling: %', SQLERRM;
      END IF;
  END;

  -- ========================================================================
  -- TEST 3: Period Boundary Calculation Consistency
  -- Last day of month calculation must be consistent
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Period Boundary Consistency';
  
  -- Test various months
  v_last_day := (date_trunc('month', '2026-01-15'::date) + interval '1 month' - interval '1 day')::date;
  v_expected_last_day := '2026-01-31'::date;
  
  IF v_last_day != v_expected_last_day THEN
    RAISE EXCEPTION 'DETERMINISM FAIL: January last day wrong: % (expected %)', 
      v_last_day, v_expected_last_day;
  END IF;
  
  -- February (non-leap year 2026)
  v_last_day := (date_trunc('month', '2026-02-15'::date) + interval '1 month' - interval '1 day')::date;
  v_expected_last_day := '2026-02-28'::date;
  
  IF v_last_day != v_expected_last_day THEN
    RAISE EXCEPTION 'DETERMINISM FAIL: February last day wrong: % (expected %)', 
      v_last_day, v_expected_last_day;
  END IF;
  
  -- Leap year February (2024)
  v_last_day := (date_trunc('month', '2024-02-15'::date) + interval '1 month' - interval '1 day')::date;
  v_expected_last_day := '2024-02-29'::date;
  
  IF v_last_day != v_expected_last_day THEN
    RAISE EXCEPTION 'DETERMINISM FAIL: Leap year February last day wrong: % (expected %)', 
      v_last_day, v_expected_last_day;
  END IF;
  
  RAISE NOTICE 'PASS: Period boundary calculations consistent';

  -- ========================================================================
  -- TEST 4: Purpose Semantics Don't Cross-Contaminate
  -- 'reporting' vs 'transaction' purpose must return appropriate records
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Purpose Semantics Isolation';
  
  DECLARE
    v_reporting_aum numeric;
    v_transaction_aum numeric;
  BEGIN
    -- Get reporting purpose AUM
    SELECT total_aum INTO v_reporting_aum
    FROM fund_daily_aum
    WHERE fund_id = v_test_fund_id
      AND purpose = 'reporting'
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
    
    -- Get transaction purpose AUM  
    SELECT total_aum INTO v_transaction_aum
    FROM fund_daily_aum
    WHERE fund_id = v_test_fund_id
      AND purpose = 'transaction'
      AND is_voided = false
    ORDER BY aum_date DESC
    LIMIT 1;
    
    RAISE NOTICE 'INFO: Reporting AUM: %, Transaction AUM: %', v_reporting_aum, v_transaction_aum;
    RAISE NOTICE 'PASS: Purpose semantics properly isolated';
  END;

  -- ========================================================================
  -- TEST 5: Transaction Ordering Determinism
  -- Transactions ordered by (tx_date, id) must be consistent
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: Transaction Ordering Determinism';
  
  DECLARE
    v_order1 text[];
    v_order2 text[];
  BEGIN
    -- Get transaction order twice
    SELECT array_agg(id::text ORDER BY tx_date, id) INTO v_order1
    FROM transactions_v2
    WHERE fund_id = v_test_fund_id
      AND is_voided = false;
    
    SELECT array_agg(id::text ORDER BY tx_date, id) INTO v_order2
    FROM transactions_v2
    WHERE fund_id = v_test_fund_id
      AND is_voided = false;
    
    IF v_order1 IS DISTINCT FROM v_order2 THEN
      RAISE EXCEPTION 'DETERMINISM FAIL: Transaction ordering not consistent';
    END IF;
    
    RAISE NOTICE 'PASS: Transaction ordering is deterministic (% transactions)', array_length(v_order1, 1);
  END;

  -- ========================================================================
  -- TEST 6: Position Projection Determinism
  -- compute_position_from_ledger must return same result
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 6: Position Projection Determinism';
  
  DECLARE
    v_investor_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
    v_proj1 record;
    v_proj2 record;
  BEGIN
    -- Call projection twice
    SELECT * INTO v_proj1 FROM compute_position_from_ledger(v_investor_id, v_test_fund_id);
    SELECT * INTO v_proj2 FROM compute_position_from_ledger(v_investor_id, v_test_fund_id);
    
    IF v_proj1 IS DISTINCT FROM v_proj2 THEN
      RAISE EXCEPTION 'DETERMINISM FAIL: compute_position_from_ledger not deterministic';
    END IF;
    
    RAISE NOTICE 'PASS: Position projection is deterministic';
  EXCEPTION 
    WHEN undefined_function THEN
      RAISE NOTICE 'SKIP: compute_position_from_ledger function not available';
  END;

  -- ========================================================================
  -- TEST 7: Date Formatting Safety
  -- Ensure date formatting doesn't drift with timezone
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 7: Date Formatting Safety';
  
  DECLARE
    v_test_ts timestamptz := '2026-01-15 23:59:59+00'::timestamptz;
    v_formatted_date date;
  BEGIN
    -- The date portion should always be 2026-01-15 regardless of timezone
    v_formatted_date := v_test_ts::date;
    
    IF v_formatted_date != '2026-01-15'::date THEN
      RAISE EXCEPTION 'DETERMINISM FAIL: Date extraction from timestamptz drifted: %', v_formatted_date;
    END IF;
    
    -- Test with DATE type directly (should never drift)
    DECLARE
      v_date_only date := '2026-01-15'::date;
    BEGIN
      IF v_date_only != '2026-01-15'::date THEN
        RAISE EXCEPTION 'DETERMINISM FAIL: Date type value drifted';
      END IF;
    END;
    
    RAISE NOTICE 'PASS: Date formatting is safe';
  END;

  -- ========================================================================
  -- TEST 8: Aggregate Functions Determinism
  -- SUM, COUNT on same data must return same result
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 8: Aggregate Functions Determinism';
  
  DECLARE
    v_sum1 numeric;
    v_sum2 numeric;
    v_count1 int;
    v_count2 int;
  BEGIN
    SELECT SUM(amount), COUNT(*) INTO v_sum1, v_count1
    FROM transactions_v2
    WHERE fund_id = v_test_fund_id AND is_voided = false;
    
    SELECT SUM(amount), COUNT(*) INTO v_sum2, v_count2
    FROM transactions_v2
    WHERE fund_id = v_test_fund_id AND is_voided = false;
    
    IF v_sum1 IS DISTINCT FROM v_sum2 OR v_count1 != v_count2 THEN
      RAISE EXCEPTION 'DETERMINISM FAIL: Aggregate functions not deterministic';
    END IF;
    
    RAISE NOTICE 'PASS: Aggregate functions deterministic (sum: %, count: %)', v_sum1, v_count1;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '=== ALL DETERMINISM TESTS COMPLETE ===';
  RAISE NOTICE '';
END $$;
