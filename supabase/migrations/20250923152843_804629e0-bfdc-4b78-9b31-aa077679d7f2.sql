-- Create missing RPC functions for admin data service

-- Function to get all investors with summary data
CREATE OR REPLACE FUNCTION public.get_all_investors_with_summary()
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  total_aum numeric,
  last_statement_date date
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
  
  -- Return investors with their summary data
  RETURN QUERY
  SELECT 
    p.id,
    p.email,
    p.first_name,
    p.last_name,
    COALESCE(SUM(pos.current_balance), 0) as total_aum,
    MAX(s.period_year::text || '-' || LPAD(s.period_month::text, 2, '0') || '-01')::date as last_statement_date
  FROM public.profiles p
  LEFT JOIN public.positions pos ON pos.user_id = p.id
  LEFT JOIN public.statements s ON s.user_id = p.id
  WHERE p.is_admin = FALSE
  GROUP BY p.id, p.email, p.first_name, p.last_name
  ORDER BY p.created_at DESC;
END;
$$;

-- Function to get all non-admin profiles (used by investor service)
CREATE OR REPLACE FUNCTION public.get_all_non_admin_profiles()
RETURNS TABLE(
  id uuid,
  email text,
  first_name text,
  last_name text,
  created_at timestamp with time zone,
  fee_percentage numeric
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
    p.created_at,
    p.fee_percentage
  FROM public.profiles p
  WHERE p.is_admin = false
  ORDER BY p.created_at DESC;
END;
$$;