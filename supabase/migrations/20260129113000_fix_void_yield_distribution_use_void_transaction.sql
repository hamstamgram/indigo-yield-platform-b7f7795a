CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void'::text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dist RECORD;
  v_is_admin boolean;
  v_voided_yield_count int := 0;
  v_voided_fee_credit_count int := 0;
  v_voided_ib_credit_count int := 0;
  v_voided_ib_allocations_count int := 0;
  v_tx RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Check if the provided admin_id is actually an admin
  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RETURN json_build_object('success', false, 'error', 'Admin privileges required');
  END IF;

  -- Get distribution details
  SELECT * INTO v_dist
  FROM yield_distributions
  WHERE id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  IF NOT FOUND THEN
    RETURN json_build_object('success', false, 'error', 'Yield distribution not found or already voided');
  END IF;

  -- =========================================================================
  -- 1. Void all YIELD transactions (void_transaction handles position reversal)
  -- =========================================================================
  FOR v_tx IN
    SELECT * FROM transactions_v2
    WHERE reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
      AND is_voided = false
  LOOP
    PERFORM void_transaction(v_tx.id, p_admin_id, 'Yield distribution voided: ' || p_reason);
    v_voided_yield_count := v_voided_yield_count + 1;
  END LOOP;

  -- =========================================================================
  -- 2. Void FEE_CREDIT transactions (void_transaction handles position reversal)
  -- =========================================================================
  FOR v_tx IN
    SELECT * FROM transactions_v2
    WHERE reference_id = 'fee_credit_' || p_distribution_id::text
      AND is_voided = false
  LOOP
    PERFORM void_transaction(v_tx.id, p_admin_id, 'Yield distribution voided: ' || p_reason);
    v_voided_fee_credit_count := v_voided_fee_credit_count + 1;
  END LOOP;

  -- =========================================================================
  -- 3. Void IB_CREDIT transactions (void_transaction handles position reversal)
  -- =========================================================================
  FOR v_tx IN
    SELECT * FROM transactions_v2
    WHERE reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      AND is_voided = false
  LOOP
    PERFORM void_transaction(v_tx.id, p_admin_id, 'Yield distribution voided: ' || p_reason);
    v_voided_ib_credit_count := v_voided_ib_credit_count + 1;
  END LOOP;

  -- =========================================================================
  -- 4. Void platform_fee_ledger entries
  -- =========================================================================
  UPDATE platform_fee_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Yield distribution voided: ' || p_reason
  WHERE yield_distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  -- =========================================================================
  -- 5. Void ib_commission_ledger entries
  -- =========================================================================
  UPDATE ib_commission_ledger
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
      void_reason = 'Yield distribution voided: ' || p_reason
  WHERE yield_distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  -- =========================================================================
  -- 6. Void ib_allocations entries
  -- =========================================================================
  UPDATE ib_allocations
  SET is_voided = true
  WHERE distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);
  GET DIAGNOSTICS v_voided_ib_allocations_count = ROW_COUNT;

  -- =========================================================================
  -- 7. Void yield allocations
  -- =========================================================================
  UPDATE yield_allocations
  SET is_voided = true
  WHERE distribution_id = p_distribution_id AND (is_voided = false OR is_voided IS NULL);

  -- =========================================================================
  -- 8. Void the distribution itself
  -- =========================================================================
  UPDATE yield_distributions
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason
  WHERE id = p_distribution_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES ('VOID_YIELD_DISTRIBUTION', 'yield_distributions', p_distribution_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'net_yield', v_dist.net_yield, 'total_fees', v_dist.total_fees, 'total_ib', v_dist.total_ib),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason,
      'voided_yield_transactions', v_voided_yield_count,
      'voided_fee_credit_transactions', v_voided_fee_credit_count,
      'voided_ib_credit_transactions', v_voided_ib_credit_count,
      'voided_ib_allocations', v_voided_ib_allocations_count));

  RETURN json_build_object(
    'success', true,
    'distribution_id', p_distribution_id,
    'fund_id', v_dist.fund_id,
    'period_end', v_dist.period_end,
    'original_net_yield', v_dist.net_yield,
    'original_total_fees', v_dist.total_fees,
    'original_total_ib', v_dist.total_ib,
    'voided_yield_transactions', v_voided_yield_count,
    'voided_fee_credit_transactions', v_voided_fee_credit_count,
    'voided_ib_credit_transactions', v_voided_ib_credit_count,
    'voided_ib_allocations', v_voided_ib_allocations_count,
    'allocations_voided', true,
    'fee_ledger_voided', true,
    'ib_ledger_voided', true
  );
EXCEPTION
  WHEN OTHERS THEN
    RETURN json_build_object('success', false, 'error', SQLERRM, 'error_code', SQLSTATE);
END;
$function$;
