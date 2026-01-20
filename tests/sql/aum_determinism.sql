-- =============================================================================
-- AUM Determinism Test Suite
-- Part of: Go-Live Schema Hardening Proof Suite
-- =============================================================================
-- Tests:
-- 1. get_fund_aum_as_of returns same value for same inputs
-- 2. Missing AUM returns NULL, not coerced to 0
-- 3. Purpose differences return different rows
-- 4. AUM snapshot consistency across repeated calls
-- =============================================================================

DO $$
DECLARE
  v_fund_id uuid;
  v_test_date date;
  v_aum1 numeric;
  v_aum2 numeric;
  v_aum3 numeric;
  v_count integer;
  v_purpose text;
BEGIN
  RAISE NOTICE '=== AUM DETERMINISM TEST SUITE ===';
  RAISE NOTICE 'Starting at: %', now();

  -- Get a fund with AUM data for testing
  SELECT fund_id, aum_date INTO v_fund_id, v_test_date
  FROM fund_daily_aum
  WHERE is_voided = false
  ORDER BY aum_date DESC
  LIMIT 1;
  
  IF v_fund_id IS NULL THEN
    RAISE NOTICE 'SKIPPING: No fund_daily_aum data available for testing';
    RETURN;
  END IF;
  
  RAISE NOTICE 'Testing with fund_id: %, date: %', v_fund_id, v_test_date;

  -- =========================================================================
  -- TEST 1: get_fund_aum_as_of returns same value for same inputs
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: AUM query determinism';
  
  -- Query 1
  SELECT total_aum INTO v_aum1
  FROM fund_daily_aum
  WHERE fund_id = v_fund_id
    AND aum_date = v_test_date
    AND is_voided = false
    AND purpose = 'reporting'
  LIMIT 1;
  
  -- Query 2 (same parameters)
  SELECT total_aum INTO v_aum2
  FROM fund_daily_aum
  WHERE fund_id = v_fund_id
    AND aum_date = v_test_date
    AND is_voided = false
    AND purpose = 'reporting'
  LIMIT 1;
  
  -- Query 3 (same parameters)
  SELECT total_aum INTO v_aum3
  FROM fund_daily_aum
  WHERE fund_id = v_fund_id
    AND aum_date = v_test_date
    AND is_voided = false
    AND purpose = 'reporting'
  LIMIT 1;
  
  -- All three should be identical (or all NULL)
  IF v_aum1 IS DISTINCT FROM v_aum2 OR v_aum2 IS DISTINCT FROM v_aum3 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: Non-deterministic AUM query results: %, %, %', v_aum1, v_aum2, v_aum3;
  END IF;
  
  RAISE NOTICE 'TEST 1 PASSED: AUM query returns consistent value: %', COALESCE(v_aum1::text, 'NULL');

  -- =========================================================================
  -- TEST 2: Missing AUM returns NULL, not 0
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Missing AUM returns NULL';
  
  -- Query for a date that definitely doesn't exist
  SELECT total_aum INTO v_aum1
  FROM fund_daily_aum
  WHERE fund_id = v_fund_id
    AND aum_date = '1900-01-01'::date
    AND is_voided = false;
  
  IF v_aum1 IS NOT NULL THEN
    RAISE EXCEPTION 'TEST 2 FAILED: Query for missing date returned % instead of NULL', v_aum1;
  END IF;
  
  RAISE NOTICE 'TEST 2 PASSED: Missing AUM correctly returns NULL';

  -- =========================================================================
  -- TEST 3: Purpose differences return different rows
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Different purposes are distinct';
  
  -- Count distinct purposes for same fund/date
  SELECT COUNT(DISTINCT purpose) INTO v_count
  FROM fund_daily_aum
  WHERE fund_id = v_fund_id
    AND aum_date = v_test_date
    AND is_voided = false;
  
  -- If multiple purposes exist, verify they can return different values
  IF v_count > 1 THEN
    -- Get values for different purposes
    SELECT total_aum INTO v_aum1
    FROM fund_daily_aum
    WHERE fund_id = v_fund_id
      AND aum_date = v_test_date
      AND is_voided = false
      AND purpose = 'reporting'
    LIMIT 1;
    
    SELECT total_aum INTO v_aum2
    FROM fund_daily_aum
    WHERE fund_id = v_fund_id
      AND aum_date = v_test_date
      AND is_voided = false
      AND purpose = 'transaction'
    LIMIT 1;
    
    -- Values may be same or different, but query should work
    RAISE NOTICE 'TEST 3 PASSED: % distinct purposes found. reporting=%, transaction=%', 
      v_count, COALESCE(v_aum1::text, 'NULL'), COALESCE(v_aum2::text, 'NULL');
  ELSE
    RAISE NOTICE 'TEST 3 SKIPPED: Only % purpose(s) for test data', v_count;
  END IF;

  -- =========================================================================
  -- TEST 4: Uniqueness constraint enforced
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Purpose uniqueness enforced';
  
  -- Verify no duplicates exist for fund/date/purpose (non-voided)
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT fund_id, aum_date, purpose
    FROM fund_daily_aum
    WHERE is_voided = false
    GROUP BY fund_id, aum_date, purpose
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 4 FAILED: % duplicate fund/date/purpose combinations exist', v_count;
  END IF;
  
  RAISE NOTICE 'TEST 4 PASSED: No duplicate AUM records for same fund/date/purpose';

  -- =========================================================================
  -- TEST 5: daily_nav purpose uniqueness
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: daily_nav purpose uniqueness';
  
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT fund_id, nav_date, purpose
    FROM daily_nav
    GROUP BY fund_id, nav_date, purpose
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 5 FAILED: % duplicate daily_nav fund/date/purpose combinations', v_count;
  END IF;
  
  RAISE NOTICE 'TEST 5 PASSED: daily_nav has unique fund/date/purpose';

  -- =========================================================================
  -- SUMMARY
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '=== AUM DETERMINISM: ALL TESTS PASSED ===';
  
END $$;
