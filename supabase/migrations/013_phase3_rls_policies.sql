-- Migration: Phase 3 RLS Policies
-- Version: 005
-- Date: 2025-09-01
-- Description: Implements RLS policies for all Phase 3 new tables

-- Enable RLS on all new tables
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.yield_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_configurations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.access_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.secure_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.web_push_subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.benchmarks ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.balance_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fund_fee_history ENABLE ROW LEVEL SECURITY;
-- ========================================
-- SUPPORT TICKETS TABLE POLICIES
-- ========================================
-- LPs can insert their own tickets
CREATE POLICY "support_tickets_insert_policy" ON public.support_tickets
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
-- LPs can view their own tickets, admins can view all
CREATE POLICY "support_tickets_select_policy" ON public.support_tickets
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
-- LPs can update their own tickets (unless closed), admins can update all
CREATE POLICY "support_tickets_update_policy" ON public.support_tickets
    FOR UPDATE
    USING (
        (auth.uid() = user_id AND status != 'closed') OR 
        public.is_admin()
    )
    WITH CHECK (
        (auth.uid() = user_id AND status != 'closed') OR 
        public.is_admin()
    );
-- No one can delete support tickets
CREATE POLICY "support_tickets_delete_policy" ON public.support_tickets
    FOR DELETE
    USING (FALSE);
-- ========================================
-- YIELD SETTINGS TABLE POLICIES
-- ========================================
-- Only admins can manage yield settings
CREATE POLICY "yield_settings_select_policy" ON public.yield_settings
    FOR SELECT
    USING (public.is_admin());
CREATE POLICY "yield_settings_insert_policy" ON public.yield_settings
    FOR INSERT
    WITH CHECK (public.is_admin());
CREATE POLICY "yield_settings_update_policy" ON public.yield_settings
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
CREATE POLICY "yield_settings_delete_policy" ON public.yield_settings
    FOR DELETE
    USING (public.is_admin());
-- ========================================
-- DOCUMENTS TABLE POLICIES
-- ========================================
-- LPs can view their own documents, admins can view all
CREATE POLICY "documents_select_policy" ON public.documents
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
-- Only admins can create documents
CREATE POLICY "documents_insert_policy" ON public.documents
    FOR INSERT
    WITH CHECK (public.is_admin());
-- Only admins can update documents
CREATE POLICY "documents_update_policy" ON public.documents
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
-- Only admins can delete documents
CREATE POLICY "documents_delete_policy" ON public.documents
    FOR DELETE
    USING (public.is_admin());
-- ========================================
-- USER SESSIONS TABLE POLICIES
-- ========================================
-- LPs can view their own sessions, admins can view all
CREATE POLICY "user_sessions_select_policy" ON public.user_sessions
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
-- Sessions are created via Edge Functions only
CREATE POLICY "user_sessions_insert_policy" ON public.user_sessions
    FOR INSERT
    WITH CHECK (public.is_admin());
-- LPs can revoke their own sessions, admins can revoke any
CREATE POLICY "user_sessions_update_policy" ON public.user_sessions
    FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
-- No direct deletion of sessions
CREATE POLICY "user_sessions_delete_policy" ON public.user_sessions
    FOR DELETE
    USING (FALSE);
-- ========================================
-- NOTIFICATIONS TABLE POLICIES
-- ========================================
-- LPs can view their own notifications, admins can view all
CREATE POLICY "notifications_select_policy" ON public.notifications
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
-- Only admins can create notifications
CREATE POLICY "notifications_insert_policy" ON public.notifications
    FOR INSERT
    WITH CHECK (public.is_admin());
-- LPs can update read_at on their own notifications, admins can update all
CREATE POLICY "notifications_update_policy" ON public.notifications
    FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
-- No one can delete notifications
CREATE POLICY "notifications_delete_policy" ON public.notifications
    FOR DELETE
    USING (FALSE);
-- ========================================
-- FUND CONFIGURATIONS TABLE POLICIES
-- ========================================
-- Everyone can view active fund configurations (read-only data for UI)
CREATE POLICY "fund_configurations_select_policy" ON public.fund_configurations
    FOR SELECT
    USING (status = 'active' OR public.is_admin());
-- Only admins can create fund configurations
CREATE POLICY "fund_configurations_insert_policy" ON public.fund_configurations
    FOR INSERT
    WITH CHECK (public.is_admin());
-- Only admins can update fund configurations
CREATE POLICY "fund_configurations_update_policy" ON public.fund_configurations
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
-- Only admins can delete fund configurations
CREATE POLICY "fund_configurations_delete_policy" ON public.fund_configurations
    FOR DELETE
    USING (public.is_admin());
-- ========================================
-- ACCESS LOGS TABLE POLICIES
-- ========================================
-- LPs can view their own access logs, admins can view all
CREATE POLICY "access_logs_select_policy" ON public.access_logs
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
-- Access logs are created via Edge Functions only
CREATE POLICY "access_logs_insert_policy" ON public.access_logs
    FOR INSERT
    WITH CHECK (TRUE);
-- Allow Edge Functions to insert

-- No updates to access logs
CREATE POLICY "access_logs_update_policy" ON public.access_logs
    FOR UPDATE
    USING (FALSE);
