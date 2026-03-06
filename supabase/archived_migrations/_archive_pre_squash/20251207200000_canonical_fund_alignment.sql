-- =====================================================
-- CANONICAL FUND ALIGNMENT MIGRATION
-- Date: 2025-12-07
-- Purpose: Single source of truth for fund configuration
-- =====================================================
--
-- This migration:
-- 1. Ensures all 6 intended funds exist with correct names
-- 2. Deactivates any duplicate/unwanted funds
-- 3. Creates a working get_historical_nav function using daily_nav
-- 4. Is fully idempotent (safe to run multiple times)
--
-- INTENDED FUNDS:
-- 1. BTC Yield Fund (BTC)
-- 2. ETH Yield Fund (ETH)
-- 3. SOL Yield Fund (SOL)
-- 4. Stablecoin Fund (USDT) - NOT "USDT Yield Fund"
-- 5. Tokenized Gold (xAUT)
-- 6. XRP Yield Fund (XRP)
--
-- NOT INCLUDED: USDC, EURC (per business requirements)
-- =====================================================

-- =====================================================
-- STEP 1: Ensure asset enum includes all required values
-- =====================================================
DO $$
BEGIN
    -- Add missing enum values if they don't exist
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'SOL' AND enumtypid = 'asset_code'::regtype) THEN
        ALTER TYPE public.asset_code ADD VALUE IF NOT EXISTS 'SOL';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'xAUT' AND enumtypid = 'asset_code'::regtype) THEN
        ALTER TYPE public.asset_code ADD VALUE IF NOT EXISTS 'xAUT';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'XRP' AND enumtypid = 'asset_code'::regtype) THEN
        ALTER TYPE public.asset_code ADD VALUE IF NOT EXISTS 'XRP';
    END IF;
EXCEPTION
    WHEN undefined_object THEN
        -- Enum doesn't exist, that's fine
        NULL;
END $$;

-- =====================================================
-- STEP 2: Deactivate duplicate/old fund entries
-- =====================================================
UPDATE public.funds
SET status = 'inactive'
WHERE code IN ('BTCYF', 'ETHYF', 'USDTYF', 'XAUTYF', 'XRPYF')
  AND code NOT LIKE 'IND-%';

-- =====================================================
-- STEP 3: Upsert the 6 canonical funds
-- =====================================================
INSERT INTO public.funds (code, name, asset, strategy, fund_class, status, inception_date)
VALUES
    ('IND-BTC', 'BTC Yield Fund', 'BTC', 'DeFi Yield Farming', 'BTC', 'active', '2024-01-01'),
    ('IND-ETH', 'ETH Yield Fund', 'ETH', 'Staking and DeFi', 'ETH', 'active', '2024-01-01'),
    ('IND-SOL', 'SOL Yield Fund', 'SOL', 'Staking and DeFi', 'SOL', 'active', '2024-01-01'),
    ('IND-USDT', 'Stablecoin Fund', 'USDT', 'Stable Yield', 'USDT', 'active', '2024-01-01'),
    ('IND-XAUT', 'Tokenized Gold', 'xAUT', 'Gold Yield Strategy', 'xAUT', 'active', '2024-01-01'),
    ('IND-XRP', 'XRP Yield Fund', 'XRP', 'XRP Ledger Yield', 'XRP', 'active', '2024-01-01')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    asset = EXCLUDED.asset,
    strategy = EXCLUDED.strategy,
    fund_class = EXCLUDED.fund_class,
    status = 'active';

-- =====================================================
-- STEP 4: Update assets table with all required assets
-- =====================================================
INSERT INTO public.assets (symbol, name, decimal_places, icon_url, is_active)
VALUES
    ('BTC', 'Bitcoin', 8, '/assets/btc.svg', true),
    ('ETH', 'Ethereum', 18, '/assets/eth.svg', true),
    ('SOL', 'Solana', 9, '/assets/sol.svg', true),
    ('USDT', 'Tether USD', 6, '/assets/usdt.svg', true),
    ('xAUT', 'Tether Gold', 6, '/assets/xaut.svg', true),
    ('XRP', 'XRP', 6, '/assets/xrp.svg', true)
