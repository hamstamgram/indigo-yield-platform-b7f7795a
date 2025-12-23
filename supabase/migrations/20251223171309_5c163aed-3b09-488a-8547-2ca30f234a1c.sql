-- =====================================================
-- BACKEND SECURITY HARDENING - PHASE 2-5 ONLY
-- (Skipping enum conversion due to type conflict)
-- =====================================================

-- PHASE 1: DROP DUPLICATE FUNCTIONS
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric, text);
DROP FUNCTION IF EXISTS public.adjust_investor_position(uuid, uuid, numeric);

-- PHASE 2: SECURE REMAINING UNPROTECTED VIEWS

DROP VIEW IF EXISTS public.import_status;
CREATE OR REPLACE VIEW public.import_status WITH (security_invoker = true) AS
SELECT e.id, e.filename, e.import_type, e.status, e.rows_processed, e.rows_succeeded, e.rows_failed, e.errors, e.started_at, e.completed_at, e.created_at, e.imported_by
FROM public.excel_import_log e WHERE public.is_admin();

DROP VIEW IF EXISTS public.platform_fees_collected;
CREATE OR REPLACE VIEW public.platform_fees_collected WITH (security_invoker = true) AS
SELECT fa.fund_id, f.name as fund_name, fa.period_start, fa.period_end, SUM(fa.fee_amount) as total_fees, COUNT(DISTINCT fa.investor_id) as investor_count
FROM public.fee_allocations fa JOIN public.funds f ON f.id = fa.fund_id
WHERE public.is_admin() AND fa.is_voided = false
GROUP BY fa.fund_id, f.name, fa.period_start, fa.period_end;

DROP VIEW IF EXISTS public.position_transaction_reconciliation;
CREATE OR REPLACE VIEW public.position_transaction_reconciliation WITH (security_invoker = true) AS
SELECT ip.investor_id, ip.fund_id, ip.shares as position_shares, ip.current_value as position_value,
  COALESCE(SUM(CASE WHEN t.type::text IN ('deposit', 'yield', 'ib_credit') THEN t.amount ELSE 0 END), 0) as total_credits,
  COALESCE(SUM(CASE WHEN t.type::text IN ('withdrawal', 'fee', 'ib_debit') THEN t.amount ELSE 0 END), 0) as total_debits
FROM public.investor_positions ip LEFT JOIN public.transactions_v2 t ON t.investor_id = ip.investor_id AND t.fund_id = ip.fund_id
WHERE public.is_admin() GROUP BY ip.investor_id, ip.fund_id, ip.shares, ip.current_value;

DROP VIEW IF EXISTS public.v_itd_returns;
CREATE OR REPLACE VIEW public.v_itd_returns WITH (security_invoker = true) AS
SELECT ip.investor_id, ip.fund_id, f.name as fund_name, ip.cost_basis, ip.current_value, ip.unrealized_pnl, ip.realized_pnl,
  CASE WHEN ip.cost_basis > 0 THEN ((ip.current_value - ip.cost_basis) / ip.cost_basis * 100) ELSE 0 END as itd_return_pct
FROM public.investor_positions ip JOIN public.funds f ON f.id = ip.fund_id
WHERE public.is_admin() OR ip.investor_id = auth.uid();

DROP VIEW IF EXISTS public.withdrawal_queue;
CREATE OR REPLACE VIEW public.withdrawal_queue WITH (security_invoker = true) AS
SELECT wr.id, wr.investor_id, wr.fund_id, f.name as fund_name, wr.requested_amount as amount, wr.status, wr.request_date as requested_at, wr.processed_at, wr.notes
FROM public.withdrawal_requests wr JOIN public.funds f ON f.id = wr.fund_id
WHERE public.is_admin() OR wr.investor_id = auth.uid();

-- PHASE 4: CONSOLIDATE DUPLICATE RLS POLICIES

DROP POLICY IF EXISTS "investor_invites_admin_all" ON public.investor_invites;
DROP POLICY IF EXISTS "Admins can manage investor_invites" ON public.investor_invites;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'investor_invites' AND policyname = 'investor_invites_admin_manage') THEN
    CREATE POLICY "investor_invites_admin_manage" ON public.investor_invites FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
