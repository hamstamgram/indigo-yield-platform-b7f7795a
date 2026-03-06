-- Phase 2B Cleanup: Drop deprecated tables
-- These tables are empty and have no frontend references after code updates

-- 1. Drop yield_settings (deprecated - returns empty in getCurrentYieldRates)
DROP TABLE IF EXISTS public.yield_settings CASCADE;

-- 2. Drop portfolio_history (deprecated - returns empty in getPortfolioPerformanceHistory)
DROP TABLE IF EXISTS public.portfolio_history CASCADE;

-- 3. Drop report_definitions (deprecated - returns empty in getReportDefinitions)
DROP TABLE IF EXISTS public.report_definitions CASCADE;

-- 4. Drop email_logs (replaced by statement_email_delivery)
DROP TABLE IF EXISTS public.email_logs CASCADE;