-- Indigo Yield Platform - Production Database Backup
-- Date: 2025-09-03
-- IMPORTANT: Run this before deployment!

-- Create timestamped backups of all critical tables
CREATE TABLE IF NOT EXISTS profiles_backup_20250903 AS SELECT * FROM profiles;
CREATE TABLE IF NOT EXISTS deposits_backup_20250903 AS SELECT * FROM deposits;
CREATE TABLE IF NOT EXISTS balances_backup_20250903 AS SELECT * FROM balances;
CREATE TABLE IF NOT EXISTS withdrawals_backup_20250903 AS SELECT * FROM withdrawals;
CREATE TABLE IF NOT EXISTS interest_accruals_backup_20250903 AS SELECT * FROM interest_accruals;
CREATE TABLE IF NOT EXISTS withdrawal_requests_backup_20250903 AS SELECT * FROM withdrawal_requests;
CREATE TABLE IF NOT EXISTS documents_backup_20250903 AS SELECT * FROM documents;
CREATE TABLE IF NOT EXISTS yield_settings_backup_20250903 AS SELECT * FROM yield_settings;

-- Verify backups were created
SELECT 
    table_name,
    pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as size,
    (SELECT COUNT(*) FROM information_schema.tables WHERE table_name = t.table_name) as row_count
FROM information_schema.tables t
WHERE table_name LIKE '%_backup_20250903'
ORDER BY table_name;

-- Success message
DO $$
BEGIN
    RAISE NOTICE '✅ Database backup complete! Tables backed up: %', 
        (SELECT COUNT(*) FROM information_schema.tables WHERE table_name LIKE '%_backup_20250903');
END $$;
