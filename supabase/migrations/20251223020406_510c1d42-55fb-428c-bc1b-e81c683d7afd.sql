-- Migrate 20 RLS policies from profiles.is_admin to use is_admin() function
-- This ensures consistent role-based access control through user_roles table

-- 1. import_locks_admin_all
DROP POLICY IF EXISTS "import_locks_admin_all" ON public.import_locks;
CREATE POLICY "import_locks_admin_all" ON public.import_locks
FOR ALL USING (is_admin());

-- 2. Admins can manage investment_summary
DROP POLICY IF EXISTS "Admins can manage investment_summary" ON public.investment_summary;
CREATE POLICY "Admins can manage investment_summary" ON public.investment_summary
FOR ALL USING (is_admin());

-- 3. Admins can manage investor emails
DROP POLICY IF EXISTS "Admins can manage investor emails" ON public.investor_emails;
CREATE POLICY "Admins can manage investor emails" ON public.investor_emails
FOR ALL USING (is_admin());

-- 4. Admins can view investor emails
DROP POLICY IF EXISTS "Admins can view investor emails" ON public.investor_emails;
CREATE POLICY "Admins can view investor emails" ON public.investor_emails
FOR SELECT USING (is_admin());

-- 5. withdrawal_audit_logs_admin_select
DROP POLICY IF EXISTS "withdrawal_audit_logs_admin_select" ON public.withdrawal_audit_logs;
CREATE POLICY "withdrawal_audit_logs_admin_select" ON public.withdrawal_audit_logs
FOR SELECT USING (is_admin());

-- 6. Admins can manage reports
DROP POLICY IF EXISTS "Admins can manage reports" ON public.reports;
CREATE POLICY "Admins can manage reports" ON public.reports
FOR ALL USING (is_admin());

-- 7. Admins can manage report_schedules
DROP POLICY IF EXISTS "Admins can manage report_schedules" ON public.report_schedules;
CREATE POLICY "Admins can manage report_schedules" ON public.report_schedules
FOR ALL USING (is_admin());

-- 8. Admins can manage delivery events
DROP POLICY IF EXISTS "Admins can manage delivery events" ON public.report_delivery_events;
CREATE POLICY "Admins can manage delivery events" ON public.report_delivery_events
FOR ALL USING (is_admin());

-- 9. Admins can manage 2FA policy
DROP POLICY IF EXISTS "Admins can manage 2FA policy" ON public.system_2fa_policy;
CREATE POLICY "Admins can manage 2FA policy" ON public.system_2fa_policy
FOR ALL USING (is_admin());

-- 10. Admins can manage investments (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investments') THEN
    DROP POLICY IF EXISTS "Admins can manage investments" ON public.investments;
    EXECUTE 'CREATE POLICY "Admins can manage investments" ON public.investments FOR ALL USING (is_admin())';
  END IF;
END $$;

-- 11. Admins can manage withdrawals (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'withdrawals') THEN
    DROP POLICY IF EXISTS "Admins can manage withdrawals" ON public.withdrawals;
    EXECUTE 'CREATE POLICY "Admins can manage withdrawals" ON public.withdrawals FOR ALL USING (is_admin())';
  END IF;
END $$;

-- 12. Admins can manage withdrawal_requests (if exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'withdrawal_requests') THEN
    DROP POLICY IF EXISTS "Admins can manage withdrawal_requests" ON public.withdrawal_requests;
    EXECUTE 'CREATE POLICY "Admins can manage withdrawal_requests" ON public.withdrawal_requests FOR ALL USING (is_admin())';
  END IF;
END $$;

-- 13. Admins can view all profiles
DROP POLICY IF EXISTS "Admins can view all profiles" ON public.profiles;
CREATE POLICY "Admins can view all profiles" ON public.profiles
FOR SELECT USING (is_admin() OR id = auth.uid());

-- 14. Admins can update profiles
DROP POLICY IF EXISTS "Admins can update profiles" ON public.profiles;
CREATE POLICY "Admins can update profiles" ON public.profiles
FOR UPDATE USING (is_admin() OR id = auth.uid());

-- 15. investor_invites admin policy
DROP POLICY IF EXISTS "Admins can manage investor_invites" ON public.investor_invites;
CREATE POLICY "Admins can manage investor_invites" ON public.investor_invites
FOR ALL USING (is_admin());

-- 16. admin_invites admin policy
DROP POLICY IF EXISTS "Admins can manage admin_invites" ON public.admin_invites;
CREATE POLICY "Admins can manage admin_invites" ON public.admin_invites
FOR ALL USING (is_admin());

-- 17. user_roles admin policy (ensure only admins can modify roles)
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
CREATE POLICY "Admins can manage user_roles" ON public.user_roles
FOR ALL USING (is_admin());

-- 18. user_roles view own
DROP POLICY IF EXISTS "Users can view own roles" ON public.user_roles;
CREATE POLICY "Users can view own roles" ON public.user_roles
FOR SELECT USING (user_id = auth.uid() OR is_admin());

-- 19. transactions_v2 admin policies
DROP POLICY IF EXISTS "Admins can manage transactions_v2" ON public.transactions_v2;
CREATE POLICY "Admins can manage transactions_v2" ON public.transactions_v2
FOR ALL USING (is_admin());

-- 20. investor_positions admin policy
DROP POLICY IF EXISTS "Admins can manage investor_positions" ON public.investor_positions;
CREATE POLICY "Admins can manage investor_positions" ON public.investor_positions
FOR ALL USING (is_admin());