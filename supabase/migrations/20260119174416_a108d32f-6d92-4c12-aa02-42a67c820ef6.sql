-- Phase 5: View Consolidation - Drop Dead Views
-- Verified: No frontend/script usage, no view dependencies, no RLS references

-- Batch 1: Diagnostic/Debug views (never called from frontend)
DROP VIEW IF EXISTS v_security_definer_audit CASCADE;
DROP VIEW IF EXISTS v_adb_verification CASCADE;
DROP VIEW IF EXISTS v_orphaned_user_roles CASCADE;

-- Batch 2: Superseded reconciliation views (replaced by newer versions)
DROP VIEW IF EXISTS position_ledger_reconciliation_v2 CASCADE;
DROP VIEW IF EXISTS v_position_ledger_reconciliation CASCADE;
DROP VIEW IF EXISTS v_ledger_position_mismatches CASCADE;

-- Batch 3: Orphan detection views with no callers
DROP VIEW IF EXISTS v_merge_candidates CASCADE;
DROP VIEW IF EXISTS v_duplicate_transactions CASCADE;
DROP VIEW IF EXISTS v_missing_withdrawal_transactions CASCADE;
DROP VIEW IF EXISTS v_orphaned_transactions CASCADE;
DROP VIEW IF EXISTS v_ib_allocation_orphans CASCADE;

-- Batch 4: Reporting views with no callers
DROP VIEW IF EXISTS v_aum_purpose_issues CASCADE;
DROP VIEW IF EXISTS v_yield_allocation_violations CASCADE;
DROP VIEW IF EXISTS v_position_crystallization_status CASCADE;
DROP VIEW IF EXISTS platform_fees_collected CASCADE;
DROP VIEW IF EXISTS audit_events_v CASCADE;
DROP VIEW IF EXISTS monthly_fee_summary CASCADE;

-- Document retained views with COMMENT (only existing views)
COMMENT ON VIEW v_live_investor_balances IS 'Investor dashboard: current positions and values per investor';
COMMENT ON VIEW v_crystallization_dashboard IS 'Admin integrity: crystallization gaps requiring action';
COMMENT ON VIEW v_crystallization_gaps IS 'Admin integrity: position yield gaps by days behind';
COMMENT ON VIEW v_ledger_reconciliation IS 'Admin integrity: ledger balance verification';
COMMENT ON VIEW v_pending_approvals IS 'Admin workflow: pending approval items';
COMMENT ON VIEW v_approval_history IS 'Admin workflow: completed approval history';
COMMENT ON VIEW fund_aum_mismatch IS 'Smoke test: AUM vs position sum validation';
COMMENT ON VIEW investor_position_ledger_mismatch IS 'Smoke test: position ledger validation';
COMMENT ON VIEW yield_distribution_conservation_check IS 'Smoke test: yield distribution math validation';
COMMENT ON VIEW v_transaction_distribution_orphans IS 'Smoke test: TX-distribution link issues';
COMMENT ON VIEW v_fee_allocation_orphans IS 'Smoke test: fee allocation orphans';
COMMENT ON VIEW v_position_transaction_variance IS 'Script: position transaction variance analysis';
COMMENT ON VIEW v_transaction_sources IS 'Smoke test: transaction source analysis';
COMMENT ON VIEW v_liquidity_risk IS 'Risk alerts: fund liquidity assessment';
COMMENT ON VIEW v_concentration_risk IS 'Risk alerts: investor concentration analysis';
COMMENT ON VIEW v_potential_duplicate_profiles IS 'Admin: duplicate profile detection';
COMMENT ON VIEW v_orphaned_positions IS 'System admin: positions without valid investors';
COMMENT ON VIEW v_fee_calculation_orphans IS 'System admin: fee calculation orphans';
COMMENT ON VIEW ib_allocation_consistency IS 'Integrity: IB allocation consistency check';
COMMENT ON MATERIALIZED VIEW mv_fund_summary IS 'Materialized: fund aggregate statistics';
COMMENT ON MATERIALIZED VIEW mv_daily_platform_metrics IS 'Materialized: daily platform KPIs';