-- =============================================================================
-- Schema Hardening: Add voided_by_profile_id to fund_daily_aum and fund_aum_events
-- =============================================================================

-- Phase 1: Add columns
ALTER TABLE fund_daily_aum 
  ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;

ALTER TABLE fund_aum_events 
  ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;

-- Phase 2: Add FK constraints
ALTER TABLE fund_daily_aum 
  ADD CONSTRAINT fk_fund_daily_aum_voided_by_profile 
  FOREIGN KEY (voided_by_profile_id) REFERENCES profiles(id) NOT VALID;

ALTER TABLE fund_aum_events 
  ADD CONSTRAINT fk_fund_aum_events_voided_by_profile 
  FOREIGN KEY (voided_by_profile_id) REFERENCES profiles(id) NOT VALID;

-- Phase 3: Create sync triggers
CREATE OR REPLACE FUNCTION sync_fund_daily_aum_voided_by_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fund_daily_aum_sync_voided_by ON fund_daily_aum;
CREATE TRIGGER trg_fund_daily_aum_sync_voided_by
  BEFORE INSERT OR UPDATE ON fund_daily_aum
  FOR EACH ROW EXECUTE FUNCTION sync_fund_daily_aum_voided_by_profile();

CREATE OR REPLACE FUNCTION sync_fund_aum_events_voided_by_profile()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.voided_by_profile_id IS NULL AND NEW.voided_by IS NOT NULL THEN
    NEW.voided_by_profile_id := NEW.voided_by;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

DROP TRIGGER IF EXISTS trg_fund_aum_events_sync_voided_by ON fund_aum_events;
CREATE TRIGGER trg_fund_aum_events_sync_voided_by
  BEFORE INSERT OR UPDATE ON fund_aum_events
  FOR EACH ROW EXECUTE FUNCTION sync_fund_aum_events_voided_by_profile();