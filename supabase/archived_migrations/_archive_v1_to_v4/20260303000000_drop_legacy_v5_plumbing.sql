-- =========================================================================
-- V6 CLEANUP MIGRATION: Drop Obsolete Functions
-- =========================================================================
-- We no longer crystallize yield mid-month, nor do we pass AUM in transactions.
-- These functions are dead weight.

DROP FUNCTION IF EXISTS public.apply_transaction_with_crystallization(uuid, uuid, tx_type, numeric, date, text, uuid, text, numeric, aum_purpose);
DROP FUNCTION IF EXISTS public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid, aum_purpose);
DROP FUNCTION IF EXISTS public.crystallize_month_end(uuid, date, numeric, uuid);
DROP FUNCTION IF EXISTS public.ensure_preflow_aum(uuid, numeric, date, uuid);
DROP FUNCTION IF EXISTS public.get_existing_preflow_aum(uuid, date);

-- Note: fund_aum_events table was already dropped in a previous migration.
