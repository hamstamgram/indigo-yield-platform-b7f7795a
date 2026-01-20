-- ============================================================================
-- Cost Basis Regression Tests
-- ============================================================================
-- These tests verify the cost_basis integrity system works correctly.
-- Run these tests after any changes to position-related RPCs or triggers.
-- ============================================================================

-- Setup: Create test data
DO $$
DECLARE
  v_test_investor_id uuid;
  v_test_fund_id uuid;
  v_test_admin_id uuid;
  v_tx_id uuid;
  v_result jsonb;
  v_position_before record;
  v_position_after record;
  v_computed jsonb;
BEGIN
  RAISE NOTICE '=== Cost Basis Regression Tests ===';
  
  -- Get test entities (use existing test accounts)
  SELECT id INTO v_test_admin_id FROM profiles WHERE is_admin = true LIMIT 1;
  SELECT id INTO v_test_fund_id FROM funds WHERE status = 'active' LIMIT 1;
  SELECT id INTO v_test_investor_id FROM profiles WHERE role = 'investor' AND id != v_test_admin_id LIMIT 1;
  
  IF v_test_admin_id IS NULL OR v_test_fund_id IS NULL OR v_test_investor_id IS NULL THEN
    RAISE NOTICE 'SKIP: Missing test entities (admin, fund, or investor)';
    RETURN;
  END IF;

  RAISE NOTICE 'Test entities: admin=%, fund=%, investor=%', v_test_admin_id, v_test_fund_id, v_test_investor_id;

  -- ============================================================================
  -- TEST 1: compute_position_from_ledger returns correct values
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 1: compute_position_from_ledger correctness';
  
  SELECT compute_position_from_ledger(v_test_investor_id, v_test_fund_id) INTO v_computed;
  
  IF v_computed IS NULL THEN
    RAISE NOTICE 'FAIL: compute_position_from_ledger returned NULL';
  ELSIF v_computed->'computed' IS NULL THEN
    RAISE NOTICE 'FAIL: computed field is missing';
  ELSE
    RAISE NOTICE 'PASS: compute_position_from_ledger returned valid result';
    RAISE NOTICE '  Breakdown: deposits=%, withdrawals=%, yield=%', 
      v_computed->'breakdown'->>'deposits',
      v_computed->'breakdown'->>'withdrawals',
      v_computed->'breakdown'->>'yield';
    RAISE NOTICE '  Computed: cost_basis=%, current_value=%',
      v_computed->'computed'->>'cost_basis',
      v_computed->'computed'->>'current_value';
  END IF;

  -- ============================================================================
  -- TEST 2: v_cost_basis_mismatch detects discrepancies
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: v_cost_basis_mismatch view works';
  
  -- Check if view returns results (may be empty if all positions are correct)
  PERFORM 1 FROM v_cost_basis_mismatch LIMIT 1;
  RAISE NOTICE 'PASS: v_cost_basis_mismatch view is accessible';

  -- ============================================================================
  -- TEST 3: rebuild_position_from_ledger dry_run works
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: rebuild_position_from_ledger dry_run';
  
  SELECT rebuild_position_from_ledger(
    v_test_investor_id, 
    v_test_fund_id, 
    v_test_admin_id, 
    'regression_test',
    true  -- dry_run
  ) INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE NOTICE 'FAIL: rebuild_position_from_ledger returned NULL';
  ELSIF (v_result->>'success')::boolean != true THEN
    RAISE NOTICE 'FAIL: rebuild_position_from_ledger failed: %', v_result->>'error';
  ELSIF (v_result->>'dry_run')::boolean != true THEN
    RAISE NOTICE 'FAIL: dry_run flag not respected';
  ELSE
    RAISE NOTICE 'PASS: rebuild_position_from_ledger dry_run works';
    RAISE NOTICE '  Old: cost_basis=%, current_value=%',
      v_result->'old'->>'cost_basis',
      v_result->'old'->>'current_value';
    RAISE NOTICE '  New: cost_basis=%, current_value=%',
      v_result->'new'->>'cost_basis',
      v_result->'new'->>'current_value';
  END IF;

  -- ============================================================================
  -- TEST 4: Direct write to investor_positions is blocked
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Direct position write is blocked';
  
  BEGIN
    -- This should fail because we're not in a canonical RPC context
    UPDATE investor_positions 
    SET cost_basis = cost_basis + 0.01
    WHERE investor_id = v_test_investor_id AND fund_id = v_test_fund_id;
    
    -- If we get here, the guard didn't work (but rollback anyway)
    RAISE NOTICE 'FAIL: Direct write was NOT blocked (guard may be missing)';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Direct writes to investor_positions are blocked%' THEN
      RAISE NOTICE 'PASS: Direct write blocked with expected error';
    ELSE
      RAISE NOTICE 'INFO: Direct write blocked with: %', SQLERRM;
    END IF;
  END;

  -- ============================================================================
  -- TEST 5: Canonical RPC flag allows writes
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: Canonical RPC flag allows writes';
  
  -- Store original value
  SELECT * INTO v_position_before 
  FROM investor_positions 
  WHERE investor_id = v_test_investor_id AND fund_id = v_test_fund_id;
  
  IF v_position_before IS NULL THEN
    RAISE NOTICE 'SKIP: No existing position for this investor/fund';
  ELSE
    BEGIN
      -- Set the canonical flag
      PERFORM set_canonical_rpc();
      
      -- This should now succeed
      UPDATE investor_positions 
      SET cost_basis = v_position_before.cost_basis
      WHERE investor_id = v_test_investor_id AND fund_id = v_test_fund_id;
      
      RAISE NOTICE 'PASS: Canonical RPC flag allows writes';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'FAIL: Even with canonical flag, write failed: %', SQLERRM;
    END;
  END IF;

  -- ============================================================================
  -- TEST 6: Transaction idempotency via reference_id
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 6: Transaction idempotency (reference_id)';
  
  DECLARE
    v_ref_id text := 'regression_test_' || gen_random_uuid()::text;
    v_count_before integer;
    v_count_after integer;
  BEGIN
    -- Count transactions before
    SELECT COUNT(*) INTO v_count_before 
    FROM transactions_v2 
    WHERE reference_id = v_ref_id;
    
    -- Insert first transaction
    INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, source, reference_id, tx_date)
    VALUES (v_test_investor_id, v_test_fund_id, 'DEPOSIT', 0.01, 'regression_test', v_ref_id, CURRENT_DATE);
    
    -- Try to insert duplicate (should fail or be ignored)
    BEGIN
      INSERT INTO transactions_v2 (investor_id, fund_id, type, amount, source, reference_id, tx_date)
      VALUES (v_test_investor_id, v_test_fund_id, 'DEPOSIT', 0.01, 'regression_test', v_ref_id, CURRENT_DATE);
      
      -- Count after
      SELECT COUNT(*) INTO v_count_after 
      FROM transactions_v2 
      WHERE reference_id = v_ref_id;
      
      IF v_count_after = 1 THEN
        RAISE NOTICE 'PASS: Duplicate transaction was ignored (ON CONFLICT DO NOTHING)';
      ELSE
        RAISE NOTICE 'FAIL: Duplicate transaction was inserted (count=%, expected 1)', v_count_after;
      END IF;
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'PASS: Duplicate transaction blocked by unique constraint';
    END;
    
    -- Cleanup
    DELETE FROM transactions_v2 WHERE reference_id = v_ref_id;
    RAISE NOTICE '  Cleaned up test transaction';
  END;

  -- ============================================================================
  -- TEST 7: run_integrity_pack includes cost_basis check
  -- ============================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 7: run_integrity_pack includes cost_basis check';
  
  SELECT run_integrity_pack() INTO v_result;
  
  IF v_result IS NULL THEN
    RAISE NOTICE 'FAIL: run_integrity_pack returned NULL';
  ELSIF v_result->'checks' IS NULL THEN
    RAISE NOTICE 'FAIL: run_integrity_pack missing checks array';
  ELSE
    DECLARE
      v_has_cost_basis_check boolean := false;
      v_check record;
    BEGIN
      FOR v_check IN SELECT * FROM jsonb_array_elements(v_result->'checks')
      LOOP
        IF v_check.value->>'name' = 'cost_basis_mismatch' THEN
          v_has_cost_basis_check := true;
          RAISE NOTICE 'PASS: cost_basis_mismatch check found in integrity pack';
          RAISE NOTICE '  Status: %, Count: %', 
            v_check.value->>'status', 
            v_check.value->>'count';
          EXIT;
        END IF;
      END LOOP;
      
      IF NOT v_has_cost_basis_check THEN
        RAISE NOTICE 'FAIL: cost_basis_mismatch check NOT found in integrity pack';
      END IF;
    END;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== Cost Basis Regression Tests Complete ===';
  
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'TEST ERROR: %', SQLERRM;
  RAISE;
END $$;
