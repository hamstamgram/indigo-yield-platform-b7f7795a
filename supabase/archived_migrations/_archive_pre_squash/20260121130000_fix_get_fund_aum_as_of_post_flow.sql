-- Migration: Fix get_fund_aum_as_of to return post_flow_aum when available
-- Created: 2026-01-21
--
-- CRITICAL BUG FIX:
-- After a deposit/withdrawal, apply_deposit_with_crystallization or
-- apply_withdrawal_with_crystallization sets post_flow_aum on the fund_aum_events record.
-- However, get_fund_aum_as_of was ONLY reading closing_aum, ignoring post_flow_aum.
-- This caused yield calculations to use the PREFLOW AUM instead of the correct POST-FLOW AUM.
--
-- Example:
--   1. Fund has 10,000 AUM
--   2. User deposits 5,000 → creates event with closing_aum=10,000, post_flow_aum=15,000
--   3. get_fund_aum_as_of returns 10,000 (WRONG) instead of 15,000 (CORRECT)
--   4. Yield preview shows incorrect base AUM
--
-- FIX: Use COALESCE(post_flow_aum, closing_aum) to prefer post_flow_aum when set.

-- ============================================================================
-- FIX 1: get_fund_aum_as_of - return post_flow_aum when available
-- ============================================================================

CREATE OR REPLACE FUNCTION public.get_fund_aum_as_of(
  p_fund_id uuid,
  p_as_of_date date,
  p_purpose aum_purpose DEFAULT 'transaction'::aum_purpose
)
RETURNS TABLE(
  fund_id uuid,
  fund_code text,
  as_of_date date,
  purpose aum_purpose,
  aum_value numeric,
  aum_source text,
  event_id uuid
)
LANGUAGE sql
STABLE SECURITY DEFINER
SET search_path TO 'public'
AS $function$
  SELECT
    f.id,
    f.code,
    p_as_of_date,
    p_purpose,
    -- FIX: Prefer post_flow_aum when available (after deposit/withdrawal)
    -- Fall back to closing_aum (for yield distributions and preflow events)
    COALESCE(ae.post_flow_aum, ae.closing_aum, 0),
    CASE
      WHEN ae.id IS NOT NULL THEN 'aum_event'
      ELSE 'no_data'
    END,
    ae.id
  FROM funds f
  LEFT JOIN LATERAL (
    SELECT id, closing_aum, post_flow_aum
    FROM fund_aum_events
    WHERE fund_id = f.id
      AND event_date <= p_as_of_date
      AND purpose = p_purpose
      AND is_voided = false
    ORDER BY event_date DESC, event_ts DESC
    LIMIT 1
  ) ae ON true
  WHERE f.id = p_fund_id;
$function$;


-- ============================================================================
-- FIX 2: approve_staging_promotion - use post_flow_aum when available
-- ============================================================================

CREATE OR REPLACE FUNCTION public.approve_staging_promotion(
  p_approval_id uuid,
  p_approved_by uuid,
  p_closing_aum numeric DEFAULT NULL::numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
  v_approval RECORD;
  v_batch_id uuid;
  v_promotion_result jsonb;
  v_fund_id uuid;
  v_latest_aum numeric(28,10);
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can approve staging promotions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Get approval record
  SELECT * INTO v_approval
  FROM admin_approvals
  WHERE id = p_approval_id;

  IF v_approval IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Approval not found');
  END IF;

  IF v_approval.approval_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Approval is not pending: ' || v_approval.approval_status);
  END IF;

  -- Ensure different admin approves
  IF v_approval.requested_by = p_approved_by THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Cannot approve your own request. Different admin required.',
      'requested_by', v_approval.requested_by,
      'approved_by', p_approved_by
    );
  END IF;

  v_batch_id := v_approval.entity_id;

  -- Get fund_id and latest AUM if not provided
  SELECT DISTINCT fund_id INTO v_fund_id
  FROM transaction_import_staging
  WHERE batch_id = v_batch_id
  LIMIT 1;

  IF p_closing_aum IS NULL THEN
    -- FIX: Use COALESCE(post_flow_aum, closing_aum) to get correct AUM after flows
    SELECT COALESCE(post_flow_aum, closing_aum) INTO v_latest_aum
    FROM fund_aum_events
    WHERE fund_id = v_fund_id
      AND is_voided = false
      AND purpose = 'transaction'
    ORDER BY event_date DESC, event_ts DESC
    LIMIT 1;
    v_latest_aum := COALESCE(v_latest_aum, 0);
  ELSE
    v_latest_aum := p_closing_aum;
  END IF;

  -- Update approval status
  UPDATE admin_approvals
  SET approval_status = 'approved',
      approved_by = p_approved_by,
      resolved_at = now(),
      metadata = metadata || jsonb_build_object('approved_at', now(), 'closing_aum_used', v_latest_aum)
  WHERE id = p_approval_id;

  -- Execute promotion
  v_promotion_result := promote_staging_batch(v_batch_id, p_approved_by, v_latest_aum);

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('APPROVE_AND_PROMOTE_STAGING', 'admin_approvals', p_approval_id::text, p_approved_by,
    jsonb_build_object(
      'batch_id', v_batch_id,
      'promotion_result', v_promotion_result,
      'closing_aum', v_latest_aum
    ));

  RETURN jsonb_build_object(
    'success', (v_promotion_result->>'success')::boolean,
    'approval_id', p_approval_id,
    'batch_id', v_batch_id,
    'approved_by', p_approved_by,
    'promotion_result', v_promotion_result
  );
END;
$function$;


-- ============================================================================
-- COMMENTS
-- ============================================================================

COMMENT ON FUNCTION get_fund_aum_as_of IS
'Get fund AUM as of a specific date. FIX: Now uses COALESCE(post_flow_aum, closing_aum) to return correct AUM after deposits/withdrawals.';

COMMENT ON FUNCTION approve_staging_promotion IS
'Approve a staging batch promotion. FIX: Now uses COALESCE(post_flow_aum, closing_aum) when getting latest AUM.';
