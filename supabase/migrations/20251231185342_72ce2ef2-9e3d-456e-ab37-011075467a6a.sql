-- Schema Remediation Migration
-- Fixes issues identified in deep schema audit

-- =====================================================
-- PHASE 1: Fix Type Mismatches (High Priority)
-- =====================================================

-- 1.1 Fix generated_reports.fund_id from TEXT to UUID
-- First, clean any invalid data
UPDATE generated_reports 
SET fund_id = NULL 
WHERE fund_id IS NOT NULL 
  AND fund_id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Alter column type
ALTER TABLE generated_reports 
  ALTER COLUMN fund_id TYPE uuid USING fund_id::uuid;

-- Add foreign key constraint
ALTER TABLE generated_reports
  ADD CONSTRAINT fk_generated_reports_fund
  FOREIGN KEY (fund_id) REFERENCES funds(id) ON DELETE SET NULL;

-- 1.2 Fix fund_daily_aum_archive.fund_id from TEXT to UUID (if data exists)
UPDATE fund_daily_aum_archive 
SET fund_id = NULL 
WHERE fund_id IS NOT NULL 
  AND fund_id::text !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

ALTER TABLE fund_daily_aum_archive 
  ALTER COLUMN fund_id TYPE uuid USING fund_id::uuid;

-- =====================================================
-- PHASE 3: Clean Up Nullable Columns (Medium Priority)
-- =====================================================

-- 3.1 Make is_voided NOT NULL on fee_allocations
UPDATE fee_allocations SET is_voided = false WHERE is_voided IS NULL;
ALTER TABLE fee_allocations ALTER COLUMN is_voided SET DEFAULT false;
ALTER TABLE fee_allocations ALTER COLUMN is_voided SET NOT NULL;

-- 3.2 Make is_voided NOT NULL on fund_daily_aum
UPDATE fund_daily_aum SET is_voided = false WHERE is_voided IS NULL;
ALTER TABLE fund_daily_aum ALTER COLUMN is_voided SET DEFAULT false;
ALTER TABLE fund_daily_aum ALTER COLUMN is_voided SET NOT NULL;

-- 3.3 Make is_voided NOT NULL on ib_allocations
UPDATE ib_allocations SET is_voided = false WHERE is_voided IS NULL;
ALTER TABLE ib_allocations ALTER COLUMN is_voided SET DEFAULT false;
ALTER TABLE ib_allocations ALTER COLUMN is_voided SET NOT NULL;

-- 3.4 Make investor_emails.investor_id NOT NULL (delete orphans first)
DELETE FROM investor_emails WHERE investor_id IS NULL;
ALTER TABLE investor_emails ALTER COLUMN investor_id SET NOT NULL;

-- Add foreign key if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints 
    WHERE constraint_name = 'fk_investor_emails_investor'
  ) THEN
    ALTER TABLE investor_emails
      ADD CONSTRAINT fk_investor_emails_investor
      FOREIGN KEY (investor_id) REFERENCES profiles(id) ON DELETE CASCADE;
  END IF;
END $$;

-- =====================================================
-- PHASE 4: Fix Missing Data (Low Priority)
-- =====================================================

-- 4.1 Set created_by on orphaned transactions_v2 to first admin
UPDATE transactions_v2 
SET created_by = (SELECT id FROM profiles WHERE is_admin = true LIMIT 1)
WHERE created_by IS NULL;

-- =====================================================
-- PHASE 5: Cleanup - Add missing enum value
-- =====================================================

-- 5.1 Add ADA to asset_code enum if not exists (for deprecated ADA fund)
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_enum WHERE enumlabel = 'ADA' AND enumtypid = 'asset_code'::regtype) THEN
    ALTER TYPE asset_code ADD VALUE IF NOT EXISTS 'ADA';
  END IF;
EXCEPTION WHEN others THEN
  -- Ignore if already exists or can't add
  NULL;
END $$;

-- =====================================================
-- Add index for common query patterns
-- =====================================================

-- Index for faster investor email lookups
CREATE INDEX IF NOT EXISTS idx_investor_emails_investor_id 
  ON investor_emails(investor_id);

-- Index for generated_reports by fund
CREATE INDEX IF NOT EXISTS idx_generated_reports_fund_id 
  ON generated_reports(fund_id) WHERE fund_id IS NOT NULL;

-- =====================================================
-- Add comments for documentation
-- =====================================================

COMMENT ON COLUMN fee_allocations.is_voided IS 'Indicates if this allocation has been voided/reversed';
COMMENT ON COLUMN fund_daily_aum.is_voided IS 'Indicates if this AUM record has been voided';
COMMENT ON COLUMN ib_allocations.is_voided IS 'Indicates if this IB allocation has been voided';
COMMENT ON COLUMN investor_emails.investor_id IS 'Reference to the investor profile (required)';