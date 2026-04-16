
-- ============================================================
-- Migration: Cascade void status to withdrawal_requests
-- Fixes ghost completed withdrawals where all linked txs are voided
-- ============================================================

-- PART 1: Extend state machine to allow completed → voided
CREATE OR REPLACE FUNCTION public.validate_withdrawal_transition(
  p_current_status text,
  p_new_status text
) RETURNS boolean
LANGUAGE plpgsql
IMMUTABLE
AS $$
/*
 * Validates withdrawal state transitions according to the canonical state machine:
 *
 *   pending → approved | rejected | cancelled
 *   approved → processing | cancelled
 *   processing → completed | cancelled | voided
 *   completed → voided   (NEW — only via canonical RPC)
 *   rejected → (terminal, except restore via canonical RPC)
 *   cancelled → (terminal, except restore via canonical RPC)
 *   voided → (terminal)
 */
BEGIN
  RETURN CASE 
    WHEN p_current_status = 'pending' AND p_new_status IN ('approved', 'rejected', 'cancelled') THEN true
    WHEN p_current_status = 'approved' AND p_new_status IN ('processing', 'cancelled') THEN true
    WHEN p_current_status = 'processing' AND p_new_status IN ('completed', 'cancelled', 'voided') THEN true
    WHEN p_current_status = 'completed' AND p_new_status = 'voided' THEN true
    ELSE false
  END;
END;
$$;

-- PART 2: Update guard to allow 'voided' via canonical RPC
CREATE OR REPLACE FUNCTION public.guard_withdrawal_state_transitions()
RETURNS TRIGGER AS $$
BEGIN
  -- GUARD: Block manual status changes to sensitive states unless via Canonical RPC
  IF (NEW.status IN ('approved', 'completed', 'voided')) AND NOT public.is_canonical_rpc() THEN
    RAISE EXCEPTION 'CRITICAL: Status change to % must be performed via canonical Indigo RPC for financial reconciliation.', NEW.status;
  END IF;

  -- GUARD: Completed withdrawals can only transition to voided via canonical RPC
  IF OLD.status = 'completed' AND NEW.status != 'completed' THEN
    IF NEW.status != 'voided' OR NOT public.is_canonical_rpc() THEN
      RAISE EXCEPTION 'INVALID TRANSITION: Completed withdrawals can only be voided via canonical RPC, not changed to %.', NEW.status;
    END IF;
  END IF;

  -- GUARD: Voided is terminal — no transitions out
  IF OLD.status = 'voided' THEN
    RAISE EXCEPTION 'INVALID TRANSITION: Voided withdrawals are terminal and cannot transition to %.', NEW.status;
  END IF;

  -- GUARD: Terminal states (rejected/cancelled) can only transition via canonical RPC
  IF OLD.status IN ('rejected', 'cancelled') AND NEW.status != OLD.status AND NOT public.is_canonical_rpc() THEN
    RAISE EXCEPTION 'INVALID TRANSITION: % withdrawals can only be transitioned via canonical RPC.', OLD.status;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 3: Rebuild void_transaction with withdrawal cascade
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Admin void'
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_tx RECORD;
  v_daily_aum_voided int := 0;
  v_fee_allocations_voided int := 0;
  v_ib_ledger_voided int := 0;
  v_platform_fee_voided int := 0;
  v_yield_events_voided int := 0;
  v_dust_sweeps_voided int := 0;
  v_withdrawal_requests_voided int := 0;
  v_wr_id uuid;
  v_ref_match text[];
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::text));
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required for user %', p_admin_id;
  END IF;

  SELECT * INTO v_tx FROM public.transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided: %', p_transaction_id;
  END IF;

  UPDATE public.transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_transaction_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- CASCADE: fund_daily_aum
  UPDATE public.fund_daily_aum
  SET is_voided = true
  WHERE fund_id = v_tx.fund_id AND is_voided = false AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'AUM refresh failed for fund % date %: %', v_tx.fund_id, v_tx.tx_date, SQLERRM;
  END;

  -- CASCADE: fee_allocations
  UPDATE public.fee_allocations
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  -- CASCADE: ib_commission_ledger
  UPDATE public.ib_commission_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  -- CASCADE: platform_fee_ledger
  UPDATE public.platform_fee_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  -- CASCADE: investor_yield_events (guarded)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE public.investor_yield_events
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id
    WHERE (trigger_transaction_id = p_transaction_id OR reference_id = v_tx.reference_id)
      AND is_voided = false;
    GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;
  END IF;

  -- CASCADE: DUST transactions (BOTH frontend and backend patterns)
  IF v_tx.type = 'WITHDRAWAL' THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    PERFORM set_config('app.canonical_rpc', 'true', true);

    UPDATE public.transactions_v2
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: dust for withdrawal ' || p_transaction_id::text
    WHERE type IN ('DUST_SWEEP', 'DUST')
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND is_voided = false
      AND (
        reference_id LIKE 'dust-sweep-%' OR reference_id LIKE 'dust-credit-%'
        OR reference_id LIKE 'DUST_SWEEP_OUT:%' OR reference_id LIKE 'DUST_RECV:%'
      )
      AND (
        investor_id = v_tx.investor_id
        OR reference_id LIKE 'dust-credit-%'
        OR reference_id LIKE 'DUST_RECV:%'
      );
    GET DIAGNOSTICS v_dust_sweeps_voided = ROW_COUNT;
  END IF;

  -- CASCADE: withdrawal_requests (for WITHDRAWAL/INTERNAL_WITHDRAWAL types)
  -- Extract the withdrawal request ID from reference_id patterns: WR-{uuid}, WDR-{uuid}
  IF v_tx.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') AND v_tx.reference_id IS NOT NULL THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    PERFORM set_config('app.canonical_rpc', 'true', true);

    -- Try WR- pattern first
    v_ref_match := regexp_match(v_tx.reference_id, '(?:WR-|WDR-)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})');
    IF v_ref_match IS NOT NULL AND array_length(v_ref_match, 1) > 0 THEN
      v_wr_id := v_ref_match[1]::uuid;
      
      UPDATE public.withdrawal_requests
      SET status = 'voided',
          admin_notes = COALESCE(admin_notes, '') || 
            CASE WHEN admin_notes IS NOT NULL AND admin_notes != '' THEN ' | ' ELSE '' END ||
            'Voided via cascade from void_transaction(' || p_transaction_id::text || '): ' || p_reason
      WHERE id = v_wr_id
        AND status IN ('completed', 'processing');
      GET DIAGNOSTICS v_withdrawal_requests_voided = ROW_COUNT;
    END IF;
  END IF;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES ('VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'type', v_tx.type, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'voided_at', now(),
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'dust_sweeps_voided', v_dust_sweeps_voided,
      'withdrawal_requests_voided', v_withdrawal_requests_voided),
    jsonb_build_object('source', 'void_transaction_rpc'));

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transaction voided successfully',
    'transaction_id', p_transaction_id,
    'cascade_summary', jsonb_build_object(
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'dust_sweeps_voided', v_dust_sweeps_voided,
      'withdrawal_requests_voided', v_withdrawal_requests_voided
    )
  );
