-- ============================================================================
-- P0 Security Fixes - Launch Critical
-- Date: 2026-02-19
-- Purpose: Add admin authorization checks to critical RPCs, consolidate admin
--          check functions, and revoke direct authenticated access to internal
--          subroutine RPCs.
-- Idempotent: Safe to run multiple times (CREATE OR REPLACE, IF NOT EXISTS)
-- ============================================================================

-- ============================================================================
-- P0-6: Consolidate admin check functions
-- ============================================================================

-- Create canonical is_admin_v2() that ONLY checks user_roles (no profiles fallback)
CREATE OR REPLACE FUNCTION public.is_admin_v2()
RETURNS boolean
LANGUAGE plpgsql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
    AND p.status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin_v2() IS 'CANONICAL ADMIN CHECK V2: Checks user_roles only (no profiles.is_admin fallback). Requires active profile status. Use this for all new code.';

-- Fix is_admin(uuid) overload: remove profiles.is_admin and profiles.role checks,
-- use user_roles only
CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
RETURNS boolean
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = p_user_id
    AND ur.role IN ('admin', 'super_admin')
    AND p.status = 'active'
  );
$$;

COMMENT ON FUNCTION public.is_admin(uuid) IS 'ADMIN CHECK BY USER ID: Checks user_roles table for admin/super_admin role with active profile status. No longer falls back to profiles.is_admin or profiles.role.';

-- Fix is_admin_safe(): add active status check via profiles join
CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER STABLE
SET search_path TO 'public'
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.user_roles ur
    JOIN public.profiles p ON p.id = ur.user_id
    WHERE ur.user_id = auth.uid()
    AND ur.role IN ('admin', 'super_admin')
    AND p.status = 'active'
  );
END;
$$;

COMMENT ON FUNCTION public.is_admin_safe() IS 'SECURITY DEFINER VARIANT: Safe version of is_admin() for use in views and triggers. Now includes active profile status check.';


-- ============================================================================
-- P0-1: Add admin check to void_yield_distribution
-- ============================================================================

CREATE OR REPLACE FUNCTION public.void_yield_distribution(
  p_distribution_id uuid,
  p_admin_id uuid,
  p_reason text DEFAULT 'Administrative void'::text,
  p_void_crystals boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_dist RECORD; v_voided_txs int := 0; v_voided_allocs int := 0; v_voided_crystals int := 0; v_crystal RECORD; v_tx RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- P0-1: Admin authorization check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can void yield distributions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id, effective_date FROM yield_distributions WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      UPDATE investor_yield_events SET is_voided = true WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%' AND is_voided = false;
      UPDATE fund_aum_events SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE fund_id = v_dist.fund_id AND trigger_reference LIKE '%' || v_crystal.id::text || '%' AND NOT is_voided;
      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = 'Cascade void from distribution ' || p_distribution_id::text, consolidated_into_id = NULL WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  FOR v_tx IN SELECT id, investor_id, amount FROM transactions_v2 WHERE (reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%' OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%') AND NOT is_voided
  LOOP UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id; v_voided_txs := v_voided_txs + 1; END LOOP;

  FOR v_tx IN SELECT id FROM transactions_v2 WHERE (reference_id = 'fee_credit_' || p_distribution_id::text OR reference_id = 'fee_credit_v5_' || p_distribution_id::text) AND NOT is_voided
  LOOP UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id; v_voided_txs := v_voided_txs + 1; END LOOP;

  FOR v_tx IN SELECT id FROM transactions_v2 WHERE (reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%' OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%') AND NOT is_voided
  LOOP UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id; v_voided_txs := v_voided_txs + 1; END LOOP;

  UPDATE platform_fee_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason WHERE id = p_distribution_id;

  UPDATE investor_yield_events SET is_voided = true WHERE trigger_transaction_id IN (SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true) AND NOT is_voided;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals, 'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id)
  );

  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id, 'voided_transactions', v_voided_txs, 'voided_crystals', v_voided_crystals);
END;
$$;


