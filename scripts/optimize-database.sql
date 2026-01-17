-- ==============================================================================
-- Database Optimization Script (Corrected for Remote Execution)
-- Purpose: Create missing performance indexes and update statistics
-- ==============================================================================
\ echo 'Starting Database Optimization...' -- 0. Ensure extensions exist
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE EXTENSION IF NOT EXISTS btree_gin;
-- 1. Create missing indexes identified in health check
-- ==============================================================================
\ echo 'Creating performance indexes...' CREATE INDEX IF NOT EXISTS idx_investor_positions_current_value ON investor_positions(current_value);
-- transactions_v2 uses created_at by default in Supabase, but let's check
CREATE INDEX IF NOT EXISTS idx_transactions_v2_fund_date ON transactions_v2(fund_id, created_at);
-- withdrawal_requests uses request_date, not created_at
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status_request_date ON withdrawal_requests(status, request_date);
CREATE INDEX IF NOT EXISTS idx_investor_fund_performance_investor ON investor_fund_performance(investor_id);
CREATE INDEX IF NOT EXISTS idx_transactions_v2_investor_type_date ON transactions_v2(investor_id, type, created_at);
CREATE INDEX IF NOT EXISTS idx_investor_positions_fund_value ON investor_positions(fund_id, current_value);
-- 2. Optimize specific frequent query patterns
-- ==============================================================================
-- Index for searching profiles by email (often used in auth/admin)
-- Requires pg_trgm extension
CREATE INDEX IF NOT EXISTS idx_profiles_email_trgm ON profiles USING gin (email gin_trgm_ops);
-- Index for transactions by type (filtering)
CREATE INDEX IF NOT EXISTS idx_transactions_v2_type ON transactions_v2(type);
-- 3. Maintenance statistics
-- ==============================================================================
\ echo 'Updating database statistics (VACUUM ANALYZE)...' -- VACUUM cannot run inside a transaction block which might be enforced by some poolers
-- But we will try. If it fails, users should run it via Supabase Dashboard SQL Editor
VACUUM ANALYZE profiles;
VACUUM ANALYZE funds;
VACUUM ANALYZE investor_positions;
VACUUM ANALYZE transactions_v2;
VACUUM ANALYZE withdrawal_requests;
VACUUM ANALYZE investor_fund_performance;
\ echo 'Check for bloat...' -- pg_stat_user_tables is standard
SELECT schemaname,
    relname as tablename,
    n_dead_tup,
    last_vacuum,
    last_autovacuum
FROM pg_stat_user_tables
ORDER BY n_dead_tup DESC
LIMIT 10;
\ echo 'Optimization complete.'