-- ============================================================
-- P0 FIX: void_transaction must call recompute_investor_position
-- Date: 2026-04-17
-- ============================================================
-- The trg_ledger_sync trigger (fn_ledger_drives_position)
-- incrementally adjusts positions on UPDATE OF is_voided.
-- However, if the trigger has a type handler gap (as happened
-- with DUST_SWEEP before 20260417090000), the incremental
-- adjustment is wrong and the position drifts permanently.
--
-- This adds a full recompute_investor_position call AFTER the
-- void UPDATE as a safety net. Dual path:
--   1. Trigger fires: incremental position adjustment
--   2. recompute_investor_position: full SUM from ledger
--
-- The full recompute overwrites any incorrect incremental
-- result, guaranteeing position = ledger sum.
--
-- Trade-off: slightly slower void (extra SUM query), but
-- correctness > speed for voids (rare admin operation).
-- ============================================================

CREATE OR REPLACE FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_tx RECORD;
  v_aum_events_voided INT := 0;
  v_daily_aum_voided INT := 0;
  v_fee_allocations_voided INT := 0;
  v_ib_ledger_voided INT := 0;
  v_platform_fee_voided INT := 0;
  v_yield_events_voided INT := 0;
  v_distributions_voided INT := 0;
  v_result JSONB;
  v_affected_dist RECORD;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::TEXT));

  PERFORM set_config('indigo.canonical_rpc', 'true', TRUE);
  PERFORM set_config('app.canonical_rpc', 'true', TRUE);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required (JWT session check)';
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
  SET is_voided = TRUE,
      voided_at = NOW(),
      voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = p_reason
  WHERE id = p_transaction_id;

  -- trg_ledger_sync fires incrementally on UPDATE OF is_voided.
  -- Also call recompute_investor_position as safety net (dual path).
  -- This guarantees position = ledger sum even if trigger has gaps.
  PERFORM public.recompute_investor_position(v_tx.investor_id, v_tx.fund_id);

  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    UPDATE public.fund_aum_events
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT
    WHERE fund_id = v_tx.fund_id AND is_voided = FALSE
      AND ((v_tx.reference_id IS NOT NULL AND trigger_reference = v_tx.reference_id)
            OR (v_tx.reference_id IS NULL AND trigger_reference IS NULL
                AND event_date = v_tx.tx_date));
    GET DIAGNOSTICS v_aum_events_voided = ROW_COUNT;
  END IF;

  UPDATE public.fund_daily_aum
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT
  WHERE fund_id = v_tx.fund_id AND is_voided = FALSE AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  PERFORM public.recalculate_fund_aum_for_date(
    v_tx.fund_id, v_tx.tx_date, 'transaction'::aum_purpose, p_admin_id
  );

  UPDATE public.fee_allocations
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = FALSE;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  UPDATE public.ib_commission_ledger
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  UPDATE public.platform_fee_ledger
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::TEXT
  WHERE transaction_id = p_transaction_id AND is_voided = FALSE;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  UPDATE public.investor_yield_events
  SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id
  WHERE (trigger_transaction_id = p_transaction_id
         OR reference_id = v_tx.reference_id)
    AND is_voided = FALSE;
  GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;

  IF v_tx.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT') AND v_tx.distribution_id IS NOT NULL THEN
    UPDATE yield_distributions
    SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: all yield transactions voided from tx ' || p_transaction_id::TEXT
    WHERE id = v_tx.distribution_id
      AND is_voided = FALSE
      AND NOT EXISTS (
        SELECT 1 FROM transactions_v2 t
        WHERE t.distribution_id = v_tx.distribution_id
          AND t.type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT')
          AND t.is_voided = FALSE
          AND t.id != p_transaction_id
      );
    GET DIAGNOSTICS v_distributions_voided = ROW_COUNT;
  END IF;

  IF v_tx.type IN ('DEPOSIT', 'WITHDRAWAL') THEN
    FOR v_affected_dist IN
      SELECT yd.id FROM yield_distributions yd
      WHERE yd.fund_id = v_tx.fund_id
        AND yd.is_voided = FALSE
        AND yd.purpose = 'transaction'
        AND NOT EXISTS (
          SELECT 1 FROM transactions_v2 t
          WHERE t.distribution_id = yd.id
            AND t.type = 'YIELD'
            AND t.is_voided = FALSE
        )
        AND EXISTS (
          SELECT 1 FROM transactions_v2 t
          WHERE t.distribution_id = yd.id
            AND t.type = 'YIELD'
            AND t.is_voided = TRUE
        )
    LOOP
      UPDATE yield_distributions
      SET is_voided = TRUE, voided_at = NOW(), voided_by = p_admin_id,
          voided_by_profile_id = p_admin_id,
          void_reason = 'Cascade void: source ' || v_tx.type || ' ' || p_transaction_id::TEXT || ' voided, all yield txs orphaned'
      WHERE id = v_affected_dist.id;
      v_distributions_voided := v_distributions_voided + 1;
    END LOOP;
  END IF;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID', 'transactions_v2', p_transaction_id::TEXT, p_admin_id,
    JSONB_BUILD_OBJECT('is_voided', FALSE, 'type', v_tx.type, 'amount', v_tx.amount),
    JSONB_BUILD_OBJECT(
      'is_voided', TRUE, 'void_reason', p_reason, 'voided_at', NOW(),
      'aum_events_voided', v_aum_events_voided,
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'distributions_voided', v_distributions_voided,
      'position_recomputed', TRUE
    ),
    JSONB_BUILD_OBJECT(
      'source', 'void_transaction_rpc', 'cascade_v6', TRUE,
      'aum_recalculated', TRUE, 'isolation_model', 'advisory_xact_lock',
      'yield_distribution_cascade', TRUE,
      'dual_path_position_recompute', TRUE
    )
  );

  RETURN JSONB_BUILD_OBJECT(
    'success', TRUE,
    'transaction_id', p_transaction_id,
    'voided_at', NOW(),
    'aum_events_voided', v_aum_events_voided,
    'daily_aum_voided', v_daily_aum_voided,
    'fee_allocations_voided', v_fee_allocations_voided,
    'ib_ledger_voided', v_ib_ledger_voided,
    'platform_fee_voided', v_platform_fee_voided,
    'yield_events_voided', v_yield_events_voided,
    'distributions_voided', v_distributions_voided,
    'position_recomputed', TRUE,
    'message', 'Transaction voided atomically with full cascade, yield distribution cascade, AUM recalculation, and position recompute'
  );

EXCEPTION WHEN OTHERS THEN
  RAISE;
END;
$$;

ALTER FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") OWNER TO "postgres";

COMMENT ON FUNCTION "public"."void_transaction"("p_transaction_id" "uuid", "p_admin_id" "uuid", "p_reason" "text") IS 'Full cascade void: transactions_v2, fund_aum_events, fund_daily_aum, fee_allocations,
ib_commission_ledger, platform_fee_ledger, investor_yield_events, yield_distributions.
Recalculates AUM. Recomputes investor position (dual path with trg_ledger_sync trigger).
Concurrency: pg_advisory_xact_lock on transaction ID (auto-release at tx end).
v7.0 (2026-04-17): Added recompute_investor_position after void UPDATE as safety net.
Prevents position drift if fn_ledger_drives_position trigger has type handler gaps.';