-- Fix: Add RLS policies for investor-facing tables
-- 
-- Bug: RLS was enabled on multiple tables but no SELECT policies existed.
-- Result: Investors get empty results when querying any data.
--
-- Tables affected:
--   - investor_yield_events (yield history)
--   - transactions_v2 (transaction history)
--   - investor_positions (portfolio)
--   - funds (fund info)
--   - profiles (user profile)
--   - withdrawal_requests (withdrawal status)

-- ============================================================================
-- investor_yield_events: Investors see their own investor-visible events
-- ============================================================================
CREATE POLICY investor_yield_events_select 
ON public.investor_yield_events 
FOR SELECT 
TO authenticated
USING (
  (investor_id = auth.uid() AND visibility_scope = 'investor_visible')
  OR is_admin()
);

-- ============================================================================
-- transactions_v2: Investors see their own investor-visible transactions
-- ============================================================================
CREATE POLICY transactions_v2_select 
ON public.transactions_v2 
FOR SELECT 
TO authenticated
USING (
  (investor_id = auth.uid() AND visibility_scope = 'investor_visible')
  OR is_admin()
);

-- ============================================================================
-- investor_positions: Investors see their own positions
-- ============================================================================
CREATE POLICY investor_positions_select 
ON public.investor_positions 
FOR SELECT 
TO authenticated
USING (
  investor_id = auth.uid() 
  OR is_admin()
);

-- ============================================================================
-- funds: All authenticated users can see fund info (public catalog)
-- ============================================================================
CREATE POLICY funds_select 
ON public.funds 
FOR SELECT 
TO authenticated
USING (true);

-- ============================================================================
-- profiles: Users see their own profile, admins see all
-- ============================================================================
CREATE POLICY profiles_select 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  id = auth.uid() 
  OR is_admin()
);

-- Profiles: Users can update their own profile
CREATE POLICY profiles_update 
ON public.profiles 
FOR UPDATE 
TO authenticated
USING (id = auth.uid())
WITH CHECK (id = auth.uid());

-- ============================================================================
-- withdrawal_requests: Investors see their own, admins see all
-- ============================================================================
CREATE POLICY withdrawal_requests_select 
ON public.withdrawal_requests 
FOR SELECT 
TO authenticated
USING (
  investor_id = auth.uid() 
  OR is_admin()
);

-- Withdrawal: Investors can create their own requests
CREATE POLICY withdrawal_requests_insert 
ON public.withdrawal_requests 
FOR INSERT 
TO authenticated
WITH CHECK (investor_id = auth.uid());

-- ============================================================================
-- yield_distributions: Admin only (not investor-facing)
-- ============================================================================
CREATE POLICY yield_distributions_select 
ON public.yield_distributions 
FOR SELECT 
TO authenticated
USING (is_admin());

-- ============================================================================
-- yield_allocations: Investors see their own, admins see all
-- ============================================================================
CREATE POLICY yield_allocations_select 
ON public.yield_allocations 
FOR SELECT 
TO authenticated
USING (
  investor_id = auth.uid() 
  OR is_admin()
);

-- ============================================================================
-- notifications: Users see their own notifications
-- ============================================================================
CREATE POLICY notifications_select 
ON public.notifications 
FOR SELECT 
TO authenticated
USING (
  user_id = auth.uid() 
  OR is_admin()
);

-- ============================================================================
-- audit_log: Admin only
-- ============================================================================
CREATE POLICY audit_log_select 
ON public.audit_log 
FOR SELECT 
TO authenticated
USING (is_admin());

-- ============================================================================
-- Admin-only tables (no investor access)
-- ============================================================================
CREATE POLICY ib_allocations_select 
ON public.ib_allocations FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY ib_commission_ledger_select 
ON public.ib_commission_ledger FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY platform_fee_ledger_select 
ON public.platform_fee_ledger FOR SELECT TO authenticated USING (is_admin());

CREATE POLICY fee_allocations_select 
ON public.fee_allocations FOR SELECT TO authenticated USING (is_admin());

-- admin_invites may not exist in all environments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_invites') THEN
    EXECUTE 'CREATE POLICY admin_invites_select ON public.admin_invites FOR SELECT TO authenticated USING (is_admin())';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- onboarding_submissions may not exist in all environments
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'onboarding_submissions') THEN
    EXECUTE 'CREATE POLICY onboarding_submissions_select ON public.onboarding_submissions FOR SELECT TO authenticated USING (is_admin())';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ============================================================================
-- investor_fund_performance: Investors see their own, admins see all
-- ============================================================================
-- Enable RLS if not already enabled
ALTER TABLE IF EXISTS public.investor_fund_performance ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_fund_performance') THEN
    EXECUTE 'CREATE POLICY investor_fund_performance_select 
      ON public.investor_fund_performance 
      FOR SELECT 
      TO authenticated
      USING (investor_id = auth.uid() OR is_admin())';
  END IF;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- Note: INSERT/UPDATE/DELETE policies omitted - admin operations use SECURITY DEFINER RPCs
