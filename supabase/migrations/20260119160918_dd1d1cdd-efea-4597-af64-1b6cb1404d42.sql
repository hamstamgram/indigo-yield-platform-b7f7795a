-- ============================================================================
-- P1-03: Unify AUM Snapshot Tables
-- Drops unused snapshot tables (all have 0 rows) and related RPC functions
-- Keeps: fund_daily_aum (canonical), fund_aum_events (event-sourced), 
--        investor_position_snapshots (audit trail)
-- ============================================================================

-- 1. Drop RPC functions that reference the tables being dropped
DROP FUNCTION IF EXISTS public.generate_fund_period_snapshot(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.lock_fund_period_snapshot(uuid, uuid, uuid);
DROP FUNCTION IF EXISTS public.unlock_fund_period_snapshot(uuid, uuid, uuid, text);
DROP FUNCTION IF EXISTS public.is_period_locked(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_period_ownership(uuid, uuid);

-- 2. Drop unused tables (all confirmed to have 0 rows)
DROP TABLE IF EXISTS public.investor_period_snapshot CASCADE;
DROP TABLE IF EXISTS public.fund_period_snapshot CASCADE;
DROP TABLE IF EXISTS public.fund_yield_snapshots CASCADE;

-- 3. Add documentation comments to canonical AUM tables

COMMENT ON TABLE public.fund_daily_aum IS 
  'Canonical daily AUM storage for funds. 
   Purpose: reporting (finalized month-end snapshots) or transaction (mid-month operational).
   Protected by canonical mutation RPCs (set_fund_daily_aum, update_fund_daily_aum, void_fund_daily_aum).
   Use get_fund_aum_as_of() for historical lookups.';

COMMENT ON TABLE public.fund_aum_events IS 
  'Event-sourced AUM checkpoints for preflow crystallization.
   Records opening/closing AUM with trigger_type for complete audit trail.
   Used by ensure_preflow_aum() and crystallization flows.
   Immutable after creation - void to correct.';

COMMENT ON TABLE public.fund_daily_aum_archive IS 
  'Archive for voided fund_daily_aum records.
   Preserves full history when AUM records are voided.
   Query for audit trail of corrections.';

COMMENT ON TABLE public.investor_position_snapshots IS 
  'Daily investor position snapshots for audit and historical analysis.
   Created by create_daily_position_snapshot() via scheduled cron.
   Used for point-in-time position reconstruction.';

COMMENT ON COLUMN public.fund_daily_aum.purpose IS 
  'reporting = finalized month-end snapshot for statements; 
   transaction = mid-month operational snapshot for yield/flows';

COMMENT ON COLUMN public.fund_aum_events.trigger_type IS 
  'Type of event that created this checkpoint: deposit, withdrawal, yield, manual, etc.';

COMMENT ON COLUMN public.fund_aum_events.trigger_reference IS 
  'Reference to the source entity (transaction_id, distribution_id, etc.)';
