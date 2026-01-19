-- Phase 4: Drop dead IB RPCs
-- Verified no frontend, RLS, trigger, or internal function usage
-- check_duplicate_ib_allocations: Only in contracts, no callers
-- is_ib: Only in contracts, no frontend/RLS/internal callers

DROP FUNCTION IF EXISTS check_duplicate_ib_allocations();
DROP FUNCTION IF EXISTS is_ib(uuid);

-- Document retained trigger functions
COMMENT ON FUNCTION audit_ib_allocation_payout() IS 'Trigger: Audits payout status changes on ib_allocations table';
COMMENT ON FUNCTION sync_ib_account_type() IS 'Trigger: Syncs account_type to ib when IB role assigned via user_roles';
COMMENT ON FUNCTION validate_ib_parent_has_role() IS 'Trigger: Validates ib_parent_id references a user with IB role';