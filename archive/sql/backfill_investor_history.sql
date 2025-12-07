-- Backfill Investor Daily History
-- Calculates Balance and Ownership % for every investor, every day.

DO $$
DECLARE
    curr_date DATE;
    end_date DATE := CURRENT_DATE;
    start_date DATE;
BEGIN
    -- Get start date from transactions
    SELECT MIN(created_at)::DATE INTO start_date FROM public.transactions;
    IF start_date IS NULL THEN start_date := '2024-01-01'; END IF;
    
    curr_date := start_date;

    RAISE NOTICE 'Starting Investor Backfill from % to %', start_date, end_date;

    WHILE curr_date <= end_date LOOP
        
        -- Insert snapshot for this day
        INSERT INTO public.investor_daily_balances (investor_id, fund_id, nav_date, balance, fund_aum_at_date, ownership_percentage)
        SELECT 
            t.investor_id,
            f.id as fund_id,
            curr_date as nav_date,
            -- Investor Balance: Sum of txs up to end of curr_date
            SUM(t.amount) as balance,
            -- Fund AUM: Get from daily_nav (or recalc if missing, but we assume daily_nav is populated)
            COALESCE(dn.aum, 0) as fund_aum,
            -- Percentage: Balance / Fund AUM
            CASE WHEN COALESCE(dn.aum, 0) = 0 THEN 0 
                 ELSE (SUM(t.amount) / dn.aum) 
            END as ownership_pct
        FROM 
            public.transactions t
        JOIN 
            public.funds f ON (
                (f.code = 'IND-USDT' AND t.asset_code IN ('USDT', 'USDC')) OR
                (f.code != 'IND-USDT' AND t.asset_code::text = f.asset)
            )
        LEFT JOIN
            public.daily_nav dn ON dn.fund_id = f.id AND dn.nav_date = curr_date
        WHERE 
            t.created_at::DATE <= curr_date
        GROUP BY 
            t.investor_id, f.id, dn.aum
        HAVING 
            SUM(t.amount) > 0; -- Only active investors

        curr_date := curr_date + 1;
        
        -- Progress Log every 30 days
        IF EXTRACT(DAY FROM curr_date) = 1 THEN
            RAISE NOTICE 'Processed up to %', curr_date;
        END IF;
        
    END LOOP;
END $$;
