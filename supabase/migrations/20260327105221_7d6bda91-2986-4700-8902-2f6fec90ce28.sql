-- Phase 9: Drop dead DB artifacts
-- fund_aum_events is a stub view (WHERE false) with zero rows
DROP VIEW IF EXISTS fund_aum_events;

-- verify_aum_purpose_usage is a legacy diagnostic function
DROP FUNCTION IF EXISTS verify_aum_purpose_usage();