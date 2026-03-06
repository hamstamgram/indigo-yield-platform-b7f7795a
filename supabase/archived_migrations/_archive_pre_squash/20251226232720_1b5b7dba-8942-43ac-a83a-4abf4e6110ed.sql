-- =============================================================
-- SECURITY FIX PART 2: Add remaining admin-only views with SECURITY INVOKER
-- =============================================================

-- Fix platform_fees_collected - admin only view
DROP VIEW IF EXISTS public.platform_fees_collected CASCADE;
CREATE VIEW public.platform_fees_collected 
WITH (security_invoker = true)
AS
SELECT 
    to_char(period_start, 'YYYY-MM') AS period,
    fund_id,
    SUM(fee_amount) AS total_fees
FROM fee_allocations
WHERE is_admin() AND is_voided = false
GROUP BY to_char(period_start, 'YYYY-MM'), fund_id;

-- Fix position_transaction_reconciliation - admin only view
DROP VIEW IF EXISTS public.position_transaction_reconciliation CASCADE;
CREATE VIEW public.position_transaction_reconciliation 
WITH (security_invoker = true)
AS
SELECT 
    ip.investor_id,
    ip.fund_id,
    ip.current_value AS position_value,
    COALESCE(t.tx_sum, 0) AS transaction_sum,
    ip.current_value - COALESCE(t.tx_sum, 0) AS difference
FROM investor_positions ip
LEFT JOIN LATERAL (
    SELECT SUM(
        CASE 
            WHEN type IN ('DEPOSIT', 'YIELD', 'INTEREST', 'IB_CREDIT', 'INTERNAL_CREDIT', 'FEE_CREDIT', 'ADJUSTMENT') THEN amount
            WHEN type IN ('WITHDRAWAL', 'FEE', 'INTERNAL_WITHDRAWAL') THEN -abs(amount)
            ELSE 0
        END
    ) AS tx_sum
    FROM transactions_v2 
    WHERE investor_id = ip.investor_id 
    AND fund_id = ip.fund_id 
    AND is_voided = false
) t ON true
WHERE is_admin();

-- Fix v_period_orphans - admin only view (with correct schema)
DROP VIEW IF EXISTS public.v_period_orphans CASCADE;
CREATE VIEW public.v_period_orphans 
WITH (security_invoker = true)
AS
SELECT sp.id AS period_id,
    sp.year,
    sp.month,
    f.id AS fund_id,
    f.code AS fund_code,
    f.name AS fund_name,
    fps.id AS snapshot_id,
    fps.is_locked AS snapshot_locked,
    sp.status AS period_status,
    CASE
        WHEN fps.id IS NULL THEN 'MISSING_SNAPSHOT'::text
        WHEN fps.is_locked = false AND sp.status = 'finalized'::text THEN 'UNLOCKED_BUT_FINALIZED'::text
        WHEN fps.is_locked = true AND sp.status = 'draft'::text THEN 'LOCKED_BUT_DRAFT'::text
        ELSE 'OK'::text
    END AS issue_type,
    CASE
        WHEN fps.id IS NULL THEN 'Fund period snapshot missing for active fund'::text
        WHEN fps.is_locked = false AND sp.status = 'finalized'::text THEN 'Snapshot unlocked but period is finalized'::text
        WHEN fps.is_locked = true AND sp.status = 'draft'::text THEN 'Snapshot locked but period is still draft'::text
        ELSE 'No issue'::text
    END AS issue_description
FROM statement_periods sp
CROSS JOIN funds f
LEFT JOIN fund_period_snapshot fps ON fps.period_id = sp.id AND fps.fund_id = f.id
WHERE is_admin() 
AND f.status = 'active'::fund_status 
AND (fps.id IS NULL 
     OR (fps.is_locked = false AND sp.status = 'finalized'::text) 
     OR (fps.is_locked = true AND sp.status = 'draft'::text));

-- Fix yield_distribution_conservation_check - admin only view (with correct schema)
DROP VIEW IF EXISTS public.yield_distribution_conservation_check CASCADE;
CREATE VIEW public.yield_distribution_conservation_check 
WITH (security_invoker = true)
AS
SELECT yd.id AS distribution_id,
    yd.fund_id,
    f.code AS fund_code,
    yd.effective_date,
    yd.gross_yield,
    COALESCE(fee_sum.total_fees, 0::numeric) AS calculated_fees,
    COALESCE(ib_sum.total_ib, 0::numeric) AS calculated_ib,
    COALESCE((yd.summary_json ->> 'total_net_interest')::numeric, 0::numeric) AS net_to_investors,
    yd.gross_yield - COALESCE((yd.summary_json ->> 'total_net_interest')::numeric, 0::numeric) AS expected_deductions,
    COALESCE(fee_sum.total_fees, 0::numeric) + COALESCE(ib_sum.total_ib, 0::numeric) AS actual_deductions,
    abs((yd.gross_yield - COALESCE((yd.summary_json ->> 'total_net_interest')::numeric, 0::numeric)) - (COALESCE(fee_sum.total_fees, 0::numeric) + COALESCE(ib_sum.total_ib, 0::numeric))) AS conservation_error
FROM yield_distributions yd
LEFT JOIN funds f ON f.id = yd.fund_id
LEFT JOIN LATERAL (
    SELECT COALESCE(sum(fa.fee_amount), 0::numeric) AS total_fees
    FROM fee_allocations fa
    WHERE fa.distribution_id = yd.id AND fa.is_voided = false
) fee_sum ON true
LEFT JOIN LATERAL (
    SELECT COALESCE(sum(ia.ib_fee_amount), 0::numeric) AS total_ib
    FROM ib_allocations ia
    WHERE ia.distribution_id = yd.id AND ia.is_voided = false
) ib_sum ON true
WHERE is_admin() 
AND yd.voided_at IS NULL 
AND yd.status = 'applied'::text 
AND abs((yd.gross_yield - COALESCE((yd.summary_json ->> 'total_net_interest')::numeric, 0::numeric)) - (COALESCE(fee_sum.total_fees, 0::numeric) + COALESCE(ib_sum.total_ib, 0::numeric))) > 0.0001;

-- Grant SELECT on all admin views
GRANT SELECT ON public.platform_fees_collected TO authenticated;
GRANT SELECT ON public.position_transaction_reconciliation TO authenticated;
GRANT SELECT ON public.v_period_orphans TO authenticated;
GRANT SELECT ON public.yield_distribution_conservation_check TO authenticated;