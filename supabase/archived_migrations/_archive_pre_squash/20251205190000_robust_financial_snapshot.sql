
-- Robust Financial Snapshot Function
-- Falls back to Monthly Reports sum if Daily NAV is missing
-- Ensures "Fund Financials" always show data if *any* data exists

CREATE OR REPLACE FUNCTION public.get_historical_nav(target_date DATE DEFAULT CURRENT_DATE)
RETURNS TABLE (
    fund_id UUID,
    fund_name TEXT,
    asset_code TEXT,
    aum NUMERIC,
    daily_inflows NUMERIC,
    daily_outflows NUMERIC,
    net_flow_24h NUMERIC
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_month_start DATE;
BEGIN
    v_month_start := DATE_TRUNC('month', target_date)::DATE;

    RETURN QUERY
    WITH daily_data AS (
        -- 1. Try to get exact Daily NAV
        SELECT 
            dn.fund_id,
            dn.aum,
            dn.total_inflows,
            dn.total_outflows
        FROM public.daily_nav dn
        WHERE dn.nav_date = target_date
    ),
    monthly_fallback AS (
        -- 2. Fallback: Sum latest monthly reports for this month
        SELECT 
            f.id as fund_id,
            SUM(imr.closing_balance) as estimated_aum
        FROM public.funds f
        JOIN public.investor_monthly_reports imr ON imr.asset_code = f.asset
        WHERE imr.report_month = v_month_start
        GROUP BY f.id
    )
    SELECT 
        f.id,
        f.name,
        f.asset,
        -- Logic: Use Daily AUM -> Fallback to Monthly Sum -> 0
        COALESCE(dd.aum, mf.estimated_aum, 0) as aum,
        COALESCE(dd.total_inflows, 0) as daily_inflows,
        COALESCE(dd.total_outflows, 0) as daily_outflows,
        (COALESCE(dd.total_inflows, 0) - COALESCE(dd.total_outflows, 0)) as net_flow_24h
    FROM public.funds f
    LEFT JOIN daily_data dd ON f.id = dd.fund_id
    LEFT JOIN monthly_fallback mf ON f.id = mf.fund_id
    WHERE f.status = 'active';
END;
$$;
