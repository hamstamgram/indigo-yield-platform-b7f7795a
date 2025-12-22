-- Fix get_historical_nav to calculate flows from transactions_v2 when daily_nav is empty
DROP FUNCTION IF EXISTS get_historical_nav(DATE);

CREATE OR REPLACE FUNCTION get_historical_nav(target_date DATE)
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
BEGIN
    RETURN QUERY
    WITH transaction_flows AS (
        -- Calculate daily flows from transactions_v2
        SELECT
            t.fund_id as tf_fund_id,
            COALESCE(SUM(CASE 
                WHEN t.type = 'DEPOSIT' THEN t.amount 
                ELSE 0 
            END), 0) as tx_inflows,
            COALESCE(SUM(CASE 
                WHEN t.type = 'WITHDRAWAL' THEN ABS(t.amount)
                ELSE 0 
            END), 0) as tx_outflows
        FROM public.transactions_v2 t
        WHERE t.tx_date = target_date
          AND t.type IN ('DEPOSIT', 'WITHDRAWAL')
          AND (t.is_voided IS NULL OR t.is_voided = false)
        GROUP BY t.fund_id
    ),
    position_aum AS (
        -- Calculate AUM from investor_positions as fallback
        SELECT
            ip.fund_id as pos_fund_id,
            COALESCE(SUM(ip.balance), 0) as total_balance
        FROM public.investor_positions ip
        GROUP BY ip.fund_id
    )
    SELECT 
        f.id as fund_id,
        f.name as fund_name,
        f.asset as asset_code,
        COALESCE(dn.aum, pa.total_balance, 0) as aum,
        COALESCE(dn.total_inflows, tf.tx_inflows, 0) as daily_inflows,
        COALESCE(dn.total_outflows, tf.tx_outflows, 0) as daily_outflows,
        (COALESCE(dn.total_inflows, tf.tx_inflows, 0) - COALESCE(dn.total_outflows, tf.tx_outflows, 0)) as net_flow_24h
    FROM 
        public.funds f
    LEFT JOIN 
        public.daily_nav dn ON f.id = dn.fund_id AND dn.nav_date = target_date
    LEFT JOIN 
        transaction_flows tf ON f.id = tf.tf_fund_id
    LEFT JOIN
        position_aum pa ON f.id = pa.pos_fund_id;
END;
$$;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_historical_nav(DATE) TO authenticated;