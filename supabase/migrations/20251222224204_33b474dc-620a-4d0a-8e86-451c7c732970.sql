-- Fix get_historical_nav to properly return historical AUM from fund_daily_aum table
-- Currently it only uses live investor_positions which doesn't change with date

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
    historical_aum AS (
        -- Get historical AUM from fund_daily_aum table
        -- Uses the closest date <= target_date for each fund
        SELECT DISTINCT ON (fda.fund_id)
            fda.fund_id as ha_fund_id,
            fda.total_aum,
            fda.aum_date
        FROM public.fund_daily_aum fda
        WHERE fda.aum_date <= target_date
        ORDER BY fda.fund_id, fda.aum_date DESC
    ),
    live_aum AS (
        -- Calculate live AUM from investor_positions as fallback for today only
        SELECT
            ip.fund_id as pos_fund_id,
            COALESCE(SUM(ip.current_value), 0) as total_balance
        FROM public.investor_positions ip
        GROUP BY ip.fund_id
    )
    SELECT 
        f.id as fund_id,
        f.name as fund_name,
        f.asset as asset_code,
        -- Priority: 1) daily_nav exact match, 2) fund_daily_aum historical, 3) live positions (today only)
        COALESCE(
            dn.aum,
            ha.total_aum,
            CASE WHEN target_date = CURRENT_DATE THEN la.total_balance ELSE NULL END,
            0
        ) as aum,
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
        historical_aum ha ON f.id = ha.ha_fund_id
    LEFT JOIN
        live_aum la ON f.id = la.pos_fund_id;
END;
$$;

GRANT EXECUTE ON FUNCTION get_historical_nav(DATE) TO authenticated;