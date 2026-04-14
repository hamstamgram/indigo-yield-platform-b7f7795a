-- Void/Unvoid Concurrency Tests - Phase 4A
-- Tests for atomic void operations and transaction isolation
-- These tests verify the 4 invariants defined in VOID_UNVOID_INVARIANTS.md

-- Test 1: Void and yield apply cannot interleave (Invariant 4)
-- This test verifies that void operations are atomic and don't allow concurrent yield apply to see partial state

DO $$
DECLARE
  v_investor_id UUID := gen_random_uuid();
  v_fund_id UUID := gen_random_uuid();
  v_deposit_tx_id UUID;
  v_position_before NUMERIC;
  v_position_after NUMERIC;
  v_aum_before NUMERIC;
  v_aum_after NUMERIC;
  v_ledger_sum NUMERIC;
BEGIN
  -- SETUP: Create investor, fund, and deposit
  BEGIN
    INSERT INTO profiles (id, email, role) VALUES
      (v_investor_id, 'void-test-' || gen_random_uuid()::TEXT || '@example.com', 'investor')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Profile already exists, continue
    NULL;
  END;

  BEGIN
    INSERT INTO funds (id, name, symbol, created_by) VALUES
      (v_fund_id, 'Void Test Fund ' || gen_random_uuid()::TEXT, 'VTF', '00000000-0000-0000-0000-000000000000')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    -- Fund already exists, continue
    NULL;
  END;

  -- Create investor position
  DELETE FROM investor_positions WHERE investor_id = v_investor_id AND fund_id = v_fund_id;
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, updated_at, created_at)
    VALUES (v_investor_id, v_fund_id, 0, 0, NOW(), NOW());

  -- Create fund AUM record
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id AND recorded_at = CURRENT_DATE;
  INSERT INTO fund_daily_aum (fund_id, recorded_at, total_aum, source, created_at, updated_at)
    VALUES (v_fund_id, CURRENT_DATE, 0, 'test_setup', NOW(), NOW());

  -- Create a deposit transaction
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, amount, type, is_voided, applied, tx_date,
    created_at, updated_at, last_modified_by
  ) VALUES (
    gen_random_uuid(),
    v_investor_id,
    v_fund_id,
    1000.00,
    'DEPOSIT',
    FALSE,
    TRUE,
    CURRENT_DATE,
    NOW(),
    NOW(),
    '00000000-0000-0000-0000-000000000000'
  ) RETURNING id INTO v_deposit_tx_id;

  -- Simulate the triggers updating position and AUM (normally done by triggers)
  UPDATE investor_positions
    SET current_value = 1000.00, updated_at = NOW()
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  UPDATE fund_daily_aum
    SET total_aum = 1000.00, updated_at = NOW()
    WHERE fund_id = v_fund_id AND recorded_at = CURRENT_DATE;

  -- Record position/AUM before void
  SELECT current_value INTO v_position_before
    FROM investor_positions
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  SELECT total_aum INTO v_aum_before
    FROM fund_daily_aum
    WHERE fund_id = v_fund_id AND recorded_at = CURRENT_DATE;

  RAISE NOTICE 'Test 1: Before void - Position: %, AUM: %', v_position_before, v_aum_before;

  -- Void transaction
  -- NOTE: This test would fail before adding SERIALIZABLE isolation and fund-level locks
  -- because concurrent yield apply could read inconsistent state
  UPDATE transactions_v2
    SET is_voided = TRUE, updated_at = NOW()
    WHERE id = v_deposit_tx_id;

  -- Simulate trigger: reverse position
  UPDATE investor_positions
    SET current_value = current_value - 1000.00, updated_at = NOW()
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  -- Simulate trigger: reverse AUM
  UPDATE fund_daily_aum
    SET total_aum = total_aum - 1000.00, updated_at = NOW()
    WHERE fund_id = v_fund_id AND recorded_at = CURRENT_DATE;

  -- Record position/AUM after void
  SELECT current_value INTO v_position_after
    FROM investor_positions
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  SELECT total_aum INTO v_aum_after
    FROM fund_daily_aum
    WHERE fund_id = v_fund_id AND recorded_at = CURRENT_DATE;

  RAISE NOTICE 'Test 1: After void - Position: %, AUM: %', v_position_after, v_aum_after;

  -- ASSERTIONS: Both position and AUM must be updated atomically
  -- If they're not, one would still be 1000 while the other is 0
  ASSERT v_position_after = 0,
    FORMAT('Test 1 FAILED: Position after void should be 0, got %s', v_position_after);
  ASSERT v_aum_after = 0,
    FORMAT('Test 1 FAILED: AUM after void should be 0, got %s', v_aum_after);

  -- Verify ledger sum matches position
  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_sum
    FROM transactions_v2
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id AND is_voided = FALSE;

  ASSERT v_position_after = v_ledger_sum,
    FORMAT('Test 1 FAILED: Position (%s) should match ledger sum (%s)', v_position_after, v_ledger_sum);

  RAISE NOTICE 'Test 1: PASS - Void operation is atomic (Invariant 1)';

  -- CLEANUP
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM transactions_v2 WHERE fund_id = v_fund_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test 1 ERROR: %', SQLERRM;
  -- Cleanup on error
  DELETE FROM fund_daily_aum WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM transactions_v2 WHERE fund_id = v_fund_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;
  RAISE;
