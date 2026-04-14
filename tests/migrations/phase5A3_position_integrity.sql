-- Phase 5A-3: Position Integrity Invariant Tests
-- Batch: 5A-3
-- Invariants: Position >= 0 (where required), One position per (investor, fund)

DO $$
DECLARE
  v_test_count INT := 0;
  v_pass_count INT := 0;
  v_fail_count INT := 0;
  v_neg_record RECORD;
  v_dup_record RECORD;
BEGIN
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'PHASE 5A-3: POSITION INTEGRITY INVARIANT TESTS';
  RAISE NOTICE '═══════════════════════════════════════════════════';

  -- TEST 1: No unauthorized negative positions
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: Positions are non-negative (except allowed accounts)';
  v_test_count := v_test_count + 1;

  v_fail_count := 0;
  FOR v_neg_record IN
    SELECT ip.investor_id, ip.fund_id, ip.current_value, f.code AS fund_code
    FROM investor_positions ip
    LEFT JOIN funds f ON ip.fund_id = f.id
    WHERE ip.current_value < 0
      AND (f.fund_class IS NULL OR f.fund_class NOT LIKE '%allow_negative%')
      AND ip.investor_id NOT IN (SELECT id FROM profiles WHERE account_type IN ('ib', 'fees_account'))
  LOOP
    RAISE NOTICE '  ✗ FAIL: Negative position for investor % fund %: %',
      v_neg_record.investor_id, v_neg_record.fund_code, v_neg_record.current_value;
    v_fail_count := v_fail_count + 1;
  END LOOP;

  IF v_fail_count = 0 THEN
    RAISE NOTICE '  ✓ PASS: All positions are non-negative (or allowed)';
    v_pass_count := v_pass_count + 1;
  ELSE
    RAISE NOTICE '  ✗ FAIL: % unauthorized negative positions', v_fail_count;
  END IF;

  -- TEST 2: Exactly one position per (investor, fund)
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Exactly one position per (investor, fund)';
  v_test_count := v_test_count + 1;

  v_fail_count := 0;
  FOR v_dup_record IN
    SELECT investor_id, fund_id, COUNT(*) AS position_count
    FROM investor_positions
    GROUP BY investor_id, fund_id
    HAVING COUNT(*) > 1
  LOOP
    RAISE NOTICE '  ✗ FAIL: Duplicate positions for investor % fund %: %',
      v_dup_record.investor_id, v_dup_record.fund_id, v_dup_record.position_count;
    v_fail_count := v_fail_count + 1;
  END LOOP;

  IF v_fail_count = 0 THEN
    RAISE NOTICE '  ✓ PASS: No duplicate positions';
    v_pass_count := v_pass_count + 1;
  ELSE
    RAISE NOTICE '  ✗ FAIL: % duplicate position sets', v_fail_count;
  END IF;

  -- TEST 3: All positions reference valid funds
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: No orphan fund references';
  v_test_count := v_test_count + 1;

  IF NOT EXISTS (
    SELECT 1 FROM investor_positions ip
    LEFT JOIN funds f ON ip.fund_id = f.id
    WHERE f.id IS NULL
  ) THEN
    RAISE NOTICE '  ✓ PASS: All positions reference valid funds';
    v_pass_count := v_pass_count + 1;
  ELSE
    RAISE NOTICE '  ✗ FAIL: Orphan fund references found';
    v_fail_count := v_fail_count + 1;
  END IF;

  -- TEST 4: All positions reference valid investors
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: No orphan investor references';
  v_test_count := v_test_count + 1;

  IF NOT EXISTS (
    SELECT 1 FROM investor_positions ip
    LEFT JOIN profiles p ON ip.investor_id = p.id
    WHERE p.id IS NULL
  ) THEN
    RAISE NOTICE '  ✓ PASS: All positions reference valid investors';
    v_pass_count := v_pass_count + 1;
  ELSE
    RAISE NOTICE '  ✗ FAIL: Orphan investor references found';
    v_fail_count := v_fail_count + 1;
  END IF;

  -- TEST 5: Position values are numeric-valid
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: Position values are numeric-valid';
  v_test_count := v_test_count + 1;

  IF NOT EXISTS (
    SELECT 1 FROM investor_positions
    WHERE current_value IS NULL 
       OR current_value::text LIKE '%NaN%'
       OR current_value::text LIKE '%Infinity%'
  ) THEN
    RAISE NOTICE '  ✓ PASS: All position values are valid numbers';
    v_pass_count := v_pass_count + 1;
  ELSE
    RAISE NOTICE '  ✗ FAIL: Invalid numeric values found';
    v_fail_count := v_fail_count + 1;
  END IF;

  -- TEST 6: Cost basis integrity
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 6: Cost basis consistency (>= 0 for positions with value)';
  v_test_count := v_test_count + 1;

  IF NOT EXISTS (
    SELECT 1 FROM investor_positions
    WHERE current_value > 0 
      AND cost_basis < 0
      AND investor_id NOT IN (SELECT id FROM profiles WHERE account_type = 'fees_account')
  ) THEN
    RAISE NOTICE '  ✓ PASS: Cost basis is consistent';
    v_pass_count := v_pass_count + 1;
  ELSE
    RAISE NOTICE '  ⚠ WARNING: Some cost basis inconsistencies (review needed)';
  END IF;

  -- SUMMARY
  RAISE NOTICE '';
  RAISE NOTICE '═══════════════════════════════════════════════════════════';
  RAISE NOTICE 'TEST SUMMARY: % tests, % passed, % failed',
    v_test_count, v_pass_count, v_fail_count;
  RAISE NOTICE '═══════════════════════════════════════════════════════════';

  IF v_fail_count > 0 THEN
    RAISE EXCEPTION 'INVARIANT VIOLATION: Position integrity invariant failed';
  ELSE
    RAISE NOTICE 'INVARIANT CHECK: Position integrity verified';
  END IF;
END $$;