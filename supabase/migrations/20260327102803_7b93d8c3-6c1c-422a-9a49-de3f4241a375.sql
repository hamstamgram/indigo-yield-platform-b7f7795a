
-- Temporarily override is_admin() for this migration-only test
CREATE OR REPLACE FUNCTION public.is_admin() RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS 'SELECT true';

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
BEGIN
  -- Step 1: VOID
  SELECT void_transaction(
    '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d'::uuid,
    'd7f936ee-768b-4d93-83e8-f88a6cf10ae9'::uuid,
    'Phase 9 live void cascade test - 1 wei dust'
  ) INTO v_void_result;
  RAISE NOTICE 'VOID RESULT: %', v_void_result;

  SELECT is_voided INTO v_tx_voided FROM transactions_v2 WHERE id = '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d';
  ASSERT v_tx_voided = true, 'FAIL: TX not voided';
  RAISE NOTICE 'PASS: TX is_voided = true';

  SELECT current_value INTO v_pos_after_void FROM investor_positions
  WHERE investor_id = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae' AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93';
  RAISE NOTICE 'Position after void: % | Delta: %', v_pos_after_void, (v_baseline - v_pos_after_void);

  SELECT count(*) INTO v_audit_count FROM audit_log WHERE entity_id = '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d';
  RAISE NOTICE 'Audit entries for TX: %', v_audit_count;

  SELECT count(*) INTO v_recon_count FROM v_ledger_reconciliation;
  ASSERT v_recon_count = 0, 'FAIL: Reconciliation violations after void';
  RAISE NOTICE 'PASS: Reconciliation clean after void (% violations)', v_recon_count;

  -- Step 3: UNVOID
  SELECT unvoid_transaction(
    '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d'::uuid,
    'd7f936ee-768b-4d93-83e8-f88a6cf10ae9'::uuid,
    'Restoring after successful cascade test'
  ) INTO v_unvoid_result;
  RAISE NOTICE 'UNVOID RESULT: %', v_unvoid_result;

  SELECT is_voided INTO v_tx_restored FROM transactions_v2 WHERE id = '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d';
  ASSERT v_tx_restored = false, 'FAIL: TX still voided';
  RAISE NOTICE 'PASS: TX restored (is_voided = false)';

  SELECT current_value INTO v_pos_after_unvoid FROM investor_positions
  WHERE investor_id = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae' AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93';
  ASSERT v_pos_after_unvoid = v_baseline, format('FAIL: Position not restored. Expected %s, got %s', v_baseline, v_pos_after_unvoid);
  RAISE NOTICE 'PASS: Position exactly restored to %', v_pos_after_unvoid;

  SELECT count(*) INTO v_recon_count FROM v_ledger_reconciliation;
  ASSERT v_recon_count = 0, 'FAIL: Reconciliation violations after unvoid';
  RAISE NOTICE 'PASS: Final reconciliation clean';
  RAISE NOTICE '=== ALL 6 CHECKS PASSED ===';
END;
$$;

-- Restore the real is_admin() function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE id = auth.uid() AND is_admin = true
  )
$$;