ON CONFLICT (symbol) DO UPDATE SET
    name = EXCLUDED.name,
    is_active = true;

-- =====================================================
-- STEP 5: Create/Replace the get_historical_nav function
-- This version uses daily_nav as primary source (which has data)
-- =====================================================
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
BEGIN
    RETURN QUERY
    WITH
    -- Primary source: daily_nav table
    daily_data AS (
        SELECT
            dn.fund_id,
            dn.aum,
            COALESCE(dn.total_inflows, 0) as inflows,
            COALESCE(dn.total_outflows, 0) as outflows
        FROM public.daily_nav dn
        WHERE dn.nav_date = target_date
    ),
    -- Fallback: Sum of investor_positions current_value
    position_fallback AS (
        SELECT
            ip.fund_id,
            SUM(COALESCE(ip.current_value, 0)) as total_value
        FROM public.investor_positions ip
        GROUP BY ip.fund_id
    ),
    -- Get recent daily_nav if exact date not found
    latest_nav AS (
        SELECT DISTINCT ON (dn.fund_id)
            dn.fund_id,
            dn.aum,
            dn.total_inflows,
            dn.total_outflows
        FROM public.daily_nav dn
        WHERE dn.nav_date <= target_date
        ORDER BY dn.fund_id, dn.nav_date DESC
    )
    SELECT
        f.id,
        f.name,
        f.asset,
        -- AUM: Try daily_data → latest_nav → position_fallback → 0
        COALESCE(
            dd.aum,
            ln.aum,
            pf.total_value,
            0
        )::NUMERIC as aum,
        COALESCE(dd.inflows, ln.total_inflows, 0)::NUMERIC as daily_inflows,
        COALESCE(dd.outflows, ln.total_outflows, 0)::NUMERIC as daily_outflows,
        (COALESCE(dd.inflows, ln.total_inflows, 0) - COALESCE(dd.outflows, ln.total_outflows, 0))::NUMERIC as net_flow_24h
    FROM public.funds f
    LEFT JOIN daily_data dd ON f.id = dd.fund_id
    LEFT JOIN latest_nav ln ON f.id = ln.fund_id
    LEFT JOIN position_fallback pf ON f.id = pf.fund_id
    WHERE f.status = 'active'
    ORDER BY
        CASE f.asset
            WHEN 'BTC' THEN 1
            WHEN 'ETH' THEN 2
            WHEN 'SOL' THEN 3
            WHEN 'USDT' THEN 4
            WHEN 'xAUT' THEN 5
            WHEN 'XRP' THEN 6
            ELSE 99
        END;
END;
$$;

-- =====================================================
-- STEP 6: Grant execute permission
-- =====================================================
GRANT EXECUTE ON FUNCTION public.get_historical_nav(DATE) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_historical_nav(DATE) TO anon;

-- =====================================================
-- STEP 7: Log this migration
-- =====================================================
INSERT INTO public.audit_log (action, entity, meta)
VALUES (
    'CANONICAL_FUND_ALIGNMENT',
    'funds',
    jsonb_build_object(
        'description', 'Canonical fund alignment - 6 funds configured',
        'funds', ARRAY['BTC Yield Fund', 'ETH Yield Fund', 'SOL Yield Fund', 'Stablecoin Fund', 'Tokenized Gold', 'XRP Yield Fund'],
        'applied_at', NOW()
    )
);

-- =====================================================
-- STEP 8: Verification
-- =====================================================
DO $$
DECLARE
    fund_count INT;
    fund_list TEXT;
BEGIN
    SELECT COUNT(*), string_agg(code || ' (' || asset || ')', ', ' ORDER BY code)
    INTO fund_count, fund_list
    FROM public.funds
    WHERE status = 'active';

    RAISE NOTICE '';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE 'CANONICAL FUND ALIGNMENT COMPLETE';
    RAISE NOTICE '══════════════════════════════════════════════════════════';
    RAISE NOTICE 'Active funds: %', fund_count;
    RAISE NOTICE 'Funds: %', fund_list;
    RAISE NOTICE '══════════════════════════════════════════════════════════';

    IF fund_count != 6 THEN
        RAISE WARNING 'Expected 6 active funds, found %. Manual review required.', fund_count;
    END IF;
END $$;
