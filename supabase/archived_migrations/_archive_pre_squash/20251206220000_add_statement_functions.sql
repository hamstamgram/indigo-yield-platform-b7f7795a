-- =====================================================
-- Migration: Add Statement RPC Functions
-- Created: 2025-12-06
-- Functions: get_statement_period_summary, finalize_statement_period
-- =====================================================

-- =====================================================
-- FUNCTION: get_statement_period_summary
-- Returns summary statistics for a statement period
-- Used by: src/services/api/statementsApi.ts:fetchPeriodSummary
-- =====================================================
CREATE OR REPLACE FUNCTION get_statement_period_summary(p_period_id UUID)
RETURNS TABLE (
  total_investors INTEGER,
  total_funds INTEGER,
  statements_generated INTEGER,
  statements_sent INTEGER,
  statements_pending INTEGER
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    -- Count unique investors with performance data for this period
    (SELECT COUNT(DISTINCT user_id)::INTEGER
     FROM investor_fund_performance
     WHERE period_id = p_period_id) AS total_investors,

    -- Count unique funds in this period
    (SELECT COUNT(DISTINCT fund_name)::INTEGER
     FROM investor_fund_performance
     WHERE period_id = p_period_id) AS total_funds,

    -- Count generated statements
    (SELECT COUNT(*)::INTEGER
     FROM generated_statements
     WHERE period_id = p_period_id) AS statements_generated,

    -- Count sent statements (via email delivery)
    (SELECT COUNT(*)::INTEGER
     FROM statement_email_delivery
     WHERE period_id = p_period_id AND status = 'SENT') AS statements_sent,

    -- Count pending statements (not yet sent)
    (SELECT COUNT(*)::INTEGER
     FROM generated_statements gs
     WHERE gs.period_id = p_period_id
       AND NOT EXISTS (
         SELECT 1 FROM statement_email_delivery sed
         WHERE sed.statement_id = gs.id AND sed.status = 'SENT'
       )) AS statements_pending;
END;
$$;

-- Grant execute to authenticated users (RLS will handle authorization)
GRANT EXECUTE ON FUNCTION get_statement_period_summary(UUID) TO authenticated;

-- =====================================================
-- FUNCTION: finalize_statement_period
-- Locks a statement period from further edits
-- Used by: src/services/api/statementsApi.ts:finalizePeriod
-- =====================================================
CREATE OR REPLACE FUNCTION finalize_statement_period(
  p_period_id UUID,
  p_admin_id UUID
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_is_admin BOOLEAN;
  v_current_status TEXT;
BEGIN
  -- Verify admin status
  SELECT is_admin INTO v_is_admin
  FROM profiles
  WHERE id = p_admin_id;

  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Only administrators can finalize statement periods';
  END IF;

  -- Check current status
  SELECT status INTO v_current_status
  FROM statement_periods
  WHERE id = p_period_id;

  IF v_current_status IS NULL THEN
    RAISE EXCEPTION 'Statement period not found';
  END IF;

  IF v_current_status = 'FINALIZED' THEN
    RAISE EXCEPTION 'Statement period is already finalized';
  END IF;

  -- Update the period status
  UPDATE statement_periods
  SET
    status = 'FINALIZED',
    finalized_at = NOW(),
    finalized_by = p_admin_id,
    updated_at = NOW()
  WHERE id = p_period_id;

  -- Log the finalization event
  INSERT INTO audit_log (
    action,
    table_name,
    record_id,
    user_id,
    changes,
    created_at
  ) VALUES (
    'FINALIZE',
    'statement_periods',
    p_period_id,
    p_admin_id,
    jsonb_build_object(
      'previous_status', v_current_status,
      'new_status', 'FINALIZED'
    ),
    NOW()
  );
END;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION finalize_statement_period(UUID, UUID) TO authenticated;
