-- Fix: void_yield_distribution should set status='voided' when voiding a distribution
-- This prevents the unique index idx_yield_distributions_unique_original from blocking re-inserts
-- (index condition is: distribution_type='original' AND status='applied')

CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void',
  p_void_crystals boolean DEFAULT false
) RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
  v_affected_investor RECORD;
BEGIN
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id, effective_date FROM yield_distributions WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
        UPDATE investor_yield_events SET is_voided = true
        WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
          AND is_voided = false;
      END IF;

      UPDATE yield_distributions SET is_voided = true, status = 'voided', voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND type IN ('YIELD', 'FEE_CREDIT', 'IB_CREDIT')
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'yield-' || p_distribution_id::text || '-%'
      OR reference_id = 'fee_credit_' || p_distribution_id::text
      OR reference_id = 'fee_credit_v5_' || p_distribution_id::text
      OR reference_id LIKE 'fee_credit-' || p_distribution_id::text || '-%'
      OR reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit-' || p_distribution_id::text || '-%'
    )
    AND NOT is_voided
    AND distribution_id IS NULL
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id
    WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  UPDATE yield_allocations
  SET is_voided = true, voided_at = NOW(),
      voided_by = p_admin_id, voided_by_profile_id = p_admin_id,
      void_reason = 'Cascade void from distribution ' || p_distribution_id::text
  WHERE distribution_id = p_distribution_id AND is_voided = false;

  UPDATE ib_allocations
  SET is_voided = true, voided_at = NOW(),
      voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE distribution_id = p_distribution_id AND is_voided = false;

  UPDATE platform_fee_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  -- Void the distribution itself (with status='voided')
  UPDATE yield_distributions
  SET is_voided = true, status = 'voided', voided_at = NOW(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_distribution_id;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE investor_yield_events SET is_voided = true
    WHERE trigger_transaction_id IN (
      SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true
    ) AND NOT is_voided;

    UPDATE investor_yield_events SET is_voided = true
    WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_dist.effective_date::text || ':%'
      AND is_voided = false
      AND NOT EXISTS (
        SELECT 1 FROM yield_distributions yd
        WHERE yd.fund_id = v_dist.fund_id
          AND yd.effective_date = v_dist.effective_date
          AND yd.is_voided = false
      );
  END IF;

  FOR v_affected_investor IN
    SELECT DISTINCT investor_id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND investor_id IS NOT NULL
  LOOP
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'status', 'voided', 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals,
      'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id,
      'lookup_method', 'distribution_id_primary_pattern_fallback')
  );

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'voided_count', v_voided_txs,
    'voided_crystals', v_voided_crystals
  );
END;
$$;