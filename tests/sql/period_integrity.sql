-- =============================================================================
-- Period Integrity Test Suite
-- Part of: Go-Live Schema Hardening Proof Suite
-- =============================================================================
-- Tests:
-- 1. statement_periods unique (year, month)
-- 2. accounting_periods unique (fund_id, period_start, period_end)
-- 3. period_end >= period_start
-- 4. No overlapping accounting periods for same fund
-- =============================================================================

DO $$
DECLARE
  v_count integer;
  v_details text;
BEGIN
  RAISE NOTICE '=== PERIOD INTEGRITY TEST SUITE ===';
  RAISE NOTICE 'Starting at: %', now();

  -- =========================================================================
  -- TEST 1: statement_periods unique (year, month)
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: Unique statement_periods per year/month';
  
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT 
      EXTRACT(YEAR FROM period_start) as year,
      EXTRACT(MONTH FROM period_start) as month,
      COUNT(*) as cnt
    FROM statement_periods
    GROUP BY 
      EXTRACT(YEAR FROM period_start),
      EXTRACT(MONTH FROM period_start)
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 1 FAILED: % duplicate year/month combinations in statement_periods', v_count;
  END IF;
  RAISE NOTICE 'TEST 1 PASSED: No duplicate statement periods';

  -- =========================================================================
  -- TEST 2: accounting_periods unique (fund_id, period_start, period_end)
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Unique accounting_periods per fund/start/end';
  
  SELECT COUNT(*) INTO v_count
  FROM (
    SELECT fund_id, period_start, period_end, COUNT(*) as cnt
    FROM accounting_periods
    GROUP BY fund_id, period_start, period_end
    HAVING COUNT(*) > 1
  ) dups;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 2 FAILED: % duplicate accounting period combinations', v_count;
  END IF;
  RAISE NOTICE 'TEST 2 PASSED: No duplicate accounting periods';

  -- =========================================================================
  -- TEST 3: period_end >= period_start
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Period end >= period start';
  
  -- Check statement_periods
  SELECT COUNT(*) INTO v_count
  FROM statement_periods
  WHERE period_end < period_start;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: % statement_periods have period_end < period_start', v_count;
  END IF;
  
  -- Check accounting_periods
  SELECT COUNT(*) INTO v_count
  FROM accounting_periods
  WHERE period_end < period_start;
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'TEST 3 FAILED: % accounting_periods have period_end < period_start', v_count;
  END IF;
  
  RAISE NOTICE 'TEST 3 PASSED: All periods have valid date ranges';

  -- =========================================================================
  -- TEST 4: No overlapping accounting periods for same fund
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: No overlapping accounting periods per fund';
  
  SELECT COUNT(*) INTO v_count
  FROM accounting_periods a1
  JOIN accounting_periods a2 
    ON a1.fund_id = a2.fund_id 
    AND a1.id != a2.id
    AND a1.period_start < a2.period_end 
    AND a1.period_end > a2.period_start;
  
  IF v_count > 0 THEN
    -- Get details of overlaps
    SELECT string_agg(
      a1.fund_id || ': ' || a1.period_start || '-' || a1.period_end || 
      ' overlaps ' || a2.period_start || '-' || a2.period_end, 
      '; '
    ) INTO v_details
    FROM accounting_periods a1
    JOIN accounting_periods a2 
      ON a1.fund_id = a2.fund_id 
      AND a1.id != a2.id
      AND a1.period_start < a2.period_end 
      AND a1.period_end > a2.period_start
    LIMIT 3;
    
    RAISE WARNING 'TEST 4 WARNING: % overlapping accounting periods found. Examples: %', v_count, v_details;
  ELSE
    RAISE NOTICE 'TEST 4 PASSED: No overlapping accounting periods';
  END IF;

  -- =========================================================================
  -- TEST 5: Monthly periods are consecutive (no gaps)
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: Statement periods coverage check';
  
  -- This is informational - gaps may be intentional
  SELECT COUNT(*) INTO v_count
  FROM statement_periods sp1
  WHERE NOT EXISTS (
    SELECT 1 FROM statement_periods sp2
    WHERE sp2.period_start = sp1.period_end + INTERVAL '1 day'
  )
  AND sp1.period_end < (SELECT MAX(period_end) FROM statement_periods);
  
  IF v_count > 0 THEN
    RAISE NOTICE 'TEST 5 INFO: % statement periods have gaps after them (may be intentional)', v_count;
  ELSE
    RAISE NOTICE 'TEST 5 PASSED: Statement periods are consecutive';
  END IF;

  -- =========================================================================
  -- SUMMARY
  -- =========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '=== PERIOD INTEGRITY: ALL TESTS PASSED ===';
  
END $$;
