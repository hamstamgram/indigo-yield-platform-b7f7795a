-- =====================================================
-- CRITICAL BACKEND FIXES MIGRATION (v3)
-- Date: 2024-12-23
-- =====================================================

-- =====================================================
-- PHASE 1: DROP DUPLICATE FUNCTIONS
-- =====================================================

DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text, uuid);
DROP FUNCTION IF EXISTS public.apply_daily_yield_to_fund_v2(uuid, date, numeric, text, text);
DROP FUNCTION IF EXISTS public.compute_correction_input_hash(uuid, date, text, numeric);

-- =====================================================
-- PHASE 2: ADD MISSING FOREIGN KEY CONSTRAINTS
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'yield_distributions_fund_id_fkey' 
    AND table_name = 'yield_distributions'
  ) THEN
    ALTER TABLE public.yield_distributions 
    ADD CONSTRAINT yield_distributions_fund_id_fkey 
    FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'transactions_v2_fund_id_fkey' 
    AND table_name = 'transactions_v2'
  ) THEN
    ALTER TABLE public.transactions_v2 
    ADD CONSTRAINT transactions_v2_fund_id_fkey 
    FOREIGN KEY (fund_id) REFERENCES public.funds(id) ON DELETE RESTRICT;
  END IF;
END $$;

-- =====================================================
-- PHASE 3: CREATE YIELD_DISTRIBUTION_STATUS ENUM
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'yield_distribution_status') THEN
    CREATE TYPE public.yield_distribution_status AS ENUM ('draft', 'applied', 'voided');
  END IF;
END $$;

-- =====================================================
-- PHASE 4: SECURE EXPOSED VIEWS WITH RLS
-- =====================================================

