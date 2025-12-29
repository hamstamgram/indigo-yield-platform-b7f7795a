-- Enhanced get_historical_nav RPC with transaction fallback
-- When daily_nav is empty, calculate flows from transactions_v2

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
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as out_fund_id,
        f.name as out_fund_name,
        f.asset as out_asset_code,
        -- AUM: prefer daily_nav, fallback to investor_positions
        COALESCE(
            dn.aum,
            (SELECT COALESCE(SUM(ip.current_value), 0) FROM investor_positions ip WHERE ip.fund_id = f.id),
            0::numeric
        ) as out_aum,
        -- Inflows: prefer daily_nav, fallback to transactions
        COALESCE(
            dn.total_inflows,
            (SELECT COALESCE(SUM(t.amount), 0) 
             FROM transactions_v2 t 
             WHERE t.fund_id = f.id 
               AND t.tx_date = target_date 
               AND t.type = 'DEPOSIT'
               AND COALESCE(t.is_voided, false) = false)
        )::numeric as out_daily_inflows,
        -- Outflows: prefer daily_nav, fallback to transactions (use ABS for positive value)
        COALESCE(
            dn.total_outflows,
            (SELECT COALESCE(SUM(ABS(t.amount)), 0) 
             FROM transactions_v2 t 
             WHERE t.fund_id = f.id 
               AND t.tx_date = target_date 
               AND t.type = 'WITHDRAWAL'
               AND COALESCE(t.is_voided, false) = false)
        )::numeric as out_daily_outflows,
        -- Net flow: inflows minus outflows
        (
            COALESCE(
                dn.total_inflows,
                (SELECT COALESCE(SUM(t.amount), 0) 
                 FROM transactions_v2 t 
                 WHERE t.fund_id = f.id 
                   AND t.tx_date = target_date 
                   AND t.type = 'DEPOSIT'
                   AND COALESCE(t.is_voided, false) = false)
            )
            -
            COALESCE(
                dn.total_outflows,
                (SELECT COALESCE(SUM(ABS(t.amount)), 0) 
                 FROM transactions_v2 t 
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

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_historical_nav(DATE) TO authenticated;