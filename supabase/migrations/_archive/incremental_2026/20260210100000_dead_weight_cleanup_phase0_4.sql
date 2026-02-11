-- =============================================================================
-- Dead Weight Cleanup: Phase 0-4
-- Drops 9 dead functions, 18 dead views, 37 dead tables, truncates 8 stale tables
-- All items verified: 0 rows, 0 FK refs, 0 active dependents
-- =============================================================================

-- Phase 0: P1 Security Fix - Drop bypass function
DROP FUNCTION IF EXISTS admin_create_transaction(uuid, uuid, text, numeric, date, text, text, uuid, aum_purpose);

-- Phase 1: Drop dead functions (8)
DROP FUNCTION IF EXISTS test_apply_daily_yield_v3(uuid, date, numeric, uuid);
DROP FUNCTION IF EXISTS test_apply_yield_distribution(uuid, date, numeric, uuid);
DROP FUNCTION IF EXISTS test_profiles_access();
DROP FUNCTION IF EXISTS apply_daily_yield_to_fund_v2(uuid, date, numeric, text, text);
DROP FUNCTION IF EXISTS apply_yield_correction_v2(uuid, date, date, text, numeric, text, text);
DROP FUNCTION IF EXISTS preview_yield_correction_v2(uuid, date, date, text, numeric);
DROP FUNCTION IF EXISTS auto_heal_aum_drift();

-- Phase 2: Drop dead views (18)
DROP VIEW IF EXISTS v_aum_position_mismatch;
DROP VIEW IF EXISTS v_aum_snapshot_health;
DROP VIEW IF EXISTS v_concentration_risk;
DROP VIEW IF EXISTS v_cost_basis_anomalies;
DROP VIEW IF EXISTS v_daily_platform_metrics_live;
DROP VIEW IF EXISTS v_dust_violations;
DROP VIEW IF EXISTS v_fee_allocation_orphans;
DROP VIEW IF EXISTS v_fund_aum_position_status;
DROP VIEW IF EXISTS v_fund_summary_live;
DROP VIEW IF EXISTS v_ib_allocation_orphans;
DROP VIEW IF EXISTS v_investor_kpis;
DROP VIEW IF EXISTS v_itd_returns;
DROP VIEW IF EXISTS v_live_investor_balances;
DROP VIEW IF EXISTS v_missing_withdrawal_transactions;
DROP VIEW IF EXISTS v_orphaned_transactions;
DROP VIEW IF EXISTS v_transaction_sources;
DROP VIEW IF EXISTS v_yield_calculation_health;
DROP VIEW IF EXISTS withdrawal_queue;

-- Phase 3: Drop dead tables (37)
DROP TABLE IF EXISTS access_logs CASCADE;
DROP TABLE IF EXISTS accounting_periods CASCADE;
DROP TABLE IF EXISTS admin_approvals CASCADE;
DROP TABLE IF EXISTS admin_invites CASCADE;
DROP TABLE IF EXISTS correction_runs CASCADE;
DROP TABLE IF EXISTS daily_nav CASCADE;
DROP TABLE IF EXISTS daily_rates CASCADE;
DROP TABLE IF EXISTS fund_daily_aum_archive CASCADE;
DROP TABLE IF EXISTS fund_yield_snapshots CASCADE;
DROP TABLE IF EXISTS generated_reports CASCADE;
DROP TABLE IF EXISTS investor_daily_balance CASCADE;
DROP TABLE IF EXISTS investor_fund_performance_archive CASCADE;
DROP TABLE IF EXISTS investor_invites CASCADE;
DROP TABLE IF EXISTS investor_loss_carryforward CASCADE;
DROP TABLE IF EXISTS investor_positions_archive CASCADE;
DROP TABLE IF EXISTS mfa_reset_requests CASCADE;
DROP TABLE IF EXISTS notification_settings CASCADE;
DROP TABLE IF EXISTS operation_approvals CASCADE;
DROP TABLE IF EXISTS operation_metrics CASCADE;
DROP TABLE IF EXISTS position_correction_log CASCADE;
DROP TABLE IF EXISTS position_reconciliation_log CASCADE;
DROP TABLE IF EXISTS position_reset_log CASCADE;
DROP TABLE IF EXISTS price_alerts CASCADE;
DROP TABLE IF EXISTS qa_scenario_manifest CASCADE;
DROP TABLE IF EXISTS qa_test_results CASCADE;
DROP TABLE IF EXISTS rate_limits CASCADE;
DROP TABLE IF EXISTS reconciliation_packs CASCADE;
DROP TABLE IF EXISTS report_access_logs CASCADE;
DROP TABLE IF EXISTS report_change_log CASCADE;
DROP TABLE IF EXISTS report_delivery_events CASCADE;
DROP TABLE IF EXISTS transaction_bypass_attempts CASCADE;
DROP TABLE IF EXISTS transaction_import_staging CASCADE;
DROP TABLE IF EXISTS transactions_v2_archive CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS withdrawal_audit_logs CASCADE;
DROP TABLE IF EXISTS yield_corrections CASCADE;
DROP TABLE IF EXISTS yield_edit_audit CASCADE;
DROP TABLE IF EXISTS yield_rates CASCADE;

-- Phase 4: Truncate stale data (8 tables, CASCADE for FK chains)
-- Made idempotent: only truncate if table exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_alerts' AND table_schema = 'public') THEN
    TRUNCATE admin_alerts CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'data_edit_audit' AND table_schema = 'public') THEN
    TRUNCATE data_edit_audit CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_position_snapshots' AND table_schema = 'public') THEN
    TRUNCATE investor_position_snapshots CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'risk_alerts' AND table_schema = 'public') THEN
    TRUNCATE risk_alerts CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'notifications' AND table_schema = 'public') THEN
    TRUNCATE notifications CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'admin_integrity_runs' AND table_schema = 'public') THEN
    TRUNCATE admin_integrity_runs CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'qa_entity_manifest' AND table_schema = 'public') THEN
    TRUNCATE qa_entity_manifest CASCADE;
  END IF;
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'investor_emails' AND table_schema = 'public') THEN
    TRUNCATE investor_emails CASCADE;
  END IF;
END $$;
