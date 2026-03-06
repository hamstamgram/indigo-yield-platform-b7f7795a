-- P7-01: Fix is_admin() search_path vulnerability
-- This prevents search-path injection attacks on the core admin check function
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
STABLE 
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    RETURN EXISTS(
        SELECT 1 FROM public.user_roles ur
        JOIN public.profiles p ON p.id = ur.user_id
        WHERE ur.user_id = auth.uid()
        AND ur.role IN ('admin', 'super_admin')
        AND p.status = 'active'
    );
END;
$$;

-- P7-02: Clean up overlapping RLS policies on transactions_v2
-- Remove duplicate admin policy
DROP POLICY IF EXISTS "Admins can manage transactions_v2" ON transactions_v2;
-- Remove policy that bypasses visibility_scope check (security gap)
DROP POLICY IF EXISTS "investors_view_own_transactions" ON transactions_v2;

-- P7-03: Clean up overlapping RLS policies on investor_positions
-- Remove duplicate admin policy
DROP POLICY IF EXISTS "Admins can manage positions" ON investor_positions;
-- Remove redundant SELECT policies (keep simplest one: investors_view_own_positions)
DROP POLICY IF EXISTS "Investor position access" ON investor_positions;
DROP POLICY IF EXISTS "Users can view own positions" ON investor_positions;