-- P2-01: Fee Function Cleanup
-- Drop duplicate trigger and add documentation comments

-- 1. Remove duplicate trigger (keeping auto_close_previous_fee_schedule)
DROP TRIGGER IF EXISTS trg_close_previous_fee_schedule ON investor_fee_schedule;
DROP FUNCTION IF EXISTS public.close_previous_fee_schedule();

-- 2. Document fee-related functions

COMMENT ON FUNCTION public._resolve_investor_fee_pct(uuid, uuid, date) IS 
  'Resolves PLATFORM FEE percentage only (not IB). Lookup order: investor_fee_schedule (fund-specific → global) → profiles.fee_pct → 20% default. IB percentage is read separately from profiles.ib_percentage column.';

COMMENT ON FUNCTION public.route_withdrawal_to_fees(uuid, text) IS 
  'Routes an approved withdrawal to INDIGO FEES account. Creates paired INTERNAL_WITHDRAWAL (debit investor) and INTERNAL_CREDIT (credit fees account) transactions.';

COMMENT ON FUNCTION public.internal_route_to_fees(uuid, uuid, numeric, date, text, uuid, uuid) IS 
  'Admin-initiated internal transfer from investor to INDIGO FEES account. Used for manual fee routing.';

COMMENT ON FUNCTION public.auto_close_previous_fee_schedule() IS 
  'Trigger function: Auto-closes previous fee schedule entries when a new one is inserted for the same investor+fund scope by setting end_date.';

COMMENT ON FUNCTION public.audit_fee_schedule_changes() IS 
  'Trigger function: Logs all fee schedule changes (INSERT/UPDATE/DELETE) to audit_log table for compliance.';

COMMENT ON FUNCTION public.enforce_fees_account_zero_fee() IS 
  'Trigger function: Ensures INDIGO FEES account (account_type=fees_account) always has 0% fee_pct to prevent self-charging on yield distribution.';