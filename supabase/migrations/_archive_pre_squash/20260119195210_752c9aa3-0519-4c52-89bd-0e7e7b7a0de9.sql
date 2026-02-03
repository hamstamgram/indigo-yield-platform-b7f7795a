-- Drop deprecated materialized views (Real-Time Architecture Upgrade)
-- These are replaced by live views: v_fund_summary_live, v_daily_platform_metrics_live
-- The live views compute metrics on-read rather than requiring manual refresh

DROP MATERIALIZED VIEW IF EXISTS mv_fund_summary CASCADE;
DROP MATERIALIZED VIEW IF EXISTS mv_daily_platform_metrics CASCADE;

-- Document the replacement views
COMMENT ON VIEW v_fund_summary_live IS 'Real-time fund summary metrics (replaces mv_fund_summary). Computes on-read.';
COMMENT ON VIEW v_daily_platform_metrics_live IS 'Real-time platform metrics (replaces mv_daily_platform_metrics). Computes on-read.';