
-- Expert Financial Snapshot Function
-- Logic: AUM = (Last Month's Closing Balance including Yield) + (This Month's Live Net Flows)
-- This ensures AUM reflects both historical growth AND real-time transaction activity.

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
    v_latest_report_date DATE;
BEGIN
    -- 1. Find the most recent report month that is <= target_date
    -- We look for the max report_month across all reports
    SELECT MAX(report_month) INTO v_latest_report_date 
    FROM public.investor_monthly_reports 
    WHERE report_month <= target_date;

    -- If no reports exist, default to a far past date to sum all transactions
    IF v_latest_report_date IS NULL THEN
        v_latest_report_date := '2000-01-01';
    END IF;

    RETURN QUERY
    WITH last_reports AS (
        -- Sum of closing balances from the last finalized reports
        SELECT 
            imr.asset_code,
            SUM(imr.closing_balance) as base_aum
        FROM public.investor_monthly_reports imr
        WHERE imr.report_month = v_latest_report_date
        GROUP BY imr.asset_code
    ),
    live_transactions AS (
        -- Sum of transactions AFTER the last report period up to target_date
        -- If last report was Nov 1 (covering Nov), we look for tx > Nov 30?
        -- Wait, report_month '2025-11-01' covers Nov. So we want txs > End of Nov.
        -- End of Month logic:
        SELECT 
            t.asset_code,
            -- Net Flow since report
            SUM(t.amount) as flow_since_report,
            -- Daily stats for target_date specifically
            SUM(CASE WHEN t.created_at::DATE = target_date AND t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) as daily_inflows,
            ABS(SUM(CASE WHEN t.created_at::DATE = target_date AND t.type = 'WITHDRAWAL' THEN t.amount ELSE 0 END)) as daily_outflows
        FROM public.transactions t
        WHERE 
            -- If report date is 2000-01-01, we take all.
            -- If report date is 2025-11-01, it ends 2025-11-30. We take txs > 2025-11-30.
            t.created_at > (v_latest_report_date + INTERVAL '1 month' - INTERVAL '1 day')
            AND t.created_at::DATE <= target_date
        GROUP BY t.asset_code
    )
    SELECT 
        f.id,
        f.name,
        f.asset,
        -- AUM = Base (History+Yield) + Flows (Principal Change)
        (COALESCE(lr.base_aum, 0) + COALESCE(lt.flow_since_report, 0)) as aum,
        COALESCE(lt.daily_inflows, 0) as daily_inflows,
        COALESCE(lt.daily_outflows, 0) as daily_outflows,
        (COALESCE(lt.daily_inflows, 0) - COALESCE(lt.daily_outflows, 0)) as net_flow_24h
    FROM public.funds f
    LEFT JOIN last_reports lr ON f.asset = lr.asset_code
    LEFT JOIN live_transactions lt ON f.asset = lt.asset_code
    WHERE f.status = 'active';
END;
$$;
