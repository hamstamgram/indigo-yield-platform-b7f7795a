-- Fix: Drop the overly restrictive unique index that blocks voided records
-- The correct partial index (fund_daily_aum_unique_active) already exists
-- and only enforces uniqueness for non-voided records

DROP INDEX IF EXISTS idx_fund_daily_aum_unique;

-- Clean up: Delete orphaned voided records that have a non-voided counterpart
-- This is safe because they are already voided and serve no purpose
DELETE FROM fund_daily_aum a
WHERE is_voided = true
AND EXISTS (
  SELECT 1 FROM fund_daily_aum b 
  WHERE b.fund_id = a.fund_id 
    AND b.aum_date = a.aum_date 
    AND b.purpose = a.purpose
    AND b.is_voided = false
    AND b.id != a.id
);