-- No deletion of access logs
CREATE POLICY "access_logs_delete_policy" ON public.access_logs
    FOR DELETE
    USING (FALSE);
-- ========================================
-- SECURE SHARES TABLE POLICIES
-- ========================================
-- Owners can view their own shares, admins can view all
CREATE POLICY "secure_shares_select_policy" ON public.secure_shares
    FOR SELECT
    USING (auth.uid() = owner_user_id OR public.is_admin());
-- LPs can create their own share tokens
CREATE POLICY "secure_shares_insert_policy" ON public.secure_shares
    FOR INSERT
    WITH CHECK (auth.uid() = owner_user_id);
-- Owners can revoke their own shares, admins can revoke any
CREATE POLICY "secure_shares_update_policy" ON public.secure_shares
    FOR UPDATE
    USING (auth.uid() = owner_user_id OR public.is_admin())
    WITH CHECK (auth.uid() = owner_user_id OR public.is_admin());
-- Owners can delete their own shares, admins can delete any
CREATE POLICY "secure_shares_delete_policy" ON public.secure_shares
    FOR DELETE
    USING (auth.uid() = owner_user_id OR public.is_admin());
-- ========================================
-- WEB PUSH SUBSCRIPTIONS TABLE POLICIES
-- ========================================
-- LPs can manage their own subscriptions, admins can view all
CREATE POLICY "web_push_subscriptions_select_policy" ON public.web_push_subscriptions
    FOR SELECT
    USING (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "web_push_subscriptions_insert_policy" ON public.web_push_subscriptions
    FOR INSERT
    WITH CHECK (auth.uid() = user_id);
CREATE POLICY "web_push_subscriptions_update_policy" ON public.web_push_subscriptions
    FOR UPDATE
    USING (auth.uid() = user_id OR public.is_admin())
    WITH CHECK (auth.uid() = user_id OR public.is_admin());
CREATE POLICY "web_push_subscriptions_delete_policy" ON public.web_push_subscriptions
    FOR DELETE
    USING (auth.uid() = user_id OR public.is_admin());
-- ========================================
-- BENCHMARKS TABLE POLICIES
-- ========================================
-- Everyone can view benchmarks (public market data)
CREATE POLICY "benchmarks_select_policy" ON public.benchmarks
    FOR SELECT
    USING (TRUE);
-- Only admins can manage benchmarks
CREATE POLICY "benchmarks_insert_policy" ON public.benchmarks
    FOR INSERT
    WITH CHECK (public.is_admin());
CREATE POLICY "benchmarks_update_policy" ON public.benchmarks
    FOR UPDATE
    USING (public.is_admin())
    WITH CHECK (public.is_admin());
CREATE POLICY "benchmarks_delete_policy" ON public.benchmarks
    FOR DELETE
    USING (public.is_admin());
-- ========================================
-- BALANCE ADJUSTMENTS TABLE POLICIES
-- ========================================
-- Only admins can manage balance adjustments
CREATE POLICY "balance_adjustments_select_policy" ON public.balance_adjustments
    FOR SELECT
    USING (public.is_admin());
CREATE POLICY "balance_adjustments_insert_policy" ON public.balance_adjustments
    FOR INSERT
    WITH CHECK (public.is_admin());
-- No updates to balance adjustments (audit trail)
CREATE POLICY "balance_adjustments_update_policy" ON public.balance_adjustments
    FOR UPDATE
    USING (FALSE);
-- No deletion of balance adjustments (audit trail)
CREATE POLICY "balance_adjustments_delete_policy" ON public.balance_adjustments
    FOR DELETE
    USING (FALSE);
-- ========================================
-- FUND FEE HISTORY TABLE POLICIES
-- ========================================
-- Only admins can view fee history
CREATE POLICY "fund_fee_history_select_policy" ON public.fund_fee_history
    FOR SELECT
    USING (public.is_admin());
-- Only admins can create fee history records
CREATE POLICY "fund_fee_history_insert_policy" ON public.fund_fee_history
    FOR INSERT
    WITH CHECK (public.is_admin());
-- No updates to fee history (audit trail)
CREATE POLICY "fund_fee_history_update_policy" ON public.fund_fee_history
    FOR UPDATE
    USING (FALSE);
-- No deletion of fee history (audit trail)
CREATE POLICY "fund_fee_history_delete_policy" ON public.fund_fee_history
    FOR DELETE
    USING (FALSE);
-- ========================================
-- Additional helper functions
-- ========================================

-- Function to check if a secure share token is valid and not expired/revoked
CREATE OR REPLACE FUNCTION public.is_valid_share_token(token_value TEXT)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.secure_shares 
        WHERE token = token_value
        AND expires_at > NOW()
        AND revoked_at IS NULL
        AND (max_views IS NULL OR views_count < max_views)
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Function to validate notification access
CREATE OR REPLACE FUNCTION public.can_access_notification(notification_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.notifications
        WHERE id = notification_id
        AND (user_id = auth.uid() OR public.is_admin())
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- Grant execute on helper functions
GRANT EXECUTE ON FUNCTION public.is_valid_share_token(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.can_access_notification(UUID) TO authenticated;