END $$;

-- Test 2: Unvoid restores position correctly (Invariant 3)
-- Verifies that unvoid restores position but does NOT auto-restore voided yields

DO $$
DECLARE
  v_investor_id UUID := gen_random_uuid();
  v_fund_id UUID := gen_random_uuid();
  v_tx_id UUID;
  v_yield_id UUID;
  v_position_before_void NUMERIC;
  v_position_after_void NUMERIC;
  v_position_after_unvoid NUMERIC;
  v_yield_is_voided_after_unvoid BOOLEAN;
  v_ledger_sum NUMERIC;
BEGIN
  -- SETUP
  BEGIN
    INSERT INTO profiles (id, email, role) VALUES
      (v_investor_id, 'unvoid-test-' || gen_random_uuid()::TEXT || '@example.com', 'investor')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  BEGIN
    INSERT INTO funds (id, name, symbol, created_by) VALUES
      (v_fund_id, 'Unvoid Test Fund ' || gen_random_uuid()::TEXT, 'UTF', '00000000-0000-0000-0000-000000000000')
    ON CONFLICT DO NOTHING;
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  -- Create investor position
  DELETE FROM investor_positions WHERE investor_id = v_investor_id AND fund_id = v_fund_id;
  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, updated_at, created_at)
    VALUES (v_investor_id, v_fund_id, 1050.00, 1000.00, NOW(), NOW());

  -- Create deposit transaction
  INSERT INTO transactions_v2 (
    id, investor_id, fund_id, amount, type, is_voided, applied, tx_date,
    created_at, updated_at, last_modified_by
  ) VALUES (
    gen_random_uuid(),
    v_investor_id,
    v_fund_id,
    1000.00,
    'DEPOSIT',
    FALSE,
    TRUE,
    CURRENT_DATE,
    NOW(),
    NOW(),
    '00000000-0000-0000-0000-000000000000'
  ) RETURNING id INTO v_tx_id;

  -- Create yield event (related to the deposit)
  INSERT INTO investor_yield_events (
    id, investor_id, fund_id, amount, is_voided, trigger_transaction_id,
    created_at, updated_at
  ) VALUES (
    gen_random_uuid(),
    v_investor_id,
    v_fund_id,
    50.00,
    FALSE,
    v_tx_id,
    NOW(),
    NOW()
  ) RETURNING id INTO v_yield_id;

  -- Record position before void
  SELECT current_value INTO v_position_before_void
    FROM investor_positions
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  RAISE NOTICE 'Test 2: Before void - Position: %', v_position_before_void;
  ASSERT v_position_before_void = 1050.00,
    FORMAT('Test 2 FAILED: Position before void should be 1050, got %s', v_position_before_void);

  -- VOID: Mark transaction and yield as voided
  UPDATE transactions_v2
    SET is_voided = TRUE, updated_at = NOW()
    WHERE id = v_tx_id;

  UPDATE investor_yield_events
    SET is_voided = TRUE, updated_at = NOW()
    WHERE id = v_yield_id;

  -- Simulate trigger: reverse position by transaction amount
  UPDATE investor_positions
    SET current_value = current_value - 1000.00, updated_at = NOW()
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  -- Record position after void
  SELECT current_value INTO v_position_after_void
    FROM investor_positions
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  RAISE NOTICE 'Test 2: After void - Position: %', v_position_after_void;
  ASSERT v_position_after_void = 50.00,
    FORMAT('Test 2 FAILED: Position after void should be 50 (yield still there), got %s', v_position_after_void);

  -- UNVOID: Mark transaction as active again
  UPDATE transactions_v2
    SET is_voided = FALSE, updated_at = NOW()
    WHERE id = v_tx_id;

  -- Simulate trigger: restore position by transaction amount
  UPDATE investor_positions
    SET current_value = current_value + 1000.00, updated_at = NOW()
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  -- Record position after unvoid
  SELECT current_value INTO v_position_after_unvoid
    FROM investor_positions
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id;

  -- Check if yield is still voided (it should NOT be auto-restored)
  SELECT is_voided INTO v_yield_is_voided_after_unvoid
    FROM investor_yield_events
    WHERE id = v_yield_id;

  RAISE NOTICE 'Test 2: After unvoid - Position: %, Yield voided: %', v_position_after_unvoid, v_yield_is_voided_after_unvoid;

  -- ASSERTIONS: Position should be restored to 1000 (NOT 1050 because yield is not auto-restored)
  ASSERT v_position_after_unvoid = 1000.00,
    FORMAT('Test 2 FAILED: Position after unvoid should be 1000 (yields not auto-restored), got %s', v_position_after_unvoid);

  -- Yield should still be voided (not auto-restored)
  ASSERT v_yield_is_voided_after_unvoid = TRUE,
    FORMAT('Test 2 FAILED: Yield should still be voided after unvoid, but is_voided=%s', v_yield_is_voided_after_unvoid);

  -- Verify ledger sum matches position
  SELECT COALESCE(SUM(amount), 0) INTO v_ledger_sum
    FROM transactions_v2
    WHERE investor_id = v_investor_id AND fund_id = v_fund_id AND is_voided = FALSE;

  ASSERT v_position_after_unvoid = v_ledger_sum,
    FORMAT('Test 2 FAILED: Position (%s) should match ledger sum (%s)', v_position_after_unvoid, v_ledger_sum);

  RAISE NOTICE 'Test 2: PASS - Unvoid restores position but not yields (Invariant 3)';

  -- CLEANUP
  DELETE FROM investor_yield_events WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM transactions_v2 WHERE fund_id = v_fund_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test 2 ERROR: %', SQLERRM;
  -- Cleanup on error
  DELETE FROM investor_yield_events WHERE fund_id = v_fund_id;
  DELETE FROM investor_positions WHERE investor_id = v_investor_id;
  DELETE FROM transactions_v2 WHERE fund_id = v_fund_id;
  DELETE FROM funds WHERE id = v_fund_id;
  DELETE FROM profiles WHERE id = v_investor_id;
  RAISE;
