
-- Populate Investor Positions Migration
-- Synchronizes the 'investor_positions' summary table from the source-of-truth 'investor_monthly_reports'
-- This ensures the Admin Investor List shows correct current balances

DO $$
BEGIN
    RAISE NOTICE 'Populating investor_positions from latest monthly reports...';

    -- Clear existing positions to ensure clean slate (optional, but safe here)
    DELETE FROM public.investor_positions;

    -- Insert latest position for each investor/asset
    INSERT INTO public.investor_positions (
        investor_id,
        fund_id,
        shares, -- Using closing balance as shares/units for simplicity in this model
        current_value,
        cost_basis,
        unrealized_pnl,
        realized_pnl,
        updated_at,
        last_transaction_date
    )
    SELECT 
        imr.investor_id,
        f.id as fund_id,
        imr.closing_balance as shares,
        imr.closing_balance as current_value,
        -- Cost basis approx: Closing Balance - Yield Earned (Cumulative logic would be better but this is a good snapshot)
        -- Actually, aggregating 'additions' from reports or transactions is better for cost basis.
        -- For now, we use Closing Balance as Value.
        (imr.closing_balance - COALESCE(imr.yield_earned, 0)) as cost_basis,
        COALESCE(imr.yield_earned, 0) as unrealized_pnl,
        0 as realized_pnl,
        NOW() as updated_at,
        imr.report_month as last_transaction_date
    FROM public.investor_monthly_reports imr
    JOIN public.funds f ON f.asset = imr.asset_code
    -- Filter for the LATEST report for each investor+asset
    INNER JOIN (
        SELECT investor_id, asset_code, MAX(report_month) as max_month
        FROM public.investor_monthly_reports
        GROUP BY investor_id, asset_code
    ) latest ON imr.investor_id = latest.investor_id 
            AND imr.asset_code = latest.asset_code 
            AND imr.report_month = latest.max_month
    WHERE imr.closing_balance > 0;

    RAISE NOTICE 'Investor positions populated successfully.';
END $$;
