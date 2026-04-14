
-- =============================================================================
-- P0: STANDARDIZE ADMIN-CHECK FUNCTIONS
-- =============================================================================

CREATE OR REPLACE FUNCTION public.is_admin()
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = auth.uid()
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
$function$;

CREATE OR REPLACE FUNCTION public.is_admin(p_user_id uuid)
 RETURNS boolean
 LANGUAGE sql
 STABLE SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = p_user_id
    AND role IN ('admin'::app_role, 'super_admin'::app_role)
  )
$function$;

-- Drop ALL policies that reference is_admin_for_jwt FIRST
DROP POLICY IF EXISTS "assets_delete_admin" ON public.assets;
DROP POLICY IF EXISTS "assets_insert_admin" ON public.assets;
DROP POLICY IF EXISTS "assets_update_admin" ON public.assets;
DROP POLICY IF EXISTS "audit_log_select_admin" ON public.audit_log;
DROP POLICY IF EXISTS "statements_delete_admin" ON public.statements;
DROP POLICY IF EXISTS "statements_insert_admin" ON public.statements;
DROP POLICY IF EXISTS "statements_select_admin" ON public.statements;
DROP POLICY IF EXISTS "statements_update_admin" ON public.statements;
DROP POLICY IF EXISTS "statements_delete_admin" ON storage.objects;
DROP POLICY IF EXISTS "statements_insert_admin" ON storage.objects;
DROP POLICY IF EXISTS "statements_select_admin" ON storage.objects;
DROP POLICY IF EXISTS "statements_update_admin" ON storage.objects;

-- Drop ALL policies that reference is_admin_safe
DROP POLICY IF EXISTS "admin_transactions_all" ON public.transactions_v2;
DROP POLICY IF EXISTS "admin_yield_delete" ON public.yield_distributions;
DROP POLICY IF EXISTS "admin_yield_insert" ON public.yield_distributions;
DROP POLICY IF EXISTS "admin_yield_select" ON public.yield_distributions;
DROP POLICY IF EXISTS "admin_yield_update" ON public.yield_distributions;
DROP POLICY IF EXISTS "investor_emails_admin_manage" ON public.investor_emails;
DROP POLICY IF EXISTS "investor_emails_select_own_or_admin" ON public.investor_emails;
DROP POLICY IF EXISTS "rate_limit_config_admin" ON public.rate_limit_config;
DROP POLICY IF EXISTS "profiles_select_own_or_admin_strict" ON public.profiles;

-- Drop ALL policies that reference check_is_admin
DROP POLICY IF EXISTS "statements_admin_all" ON public.statements;
DROP POLICY IF EXISTS "statement_periods_admin" ON public.statement_periods;
DROP POLICY IF EXISTS "data_edit_audit_select" ON public.data_edit_audit;
DROP POLICY IF EXISTS "Admin can update all tickets" ON public.support_tickets;
DROP POLICY IF EXISTS "Admin can view all tickets" ON public.support_tickets;

-- Now safe to drop redundant functions
DROP FUNCTION IF EXISTS public.is_admin_for_jwt();
DROP FUNCTION IF EXISTS public.is_admin_safe();

-- Recreate all policies using canonical is_admin()
CREATE POLICY "assets_delete_admin" ON public.assets FOR DELETE USING (is_admin());
CREATE POLICY "assets_insert_admin" ON public.assets FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "assets_update_admin" ON public.assets FOR UPDATE USING (is_admin());

CREATE POLICY "admin_transactions_all" ON public.transactions_v2 FOR ALL USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "admin_yield_delete" ON public.yield_distributions FOR DELETE USING (is_admin());
CREATE POLICY "admin_yield_insert" ON public.yield_distributions FOR INSERT WITH CHECK (is_admin());
CREATE POLICY "admin_yield_select" ON public.yield_distributions FOR SELECT USING (is_admin());
CREATE POLICY "admin_yield_update" ON public.yield_distributions FOR UPDATE USING (is_admin()) WITH CHECK (is_admin());

CREATE POLICY "investor_emails_admin_manage" ON public.investor_emails FOR ALL USING (is_admin());
CREATE POLICY "investor_emails_select_own_or_admin" ON public.investor_emails
  FOR SELECT USING ((investor_id = ( SELECT auth.uid() AS uid)) OR is_admin());

CREATE POLICY "rate_limit_config_admin" ON public.rate_limit_config FOR ALL USING (is_admin());

CREATE POLICY "profiles_select_own_or_admin_strict" ON public.profiles
  FOR SELECT USING ((( SELECT auth.uid() AS uid) = id) OR is_admin());