-- ============================================================================
-- P0-2: Fix apply_adb_yield_distribution_v3 admin check
-- Uses dynamic patching via pg_get_functiondef() to preserve all changes
-- from later migrations while replacing the weak NULL-UID check with
-- a proper is_admin() authorization gate.
-- ============================================================================

DO $patch$
DECLARE
  v_func_oid oid;
  v_old_src text;
  v_new_src text;
  v_old_check text := 'IF v_admin IS NULL THEN' || E'\n' || '    RAISE EXCEPTION ''Admin authentication required'';' || E'\n' || '  END IF;';
  v_new_check text := '-- P0-2: Proper admin authorization check (replaces NULL UID check)' || E'\n' || '  IF NOT public.is_admin() THEN' || E'\n' || '    RAISE EXCEPTION ''Access denied: Only administrators can distribute yield''' || E'\n' || '      USING ERRCODE = ''insufficient_privilege'';' || E'\n' || '  END IF;';
BEGIN
  -- Find the function OID (the specific overload with 8 params)
  SELECT p.oid INTO v_func_oid
  FROM pg_proc p
  JOIN pg_namespace n ON p.pronamespace = n.oid
  WHERE n.nspname = 'public'
    AND p.proname = 'apply_adb_yield_distribution_v3'
    AND pg_get_function_arguments(p.oid) LIKE '%p_fund_id%p_period_start%p_period_end%p_gross_yield_amount%';

  IF v_func_oid IS NULL THEN
    RAISE NOTICE 'apply_adb_yield_distribution_v3 function not found, skipping patch';
    RETURN;
  END IF;

  -- Get current function source
  v_old_src := pg_get_functiondef(v_func_oid);

  -- Check if already patched
  IF v_old_src LIKE '%public.is_admin()%' THEN
    RAISE NOTICE 'apply_adb_yield_distribution_v3 already has is_admin() check, skipping';
    RETURN;
  END IF;

  -- Try multiple patterns for the old check (whitespace may vary)
  -- Pattern 1: exact match
  IF v_old_src LIKE '%IF v_admin IS NULL THEN%Admin authentication required%END IF;%' THEN
    v_new_src := regexp_replace(
      v_old_src,
      'IF v_admin IS NULL THEN\s*\n\s*RAISE EXCEPTION ''Admin authentication required'';\s*\n\s*END IF;',
      v_new_check,
      'g'
    );

    -- Execute the patched function definition
    EXECUTE v_new_src;
    RAISE NOTICE 'P0-2: Successfully patched apply_adb_yield_distribution_v3 admin check';
  ELSE
    RAISE WARNING 'P0-2: Could not find expected admin check pattern in apply_adb_yield_distribution_v3. Manual review required.';
  END IF;
END;
$patch$;


-- ============================================================================
-- P0-3: Add admin check to apply_daily_yield_with_validation
-- Same dynamic patching approach to preserve any later-migration changes.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.apply_daily_yield_with_validation(
  p_fund_id uuid,
  p_yield_date date,
  p_gross_yield_pct numeric,
  p_created_by uuid,
  p_purpose text DEFAULT 'transaction'::text,
  p_skip_validation boolean DEFAULT false
)
RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_validation JSONB;
  v_result JSONB;
BEGIN
  -- P0-3: Admin authorization check
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'Access denied: Only administrators can apply daily yield'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  IF p_yield_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'FUTURE_DATE_NOT_ALLOWED: Cannot distribute yield for future dates (% > %)', p_yield_date, CURRENT_DATE;
  END IF;

  IF NOT p_skip_validation THEN
    SELECT validate_pre_yield_aum(p_fund_id, 1.0) INTO v_validation;
    IF NOT (v_validation->>'is_valid')::boolean THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'Pre-yield validation failed',
        'validation_errors', v_validation->'errors',
        'validation_warnings', v_validation->'warnings',
        'recorded_aum', v_validation->'recorded_aum',
        'calculated_aum', v_validation->'calculated_aum'
      );
    END IF;
  END IF;

  SELECT apply_daily_yield_to_fund_v3(
    p_fund_id, p_yield_date, p_gross_yield_pct, p_created_by, p_purpose::TEXT
  ) INTO v_result;

  IF v_validation IS NOT NULL THEN
    v_result := v_result || jsonb_build_object('validation', v_validation);
  END IF;

  RETURN v_result;
