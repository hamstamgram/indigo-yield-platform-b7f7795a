-- ========================================
-- EMERGENCY MIGRATION: STANDARDIZE DECIMAL PRECISION
-- Date: November 3, 2025
-- Priority: P0 - CRITICAL (Financial Accuracy)
-- Time to execute: ~2-3 minutes
-- ========================================

-- CRITICAL: Multiple financial columns have NULL precision/scale
-- This causes rounding errors, precision loss, and calculation issues
-- Standardizing ALL to NUMERIC(20,8) = 12 integer digits + 8 decimal places

-- BEFORE RUNNING:
-- 1. BACKUP DATABASE: supabase db dump -f backup-$(date +%Y%m%d).sql
-- 2. Verify no active transactions are running

BEGIN;

-- ==========================================
-- STEP 1: FIX NULL PRECISION COLUMNS
-- ==========================================

-- Fix assets_raw table
ALTER TABLE assets_raw
  ALTER COLUMN price TYPE NUMERIC(20,8) USING COALESCE(price, 0)::NUMERIC(20,8);

ALTER TABLE assets_raw
  ALTER COLUMN total_usd_value TYPE NUMERIC(20,8) USING COALESCE(total_usd_value, 0)::NUMERIC(20,8);

-- Fix bank_accounts table
ALTER TABLE bank_accounts
  ALTER COLUMN balance TYPE NUMERIC(20,8) USING COALESCE(balance, 0)::NUMERIC(20,8);

-- Fix manual_assets table
ALTER TABLE manual_assets
  ALTER COLUMN amount TYPE NUMERIC(20,8) USING COALESCE(amount, 0)::NUMERIC(20,8);

ALTER TABLE manual_assets
  ALTER COLUMN current_price_usd TYPE NUMERIC(20,8) USING COALESCE(current_price_usd, 0)::NUMERIC(20,8);

ALTER TABLE manual_assets
  ALTER COLUMN total_value_usd TYPE NUMERIC(20,8) USING COALESCE(total_value_usd, 0)::NUMERIC(20,8);

-- Fix nft_holdings table
ALTER TABLE nft_holdings
  ALTER COLUMN floor_price_eth TYPE NUMERIC(20,8) USING COALESCE(floor_price_eth, 0)::NUMERIC(20,8);

ALTER TABLE nft_holdings
  ALTER COLUMN floor_price_usd TYPE NUMERIC(20,8) USING COALESCE(floor_price_usd, 0)::NUMERIC(20,8);

ALTER TABLE nft_holdings
  ALTER COLUMN usd_value TYPE NUMERIC(20,8) USING COALESCE(usd_value, 0)::NUMERIC(20,8);

-- ==========================================
-- STEP 2: FIX SCALE INCONSISTENCY
-- ==========================================

-- portfolio_holdings uses NUMERIC(30,10) - change to NUMERIC(20,8)
ALTER TABLE portfolio_holdings
  ALTER COLUMN amount TYPE NUMERIC(20,8) USING amount::NUMERIC(20,8);

-- ==========================================
-- STEP 3: FIX WRONG DATA TYPE (TEXT → NUMERIC)
-- ==========================================

-- portfolio_cron_log.portfolio_value is TEXT (!!!)
-- Convert to NUMERIC, handling empty strings and invalid values
ALTER TABLE portfolio_cron_log
  ALTER COLUMN portfolio_value TYPE NUMERIC(20,8)
  USING CASE
    WHEN portfolio_value ~ '^[0-9.]+$' THEN portfolio_value::NUMERIC(20,8)
    WHEN portfolio_value IS NULL OR portfolio_value = '' THEN 0
    ELSE 0
  END;

-- ==========================================
-- STEP 4: ADD CONSTRAINTS FOR DATA INTEGRITY
-- ==========================================

-- Ensure amounts are never negative (except for specific cases)
ALTER TABLE transactions
  ADD CONSTRAINT transactions_amount_positive
  CHECK (amount > 0);

