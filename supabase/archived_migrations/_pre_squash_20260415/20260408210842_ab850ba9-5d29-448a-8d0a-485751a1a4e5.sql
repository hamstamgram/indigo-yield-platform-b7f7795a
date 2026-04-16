-- =============================================================
-- P0-NEW-1: Backfill user_roles for investors missing rows
-- =============================================================
INSERT INTO public.user_roles (user_id, role)
SELECT p.id, 'user'::app_role
FROM public.profiles p
LEFT JOIN public.user_roles ur ON ur.user_id = p.id
WHERE ur.id IS NULL
  AND (p.is_system_account = false OR p.is_system_account IS NULL)
ON CONFLICT (user_id, role) DO NOTHING;

-- =============================================================
-- P0-NEW-2: Fix ensure_admin() to allow service_role bypass
-- =============================================================
CREATE OR REPLACE FUNCTION public.ensure_admin()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Allow privileged database roles through (cron, edge functions, MCP)
  IF current_user IN ('postgres', 'supabase_admin', 'service_role') THEN
    RETURN;
  END IF;
  IF (SELECT rolsuper FROM pg_roles WHERE rolname = current_user) THEN
    RETURN;
  END IF;

  -- Normal users must be admin
  IF NOT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  ) THEN
    RAISE EXCEPTION 'Admin only operation';
  END IF;
END;
$$;

-- =============================================================
-- P0-NEW-2: Fix audit_leakage_report() admin guard
-- =============================================================
-- We replace just the guard at the top. Get full function and rebuild.
CREATE OR REPLACE FUNCTION public.audit_leakage_report()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $function$
DECLARE
  v_result jsonb := '{}'::jsonb;
  v_check_1 jsonb;
  v_check_2 jsonb;
  v_check_3 jsonb;
  v_check_4 jsonb;
  v_asymmetric_count integer := 0;
  v_negative_cb_count integer := 0;
  v_fee_mismatch_count integer := 0;
  v_ib_mismatch_count integer := 0;
BEGIN
  -- Admin/service_role guard
  IF current_user NOT IN ('postgres', 'supabase_admin', 'service_role')
     AND NOT public.is_admin()
  THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin access required'
      USING ERRCODE = 'P0001';
  END IF;

  -- Check 1: Asymmetric voids (voided withdrawal but unvoided DUST_SWEEP credit)
  SELECT count(*) INTO v_asymmetric_count
  FROM transactions_v2 t1
  JOIN transactions_v2 t2 ON t1.investor_id = t2.investor_id
    AND t1.fund_id = t2.fund_id
  WHERE t1.is_voided = true
    AND t2.is_voided = false
    AND t1.type IN ('WITHDRAWAL', 'REDEMPTION')
    AND t2.type IN ('DUST_SWEEP', 'ADJUSTMENT')
    AND t2.meta->>'related_tx' = t1.id::text;

  v_check_1 := jsonb_build_object(
    'check', 'asymmetric_voids',
    'status', CASE WHEN v_asymmetric_count = 0 THEN 'pass' ELSE 'fail' END,
    'violations', v_asymmetric_count
  );

  -- Check 2: Negative cost basis
  SELECT count(*) INTO v_negative_cb_count
  FROM investor_positions
  WHERE cost_basis < 0 AND is_active = true;

  v_check_2 := jsonb_build_object(
    'check', 'negative_cost_basis',
    'status', CASE WHEN v_negative_cb_count = 0 THEN 'pass' ELSE 'fail' END,
    'violations', v_negative_cb_count
  );

  -- Check 3: Fee allocation leakage
  SELECT count(*) INTO v_fee_mismatch_count
  FROM fee_allocations fa
  JOIN yield_distributions yd ON fa.distribution_id = yd.id
  WHERE fa.is_voided = false AND yd.is_voided = false
    AND fa.fee_amount <= 0;

  v_check_3 := jsonb_build_object(
    'check', 'fee_allocation_leakage',
    'status', CASE WHEN v_fee_mismatch_count = 0 THEN 'pass' ELSE 'fail' END,
    'violations', v_fee_mismatch_count
  );

  -- Check 4: IB commission leakage
  SELECT count(*) INTO v_ib_mismatch_count
  FROM ib_commission_ledger icl
  WHERE icl.is_voided = false
    AND icl.ib_commission_amount <= 0;

  v_check_4 := jsonb_build_object(
    'check', 'ib_commission_leakage',
    'status', CASE WHEN v_ib_mismatch_count = 0 THEN 'pass' ELSE 'fail' END,
    'violations', v_ib_mismatch_count
  );

  v_result := jsonb_build_object(
    'overall_status', CASE
      WHEN v_asymmetric_count = 0
        AND v_negative_cb_count = 0
        AND v_fee_mismatch_count = 0
        AND v_ib_mismatch_count = 0
      THEN 'pass' ELSE 'fail' END,
    'checks', jsonb_build_array(v_check_1, v_check_2, v_check_3, v_check_4),
    'run_at', now()
  );

  RETURN v_result;
END;
$function$;

-- =============================================================
-- P0-NEW-2: Fix run_invariant_checks() admin guard
-- Get its full body and just replace the guard
-- =============================================================
-- We need the full function. Since we can't read it all here,
-- we'll do a targeted replacement by recreating just the guard wrapper.
-- Actually, let's create a helper that both functions can call:

-- Instead of rewriting the entire run_invariant_checks function,
-- let's just note that it calls is_admin() directly.
-- The cleanest fix: make is_admin() itself return true for service_role.

-- BETTER APPROACH: Fix is_admin() to handle service_role
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    -- Service-level roles are always admin
    current_user IN ('postgres', 'supabase_admin', 'service_role')
    OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid()
      AND role IN ('admin'::app_role, 'super_admin'::app_role)
    );
$$;

-- =============================================================
-- P1-2: Drop 4 duplicate indexes
-- =============================================================
DROP INDEX IF EXISTS public.idx_tx_v2_fund_date;
DROP INDEX IF EXISTS public.idx_transactions_v2_reference_unique;
DROP INDEX IF EXISTS public.idx_investor_positions_fund;
DROP INDEX IF EXISTS public.idx_fee_alloc_distribution;