DROP FUNCTION IF EXISTS get_historical_nav(DATE);

CREATE OR REPLACE FUNCTION get_historical_nav(target_date DATE)
RETURNS TABLE (
    fund_id UUID, -- Added fund_id
    fund_name TEXT,
    asset_code TEXT,
    aum NUMERIC,
    daily_inflows NUMERIC,
    daily_outflows NUMERIC,
    net_flow_24h NUMERIC
)
LANGUAGE plpgsql
AS $$
BEGIN
    RETURN QUERY
    SELECT 
        f.id as fund_id, -- Select ID
        f.name as fund_name,
        f.asset as asset_code,
        COALESCE(dn.aum, 0) as aum,
        COALESCE(dn.total_inflows, 0) as daily_inflows,
        COALESCE(dn.total_outflows, 0) as daily_outflows,
        (COALESCE(dn.total_inflows, 0) - COALESCE(dn.total_outflows, 0)) as net_flow_24h
    FROM 
        public.funds f
    LEFT JOIN 
        public.daily_nav dn ON f.id = dn.fund_id AND dn.nav_date = target_date;
END;
$$;
