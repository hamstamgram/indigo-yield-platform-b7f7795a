
-- PHASE 2: Harden all SECURITY DEFINER functions with SET search_path
ALTER FUNCTION public.check_aum_reconciliation(uuid, numeric, date) SET search_path = 'public';
ALTER FUNCTION public.check_historical_lock(uuid, date, boolean, uuid) SET search_path = 'public';
ALTER FUNCTION public.finalize_month_yield(uuid, integer, integer, uuid) SET search_path = 'public';
ALTER FUNCTION public.fn_audit_profiles_changes() SET search_path = 'public';
ALTER FUNCTION public.fn_ledger_drives_position() SET search_path = 'public';
ALTER FUNCTION public.fn_trg_log_audit_event() SET search_path = 'public';
ALTER FUNCTION public.get_active_funds_summary() SET search_path = 'public';
ALTER FUNCTION public.get_fund_positions_sum(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_funds_aum_snapshot(date, aum_purpose) SET search_path = 'public';
ALTER FUNCTION public.get_funds_with_aum() SET search_path = 'public';
ALTER FUNCTION public.get_investor_reports_v2(uuid) SET search_path = 'public';
ALTER FUNCTION public.get_paged_audit_logs(integer, integer, text, text, uuid) SET search_path = 'public';
ALTER FUNCTION public.get_paged_investor_summaries(integer, integer, text) SET search_path = 'public';
ALTER FUNCTION public.get_paged_notifications(uuid, integer, integer) SET search_path = 'public';
ALTER FUNCTION public.guard_withdrawal_state_transitions() SET search_path = 'public';
ALTER FUNCTION public.log_audit_event(text, text, text, jsonb, jsonb, jsonb) SET search_path = 'public';
ALTER FUNCTION public.preview_segmented_yield_distribution_v5(uuid, date, numeric, aum_purpose, numeric) SET search_path = 'public';
ALTER FUNCTION public.recompute_investor_position(uuid, uuid) SET search_path = 'public';
ALTER FUNCTION public.require_super_admin() SET search_path = 'public';
ALTER FUNCTION public.restore_withdrawal(uuid, uuid, text) SET search_path = 'public';
ALTER FUNCTION public.void_and_reissue_transaction(uuid, numeric, date, text, uuid, text, text) SET search_path = 'public';
ALTER FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) SET search_path = 'public';
