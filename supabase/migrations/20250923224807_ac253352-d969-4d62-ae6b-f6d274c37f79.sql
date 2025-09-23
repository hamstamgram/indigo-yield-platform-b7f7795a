-- CRITICAL SECURITY FIXES - Remove public data exposure and fix RLS recursion

-- 1. SECURE BUSINESS DATA ACCESS
-- Remove public access from sensitive business tables

-- Fix funds table - restrict to authenticated users only
DROP POLICY IF EXISTS "funds_select_policy" ON public.funds;
CREATE POLICY "funds_select_authenticated" ON public.funds
FOR SELECT TO authenticated
USING (true);

-- Fix fund_configurations table - admin only for management, authenticated for read
DROP POLICY IF EXISTS "fund_configurations_select_all" ON public.fund_configurations;
CREATE POLICY "fund_configurations_select_authenticated" ON public.fund_configurations
FOR SELECT TO authenticated  
USING (true);

-- Fix daily_nav table - authenticated users only
DROP POLICY IF EXISTS "daily_nav_select_policy" ON public.daily_nav;
CREATE POLICY "daily_nav_select_authenticated" ON public.daily_nav
FOR SELECT TO authenticated
USING (true);

-- Fix benchmarks table - authenticated users only
DROP POLICY IF EXISTS "benchmarks_select_policy" ON public.benchmarks;
CREATE POLICY "benchmarks_select_authenticated" ON public.benchmarks
FOR SELECT TO authenticated
USING (true);

-- 2. FIX RLS POLICY RECURSION ISSUES

-- Create security definer function for portfolio access check
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

-- Fix portfolio_members recursion by using security definer function
DROP POLICY IF EXISTS "Portfolio owners can manage members" ON public.portfolio_members;
DROP POLICY IF EXISTS "Users can view memberships" ON public.portfolio_members;

CREATE POLICY "portfolio_members_owners_manage" ON public.portfolio_members
FOR ALL TO authenticated
USING (
  public.check_portfolio_access(portfolio_id, auth.uid()) OR 
  is_admin_v2()
)
WITH CHECK (
  public.check_portfolio_access(portfolio_id, auth.uid()) OR 
  is_admin_v2()
);

CREATE POLICY "portfolio_members_view" ON public.portfolio_members
FOR SELECT TO authenticated
USING (
  user_id = auth.uid() OR 
  public.check_portfolio_access(portfolio_id, auth.uid()) OR 
  is_admin_v2()
);

-- 3. ENHANCE AUDIT LOGGING SECURITY
-- Ensure audit_log is admin-readable only
CREATE POLICY "audit_log_admin_select" ON public.audit_log
FOR SELECT TO authenticated
USING (is_admin_v2());

-- 4. SECURE ASSET PRICES - Restrict to authenticated users
DROP POLICY IF EXISTS "Asset prices are publicly readable" ON public.asset_prices;
CREATE POLICY "asset_prices_authenticated_select" ON public.asset_prices
FOR SELECT TO authenticated
USING (true);

-- 5. SECURE ASSETS_V2 - Restrict to authenticated users  
DROP POLICY IF EXISTS "Assets are publicly readable" ON public.assets_v2;
CREATE POLICY "assets_v2_authenticated_select" ON public.assets_v2
FOR SELECT TO authenticated
USING (true);

-- Grant execute permission on new security function
GRANT EXECUTE ON FUNCTION public.check_portfolio_access(uuid, uuid) TO authenticated;

-- Create comprehensive security audit function for monitoring
CREATE OR REPLACE FUNCTION public.log_security_event(
  event_type text,
  user_id_param uuid DEFAULT auth.uid(),
  details jsonb DEFAULT '{}'::jsonb
)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO audit_log (
    actor_user,
    action,
    entity, 
    entity_id,
    meta
  ) VALUES (
    user_id_param,
    'SECURITY_EVENT',
    'security',
    event_type,
    details
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.log_security_event(text, uuid, jsonb) TO authenticated;