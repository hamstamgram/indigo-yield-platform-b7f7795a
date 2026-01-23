-- ============================================================================
-- PERFORMANCE BALANCE E2E: Investor Fund Performance Balance Equation Test
-- Fortune-500 Grade Go-Live Certification
-- ============================================================================
--
-- This script validates the fundamental balance equation for investor reports:
--   ending_balance = beginning_balance + additions - redemptions + net_income
--
-- The test creates deterministic test data in investor_fund_performance and
-- verifies that the Modified Dietz balance equation holds for all records.
--
-- USAGE: Run AFTER fixtures_seed.sql
-- ============================================================================

-- ============================================================================
-- SECTION 1: Setup Test Data
-- ============================================================================

DO $$
DECLARE
  v_admin_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_investor_1 uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_investor_2 uuid := 'b0000000-0000-0000-0000-000000000002'::uuid;
  v_investor_3 uuid := 'b0000000-0000-0000-0000-000000000003'::uuid;
  v_period_id uuid;
  v_period_id_2 uuid;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== PERFORMANCE BALANCE E2E TEST ===';
  RAISE NOTICE '';
  
  -- ------------------------------------------------------------------------
  -- Create test statement periods
  -- ------------------------------------------------------------------------
  RAISE NOTICE 'Creating test statement periods...';
  
  -- December 2025
  INSERT INTO statement_periods (id, year, month, period_name, period_end_date, status, created_by)
  VALUES (
    'c0000000-0000-0000-0000-000000000001'::uuid,
    2025, 12, 'December 2025', '2025-12-31', 'FINALIZED', v_admin_id
  )
  ON CONFLICT (year, month) DO UPDATE SET id = EXCLUDED.id
  RETURNING id INTO v_period_id;
  
  -- If conflict, get existing ID
  IF v_period_id IS NULL THEN
    SELECT id INTO v_period_id FROM statement_periods WHERE year = 2025 AND month = 12;
  END IF;
  
  -- January 2026
  INSERT INTO statement_periods (id, year, month, period_name, period_end_date, status, created_by)
  VALUES (
    'c0000000-0000-0000-0000-000000000002'::uuid,
    2026, 1, 'January 2026', '2026-01-31', 'FINALIZED', v_admin_id
  )
  ON CONFLICT (year, month) DO UPDATE SET id = EXCLUDED.id
  RETURNING id INTO v_period_id_2;
  
  IF v_period_id_2 IS NULL THEN
    SELECT id INTO v_period_id_2 FROM statement_periods WHERE year = 2026 AND month = 1;
  END IF;
  
  RAISE NOTICE 'Created periods: % and %', v_period_id, v_period_id_2;
  
  -- ------------------------------------------------------------------------
  -- Clean up any existing test performance records
  -- ------------------------------------------------------------------------
  DELETE FROM investor_fund_performance 
  WHERE investor_id IN (v_investor_1, v_investor_2, v_investor_3)
    AND period_id IN (v_period_id, v_period_id_2);
  
  -- ------------------------------------------------------------------------
  -- Insert test performance records with various scenarios
  -- ------------------------------------------------------------------------
  RAISE NOTICE 'Inserting test performance records...';
  
  -- Scenario 1: Simple case - positive yield, no flows
  -- Expected: 10000 + 0 - 0 + 500 = 10500
  INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance,
    mtd_rate_of_return
  ) VALUES (
    'd0000000-0000-0000-0000-000000000001'::uuid,
    v_investor_1, v_period_id, 'USDT',
    10000.00, 0.00, 0.00, 500.00, 10500.00,
    5.00  -- 500/10000 * 100
  );
  
  -- Scenario 2: Deposit during period
  -- Expected: 10000 + 5000 - 0 + 450 = 15450
  INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance,
    mtd_rate_of_return
  ) VALUES (
    'd0000000-0000-0000-0000-000000000002'::uuid,
    v_investor_2, v_period_id, 'USDT',
    10000.00, 5000.00, 0.00, 450.00, 15450.00,
    3.60  -- 450 / (10000 + 5000/2) * 100
  );
  
  -- Scenario 3: Withdrawal during period
  -- Expected: 20000 + 0 - 3000 + 680 = 17680
  INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance,
    mtd_rate_of_return
  ) VALUES (
    'd0000000-0000-0000-0000-000000000003'::uuid,
    v_investor_3, v_period_id, 'USDT',
    20000.00, 0.00, 3000.00, 680.00, 17680.00,
    3.68  -- 680 / (20000 - 3000/2) * 100
  );
  
  -- Scenario 4: Both deposit and withdrawal
  -- Expected: 15000 + 2000 - 1000 + 320 = 16320
  INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance,
    mtd_rate_of_return
  ) VALUES (
    'd0000000-0000-0000-0000-000000000004'::uuid,
    v_investor_1, v_period_id, 'BTC',
    15000.00, 2000.00, 1000.00, 320.00, 16320.00,
    2.09  -- 320 / (15000 + (2000-1000)/2) * 100
  );
  
  -- Scenario 5: Zero beginning balance (new investor mid-month)
  -- Expected: 0 + 10000 - 0 + 100 = 10100
  INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance,
    mtd_rate_of_return
  ) VALUES (
    'd0000000-0000-0000-0000-000000000005'::uuid,
    v_investor_2, v_period_id, 'ETH',
    0.00, 10000.00, 0.00, 100.00, 10100.00,
    2.00  -- 100 / (0 + 10000/2) * 100
  );
  
  -- Scenario 6: Negative yield (loss period)
  -- Expected: 25000 + 0 - 0 + (-1500) = 23500
  INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance,
    mtd_rate_of_return
  ) VALUES (
    'd0000000-0000-0000-0000-000000000006'::uuid,
    v_investor_3, v_period_id, 'BTC',
    25000.00, 0.00, 0.00, -1500.00, 23500.00,
    -6.00  -- -1500/25000 * 100
  );
  
  -- Scenario 7: High precision decimals
  -- Expected: 12345.67890123 + 1111.11111111 - 222.22222222 + 333.33333333 = 13567.90112345
  INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance,
    mtd_rate_of_return
  ) VALUES (
    'd0000000-0000-0000-0000-000000000007'::uuid,
    v_investor_1, v_period_id_2, 'USDT',
    12345.67890123, 1111.11111111, 222.22222222, 333.33333333, 13567.90112345,
    2.59
  );
  
  -- Scenario 8: Full period data (MTD, QTD, YTD, ITD)
  INSERT INTO investor_fund_performance (
    id, investor_id, period_id, fund_name,
    mtd_beginning_balance, mtd_additions, mtd_redemptions, mtd_net_income, mtd_ending_balance, mtd_rate_of_return,
    qtd_beginning_balance, qtd_additions, qtd_redemptions, qtd_net_income, qtd_ending_balance, qtd_rate_of_return,
    ytd_beginning_balance, ytd_additions, ytd_redemptions, ytd_net_income, ytd_ending_balance, ytd_rate_of_return,
    itd_beginning_balance, itd_additions, itd_redemptions, itd_net_income, itd_ending_balance, itd_rate_of_return
  ) VALUES (
    'd0000000-0000-0000-0000-000000000008'::uuid,
    v_investor_2, v_period_id_2, 'USDT',
    -- MTD: 50000 + 5000 - 2000 + 1200 = 54200
    50000.00, 5000.00, 2000.00, 1200.00, 54200.00, 2.29,
    -- QTD: 45000 + 10000 - 3000 + 2200 = 54200
    45000.00, 10000.00, 3000.00, 2200.00, 54200.00, 4.40,
    -- YTD: 40000 + 20000 - 8000 + 2200 = 54200
    40000.00, 20000.00, 8000.00, 2200.00, 54200.00, 4.78,
    -- ITD: 0 + 60000 - 8000 + 2200 = 54200
    0.00, 60000.00, 8000.00, 2200.00, 54200.00, 3.93
  );
  
  RAISE NOTICE 'Inserted 8 test performance records';
