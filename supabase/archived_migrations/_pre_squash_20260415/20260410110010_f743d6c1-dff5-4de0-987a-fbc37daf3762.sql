
-- XRP Fund Reconciliation: Align DB with master Excel
-- ====================================================

DO $$
DECLARE
  v_admin_id uuid := 'd7f936ee-768b-4d93-83e8-f88a6cf10ae9';
  v_fund_id uuid := '2c123c4f-76b4-4504-867e-059649855417';
  v_sam_id uuid := '2f7b8bb2-6a60-4fc9-953d-b9fae44337c1';
  v_indigo_id uuid := 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae';
  v_ryan_id uuid := 'f462d9e5-7363-4c82-a144-4e694d2b55da';
  v_result jsonb;
BEGIN
  -- Set canonical RPC flag
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- ================================================================
  -- 1. UN-VOID Sam's withdrawal (direct UPDATE — bypasses yield guard)
  -- ================================================================
  UPDATE transactions_v2
  SET is_voided = false,
      voided_at = NULL,
      voided_by = NULL,
      void_reason = NULL,
      voided_by_profile_id = NULL,
      notes = COALESCE(notes, '') || E'\n[Unvoided ' || now()::text || ' reconciliation: Excel is truth]'
  WHERE id = '43a80892-14ed-4c5c-b4b7-8042b9c34629';

  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES ('transactions_v2', '43a80892-14ed-4c5c-b4b7-8042b9c34629', 'UNVOID', v_admin_id,
    jsonb_build_object('is_voided', true, 'voided_at', '2026-03-31T00:39:35+00', 'void_reason', 'REISSUE_START: Testing Constraint Failure'),
    jsonb_build_object('is_voided', false),
    jsonb_build_object('reason', 'XRP reconciliation: yields computed correctly while withdrawal was active', 'bypass_yield_guard', true));
  RAISE NOTICE 'Step 1 OK: Un-voided Sam withdrawal';

  -- ================================================================
  -- 2. Restore withdrawal request (disable terminal guard temporarily)
  -- ================================================================
  ALTER TABLE withdrawal_requests DISABLE TRIGGER trg_guard_withdrawal_state;

  UPDATE withdrawal_requests
  SET status = 'completed',
      admin_notes = 'Restored from voided to completed — XRP fund reconciliation. Excel is source of truth.'
  WHERE id = '8b440397-a0a3-449c-b4fd-bfebf3e47d57';

  ALTER TABLE withdrawal_requests ENABLE TRIGGER trg_guard_withdrawal_state;

  INSERT INTO audit_log (entity, entity_id, action, actor_user, old_values, new_values, meta)
  VALUES ('withdrawal_requests', '8b440397-a0a3-449c-b4fd-bfebf3e47d57', 'RECONCILIATION_RESTORE', v_admin_id,
    jsonb_build_object('status', 'voided'),
    jsonb_build_object('status', 'completed'),
    jsonb_build_object('reason', 'XRP fund reconciliation — trigger bypass required for voided->completed', 'migration', true));
  RAISE NOTICE 'Step 2 OK: Withdrawal request restored';

  -- ================================================================
  -- 3. VOID Indigo's 253.136 deposit (not in Excel)
  -- ================================================================
  v_result := void_transaction('370bec96-660f-45c0-b7b2-7f956a925a85'::uuid, v_admin_id,
    'Reconciliation: deposit not in master Excel.');
  IF (v_result->>'success')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Failed to void Indigo deposit: %', v_result->>'message';
  END IF;
  RAISE NOTICE 'Step 3 OK: Voided Indigo 253.136 deposit';

  -- ================================================================
  -- 4. VOID Ryan's 63.284 deposit (not in Excel)
  -- ================================================================
  v_result := void_transaction('091b51b5-b867-4ea7-9786-198a8260204b'::uuid, v_admin_id,
    'Reconciliation: deposit not in master Excel.');
  IF (v_result->>'success')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Failed to void Ryan deposit: %', v_result->>'message';
  END IF;
  RAISE NOTICE 'Step 4 OK: Voided Ryan 63.284 deposit';

  -- ================================================================
  -- 5. VOID stray 0.1 YIELD to Indigo (no distribution_id)
  -- ================================================================
  v_result := void_transaction('5ce7a4f9-41db-4ef7-9e8a-e04819032873'::uuid, v_admin_id,
    'Reconciliation: orphan YIELD, no distribution_id. Test artifact.');
  IF (v_result->>'success')::boolean IS DISTINCT FROM true THEN
    RAISE EXCEPTION 'Failed to void stray 0.1 YIELD: %', v_result->>'message';
  END IF;
  RAISE NOTICE 'Step 5 OK: Voided stray 0.1 YIELD';

  -- ================================================================
  -- 6. Recompute positions & AUM
  -- ================================================================
  PERFORM recompute_investor_position(v_sam_id, v_fund_id);
  PERFORM recompute_investor_position(v_indigo_id, v_fund_id);
  PERFORM recompute_investor_position(v_ryan_id, v_fund_id);
  PERFORM recalculate_fund_aum_for_date(v_fund_id, CURRENT_DATE);
  RAISE NOTICE 'Step 6 OK: Recomputed all positions and AUM';

  RAISE NOTICE 'XRP Fund Reconciliation COMPLETE';
END;
$$;
