-- Smart Master Data Import
-- Uses Email lookups to link transactions/statements to investors
-- Requires 'seed-master-users' Edge Function to be run first!

DO $$
DECLARE
    v_investor_id UUID;
BEGIN

    RAISE NOTICE 'Smart Import Complete.';
END $$;

DO $$
DECLARE
    curr_date DATE;
    end_date DATE := CURRENT_DATE;
    start_date DATE;
    month_start DATE;
    month_end DATE;
BEGIN
    SELECT MIN(created_at)::DATE INTO start_date FROM public.transactions;
    IF start_date IS NULL THEN start_date := '2024-01-01'; END IF;
    curr_date := start_date;
    RAISE NOTICE 'Re-Running Backfill...';
    WHILE curr_date <= end_date LOOP
        INSERT INTO public.daily_nav (fund_id, nav_date, aum, total_inflows, total_outflows, created_at)
        SELECT f.id, curr_date, 
        COALESCE((SELECT SUM(amount) FROM public.transactions t_all WHERE ((f.code = 'IND-USDT' AND t_all.asset_code IN ('USDT', 'USDC')) OR (f.code != 'IND-USDT' AND t_all.asset_code::text = f.asset)) AND t_all.created_at::DATE <= curr_date), 0),
        COALESCE((SELECT SUM(amount) FROM public.transactions t_in WHERE ((f.code = 'IND-USDT' AND t_in.asset_code IN ('USDT', 'USDC')) OR (f.code != 'IND-USDT' AND t_in.asset_code::text = f.asset)) AND t_in.created_at::DATE = curr_date AND t_in.type = 'DEPOSIT'), 0),
        ABS(COALESCE((SELECT SUM(amount) FROM public.transactions t_out WHERE ((f.code = 'IND-USDT' AND t_out.asset_code IN ('USDT', 'USDC')) OR (f.code != 'IND-USDT' AND t_out.asset_code::text = f.asset)) AND t_out.created_at::DATE = curr_date AND t_out.type = 'WITHDRAWAL'), 0)),
        NOW()
        FROM public.funds f GROUP BY f.id
        ON CONFLICT (fund_id, nav_date) DO UPDATE SET aum = EXCLUDED.aum, total_inflows = EXCLUDED.total_inflows, total_outflows = EXCLUDED.total_outflows;
        curr_date := curr_date + 1;
    END LOOP;
    
    curr_date := start_date;
    WHILE curr_date <= end_date LOOP
        month_start := DATE_TRUNC('month', curr_date);
        month_end := (DATE_TRUNC('month', curr_date) + INTERVAL '1 month' - INTERVAL '1 day')::DATE;
        INSERT INTO public.investor_monthly_reports (investor_id, report_month, asset_code, opening_balance, additions, withdrawals, closing_balance, yield_earned, created_at, updated_at)
        SELECT i.id, month_start, t.asset_code,
        COALESCE((SELECT SUM(amount) FROM public.transactions t2 WHERE t2.investor_id = t.investor_id AND t2.asset_code = t.asset_code AND t2.created_at < month_start), 0),
        COALESCE((SELECT SUM(amount) FROM public.transactions t3 WHERE t3.investor_id = t.investor_id AND t3.asset_code = t.asset_code AND t3.created_at >= month_start AND t3.created_at <= month_end + INTERVAL '1 day' AND t3.type = 'DEPOSIT'), 0),
        ABS(COALESCE((SELECT SUM(amount) FROM public.transactions t4 WHERE t4.investor_id = t.investor_id AND t4.asset_code = t.asset_code AND t4.created_at >= month_start AND t4.created_at <= month_end + INTERVAL '1 day' AND t4.type = 'WITHDRAWAL'), 0)),
        0, 0, NOW(), NOW()
        FROM public.transactions t JOIN public.investors i ON i.id = t.investor_id
        WHERE t.created_at <= month_end + INTERVAL '1 day'
        GROUP BY t.investor_id, t.asset_code, i.id
        ON CONFLICT (investor_id, report_month, asset_code) DO UPDATE SET opening_balance = EXCLUDED.opening_balance, additions = EXCLUDED.additions, withdrawals = EXCLUDED.withdrawals, closing_balance = EXCLUDED.opening_balance + EXCLUDED.additions - EXCLUDED.withdrawals + investor_monthly_reports.yield_earned, updated_at = NOW();
        curr_date := curr_date + INTERVAL '1 month';
    END LOOP;
    
    DELETE FROM public.investor_positions;
    INSERT INTO public.investor_positions (investor_id, fund_id, shares, current_value, cost_basis, unrealized_pnl, realized_pnl, updated_at, last_transaction_date)
    SELECT imr.investor_id, f.id, imr.closing_balance, imr.closing_balance, (imr.closing_balance - COALESCE(imr.yield_earned, 0)), COALESCE(imr.yield_earned, 0), 0, NOW(), imr.report_month
    FROM public.investor_monthly_reports imr JOIN public.funds f ON f.asset = imr.asset_code
    INNER JOIN (SELECT investor_id, asset_code, MAX(report_month) as max_month FROM public.investor_monthly_reports GROUP BY investor_id, asset_code) latest ON imr.investor_id = latest.investor_id AND imr.asset_code = latest.asset_code AND imr.report_month = latest.max_month
    WHERE imr.closing_balance > 0;
END $$;
