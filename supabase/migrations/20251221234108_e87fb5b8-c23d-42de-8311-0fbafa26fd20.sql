-- P0 Fix 1: Migrate RLS policies from profiles.is_admin to user_roles table
-- This prevents privilege escalation by using proper role-based access control

-- Helper function to check admin using user_roles (already exists as check_is_admin)
-- Just ensure it's properly set up

-- Drop and recreate policies that use profiles.is_admin
-- We'll update them to use the existing has_role() or check_is_admin() function

-- admin_invites policies
DROP POLICY IF EXISTS "Admins can view all invites" ON public.admin_invites;
CREATE POLICY "Admins can view all invites" ON public.admin_invites
  FOR SELECT USING (public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can create invites" ON public.admin_invites;
CREATE POLICY "Admins can create invites" ON public.admin_invites
  FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

-- daily_nav policies
DROP POLICY IF EXISTS "daily_nav_insert_admin" ON public.daily_nav;
CREATE POLICY "daily_nav_insert_admin" ON public.daily_nav
  FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "daily_nav_update_admin" ON public.daily_nav;
CREATE POLICY "daily_nav_update_admin" ON public.daily_nav
  FOR UPDATE USING (public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "daily_nav_delete_admin" ON public.daily_nav;
CREATE POLICY "daily_nav_delete_admin" ON public.daily_nav
  FOR DELETE USING (public.check_is_admin(auth.uid()));

-- daily_rates policies
DROP POLICY IF EXISTS "Admins can manage rates" ON public.daily_rates;
CREATE POLICY "Admins can manage rates" ON public.daily_rates
  FOR ALL USING (public.check_is_admin(auth.uid())) WITH CHECK (public.check_is_admin(auth.uid()));

-- data_edit_audit policies  
DROP POLICY IF EXISTS "data_edit_audit_select" ON public.data_edit_audit;
CREATE POLICY "data_edit_audit_select" ON public.data_edit_audit
  FOR SELECT USING (edited_by = auth.uid() OR public.check_is_admin(auth.uid()));

-- email_logs policies
DROP POLICY IF EXISTS "Admin can view all email logs" ON public.email_logs;
CREATE POLICY "Admin can view all email logs" ON public.email_logs
  FOR SELECT USING (
    (auth.jwt() ->> 'role'::text) = 'service_role'::text 
    OR public.check_is_admin(auth.uid())
  );

-- generated_reports policies
DROP POLICY IF EXISTS "Admins can manage generated_reports" ON public.generated_reports;
CREATE POLICY "Admins can manage generated_reports" ON public.generated_reports
  FOR ALL USING (public.check_is_admin(auth.uid())) WITH CHECK (public.check_is_admin(auth.uid()));

-- import_locks policies
DROP POLICY IF EXISTS "import_locks_admin_manage" ON public.import_locks;
CREATE POLICY "import_locks_admin_manage" ON public.import_locks
  FOR ALL USING (public.check_is_admin(auth.uid())) WITH CHECK (public.check_is_admin(auth.uid()));

-- investor_invites policies
DROP POLICY IF EXISTS "investor_invites_admin_all" ON public.investor_invites;
CREATE POLICY "investor_invites_admin_all" ON public.investor_invites
  FOR ALL USING (public.check_is_admin(auth.uid())) WITH CHECK (public.check_is_admin(auth.uid()));

-- notifications policies
DROP POLICY IF EXISTS "Admins can view all notifications" ON public.notifications;
CREATE POLICY "Admins can view all notifications" ON public.notifications
  FOR SELECT USING (user_id = auth.uid() OR public.check_is_admin(auth.uid()));

-- onboarding_submissions policies
DROP POLICY IF EXISTS "Admin can view all submissions" ON public.onboarding_submissions;
CREATE POLICY "Admin can view all submissions" ON public.onboarding_submissions
  FOR SELECT USING (public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can update submissions" ON public.onboarding_submissions;
CREATE POLICY "Admin can update submissions" ON public.onboarding_submissions
  FOR UPDATE USING (public.check_is_admin(auth.uid()));

-- price_alerts policies  
DROP POLICY IF EXISTS "price_alerts_select" ON public.price_alerts;
CREATE POLICY "price_alerts_select" ON public.price_alerts
  FOR SELECT USING (user_id = auth.uid() OR public.check_is_admin(auth.uid()));

-- profiles policies - critical for preventing privilege escalation
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
  FOR SELECT USING (id = auth.uid() OR public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admins can update all profiles" ON public.profiles;
CREATE POLICY "Admins can update all profiles" ON public.profiles
  FOR UPDATE USING (id = auth.uid() OR public.check_is_admin(auth.uid()));

-- report_access_logs policies
DROP POLICY IF EXISTS "Admins can view all report access logs" ON public.report_access_logs;
CREATE POLICY "Admins can view all report access logs" ON public.report_access_logs
  FOR SELECT USING (public.check_is_admin(auth.uid()));

-- secure_shares policies
DROP POLICY IF EXISTS "secure_shares_select" ON public.secure_shares;
CREATE POLICY "secure_shares_select" ON public.secure_shares
  FOR SELECT USING (owner_user_id = auth.uid() OR public.check_is_admin(auth.uid()));

-- statement_periods policies
DROP POLICY IF EXISTS "statement_periods_admin" ON public.statement_periods;
CREATE POLICY "statement_periods_admin" ON public.statement_periods
  FOR ALL USING (public.check_is_admin(auth.uid())) WITH CHECK (public.check_is_admin(auth.uid()));

-- statements policies
DROP POLICY IF EXISTS "statements_admin_all" ON public.statements;
CREATE POLICY "statements_admin_all" ON public.statements
  FOR ALL USING (public.check_is_admin(auth.uid())) WITH CHECK (public.check_is_admin(auth.uid()));

-- support_tickets policies
DROP POLICY IF EXISTS "Admin can view all tickets" ON public.support_tickets;
CREATE POLICY "Admin can view all tickets" ON public.support_tickets
  FOR SELECT USING (user_id = auth.uid() OR public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "Admin can update all tickets" ON public.support_tickets;
CREATE POLICY "Admin can update all tickets" ON public.support_tickets
  FOR UPDATE USING (public.check_is_admin(auth.uid()));

-- transactions_v2 policies
DROP POLICY IF EXISTS "transactions_v2_select" ON public.transactions_v2;
CREATE POLICY "transactions_v2_select" ON public.transactions_v2
  FOR SELECT USING (investor_id = auth.uid() OR public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "transactions_v2_admin_insert" ON public.transactions_v2;
CREATE POLICY "transactions_v2_admin_insert" ON public.transactions_v2
  FOR INSERT WITH CHECK (public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "transactions_v2_admin_update" ON public.transactions_v2;
CREATE POLICY "transactions_v2_admin_update" ON public.transactions_v2
  FOR UPDATE USING (public.check_is_admin(auth.uid()));

DROP POLICY IF EXISTS "transactions_v2_admin_delete" ON public.transactions_v2;
CREATE POLICY "transactions_v2_admin_delete" ON public.transactions_v2
  FOR DELETE USING (public.check_is_admin(auth.uid()));

-- user_roles policies - ensure admins can manage roles
DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
CREATE POLICY "user_roles_admin_all" ON public.user_roles
  FOR ALL USING (public.check_is_admin(auth.uid())) WITH CHECK (public.check_is_admin(auth.uid()));

-- user_sessions policies
DROP POLICY IF EXISTS "user_sessions_admin_view" ON public.user_sessions;
CREATE POLICY "user_sessions_admin_view" ON public.user_sessions
  FOR SELECT USING (user_id = auth.uid() OR public.check_is_admin(auth.uid()));

-- withdrawal_requests policies
DROP POLICY IF EXISTS "withdrawal_requests_admin_all" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests_admin_all" ON public.withdrawal_requests
  FOR ALL USING (public.check_is_admin(auth.uid())) WITH CHECK (public.check_is_admin(auth.uid()));

-- yield_settings policies
DROP POLICY IF EXISTS "yield_settings_admin" ON public.yield_settings;
CREATE POLICY "yield_settings_admin" ON public.yield_settings
  FOR ALL USING (public.check_is_admin(auth.uid())) WITH CHECK (public.check_is_admin(auth.uid()));

-- Also update the is_admin() function to use user_roles instead of profiles.is_admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.check_is_admin(auth.uid())
$$;

-- Grant execute on the functions
GRANT EXECUTE ON FUNCTION public.is_admin() TO authenticated;
GRANT EXECUTE ON FUNCTION public.check_is_admin(uuid) TO authenticated;

-- Add comment
COMMENT ON FUNCTION public.is_admin() IS 'Checks if current user has admin role via user_roles table (not profiles.is_admin)';
COMMENT ON FUNCTION public.check_is_admin(uuid) IS 'Checks if specified user has admin or super_admin role in user_roles table';