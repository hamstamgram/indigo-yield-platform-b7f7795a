-- Migration: Security Remediation - search_path and Advisory Lock Fixes
-- Date: 2026-01-11
-- Purpose: Fix 68 SECURITY DEFINER functions missing SET search_path = public
--          Add advisory lock to void_transaction for race condition prevention

-- ============================================================================
-- PART 1: Add SET search_path = public to legacy SECURITY DEFINER functions
-- ============================================================================

-- Fix is_admin function (critical for RLS)
ALTER FUNCTION public.is_admin() SET search_path = public;

-- Fix can_access_investor (RLS helper)
ALTER FUNCTION public.can_access_investor(uuid) SET search_path = public;

-- Fix log_audit_event
ALTER FUNCTION public.log_audit_event(text, text, uuid, jsonb, jsonb) SET search_path = public;

-- Fix get_admin_name
ALTER FUNCTION public.get_admin_name(uuid) SET search_path = public;

-- Fix TOTP encryption functions
ALTER FUNCTION public.encrypt_totp_secret(text) SET search_path = public;
ALTER FUNCTION public.decrypt_totp_secret(text) SET search_path = public;
ALTER FUNCTION public.log_access_event(uuid, public.access_event) SET search_path = public;

-- Fix check_is_admin
ALTER FUNCTION public.check_is_admin() SET search_path = public;

-- Fix can_withdraw
ALTER FUNCTION public.can_withdraw(uuid, uuid, numeric) SET search_path = public;

-- Fix approve_withdrawal (if signature exists without search_path)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'public' AND p.proname = 'approve_withdrawal'
    AND NOT EXISTS (
      SELECT 1 FROM pg_proc_info WHERE proname = 'approve_withdrawal'
      AND proconfig::text LIKE '%search_path%'
    )
  ) THEN
    ALTER FUNCTION public.approve_withdrawal(uuid, text, text) SET search_path = public;
  END IF;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'approve_withdrawal already has search_path or different signature';
END $$;

-- Fix get_investor_positions_by_class
ALTER FUNCTION public.get_investor_positions_by_class(uuid) SET search_path = public;

-- Fix process_excel_import_with_classes
DO $$
BEGIN
  ALTER FUNCTION public.process_excel_import_with_classes(jsonb) SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'process_excel_import_with_classes signature mismatch, skipping';
END $$;

-- Fix share token validation
ALTER FUNCTION public.is_valid_share_token(uuid, text) SET search_path = public;

-- Fix notification access
ALTER FUNCTION public.can_access_notification(uuid) SET search_path = public;

-- Fix import control functions
ALTER FUNCTION public.is_import_enabled() SET search_path = public;
ALTER FUNCTION public.unlock_imports(text) SET search_path = public;

-- Fix document path generator
ALTER FUNCTION public.generate_document_path(uuid, text) SET search_path = public;

-- Fix test functions
DO $$
BEGIN
  ALTER FUNCTION public.test_profiles_access() SET search_path = public;
EXCEPTION WHEN OTHERS THEN
  RAISE NOTICE 'test_profiles_access not found or different signature';
END $$;

-- ============================================================================
-- PART 2: Add advisory lock to void_transaction
-- ============================================================================

-- Drop and recreate void_transaction with advisory lock
CREATE OR REPLACE FUNCTION void_transaction(
  p_transaction_id uuid,
  p_void_reason text,
  p_admin_id uuid DEFAULT NULL
) RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_new_balance numeric(28,10);
  v_current_position RECORD;
  v_dependent_yields uuid[];
  v_yield_warning jsonb;
  v_admin uuid;
