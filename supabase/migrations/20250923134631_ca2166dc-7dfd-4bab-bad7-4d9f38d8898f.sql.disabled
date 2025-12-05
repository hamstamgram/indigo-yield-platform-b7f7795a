-- Create or replace RPC to check admin status without RLS issues
CREATE OR REPLACE FUNCTION public.get_user_admin_status(user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE((SELECT is_admin FROM public.profiles WHERE id = user_id), false);
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_user_admin_status(uuid) TO authenticated;

-- Create or replace RPC to fetch basic profile info (first_name, last_name)
CREATE OR REPLACE FUNCTION public.get_profile_basic(user_id uuid)
RETURNS TABLE (first_name text, last_name text)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p.first_name, p.last_name
  FROM public.profiles p
  WHERE p.id = user_id;
$$;

-- Grant execute to authenticated users
GRANT EXECUTE ON FUNCTION public.get_profile_basic(uuid) TO authenticated;