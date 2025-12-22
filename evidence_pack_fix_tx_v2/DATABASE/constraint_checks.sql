-- CONSTRAINT CHECKS
-- Executed: 2025-12-22
-- All constraints verified as existing

-- Check 1: investor_positions unique constraint
SELECT 
  'investor_positions_unique' as check_name,
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'investor_positions_investor_fund_unique') as exists;
-- Result: TRUE

-- Check 2: funds active asset unique constraint  
SELECT 
  'funds_active_asset_unique' as check_name,
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_funds_active_asset_unique') as exists;
-- Result: TRUE

-- Check 3: fund_daily_aum unique constraint
SELECT 
  'fund_daily_aum_unique' as check_name,
  EXISTS(SELECT 1 FROM pg_indexes WHERE indexname = 'idx_fund_daily_aum_unique') as exists;
-- Result: TRUE

-- Check 4: No duplicate active funds per asset
SELECT 
  lower(asset) as asset_lower,
  COUNT(*) as active_count
FROM funds
WHERE status = 'active'
GROUP BY lower(asset)
HAVING COUNT(*) > 1;
-- Result: Empty set (no duplicates)

-- Check 5: Position recompute trigger exists
SELECT tgname FROM pg_trigger 
WHERE tgrelid = 'public.transactions_v2'::regclass
AND tgname LIKE '%recompute%';
-- Result: trg_recompute_position_on_tx
