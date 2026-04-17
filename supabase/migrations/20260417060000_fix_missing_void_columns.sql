-- =============================================================
-- Fix missing void columns on remote DB
-- 2026-04-17 | CRITICAL: The squash baseline used
-- CREATE TABLE IF NOT EXISTS which does NOT add columns to
-- pre-existing tables. The remote DB was live before the squash
-- and is missing columns that were added to the squash definition.
--
-- This caused "column credit_transaction_id does not exist" and
-- similar errors when voiding transactions, because void_transaction
-- and void_yield_distribution write to these columns.
--
-- Uses ADD COLUMN IF NOT EXISTS — safe for local (already has them)
-- and fixes remote (doesn't have them).
-- =============================================================

-- yield_allocations: 4 missing void-tracking columns
ALTER TABLE public.yield_allocations ADD COLUMN IF NOT EXISTS voided_at timestamp with time zone;
ALTER TABLE public.yield_allocations ADD COLUMN IF NOT EXISTS voided_by uuid;
ALTER TABLE public.yield_allocations ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;
ALTER TABLE public.yield_allocations ADD COLUMN IF NOT EXISTS void_reason text;

-- ib_allocations: void_reason missing (voided_by_profile_id exists)
ALTER TABLE public.ib_allocations ADD COLUMN IF NOT EXISTS void_reason text;

-- ib_commission_ledger: voided_by_profile_id missing
ALTER TABLE public.ib_commission_ledger ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;

-- investor_yield_events: 2 missing columns
ALTER TABLE public.investor_yield_events ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;
ALTER TABLE public.investor_yield_events ADD COLUMN IF NOT EXISTS void_reason text;

-- platform_fee_ledger: voided_by_profile_id missing
ALTER TABLE public.platform_fee_ledger ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;

-- yield_distributions: 2 missing columns
ALTER TABLE public.yield_distributions ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;
ALTER TABLE public.yield_distributions ADD COLUMN IF NOT EXISTS void_reason text;

-- fee_allocations: credit_transaction_id and debit_transaction_id
-- may have been renamed from fee_credit_transaction_id/ib_credit_transaction_id
-- in an archived migration. Add IF NOT EXISTS as safety net.
ALTER TABLE public.fee_allocations ADD COLUMN IF NOT EXISTS credit_transaction_id uuid;
ALTER TABLE public.fee_allocations ADD COLUMN IF NOT EXISTS debit_transaction_id uuid;
ALTER TABLE public.fee_allocations ADD COLUMN IF NOT EXISTS voided_by_profile_id uuid;
ALTER TABLE public.fee_allocations ADD COLUMN IF NOT EXISTS void_reason text;

-- withdrawal_requests: is_full_exit added in squash (not in prod baseline)
ALTER TABLE public.withdrawal_requests ADD COLUMN IF NOT EXISTS is_full_exit boolean DEFAULT false;

-- fund_aum_events: pre_flow_aum and updated_at added in squash (not in prod baseline)
ALTER TABLE public.fund_aum_events ADD COLUMN IF NOT EXISTS pre_flow_aum numeric(28,10);
ALTER TABLE public.fund_aum_events ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone;
ALTER TABLE public.fund_aum_events ADD COLUMN IF NOT EXISTS amount numeric(28,10);
ALTER TABLE public.fund_aum_events ADD COLUMN IF NOT EXISTS transaction_id uuid;
ALTER TABLE public.fund_aum_events ADD COLUMN IF NOT EXISTS investor_id uuid;
ALTER TABLE public.fund_aum_events ADD COLUMN IF NOT EXISTS event_date date;

-- yield_distributions: snapshot_time added in squash
ALTER TABLE public.yield_distributions ADD COLUMN IF NOT EXISTS snapshot_time text;

-- investor_positions: cumulative_yield_earned added in squash
ALTER TABLE public.investor_positions ADD COLUMN IF NOT EXISTS cumulative_yield_earned numeric(28,10) DEFAULT 0;

-- fund_daily_aum: temporal_lock_bypass added in squash
ALTER TABLE public.fund_daily_aum ADD COLUMN IF NOT EXISTS temporal_lock_bypass boolean DEFAULT false;