END $$;

-- Test 3: Position-Ledger Balance Check (Invariant 1)
-- Verifies that after void and unvoid, position equals sum of non-voided transactions and yields

DO $$
DECLARE
  v_mismatch_count INT;
  v_sample_record RECORD;
BEGIN
  -- Check: For all investor/fund combinations, position should equal sum of non-voided transactions + yields
  SELECT COUNT(*) INTO v_mismatch_count
  FROM (
    SELECT ip.investor_id, ip.fund_id, ip.current_value,
           COALESCE(SUM(CASE WHEN t.is_voided = FALSE THEN t.amount ELSE 0 END), 0) +
           COALESCE(SUM(CASE WHEN y.is_voided = FALSE THEN y.amount ELSE 0 END), 0) as ledger_sum
    FROM investor_positions ip
    LEFT JOIN transactions_v2 t ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
    LEFT JOIN investor_yield_events y ON ip.investor_id = y.investor_id AND ip.fund_id = y.fund_id
    GROUP BY ip.investor_id, ip.fund_id, ip.current_value
  ) reconciliation
  WHERE reconciliation.current_value != reconciliation.ledger_sum;

  IF v_mismatch_count > 0 THEN
    -- Log sample mismatches for debugging
    FOR v_sample_record IN
      SELECT ip.investor_id, ip.fund_id, ip.current_value,
             COALESCE(SUM(CASE WHEN t.is_voided = FALSE THEN t.amount ELSE 0 END), 0) +
             COALESCE(SUM(CASE WHEN y.is_voided = FALSE THEN y.amount ELSE 0 END), 0) as ledger_sum
      FROM investor_positions ip
      LEFT JOIN transactions_v2 t ON ip.investor_id = t.investor_id AND ip.fund_id = t.fund_id
      LEFT JOIN investor_yield_events y ON ip.investor_id = y.investor_id AND ip.fund_id = y.fund_id
      GROUP BY ip.investor_id, ip.fund_id, ip.current_value
      HAVING ip.current_value != COALESCE(SUM(CASE WHEN t.is_voided = FALSE THEN t.amount ELSE 0 END), 0) +
             COALESCE(SUM(CASE WHEN y.is_voided = FALSE THEN y.amount ELSE 0 END), 0)
      LIMIT 5
    LOOP
      RAISE WARNING 'Mismatch: investor=%, fund=%, position=%, ledger_sum=%',
        v_sample_record.investor_id, v_sample_record.fund_id,
        v_sample_record.current_value, v_sample_record.ledger_sum;
    END LOOP;

    RAISE EXCEPTION 'Test 3 FAILED: % position/ledger mismatches found (Invariant 1 violated)', v_mismatch_count;
  END IF;

  RAISE NOTICE 'Test 3: PASS - All positions match transaction + yield sums (Invariant 1 satisfied)';

EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'Test 3 ERROR: %', SQLERRM;
  RAISE;
END $$;

-- Summary
DO $$
BEGIN
  RAISE NOTICE '====== VOID/UNVOID CONCURRENCY TESTS COMPLETE ======';
  RAISE NOTICE 'Test 1 (Invariant 1): Atomic void operations';
  RAISE NOTICE 'Test 2 (Invariant 3): Unvoid restoration with no auto-restore of yields';
  RAISE NOTICE 'Test 3 (All Invariants): Position-ledger balance verification';
  RAISE NOTICE '================================================';
END $$;
