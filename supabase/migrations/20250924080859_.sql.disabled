-- Update fund codes and names to clean asset names
-- Remove "Yield" suffixes and clean up fund codes and names

-- Update fund codes to clean asset symbols
UPDATE public.funds 
SET code = 'BTC'
WHERE code = 'BTCYF';

UPDATE public.funds 
SET code = 'ETH'
WHERE code = 'ETHYF';

UPDATE public.funds 
SET code = 'USDT'
WHERE code = 'USDTYF';

UPDATE public.funds 
SET code = 'SOL'
WHERE code = 'SOL-YIELD';

UPDATE public.funds 
SET code = 'USDC'
WHERE code = 'USDC-YIELD';

UPDATE public.funds 
SET code = 'EURC'
WHERE code = 'EURC-YIELD';

-- Update fund names to remove "Yield" suffixes
UPDATE public.funds 
SET name = 'BTC Fund'
WHERE name LIKE '%BTC Yield Fund%';

UPDATE public.funds 
SET name = 'ETH Fund'
WHERE name LIKE '%ETH Yield Fund%';

UPDATE public.funds 
SET name = 'USDT Fund'
WHERE name LIKE '%USDT Yield Fund%';

UPDATE public.funds 
SET name = 'Solana Fund'
WHERE name LIKE '%Solana Yield Fund%';

UPDATE public.funds 
SET name = 'USD Coin Fund'
WHERE name LIKE '%USD Coin Yield Fund%';

UPDATE public.funds 
SET name = 'Euro Coin Fund'
WHERE name LIKE '%Euro Coin Yield Fund%';

-- Update any related records that reference the old fund codes
-- Update daily_yield_applications asset_code references
UPDATE public.daily_yield_applications 
SET asset_code = 'BTC'
WHERE asset_code = 'BTCYF';

UPDATE public.daily_yield_applications 
SET asset_code = 'ETH'
WHERE asset_code = 'ETHYF';

UPDATE public.daily_yield_applications 
SET asset_code = 'USDT'
WHERE asset_code = 'USDTYF';

UPDATE public.daily_yield_applications 
SET asset_code = 'SOL'
WHERE asset_code = 'SOL-YIELD';

UPDATE public.daily_yield_applications 
SET asset_code = 'USDC'
WHERE asset_code = 'USDC-YIELD';

UPDATE public.daily_yield_applications 
SET asset_code = 'EURC'
WHERE asset_code = 'EURC-YIELD';

-- Update yield_distribution_log asset_code references
UPDATE public.yield_distribution_log 
SET asset_code = 'BTC'
WHERE asset_code = 'BTCYF';

UPDATE public.yield_distribution_log 
SET asset_code = 'ETH'
WHERE asset_code = 'ETHYF';

UPDATE public.yield_distribution_log 
SET asset_code = 'USDT'
WHERE asset_code = 'USDTYF';

UPDATE public.yield_distribution_log 
SET asset_code = 'SOL'
WHERE asset_code = 'SOL-YIELD';

UPDATE public.yield_distribution_log 
SET asset_code = 'USDC'
WHERE asset_code = 'USDC-YIELD';

UPDATE public.yield_distribution_log 
SET asset_code = 'EURC'
WHERE asset_code = 'EURC-YIELD';

-- Update platform_fees_collected asset_code references
UPDATE public.platform_fees_collected 
SET asset_code = 'BTC'
WHERE asset_code = 'BTCYF';

UPDATE public.platform_fees_collected 
SET asset_code = 'ETH'
WHERE asset_code = 'ETHYF';

UPDATE public.platform_fees_collected 
SET asset_code = 'USDT'
WHERE asset_code = 'USDTYF';

UPDATE public.platform_fees_collected 
SET asset_code = 'SOL'
WHERE asset_code = 'SOL-YIELD';

UPDATE public.platform_fees_collected 
SET asset_code = 'USDC'
WHERE asset_code = 'USDC-YIELD';

UPDATE public.platform_fees_collected 
SET asset_code = 'EURC'
WHERE asset_code = 'EURC-YIELD';

-- Update monthly_fee_summary asset_code references
UPDATE public.monthly_fee_summary 
SET asset_code = 'BTC'
WHERE asset_code = 'BTCYF';

UPDATE public.monthly_fee_summary 
SET asset_code = 'ETH'
WHERE asset_code = 'ETHYF';

UPDATE public.monthly_fee_summary 
SET asset_code = 'USDT'
WHERE asset_code = 'USDTYF';

UPDATE public.monthly_fee_summary 
SET asset_code = 'SOL'
WHERE asset_code = 'SOL-YIELD';

UPDATE public.monthly_fee_summary 
SET asset_code = 'USDC'
WHERE asset_code = 'USDC-YIELD';

UPDATE public.monthly_fee_summary 
SET asset_code = 'EURC'
WHERE asset_code = 'EURC-YIELD';;
