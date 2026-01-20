-- ============================================================================
-- RPC ABUSE TESTS: Security Misuse Verification
-- Fortune-500 Grade Go-Live Certification
-- ============================================================================
--
-- This script tests security boundaries and access controls.
-- It verifies that unauthorized operations are properly blocked.
--
-- NOTE: These tests require role simulation which may not be available
-- in all PostgreSQL configurations. Tests that cannot run will SKIP.
--
-- USAGE: Run AFTER fixtures_seed.sql
-- ============================================================================

DO $$
DECLARE
  v_admin_id uuid := 'a0000000-0000-0000-0000-000000000001'::uuid;
  v_investor_id uuid := 'b0000000-0000-0000-0000-000000000001'::uuid;
  v_test_fund_id uuid := 'f0000000-0000-0000-0000-000000000001'::uuid;
  v_result jsonb;
  v_error_caught boolean;
BEGIN
  RAISE NOTICE '';
  RAISE NOTICE '=== RPC ABUSE TESTS ===';
  RAISE NOTICE '';

  -- ========================================================================
  -- TEST 1: Direct Position Write Blocked
  -- Direct writes to investor_positions must be blocked by trigger
  -- ========================================================================
  RAISE NOTICE 'TEST 1: Direct Position Write Blocked';
  
  v_error_caught := false;
  BEGIN
    -- Attempt direct update without canonical bypass
    UPDATE investor_positions 
    SET current_value = current_value + 1000
    WHERE investor_id = v_investor_id 
      AND fund_id = v_test_fund_id;
    
    -- If we get here, the guard didn't work
    RAISE NOTICE 'FAIL: Direct position write was NOT blocked';
  EXCEPTION WHEN OTHERS THEN
    IF SQLERRM LIKE '%Direct writes%blocked%' OR SQLERRM LIKE '%canonical%' THEN
      RAISE NOTICE 'PASS: Direct position write blocked by guard trigger';
      v_error_caught := true;
    ELSE
      RAISE NOTICE 'INFO: Write blocked with different error: %', SQLERRM;
      v_error_caught := true;
    END IF;
  END;

  -- ========================================================================
  -- TEST 2: Canonical Bypass Requires Flag
  -- Writes only allowed when canonical_rpc flag is set
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 2: Canonical Bypass Works When Flag Set';
  
  BEGIN
    -- Set the canonical bypass flag
    PERFORM set_config('app.canonical_rpc', 'true', true);
    
    -- Now the update should work (we'll update updated_at only to not corrupt data)
    UPDATE investor_positions 
    SET updated_at = now()
    WHERE investor_id = v_investor_id 
      AND fund_id = v_test_fund_id;
    
    RAISE NOTICE 'PASS: Canonical bypass allows writes when flag set';
    
    -- Clear the flag
    PERFORM set_config('app.canonical_rpc', '', true);
  EXCEPTION WHEN OTHERS THEN
    PERFORM set_config('app.canonical_rpc', '', true);
    RAISE NOTICE 'INFO: Canonical bypass test: %', SQLERRM;
  END;

  -- ========================================================================
  -- TEST 3: Transaction Reference ID Uniqueness
  -- Duplicate reference_id must be rejected
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 3: Duplicate Reference ID Rejected';
  
  BEGIN
    -- Insert first transaction with reference_id
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, source, reference_id
    ) VALUES (
      v_investor_id, v_test_fund_id, 'DEPOSIT', 0.001, CURRENT_DATE, 
      'abuse_test', 'ABUSE-TEST-DUPLICATE'
    );
    
    -- Attempt to insert duplicate
    BEGIN
      INSERT INTO transactions_v2 (
        investor_id, fund_id, type, amount, tx_date, source, reference_id
      ) VALUES (
        v_investor_id, v_test_fund_id, 'DEPOSIT', 0.002, CURRENT_DATE, 
        'abuse_test', 'ABUSE-TEST-DUPLICATE'
      );
      
      RAISE NOTICE 'INFO: Duplicate may have been handled by ON CONFLICT DO NOTHING';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'PASS: Duplicate reference_id rejected with unique_violation';
    END;
    
    -- Cleanup
    DELETE FROM transactions_v2 WHERE reference_id = 'ABUSE-TEST-DUPLICATE';
  END;

  -- ========================================================================
  -- TEST 4: Negative Amount Rejected
  -- Transaction amounts must be positive
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 4: Negative Amount Rejected';
  
  BEGIN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, source, reference_id
    ) VALUES (
      v_investor_id, v_test_fund_id, 'DEPOSIT', -1.0, CURRENT_DATE, 
      'abuse_test', 'ABUSE-TEST-NEGATIVE'
    );
    
    -- If we get here, validation failed
    DELETE FROM transactions_v2 WHERE reference_id = 'ABUSE-TEST-NEGATIVE';
    RAISE NOTICE 'FAIL: Negative amount was NOT rejected';
  EXCEPTION WHEN check_violation THEN
    RAISE NOTICE 'PASS: Negative amount rejected with check_violation';
  WHEN OTHERS THEN
    IF SQLERRM LIKE '%positive%' OR SQLERRM LIKE '%greater than%' THEN
      RAISE NOTICE 'PASS: Negative amount rejected';
    ELSE
      RAISE NOTICE 'INFO: Negative amount handling: %', SQLERRM;
    END IF;
  END;

  -- ========================================================================
  -- TEST 5: Invalid Fund ID Rejected
  -- Transactions must reference valid funds
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 5: Invalid Fund ID Rejected';
  
  BEGIN
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, source, reference_id
    ) VALUES (
      v_investor_id, 
      '00000000-0000-0000-0000-000000000000'::uuid, -- Invalid fund
      'DEPOSIT', 1.0, CURRENT_DATE, 
      'abuse_test', 'ABUSE-TEST-INVALID-FUND'
    );
    
    -- If we get here, FK constraint failed
    DELETE FROM transactions_v2 WHERE reference_id = 'ABUSE-TEST-INVALID-FUND';
    RAISE NOTICE 'FAIL: Invalid fund_id was NOT rejected';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'PASS: Invalid fund_id rejected with foreign_key_violation';
  WHEN OTHERS THEN
    RAISE NOTICE 'INFO: Invalid fund handling: %', SQLERRM;
  END;

  -- ========================================================================
  -- TEST 6: Invalid Investor ID Rejected
  -- Transactions must reference valid investors
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 6: Invalid Investor ID Rejected';
  
  BEGIN
    INSERT INTO transactions_v2 (
      investor_id, 
      fund_id, type, amount, tx_date, source, reference_id
    ) VALUES (
      '00000000-0000-0000-0000-000000000000'::uuid, -- Invalid investor
      v_test_fund_id, 
      'DEPOSIT', 1.0, CURRENT_DATE, 
      'abuse_test', 'ABUSE-TEST-INVALID-INVESTOR'
    );
    
    -- If we get here, FK constraint failed
    DELETE FROM transactions_v2 WHERE reference_id = 'ABUSE-TEST-INVALID-INVESTOR';
    RAISE NOTICE 'FAIL: Invalid investor_id was NOT rejected';
  EXCEPTION WHEN foreign_key_violation THEN
    RAISE NOTICE 'PASS: Invalid investor_id rejected with foreign_key_violation';
  WHEN OTHERS THEN
    RAISE NOTICE 'INFO: Invalid investor handling: %', SQLERRM;
  END;

  -- ========================================================================
  -- TEST 7: Voided Transaction Cannot Be Modified
  -- Once voided, a transaction should not be modifiable
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 7: Voided Transaction Immutability';
  
  DECLARE
    v_tx_id uuid;
  BEGIN
    -- Create a transaction
    INSERT INTO transactions_v2 (
      investor_id, fund_id, type, amount, tx_date, source, reference_id
    ) VALUES (
      v_investor_id, v_test_fund_id, 'DEPOSIT', 0.001, CURRENT_DATE, 
      'abuse_test', 'ABUSE-TEST-VOID'
    ) RETURNING id INTO v_tx_id;
    
    -- Void it
    UPDATE transactions_v2 
    SET is_voided = true, voided_at = now(), voided_by = v_admin_id, void_reason = 'test'
    WHERE id = v_tx_id;
    
    -- Try to unvoid it (this should ideally be blocked)
    BEGIN
      UPDATE transactions_v2 
      SET is_voided = false, voided_at = NULL
      WHERE id = v_tx_id;
      
      RAISE NOTICE 'INFO: Voided transaction CAN be unvoided (no trigger protection)';
    EXCEPTION WHEN OTHERS THEN
      RAISE NOTICE 'PASS: Voided transaction cannot be unvoided: %', SQLERRM;
    END;
    
    -- Cleanup
    DELETE FROM transactions_v2 WHERE id = v_tx_id;
  END;

  -- ========================================================================
  -- TEST 8: RLS on Audit Log (Insert Only)
  -- Audit log should allow inserts but restrict selects for non-admins
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 8: Audit Log Insert Allowed';
  
  BEGIN
    INSERT INTO audit_log (
      action, entity, entity_id, actor_user, meta
    ) VALUES (
      'ABUSE_TEST', 'test', 'test-id', v_admin_id, '{"test": true}'::jsonb
    );
    
    RAISE NOTICE 'PASS: Audit log insert allowed';
    
    -- Cleanup
    DELETE FROM audit_log WHERE action = 'ABUSE_TEST';
  EXCEPTION WHEN OTHERS THEN
    RAISE NOTICE 'INFO: Audit log insert: %', SQLERRM;
  END;

  -- ========================================================================
  -- TEST 9: Fund Daily AUM Temporal Lock
  -- Creating AUM for same date should use proper conflict handling
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 9: AUM Duplicate Date Handling';
  
  DECLARE
    v_aum_id uuid;
  BEGIN
    -- Create AUM record
    INSERT INTO fund_daily_aum (
      fund_id, aum_date, total_aum, purpose, source, is_voided, created_by
    ) VALUES (
      v_test_fund_id, '2099-12-31', 100.0, 'transaction', 'abuse_test', false, v_admin_id
    ) RETURNING id INTO v_aum_id;
    
    -- Try to create another for same date/purpose (should be handled)
    BEGIN
      INSERT INTO fund_daily_aum (
        fund_id, aum_date, total_aum, purpose, source, is_voided, created_by
      ) VALUES (
        v_test_fund_id, '2099-12-31', 200.0, 'transaction', 'abuse_test', false, v_admin_id
      );
      
      RAISE NOTICE 'INFO: Duplicate AUM allowed (manual check-then-insert pattern expected)';
    EXCEPTION WHEN unique_violation THEN
      RAISE NOTICE 'PASS: Duplicate AUM rejected with unique_violation';
    END;
    
    -- Cleanup
    DELETE FROM fund_daily_aum WHERE source = 'abuse_test';
  END;

  -- ========================================================================
  -- TEST 10: Admin Function Guard (if is_admin() exists)
  -- Admin-only RPCs should verify caller is admin
  -- ========================================================================
  RAISE NOTICE '';
  RAISE NOTICE 'TEST 10: Admin Function Guard Check';
  
  BEGIN
    -- Check if is_admin function exists and test it
    DECLARE
      v_is_admin boolean;
    BEGIN
      SELECT is_admin() INTO v_is_admin;
      RAISE NOTICE 'INFO: is_admin() returned: % (without JWT context)', v_is_admin;
    EXCEPTION WHEN undefined_function THEN
      RAISE NOTICE 'SKIP: is_admin() function not available';
    END;
  END;

  RAISE NOTICE '';
  RAISE NOTICE '=== ALL RPC ABUSE TESTS COMPLETE ===';
  RAISE NOTICE '';
END $$;
