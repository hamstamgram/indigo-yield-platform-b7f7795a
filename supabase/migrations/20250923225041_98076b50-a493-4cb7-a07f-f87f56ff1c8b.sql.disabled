-- Fix function search path security issue

-- Update the get_security_headers function to set search path
CREATE OR REPLACE FUNCTION public.get_security_headers()
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN jsonb_build_object(
    'Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload',
    'X-Content-Type-Options', 'nosniff',
    'X-Frame-Options', 'DENY',
    'X-XSS-Protection', '1; mode=block',
    'Referrer-Policy', 'strict-origin-when-cross-origin',
    'Permissions-Policy', 'camera=(), microphone=(), geolocation=()',
    'Content-Security-Policy', 'default-src ''self''; script-src ''self'' ''unsafe-inline'' https://nkfimvovosdehmyyjubn.supabase.co; style-src ''self'' ''unsafe-inline''; img-src ''self'' data: https:; connect-src ''self'' https://nkfimvovosdehmyyjubn.supabase.co wss://nkfimvovosdehmyyjubn.supabase.co;'
  );
END;
$$;

-- Update any other functions that may have missing search_path
CREATE OR REPLACE FUNCTION public.check_portfolio_access(p_portfolio_id uuid, p_user_id uuid)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM portfolios_v2 
    WHERE id = p_portfolio_id 
    AND owner_user_id = p_user_id
  );
$$;

-- Grant permissions
GRANT EXECUTE ON FUNCTION public.get_security_headers() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_portfolio_access(uuid, uuid) TO authenticated;