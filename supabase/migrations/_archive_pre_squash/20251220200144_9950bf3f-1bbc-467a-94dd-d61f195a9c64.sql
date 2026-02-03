-- P1-3: Create secure RPC function for admin invite creation with super_admin check

-- Create RPC function that only super admins can use
CREATE OR REPLACE FUNCTION public.create_admin_invite(p_email TEXT)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_invite_id UUID;
  v_invite_code TEXT;
  v_expires_at TIMESTAMPTZ;
  v_user_id UUID;
BEGIN
  -- Get current user
  v_user_id := auth.uid();
  
  -- Check if user is super admin
  IF NOT is_super_admin() THEN
    RAISE EXCEPTION 'Super admin privileges required to create admin invitations';
  END IF;
  
  -- Validate email format
  IF p_email IS NULL OR p_email = '' OR p_email !~ '^[^\s@]+@[^\s@]+\.[^\s@]+$' THEN
    RAISE EXCEPTION 'Invalid email address';
  END IF;
  
  -- Check for existing unused invite
  IF EXISTS (
    SELECT 1 FROM admin_invites 
    WHERE email = LOWER(p_email) 
    AND used = false 
    AND expires_at > NOW()
  ) THEN
    RAISE EXCEPTION 'An active invitation for this email already exists';
  END IF;
  
  -- Generate invite code and expiry
  v_invite_code := encode(gen_random_bytes(18), 'base64');
  v_invite_code := replace(replace(v_invite_code, '+', ''), '/', '');
  v_expires_at := NOW() + INTERVAL '7 days';
  
  -- Insert the invite
  INSERT INTO admin_invites (email, invite_code, expires_at, created_by, used)
  VALUES (LOWER(p_email), v_invite_code, v_expires_at, v_user_id, false)
  RETURNING id INTO v_invite_id;
  
  -- Log the action
  INSERT INTO audit_log (action, entity, entity_id, actor_user, new_values)
  VALUES (
    'CREATE_ADMIN_INVITE',
    'admin_invites',
    v_invite_id::text,
    v_user_id,
    jsonb_build_object('email', LOWER(p_email), 'expires_at', v_expires_at)
  );
  
  RETURN v_invite_id;
END;
$$;

-- Grant execute permission to authenticated users (function does its own auth check)
GRANT EXECUTE ON FUNCTION public.create_admin_invite(TEXT) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.create_admin_invite IS 'Creates an admin invitation - requires super_admin privileges';

-- P1-4: Add unique constraint for report upsert if not exists
-- First check if constraint exists, then create if not
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint 
    WHERE conname = 'investor_fund_performance_unique_period_investor_fund'
  ) THEN
    ALTER TABLE public.investor_fund_performance 
    ADD CONSTRAINT investor_fund_performance_unique_period_investor_fund 
    UNIQUE (period_id, investor_id, fund_name);
  END IF;
END $$;
