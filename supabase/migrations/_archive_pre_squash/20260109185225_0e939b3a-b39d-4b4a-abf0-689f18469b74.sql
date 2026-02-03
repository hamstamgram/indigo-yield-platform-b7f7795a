-- Create unlock_fund_period_snapshot RPC function
-- Allows super admins to unlock a previously locked period for yield corrections

CREATE OR REPLACE FUNCTION public.unlock_fund_period_snapshot(
  p_fund_id UUID,
  p_period_id UUID,
  p_admin_id UUID,
  p_reason TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_snapshot_id UUID;
  v_was_locked BOOLEAN;
BEGIN
  -- Verify super admin access
  IF NOT public.is_super_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Super admin access required to unlock periods';
  END IF;
  
  -- Validate reason is provided
  IF p_reason IS NULL OR TRIM(p_reason) = '' THEN
    RAISE EXCEPTION 'A reason is required to unlock a period';
  END IF;
  
  -- Get the snapshot and check if it exists and is locked
  SELECT id, is_locked INTO v_snapshot_id, v_was_locked
  FROM fund_period_snapshot
  WHERE fund_id = p_fund_id AND period_id = p_period_id;
  
  IF v_snapshot_id IS NULL THEN
    RAISE EXCEPTION 'No snapshot found for this fund and period';
  END IF;
  
  IF NOT v_was_locked THEN
    -- Already unlocked, return success (idempotent)
    RETURN TRUE;
  END IF;
  
  -- Log the unlock action to audit_log
  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'PERIOD_UNLOCKED',
    'fund_period_snapshot',
    v_snapshot_id::text,
    p_admin_id,
    jsonb_build_object('is_locked', true),
    jsonb_build_object('is_locked', false),
    jsonb_build_object('reason', p_reason, 'fund_id', p_fund_id, 'period_id', p_period_id)
  );
  
  -- Unlock the period
  UPDATE fund_period_snapshot
  SET 
    is_locked = false,
    locked_at = NULL,
    locked_by = NULL
  WHERE id = v_snapshot_id;
  
  RETURN TRUE;
END;
$$;

-- Grant execute permission to authenticated users (RPC checks super admin internally)
GRANT EXECUTE ON FUNCTION public.unlock_fund_period_snapshot(UUID, UUID, UUID, TEXT) TO authenticated;