-- Fix search_path security warning for get_historical_nav
DROP FUNCTION IF EXISTS get_historical_nav(DATE);

CREATE OR REPLACE FUNCTION get_historical_nav(target_date DATE)
RETURNS TABLE (
    out_fund_id UUID,
    out_fund_name TEXT,
    out_asset_code TEXT,
    out_aum NUMERIC,
    out_daily_inflows NUMERIC,
    out_daily_outflows NUMERIC,
    out_net_flow_24h NUMERIC
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as out_fund_id,
        f.name as out_fund_name,
        f.asset as out_asset_code,
        COALESCE(
            dn.aum,
            (SELECT COALESCE(SUM(ip.current_value), 0) FROM public.investor_positions ip WHERE ip.fund_id = f.id),
            0::numeric
        ) as out_aum,
        COALESCE(
            dn.total_inflows,
            (SELECT COALESCE(SUM(t.amount), 0) 
             FROM public.transactions_v2 t 
             WHERE t.fund_id = f.id 
               AND t.tx_date = target_date 
               AND t.type = 'DEPOSIT'
               AND COALESCE(t.is_voided, false) = false)
        )::numeric as out_daily_inflows,
        COALESCE(
            dn.total_outflows,
            (SELECT COALESCE(SUM(ABS(t.amount)), 0) 
             FROM public.transactions_v2 t 
             WHERE t.fund_id = f.id 
               AND t.tx_date = target_date 
               AND t.type = 'WITHDRAWAL'
               AND COALESCE(t.is_voided, false) = false)
        )::numeric as out_daily_outflows,
        (
            COALESCE(
                dn.total_inflows,
                (SELECT COALESCE(SUM(t.amount), 0) 
                 FROM public.transactions_v2 t 
                 WHERE t.fund_id = f.id 
                   AND t.tx_date = target_date 
                   AND t.type = 'DEPOSIT'
                   AND COALESCE(t.is_voided, false) = false)
            )
            -
            COALESCE(
                dn.total_outflows,
                (SELECT COALESCE(SUM(ABS(t.amount)), 0) 
                 FROM public.transactions_v2 t 
                 WHERE t.fund_id = f.id 
                   AND t.tx_date = target_date 
                   AND t.type = 'WITHDRAWAL'
                   AND COALESCE(t.is_voided, false) = false)
            )
        )::numeric as out_net_flow_24h
    FROM 
        public.funds f
    LEFT JOIN 
        public.daily_nav dn ON f.id = dn.fund_id AND dn.nav_date = target_date
    WHERE
        f.status = 'active';
END;
$$;

GRANT EXECUTE ON FUNCTION get_historical_nav(DATE) TO authenticated;