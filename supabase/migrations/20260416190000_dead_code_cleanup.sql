-- =============================================================
-- Dead code cleanup: Drop 13 dead functions + rate_limit_config
-- 2026-04-16 | P1-8 from dead code audit (docs/audit/57)
--
-- All 13 functions have ZERO callers in DB and frontend code.
-- rate_limit_config table has zero rows and no code references.
-- =============================================================

-- Dead functions (zero callers, verified in audit)
DROP FUNCTION IF EXISTS batch_crystallize_fund;
DROP FUNCTION IF EXISTS apply_adb_yield_distribution_v3;
DROP FUNCTION IF EXISTS preview_adb_yield_distribution_v3;
DROP FUNCTION IF EXISTS preview_daily_yield_to_fund_v3;
DROP FUNCTION IF EXISTS sync_position_last_tx_date;
DROP FUNCTION IF EXISTS sync_profile_last_activity;
DROP FUNCTION IF EXISTS cleanup_dormant_positions;
DROP FUNCTION IF EXISTS export_investor_data;
DROP FUNCTION IF EXISTS initialize_crystallization_dates;
DROP FUNCTION IF EXISTS initialize_fund_aum_from_positions;
DROP FUNCTION IF EXISTS batch_initialize_fund_aum;
DROP FUNCTION IF EXISTS reset_all_data_keep_profiles;
DROP FUNCTION IF EXISTS create_profile_on_signup;

-- Dead table (zero rows, no code references)
DROP TABLE IF EXISTS rate_limit_config;