-- ============================================
-- DATABASE CLEANUP MIGRATION
-- Date: 2025-11-18
-- Purpose: Delete unused tables from old workflow
-- ============================================

BEGIN;

-- ============================================
-- BACKUP: Create backup tables before deletion
-- ============================================

-- Backup yield_rates (has 6 rows of data)
CREATE TABLE IF NOT EXISTS yield_rates_backup_20251118 AS
SELECT * FROM yield_rates;

-- Backup assets (has 6 rows - CRITICAL DATA)
CREATE TABLE IF NOT EXISTS assets_backup_20251118 AS
SELECT * FROM assets;

-- ============================================
-- DELETE EMPTY TABLES (Old Workflow)
-- ============================================

-- 1. Delete deposits table (0 rows)
DROP TABLE IF EXISTS deposits CASCADE;

-- 2. Delete yield_rates table (6 rows - daily rates no longer needed)
DROP TABLE IF EXISTS yield_rates CASCADE;

-- 3. Delete portfolio_history table (0 rows)
DROP TABLE IF EXISTS portfolio_history CASCADE;

-- 4. Delete daily_nav table (0 rows)
DROP TABLE IF EXISTS daily_nav CASCADE;

-- 5. Delete benchmarks table (0 rows)
DROP TABLE IF EXISTS benchmarks CASCADE;

-- 6. Delete reconciliation table (0 rows)
DROP TABLE IF EXISTS reconciliation CASCADE;

-- 7. Delete withdrawal_requests table (0 rows)
DROP TABLE IF EXISTS withdrawal_requests CASCADE;

-- 8. Delete secure_shares table (0 rows)
DROP TABLE IF EXISTS secure_shares CASCADE;

-- 9. Delete bank_accounts table (0 rows)
DROP TABLE IF EXISTS bank_accounts CASCADE;

-- 10. Delete support_tickets table (0 rows - per user request)
DROP TABLE IF EXISTS support_tickets CASCADE;

-- ============================================
-- VERIFICATION: Check remaining tables
-- ============================================

-- This should show only core tables remain
DO $$
DECLARE
  table_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO table_count
  FROM information_schema.tables
  WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE';

  RAISE NOTICE '===========================================';
  RAISE NOTICE 'DATABASE CLEANUP COMPLETE';
  RAISE NOTICE '===========================================';
  RAISE NOTICE 'Remaining tables: %', table_count;
  RAISE NOTICE 'Deleted: 10 empty/unused tables';
  RAISE NOTICE 'Backup created: yield_rates_backup_20251118';
  RAISE NOTICE 'Backup created: assets_backup_20251118';
  RAISE NOTICE '===========================================';
END $$;

COMMIT;

-- ============================================
-- VERIFICATION QUERIES (run after migration)
-- ============================================

-- List all remaining tables
SELECT
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns
   WHERE table_name = t.table_name AND table_schema = 'public') as column_count
FROM information_schema.tables t
WHERE table_schema = 'public'
AND table_type = 'BASE TABLE'
ORDER BY table_name;

-- Show backup tables
SELECT * FROM yield_rates_backup_20251118;
SELECT * FROM assets_backup_20251118;