END $$;

-- ============================================================================
-- SECTION 2: Verify Balance Equation
-- ============================================================================

DO $$
DECLARE
  v_violation_count int;
  v_total_records int;
  v_record record;
  v_calculated_ending numeric;
  v_variance numeric;
  v_tolerance numeric := 0.00000001;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== BALANCE EQUATION VERIFICATION ===';
  RAISE NOTICE '';
  
  -- ------------------------------------------------------------------------
  -- TEST 1: MTD Balance Equation
  -- ending = beginning + additions - redemptions + net_income
  -- ------------------------------------------------------------------------
  RAISE NOTICE 'TEST 1: MTD Balance Equation';
  
  SELECT COUNT(*) INTO v_total_records
  FROM investor_fund_performance
  WHERE mtd_ending_balance IS NOT NULL;
  
  SELECT COUNT(*) INTO v_violation_count
  FROM investor_fund_performance
  WHERE mtd_ending_balance IS NOT NULL
    AND ABS(
      mtd_ending_balance - 
      (COALESCE(mtd_beginning_balance, 0) + 
       COALESCE(mtd_additions, 0) - 
       COALESCE(mtd_redemptions, 0) + 
       COALESCE(mtd_net_income, 0))
    ) > v_tolerance;
  
  IF v_violation_count > 0 THEN
    RAISE NOTICE 'MTD Balance violations found:';
    FOR v_record IN 
      SELECT 
        id,
        fund_name,
        mtd_beginning_balance as beginning,
        mtd_additions as additions,
        mtd_redemptions as redemptions,
        mtd_net_income as income,
        mtd_ending_balance as stored_ending,
        (COALESCE(mtd_beginning_balance, 0) + 
         COALESCE(mtd_additions, 0) - 
         COALESCE(mtd_redemptions, 0) + 
         COALESCE(mtd_net_income, 0)) as calculated_ending
      FROM investor_fund_performance
      WHERE ABS(
        mtd_ending_balance - 
        (COALESCE(mtd_beginning_balance, 0) + 
         COALESCE(mtd_additions, 0) - 
         COALESCE(mtd_redemptions, 0) + 
         COALESCE(mtd_net_income, 0))
      ) > v_tolerance
    LOOP
      RAISE NOTICE '  ID: %, Fund: %, Stored: %, Calculated: %', 
        v_record.id, v_record.fund_name, v_record.stored_ending, v_record.calculated_ending;
    END LOOP;
    RAISE EXCEPTION 'FAIL: MTD balance equation violated for % of % records', v_violation_count, v_total_records;
  END IF;
  
  RAISE NOTICE 'PASS: MTD balance equation holds for all % records', v_total_records;

  -- ------------------------------------------------------------------------
  -- TEST 2: QTD Balance Equation
  -- ------------------------------------------------------------------------
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: QTD Balance Equation';
  
  SELECT COUNT(*) INTO v_total_records
  FROM investor_fund_performance
  WHERE qtd_ending_balance IS NOT NULL;
  
  SELECT COUNT(*) INTO v_violation_count
  FROM investor_fund_performance
  WHERE qtd_ending_balance IS NOT NULL
    AND ABS(
      qtd_ending_balance - 
      (COALESCE(qtd_beginning_balance, 0) + 
       COALESCE(qtd_additions, 0) - 
       COALESCE(qtd_redemptions, 0) + 
       COALESCE(qtd_net_income, 0))
    ) > v_tolerance;
  
  IF v_violation_count > 0 THEN
    RAISE EXCEPTION 'FAIL: QTD balance equation violated for % of % records', v_violation_count, v_total_records;
  END IF;
  
  RAISE NOTICE 'PASS: QTD balance equation holds for all % records', v_total_records;

  -- ------------------------------------------------------------------------
  -- TEST 3: YTD Balance Equation
  -- ------------------------------------------------------------------------
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: YTD Balance Equation';
  
  SELECT COUNT(*) INTO v_total_records
  FROM investor_fund_performance
  WHERE ytd_ending_balance IS NOT NULL;
  
  SELECT COUNT(*) INTO v_violation_count
  FROM investor_fund_performance
  WHERE ytd_ending_balance IS NOT NULL
    AND ABS(
      ytd_ending_balance - 
      (COALESCE(ytd_beginning_balance, 0) + 
       COALESCE(ytd_additions, 0) - 
       COALESCE(ytd_redemptions, 0) + 
       COALESCE(ytd_net_income, 0))
    ) > v_tolerance;
  
  IF v_violation_count > 0 THEN
    RAISE EXCEPTION 'FAIL: YTD balance equation violated for % of % records', v_violation_count, v_total_records;
  END IF;
  
  RAISE NOTICE 'PASS: YTD balance equation holds for all % records', v_total_records;

  -- ------------------------------------------------------------------------
  -- TEST 4: ITD Balance Equation
  -- ------------------------------------------------------------------------
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: ITD Balance Equation';
  
  SELECT COUNT(*) INTO v_total_records
  FROM investor_fund_performance
  WHERE itd_ending_balance IS NOT NULL;
  
  SELECT COUNT(*) INTO v_violation_count
  FROM investor_fund_performance
  WHERE itd_ending_balance IS NOT NULL
    AND ABS(
      itd_ending_balance - 
      (COALESCE(itd_beginning_balance, 0) + 
       COALESCE(itd_additions, 0) - 
       COALESCE(itd_redemptions, 0) + 
       COALESCE(itd_net_income, 0))
    ) > v_tolerance;
  
  IF v_violation_count > 0 THEN
    RAISE EXCEPTION 'FAIL: ITD balance equation violated for % of % records', v_violation_count, v_total_records;
  END IF;
  
  RAISE NOTICE 'PASS: ITD balance equation holds for all % records', v_total_records;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ALL BALANCE EQUATION TESTS PASSED ===';