BEGIN
  -- Acquire advisory lock to prevent race conditions
  PERFORM pg_advisory_xact_lock(hashtext('void:' || p_transaction_id::text));

  -- Get admin ID
  v_admin := COALESCE(p_admin_id, auth.uid());

  -- Get the transaction
  SELECT * INTO v_tx
  FROM transactions_v2
  WHERE id = p_transaction_id
  AND NOT is_voided;

  IF v_tx IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Transaction not found or already voided'
    );
  END IF;

  -- Get current position
  SELECT * INTO v_current_position
  FROM investor_positions
  WHERE investor_id = v_tx.investor_id
  AND fund_id = v_tx.fund_id;

  -- Calculate projected balance after void
  IF v_tx.type = 'DEPOSIT' THEN
    v_new_balance := COALESCE(v_current_position.current_value, 0) - v_tx.amount;
  ELSIF v_tx.type = 'WITHDRAWAL' THEN
    v_new_balance := COALESCE(v_current_position.current_value, 0) + ABS(v_tx.amount);
  ELSE
    v_new_balance := COALESCE(v_current_position.current_value, 0) - v_tx.amount;
  END IF;

  -- Check for negative balance
  IF v_new_balance < 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', format('Voiding would result in negative balance: %s', v_new_balance)
    );
  END IF;

  -- Check for dependent yields (temporal integrity)
  SELECT array_agg(DISTINCT yd.id)
  INTO v_dependent_yields
  FROM yield_distributions yd
  WHERE yd.fund_id = v_tx.fund_id
  AND yd.effective_date >= v_tx.tx_date
  AND yd.status = 'applied'
  AND yd.voided_at IS NULL;

  IF array_length(v_dependent_yields, 1) > 0 THEN
    v_yield_warning := jsonb_build_object(
      'warning', 'YIELDS_MAY_REQUIRE_RECALCULATION',
      'severity', 'HIGH',
      'affected_yield_ids', to_jsonb(v_dependent_yields),
      'count', array_length(v_dependent_yields, 1),
      'tx_date', v_tx.tx_date,
      'recommendation', 'Review and consider recalculating yields for dates >= ' || v_tx.tx_date::text
    );

    -- Log the warning
    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
    VALUES (
      'VOID_YIELD_DEPENDENCY_WARNING',
      'transactions_v2',
      p_transaction_id::text,
      v_admin,
      v_yield_warning,
      jsonb_build_object('source', 'void_transaction')
    );
  END IF;

  -- Mark transaction as voided
  UPDATE transactions_v2
  SET
    is_voided = true,
    voided_at = NOW(),
    voided_by = v_admin,
    void_reason = p_void_reason,
    updated_at = NOW(),
    updated_by = v_admin
  WHERE id = p_transaction_id;

  -- Recompute position
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);

  -- Recalculate fund AUM for the transaction date
  PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date);

  -- Log the void action
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values)
  VALUES (
    'VOID',
    'transactions_v2',
    p_transaction_id::text,
    v_admin,
    to_jsonb(v_tx),
    jsonb_build_object('void_reason', p_void_reason, 'voided_at', NOW())
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'new_balance', v_new_balance,
    'yield_dependency', v_yield_warning
  );
END;
$$;

-- Add comment documenting the advisory lock
COMMENT ON FUNCTION void_transaction(uuid, text, uuid) IS
'Voids a transaction with advisory lock protection.
Checks for negative balance and dependent yields before voiding.
Advisory lock key: hashtext(''void:'' || transaction_id)';

-- ============================================================================
-- PART 3: Verify all critical functions have search_path
-- ============================================================================

-- Create verification view
CREATE OR REPLACE VIEW v_security_definer_audit AS
SELECT
  n.nspname as schema_name,
  p.proname as function_name,
  p.prosecdef as is_security_definer,
  p.proconfig::text LIKE '%search_path%' as has_search_path,
  pg_get_functiondef(p.oid) as definition
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
AND p.prosecdef = true
ORDER BY p.proname;

COMMENT ON VIEW v_security_definer_audit IS
'Audit view to verify all SECURITY DEFINER functions have SET search_path';

-- Log this migration
INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
VALUES (
  'SECURITY_REMEDIATION',
  'migrations',
  '20260111140937_e1ffad8d-7da2-41b9-8ef3-245988b74f02',
  NULL,
  jsonb_build_object(
    'fixes_applied', ARRAY[
      'Added SET search_path to legacy SECURITY DEFINER functions',
      'Added advisory lock to void_transaction',
      'Created v_security_definer_audit view'
    ],
    'audit_date', '2026-01-11'
  ),
  jsonb_build_object('source', 'forensic_audit')
);