CREATE POLICY "data_edit_audit_select" ON public.data_edit_audit
  FOR SELECT USING ((edited_by = ( SELECT auth.uid() AS uid)) OR is_admin());

CREATE POLICY "Admin can update all tickets" ON public.support_tickets FOR UPDATE USING (is_admin());
CREATE POLICY "Admin can view all tickets" ON public.support_tickets
  FOR SELECT USING ((user_id = ( SELECT auth.uid() AS uid)) OR is_admin());

-- Storage policies
CREATE POLICY "statements_delete_admin" ON storage.objects FOR DELETE USING ((bucket_id = 'statements'::text) AND is_admin());
CREATE POLICY "statements_insert_admin" ON storage.objects FOR INSERT WITH CHECK ((bucket_id = 'statements'::text) AND is_admin());
CREATE POLICY "statements_select_admin" ON storage.objects FOR SELECT USING ((bucket_id = 'statements'::text) AND is_admin());
CREATE POLICY "statements_update_admin" ON storage.objects FOR UPDATE USING ((bucket_id = 'statements'::text) AND is_admin()) WITH CHECK ((bucket_id = 'statements'::text) AND is_admin());

-- =============================================================================
-- P1: REMOVE REDUNDANT RLS POLICIES (statements already handled above)
-- =============================================================================

-- statements: single ALL policy replaces the 4 per-command + 1 ALL
CREATE POLICY "statements_admin_all" ON public.statements FOR ALL USING (is_admin()) WITH CHECK (is_admin());

-- statement_periods: duplicate ALL was already dropped above

-- withdrawal_requests: drop duplicate investor SELECT
DROP POLICY IF EXISTS "investors_view_own_withdrawals" ON public.withdrawal_requests;

-- =============================================================================
-- P2: ADD UNIQUE CONSTRAINTS TO FINANCIAL TABLES
-- =============================================================================

CREATE UNIQUE INDEX IF NOT EXISTS uq_investor_positions_investor_fund
  ON public.investor_positions (investor_id, fund_id);

CREATE UNIQUE INDEX IF NOT EXISTS uq_fund_daily_aum_fund_date_purpose
  ON public.fund_daily_aum (fund_id, aum_date, purpose)
  WHERE NOT is_voided;

CREATE UNIQUE INDEX IF NOT EXISTS uq_platform_fee_ledger_dist_investor
  ON public.platform_fee_ledger (yield_distribution_id, investor_id)
  WHERE NOT is_voided;

CREATE UNIQUE INDEX IF NOT EXISTS uq_ib_commission_dist_source_ib
  ON public.ib_commission_ledger (yield_distribution_id, source_investor_id, ib_id)
  WHERE (is_voided IS NOT TRUE);

-- =============================================================================
-- P3: ADD FOREIGN KEY CONSTRAINTS (NOT VALID)
-- =============================================================================

ALTER TABLE public.transactions_v2
  ADD CONSTRAINT fk_transactions_v2_fund_id
    FOREIGN KEY (fund_id) REFERENCES public.funds(id) NOT VALID;

ALTER TABLE public.transactions_v2
  ADD CONSTRAINT fk_transactions_v2_investor_id
    FOREIGN KEY (investor_id) REFERENCES public.profiles(id) NOT VALID;

ALTER TABLE public.investor_positions
  ADD CONSTRAINT fk_investor_positions_fund_id
    FOREIGN KEY (fund_id) REFERENCES public.funds(id) NOT VALID;

ALTER TABLE public.investor_positions
  ADD CONSTRAINT fk_investor_positions_investor_id
    FOREIGN KEY (investor_id) REFERENCES public.profiles(id) NOT VALID;

ALTER TABLE public.fee_allocations
  ADD CONSTRAINT fk_fee_allocations_distribution_id_v3
    FOREIGN KEY (distribution_id) REFERENCES public.yield_distributions(id) NOT VALID;

ALTER TABLE public.fee_allocations
  ADD CONSTRAINT fk_fee_allocations_fund_id_v3
    FOREIGN KEY (fund_id) REFERENCES public.funds(id) NOT VALID;

ALTER TABLE public.fee_allocations
  ADD CONSTRAINT fk_fee_allocations_investor_id_v3
    FOREIGN KEY (investor_id) REFERENCES public.profiles(id) NOT VALID;

-- =============================================================================
-- P4: REMOVE DUPLICATE AUDIT TRIGGERS (BLOAT SOURCE)
-- =============================================================================

DROP TRIGGER IF EXISTS audit_transactions_v2_changes ON public.transactions_v2;
DROP TRIGGER IF EXISTS audit_investor_positions_changes ON public.investor_positions;
DROP TRIGGER IF EXISTS audit_withdrawal_requests_changes ON public.withdrawal_requests;
