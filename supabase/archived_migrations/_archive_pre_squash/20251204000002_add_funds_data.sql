-- Migration: Add xAUT and XRP funds data
-- Date: 2025-12-04

-- 1. Update the constraint on the funds table for 'asset'
ALTER TABLE public.funds DROP CONSTRAINT IF EXISTS funds_asset_check;
ALTER TABLE public.funds ADD CONSTRAINT funds_asset_check 
    CHECK (asset IN ('BTC','ETH','SOL','USDT','USDC','EURC','xAUT','XRP'));

-- 2. Update the constraint on the funds table for 'fund_class'
-- This allows us to use 'xAUT' and 'XRP' as valid fund classes
ALTER TABLE public.funds DROP CONSTRAINT IF EXISTS funds_fund_class_check;
ALTER TABLE public.funds ADD CONSTRAINT funds_fund_class_check 
    CHECK (fund_class IN ('USDT', 'USDC', 'EURC', 'BTC', 'ETH', 'SOL', 'xAUT', 'XRP'));

-- 3. Insert new assets
INSERT INTO public.assets (symbol, name, decimal_places, icon_url, is_active)
VALUES 
    ('xAUT', 'Tether Gold', 6, '/assets/xaut.svg', true),
    ('XRP', 'XRP', 6, '/assets/xrp.svg', true)
ON CONFLICT (symbol) DO UPDATE SET
    name = EXCLUDED.name,
    decimal_places = EXCLUDED.decimal_places,
    icon_url = EXCLUDED.icon_url,
    is_active = EXCLUDED.is_active;

-- 4. Insert new funds
-- Now including fund_class
INSERT INTO public.funds (code, name, asset, strategy, mgmt_fee_bps, perf_fee_bps, fund_class)
VALUES 
    ('XAUTYF', 'Tether Gold Yield Fund', 'xAUT', 'Gold Yield Strategy', 200, 2000, 'xAUT'),
    ('XRPYF', 'XRP Yield Fund', 'XRP', 'XRP Ledger Yield', 200, 2000, 'XRP')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    asset = EXCLUDED.asset,
    strategy = EXCLUDED.strategy,
    fund_class = EXCLUDED.fund_class;