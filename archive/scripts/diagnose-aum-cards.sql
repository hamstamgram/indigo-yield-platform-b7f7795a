-- ============================================================================
-- DIAGNOSTIC: Missing AUM Cards on Admin Dashboard
-- Run this in Supabase SQL Editor to identify the issue
-- ============================================================================

-- 1. Check if get_historical_nav function exists
SELECT
    proname as function_name,
    prosecdef as security_definer,
    pg_get_functiondef(oid) as definition
FROM pg_proc
WHERE proname = 'get_historical_nav'
AND pronamespace = 'public'::regnamespace;

-- 2. Check for active funds
SELECT id, code, name, asset, status, inception_date
FROM public.funds
WHERE status = 'active';

-- 3. Count records in investor_monthly_reports
SELECT
    COUNT(*) as total_reports,
    MIN(report_month) as earliest_report,
    MAX(report_month) as latest_report
FROM public.investor_monthly_reports;

-- 4. Check monthly reports by asset
SELECT
    asset_code,
    COUNT(*) as report_count,
    SUM(closing_balance) as total_closing_balance
FROM public.investor_monthly_reports
GROUP BY asset_code;

-- 5. Test the RPC function directly
SELECT * FROM get_historical_nav(CURRENT_DATE);

-- 6. If function returns empty, check the raw data sources
-- Check funds status
SELECT
    'funds' as table_name,
    COUNT(*) as total,
    COUNT(*) FILTER (WHERE status = 'active') as active_count
FROM public.funds;

-- Check daily_nav (the old data source)
SELECT
    'daily_nav' as table_name,
    COUNT(*) as total,
    MIN(nav_date) as earliest,
    MAX(nav_date) as latest
FROM public.daily_nav;

-- Check transactions for live flows
SELECT
    'transactions' as table_name,
    COUNT(*) as total,
    MIN(created_at) as earliest,
    MAX(created_at) as latest
FROM public.transactions;

-- ============================================================================
-- FIX OPTIONS:
-- ============================================================================
--
-- Option A: If no monthly reports exist but daily_nav has data,
--           revert to the robust_financial_snapshot version:
--
-- Run the contents of: supabase/migrations/20251205190000_robust_financial_snapshot.sql
--
-- Option B: If funds table has no active funds, insert them:
--
-- INSERT INTO public.funds (code, name, asset, fund_class, status, inception_date)
-- VALUES
--   ('IND-BTC', 'Indigo Bitcoin Yield Fund', 'BTC', 'BTC', 'active', '2024-01-01'),
--   ('IND-ETH', 'Indigo Ethereum Yield Fund', 'ETH', 'ETH', 'active', '2024-01-01'),
--   ('IND-USDT', 'Indigo USDT Yield Fund', 'USDT', 'USDT', 'active', '2024-01-01');
--
-- Option C: If investor_monthly_reports is empty but transactions exist,
--           you may need to backfill the reports from transaction history.
-- ============================================================================