END;
$$;

COMMENT ON FUNCTION public.apply_daily_yield_with_validation(uuid, date, numeric, uuid, text, boolean) IS 'CANONICAL: Apply daily yield with explicit validation control and admin authorization. Allows skipping validation for batch operations or corrections where preconditions are pre-verified. Called by: Internal yield correction flows';


-- ============================================================================
-- P0-4: Revoke authenticated access from crystallization subroutine functions
-- These are internal subroutines called by other RPCs, not meant for direct
-- user invocation. Revoking is safer than adding internal checks (which
-- could break the subroutine calls from other SECURITY DEFINER functions).
-- ============================================================================

-- crystallize_yield_before_flow: called internally by apply_transaction_with_crystallization,
-- apply_deposit_with_crystallization, apply_withdrawal_with_crystallization, etc.
REVOKE EXECUTE ON FUNCTION public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamp with time zone, uuid, public.aum_purpose) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamp with time zone, uuid, public.aum_purpose) FROM anon;

-- Ensure service_role retains access (SECURITY DEFINER functions use postgres role,
-- but explicit grant for clarity)
GRANT EXECUTE ON FUNCTION public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamp with time zone, uuid, public.aum_purpose) TO service_role;


-- Belt-and-suspenders: Also REVOKE authenticated access from apply_adb_yield_distribution_v3
-- In case the dynamic P0-2 patch above did not match the exact whitespace pattern,
-- this ensures the function cannot be called directly by non-service-role users.
REVOKE EXECUTE ON FUNCTION public.apply_adb_yield_distribution_v3(uuid, date, date, numeric, uuid, public.aum_purpose, date, numeric) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_adb_yield_distribution_v3(uuid, date, date, numeric, uuid, public.aum_purpose, date, numeric) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_adb_yield_distribution_v3(uuid, date, date, numeric, uuid, public.aum_purpose, date, numeric) TO service_role;

-- Also revoke void_yield_distribution from anon (it has the internal check but
-- belt-and-suspenders is important for critical financial RPCs)
REVOKE EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO service_role;

-- ============================================================================
-- P1-7: Complete the RPC revocation migration
-- Add REVOKE statements for additional sensitive RPCs
-- ============================================================================

-- apply_daily_yield_with_validation: now has internal admin check (P0-3) + revoke
REVOKE EXECUTE ON FUNCTION public.apply_daily_yield_with_validation(uuid, date, numeric, uuid, text, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.apply_daily_yield_with_validation(uuid, date, numeric, uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.apply_daily_yield_with_validation(uuid, date, numeric, uuid, text, boolean) TO service_role;

-- batch_crystallize_fund: internal batch operation
REVOKE EXECUTE ON FUNCTION public.batch_crystallize_fund(uuid, date, boolean) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.batch_crystallize_fund(uuid, date, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.batch_crystallize_fund(uuid, date, boolean) TO service_role;

-- crystallize_month_end: internal month-end operation
REVOKE EXECUTE ON FUNCTION public.crystallize_month_end(uuid, date, numeric, uuid) FROM authenticated;
REVOKE EXECUTE ON FUNCTION public.crystallize_month_end(uuid, date, numeric, uuid) FROM anon;
GRANT EXECUTE ON FUNCTION public.crystallize_month_end(uuid, date, numeric, uuid) TO service_role;


-- ============================================================================
-- Verification comments
-- ============================================================================
-- After applying this migration:
-- 1. void_yield_distribution: has is_admin() check at top
-- 2. apply_adb_yield_distribution_v3: has is_admin() check (replaces NULL check)
-- 3. apply_daily_yield_with_validation: has is_admin() check at top
-- 4. crystallize_yield_before_flow: revoked from authenticated/anon
-- 5. is_admin(uuid): now checks user_roles only (no profiles.is_admin fallback)
-- 6. is_admin_safe(): now includes active profile status check
-- 7. is_admin_v2(): new canonical function checking user_roles only
-- 8. batch_crystallize_fund, crystallize_month_end: revoked from authenticated/anon
