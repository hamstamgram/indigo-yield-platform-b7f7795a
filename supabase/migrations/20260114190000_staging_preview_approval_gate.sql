-- ============================================================================
-- STAGING PREVIEW REPORT + APPROVAL GATE
-- Date: 2026-01-14
-- Version: 3.1.0
--
-- Implements D) Backfill staging preview report + approval gate:
--   - Net flows by day report
--   - Position deltas by investor report
--   - As-of filtering scan
--   - Expected AUM deltas
--   - Approval gate before promotion
-- ============================================================================

BEGIN;

-- ============================================================================
-- D.1: STAGING BATCH PREVIEW REPORT
-- ============================================================================

-- Generate comprehensive preview report for a staging batch
CREATE OR REPLACE FUNCTION generate_staging_preview_report(p_batch_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_batch_stats RECORD;
  v_flows_by_day jsonb;
  v_position_deltas jsonb;
  v_as_of_warnings jsonb;
  v_aum_impact jsonb;
  v_fund_id uuid;
  v_min_date date;
  v_max_date date;
  v_current_aum numeric(28,10);
BEGIN
  -- Get batch statistics
  SELECT
    COUNT(*) as total_rows,
    COUNT(*) FILTER (WHERE validation_status = 'valid') as valid_rows,
    COUNT(*) FILTER (WHERE validation_status = 'invalid') as invalid_rows,
    COUNT(*) FILTER (WHERE validation_status = 'pending') as pending_rows,
    COUNT(*) FILTER (WHERE validation_status = 'promoted') as promoted_rows,
    MIN(tx_date) as min_date,
    MAX(tx_date) as max_date,
    (SELECT DISTINCT fund_id FROM transaction_import_staging WHERE batch_id = p_batch_id LIMIT 1) as fund_id
  INTO v_batch_stats
  FROM transaction_import_staging
  WHERE batch_id = p_batch_id;

  IF v_batch_stats.total_rows = 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No rows found for batch_id: ' || p_batch_id::text
    );
  END IF;

  v_fund_id := v_batch_stats.fund_id;
  v_min_date := v_batch_stats.min_date;
  v_max_date := v_batch_stats.max_date;

  -- D.1.1: Net flows by day
  SELECT jsonb_agg(day_data ORDER BY tx_date)
  INTO v_flows_by_day
  FROM (
    SELECT
      tx_date,
      jsonb_build_object(
        'date', tx_date,
        'deposits', COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0),
        'withdrawals', COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'WITHDRAWAL'), 0),
        'net_flow', COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE -ABS(amount) END), 0),
        'transaction_count', COUNT(*)
      ) as day_data
    FROM transaction_import_staging
    WHERE batch_id = p_batch_id
      AND validation_status IN ('valid', 'pending')
    GROUP BY tx_date
    ORDER BY tx_date
  ) daily;

  -- D.1.2: Position deltas by investor
  SELECT jsonb_agg(investor_data)
  INTO v_position_deltas
  FROM (
    SELECT
      jsonb_build_object(
        'investor_id', s.investor_id,
        'investor_email', (SELECT email FROM auth.users WHERE id = s.investor_id),
        'current_position', COALESCE(ip.current_value, 0),
        'total_deposits', COALESCE(SUM(s.amount) FILTER (WHERE s.type = 'DEPOSIT'), 0),
        'total_withdrawals', COALESCE(SUM(ABS(s.amount)) FILTER (WHERE s.type = 'WITHDRAWAL'), 0),
        'net_change', COALESCE(SUM(CASE WHEN s.type = 'DEPOSIT' THEN s.amount ELSE -ABS(s.amount) END), 0),
        'projected_position', COALESCE(ip.current_value, 0) +
          COALESCE(SUM(CASE WHEN s.type = 'DEPOSIT' THEN s.amount ELSE -ABS(s.amount) END), 0),
        'transaction_count', COUNT(*)
      ) as investor_data
    FROM transaction_import_staging s
    LEFT JOIN investor_positions ip ON ip.investor_id = s.investor_id AND ip.fund_id = s.fund_id
    WHERE s.batch_id = p_batch_id
      AND s.validation_status IN ('valid', 'pending')
    GROUP BY s.investor_id, ip.current_value
    ORDER BY SUM(CASE WHEN s.type = 'DEPOSIT' THEN s.amount ELSE -ABS(s.amount) END) DESC
  ) investors;

  -- D.1.3: As-of filtering warnings (backdated transactions)
  SELECT jsonb_agg(warning_data)
  INTO v_as_of_warnings
  FROM (
    SELECT
      jsonb_build_object(
        'staging_id', id,
        'tx_date', tx_date,
        'created_at', created_at,
        'days_backdated', (created_at::date - tx_date),
        'warning_type', CASE
          WHEN is_period_locked(fund_id, tx_date) THEN 'LOCKED_PERIOD'
          WHEN (created_at::date - tx_date) > 30 THEN 'SEVERELY_BACKDATED'
          WHEN (created_at::date - tx_date) > 7 THEN 'BACKDATED'
          ELSE 'MINOR_BACKDATE'
        END,
        'investor_id', investor_id,
        'amount', amount,
        'type', type
      ) as warning_data
    FROM transaction_import_staging
    WHERE batch_id = p_batch_id
      AND validation_status IN ('valid', 'pending')
      AND tx_date < created_at::date
    ORDER BY (created_at::date - tx_date) DESC
  ) warnings;

  -- D.1.4: Expected AUM impact
  -- Get current AUM for the fund
  SELECT closing_aum INTO v_current_aum
  FROM fund_aum_events
  WHERE fund_id = v_fund_id
    AND is_voided = false
    AND purpose = 'transaction'
  ORDER BY event_date DESC, event_ts DESC
  LIMIT 1;
  v_current_aum := COALESCE(v_current_aum, 0);

  SELECT jsonb_build_object(
    'current_aum', v_current_aum,
    'total_deposits', COALESCE(SUM(amount) FILTER (WHERE type = 'DEPOSIT'), 0),
    'total_withdrawals', COALESCE(SUM(ABS(amount)) FILTER (WHERE type = 'WITHDRAWAL'), 0),
    'net_flow', COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE -ABS(amount) END), 0),
    'projected_aum', v_current_aum +
      COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE -ABS(amount) END), 0),
    'aum_change_pct', CASE
      WHEN v_current_aum = 0 THEN NULL
      ELSE ROUND((COALESCE(SUM(CASE WHEN type = 'DEPOSIT' THEN amount ELSE -ABS(amount) END), 0) / v_current_aum * 100)::numeric, 2)
    END
  )
  INTO v_aum_impact
  FROM transaction_import_staging
  WHERE batch_id = p_batch_id
    AND validation_status IN ('valid', 'pending');

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'fund_id', v_fund_id,
    'generated_at', now(),
    'summary', jsonb_build_object(
      'total_rows', v_batch_stats.total_rows,
      'valid_rows', v_batch_stats.valid_rows,
      'invalid_rows', v_batch_stats.invalid_rows,
      'pending_rows', v_batch_stats.pending_rows,
      'promoted_rows', v_batch_stats.promoted_rows,
      'date_range', jsonb_build_object('min', v_min_date, 'max', v_max_date),
      'ready_for_promotion', v_batch_stats.invalid_rows = 0 AND v_batch_stats.pending_rows = 0 AND v_batch_stats.valid_rows > 0
    ),
    'flows_by_day', COALESCE(v_flows_by_day, '[]'::jsonb),
    'position_deltas', COALESCE(v_position_deltas, '[]'::jsonb),
    'as_of_warnings', COALESCE(v_as_of_warnings, '[]'::jsonb),
    'aum_impact', v_aum_impact,
    'risk_assessment', jsonb_build_object(
      'has_backdated_transactions', v_as_of_warnings IS NOT NULL AND jsonb_array_length(v_as_of_warnings) > 0,
      'has_locked_period_conflicts', EXISTS (
        SELECT 1 FROM transaction_import_staging s
        WHERE s.batch_id = p_batch_id
          AND s.validation_status IN ('valid', 'pending')
          AND is_period_locked(s.fund_id, s.tx_date)
      ),
      'large_aum_impact', COALESCE((v_aum_impact->>'aum_change_pct')::numeric > 20, false),
      'requires_approval', true
    )
  );