END;
$$;

-- PART 4: Update cascade_void_from_transaction trigger with withdrawal backup cascade
CREATE OR REPLACE FUNCTION public.cascade_void_from_transaction()
RETURNS TRIGGER AS $$
DECLARE
  v_ref_match text[];
  v_wr_id uuid;
BEGIN
  IF NEW.is_voided = true AND (OLD.is_voided IS NULL OR OLD.is_voided = false) THEN
    -- Existing cascade: data_edit_audit
    UPDATE data_edit_audit SET voided_record = true
    WHERE record_id = NEW.id::uuid AND table_name = 'transactions_v2';
    
    -- Existing cascade: fee_allocations
    UPDATE fee_allocations SET is_voided = true, voided_at = now(), voided_by = NEW.voided_by
    WHERE (debit_transaction_id = NEW.id OR credit_transaction_id = NEW.id) AND is_voided = false;

    -- NEW: Backup cascade to withdrawal_requests
    IF NEW.type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') AND NEW.reference_id IS NOT NULL THEN
      v_ref_match := regexp_match(NEW.reference_id, '(?:WR-|WDR-)([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})');
      IF v_ref_match IS NOT NULL AND array_length(v_ref_match, 1) > 0 THEN
        v_wr_id := v_ref_match[1]::uuid;
        -- Only cascade if canonical_rpc is set (avoid blocking on non-canonical updates)
        IF public.is_canonical_rpc() THEN
          UPDATE withdrawal_requests
          SET status = 'voided',
              admin_notes = COALESCE(admin_notes, '') ||
                CASE WHEN admin_notes IS NOT NULL AND admin_notes != '' THEN ' | ' ELSE '' END ||
                'Voided via trigger cascade from tx ' || NEW.id::text
          WHERE id = v_wr_id
            AND status IN ('completed', 'processing');
        END IF;
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- PART 5: Create integrity view for ghost completed withdrawals
CREATE OR REPLACE VIEW public.v_ghost_completed_withdrawals
WITH (security_invoker = true)
AS
SELECT
  wr.id AS withdrawal_request_id,
  wr.investor_id,
  wr.fund_id,
  wr.status AS wr_status,
  wr.requested_amount,
  wr.processed_at,
  COUNT(t.id) AS total_linked_txs,
  COUNT(t.id) FILTER (WHERE t.is_voided) AS voided_txs,
  COUNT(t.id) FILTER (WHERE NOT t.is_voided) AS active_txs
