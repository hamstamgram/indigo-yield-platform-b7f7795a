-- Phase 18: Audit Remediation - Quick Wins

-- 1. Function Security: Set search_path to public
ALTER FUNCTION public.unvoid_transaction(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.unvoid_transactions_bulk(uuid[], uuid, text) SET search_path = public;
ALTER FUNCTION public.void_transaction(uuid, uuid, text) SET search_path = public;
ALTER FUNCTION public.void_transactions_bulk(uuid[], uuid, text) SET search_path = public;

-- sync_yield_to_investor_yield_events is a trigger function, it takes no arguments
ALTER FUNCTION public.sync_yield_to_investor_yield_events() SET search_path = public;


-- 2. Database Indexes: Add missing FK indexes to improve join performance
CREATE INDEX IF NOT EXISTS idx_documents_created_by ON public.documents(created_by);
CREATE INDEX IF NOT EXISTS idx_fee_allocations_fees_account_id ON public.fee_allocations(fees_account_id);
CREATE INDEX IF NOT EXISTS idx_fee_allocations_voided_by ON public.fee_allocations(voided_by);
CREATE INDEX IF NOT EXISTS idx_fund_yield_snapshots_fund_id ON public.fund_yield_snapshots(fund_id);
CREATE INDEX IF NOT EXISTS idx_ib_allocations_distribution_id ON public.ib_allocations(distribution_id);
CREATE INDEX IF NOT EXISTS idx_ib_allocations_fund_id ON public.ib_allocations(fund_id);
CREATE INDEX IF NOT EXISTS idx_ib_allocations_voided_by ON public.ib_allocations(voided_by);
CREATE INDEX IF NOT EXISTS idx_ib_commission_schedule_fund_id ON public.ib_commission_schedule(fund_id);
CREATE INDEX IF NOT EXISTS idx_investor_daily_balance_fund_id ON public.investor_daily_balance(fund_id);
CREATE INDEX IF NOT EXISTS idx_investor_fee_schedule_fund_id ON public.investor_fee_schedule(fund_id);
CREATE INDEX IF NOT EXISTS idx_investor_position_snapshots_investor_id ON public.investor_position_snapshots(investor_id);
CREATE INDEX IF NOT EXISTS idx_yield_distributions_consolidated_into_id ON public.yield_distributions(consolidated_into_id);


-- 3. RLS Optimization: Cache auth.uid() with scalar subqueries (select auth.uid())

-- investor_yield_events
DROP POLICY IF EXISTS "investor_yield_events_select" ON public.investor_yield_events;
CREATE POLICY "investor_yield_events_select" ON public.investor_yield_events
FOR SELECT USING (
  ((investor_id = (SELECT auth.uid())) AND (visibility_scope = 'investor_visible'::text)) OR (SELECT is_admin())
);

-- transactions_v2
DROP POLICY IF EXISTS "transactions_v2_select" ON public.transactions_v2;
CREATE POLICY "transactions_v2_select" ON public.transactions_v2
FOR SELECT USING (
  ((investor_id = (SELECT auth.uid())) AND (visibility_scope = 'investor_visible'::visibility_scope)) OR (SELECT is_admin())
);

-- investor_positions
DROP POLICY IF EXISTS "investor_positions_select" ON public.investor_positions;
CREATE POLICY "investor_positions_select" ON public.investor_positions
FOR SELECT USING (
  (investor_id = (SELECT auth.uid())) OR (SELECT is_admin())
);

-- profiles
DROP POLICY IF EXISTS "profiles_select" ON public.profiles;
CREATE POLICY "profiles_select" ON public.profiles
FOR SELECT USING (
  (id = (SELECT auth.uid())) OR (SELECT is_admin())
);

DROP POLICY IF EXISTS "profiles_update" ON public.profiles;
CREATE POLICY "profiles_update" ON public.profiles
FOR UPDATE USING (
  (id = (SELECT auth.uid()))
) WITH CHECK (
  (id = (SELECT auth.uid()))
);

-- withdrawal_requests
DROP POLICY IF EXISTS "withdrawal_requests_select" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests_select" ON public.withdrawal_requests
FOR SELECT USING (
  (investor_id = (SELECT auth.uid())) OR (SELECT is_admin())
);

DROP POLICY IF EXISTS "withdrawal_requests_insert" ON public.withdrawal_requests;
CREATE POLICY "withdrawal_requests_insert" ON public.withdrawal_requests
FOR INSERT WITH CHECK (
  (investor_id = (SELECT auth.uid()))
);

-- yield_allocations
DROP POLICY IF EXISTS "yield_allocations_select" ON public.yield_allocations;
CREATE POLICY "yield_allocations_select" ON public.yield_allocations
FOR SELECT USING (
  (investor_id = (SELECT auth.uid())) OR (SELECT is_admin())
);

-- notifications
DROP POLICY IF EXISTS "notifications_select" ON public.notifications;
CREATE POLICY "notifications_select" ON public.notifications
FOR SELECT USING (
  (user_id = (SELECT auth.uid())) OR (SELECT is_admin())
);

-- ib_commission_schedule
DROP POLICY IF EXISTS "investor_select" ON public.ib_commission_schedule;
CREATE POLICY "investor_select" ON public.ib_commission_schedule
FOR SELECT USING (
  (investor_id = (SELECT auth.uid()))
);
