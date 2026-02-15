-- Grant execute permissions on RPC functions missing authenticated role access
-- These functions have internal is_admin()/check_is_admin() guards for security

GRANT EXECUTE ON FUNCTION public.void_transaction(uuid, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_void_transaction_impact(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_investor_reports_v2(uuid) TO authenticated;