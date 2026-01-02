-- Fix XRP fund AUM records that were recorded incorrectly
-- The snapshots were taken BEFORE deposits instead of AFTER

-- First, let's check current data and fix the incorrect records
-- Note: Using UPDATE instead of hardcoded IDs for safety

-- Fix November 17, 2025: Should be 135,003 (after first deposit of 135,003)
UPDATE fund_daily_aum 
SET total_aum = 135003,
    updated_at = NOW(),
    source = 'corrected_via_migration'
WHERE fund_id IN (SELECT id FROM funds WHERE code = 'IND-XRP')
  AND aum_date = '2025-11-17'
  AND purpose = 'transaction'
  AND is_voided = false
  AND total_aum = 0;

-- Fix November 25, 2025: Should be 184,003 (after second deposit of 49,000)
UPDATE fund_daily_aum 
SET total_aum = 184003,
    updated_at = NOW(),
    source = 'corrected_via_migration'
WHERE fund_id IN (SELECT id FROM funds WHERE code = 'IND-XRP')
  AND aum_date = '2025-11-25'
  AND purpose = 'transaction'
  AND is_voided = false
  AND total_aum = 135003;

-- Clean up voided records older than 30 days to prevent clutter
DELETE FROM fund_daily_aum 
WHERE is_voided = true 
AND created_at < NOW() - INTERVAL '30 days';

-- Add unique constraint to prevent duplicate active AUM records for same fund/date/purpose
-- First drop if exists to make migration idempotent
DROP INDEX IF EXISTS fund_daily_aum_unique_active;

CREATE UNIQUE INDEX fund_daily_aum_unique_active 
ON fund_daily_aum (fund_id, aum_date, purpose) 
WHERE is_voided = false;