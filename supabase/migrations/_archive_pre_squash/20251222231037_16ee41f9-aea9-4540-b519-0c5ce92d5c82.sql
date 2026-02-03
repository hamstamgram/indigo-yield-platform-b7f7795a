-- Create RPC function to reopen a closed reporting month (superadmin only)
CREATE OR REPLACE FUNCTION public.reopen_fund_reporting_month(
  p_fund_id UUID,
  p_month_start DATE,
  p_admin_id UUID,
  p_reason TEXT DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_closure_id UUID;
  v_is_super_admin BOOLEAN;
BEGIN
  -- Check if user is super_admin
  SELECT EXISTS (
    SELECT 1 FROM user_roles 
    WHERE user_id = p_admin_id 
    AND role = 'super_admin'
  ) INTO v_is_super_admin;

  IF NOT v_is_super_admin THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'Only super admins can reopen closed months'
    );
  END IF;

  -- Find the closure record
  SELECT id INTO v_closure_id
  FROM fund_reporting_month_closures
  WHERE fund_id = p_fund_id
    AND month_start = p_month_start;

  IF v_closure_id IS NULL THEN
    RETURN jsonb_build_object(
      'success', false,
      'error', 'No closure record found for this month'
    );
  END IF;

  -- Delete the closure record (reopen the month)
  DELETE FROM fund_reporting_month_closures
  WHERE id = v_closure_id;

  -- Log to audit_log
  INSERT INTO audit_log (
    action,
    entity,
    entity_id,
    actor_user,
    meta
  ) VALUES (
    'reopen_reporting_month',
    'fund_reporting_month_closures',
    v_closure_id::text,
    p_admin_id,
    jsonb_build_object(
      'fund_id', p_fund_id,
      'month_start', p_month_start,
      'reason', COALESCE(p_reason, 'No reason provided')
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'closure_id', v_closure_id,
    'month_start', p_month_start
  );
END;
$$;