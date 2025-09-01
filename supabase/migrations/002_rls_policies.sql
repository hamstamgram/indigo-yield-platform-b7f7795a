-- Migration: Row Level Security Policies
-- Version: 002
-- Date: 2025-09-01
-- Description: Implements comprehensive RLS policies for all tables

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.positions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.statements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fees ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_rates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.portfolio_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.deposits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_invites ENABLE ROW LEVEL SECURITY;

-- ========================================
-- PROFILES TABLE POLICIES
-- ========================================
-- Users can view their own profile or if they're admin
CREATE POLICY "profiles_select_policy" ON public.profiles
    FOR SELECT
    USING (auth.uid() = id OR public.is_admin());

-- Users can update their own profile or admins can update any
CREATE POLICY "profiles_update_policy" ON public.profiles
    FOR UPDATE
    USING (auth.uid() = id OR public.is_admin())
    WITH CHECK (auth.uid() = id OR public.is_admin());

-- Only system can insert profiles (via trigger on auth.users)
CREATE POLICY "profiles_insert_policy" ON public.profiles
    FOR INSERT
    WITH CHECK (auth.uid() = id);

-- No one can delete profiles directly
CREATE POLICY "profiles_delete_policy" ON public.profiles
    FOR DELETE
    USING (FALSE);

-- ========================================
-- ASSETS TABLE POLICIES
-- ========================================
-- Everyone can view active assets
CREATE POLICY "assets_select_policy" ON public.assets
    FOR SELECT
    USING (is_active = TRUE OR public.is_admin());

-- Only admins can modify assets
CREATE POLICY "assets_insert_policy" ON public.assets
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "assets_update_policy" ON public.assets
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "assets_delete_policy" ON public.assets
    FOR DELETE
    USING (public.is_admin());

-- ========================================
-- POSITIONS TABLE POLICIES
-- ========================================
-- Investors can see their own positions, admins can see all
CREATE POLICY "positions_select_policy" ON public.positions
    FOR SELECT
    USING (investor_id = auth.uid() OR public.is_admin());

-- Only admins can modify positions
CREATE POLICY "positions_insert_policy" ON public.positions
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "positions_update_policy" ON public.positions
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "positions_delete_policy" ON public.positions
    FOR DELETE
    USING (public.is_admin());

-- ========================================
-- TRANSACTIONS TABLE POLICIES
-- ========================================
-- Investors can see their own transactions, admins can see all
CREATE POLICY "transactions_select_policy" ON public.transactions
    FOR SELECT
    USING (investor_id = auth.uid() OR public.is_admin());

-- Only admins can create transactions
CREATE POLICY "transactions_insert_policy" ON public.transactions
    FOR INSERT
    WITH CHECK (public.is_admin());

-- Only admins can update transactions
CREATE POLICY "transactions_update_policy" ON public.transactions
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Only admins can delete transactions
CREATE POLICY "transactions_delete_policy" ON public.transactions
    FOR DELETE
    USING (public.is_admin());

-- ========================================
-- STATEMENTS TABLE POLICIES
-- ========================================
-- Investors can see their own statements, admins can see all
CREATE POLICY "statements_select_policy" ON public.statements
    FOR SELECT
    USING (investor_id = auth.uid() OR public.is_admin());

-- Only admins can create statements
CREATE POLICY "statements_insert_policy" ON public.statements
    FOR INSERT
    WITH CHECK (public.is_admin());

-- Only admins can update statements
CREATE POLICY "statements_update_policy" ON public.statements
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Only admins can delete statements
CREATE POLICY "statements_delete_policy" ON public.statements
    FOR DELETE
    USING (public.is_admin());

-- ========================================
-- FEES TABLE POLICIES
-- ========================================
-- Investors can see their own fees, admins can see all
CREATE POLICY "fees_select_policy" ON public.fees
    FOR SELECT
    USING (investor_id = auth.uid() OR public.is_admin());

-- Only admins can manage fees
CREATE POLICY "fees_insert_policy" ON public.fees
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "fees_update_policy" ON public.fees
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "fees_delete_policy" ON public.fees
    FOR DELETE
    USING (public.is_admin());

-- ========================================
-- AUDIT LOG TABLE POLICIES
-- ========================================
-- Everyone can insert audit logs (for tracking actions)
CREATE POLICY "audit_log_insert_policy" ON public.audit_log
    FOR INSERT
    WITH CHECK (TRUE);

-- Only admins can view audit logs
CREATE POLICY "audit_log_select_policy" ON public.audit_log
    FOR SELECT
    USING (public.is_admin());

-- No one can update audit logs
CREATE POLICY "audit_log_update_policy" ON public.audit_log
    FOR UPDATE
    USING (FALSE);

-- No one can delete audit logs
CREATE POLICY "audit_log_delete_policy" ON public.audit_log
    FOR DELETE
    USING (FALSE);