FROM withdrawal_requests wr
JOIN transactions_v2 t ON (
  t.reference_id LIKE 'WR-' || wr.id::text || '%'
  OR t.reference_id LIKE 'WDR-' || wr.id::text || '%'
)
WHERE wr.status = 'completed'
GROUP BY wr.id, wr.investor_id, wr.fund_id, wr.status, wr.requested_amount, wr.processed_at
HAVING COUNT(t.id) FILTER (WHERE NOT t.is_voided) = 0;

COMMENT ON VIEW public.v_ghost_completed_withdrawals IS 'Detects withdrawal_requests marked completed but with ALL linked transactions voided. These are ghost records that should have been cascaded to voided status.';

-- PART 6: Wire into run_integrity_pack
CREATE OR REPLACE FUNCTION public.run_integrity_pack(
  p_scope_fund_id uuid DEFAULT NULL,
  p_scope_investor_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_start_ts timestamptz := clock_timestamp();
  v_violations jsonb := '[]'::jsonb;
  v_run_id uuid;
  v_rec RECORD;
  v_status text := 'pass';
BEGIN
  INSERT INTO admin_integrity_runs (status, triggered_by, scope_fund_id, scope_investor_id, created_by)
  VALUES ('running', 'manual', p_scope_fund_id, p_scope_investor_id, auth.uid())
  RETURNING id INTO v_run_id;

  -- Check 1: Ledger reconciliation
  FOR v_rec IN
    SELECT * FROM v_ledger_reconciliation
    WHERE ABS(drift) > 0.01
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'ledger_reconciliation', 'severity', 'error',
      'investor_id', v_rec.investor_id, 'fund_id', v_rec.fund_id, 'drift', v_rec.drift
    );
    v_status := 'fail';
  END LOOP;

  -- Check 2: Fund AUM mismatch
  FOR v_rec IN
    SELECT * FROM fund_aum_mismatch
    WHERE ABS(discrepancy) > 0.01
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'fund_aum_mismatch', 'severity', 'warning',
      'fund_id', v_rec.fund_id, 'fund_name', v_rec.fund_name, 'discrepancy', v_rec.discrepancy
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 3: Yield distribution conservation
  FOR v_rec IN
    SELECT * FROM yield_distribution_conservation_check
    WHERE ABS(COALESCE(conservation_gap, 0)) > 0.00000001
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'yield_conservation', 'severity', 'error',
      'distribution_id', v_rec.distribution_id, 'conservation_gap', v_rec.conservation_gap
    );
    v_status := 'fail';
  END LOOP;

  -- Check 4: Orphaned transactions
  FOR v_rec IN
    SELECT * FROM v_orphaned_transactions
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'orphaned_transactions', 'severity', 'warning',
      'transaction_id', v_rec.id
    );
    IF v_status != 'fail' THEN v_status := 'warning'; END IF;
  END LOOP;

  -- Check 5 (NEW): Ghost completed withdrawals
  FOR v_rec IN
    SELECT * FROM v_ghost_completed_withdrawals
    LIMIT 50
  LOOP
    v_violations := v_violations || jsonb_build_object(
      'check', 'ghost_completed_withdrawals', 'severity', 'error',
      'withdrawal_request_id', v_rec.withdrawal_request_id,
      'investor_id', v_rec.investor_id,
      'fund_id', v_rec.fund_id,
      'total_linked_txs', v_rec.total_linked_txs,
      'voided_txs', v_rec.voided_txs
    );
    v_status := 'fail';
  END LOOP;

  UPDATE admin_integrity_runs
  SET status = v_status,
      violations = v_violations,
      runtime_ms = EXTRACT(MILLISECOND FROM (clock_timestamp() - v_start_ts))::integer
  WHERE id = v_run_id;

  RETURN jsonb_build_object(
    'run_id', v_run_id,
    'status', v_status,
    'violation_count', jsonb_array_length(v_violations),
    'violations', v_violations,
    'runtime_ms', EXTRACT(MILLISECOND FROM (clock_timestamp() - v_start_ts))::integer
  );
END;
$$;

-- Maintain permissions
ALTER FUNCTION public.void_transaction(uuid, uuid, text) OWNER TO postgres;
ALTER FUNCTION public.validate_withdrawal_transition(text, text) OWNER TO postgres;
ALTER FUNCTION public.guard_withdrawal_state_transitions() OWNER TO postgres;
ALTER FUNCTION public.cascade_void_from_transaction() OWNER TO postgres;
ALTER FUNCTION public.run_integrity_pack(uuid, uuid) OWNER TO postgres;

GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.validate_withdrawal_transition(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.run_integrity_pack(uuid, uuid) TO authenticated;
