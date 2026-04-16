-- Database Schema Purge: V4 Crystallization Framework Removal
-- TARGET: Supabase Postgres
-- Safety: Enclosed in a single transaction block

BEGIN;

-- 1. Drop Legacy Views
-- These views power the old dashboard analytics that rely on crystallization mechanics
DROP VIEW IF EXISTS public.v_crystallization_dashboard CASCADE;
DROP VIEW IF EXISTS public.v_crystallization_gaps CASCADE;

-- 2. Drop Legacy Tables
-- The old periodic boundary table
DROP TABLE IF EXISTS public.fund_yield_crystallizations CASCADE;

-- 3. Drop Legacy Columns
-- Remove the V4 crystallization timestamp tracker from active investor positions
ALTER TABLE public.investor_positions
  DROP COLUMN IF EXISTS last_yield_crystallization_date;

-- 4. Drop Legacy Triggers & Trigger Functions
-- Dropping the functions with CASCADE will automatically drop the associated triggers on matching tables
DROP FUNCTION IF EXISTS public.trg_auto_update_aum_fn() CASCADE;
DROP FUNCTION IF EXISTS public.trg_auto_recompute_position_fn() CASCADE;

-- 5. Drop Legacy RPC Functions (Overloaded variants handled by omitted arguments if necessary, but we specify for safety)
DROP FUNCTION IF EXISTS public.find_or_create_crystallization_period(uuid, date) CASCADE;
DROP FUNCTION IF EXISTS public.find_or_create_crystallization_period(uuid, timestamp with time zone) CASCADE;
DROP FUNCTION IF EXISTS public.initialize_null_crystallization_dates() CASCADE;

COMMIT;
