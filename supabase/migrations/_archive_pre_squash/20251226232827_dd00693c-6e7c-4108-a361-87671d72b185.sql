-- =============================================================
-- SECURITY FIX PART 3: Fix remaining views with SECURITY INVOKER
-- =============================================================

-- Fix audit_events_v - admin only view
DROP VIEW IF EXISTS public.audit_events_v CASCADE;
CREATE VIEW public.audit_events_v 
WITH (security_invoker = true)
AS
SELECT id AS event_id,
    table_name AS source_table,
    action AS operation,
    table_name AS entity,
    record_id::text AS entity_id,
    user_id,
    changes AS old_values,
    changes AS new_values,
    '{}'::jsonb AS meta,
    created_at,
    user_id AS actor_user
FROM audit_logs al
WHERE is_admin();

-- Fix import_status - admin only view
DROP VIEW IF EXISTS public.import_status CASCADE;
CREATE VIEW public.import_status 
WITH (security_invoker = true)
AS
SELECT id,
    filename,
    import_type,
    status,
    rows_processed,
    rows_succeeded,
    rows_failed,
    errors,
    started_at,
    completed_at,
    created_at,
    imported_by
FROM excel_import_log e
WHERE is_admin();

-- Fix monthly_fee_summary - admin only view
DROP VIEW IF EXISTS public.monthly_fee_summary CASCADE;
CREATE VIEW public.monthly_fee_summary 
WITH (security_invoker = true)
AS
SELECT to_char(period_start::timestamp with time zone, 'YYYY-MM'::text) AS summary_month,
    'USDT'::text AS asset_code,
    sum(fee_amount) AS total_fees_collected,
    sum(base_net_income + fee_amount) AS total_gross_yield,
    sum(base_net_income) AS total_net_yield,
    count(DISTINCT investor_id) AS investor_count
FROM fee_allocations fa
WHERE is_admin() AND is_voided = false
GROUP BY to_char(period_start::timestamp with time zone, 'YYYY-MM'::text);

-- Fix v_ib_allocation_orphans - admin only view
DROP VIEW IF EXISTS public.v_ib_allocation_orphans CASCADE;
CREATE VIEW public.v_ib_allocation_orphans 
WITH (security_invoker = true)
AS
SELECT ia.id AS allocation_id,
    ia.source_investor_id,
    ia.ib_investor_id,
    ia.distribution_id,
    ia.ib_fee_amount,
    ia.effective_date,
    ia.payout_status,
    CASE
        WHEN sp.id IS NULL THEN 'MISSING_SOURCE_PROFILE'::text
        WHEN ip.id IS NULL THEN 'MISSING_IB_PROFILE'::text
        WHEN ia.distribution_id IS NOT NULL AND yd.id IS NULL THEN 'MISSING_DISTRIBUTION'::text
        ELSE 'OK'::text
    END AS issue_type
FROM ib_allocations ia
LEFT JOIN profiles sp ON sp.id = ia.source_investor_id
LEFT JOIN profiles ip ON ip.id = ia.ib_investor_id
LEFT JOIN yield_distributions yd ON yd.id = ia.distribution_id
WHERE is_admin() 
AND ia.is_voided = false 
AND (sp.id IS NULL OR ip.id IS NULL OR (ia.distribution_id IS NOT NULL AND yd.id IS NULL));

-- Fix v_itd_returns - user + admin view
DROP VIEW IF EXISTS public.v_itd_returns CASCADE;
CREATE VIEW public.v_itd_returns 
WITH (security_invoker = true)
AS
SELECT ip.investor_id,
    ip.fund_id,
    f.name AS fund_name,
    ip.cost_basis,
    ip.current_value,
    ip.unrealized_pnl,
    ip.realized_pnl,
    CASE
        WHEN ip.cost_basis > 0::numeric THEN ((ip.current_value - ip.cost_basis) / ip.cost_basis) * 100::numeric
        ELSE 0::numeric
    END AS itd_return_pct
FROM investor_positions ip
JOIN funds f ON f.id = ip.fund_id
WHERE is_admin() OR ip.investor_id = auth.uid();

-- Fix v_live_investor_balances - user + admin view
DROP VIEW IF EXISTS public.v_live_investor_balances CASCADE;
CREATE VIEW public.v_live_investor_balances 
WITH (security_invoker = true)
AS
SELECT ip.investor_id,
    f.name AS fund_name,
    ip.current_value AS last_reported_balance,
    0::numeric AS recent_deposits,
    0::numeric AS recent_withdrawals,
    ip.current_value AS live_balance
