CREATE OR REPLACE FUNCTION public.get_funds_aum_snapshot(p_as_of_date date, p_purpose aum_purpose DEFAULT 'reporting'::aum_purpose)
 RETURNS TABLE(fund_id uuid, fund_code text, fund_name text, asset text, as_of_date date, purpose text, aum_value numeric, aum_source text, investor_count bigint)
 LANGUAGE plpgsql
 STABLE SECURITY DEFINER
AS $function$
DECLARE
    v_is_today boolean;
BEGIN
    v_is_today := (p_as_of_date >= CURRENT_DATE);

    RETURN QUERY
    WITH fund_list AS (
        SELECT f.id, f.code, f.name, f.asset
        FROM public.funds f
        WHERE f.status = 'active'
    ),
    live_positions AS (
        SELECT 
            ip.fund_id,
            SUM(ip.current_value) as pos_sum,
            COUNT(DISTINCT ip.investor_id) as inv_count
        FROM public.investor_positions ip
        WHERE ip.is_active = true
        GROUP BY ip.fund_id
    ),
    historical_adjustments AS (
        -- If we are querying a past date, we need to unwind transactions that happened AFTER p_as_of_date
        -- Deposits AFTER the date -> subtract from live AUM
        -- Withdrawals AFTER the date -> add back to live AUM
        -- Yield/Fees AFTER the date (if any) -> subtract from live AUM
        SELECT 
            t.fund_id,
            SUM(
                CASE 
                    WHEN t.type IN ('DEPOSIT', 'ADMIN_ADJUSTMENT_ADD') THEN -t.amount
                    WHEN t.type IN ('WITHDRAWAL', 'ADMIN_ADJUSTMENT_SUB') THEN t.amount
                    WHEN t.type IN ('YIELD_CRYSTALLIZATION', 'FEE_DEDUCTION', 'IB_COMMISSION') THEN -t.amount
                    ELSE 0 
                END
            ) as adjustment_amount
        FROM public.transactions_v2 t
        WHERE t.tx_date > p_as_of_date 
          AND t.is_voided = false
        GROUP BY t.fund_id
    )
    SELECT
        fl.id,
        fl.code,
        fl.name,
        fl.asset,
        p_as_of_date as as_of_date,
        p_purpose::text as purpose,
        -- Calculate the exact AUM as of the date using first principles (Live - Future Adjusted)
        CASE 
            WHEN v_is_today THEN COALESCE(lp.pos_sum, 0)
            ELSE COALESCE(lp.pos_sum, 0) + COALESCE(ha.adjustment_amount, 0)
        END as aum_value,
        'live_ledger'::text as aum_source,
        COALESCE(lp.inv_count, 0) as investor_count
    FROM fund_list fl
    LEFT JOIN live_positions lp ON lp.fund_id = fl.id
    LEFT JOIN historical_adjustments ha ON ha.fund_id = fl.id
    ORDER BY fl.name;
END;
$function$;

DROP TABLE IF EXISTS public.fund_daily_aum CASCADE;
