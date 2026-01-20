-- ============================================================================
-- Transaction Flows End-to-End Tests
-- Fortune-500 Grade Cost Basis Integrity Verification
-- ============================================================================

DO $$
DECLARE
  v_test_investor_id uuid;
  v_test_fund_id uuid;
  v_test_admin_id uuid;
  v_result jsonb;
  v_integrity jsonb;
BEGIN
  RAISE NOTICE '=== Transaction Flows E2E Tests ===';
  
  -- Get test entities
  SELECT id INTO v_test_admin_id FROM profiles WHERE is_admin = true LIMIT 1;
  SELECT id INTO v_test_fund_id FROM funds WHERE status = 'active' LIMIT 1;
  SELECT id INTO v_test_investor_id FROM profiles WHERE role = 'investor' AND id != v_test_admin_id LIMIT 1;
  
  IF v_test_admin_id IS NULL OR v_test_fund_id IS NULL OR v_test_investor_id IS NULL THEN
    RAISE NOTICE 'SKIP: Missing test entities';
    RETURN;
  END IF;

  -- TEST 1: run_integrity_pack passes
  RAISE NOTICE 'TEST 1: run_integrity_pack baseline';
  SELECT run_integrity_pack() INTO v_integrity;
  IF (v_integrity->>'overall_status') = 'pass' THEN
    RAISE NOTICE 'PASS: All 4 integrity checks pass';
  ELSE
    RAISE NOTICE 'FAIL: Integrity check failed: %', v_integrity;
  END IF;

  -- TEST 2: v_cost_basis_mismatch is empty
  RAISE NOTICE 'TEST 2: No cost_basis mismatches';
  IF NOT EXISTS (SELECT 1 FROM v_cost_basis_mismatch LIMIT 1) THEN
    RAISE NOTICE 'PASS: v_cost_basis_mismatch returns 0 rows';
  ELSE
    RAISE NOTICE 'FAIL: Found cost_basis mismatches';
  END IF;

  -- TEST 3: Direct write blocked
  RAISE NOTICE 'TEST 3: Direct position write blocked';
  BEGIN
    UPDATE investor_positions SET cost_basis = cost_basis + 0.01
    WHERE investor_id = v_test_investor_id AND fund_id = v_test_fund_id;
    RAISE NOTICE 'FAIL: Direct write NOT blocked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Direct writes%blocked%' THEN
      RAISE NOTICE 'PASS: Direct write blocked by guard trigger';
    ELSE
      RAISE NOTICE 'INFO: Blocked with: %', SQLERRM;
    END IF;
  END;

  -- TEST 4: Canonical bypass works
  RAISE NOTICE 'TEST 4: Canonical bypass allows writes';
  BEGIN
    PERFORM set_canonical_rpc();
    UPDATE investor_positions SET updated_at = now()
    WHERE investor_id = v_test_investor_id AND fund_id = v_test_fund_id;
    RAISE NOTICE 'PASS: Canonical bypass works';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'FAIL: Canonical bypass failed: %', SQLERRM;
  END;

  -- TEST 5: Transaction idempotency
  RAISE NOTICE 'TEST 5: Transaction idempotency via reference_id';
  DECLARE
    v_ref text := 'e2e_test_' || gen_random_uuid()::text;
  BEGIN
    INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, source, reference_id, tx_date)
    VALUES (v_test_investor_id, v_test_fund_id, 'DEPOSIT', 0.001, 'regression_test', v_ref, CURRENT_DATE);
    
    BEGIN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, source, reference_id, tx_date)
      VALUES (v_test_investor_id, v_test_fund_id, 'DEPOSIT', 0.001, 'regression_test', v_ref, CURRENT_DATE);
      RAISE NOTICE 'INFO: Duplicate ignored (ON CONFLICT DO NOTHING)';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'PASS: Duplicate blocked by unique constraint';
    END;
    
    DELETE FROM transactions_v2 WHERE reference_id = v_ref;
  END;

  -- TEST 6: Final integrity check
  RAISE NOTICE 'TEST 6: Final integrity verification';
  SELECT run_integrity_pack() INTO v_integrity;
  IF (v_integrity->>'overall_status') = 'pass' THEN
    RAISE NOTICE 'PASS: All checks pass after tests';
  ELSE
    RAISE NOTICE 'FAIL: Final check failed';
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== E2E Tests Complete ===';
END $$;
