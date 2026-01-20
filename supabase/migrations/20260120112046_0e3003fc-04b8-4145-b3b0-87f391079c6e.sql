-- ============================================================================
-- A1: Add unique constraint on daily_nav including purpose
-- Release: A (Additive)
-- ============================================================================

-- Add unique constraint including purpose (additive, alongside existing PK)
-- This ensures (fund_id, nav_date, purpose) is unique
CREATE UNIQUE INDEX IF NOT EXISTS 
  idx_daily_nav_fund_date_purpose_unique 
  ON daily_nav (fund_id, nav_date, purpose);