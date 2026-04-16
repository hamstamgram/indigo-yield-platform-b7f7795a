-- =============================================================================
-- Migration: Add voided_by_profile_id column to fund_aum_events table
-- Applied: 2026-06-15
-- Fixes: "column voided_by_profile_id of relation fund_aum_events does not exist"
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fund_aum_events'
      AND column_name = 'voided_by_profile_id'
  ) THEN
    ALTER TABLE fund_aum_events
    ADD COLUMN voided_by_profile_id TEXT NULL;
  END IF;
END $$;