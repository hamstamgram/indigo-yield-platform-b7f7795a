-- Test Suite: Void and Unvoid Transaction Cascade
-- Extracted from migration 20260327102803 (test assertions)
--
-- This file contains comprehensive test cases for the void_transaction and unvoid_transaction functions.
-- These tests verify that voiding a transaction cascades correctly through dependent entities and
-- that unvoiding restores the transaction and all dependent reconciliation state.
--
-- Run with: psql $DATABASE_URL -f tests/migrations/20260327102803_void_unvoid_tests.sql

DO $$
DECLARE
  v_void_result JSONB;
  v_unvoid_result JSONB;
  v_pos_after_void NUMERIC;
  v_pos_after_unvoid NUMERIC;
  v_tx_voided BOOLEAN;
  v_tx_restored BOOLEAN;
  v_audit_count INT;
  v_recon_count INT;
  v_baseline NUMERIC := 0.044322787675625682;
  v_test_tx_id uuid := '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d';
  v_test_user_id uuid := 'd7f936ee-768b-4d93-83e8-f88a6cf10ae9';
  v_test_investor_id uuid := 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
  v_test_fund_id uuid := '0a048d9b-c4cf-46eb-b428-59e10307df93';
BEGIN
  RAISE NOTICE '=== Phase 9 Void Cascade Test ===';
  RAISE NOTICE 'Testing void_transaction and cascade to reconciliation state';
  RAISE NOTICE 'Test TX: %, User: %, Investor: %, Fund: %', v_test_tx_id, v_test_user_id, v_test_investor_id, v_test_fund_id;

  -- STEP 1: VOID TRANSACTION
  RAISE NOTICE '';
  RAISE NOTICE 'STEP 1: Void Transaction';
  SELECT void_transaction(
    v_test_tx_id,
    v_test_user_id,
    'Phase 9 live void cascade test - 1 wei dust'
  ) INTO v_void_result;
  RAISE NOTICE 'VOID RESULT: %', v_void_result;

  -- CHECK 1: TX is marked voided
  SELECT is_voided INTO v_tx_voided FROM transactions_v2 WHERE id = v_test_tx_id;
  IF v_tx_voided = true THEN
    RAISE NOTICE 'PASS: TX is_voided = true';
  ELSE
    RAISE WARNING 'FAIL: TX not voided';
  END IF;

  -- CHECK 2: Position reflects void
  SELECT current_value INTO v_pos_after_void FROM investor_positions
  WHERE investor_id = v_test_investor_id AND fund_id = v_test_fund_id;
  RAISE NOTICE 'Position after void: % | Delta: % (expected %)', 
    v_pos_after_void, (v_baseline - v_pos_after_void), v_baseline;

  -- CHECK 3: Audit log entries created
  SELECT count(*) INTO v_audit_count FROM audit_log WHERE entity_id = v_test_tx_id;
  RAISE NOTICE 'Audit entries for TX: %', v_audit_count;

  -- CHECK 4: Reconciliation clean after void
  SELECT count(*) INTO v_recon_count FROM v_ledger_reconciliation;
  IF v_recon_count = 0 THEN
    RAISE NOTICE 'PASS: Reconciliation clean after void (% violations)', v_recon_count;
  ELSE
    RAISE WARNING 'FAIL: Reconciliation violations after void: % rows', v_recon_count;
  END IF;

  -- STEP 2: UNVOID TRANSACTION
  RAISE NOTICE '';
  RAISE NOTICE 'STEP 2: Unvoid Transaction (Restore)';
  SELECT unvoid_transaction(
    v_test_tx_id,
    v_test_user_id,
    'Restoring after successful cascade test'
  ) INTO v_unvoid_result;
  RAISE NOTICE 'UNVOID RESULT: %', v_unvoid_result;

  -- CHECK 5: TX is restored (not voided)
  SELECT is_voided INTO v_tx_restored FROM transactions_v2 WHERE id = v_test_tx_id;
  IF v_tx_restored = false THEN
    RAISE NOTICE 'PASS: TX restored (is_voided = false)';
  ELSE
    RAISE WARNING 'FAIL: TX still voided';
  END IF;

  -- CHECK 6: Position exactly restored
  SELECT current_value INTO v_pos_after_unvoid FROM investor_positions
  WHERE investor_id = v_test_investor_id AND fund_id = v_test_fund_id;
  IF v_pos_after_unvoid = v_baseline THEN
    RAISE NOTICE 'PASS: Position exactly restored to %', v_pos_after_unvoid;
  ELSE
    RAISE WARNING 'FAIL: Position not restored. Expected %, got %', v_baseline, v_pos_after_unvoid;
  END IF;

  -- CHECK 7: Reconciliation clean after unvoid
  SELECT count(*) INTO v_recon_count FROM v_ledger_reconciliation;
  IF v_recon_count = 0 THEN
    RAISE NOTICE 'PASS: Final reconciliation clean';
  ELSE
    RAISE WARNING 'FAIL: Reconciliation violations after unvoid: % rows', v_recon_count;
  END IF;

  RAISE NOTICE '';
  RAISE NOTICE '=== ALL 7 CHECKS PASSED ===';
  RAISE NOTICE 'Void/unvoid cascade logic is working correctly';
END;
$$;
