-- =====================================================
-- MIGRATION: Complete Fund Alignment
-- Date: 2025-12-07
-- Purpose: Insert missing funds and ensure all 8 assets are properly configured
-- =====================================================

-- 1. Insert missing funds (SOL, USDC, EURC)
INSERT INTO public.funds (code, name, asset, strategy, fund_class, status, inception_date)
VALUES
  ('IND-SOL', 'Indigo Solana Yield Fund', 'SOL', 'Staking and DeFi', 'SOL', 'active', '2024-01-01'),
  ('IND-USDC', 'Indigo USDC Yield Fund', 'USDC', 'Stable Yield', 'USDC', 'active', '2024-01-01'),
  ('IND-EURC', 'Indigo Euro Yield Fund', 'EURC', 'Euro Stable Yield', 'EURC', 'active', '2024-01-01')
ON CONFLICT (code) DO UPDATE SET
  status = 'active',
  name = EXCLUDED.name,
  asset = EXCLUDED.asset,
  fund_class = EXCLUDED.fund_class;

-- 2. Ensure xAUT and XRP funds are active and properly named
UPDATE public.funds
SET
  status = 'active',
  name = CASE
    WHEN asset = 'xAUT' THEN 'Indigo Tether Gold Yield Fund'
    WHEN asset = 'XRP' THEN 'Indigo XRP Yield Fund'
    ELSE name
  END
WHERE asset IN ('xAUT', 'XRP');

-- 3. Insert assets table entries if missing
INSERT INTO public.assets (symbol, name, decimal_places, icon_url, is_active)
VALUES
    ('SOL', 'Solana', 9, '/assets/sol.svg', true),
    ('USDC', 'USD Coin', 6, '/assets/usdc.svg', true),
    ('EURC', 'Euro Coin', 6, '/assets/eurc.svg', true)
ON CONFLICT (symbol) DO UPDATE SET
    is_active = true;

-- 4. Update the get_historical_nav function to include ALL assets
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
    SELECT MAX(report_month) INTO v_latest_report_date
    FROM public.investor_monthly_reports
    WHERE report_month <= target_date;

    -- If no reports exist, try daily_nav as fallback
    IF v_latest_report_date IS NULL THEN
        -- Use daily_nav data if available
        RETURN QUERY
        SELECT
            f.id,
            f.name,
            f.asset,
            COALESCE(dn.aum, 0) as aum,
            COALESCE(dn.total_inflows, 0) as daily_inflows,
            COALESCE(dn.total_outflows, 0) as daily_outflows,
            (COALESCE(dn.total_inflows, 0) - COALESCE(dn.total_outflows, 0)) as net_flow_24h
        FROM public.funds f
        LEFT JOIN public.daily_nav dn ON f.id = dn.fund_id AND dn.nav_date = target_date
        WHERE f.status = 'active';
        RETURN;
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
        SELECT
            t.asset_code,
            SUM(t.amount) as flow_since_report,
            SUM(CASE WHEN t.created_at::DATE = target_date AND t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) as daily_inflows,
            ABS(SUM(CASE WHEN t.created_at::DATE = target_date AND t.type = 'WITHDRAWAL' THEN t.amount ELSE 0 END)) as daily_outflows
        FROM public.transactions t
        WHERE
            t.created_at > (v_latest_report_date + INTERVAL '1 month' - INTERVAL '1 day')
            AND t.created_at::DATE <= target_date
        GROUP BY t.asset_code
    ),
    daily_fallback AS (
        -- Fallback to daily_nav if no reports/transactions for an asset
        SELECT
            dn.fund_id,
            dn.aum,
            dn.total_inflows,
            dn.total_outflows
        FROM public.daily_nav dn
        WHERE dn.nav_date = target_date
    )
    SELECT
        f.id,
        f.name,
        f.asset,
        -- AUM = Base (History+Yield) + Flows (Principal Change), fallback to daily_nav
        COALESCE(
            lr.base_aum + COALESCE(lt.flow_since_report, 0),
            df.aum,
            0
        ) as aum,
        COALESCE(lt.daily_inflows, df.total_inflows, 0) as daily_inflows,
        COALESCE(lt.daily_outflows, df.total_outflows, 0) as daily_outflows,
        COALESCE(lt.daily_inflows, df.total_inflows, 0) - COALESCE(lt.daily_outflows, df.total_outflows, 0) as net_flow_24h
    FROM public.funds f
    LEFT JOIN last_reports lr ON f.asset = lr.asset_code
    LEFT JOIN live_transactions lt ON f.asset = lt.asset_code
    LEFT JOIN daily_fallback df ON f.id = df.fund_id
    WHERE f.status = 'active';
END;
$$;

-- 5. Log this alignment fix
INSERT INTO public.audit_log (action, entity, meta)
VALUES (
    'FUND_ALIGNMENT_FIX',
    'funds',
    jsonb_build_object(
        'description', 'Complete fund alignment - added missing SOL, USDC, EURC funds and updated get_historical_nav',
        'applied_at', NOW(),
        'assets_covered', ARRAY['BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC', 'xAUT', 'XRP']
    )
);

-- 6. Verify: Show all active funds
DO $$
DECLARE
    fund_count INT;
BEGIN
    SELECT COUNT(*) INTO fund_count FROM public.funds WHERE status = 'active';
    RAISE NOTICE 'Total active funds: %', fund_count;

    IF fund_count < 8 THEN
        RAISE WARNING 'Expected 8 active funds, found %. Manual review required.', fund_count;
    ELSE
        RAISE NOTICE 'All 8 funds are now active and aligned.';
    END IF;
END $$;
