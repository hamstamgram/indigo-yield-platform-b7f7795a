-- P0 RELEASE BLOCKER FIX: void_yield_distribution response field mismatch
-- Issue: RPC returns 'voided_transactions' but frontend expects 'voided_count'
-- Impact: Admin sees false "0 voided allocations" in success state despite cascade working
-- Evidence: https://docs/audit/37-frontend-backend-contract-mismatch-matrix.md (P0-1)

-- DROP first (return type check requires full drop)
DROP FUNCTION IF EXISTS public.void_yield_distribution(uuid, uuid, text, boolean);

CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void',
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
  v_affected_investor RECORD;
BEGIN
  -- P0 Security: Verify caller is admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Advisory lock to prevent concurrent void of the same distribution
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

      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- Void YIELD transactions
  FOR v_tx IN SELECT id, investor_id, amount FROM transactions_v2
    WHERE (reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
        OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%')
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void FEE_CREDIT transactions
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (reference_id = 'fee_credit_' || p_distribution_id::text
        OR reference_id = 'fee_credit_v5_' || p_distribution_id::text)
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void IB_CREDIT transactions (pattern match + fallback by distribution_id)
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
      OR (distribution_id = p_distribution_id AND type = 'IB_CREDIT')
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  UPDATE platform_fee_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason WHERE id = p_distribution_id;

  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE investor_yield_events SET is_voided = true
    WHERE trigger_transaction_id IN (SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true)
      AND NOT is_voided;
  END IF;

  -- Recompute positions for all affected investors
  FOR v_affected_investor IN
    SELECT DISTINCT investor_id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND investor_id IS NOT NULL
  LOOP
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  -- Recompute AUM for the distribution's effective date
  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);
  EXCEPTION WHEN OTHERS THEN
    NULL;
  END;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals, 'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id)
  );

  -- FIX: Renamed 'voided_transactions' to 'voided_count' to match frontend expectation
  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id, 'voided_count', v_voided_txs, 'voided_crystals', v_voided_crystals);
END;
$function$;

-- Re-apply grants
REVOKE ALL ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO service_role;
