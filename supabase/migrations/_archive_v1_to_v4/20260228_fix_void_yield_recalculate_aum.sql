-- BUG FIX: void_yield_distribution must recalculate fund_daily_aum after voiding
-- ROOT CAUSE: V5 engine writes closing AUM to fund_daily_aum on effective_date.
-- When voided, the stale AUM persists, poisoning all subsequent get_fund_aum_as_of lookups.
-- Also fixes: investor_yield_events has no distribution_id column (was causing runtime error)

CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void'::text,
  p_void_crystals boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN
    RAISE EXCEPTION 'Distribution not found: %', p_distribution_id;
  END IF;
  IF v_dist.is_voided THEN
    RETURN json_build_object('success', true, 'message', 'Already voided');
  END IF;

  -- Handle crystallization children
  IF p_void_crystals THEN
    FOR v_crystal IN
      SELECT id, effective_date FROM yield_distributions
      WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      UPDATE investor_yield_events SET is_voided = true
      WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
        AND is_voided = false;

      UPDATE yield_distributions SET
        is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;

      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions
    SET consolidated_into_id = NULL
    WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- Void YIELD transactions
  FOR v_tx IN
    SELECT id, investor_id, amount FROM transactions_v2
    WHERE (
      reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void FEE_CREDIT transactions
  FOR v_tx IN
    SELECT id FROM transactions_v2
    WHERE (
      reference_id = 'fee_credit_' || p_distribution_id::text
      OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void IB_CREDIT transactions
  FOR v_tx IN
    SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void ledger entries
  UPDATE platform_fee_ledger SET is_voided = true
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE ib_commission_ledger SET is_voided = true
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE fee_allocations SET is_voided = true
  WHERE distribution_id = p_distribution_id AND NOT is_voided;
  GET DIAGNOSTICS v_voided_allocs = ROW_COUNT;

  UPDATE yield_allocations SET is_voided = true
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE ib_allocations SET is_voided = true
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  -- Void the distribution header
  UPDATE yield_distributions SET
    is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
    void_reason = p_reason
  WHERE id = p_distribution_id;

  -- Void investor_yield_events via trigger_transaction_id
  -- (investor_yield_events has NO distribution_id column)
  UPDATE investor_yield_events SET is_voided = true
  WHERE trigger_transaction_id IN (
    SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
      OR reference_id = 'fee_credit_' || p_distribution_id::text
      OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
      OR reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
    )
  ) AND NOT is_voided;

  -- Recalculate fund_daily_aum for the distribution's effective_date
  -- This removes the stale AUM written by the yield engine and rebuilds from positions
  PERFORM recalculate_fund_aum_for_date(
    v_dist.fund_id, v_dist.effective_date, 'transaction'::aum_purpose
  );
  IF v_dist.purpose = 'reporting' THEN
    PERFORM recalculate_fund_aum_for_date(
      v_dist.fund_id, v_dist.effective_date, 'reporting'::aum_purpose
    );
  END IF;

  -- Audit log
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object(
      'voided_txs', v_voided_txs,
      'voided_fee_allocations', v_voided_allocs,
      'voided_crystals', v_voided_crystals,
      'void_crystals_requested', p_void_crystals,
      'fund_id', v_dist.fund_id
    )
  );

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'voided_transactions', v_voided_txs,
    'voided_fee_allocations', v_voided_allocs,
    'voided_crystals', v_voided_crystals
  );
END;
$function$;
