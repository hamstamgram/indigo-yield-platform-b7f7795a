
-- Fix: recalculate_fund_aum_for_date signature mismatch (2 args, not 3)
CREATE OR REPLACE FUNCTION public.void_yield_distribution(
    p_distribution_id uuid,
    p_admin_id uuid,
    p_reason text,
    p_void_crystals boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_dist RECORD;
  v_affected_investor RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
BEGIN
  -- CRITICAL: Set canonical flags so trigger allows UPDATE/DELETE on transactions_v2
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- Acquire distribution-level lock
  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  -- Handle crystal distributions
  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id FROM yield_distributions
      WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from ' || p_distribution_id::text, consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL
    WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- Void ALL transactions linked to this distribution
  UPDATE transactions_v2
  SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason
  WHERE distribution_id = p_distribution_id AND NOT is_voided;
  GET DIAGNOSTICS v_voided_txs = ROW_COUNT;

  -- Void ledger entries
  UPDATE platform_fee_ledger SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE ib_commission_ledger SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE fee_allocations SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id AND NOT is_voided;
  GET DIAGNOSTICS v_voided_allocs = ROW_COUNT;

  UPDATE yield_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE ib_allocations SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id
  WHERE distribution_id = p_distribution_id AND NOT is_voided;

  -- Void distribution header LAST
  UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
    status = 'voided', void_reason = p_reason WHERE id = p_distribution_id;

  -- Recompute positions for all affected investors
  FOR v_affected_investor IN SELECT DISTINCT investor_id FROM transactions_v2 WHERE distribution_id = p_distribution_id LOOP
    PERFORM public.acquire_position_lock(v_dist.fund_id, v_affected_investor.investor_id);
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  -- Recalculate AUM using correct 2-argument signature
  PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);

  -- Audit log
  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta)
  VALUES (p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_fee_allocations', v_voided_allocs,
      'voided_crystals', v_voided_crystals, 'v6_first_principles', true, 'fund_id', v_dist.fund_id));

  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id,
    'voided_transactions', v_voided_txs, 'voided_fee_allocations', v_voided_allocs,
    'voided_crystals', v_voided_crystals);
END;
$function$;

-- Re-apply permissions
REVOKE ALL ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM anon, PUBLIC;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO authenticated, service_role;

NOTIFY pgrst, 'reload schema';
