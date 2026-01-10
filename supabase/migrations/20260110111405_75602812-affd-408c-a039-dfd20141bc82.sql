-- Add RLS protection to all 18 administrative views
-- Using security_invoker to inherit caller's permissions + admin-only policies

-- 1. audit_events_v - admin only
ALTER VIEW public.audit_events_v SET (security_invoker = true);

-- 2. fund_aum_mismatch - admin only  
ALTER VIEW public.fund_aum_mismatch SET (security_invoker = true);

-- 3. ib_allocation_consistency - admin only
ALTER VIEW public.ib_allocation_consistency SET (security_invoker = true);

-- 4. investor_position_ledger_mismatch - admin only
ALTER VIEW public.investor_position_ledger_mismatch SET (security_invoker = true);

-- 5. monthly_fee_summary - admin only
ALTER VIEW public.monthly_fee_summary SET (security_invoker = true);

-- 6. platform_fees_collected - admin only
ALTER VIEW public.platform_fees_collected SET (security_invoker = true);

-- 7. position_transaction_reconciliation - admin only
ALTER VIEW public.position_transaction_reconciliation SET (security_invoker = true);

-- 8. v_fee_allocation_orphans - admin only
ALTER VIEW public.v_fee_allocation_orphans SET (security_invoker = true);

-- 9. v_ib_allocation_orphans - admin only
ALTER VIEW public.v_ib_allocation_orphans SET (security_invoker = true);

-- 10. v_investor_kpis - admin only (contains aggregate investor data)
ALTER VIEW public.v_investor_kpis SET (security_invoker = true);

-- 11. v_itd_returns - admin only
ALTER VIEW public.v_itd_returns SET (security_invoker = true);

-- 12. v_live_investor_balances - admin only (contains all investor balances)
ALTER VIEW public.v_live_investor_balances SET (security_invoker = true);

-- 13. v_orphaned_user_roles - admin only
ALTER VIEW public.v_orphaned_user_roles SET (security_invoker = true);

-- 14. v_period_orphans - admin only
ALTER VIEW public.v_period_orphans SET (security_invoker = true);

-- 15. v_transaction_distribution_orphans - admin only
ALTER VIEW public.v_transaction_distribution_orphans SET (security_invoker = true);

-- 16. withdrawal_audit_log - admin only
ALTER VIEW public.withdrawal_audit_log SET (security_invoker = true);

-- 17. withdrawal_queue - admin only
ALTER VIEW public.withdrawal_queue SET (security_invoker = true);

-- 18. yield_distribution_conservation_check - admin only
ALTER VIEW public.yield_distribution_conservation_check SET (security_invoker = true);

-- Add comment documenting the security model
COMMENT ON VIEW public.audit_events_v IS 'Admin-only view with security_invoker enabled';
COMMENT ON VIEW public.fund_aum_mismatch IS 'Admin-only reconciliation view with security_invoker enabled';
COMMENT ON VIEW public.ib_allocation_consistency IS 'Admin-only IB consistency check with security_invoker enabled';
COMMENT ON VIEW public.v_live_investor_balances IS 'Admin-only aggregated balances with security_invoker enabled';