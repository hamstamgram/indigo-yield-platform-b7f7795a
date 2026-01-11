-- Migration: Ground Truth Remediation
-- Date: 2026-01-11
-- Source: Verification Report (docs/VERIFICATION_REPORT_2026-01-11.md)
-- Purpose: Address gaps identified by direct database verification
--
-- Gaps Remediated:
--   1. void_transaction missing advisory lock (HIGH PRIORITY)
--   2. v_security_definer_audit view missing (HIGH PRIORITY)

-- ============================================================================
-- PART 1: Add Advisory Lock to void_transaction
-- ============================================================================
-- Risk: Race condition when multiple void operations target same transaction
-- Solution: Add pg_advisory_xact_lock at function start

CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_reason text,
  p_actor_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_actor uuid;
  v_projected_balance numeric(28,10);
  v_aum_result jsonb;
  v_dependent_yields uuid[];
  v_yield_warning jsonb := NULL;
BEGIN
  -- REMEDIATION: Acquire advisory lock to prevent race conditions
  -- Lock key: hashtext('void:' || transaction_id) for unique lock per transaction
  PERFORM pg_advisory_xact_lock(hashtext('void:' || p_transaction_id::text));

  v_actor := COALESCE(p_actor_id, auth.uid());

  SELECT * INTO v_tx FROM transactions_v2 WHERE id = p_transaction_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;

  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided';
  END IF;

  -- Calculate projected balance after voiding
  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTEREST', 'YIELD', 'IB_CREDIT', 'FEE_CREDIT', 'INTERNAL_CREDIT', 'ADJUSTMENT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -ABS(amount)
      ELSE 0
    END
  ), 0)
  INTO v_projected_balance
  FROM transactions_v2
  WHERE investor_id = v_tx.investor_id
    AND fund_id = v_tx.fund_id
    AND is_voided = false
    AND id != p_transaction_id;

  IF v_projected_balance < 0 THEN
    RAISE EXCEPTION 'Cannot void: would result in negative balance (%). Void related withdrawals first.', ROUND(v_projected_balance, 4);
  END IF;

  -- Check for yields calculated AFTER this transaction's effective date
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

    -- Log the warning to audit
    INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
    VALUES (
      'VOID_YIELD_DEPENDENCY_WARNING',
      'transactions_v2',
      p_transaction_id::text,
      v_actor,
      v_yield_warning,
      jsonb_build_object('source', 'void_transaction', 'remediation', 'ground_truth_2026-01-11')
    );
  END IF;

  -- Mark transaction as voided
  UPDATE transactions_v2
  SET
    is_voided = true,
    voided_at = NOW(),
    voided_by = v_actor,
    void_reason = p_reason,
    updated_at = NOW(),
    updated_by = v_actor
  WHERE id = p_transaction_id;

  -- Recompute investor position
  PERFORM recompute_investor_position(v_tx.investor_id, v_tx.fund_id);

  -- Recalculate fund AUM for the transaction date
  v_aum_result := recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date);

  -- Log the void action
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID',
    'transactions_v2',
    p_transaction_id::text,
    v_actor,
    to_jsonb(v_tx),
    jsonb_build_object(
      'void_reason', p_reason,
      'voided_at', NOW(),
      'projected_balance', v_projected_balance,
      'aum_recalculation', v_aum_result
    ),
    jsonb_build_object('source', 'void_transaction')
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', p_transaction_id,
    'voided_at', NOW(),
    'projected_balance', v_projected_balance,
    'yield_warning', v_yield_warning,
    'aum_recalculation', v_aum_result
  );
END;
$$;

COMMENT ON FUNCTION void_transaction(uuid, text, uuid) IS
'Voids a transaction with advisory lock protection against race conditions.
Advisory lock key: hashtext(''void:'' || transaction_id)
Checks for negative balance and dependent yields before voiding.
Remediated: 2026-01-11 (Ground Truth Verification)';

-- ============================================================================
-- PART 2: Create v_security_definer_audit View
-- ============================================================================
-- Purpose: Audit compliance of SECURITY DEFINER functions
-- This view was referenced in audit reports but did not exist in the database

CREATE OR REPLACE VIEW v_security_definer_audit AS
SELECT
  n.nspname AS schema_name,
  p.proname AS function_name,
  p.prosecdef AS is_security_definer,
  CASE
    WHEN p.proconfig IS NOT NULL AND 'search_path=public' = ANY(p.proconfig) THEN true
    ELSE false
  END AS has_search_path,
  p.proconfig AS config,
  pg_get_function_identity_arguments(p.oid) AS arguments,
  obj_description(p.oid, 'pg_proc') AS description
FROM pg_proc p
JOIN pg_namespace n ON p.pronamespace = n.oid
WHERE n.nspname = 'public'
  AND p.prosecdef = true
ORDER BY p.proname;

COMMENT ON VIEW v_security_definer_audit IS
'Audit view for monitoring SECURITY DEFINER function compliance.
Query: SELECT * FROM v_security_definer_audit WHERE NOT has_search_path;
Expected: 0 rows (all functions should have search_path=public)
Created: 2026-01-11 (Ground Truth Verification)';

-- ============================================================================
-- PART 3: Audit Log Entry
-- ============================================================================

INSERT INTO audit_log (action, entity, entity_id, new_values, meta)
VALUES (
  'GROUND_TRUTH_REMEDIATION',
  'migrations',
  '20260111173247_ground_truth_remediation',
  jsonb_build_object(
    'remediation_date', '2026-01-11',
    'source', 'VERIFICATION_REPORT_2026-01-11.md',
    'fixes', ARRAY[
      'Added advisory lock to void_transaction',
      'Created v_security_definer_audit view'
    ],
    'verification_protocol', 'Trust Nothing, Verify Everything'
  ),
  jsonb_build_object(
    'audit_type', 'ground_truth_remediation',
    'phase', 3
  )
);

-- ============================================================================
-- PART 4: Verification Assertions
-- ============================================================================

DO $$
DECLARE
  v_lock_present boolean;
  v_view_exists boolean;
BEGIN
  -- Verify advisory lock is present in void_transaction
  SELECT pg_get_functiondef(oid) ILIKE '%pg_advisory_xact_lock%'
  INTO v_lock_present
  FROM pg_proc
  WHERE proname = 'void_transaction'
    AND pronamespace = 'public'::regnamespace;

  IF NOT v_lock_present THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: void_transaction missing advisory lock';
  END IF;

  -- Verify v_security_definer_audit view exists
  SELECT EXISTS (
    SELECT 1 FROM pg_views
    WHERE schemaname = 'public'
      AND viewname = 'v_security_definer_audit'
  ) INTO v_view_exists;

  IF NOT v_view_exists THEN
    RAISE EXCEPTION 'VERIFICATION FAILED: v_security_definer_audit view not created';
  END IF;

  RAISE NOTICE 'GROUND TRUTH REMEDIATION VERIFIED: All gaps addressed';
END $$;
