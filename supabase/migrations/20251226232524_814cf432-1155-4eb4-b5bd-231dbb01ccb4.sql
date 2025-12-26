-- =============================================================
-- SECURITY FIX: Restrict public data exposure
-- Fixes P0 security issues identified in audit
-- =============================================================

-- 1. FIX V_INVESTOR_KPIS VIEW EXPOSURE
-- Problem: SECURITY DEFINER view was dropped but not recreated
-- Solution: Recreate as regular view with inline auth check

-- Recreate with proper security (regular view, inline RLS check)
CREATE OR REPLACE VIEW public.v_investor_kpis AS
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
WHERE 
    -- Security filter: user can only see their own data OR admin can see all
    p.id = auth.uid() 
    OR is_admin()
GROUP BY p.id, p.first_name, p.last_name, p.email, p.status, p.kyc_status;

-- Grant appropriate permissions
GRANT SELECT ON public.v_investor_kpis TO authenticated;

-- Add comment documenting the security fix
COMMENT ON VIEW public.v_investor_kpis IS 'Investor KPIs view with inline RLS - users see own data, admins see all. Fixed in security audit 2025-01-26.';