ALTER TABLE positions
  ADD CONSTRAINT positions_principal_positive
  CHECK (principal >= 0);

ALTER TABLE positions
  ADD CONSTRAINT positions_current_balance_positive
  CHECK (current_balance >= 0);

ALTER TABLE positions
  ADD CONSTRAINT positions_total_earned_non_negative
  CHECK (total_earned >= 0);

-- Ensure fee percentage is between 0 and 100
ALTER TABLE profiles
  ADD CONSTRAINT profiles_fee_percentage_valid
  CHECK (fee_percentage >= 0 AND fee_percentage <= 100);

-- ==========================================
-- STEP 5: ADD DEFAULT VALUES WHERE APPROPRIATE
-- ==========================================

-- Set default to 0 for financial columns that can be NULL
ALTER TABLE bank_accounts
  ALTER COLUMN balance SET DEFAULT 0;

ALTER TABLE positions
  ALTER COLUMN total_earned SET DEFAULT 0;

-- ==========================================
-- STEP 6: UPDATE EXISTING NULL VALUES
-- ==========================================

-- Replace any remaining NULLs with 0
UPDATE assets_raw SET price = 0 WHERE price IS NULL;
UPDATE assets_raw SET total_usd_value = 0 WHERE total_usd_value IS NULL;
UPDATE bank_accounts SET balance = 0 WHERE balance IS NULL;
UPDATE manual_assets SET amount = 0 WHERE amount IS NULL;
UPDATE manual_assets SET current_price_usd = 0 WHERE current_price_usd IS NULL;
UPDATE manual_assets SET total_value_usd = 0 WHERE total_value_usd IS NULL;
UPDATE nft_holdings SET floor_price_eth = 0 WHERE floor_price_eth IS NULL;
UPDATE nft_holdings SET floor_price_usd = 0 WHERE floor_price_usd IS NULL;
UPDATE nft_holdings SET usd_value = 0 WHERE usd_value IS NULL;

COMMIT;

-- ==========================================
-- VERIFICATION QUERIES
-- ==========================================

-- Verify all financial columns have correct precision
SELECT
  table_name,
  column_name,
  data_type,
  numeric_precision,
  numeric_scale,
  CASE
    WHEN numeric_precision = 20 AND numeric_scale = 8 THEN '✅ CORRECT'
    WHEN data_type != 'numeric' THEN '⚠️ NOT NUMERIC'
    ELSE '❌ WRONG PRECISION'
  END as status
FROM information_schema.columns
WHERE table_schema = 'public'
  AND (
    column_name LIKE '%amount%' OR
    column_name LIKE '%price%' OR
    column_name LIKE '%balance%' OR
    column_name LIKE '%value%' OR
    column_name LIKE '%earned%' OR
    column_name LIKE '%fee%'
  )
ORDER BY table_name, column_name;

-- Expected: ALL show precision=20, scale=8

-- Check for any NULL values in financial columns
SELECT 'transactions' as table_name, COUNT(*) as null_count
FROM transactions WHERE amount IS NULL
UNION ALL
SELECT 'positions', COUNT(*)
FROM positions WHERE current_balance IS NULL OR principal IS NULL
UNION ALL
SELECT 'bank_accounts', COUNT(*)
FROM bank_accounts WHERE balance IS NULL;

-- Expected: All counts should be 0

-- ==========================================
-- APPLICATION CODE UPDATES REQUIRED
-- ==========================================

-- After this migration, update your application code:

-- 1. Install Decimal.js:
--    npm install decimal.js

-- 2. Create financial utility:
--    utils/financial.ts with Decimal.js helpers

-- 3. Update all financial calculations to use Decimal.js:
--    const amount = new Decimal('1000.00');
--    const fee = amount.times('0.0025'); // 0.25%

-- 4. Format for display:
--    amount.toFixed(2) // "1000.00"

-- 5. Database queries:
--    Store as strings: amount.toString()
--    Parse from DB: new Decimal(dbValue)
