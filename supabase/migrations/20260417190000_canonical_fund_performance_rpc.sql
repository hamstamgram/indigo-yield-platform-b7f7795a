-- ============================================================
-- CRITICAL FIX: Canonical RPC for updating investor_fund_performance
-- Date: 2026-04-17
-- ============================================================
-- The admin UI's updateFundPerformance writes directly to
-- investor_fund_performance without canonical_rpc flag,
-- balance equation validation, or audit trail.
--
-- This creates a canonical RPC that:
-- 1. Requires admin access (is_admin check)
-- 2. Sets canonical_rpc flag
-- 3. Validates the balance equation:
--    ending = beginning + additions - redemptions + net_income
-- 4. Logs changes to audit_log
-- 5. Rejects updates that violate the balance equation
--
-- The frontend should call this RPC instead of direct UPDATE.
-- ============================================================

CREATE OR REPLACE FUNCTION public.update_investor_fund_performance(
  p_performance_id uuid,
  p_admin_id uuid,
  p_mtd_beginning_balance numeric,
  p_mtd_ending_balance numeric,
  p_mtd_additions numeric,
  p_mtd_redemptions numeric,
  p_mtd_net_income numeric,
  p_mtd_rate_of_return numeric DEFAULT NULL,
  p_reason text DEFAULT 'Admin update via canonical RPC'
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_existing RECORD;
  v_balance_delta numeric;
  v_expected_ending numeric;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;

  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required for user %', p_admin_id;
  END IF;

  SELECT * INTO v_existing
  FROM investor_fund_performance
  WHERE id = p_performance_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Performance record not found: %', p_performance_id;
  END IF;

  v_expected_ending := p_mtd_beginning_balance + p_mtd_additions - p_mtd_redemptions + p_mtd_net_income;
  v_balance_delta := ABS(p_mtd_ending_balance - v_expected_ending);

  IF v_balance_delta > 0.0001 THEN
    RAISE EXCEPTION 'Balance equation violation: ending (%) != beginning (%) + additions (%) - redemptions (%) + net_income (%). Expected %, got %',
      p_mtd_ending_balance,
      p_mtd_beginning_balance,
      p_mtd_additions,
      p_mtd_redemptions,
      p_mtd_net_income,
      v_expected_ending,
      p_mtd_ending_balance;
  END IF;

  UPDATE investor_fund_performance
  SET mtd_beginning_balance = p_mtd_beginning_balance,
      mtd_ending_balance = p_mtd_ending_balance,
      mtd_additions = p_mtd_additions,
      mtd_redemptions = p_mtd_redemptions,
      mtd_net_income = p_mtd_net_income,
      mtd_rate_of_return = COALESCE(p_mtd_rate_of_return, mtd_rate_of_return),
      updated_at = NOW()
  WHERE id = p_performance_id;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'UPDATE', 'investor_fund_performance', p_performance_id::text, p_admin_id,
    jsonb_build_object(
      'mtd_beginning_balance', v_existing.mtd_beginning_balance,
      'mtd_ending_balance', v_existing.mtd_ending_balance,
      'mtd_additions', v_existing.mtd_additions,
      'mtd_redemptions', v_existing.mtd_redemptions,
      'mtd_net_income', v_existing.mtd_net_income,
      'mtd_rate_of_return', v_existing.mtd_rate_of_return
    ),
    jsonb_build_object(
      'mtd_beginning_balance', p_mtd_beginning_balance,
      'mtd_ending_balance', p_mtd_ending_balance,
      'mtd_additions', p_mtd_additions,
      'mtd_redemptions', p_mtd_redemptions,
      'mtd_net_income', p_mtd_net_income,
      'mtd_rate_of_return', COALESCE(p_mtd_rate_of_return, v_existing.mtd_rate_of_return)
    ),
    jsonb_build_object(
      'source', 'update_investor_fund_performance_rpc',
      'reason', p_reason,
      'balance_equation_validated', true,
      'balance_delta', v_balance_delta
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'performance_id', p_performance_id,
    'balance_equation_validated', true,
    'balance_delta', v_balance_delta
  );
END;
$$;

ALTER FUNCTION public.update_investor_fund_performance(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, text) OWNER TO postgres;

REVOKE ALL ON FUNCTION public.update_investor_fund_performance(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, text) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.update_investor_fund_performance(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, text) FROM anon;
GRANT EXECUTE ON FUNCTION public.update_investor_fund_performance(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, text) TO authenticated, service_role;

COMMENT ON FUNCTION public.update_investor_fund_performance(uuid, uuid, numeric, numeric, numeric, numeric, numeric, numeric, text) IS 'Update investor_fund_performance with balance equation validation. Admin-only. Sets canonical_rpc. Logs to audit_log.';