FROM investor_positions ip
JOIN funds f ON ip.fund_id = f.id
WHERE is_admin() OR ip.investor_id = auth.uid();

-- Fix v_transaction_distribution_orphans - admin only view
DROP VIEW IF EXISTS public.v_transaction_distribution_orphans CASCADE;
CREATE VIEW public.v_transaction_distribution_orphans 
WITH (security_invoker = true)
AS
SELECT t.id AS transaction_id,
    t.investor_id,
    t.fund_id,
    t.type AS transaction_type,
    t.amount,
    t.tx_date,
    t.distribution_id,
    t.purpose,
    CASE
        WHEN yd.id IS NULL THEN 'MISSING_DISTRIBUTION'::text
        WHEN yd.status = 'voided'::text THEN 'VOIDED_DISTRIBUTION'::text
        ELSE 'OK'::text
    END AS issue_type
FROM transactions_v2 t
LEFT JOIN yield_distributions yd ON yd.id = t.distribution_id
WHERE is_admin() 
AND t.distribution_id IS NOT NULL 
AND t.is_voided = false 
AND (yd.id IS NULL OR yd.status = 'voided'::text);

-- Fix withdrawal_audit_log - admin only view
DROP VIEW IF EXISTS public.withdrawal_audit_log CASCADE;
CREATE VIEW public.withdrawal_audit_log 
WITH (security_invoker = true)
AS
SELECT id,
    request_id,
    action,
    actor_id,
    details,
    created_at
FROM withdrawal_audit_logs
WHERE is_admin();

-- Fix withdrawal_queue - user + admin view
DROP VIEW IF EXISTS public.withdrawal_queue CASCADE;
CREATE VIEW public.withdrawal_queue 
WITH (security_invoker = true)
AS
SELECT wr.id,
    wr.investor_id,
    wr.fund_id,
    f.name AS fund_name,
    wr.requested_amount AS amount,
    wr.status,
    wr.request_date AS requested_at,
    wr.processed_at,
    wr.notes
FROM withdrawal_requests wr
JOIN funds f ON f.id = wr.fund_id
WHERE is_admin() OR wr.investor_id = auth.uid();

-- Fix v_investor_kpis to use SECURITY INVOKER
DROP VIEW IF EXISTS public.v_investor_kpis CASCADE;
CREATE VIEW public.v_investor_kpis 
WITH (security_invoker = true)
AS
SELECT 
    p.id AS investor_id,
    CONCAT(p.first_name, ' ', p.last_name) AS name,
    p.email,
    p.status,
    p.kyc_status,
    COUNT(DISTINCT ip.fund_id) AS funds_invested,
    COALESCE(SUM(ip.current_value), 0) AS total_value,
    COALESCE(SUM(ip.cost_basis), 0) AS total_invested,
    COALESCE(SUM(ip.unrealized_pnl), 0) AS total_unrealized_pnl,
    COALESCE(SUM(ip.realized_pnl), 0) AS total_realized_pnl,
    COALESCE(SUM(ip.mgmt_fees_paid), 0) AS total_mgmt_fees,
    COALESCE(SUM(ip.perf_fees_paid), 0) AS total_perf_fees,
    MIN(ip.last_transaction_date) AS first_investment_date,
    MAX(ip.last_transaction_date) AS last_activity_date
FROM public.profiles p
LEFT JOIN public.investor_positions ip ON p.id = ip.investor_id
WHERE p.id = auth.uid() OR is_admin()
GROUP BY p.id, p.first_name, p.last_name, p.email, p.status, p.kyc_status;

-- Grant SELECT on all views
GRANT SELECT ON public.audit_events_v TO authenticated;
GRANT SELECT ON public.import_status TO authenticated;
GRANT SELECT ON public.monthly_fee_summary TO authenticated;
GRANT SELECT ON public.v_ib_allocation_orphans TO authenticated;
GRANT SELECT ON public.v_itd_returns TO authenticated;
GRANT SELECT ON public.v_live_investor_balances TO authenticated;
GRANT SELECT ON public.v_transaction_distribution_orphans TO authenticated;
GRANT SELECT ON public.withdrawal_audit_log TO authenticated;
GRANT SELECT ON public.withdrawal_queue TO authenticated;
GRANT SELECT ON public.v_investor_kpis TO authenticated;