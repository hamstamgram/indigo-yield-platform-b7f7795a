-- =============================================================
-- P1-9: Add DEPRECATED markers to 7 redundant sync functions
-- 2026-04-16 | From dead code audit (docs/audit/57)
--
-- These functions still have callers (triggers) but are
-- redundant and should be removed in a future phase.
-- =============================================================

COMMENT ON FUNCTION sync_aum_on_position_change IS 'DEPRECATED: Redundant with sync_aum_on_transaction. Remove trigger in Phase 3.';
COMMENT ON FUNCTION sync_fund_aum_after_position IS 'DEPRECATED: Redundant AUM sync path. Remove trigger in Phase 3.';
COMMENT ON FUNCTION sync_profile_role_from_profiles IS 'DEPRECATED: Duplicate of sync_profile_role_from_roles. Remove trigger in Phase 3.';
COMMENT ON FUNCTION sync_yield_distribution_legacy_totals IS 'DEPRECATED: Legacy totals sync. Verify still needed before Phase 3 removal.';
COMMENT ON FUNCTION sync_all_fund_aum IS 'DEPRECATED: Triggers handle AUM sync. Keep as admin break-glass only.';
COMMENT ON FUNCTION sync_aum_to_positions IS 'DEPRECATED: Reverse-direction sync not normally needed.';
COMMENT ON FUNCTION sync_transaction_aum_after_yield IS 'DEPRECATED: Redundant with sync_aum_on_transaction trigger.';
COMMENT ON FUNCTION force_delete_investor IS 'DEPRECATED: Dangerous. Use only in emergency data cleanup.';