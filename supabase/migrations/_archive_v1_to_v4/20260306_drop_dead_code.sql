-- ==========================================
-- FINAL CLEANUP SCRIPT: DEAD CODE & LEGACY AUM/CRYSTALLIZATION RPCs
-- ==========================================

-- 1. Drop Legacy AUM Snapshot specific triggers and functions
DROP TRIGGER IF EXISTS trg_auto_update_aum_fn_trigger ON transactions_v2;
DROP TRIGGER IF EXISTS trg_auto_update_aum_fn_trigger ON investor_positions;
DROP FUNCTION IF EXISTS public.trg_auto_update_aum_fn CASCADE;
DROP FUNCTION IF EXISTS public.sync_fund_daily_aum_voided_by_profile CASCADE;
DROP FUNCTION IF EXISTS public.prevent_auto_aum_creation CASCADE;
DROP FUNCTION IF EXISTS public.check_aum_exists_for_date CASCADE;
DROP FUNCTION IF EXISTS public.get_transaction_aum CASCADE;

-- 2. Drop legacy crystallization and pnl functions that were replaced by the First Principles Ledger
DROP FUNCTION IF EXISTS public.calculate_unrealized_pnl CASCADE;
DROP FUNCTION IF EXISTS public.ensure_crystallization_date CASCADE;

-- Note: We are deliberately NOT dropping transactions_v2, investor_positions, or yield_distributions.
-- The above CASCADE clauses will only drop dependent views or triggers explicitly tied to these FUNCTIONS.
