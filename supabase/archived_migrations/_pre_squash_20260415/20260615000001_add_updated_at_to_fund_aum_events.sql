-- =============================================================================
-- Migration: Add updated_at column to fund_aum_events table
-- Applied: 2026-06-15
-- Fixes: void_transaction function requires updated_at column
-- =============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'fund_aum_events'
      AND column_name = 'updated_at'
  ) THEN
    ALTER TABLE fund_aum_events
    ADD COLUMN updated_at TIMESTAMPTZ NULL;
  END IF;
END $$;