-- ========================================
-- YIELD RATES TABLE POLICIES
-- ========================================
-- Everyone can view yield rates
CREATE POLICY "yield_rates_select_policy" ON public.yield_rates
    FOR SELECT
    USING (TRUE);

-- Only admins can manage yield rates
CREATE POLICY "yield_rates_insert_policy" ON public.yield_rates
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "yield_rates_update_policy" ON public.yield_rates
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "yield_rates_delete_policy" ON public.yield_rates
    FOR DELETE
    USING (public.is_admin());

-- ========================================
-- PORTFOLIO HISTORY TABLE POLICIES
-- ========================================
-- Investors can see their own history, admins can see all
CREATE POLICY "portfolio_history_select_policy" ON public.portfolio_history
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

-- Only admins can manage portfolio history
CREATE POLICY "portfolio_history_insert_policy" ON public.portfolio_history
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "portfolio_history_update_policy" ON public.portfolio_history
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "portfolio_history_delete_policy" ON public.portfolio_history
    FOR DELETE
    USING (public.is_admin());

-- ========================================
-- DEPOSITS TABLE POLICIES
-- ========================================
-- Investors can see their own deposits, admins can see all
CREATE POLICY "deposits_select_policy" ON public.deposits
    FOR SELECT
    USING (user_id = auth.uid() OR public.is_admin());

-- Only admins can manage deposits
CREATE POLICY "deposits_insert_policy" ON public.deposits
    FOR INSERT
    WITH CHECK (public.is_admin());

CREATE POLICY "deposits_update_policy" ON public.deposits
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

CREATE POLICY "deposits_delete_policy" ON public.deposits
    FOR DELETE
    USING (public.is_admin());

-- ========================================
-- ADMIN INVITES TABLE POLICIES
-- ========================================
-- Only admins can see invites
CREATE POLICY "admin_invites_select_policy" ON public.admin_invites
    FOR SELECT
    USING (public.is_admin());

-- Only admins can create invites
CREATE POLICY "admin_invites_insert_policy" ON public.admin_invites
    FOR INSERT
    WITH CHECK (public.is_admin());

-- Only admins can update invites
CREATE POLICY "admin_invites_update_policy" ON public.admin_invites
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());

-- Only admins can delete invites
CREATE POLICY "admin_invites_delete_policy" ON public.admin_invites
    FOR DELETE
    USING (public.is_admin());

-- ========================================
-- Additional security functions
-- ========================================

-- Function to check if user can access investor data
CREATE OR REPLACE FUNCTION public.can_access_investor(investor_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN auth.uid() = investor_uuid OR public.is_admin();
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to log audit events
CREATE OR REPLACE FUNCTION public.log_audit_event(
    p_action TEXT,
    p_entity TEXT,
    p_entity_id TEXT DEFAULT NULL,
    p_old_values JSONB DEFAULT NULL,
    p_new_values JSONB DEFAULT NULL,
    p_meta JSONB DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
    v_audit_id UUID;
BEGIN
    INSERT INTO public.audit_log (
        actor_user,
        action,
        entity,
        entity_id,
        old_values,
        new_values,
        meta
    ) VALUES (
        auth.uid(),
        p_action,
        p_entity,
        p_entity_id,
        p_old_values,
        p_new_values,
        p_meta
    ) RETURNING id INTO v_audit_id;
    
    RETURN v_audit_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create audit triggers for sensitive operations
CREATE OR REPLACE FUNCTION public.audit_transaction_changes()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        PERFORM public.log_audit_event(
            'CREATE_TRANSACTION',
            'transactions',
            NEW.id::TEXT,
            NULL,
            row_to_json(NEW)::JSONB,
            jsonb_build_object('type', NEW.type, 'amount', NEW.amount)
        );
    ELSIF TG_OP = 'UPDATE' THEN
        PERFORM public.log_audit_event(
            'UPDATE_TRANSACTION',
            'transactions',
            NEW.id::TEXT,
            row_to_json(OLD)::JSONB,
            row_to_json(NEW)::JSONB,
            jsonb_build_object('status_change', OLD.status || ' -> ' || NEW.status)
        );
    ELSIF TG_OP = 'DELETE' THEN
        PERFORM public.log_audit_event(
            'DELETE_TRANSACTION',
            'transactions',
            OLD.id::TEXT,
            row_to_json(OLD)::JSONB,
            NULL,
            NULL
        );
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER audit_transactions_trigger
    AFTER INSERT OR UPDATE OR DELETE ON public.transactions
    FOR EACH ROW
    EXECUTE FUNCTION public.audit_transaction_changes();

-- Grant execute on security functions
GRANT EXECUTE ON FUNCTION public.can_access_investor(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.log_audit_event(TEXT, TEXT, TEXT, JSONB, JSONB, JSONB) TO authenticated;