END;
$$;

GRANT EXECUTE ON FUNCTION generate_staging_preview_report(uuid) TO authenticated;

COMMENT ON FUNCTION generate_staging_preview_report IS
  'Generates comprehensive preview report for staging batch including flows by day, position deltas, as-of warnings, and AUM impact analysis.';


-- ============================================================================
-- D.2: APPROVAL GATE FOR STAGING PROMOTION
-- ============================================================================

-- Request approval for staging batch promotion
CREATE OR REPLACE FUNCTION request_staging_promotion_approval(
  p_batch_id uuid,
  p_requested_by uuid,
  p_reason text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_approval_id uuid;
  v_preview_report jsonb;
  v_batch_valid boolean;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can request staging promotion approval'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Generate preview report to include in approval request
  v_preview_report := generate_staging_preview_report(p_batch_id);

  IF NOT (v_preview_report->>'success')::boolean THEN
    RETURN v_preview_report;
  END IF;

  -- Check if batch is ready for promotion
  v_batch_valid := (v_preview_report->'summary'->>'ready_for_promotion')::boolean;

  IF NOT v_batch_valid THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Batch is not ready for promotion. Fix validation errors first.',
      'summary', v_preview_report->'summary'
    );
  END IF;

  -- Check for existing pending approval
  IF EXISTS (
    SELECT 1 FROM admin_approvals
    WHERE entity_type = 'staging_batch'
      AND entity_id = p_batch_id
      AND approval_status = 'pending'
  ) THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Pending approval already exists for this batch'
    );
  END IF;

  -- Create approval request
  INSERT INTO admin_approvals (
    action_type,
    entity_type,
    entity_id,
    requested_by,
    reason,
    metadata
  ) VALUES (
    'PROMOTE_STAGING_BATCH',
    'staging_batch',
    p_batch_id,
    p_requested_by,
    p_reason,
    jsonb_build_object(
      'preview_report', v_preview_report,
      'requested_at', now()
    )
  )
  RETURNING id INTO v_approval_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('REQUEST_STAGING_APPROVAL', 'admin_approvals', v_approval_id::text, p_requested_by,
    jsonb_build_object('batch_id', p_batch_id, 'reason', p_reason));

  RETURN jsonb_build_object(
    'success', true,
    'approval_id', v_approval_id,
    'batch_id', p_batch_id,
    'status', 'pending',
    'preview_summary', v_preview_report->'summary',
    'message', 'Approval request created. Another admin must approve before promotion.'
  );