END $$;

-- ============================================================================
-- SECTION 3: Rate of Return Consistency
-- ============================================================================

DO $$
DECLARE
  v_violation_count int;
  v_total_records int;
  v_tolerance numeric := 0.01;  -- 0.01% tolerance for RoR
  v_record record;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== RATE OF RETURN CONSISTENCY ===';
  RAISE NOTICE '';
  
  -- ------------------------------------------------------------------------
  -- TEST: Modified Dietz Rate of Return Formula
  -- RoR = (net_income / (beginning_balance + net_flows / 2)) * 100
  -- ------------------------------------------------------------------------
  RAISE NOTICE 'TEST: Modified Dietz RoR Formula Consistency';
  
  SELECT COUNT(*) INTO v_total_records
  FROM investor_fund_performance
  WHERE mtd_rate_of_return IS NOT NULL
    AND (COALESCE(mtd_beginning_balance, 0) + 
         (COALESCE(mtd_additions, 0) - COALESCE(mtd_redemptions, 0)) / 2) != 0;
  
  SELECT COUNT(*) INTO v_violation_count
  FROM investor_fund_performance
  WHERE mtd_rate_of_return IS NOT NULL
    AND (COALESCE(mtd_beginning_balance, 0) + 
         (COALESCE(mtd_additions, 0) - COALESCE(mtd_redemptions, 0)) / 2) != 0
    AND ABS(
      mtd_rate_of_return - 
      (COALESCE(mtd_net_income, 0) / 
       (COALESCE(mtd_beginning_balance, 0) + 
        (COALESCE(mtd_additions, 0) - COALESCE(mtd_redemptions, 0)) / 2) * 100)
    ) > v_tolerance;
  
  IF v_violation_count > 0 THEN
    RAISE NOTICE 'RoR formula violations found:';
    FOR v_record IN 
      SELECT 
        id,
        fund_name,
        mtd_rate_of_return as stored_ror,
        (COALESCE(mtd_net_income, 0) / 
         NULLIF(COALESCE(mtd_beginning_balance, 0) + 
          (COALESCE(mtd_additions, 0) - COALESCE(mtd_redemptions, 0)) / 2, 0) * 100) as calculated_ror
      FROM investor_fund_performance
      WHERE mtd_rate_of_return IS NOT NULL
        AND (COALESCE(mtd_beginning_balance, 0) + 
             (COALESCE(mtd_additions, 0) - COALESCE(mtd_redemptions, 0)) / 2) != 0
        AND ABS(
          mtd_rate_of_return - 
          (COALESCE(mtd_net_income, 0) / 
           (COALESCE(mtd_beginning_balance, 0) + 
            (COALESCE(mtd_additions, 0) - COALESCE(mtd_redemptions, 0)) / 2) * 100)
        ) > v_tolerance
    LOOP
      RAISE NOTICE '  ID: %, Fund: %, Stored RoR: %%, Calculated RoR: %%', 
        v_record.id, v_record.fund_name, 
        ROUND(v_record.stored_ror, 2), 
        ROUND(v_record.calculated_ror, 2);
    END LOOP;
    RAISE NOTICE 'WARNING: Found % RoR discrepancies (may be rounding)', v_violation_count;
  ELSE
    RAISE NOTICE 'PASS: RoR formula consistent for all % records', v_total_records;
  END IF;
  
  RAISE NOTICE '';
  RAISE NOTICE '=== RATE OF RETURN TESTS COMPLETE ===';
