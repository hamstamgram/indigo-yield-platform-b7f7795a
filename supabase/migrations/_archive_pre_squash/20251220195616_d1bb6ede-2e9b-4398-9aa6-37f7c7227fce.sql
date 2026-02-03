-- Create secure RPC function for updating admin roles
-- Only super_admin users can promote/demote other admins
CREATE OR REPLACE FUNCTION public.update_admin_role(
  p_target_user_id UUID,
  p_new_role TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_caller_id UUID;
  v_is_super_admin BOOLEAN;
  v_target_is_super BOOLEAN;
BEGIN
  -- Get the caller's user ID
  v_caller_id := auth.uid();
  
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required';
  END IF;
  
  -- Check if caller is super_admin using the existing function
  v_is_super_admin := public.has_super_admin_role(v_caller_id);
  
  IF NOT v_is_super_admin THEN
    RAISE EXCEPTION 'Only Super Admins can modify admin roles';
  END IF;
  
  -- Prevent self-demotion from super_admin (safety check)
  IF v_caller_id = p_target_user_id AND p_new_role != 'super_admin' THEN
    -- Check if they're currently super_admin
    SELECT EXISTS (
      SELECT 1 FROM public.user_roles 
      WHERE user_id = v_caller_id AND role = 'super_admin'
    ) INTO v_target_is_super;
    
    IF v_target_is_super THEN
      RAISE EXCEPTION 'Cannot demote yourself from Super Admin';
    END IF;
  END IF;
  
  -- Validate the new role
  IF p_new_role NOT IN ('admin', 'super_admin') THEN
    RAISE EXCEPTION 'Invalid role: must be admin or super_admin';
  END IF;
  
  -- Perform the role change
  IF p_new_role = 'super_admin' THEN
    -- Add super_admin role (upsert)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (p_target_user_id, 'super_admin')
    ON CONFLICT (user_id, role) DO NOTHING;
  ELSE
    -- Remove super_admin role (demote to regular admin)
    DELETE FROM public.user_roles 
    WHERE user_id = p_target_user_id AND role = 'super_admin';
  END IF;
  
  -- Log the role change to audit_log
  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, meta, new_values)
  VALUES (
    'UPDATE_ADMIN_ROLE',
    'user_roles',
    p_target_user_id::TEXT,
    v_caller_id,
    jsonb_build_object('target_user', p_target_user_id, 'new_role', p_new_role),
    jsonb_build_object('role', p_new_role)
  );
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_target_user_id,
    'new_role', p_new_role
  );
END;
$$;

-- Grant execute permission to authenticated users (RPC will check super_admin internally)
GRANT EXECUTE ON FUNCTION public.update_admin_role(UUID, TEXT) TO authenticated;

-- Add comment for documentation
COMMENT ON FUNCTION public.update_admin_role IS 'Securely update admin roles. Only callable by super_admin users.';