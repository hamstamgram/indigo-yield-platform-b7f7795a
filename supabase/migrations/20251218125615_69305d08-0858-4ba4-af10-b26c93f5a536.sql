
-- =====================================================
-- PHASE 1: DATABASE SECURITY FIXES
-- =====================================================

-- Part 1: Add search_path to all functions that don't have it
-- This prevents SQL injection via search_path manipulation

ALTER FUNCTION public._resolve_investor_fee_pct SET search_path = public;
ALTER FUNCTION public.add_fund_to_investor SET search_path = public;
ALTER FUNCTION public.adjust_investor_position SET search_path = public;
ALTER FUNCTION public.admin_create_transaction SET search_path = public;
ALTER FUNCTION public.apply_daily_yield_with_fees SET search_path = public;
ALTER FUNCTION public.approve_withdrawal SET search_path = public;
ALTER FUNCTION public.audit_transaction_changes SET search_path = public;
ALTER FUNCTION public.can_access_investor SET search_path = public;
ALTER FUNCTION public.can_access_notification SET search_path = public;
ALTER FUNCTION public.can_withdraw SET search_path = public;
ALTER FUNCTION public.cancel_withdrawal_by_admin SET search_path = public;
ALTER FUNCTION public.complete_withdrawal SET search_path = public;
ALTER FUNCTION public.create_withdrawal_request SET search_path = public;
ALTER FUNCTION public.decrypt_totp_secret SET search_path = public;
ALTER FUNCTION public.distribute_monthly_yield SET search_path = public;
ALTER FUNCTION public.distribute_yield_v2 SET search_path = public;
ALTER FUNCTION public.encrypt_totp_secret SET search_path = public;
ALTER FUNCTION public.ensure_admin SET search_path = public;
ALTER FUNCTION public.finalize_statement_period SET search_path = public;
ALTER FUNCTION public.fund_period_return SET search_path = public;
ALTER FUNCTION public.generate_document_path SET search_path = public;
ALTER FUNCTION public.generate_statement_path SET search_path = public;
ALTER FUNCTION public.get_admin_name SET search_path = public;
ALTER FUNCTION public.get_all_non_admin_profiles SET search_path = public;
ALTER FUNCTION public.get_fund_net_flows SET search_path = public;
ALTER FUNCTION public.get_investor_period_summary SET search_path = public;
ALTER FUNCTION public.get_investor_portfolio_summary SET search_path = public;
ALTER FUNCTION public.get_investor_positions_by_class SET search_path = public;
ALTER FUNCTION public.get_monthly_platform_aum SET search_path = public;
ALTER FUNCTION public.get_profile_by_id SET search_path = public;
ALTER FUNCTION public.get_report_statistics SET search_path = public;
ALTER FUNCTION public.get_statement_period_summary SET search_path = public;
ALTER FUNCTION public.get_user_reports SET search_path = public;
ALTER FUNCTION public.handle_ledger_transaction SET search_path = public;
ALTER FUNCTION public.is_2fa_required SET search_path = public;
ALTER FUNCTION public.is_admin SET search_path = public;
ALTER FUNCTION public.is_admin_safe SET search_path = public;
ALTER FUNCTION public.is_import_enabled SET search_path = public;
ALTER FUNCTION public.is_valid_share_token SET search_path = public;
ALTER FUNCTION public.is_within_edit_window SET search_path = public;
ALTER FUNCTION public.lock_imports SET search_path = public;
ALTER FUNCTION public.log_access_event SET search_path = public;
ALTER FUNCTION public.log_audit_event SET search_path = public;
ALTER FUNCTION public.log_cancel_on_status_change SET search_path = public;
ALTER FUNCTION public.log_data_edit SET search_path = public;
ALTER FUNCTION public.log_security_event SET search_path = public;
ALTER FUNCTION public.log_withdrawal_action SET search_path = public;
ALTER FUNCTION public.log_withdrawal_creation SET search_path = public;
ALTER FUNCTION public.process_excel_import_with_classes SET search_path = public;
ALTER FUNCTION public.process_yield_distribution SET search_path = public;
ALTER FUNCTION public.reject_withdrawal SET search_path = public;
ALTER FUNCTION public.send_daily_rate_notifications SET search_path = public;
ALTER FUNCTION public.set_fund_daily_aum SET search_path = public;
ALTER FUNCTION public.set_updated_at SET search_path = public;
ALTER FUNCTION public.start_processing_withdrawal SET search_path = public;
ALTER FUNCTION public.test_profiles_access SET search_path = public;
ALTER FUNCTION public.unlock_imports SET search_path = public;
ALTER FUNCTION public.update_fund_aum_baseline SET search_path = public;
ALTER FUNCTION public.update_investor_aum_percentages SET search_path = public;
ALTER FUNCTION public.update_updated_at SET search_path = public;

-- Part 2: Convert Security Definer Views to Security Invoker
-- This ensures RLS policies are applied based on the querying user, not the view creator

ALTER VIEW public.audit_events_v SET (security_invoker = on);
ALTER VIEW public.import_status SET (security_invoker = on);
ALTER VIEW public.monthly_fee_summary SET (security_invoker = on);
ALTER VIEW public.platform_fees_collected SET (security_invoker = on);
ALTER VIEW public.v_investor_kpis SET (security_invoker = on);
ALTER VIEW public.v_itd_returns SET (security_invoker = on);
ALTER VIEW public.v_live_investor_balances SET (security_invoker = on);
ALTER VIEW public.withdrawal_queue SET (security_invoker = on);

-- Part 3: Add RLS policies to reconciliation table (currently has RLS enabled but no policies)
-- Only admins should access reconciliation data

CREATE POLICY "Admins can view all reconciliation records"
ON public.reconciliation
FOR SELECT
USING (public.is_admin_safe());

CREATE POLICY "Admins can insert reconciliation records"
ON public.reconciliation
FOR INSERT
WITH CHECK (public.is_admin_safe());

CREATE POLICY "Admins can update reconciliation records"
ON public.reconciliation
FOR UPDATE
USING (public.is_admin_safe());

CREATE POLICY "Admins can delete reconciliation records"
ON public.reconciliation
FOR DELETE
USING (public.is_admin_safe());