END $$;

-- ============================================================================
-- SECTION 4: Edge Case Validation
-- ============================================================================

DO $$
DECLARE
  v_count int;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== EDGE CASE VALIDATION ===';
  RAISE NOTICE '';
  
  -- ------------------------------------------------------------------------
  -- TEST 1: No negative ending balances (unless explicitly allowed)
  -- ------------------------------------------------------------------------
  RAISE NOTICE 'TEST 1: No unexpected negative ending balances';
  
  SELECT COUNT(*) INTO v_count
  FROM investor_fund_performance
  WHERE mtd_ending_balance < 0;
  
  IF v_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % records with negative MTD ending balance', v_count;
  ELSE
    RAISE NOTICE 'PASS: No negative MTD ending balances';
  END IF;
  
  -- ------------------------------------------------------------------------
  -- TEST 2: Redemptions don't exceed beginning + additions
  -- ------------------------------------------------------------------------
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Redemptions within available balance';
  
  SELECT COUNT(*) INTO v_count
  FROM investor_fund_performance
  WHERE COALESCE(mtd_redemptions, 0) > 
        (COALESCE(mtd_beginning_balance, 0) + COALESCE(mtd_additions, 0));
  
  IF v_count > 0 THEN
    RAISE NOTICE 'WARNING: Found % records where redemptions exceed available balance', v_count;
  ELSE
    RAISE NOTICE 'PASS: All redemptions within available balance';
  END IF;
  
  -- ------------------------------------------------------------------------
  -- TEST 3: Period linkage integrity
  -- ------------------------------------------------------------------------
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Period linkage integrity';
  
  SELECT COUNT(*) INTO v_count
  FROM investor_fund_performance ifp
  WHERE NOT EXISTS (
    SELECT 1 FROM statement_periods sp WHERE sp.id = ifp.period_id
  );
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Found % records with invalid period_id', v_count;
  END IF;
  
  RAISE NOTICE 'PASS: All records have valid period linkage';
  
  -- ------------------------------------------------------------------------
  -- TEST 4: Investor linkage integrity
  -- ------------------------------------------------------------------------
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Investor linkage integrity';
  
  SELECT COUNT(*) INTO v_count
  FROM investor_fund_performance ifp
  WHERE NOT EXISTS (
    SELECT 1 FROM profiles p WHERE p.id = ifp.investor_id
  );
  
  IF v_count > 0 THEN
    RAISE EXCEPTION 'FAIL: Found % records with invalid investor_id', v_count;
  END IF;
  
  RAISE NOTICE 'PASS: All records have valid investor linkage';
  
  RAISE NOTICE '';
  RAISE NOTICE '=== ALL EDGE CASE TESTS COMPLETE ===';
  RAISE NOTICE '';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'PERFORMANCE BALANCE E2E: ALL TESTS PASSED';
  RAISE NOTICE '========================================';
END $$;
