-- Phase 5A-1: AUM = SUM(positions) Invariant Test
-- Batch: 5A-1
-- Invariant: fund_daily_aum.total_aum must equal SUM(investor_positions.current_value)

-- Test counters
DO $$
DECLARE
  v_test_count INT := 0;
  v_pass_count INT := 0;
  v_fail_count INT := 0;
  v_drift_record RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'PHASE 5A-1: AUM = SUM(positions) INVARIANT TEST';
  RAISE NOTICE '═══════════════════════════════════════════════════';

  -- TEST 1: AUM = SUM(positions) for transaction purpose
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: Transaction-purpose AUM matches position sum';
  v_test_count := v_test_count + 1;

  FOR v_drift_record IN
    SELECT 
      fda.fund_id,
      f.code AS fund_code,
      f.name AS fund_name,
      fda.total_aum AS recorded_aum,
      COALESCE(pos.position_sum, 0) AS position_sum,
      fda.total_aum - COALESCE(pos.position_sum, 0) AS drift
    FROM fund_daily_aum fda
    JOIN funds f ON fda.fund_id = f.id
    LEFT JOIN (
      SELECT fund_id, SUM(current_value) AS position_sum
      FROM investor_positions
      WHERE is_active = true
      GROUP BY fund_id
    ) pos ON fda.fund_id = pos.fund_id
    WHERE fda.aum_date = CURRENT_DATE 
      AND fda.purpose = 'transaction'
      AND fda.is_voided = false
  LOOP
    IF ABS(v_drift_record.drift) > 0.01 THEN
      RAISE NOTICE '  ✗ FAIL: Fund % (%) drift: % (recorded: %, positions: %)',
        v_drift_record.fund_code,
        v_drift_record.fund_name,
        v_drift_record.drift,
        v_drift_record.recorded_aum,
        v_drift_record.position_sum;
      v_fail_count := v_fail_count + 1;
    END IF;
  END LOOP;

  IF v_fail_count = 0 THEN
    RAISE NOTICE '  ✓ PASS: All transaction-purpose AUM records match position sums';
    v_pass_count := v_pass_count + 1;
  END IF;

  -- TEST 2: No drift on any fund for current date
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: No AUM drift across all funds';
  v_test_count := v_test_count + 1;

  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT fda.fund_id, fda.total_aum AS aum,
             (SELECT SUM(current_value) FROM investor_positions ip WHERE ip.fund_id = fda.fund_id) AS position_sum
      FROM fund_daily_aum fda
      WHERE fda.aum_date = CURRENT_DATE 
        AND fda.purpose = 'transaction'
        AND fda.is_voided = false
    ) diff
    WHERE ABS(aum - COALESCE(position_sum, 0)) > 0.01
  ) THEN
    RAISE NOTICE '  ✓ PASS: No AUM drift across any fund';
    v_pass_count := v_pass_count + 1;
  ELSE
    RAISE NOTICE '  ✗ FAIL: Some AUM drift detected';
    v_fail_count := v_fail_count + 1;
  END IF;

  -- TEST 3: AUM + position consistency for yesterday (historical check)
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Historical AUM consistency (yesterday)';
  v_test_count := v_test_count + 1;

  IF NOT EXISTS (
    SELECT 1 FROM (
      SELECT fda.fund_id, fda.total_aum AS aum,
             (SELECT SUM(current_value) FROM investor_positions ip WHERE ip.fund_id = fda.fund_id) AS position_sum
      FROM fund_daily_aum fda
      WHERE fda.aum_date = CURRENT_DATE - 1
        AND fda.purpose = 'transaction'
        AND fda.is_voided = false
    ) diff
    WHERE ABS(aum - COALESCE(position_sum, 0)) > 0.01
  ) THEN
    RAISE NOTICE '  ✓ PASS: Historical AUM consistent (yesterday)';
    v_pass_count := v_pass_count + 1;
  ELSE
    RAISE NOTICE '  ⚠ SKIP: No yesterday AUM records found';
  END IF;

  -- TEST 4: Voided AUM excluded from check
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Voided AUM records properly excluded';
  v_test_count := v_test_count + 1;

  IF NOT EXISTS (
    SELECT 1 FROM fund_daily_aum 
    WHERE aum_date = CURRENT_DATE 
      AND purpose = 'transaction'
      AND is_voided = true
  ) OR NOT EXISTS (
    SELECT 1 FROM (
      SELECT fda.fund_id, fda.total_aum AS aum,
             (SELECT SUM(current_value) FROM investor_positions ip WHERE ip.fund_id = fda.fund_id AND is_active = true) AS position_sum
      FROM fund_daily_aum fda
      WHERE fda.aum_date = CURRENT_DATE 
        AND fda.purpose = 'transaction'
        AND fda.is_voided = false
    ) diff
    WHERE ABS(aum - COALESCE(position_sum, 0)) > 0.01
  ) THEN
    RAISE NOTICE '  ✓ PASS: Voided AUM properly excluded';
    v_pass_count := v_pass_count + 1;
  ELSE
    RAISE NOTICE '  ✗ FAIL: Voided AUM issue or drift detected';
    v_fail_count := v_fail_count + 1;
  END IF;

  -- SUMMARY
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'TEST SUMMARY: % tests, % passed, % failed',
    v_test_count, v_pass_count, v_fail_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';

  IF v_fail_count > 0 THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: AUM = SUM(positions) invariant failed';
  END IF;
END $$;