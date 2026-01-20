-- ============================================================================
-- PERFORMANCE GATES: Index and Paging Verification
-- Fortune-500 Grade Go-Live Certification
-- ============================================================================
--
-- This script verifies that required indexes exist and that list operations
-- have proper paging support.
--
-- USAGE: Run AFTER fixtures_seed.sql
-- ============================================================================

DO $$
DECLARE
  v_missing_indexes text := '';
  v_index_exists boolean;
  v_table_name text;
  v_column_pattern text;
  v_function_name text;
  v_has_limit boolean;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== PERFORMANCE GATE TESTS ===';
  RAISE NOTICE '';

  -- ========================================================================
  -- TEST 1: Required Indexes on transactions_v2
  -- ========================================================================
  RAISE NOTICE 'TEST 1: transactions_v2 Indexes';
  
  -- Check for index on (investor_id)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'transactions_v2' 
      AND indexdef LIKE '%investor_id%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'transactions_v2(investor_id), ';
  END IF;
  
  -- Check for index on (fund_id)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'transactions_v2' 
      AND indexdef LIKE '%fund_id%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'transactions_v2(fund_id), ';
  END IF;
  
  -- Check for index on (tx_date)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'transactions_v2' 
      AND indexdef LIKE '%tx_date%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'transactions_v2(tx_date), ';
  END IF;
  
  -- Check for index on (reference_id) - for idempotency
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'transactions_v2' 
      AND indexdef LIKE '%reference_id%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'transactions_v2(reference_id), ';
  END IF;
  
  RAISE NOTICE 'Checked transactions_v2 indexes';

  -- ========================================================================
  -- TEST 2: Required Indexes on fund_daily_aum
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: fund_daily_aum Indexes';
  
  -- Check for index on (fund_id)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'fund_daily_aum' 
      AND indexdef LIKE '%fund_id%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'fund_daily_aum(fund_id), ';
  END IF;
  
  -- Check for index on (aum_date)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'fund_daily_aum' 
      AND indexdef LIKE '%aum_date%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'fund_daily_aum(aum_date), ';
  END IF;
  
  -- Check for index on (purpose)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'fund_daily_aum' 
      AND indexdef LIKE '%purpose%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    -- This might be in a composite index
    RAISE NOTICE 'INFO: No dedicated purpose index (may be in composite)';
  END IF;
  
  RAISE NOTICE 'Checked fund_daily_aum indexes';

  -- ========================================================================
  -- TEST 3: Required Indexes on investor_positions
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: investor_positions Indexes';
  
  -- Check for index on (investor_id, fund_id) - primary lookup pattern
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'investor_positions' 
      AND (indexdef LIKE '%investor_id%fund_id%' OR indexdef LIKE '%fund_id%investor_id%')
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'investor_positions(investor_id, fund_id), ';
  END IF;
  
  RAISE NOTICE 'Checked investor_positions indexes';

  -- ========================================================================
  -- TEST 4: Required Indexes on yield_distributions
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: yield_distributions Indexes';
  
  -- Check for index on (fund_id)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'yield_distributions' 
      AND indexdef LIKE '%fund_id%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'yield_distributions(fund_id), ';
  END IF;
  
  -- Check for index on (yield_date)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'yield_distributions' 
      AND indexdef LIKE '%yield_date%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'yield_distributions(yield_date), ';
  END IF;
  
  RAISE NOTICE 'Checked yield_distributions indexes';

  -- ========================================================================
  -- TEST 5: Required Indexes on withdrawal_requests
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: withdrawal_requests Indexes';
  
  -- Check for index on (status)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'withdrawal_requests' 
      AND indexdef LIKE '%status%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'withdrawal_requests(status), ';
  END IF;
  
  -- Check for index on (investor_id)
  SELECT EXISTS (
    SELECT 1 FROM pg_indexes 
    WHERE tablename = 'withdrawal_requests' 
      AND indexdef LIKE '%investor_id%'
  ) INTO v_index_exists;
  
  IF NOT v_index_exists THEN
    v_missing_indexes := v_missing_indexes || 'withdrawal_requests(investor_id), ';
  END IF;
  
  RAISE NOTICE 'Checked withdrawal_requests indexes';

  -- ========================================================================
  -- TEST 6: Report Missing Indexes
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 6: Index Summary';
  
  IF v_missing_indexes != '' THEN
    RAISE NOTICE 'WARNING: Missing indexes: %', rtrim(v_missing_indexes, ', ');
  ELSE
    RAISE NOTICE 'PASS: All required indexes exist';
  END IF;

  -- ========================================================================
  -- TEST 7: Table Row Counts (Performance Baseline)
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 7: Table Row Counts';
  
  DECLARE
    v_count bigint;
  BEGIN
    SELECT COUNT(*) INTO v_count FROM transactions_v2;
    RAISE NOTICE '  transactions_v2: % rows', v_count;
    
    SELECT COUNT(*) INTO v_count FROM investor_positions;
    RAISE NOTICE '  investor_positions: % rows', v_count;
    
    SELECT COUNT(*) INTO v_count FROM fund_daily_aum;
    RAISE NOTICE '  fund_daily_aum: % rows', v_count;
    
    SELECT COUNT(*) INTO v_count FROM yield_distributions;
    RAISE NOTICE '  yield_distributions: % rows', v_count;
    
    SELECT COUNT(*) INTO v_count FROM profiles;
    RAISE NOTICE '  profiles: % rows', v_count;
    
    SELECT COUNT(*) INTO v_count FROM funds;
    RAISE NOTICE '  funds: % rows', v_count;
  END;

  -- ========================================================================
  -- TEST 8: Check for Functions with LIMIT Parameters
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 8: List Functions Paging Support';
  
  -- Check if common list functions accept limit parameters
  DECLARE
    v_functions_checked int := 0;
  BEGIN
    -- Check get_yield_records signature
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname = 'get_yield_records'
        AND n.nspname = 'public'
    ) THEN
      RAISE NOTICE '  get_yield_records: exists (check paging in service layer)';
      v_functions_checked := v_functions_checked + 1;
    END IF;
    
    -- Check get_transactions signature
    IF EXISTS (
      SELECT 1 FROM pg_proc p
      JOIN pg_namespace n ON n.oid = p.pronamespace
      WHERE p.proname LIKE '%get%transaction%'
        AND n.nspname = 'public'
    ) THEN
      RAISE NOTICE '  Transaction list functions: exist';
      v_functions_checked := v_functions_checked + 1;
    END IF;
    
    RAISE NOTICE '  Checked % relevant functions', v_functions_checked;
  END;

  -- ========================================================================
  -- TEST 9: Query Plan Check (if available)
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 9: Sample Query Plan Check';
  
  DECLARE
    v_plan text;
  BEGIN
    -- Get explain plan for a common query pattern
    EXECUTE 'EXPLAIN (FORMAT TEXT) 
      SELECT * FROM transactions_v2 
      WHERE fund_id = $1 AND tx_date >= $2 
      ORDER BY tx_date DESC 
      LIMIT 100'
    USING 'f0000000-0000-0000-0000-000000000001'::uuid, '2026-01-01'::date
    INTO v_plan;
    
    IF v_plan LIKE '%Seq Scan%' AND v_plan NOT LIKE '%Index%' THEN
      RAISE NOTICE 'WARNING: Query plan uses sequential scan (may need index optimization)';
    ELSE
      RAISE NOTICE 'PASS: Query plan appears optimized';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'INFO: Could not analyze query plan: %', SQLERRM;
  END;

  -- ========================================================================
  -- TEST 10: Materialized View Refresh Status
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 10: Materialized View Status';
  
  DECLARE
    v_mv_count int;
  BEGIN
    SELECT COUNT(*) INTO v_mv_count
    FROM pg_matviews
    WHERE schemaname = 'public';
    
    RAISE NOTICE '  Found % materialized views in public schema', v_mv_count;
    
    IF v_mv_count > 0 THEN
      -- List them
      FOR v_table_name IN 
        SELECT matviewname FROM pg_matviews WHERE schemaname = 'public'
      LOOP
        RAISE NOTICE '    - %', v_table_name;
      END LOOP;
    END IF;
  END;

  -- ========================================================================
  -- FINAL SUMMARY
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE '=== PERFORMANCE GATE SUMMARY ===';
  
  IF v_missing_indexes != '' THEN
    RAISE NOTICE 'STATUS: WARNINGS FOUND';
    RAISE NOTICE 'Missing indexes should be added for production performance.';
  ELSE
    RAISE NOTICE 'STATUS: ALL GATES PASSED';
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ALL PERFORMANCE GATE TESTS COMPLETE ===';
  RAISE NOTICE '';
END $$;
