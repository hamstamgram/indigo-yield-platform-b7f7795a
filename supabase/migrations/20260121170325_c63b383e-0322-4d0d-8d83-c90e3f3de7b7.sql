-- =============================================
-- Yield Period Closure & Reopen System
-- =============================================

-- Function: Check if a yield period is closed (has applied, non-voided distribution)
CREATE OR REPLACE FUNCTION is_yield_period_closed(
  p_fund_id uuid,
  p_year integer,
  p_month integer,
  p_purpose aum_purpose
) RETURNS boolean
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id
      AND EXTRACT(YEAR FROM period_start) = p_year
      AND EXTRACT(MONTH FROM period_start) = p_month
      AND purpose = p_purpose
      AND (is_voided = false OR is_voided IS NULL)
      AND status = 'applied'
  );
END;
$$;

-- Function: Reopen a yield period (super admin only)
-- This allows a super admin to effectively "reopen" a period by voiding the existing distribution
CREATE OR REPLACE FUNCTION reopen_yield_period(
  p_fund_id uuid,
  p_year integer,
  p_month integer,
  p_purpose aum_purpose,
  p_reason text
) RETURNS jsonb
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_is_super_admin boolean;
  v_distribution_id uuid;
  v_fund_code text;
  v_void_result jsonb;
BEGIN
  -- Check super admin status
  SELECT is_super_admin INTO v_is_super_admin 
  FROM profiles 
  WHERE id = v_user_id;
  
  IF NOT COALESCE(v_is_super_admin, false) THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'UNAUTHORIZED',
      'message', 'Super admin privileges required to reopen a yield period'
    );
  END IF;

  -- Get fund code for messaging
  SELECT code INTO v_fund_code FROM funds WHERE id = p_fund_id;

  -- Find the active distribution for this period
  SELECT id INTO v_distribution_id
  FROM yield_distributions
  WHERE fund_id = p_fund_id
    AND EXTRACT(YEAR FROM period_start) = p_year
    AND EXTRACT(MONTH FROM period_start) = p_month
    AND purpose = p_purpose
    AND (is_voided = false OR is_voided IS NULL)
    AND status = 'applied'
  ORDER BY created_at DESC
  LIMIT 1;

  IF v_distribution_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false, 
      'error_code', 'NOT_FOUND',
      'message', format('No closed period found for %s %s/%s', COALESCE(v_fund_code, p_fund_id::text), p_month, p_year)
    );
  END IF;

  -- Void the distribution to reopen the period
  -- This calls the existing void_yield_distribution function
  SELECT void_yield_distribution(
    v_distribution_id,
    format('Period reopened by super admin: %s', p_reason)
  ) INTO v_void_result;

  -- Check if void was successful
  IF NOT (v_void_result->>'success')::boolean THEN
    RETURN jsonb_build_object(
      'success', false,
      'error_code', 'VOID_FAILED',
      'message', format('Failed to void distribution: %s', v_void_result->>'message')
    );
  END IF;

  -- Audit log the reopen action
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values, meta)
  VALUES (
    'REOPEN_YIELD_PERIOD', 
    'yield_distributions', 
    v_distribution_id::text, 
    v_user_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'fund_code', v_fund_code,
      'year', p_year,
      'month', p_month,
      'purpose', p_purpose::text,
      'reason', p_reason
    ),
    jsonb_build_object('distribution_id', v_distribution_id)
  );

  RETURN jsonb_build_object(
    'success', true,
    'distribution_id', v_distribution_id,
    'message', format('Period %s/%s reopened for %s. Previous yield distribution has been voided.', p_month, p_year, COALESCE(v_fund_code, 'fund'))
  );
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION is_yield_period_closed(uuid, integer, integer, aum_purpose) TO authenticated;
GRANT EXECUTE ON FUNCTION reopen_yield_period(uuid, integer, integer, aum_purpose, text) TO authenticated;

-- Add comment documentation
COMMENT ON FUNCTION is_yield_period_closed IS 'Checks if a yield period has been closed (has an applied, non-voided distribution)';
COMMENT ON FUNCTION reopen_yield_period IS 'Super admin only: Reopens a closed yield period by voiding the existing distribution';