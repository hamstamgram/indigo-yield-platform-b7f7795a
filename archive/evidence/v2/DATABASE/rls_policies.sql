-- INDIGO Platform RLS Policies
-- Generated: 2024-12-21
-- Source: SELECT * FROM pg_policies WHERE schemaname = 'public'

-- ============================================================================
-- TABLE: investor_fund_performance
-- Investors can only see their own performance data
-- ============================================================================
CREATE POLICY "Admins can manage performance data" ON public.investor_fund_performance
    FOR ALL
    USING (EXISTS (
        SELECT 1 FROM profiles
        WHERE profiles.id = auth.uid() AND profiles.is_admin = true
    ));

CREATE POLICY "Performance own access" ON public.investor_fund_performance
    FOR SELECT
    USING (
        investor_id = auth.uid() 
        OR (SELECT profiles.is_admin FROM profiles WHERE profiles.id = auth.uid())
    );

CREATE POLICY "investor_fund_performance_select_own" ON public.investor_fund_performance
    FOR SELECT
    USING (investor_id = auth.uid() OR is_admin());

-- ============================================================================
-- TABLE: generated_statements
-- Users can only see their own statements
-- ============================================================================
CREATE POLICY "Admins can manage statements" ON public.generated_statements
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

CREATE POLICY "Users can view own statements" ON public.generated_statements
    FOR SELECT
    USING (investor_id = auth.uid() OR user_id = auth.uid());

-- ============================================================================
-- TABLE: transactions_v2
-- Strict access control on transaction records
-- ============================================================================
CREATE POLICY "transactions_v2_select_own_or_admin" ON public.transactions_v2
    FOR SELECT
    USING (investor_id = auth.uid() OR is_admin());

CREATE POLICY "transactions_v2_insert_admin" ON public.transactions_v2
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "transactions_v2_update_admin" ON public.transactions_v2
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "transactions_v2_delete_admin" ON public.transactions_v2
    FOR DELETE
    USING (is_admin());

-- ============================================================================
-- TABLE: fee_allocations
-- Fee records visible to the investor or admin
-- ============================================================================
CREATE POLICY "fee_allocations_select_own" ON public.fee_allocations
    FOR SELECT
    USING (investor_id = auth.uid() OR is_admin());

CREATE POLICY "fee_allocations_insert_admin" ON public.fee_allocations
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "fee_allocations_update_admin" ON public.fee_allocations
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "fee_allocations_delete_admin" ON public.fee_allocations
    FOR DELETE
    USING (is_admin());

-- ============================================================================
-- TABLE: ib_allocations
-- IB can see their own commissions, admin can manage all
-- ============================================================================
CREATE POLICY "ib_allocations_select_own_ib" ON public.ib_allocations
    FOR SELECT
    USING (ib_investor_id = auth.uid());

CREATE POLICY "ib_allocations_select_admin" ON public.ib_allocations
    FOR SELECT
    USING (is_admin());

CREATE POLICY "ib_allocations_insert_admin" ON public.ib_allocations
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "ib_allocations_update_admin" ON public.ib_allocations
    FOR UPDATE
    USING (is_admin());

CREATE POLICY "ib_allocations_delete_admin" ON public.ib_allocations
    FOR DELETE
    USING (is_admin());

-- ============================================================================
-- TABLE: daily_nav
-- Purpose-based visibility: investors only see reporting, admins see all
-- ============================================================================
CREATE POLICY "Admins can view all daily_nav" ON public.daily_nav
    FOR SELECT
    USING (is_admin());

CREATE POLICY "Investors see reporting nav only" ON public.daily_nav
    FOR SELECT
    USING (
        auth.uid() IS NOT NULL 
        AND (is_admin() OR purpose = 'reporting'::aum_purpose)
    );

-- ============================================================================
-- TABLE: investor_positions
-- Investors see own positions, admin sees all
-- ============================================================================
CREATE POLICY "investor_positions_select_own" ON public.investor_positions
    FOR SELECT
    USING (investor_id = auth.uid() OR is_admin());

CREATE POLICY "investor_positions_insert_admin" ON public.investor_positions
    FOR INSERT
    WITH CHECK (is_admin());

CREATE POLICY "investor_positions_update_admin" ON public.investor_positions
    FOR UPDATE
    USING (is_admin());

-- ============================================================================
-- TABLE: profiles
-- Users can see their own profile, admins can manage all
-- ============================================================================
CREATE POLICY "profiles_select_own" ON public.profiles
    FOR SELECT
    USING (id = auth.uid() OR is_admin());

CREATE POLICY "profiles_update_own" ON public.profiles
    FOR UPDATE
    USING (id = auth.uid());

CREATE POLICY "profiles_admin_manage" ON public.profiles
    FOR ALL
    USING (is_admin())
    WITH CHECK (is_admin());

-- ============================================================================
-- HELPER FUNCTIONS for RLS
-- ============================================================================
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND is_admin = true
    );
$$;

CREATE OR REPLACE FUNCTION public.is_admin_for_jwt()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT 
        (auth.jwt() ->> 'role') = 'service_role'
        OR EXISTS (
            SELECT 1 FROM public.profiles
            WHERE id = auth.uid() AND is_admin = true
        );
$$;

CREATE OR REPLACE FUNCTION public.has_role(user_id uuid, required_role app_role)
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
STABLE
AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.user_roles
        WHERE user_roles.user_id = $1 AND user_roles.role = $2
    );
$$;
