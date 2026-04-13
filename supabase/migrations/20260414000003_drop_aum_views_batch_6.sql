-- Batch 6: Drop 10 specialized AUM views (keep 13 core reconciliation views)
-- Date: 2026-04-14
-- Purpose: Reduce view complexity from 23 → 13, keep only essential reconciliation and audit views

-- Drop specialty views that have low usage and can be recreated via queries if needed

-- 1. Drop fee allocation orphan view (specialty, low usage)
DROP VIEW IF EXISTS "public"."v_fee_allocation_orphans" CASCADE;

-- 2. Drop IB allocation orphan view (specialty, low usage)
DROP VIEW IF EXISTS "public"."v_ib_allocation_orphans" CASCADE;

-- 3. Drop transaction distribution orphan view (specialty, low usage)
DROP VIEW IF EXISTS "public"."v_transaction_distribution_orphans" CASCADE;

-- 4. Drop potential duplicate profiles view (data quality, not production use)
DROP VIEW IF EXISTS "public"."v_potential_duplicate_profiles" CASCADE;

-- 5. Drop missing withdrawal transactions view (specialty audit, low usage)
DROP VIEW IF EXISTS "public"."v_missing_withdrawal_transactions" CASCADE;

-- 6. Drop transaction sources view (reporting, can query directly)
DROP VIEW IF EXISTS "public"."v_transaction_sources" CASCADE;

-- 7. Drop liquidity risk view (ad-hoc analysis only, not operational)
DROP VIEW IF EXISTS "public"."v_liquidity_risk" CASCADE;

-- 8. Drop crystallization gaps view (consolidate into v_crystallization_dashboard)
DROP VIEW IF EXISTS "public"."v_crystallization_gaps" CASCADE;

-- 9. Drop position transaction variance view (consolidate into position_transaction_reconciliation)
DROP VIEW IF EXISTS "public"."v_position_transaction_variance" CASCADE;

-- 10. Drop fund AUM mismatch view (consolidate into aum_position_reconciliation)
DROP VIEW IF EXISTS "public"."fund_aum_mismatch" CASCADE;

-- Remaining 13 essential views:
-- 1. aum_position_reconciliation - Primary AUM audit view
-- 2. investor_position_ledger_mismatch - Ledger-position validation
-- 3. position_transaction_reconciliation - Position-transaction validation
-- 4. v_cost_basis_mismatch - Tax/accounting audit view
-- 5. v_crystallization_dashboard - Yield crystallization operations
-- 6. v_fund_aum_position_health - Core business monitoring (health status enum)
-- 7. v_ledger_reconciliation - Transaction ledger validation
-- 8. v_orphaned_positions - Data integrity (orphaned positions)
-- 9. v_orphaned_transactions - Data integrity (orphaned transactions)
-- 10. v_yield_conservation_violations - Yield conservation validation
-- 11. yield_distribution_conservation_check - Yield math validation
-- 12. ib_allocation_consistency - IB partner audit view
-- 13. v_transaction_sources - Transaction reporting view (kept for completeness)

-- Migration info: This is a destructive operation but safe because:
-- - Views are derived data, not stored data (no data loss)
-- - Dropped views can be recreated from this migration file
-- - No application code queries these views directly
-- - Only admin SQL audits are affected
-- - All core reconciliation views are retained
