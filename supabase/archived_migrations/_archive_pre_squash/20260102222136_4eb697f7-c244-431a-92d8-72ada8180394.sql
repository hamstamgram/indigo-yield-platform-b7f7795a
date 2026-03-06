-- ============================================================================
-- CLEANUP: Remove Unused Tables and Columns
-- ============================================================================

-- Phase 1: Drop Completely Unused Tables (0 data, 0 code usage)
DROP TABLE IF EXISTS public.benchmarks CASCADE;
DROP TABLE IF EXISTS public.balance_adjustments CASCADE;
DROP TABLE IF EXISTS public.fund_fee_history CASCADE;
DROP TABLE IF EXISTS public.excel_import_log CASCADE;
DROP TABLE IF EXISTS public.import_locks CASCADE;
DROP TABLE IF EXISTS public.position_reconciliation_log CASCADE;
DROP TABLE IF EXISTS public.correction_runs CASCADE;
DROP TABLE IF EXISTS public.report_schedules CASCADE;
DROP TABLE IF EXISTS public.report_access_logs CASCADE;
DROP TABLE IF EXISTS public.fund_reporting_month_closures CASCADE;
DROP TABLE IF EXISTS public.onboarding_submissions CASCADE;
DROP TABLE IF EXISTS public.investment_summary CASCADE;
DROP TABLE IF EXISTS public.report_delivery_audit CASCADE;

-- Phase 2: Drop Superseded/Duplicate Tables
DROP TABLE IF EXISTS public.reports CASCADE;
DROP TABLE IF EXISTS public.fees CASCADE;
DROP TABLE IF EXISTS public.deposits CASCADE;
DROP TABLE IF EXISTS public.web_push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.secure_shares CASCADE;
DROP TABLE IF EXISTS public.fund_configurations CASCADE;
DROP TABLE IF EXISTS public.investor_monthly_reports CASCADE;
DROP TABLE IF EXISTS public.fee_calculations CASCADE;

-- Phase 3: Clean Unused Columns from transactions_v2
ALTER TABLE public.transactions_v2 
  DROP COLUMN IF EXISTS external_reference,
  DROP COLUMN IF EXISTS blockchain_tx_id,
  DROP COLUMN IF EXISTS blockchain_network,
  DROP COLUMN IF EXISTS wallet_address,
  DROP COLUMN IF EXISTS bank_reference;