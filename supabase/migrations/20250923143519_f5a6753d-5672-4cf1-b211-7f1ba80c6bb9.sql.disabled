-- PHASE 1: Create secure RPC functions to eliminate RLS recursion

-- 1. Secure function to get all non-admin users (already exists, but let's ensure it's optimal)
CREATE OR REPLACE FUNCTION public.get_all_investors_with_details()
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  status text,
  created_at timestamp with time zone,
  phone text,
  kyc_status text,
  aml_status text,
  investor_status text
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Only allow admins to access this function
  IF NOT public.is_admin_secure() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    COALESCE(p.status, 'Active'::text) as status,
    p.created_at,
    p.phone,
    COALESCE(i.kyc_status, 'pending'::text) as kyc_status,
    COALESCE(i.aml_status, 'pending'::text) as aml_status,
    COALESCE(i.status, 'active'::text) as investor_status
  FROM public.profiles p
  LEFT JOIN public.investors i ON i.profile_id = p.id
  WHERE p.is_admin = false
  ORDER BY p.created_at DESC;
END;
$$;

-- 2. Secure function to create new user accounts (for admin use)
CREATE OR REPLACE FUNCTION public.create_investor_profile(
  p_email text,
  p_first_name text,
  p_last_name text,
  p_phone text DEFAULT NULL,
  p_send_invite boolean DEFAULT true
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
DECLARE
  v_user_id uuid;
  v_invite_code text;
  v_result jsonb;
BEGIN
  -- Only allow admins to create investor profiles
  IF NOT public.is_admin_secure() THEN
    RAISE EXCEPTION 'Admin access required';
  END IF;
  
  -- Generate a random user ID for the profile
  v_user_id := gen_random_uuid();
  
  -- Insert profile record
  INSERT INTO public.profiles (
    id,
    email,
    first_name,
    last_name,
    phone,
    is_admin,
    user_type,
    status
  ) VALUES (
    v_user_id,
    p_email,
    p_first_name,
    p_last_name,
    p_phone,
    false,
    'investor',
    'Active'
  );
  
  -- Create corresponding investor record (will be handled by trigger)
  
  -- Generate invite code if requested
  IF p_send_invite THEN
    v_invite_code := encode(gen_random_bytes(16), 'base64');
    
    -- Store invite (you'd implement the invites table as needed)
    -- For now, just return the invite code
  END IF;
  
  v_result := jsonb_build_object(
    'success', true,
    'user_id', v_user_id,
    'email', p_email,
    'invite_code', v_invite_code,
    'message', 'Investor profile created successfully'
  );
  
  RETURN v_result;
END;
$$;

-- 3. Secure function to update user profiles
CREATE OR REPLACE FUNCTION public.update_user_profile_secure(
  p_user_id uuid,
  p_first_name text DEFAULT NULL,
  p_last_name text DEFAULT NULL,
  p_phone text DEFAULT NULL,
  p_status text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
  -- Allow users to update their own profile OR admins to update any profile
  IF NOT (auth.uid() = p_user_id OR public.is_admin_secure()) THEN
    RAISE EXCEPTION 'Access denied: can only update own profile or admin access required';
  END IF;
  
  UPDATE public.profiles
  SET
    first_name = COALESCE(p_first_name, first_name),
    last_name = COALESCE(p_last_name, last_name),
    phone = COALESCE(p_phone, phone),
    status = COALESCE(p_status, status),
    updated_at = now()
  WHERE id = p_user_id;
  
  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found';
  END IF;
  
  RETURN jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'message', 'Profile updated successfully'
  );
END;
$$;

-- 4. Fix existing functions to include proper search_path (addressing linter warnings)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN public.is_admin_secure();
END;
$$;

CREATE OR REPLACE FUNCTION public.is_admin_safe()
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path TO 'public'
AS $$
BEGIN
    RETURN public.is_admin_secure();
END;
$$;

-- 5. Add missing RLS policies for tables that need them

-- First, let's check which tables have RLS enabled but no policies
-- Based on the linter, we need to add policies for tables that currently have none

-- Add policies for reconciliation table (if it exists and needs them)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'reconciliation' AND table_schema = 'public') THEN
    -- Add basic admin-only policies for reconciliation
    DROP POLICY IF EXISTS "reconciliation_admin_all" ON public.reconciliation;
    CREATE POLICY "reconciliation_admin_all" ON public.reconciliation
      FOR ALL TO authenticated
      USING (public.is_admin_secure())
      WITH CHECK (public.is_admin_secure());
  END IF;
END $$;

-- Add policies for any other tables that might need them
-- (The linter will help us identify specific tables that still need policies)

-- Grant execute permissions on new functions
GRANT EXECUTE ON FUNCTION public.get_all_investors_with_details() TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_investor_profile(text, text, text, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.update_user_profile_secure(uuid, text, text, text, text) TO authenticated;