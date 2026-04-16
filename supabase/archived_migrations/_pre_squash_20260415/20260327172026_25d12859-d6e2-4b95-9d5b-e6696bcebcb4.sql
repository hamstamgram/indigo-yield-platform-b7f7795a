
-- Fix: Revoke anon from recreated void_yield_distribution
REVOKE ALL ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM anon;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) TO service_role;
