-- =============================================================================
-- Backfill voided_by_profile_id using canonical RPC bypass
-- =============================================================================

DO $$
BEGIN
  -- Enable canonical RPC bypass
  PERFORM set_canonical_rpc(true);
  
  -- Backfill fund_daily_aum
  UPDATE fund_daily_aum 
  SET voided_by_profile_id = voided_by 
  WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;
  
  -- Backfill fund_aum_events  
  UPDATE fund_aum_events 
  SET voided_by_profile_id = voided_by 
  WHERE voided_by IS NOT NULL AND voided_by_profile_id IS NULL;
  
  -- Disable canonical RPC bypass
  PERFORM set_canonical_rpc(false);
END $$;

-- Validate FK constraints
ALTER TABLE fund_daily_aum VALIDATE CONSTRAINT fk_fund_daily_aum_voided_by_profile;
ALTER TABLE fund_aum_events VALIDATE CONSTRAINT fk_fund_aum_events_voided_by_profile;