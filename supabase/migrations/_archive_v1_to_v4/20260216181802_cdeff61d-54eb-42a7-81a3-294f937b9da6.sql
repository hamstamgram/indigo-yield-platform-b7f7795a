
-- =============================================================
-- SECURITY FIX: Replace profiles.is_admin RLS with is_admin()
-- Affects: fund_aum_events, global_fee_settings, investor_fund_performance,
--          statement_periods, system_config
-- =============================================================

-- 1. fund_aum_events (3 policies)
DROP POLICY IF EXISTS "Admins can insert fund AUM events" ON public.fund_aum_events;
DROP POLICY IF EXISTS "Admins can update fund AUM events" ON public.fund_aum_events;
DROP POLICY IF EXISTS "Admins can view all fund AUM events" ON public.fund_aum_events;

CREATE POLICY "Admins can view all fund AUM events"
  ON public.fund_aum_events FOR SELECT
  USING (is_admin());

CREATE POLICY "Admins can insert fund AUM events"
  ON public.fund_aum_events FOR INSERT
  WITH CHECK (is_admin());

CREATE POLICY "Admins can update fund AUM events"
  ON public.fund_aum_events FOR UPDATE
  USING (is_admin())
  WITH CHECK (is_admin());

-- 2. global_fee_settings (1 policy)
DROP POLICY IF EXISTS "Admins can manage fee settings" ON public.global_fee_settings;

CREATE POLICY "Admins can manage fee settings"
  ON public.global_fee_settings FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 3. investor_fund_performance (1 policy -- keep investor_fund_performance_select_own as-is)
DROP POLICY IF EXISTS "Admins can manage performance data" ON public.investor_fund_performance;

CREATE POLICY "Admins can manage performance data"
  ON public.investor_fund_performance FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 4. statement_periods (1 insecure policy; keep statement_periods_admin which uses check_is_admin)
DROP POLICY IF EXISTS "Admins can manage statement periods" ON public.statement_periods;

CREATE POLICY "Admins can manage statement periods"
  ON public.statement_periods FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());

-- 5. system_config (1 insecure policy; keep system_config_write which already uses is_admin())
DROP POLICY IF EXISTS "system_config_admin_all" ON public.system_config;

CREATE POLICY "system_config_admin_all"
  ON public.system_config FOR ALL
  USING (is_admin())
  WITH CHECK (is_admin());
