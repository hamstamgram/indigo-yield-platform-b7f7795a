-- ============================================
-- Database Performance Optimization Script
-- Indigo Yield Platform
-- ============================================

-- Enable timing to measure query performance
\timing on

-- ============================================
-- 1. PERFORMANCE INDEXES
-- ============================================

-- User and Profile Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_user_id
ON user_profiles(user_id)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_profiles_email
ON user_profiles(email)
WHERE deleted_at IS NULL;

-- Portfolio Company Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_companies_user
ON portfolio_companies(user_profile_id)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_companies_status
ON portfolio_companies(status)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_companies_user_status
ON portfolio_companies(user_profile_id, status)
WHERE deleted_at IS NULL;

-- Yield Rate Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yield_rates_company_date
ON yield_rates(company_id, effective_date DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yield_rates_company_status
ON yield_rates(company_id, status)
WHERE status = 'active';

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yield_rates_date_range
ON yield_rates(effective_date)
WHERE deleted_at IS NULL;

-- Transaction Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_user_date
ON transactions(user_profile_id, created_at DESC)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_company
ON transactions(company_id, transaction_date DESC)
WHERE deleted_at IS NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transactions_type
ON transactions(transaction_type)
WHERE deleted_at IS NULL;

-- Audit Log Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_entity
ON audit_logs(entity_type, entity_id, created_at DESC);

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_audit_logs_user_action
ON audit_logs(user_id, action, created_at DESC);

-- ============================================
-- 2. COMPOSITE INDEXES FOR COMPLEX QUERIES
-- ============================================

-- Portfolio Performance Composite Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_performance
ON portfolio_companies(user_profile_id, status)
INCLUDE (company_name, current_value, total_invested)
WHERE deleted_at IS NULL;

-- Yield Calculation Composite Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_yield_calculation
ON yield_rates(company_id, effective_date DESC)
INCLUDE (rate, calculation_method)
WHERE status = 'active' AND deleted_at IS NULL;

-- Transaction Summary Composite Index
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_transaction_summary
ON transactions(user_profile_id, transaction_date DESC)
INCLUDE (amount, transaction_type)
WHERE deleted_at IS NULL;

-- ============================================
-- 3. JSONB GIN INDEXES
-- ============================================

-- Metadata JSONB Indexes
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_portfolio_metadata_gin
ON portfolio_companies USING GIN (metadata)
WHERE metadata IS NOT NULL;

CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_settings_gin
ON user_profiles USING GIN (settings)
WHERE settings IS NOT NULL;

-- ============================================
-- 4. PARTIAL INDEXES FOR COMMON FILTERS
-- ============================================

-- Active Portfolio Companies
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_active_portfolio
ON portfolio_companies(user_profile_id, company_name)
WHERE status = 'active' AND deleted_at IS NULL;

-- Recent Transactions (last 90 days)
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_recent_transactions
ON transactions(user_profile_id, created_at DESC)
WHERE created_at > CURRENT_DATE - INTERVAL '90 days'
  AND deleted_at IS NULL;

-- High Value Portfolio Items
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_high_value_portfolio
ON portfolio_companies(user_profile_id, current_value DESC)
WHERE current_value > 100000
  AND deleted_at IS NULL;

-- ============================================
-- 5. QUERY OPTIMIZATION VIEWS
-- ============================================

-- Portfolio Summary View
CREATE OR REPLACE VIEW v_portfolio_summary AS
SELECT
  pc.user_profile_id,
  COUNT(DISTINCT pc.id) as total_companies,
  SUM(pc.total_invested) as total_invested,
  SUM(pc.current_value) as current_value,
  SUM(pc.current_value - pc.total_invested) as total_returns,
  AVG(yr.rate) as avg_yield_rate
FROM portfolio_companies pc
LEFT JOIN LATERAL (
  SELECT rate
  FROM yield_rates
  WHERE company_id = pc.id
    AND status = 'active'
    AND deleted_at IS NULL
  ORDER BY effective_date DESC
  LIMIT 1
) yr ON true
WHERE pc.deleted_at IS NULL
  AND pc.status = 'active'
GROUP BY pc.user_profile_id;

-- Monthly Yield Aggregation View
CREATE OR REPLACE VIEW v_monthly_yields AS
SELECT
  company_id,
  DATE_TRUNC('month', effective_date) as month,
  AVG(rate) as avg_rate,
  MIN(rate) as min_rate,
  MAX(rate) as max_rate,
  COUNT(*) as data_points
FROM yield_rates
WHERE deleted_at IS NULL
  AND status = 'active'
GROUP BY company_id, DATE_TRUNC('month', effective_date);

-- ============================================
-- 6. MATERIALIZED VIEWS FOR HEAVY QUERIES
-- ============================================

-- User Dashboard Stats (refresh hourly)
CREATE MATERIALIZED VIEW IF NOT EXISTS mv_user_dashboard_stats AS
SELECT
  up.id as user_profile_id,
  up.full_name,
  COUNT(DISTINCT pc.id) as portfolio_count,
  SUM(pc.current_value) as total_portfolio_value,
  SUM(pc.total_invested) as total_invested_amount,
  COUNT(DISTINCT t.id) as transaction_count,
  MAX(t.transaction_date) as last_transaction_date,
  NOW() as last_refreshed
FROM user_profiles up
LEFT JOIN portfolio_companies pc ON pc.user_profile_id = up.id
  AND pc.deleted_at IS NULL
  AND pc.status = 'active'
LEFT JOIN transactions t ON t.user_profile_id = up.id
  AND t.deleted_at IS NULL
WHERE up.deleted_at IS NULL
GROUP BY up.id, up.full_name;

-- Create index on materialized view
CREATE UNIQUE INDEX IF NOT EXISTS idx_mv_user_dashboard_stats_user
ON mv_user_dashboard_stats(user_profile_id);

-- ============================================
-- 7. FUNCTION INDEXES
-- ============================================

-- Index on calculated yield percentage
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_calculated_yield
ON portfolio_companies((
  CASE
    WHEN total_invested > 0 THEN
      ((current_value - total_invested) / total_invested * 100)
    ELSE 0
  END
)) WHERE deleted_at IS NULL;

-- Index on full name search
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_user_fullname_search
ON user_profiles(LOWER(full_name) text_pattern_ops)
WHERE deleted_at IS NULL;

-- ============================================
-- 8. QUERY STATISTICS RESET
-- ============================================

-- Reset query statistics for monitoring
SELECT pg_stat_reset();

-- ============================================
-- 9. VACUUM AND ANALYZE
-- ============================================

-- Update table statistics
ANALYZE user_profiles;
ANALYZE portfolio_companies;
ANALYZE yield_rates;
ANALYZE transactions;
ANALYZE audit_logs;

-- Vacuum to reclaim space (run during maintenance window)
-- VACUUM (VERBOSE, ANALYZE) user_profiles;
-- VACUUM (VERBOSE, ANALYZE) portfolio_companies;
-- VACUUM (VERBOSE, ANALYZE) yield_rates;
-- VACUUM (VERBOSE, ANALYZE) transactions;
-- VACUUM (VERBOSE, ANALYZE) audit_logs;

-- ============================================
-- 10. CONNECTION POOLING CONFIGURATION
-- ============================================

-- These settings should be applied at the database level
-- Recommended settings for production:

-- ALTER SYSTEM SET max_connections = 200;
-- ALTER SYSTEM SET shared_buffers = '256MB';
-- ALTER SYSTEM SET effective_cache_size = '1GB';
-- ALTER SYSTEM SET work_mem = '4MB';
-- ALTER SYSTEM SET maintenance_work_mem = '64MB';
-- ALTER SYSTEM SET random_page_cost = 1.1;
-- ALTER SYSTEM SET effective_io_concurrency = 200;
-- ALTER SYSTEM SET wal_buffers = '16MB';
-- ALTER SYSTEM SET checkpoint_completion_target = 0.9;
-- ALTER SYSTEM SET max_wal_size = '2GB';
-- ALTER SYSTEM SET min_wal_size = '1GB';

-- ============================================
-- 11. MONITORING QUERIES
-- ============================================

-- Check index usage
CREATE OR REPLACE VIEW v_index_usage AS
SELECT
  schemaname,
  tablename,
  indexname,
  idx_scan as index_scans,
  idx_tup_read as tuples_read,
  idx_tup_fetch as tuples_fetched,
  pg_size_pretty(pg_relation_size(indexrelid)) as index_size
FROM pg_stat_user_indexes
ORDER BY idx_scan DESC;

-- Check slow queries
CREATE OR REPLACE VIEW v_slow_queries AS
SELECT
  query,
  calls,
  total_time,
  mean_time,
  max_time,
  stddev_time
FROM pg_stat_statements
WHERE mean_time > 100  -- queries slower than 100ms
ORDER BY mean_time DESC
LIMIT 20;

-- Check table bloat
CREATE OR REPLACE VIEW v_table_bloat AS
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
  pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename) - pg_relation_size(schemaname||'.'||tablename)) as index_size,
  ROUND(100 * pg_total_relation_size(schemaname||'.'||tablename) /
    NULLIF(SUM(pg_total_relation_size(schemaname||'.'||tablename)) OVER (), 0), 2) as percentage
FROM pg_tables
WHERE schemaname NOT IN ('pg_catalog', 'information_schema')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- ============================================
-- 12. REFRESH MATERIALIZED VIEW FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION refresh_dashboard_stats()
RETURNS void AS $$
BEGIN
  REFRESH MATERIALIZED VIEW CONCURRENTLY mv_user_dashboard_stats;
END;
$$ LANGUAGE plpgsql;

-- Schedule refresh (requires pg_cron extension)
-- SELECT cron.schedule('refresh-dashboard-stats', '0 * * * *', 'SELECT refresh_dashboard_stats();');

-- ============================================
-- VERIFICATION
-- ============================================

-- List all indexes
SELECT
  schemaname,
  tablename,
  indexname,
  indexdef
FROM pg_indexes
WHERE schemaname = 'public'
ORDER BY tablename, indexname;

-- Check query performance
SELECT
  query,
  calls,
  total_time,
  mean_time,
  min_time,
  max_time
FROM pg_stat_statements
WHERE query NOT LIKE '%pg_stat_statements%'
ORDER BY mean_time DESC
LIMIT 10;

\echo 'Database optimization complete!'
\echo 'Run VACUUM ANALYZE during maintenance window for best results.'