CREATE OR REPLACE FUNCTION public.current_user_is_admin_or_owner(check_user_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT 
    CASE 
      WHEN auth.uid() IS NULL THEN false
      WHEN is_admin() THEN true
      WHEN auth.uid() = check_user_id THEN true
      ELSE false
    END
$$;

GRANT EXECUTE ON FUNCTION public.current_user_is_admin_or_owner(uuid) TO authenticated;

-- Recreate v_investor_kpis with correct columns
DROP VIEW IF EXISTS public.v_investor_kpis;
CREATE VIEW public.v_investor_kpis 
WITH (security_invoker = true)
AS
SELECT 
  p.id as investor_id,
  COALESCE(p.first_name || ' ' || p.last_name, p.email) as name,
  p.email,
  p.status,
  p.kyc_status,
  COUNT(DISTINCT ip.fund_id) as funds_invested,
  COALESCE(SUM(ip.current_value), 0) as total_value,
  COALESCE(SUM(ip.cost_basis), 0) as total_invested,
  COALESCE(SUM(ip.unrealized_pnl), 0) as total_unrealized_pnl,
  COALESCE(SUM(ip.realized_pnl), 0) as total_realized_pnl,
  COALESCE(SUM(ip.mgmt_fees_paid), 0) as total_mgmt_fees,
  COALESCE(SUM(ip.perf_fees_paid), 0) as total_perf_fees,
  MIN(ip.last_transaction_date) as first_investment_date,
  MAX(ip.last_transaction_date) as last_activity_date
FROM public.profiles p
LEFT JOIN public.investor_positions ip ON p.id = ip.investor_id
WHERE is_admin() OR p.id = auth.uid()
GROUP BY p.id, p.first_name, p.last_name, p.email, p.status, p.kyc_status;

-- Recreate v_live_investor_balances
DROP VIEW IF EXISTS public.v_live_investor_balances;
CREATE VIEW public.v_live_investor_balances
WITH (security_invoker = true)
AS
SELECT 
  ip.investor_id,
  f.name as fund_name,
  ip.current_value as last_reported_balance,
  0::numeric as recent_deposits,
  0::numeric as recent_withdrawals,
  ip.current_value as live_balance
FROM public.investor_positions ip
JOIN public.funds f ON ip.fund_id = f.id
WHERE is_admin() OR ip.investor_id = auth.uid();

-- Recreate audit_events_v with admin-only
DROP VIEW IF EXISTS public.audit_events_v;
CREATE VIEW public.audit_events_v
WITH (security_invoker = true)
AS
SELECT 
  al.id as event_id,
  al.table_name as source_table,
  al.action as operation,
  al.table_name as entity,
  al.record_id::text as entity_id,
  al.user_id,
  al.changes as old_values,
  al.changes as new_values,
  '{}'::jsonb as meta,
  al.created_at,
  al.user_id as actor_user
FROM public.audit_logs al
WHERE is_admin();

-- Recreate monthly_fee_summary admin-only
DROP VIEW IF EXISTS public.monthly_fee_summary;
CREATE VIEW public.monthly_fee_summary
WITH (security_invoker = true)
AS
SELECT 
  to_char(fa.period_start, 'YYYY-MM') as summary_month,
  'USDT' as asset_code,
  SUM(fa.fee_amount) as total_fees_collected,
  SUM(fa.base_net_income + fa.fee_amount) as total_gross_yield,
  SUM(fa.base_net_income) as total_net_yield,
  COUNT(DISTINCT fa.investor_id) as investor_count
FROM public.fee_allocations fa
WHERE is_admin() AND fa.is_voided = false
GROUP BY to_char(fa.period_start, 'YYYY-MM');

-- =====================================================
-- PHASE 5: TIGHTEN RLS POLICIES
-- =====================================================

DROP POLICY IF EXISTS "Funds visible to authenticated" ON public.funds;
DROP POLICY IF EXISTS "funds_select_policy" ON public.funds;

CREATE POLICY "funds_select_authenticated" 
ON public.funds FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "benchmarks_select_policy" ON public.benchmarks;
CREATE POLICY "benchmarks_select_authenticated" 
ON public.benchmarks FOR SELECT 
USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "yield_rates_select_policy" ON public.yield_rates;
CREATE POLICY "yield_rates_select_authenticated" 
ON public.yield_rates FOR SELECT 
USING (auth.uid() IS NOT NULL);

DO $$ BEGIN
  CREATE POLICY "yield_rates_insert_admin" ON public.yield_rates FOR INSERT WITH CHECK (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "yield_rates_update_admin" ON public.yield_rates FOR UPDATE USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "yield_rates_delete_admin" ON public.yield_rates FOR DELETE USING (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DROP POLICY IF EXISTS "access_logs_select_policy" ON public.access_logs;
DO $$ BEGIN
  CREATE POLICY "access_logs_select_own_or_admin" ON public.access_logs FOR SELECT 
  USING (user_id = auth.uid() OR is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "fund_fee_history_select_authenticated" ON public.fund_fee_history FOR SELECT 
  USING (auth.uid() IS NOT NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "fund_fee_history_insert_admin" ON public.fund_fee_history FOR INSERT 
  WITH CHECK (is_admin());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "web_push_subscriptions_select_own" ON public.web_push_subscriptions FOR SELECT 
  USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "web_push_subscriptions_update_own" ON public.web_push_subscriptions FOR UPDATE 
  USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "web_push_subscriptions_delete_own" ON public.web_push_subscriptions FOR DELETE 
  USING (user_id = auth.uid());
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investor_monthly_reports_insert_admin" ON public.investor_monthly_reports FOR INSERT 
  WITH CHECK (check_is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investor_monthly_reports_update_admin" ON public.investor_monthly_reports FOR UPDATE 
  USING (check_is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  CREATE POLICY "investor_monthly_reports_delete_admin" ON public.investor_monthly_reports FOR DELETE 
  USING (check_is_admin(auth.uid()));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- =====================================================
-- PHASE 6: ADD PRIMARY KEY TO investor_positions
-- =====================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_type = 'PRIMARY KEY' 
    AND table_name = 'investor_positions'
  ) THEN
    ALTER TABLE public.investor_positions 
    ADD CONSTRAINT investor_positions_pkey PRIMARY KEY (investor_id, fund_id);
  END IF;
END $$;