END $$;

DROP POLICY IF EXISTS "profiles_admin_all" ON public.profiles;
DROP POLICY IF EXISTS "Admins can manage all profiles" ON public.profiles;
DROP POLICY IF EXISTS "profiles_select_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can view their own profile" ON public.profiles;
DROP POLICY IF EXISTS "profiles_update_own" ON public.profiles;
DROP POLICY IF EXISTS "Users can update their own profile" ON public.profiles;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_admin_full_access') THEN
    CREATE POLICY "profiles_admin_full_access" ON public.profiles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_select_own_consolidated') THEN
    CREATE POLICY "profiles_select_own_consolidated" ON public.profiles FOR SELECT USING (id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'profiles_update_own_consolidated') THEN
    CREATE POLICY "profiles_update_own_consolidated" ON public.profiles FOR UPDATE USING (id = auth.uid()) WITH CHECK (id = auth.uid());
  END IF;
END $$;

DROP POLICY IF EXISTS "user_roles_admin_all" ON public.user_roles;
DROP POLICY IF EXISTS "Admins can manage user_roles" ON public.user_roles;
DROP POLICY IF EXISTS "user_roles_select_own" ON public.user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'user_roles_admin_manage') THEN
    CREATE POLICY "user_roles_admin_manage" ON public.user_roles FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'user_roles' AND policyname = 'user_roles_select_own_consolidated') THEN
    CREATE POLICY "user_roles_select_own_consolidated" ON public.user_roles FOR SELECT USING (user_id = auth.uid());
  END IF;
END $$;

DROP POLICY IF EXISTS "withdrawal_requests_admin_all" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Admins can manage withdrawal_requests" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "withdrawal_requests_select_own" ON public.withdrawal_requests;
DROP POLICY IF EXISTS "Users can view their own withdrawal_requests" ON public.withdrawal_requests;
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_requests' AND policyname = 'withdrawal_requests_admin_manage') THEN
    CREATE POLICY "withdrawal_requests_admin_manage" ON public.withdrawal_requests FOR ALL USING (public.is_admin()) WITH CHECK (public.is_admin());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_requests' AND policyname = 'withdrawal_requests_select_own_consolidated') THEN
    CREATE POLICY "withdrawal_requests_select_own_consolidated" ON public.withdrawal_requests FOR SELECT USING (investor_id = auth.uid());
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE tablename = 'withdrawal_requests' AND policyname = 'withdrawal_requests_insert_own') THEN
    CREATE POLICY "withdrawal_requests_insert_own" ON public.withdrawal_requests FOR INSERT WITH CHECK (investor_id = auth.uid());
  END IF;
END $$;

-- PHASE 5: ADD MISSING FOREIGN KEY CONSTRAINTS
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'fee_allocations_distribution_id_fkey' AND table_name = 'fee_allocations') THEN
    ALTER TABLE public.fee_allocations ADD CONSTRAINT fee_allocations_distribution_id_fkey FOREIGN KEY (distribution_id) REFERENCES public.yield_distributions(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FK fee_allocations: %', SQLERRM;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'ib_allocations_distribution_id_fkey_v2' AND table_name = 'ib_allocations') THEN
    ALTER TABLE public.ib_allocations ADD CONSTRAINT ib_allocations_distribution_id_fkey_v2 FOREIGN KEY (distribution_id) REFERENCES public.yield_distributions(id) ON DELETE SET NULL;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FK ib_allocations: %', SQLERRM;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_name = 'transactions_v2_investor_id_fkey' AND table_name = 'transactions_v2') THEN
    ALTER TABLE public.transactions_v2 ADD CONSTRAINT transactions_v2_investor_id_fkey FOREIGN KEY (investor_id) REFERENCES public.profiles(id) ON DELETE CASCADE;
  END IF;
EXCEPTION WHEN OTHERS THEN RAISE NOTICE 'FK transactions_v2: %', SQLERRM;
END $$;