END;
$$;

GRANT EXECUTE ON FUNCTION request_staging_promotion_approval(uuid, uuid, text) TO authenticated;


-- Approve staging batch promotion (different admin)
CREATE OR REPLACE FUNCTION approve_staging_promotion(
  p_approval_id uuid,
  p_approved_by uuid,
  p_closing_aum numeric DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
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
    SELECT closing_aum INTO v_latest_aum
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
$$;

GRANT EXECUTE ON FUNCTION approve_staging_promotion(uuid, uuid, numeric) TO authenticated;


-- Reject staging batch promotion
CREATE OR REPLACE FUNCTION reject_staging_promotion(
  p_approval_id uuid,
  p_rejected_by uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_approval RECORD;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can reject staging promotions'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  SELECT * INTO v_approval
  FROM admin_approvals
  WHERE id = p_approval_id;

  IF v_approval IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Approval not found');
  END IF;

  IF v_approval.approval_status != 'pending' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Approval is not pending');
  END IF;

  UPDATE admin_approvals
  SET approval_status = 'rejected',
      approved_by = p_rejected_by,
      resolved_at = now(),
      reason = COALESCE(v_approval.reason || ' | REJECTED: ', 'REJECTED: ') || p_reason,
      metadata = metadata || jsonb_build_object('rejected_at', now(), 'rejection_reason', p_reason)
  WHERE id = p_approval_id;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('REJECT_STAGING_PROMOTION', 'admin_approvals', p_approval_id::text, p_rejected_by,
    jsonb_build_object('batch_id', v_approval.entity_id, 'rejection_reason', p_reason));

  RETURN jsonb_build_object(
    'success', true,
    'approval_id', p_approval_id,
    'batch_id', v_approval.entity_id,
    'status', 'rejected',
    'reason', p_reason
  );
END;
$$;

GRANT EXECUTE ON FUNCTION reject_staging_promotion(uuid, uuid, text) TO authenticated;


-- ============================================================================
-- D.3: UPDATE promote_staging_batch TO REQUIRE APPROVAL
-- ============================================================================

-- Replace the original promote_staging_batch to check for approval
CREATE OR REPLACE FUNCTION promote_staging_batch(
  p_batch_id uuid,
  p_admin_id uuid,
  p_closing_aum numeric
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_row RECORD;
  v_promoted_count int := 0;
  v_tx_result jsonb;
  v_system_mode text;
  v_has_approval boolean;
BEGIN
  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Only administrators can promote staging batches'
      USING ERRCODE = 'insufficient_privilege';
  END IF;

  -- Check system mode - in live mode, require approval
  v_system_mode := get_system_mode();

  IF v_system_mode = '"live"' THEN
    -- Check for approved approval record
    SELECT EXISTS (
      SELECT 1 FROM admin_approvals
      WHERE entity_type = 'staging_batch'
        AND entity_id = p_batch_id
        AND approval_status = 'approved'
        AND action_type = 'PROMOTE_STAGING_BATCH'
    ) INTO v_has_approval;

    IF NOT v_has_approval THEN
      RETURN jsonb_build_object(
        'success', false,
        'error', 'APPROVAL_REQUIRED',
        'error_code', 'E_APPROVAL_REQUIRED',
        'message', 'In live mode, staging batch promotion requires approval from another admin. Use request_staging_promotion_approval() first.',
        'batch_id', p_batch_id
      );
    END IF;
  END IF;

  -- Check no invalid rows
  IF EXISTS (SELECT 1 FROM transaction_import_staging WHERE batch_id = p_batch_id AND validation_status = 'invalid') THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'INVALID_ROWS_EXIST',
      'error_code', 'E_VALIDATION_FAILED',
      'message', 'Batch contains invalid rows. Fix validation errors first.'
    );
  END IF;

  -- Promote each valid row
  FOR v_row IN
    SELECT * FROM transaction_import_staging
    WHERE batch_id = p_batch_id AND validation_status = 'valid'
    ORDER BY tx_date, created_at
  LOOP
    IF v_row.type = 'DEPOSIT' THEN
      v_tx_result := apply_deposit_with_crystallization(
        v_row.fund_id, v_row.investor_id, v_row.amount, p_closing_aum,
        v_row.tx_date, p_admin_id, v_row.notes, 'transaction'::aum_purpose
      );
    ELSE
      v_tx_result := apply_withdrawal_with_crystallization(
        v_row.fund_id, v_row.investor_id, ABS(v_row.amount), p_closing_aum,
        v_row.tx_date, p_admin_id, v_row.notes, 'transaction'::aum_purpose
      );
    END IF;

    IF (v_tx_result->>'success')::boolean THEN
      UPDATE transaction_import_staging
      SET validation_status = 'promoted',
          promoted_at = now(),
          promoted_tx_id = COALESCE(
            (v_tx_result->>'deposit_tx_id')::uuid,
            (v_tx_result->>'withdrawal_tx_id')::uuid
          )
      WHERE id = v_row.id;
      v_promoted_count := v_promoted_count + 1;
    ELSE
      -- Mark as invalid with promotion error
      UPDATE transaction_import_staging
      SET validation_status = 'invalid',
          validation_errors = jsonb_build_array(jsonb_build_object(
            'promotion_error', v_tx_result->>'error',
            'error_code', v_tx_result->>'error_code'
          ))
      WHERE id = v_row.id;
    END IF;
  END LOOP;

  -- Audit log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES ('PROMOTE_STAGING_BATCH', 'transaction_import_staging', p_batch_id::text, p_admin_id,
    jsonb_build_object('promoted_count', v_promoted_count, 'system_mode', v_system_mode));

  RETURN jsonb_build_object(
    'success', true,
    'batch_id', p_batch_id,
    'promoted_count', v_promoted_count,
    'system_mode', v_system_mode
  );
END;
$$;


-- ============================================================================
-- D.4: LIST PENDING APPROVALS
-- ============================================================================

CREATE OR REPLACE FUNCTION list_pending_staging_approvals()
RETURNS TABLE(
  approval_id uuid,
  batch_id uuid,
  requested_by uuid,
  requester_email text,
  requested_at timestamptz,
  reason text,
  batch_summary jsonb
)
LANGUAGE sql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
  SELECT
    aa.id as approval_id,
    aa.entity_id as batch_id,
    aa.requested_by,
    (SELECT email FROM auth.users WHERE id = aa.requested_by) as requester_email,
    aa.requested_at,
    aa.reason,
    aa.metadata->'preview_report'->'summary' as batch_summary
  FROM admin_approvals aa
  WHERE aa.entity_type = 'staging_batch'
    AND aa.action_type = 'PROMOTE_STAGING_BATCH'
    AND aa.approval_status = 'pending'
  ORDER BY aa.requested_at DESC;
$$;

GRANT EXECUTE ON FUNCTION list_pending_staging_approvals() TO authenticated;


COMMIT;
