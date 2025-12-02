-- ========================================
-- DATABASE CLEANUP MIGRATION
-- Date: December 2, 2025
-- Purpose: Remove 54 unused/empty tables to streamline database
-- Time to execute: ~30 seconds
-- ========================================

-- TABLES BEING KEPT (8 essential tables):
-- ✅ audit_log (10111 rows) - Audit logging
-- ✅ investor_monthly_reports (684 rows) - Core report data
-- ✅ investor_emails (29 rows) - Investor email records
-- ✅ profiles (29 rows) - User profiles
-- ✅ investor_positions (36 rows) - Current positions
-- ✅ investors (29 rows) - Investor list
-- ✅ funds (6 rows) - Fund definitions
-- ✅ admin_users (1 row) - Admin users

BEGIN;

-- ==========================================
-- DROP BACKUP TABLES (old snapshots)
-- ==========================================
DROP TABLE IF EXISTS public.assets_backup_20251118 CASCADE;
DROP TABLE IF EXISTS public.investor_monthly_reports_backup_20250106 CASCADE;
DROP TABLE IF EXISTS public.positions_backup_20250106 CASCADE;
DROP TABLE IF EXISTS public.yield_rates_backup_20251118 CASCADE;

-- ==========================================
-- DROP LEGACY/V2 TABLES (replaced or unused)
-- ==========================================
DROP TABLE IF EXISTS public.assets CASCADE;
DROP TABLE IF EXISTS public.assets_v2 CASCADE;
DROP TABLE IF EXISTS public.positions CASCADE;
DROP TABLE IF EXISTS public.portfolios_v2 CASCADE;
DROP TABLE IF EXISTS public.transactions CASCADE;
DROP TABLE IF EXISTS public.transactions_v2 CASCADE;

-- ==========================================
-- DROP EMPTY FEATURE TABLES (never used)
-- ==========================================
DROP TABLE IF EXISTS public.access_logs CASCADE;
DROP TABLE IF EXISTS public.admin_invites CASCADE;
DROP TABLE IF EXISTS public.asset_prices CASCADE;
DROP TABLE IF EXISTS public.balance_adjustments CASCADE;
DROP TABLE IF EXISTS public.crypto_wallets CASCADE;
DROP TABLE IF EXISTS public.daily_aum_entries CASCADE;
DROP TABLE IF EXISTS public.daily_yield_applications CASCADE;
DROP TABLE IF EXISTS public.data_edit_audit CASCADE;
DROP TABLE IF EXISTS public.documents CASCADE;
DROP TABLE IF EXISTS public.email_logs CASCADE;
DROP TABLE IF EXISTS public.fee_calculations CASCADE;
DROP TABLE IF EXISTS public.fees CASCADE;
DROP TABLE IF EXISTS public.fund_configurations CASCADE;
DROP TABLE IF EXISTS public.fund_daily_aum CASCADE;
DROP TABLE IF EXISTS public.fund_fee_history CASCADE;
DROP TABLE IF EXISTS public.generated_reports CASCADE;
DROP TABLE IF EXISTS public.investments CASCADE;
DROP TABLE IF EXISTS public.investor_invites CASCADE;
DROP TABLE IF EXISTS public.monthly_fee_summary CASCADE;
DROP TABLE IF EXISTS public.notification_settings CASCADE;
DROP TABLE IF EXISTS public.notifications CASCADE;
DROP TABLE IF EXISTS public.onboarding_submissions CASCADE;
DROP TABLE IF EXISTS public.platform_fees_collected CASCADE;
DROP TABLE IF EXISTS public.portfolio_members CASCADE;
DROP TABLE IF EXISTS public.portfolio_nav_snapshots CASCADE;
DROP TABLE IF EXISTS public.price_alerts CASCADE;
DROP TABLE IF EXISTS public.rate_limit_events CASCADE;
DROP TABLE IF EXISTS public.rate_limits CASCADE;
DROP TABLE IF EXISTS public.report_access_logs CASCADE;
DROP TABLE IF EXISTS public.report_definitions CASCADE;
DROP TABLE IF EXISTS public.report_schedules CASCADE;
DROP TABLE IF EXISTS public.report_shares CASCADE;
DROP TABLE IF EXISTS public.statements CASCADE;
DROP TABLE IF EXISTS public.system_2fa_policy CASCADE;
DROP TABLE IF EXISTS public.system_config CASCADE;
DROP TABLE IF EXISTS public.user_access_logs_enhanced CASCADE;
DROP TABLE IF EXISTS public.user_sessions CASCADE;
DROP TABLE IF EXISTS public.user_totp_backup_codes CASCADE;
DROP TABLE IF EXISTS public.user_totp_settings CASCADE;
DROP TABLE IF EXISTS public.web_push_subscriptions CASCADE;
DROP TABLE IF EXISTS public.withdrawal_audit_logs CASCADE;
DROP TABLE IF EXISTS public.yield_distribution_log CASCADE;
DROP TABLE IF EXISTS public.yield_settings CASCADE;
DROP TABLE IF EXISTS public.yield_sources CASCADE;

COMMIT;

-- ==========================================
-- VERIFICATION
-- ==========================================
SELECT
  table_name,
  pg_size_pretty(pg_total_relation_size(quote_ident(table_name))) as total_size
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY pg_total_relation_size(quote_ident(table_name)) DESC;
