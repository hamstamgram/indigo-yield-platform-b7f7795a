-- Indigo Yield Platform - Safe Database Backup
-- Date: 2025-09-03
-- This script only backs up tables that exist

-- First, let's see what tables we have
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
  AND table_name NOT LIKE '%_backup_%'
ORDER BY table_name;

-- Backup profiles table (critical)
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS profiles_backup_20250903 AS SELECT * FROM profiles';
    RAISE NOTICE '✅ Backed up profiles table';
  ELSE
    RAISE NOTICE '⚠️ Profiles table not found';
  END IF;
END $$;

-- Backup deposits table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deposits') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS deposits_backup_20250903 AS SELECT * FROM deposits';
    RAISE NOTICE '✅ Backed up deposits table';
  ELSE
    RAISE NOTICE '⚠️ Deposits table not found';
  END IF;
END $$;

-- Backup withdrawals table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawals') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS withdrawals_backup_20250903 AS SELECT * FROM withdrawals';
    RAISE NOTICE '✅ Backed up withdrawals table';
  ELSE
    RAISE NOTICE '⚠️ Withdrawals table not found';
  END IF;
END $$;

-- Backup withdrawal_requests table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS withdrawal_requests_backup_20250903 AS SELECT * FROM withdrawal_requests';
    RAISE NOTICE '✅ Backed up withdrawal_requests table';
  ELSE
    RAISE NOTICE '⚠️ Withdrawal_requests table not found';
  END IF;
END $$;

-- Backup interest_accruals table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interest_accruals') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS interest_accruals_backup_20250903 AS SELECT * FROM interest_accruals';
    RAISE NOTICE '✅ Backed up interest_accruals table';
  ELSE
    RAISE NOTICE '⚠️ Interest_accruals table not found';
  END IF;
END $$;

-- Backup documents table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'documents') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS documents_backup_20250903 AS SELECT * FROM documents';
    RAISE NOTICE '✅ Backed up documents table';
  ELSE
    RAISE NOTICE '⚠️ Documents table not found';
  END IF;
END $$;

-- Backup yield_settings table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'yield_settings') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS yield_settings_backup_20250903 AS SELECT * FROM yield_settings';
    RAISE NOTICE '✅ Backed up yield_settings table';
  ELSE
    RAISE NOTICE '⚠️ Yield_settings table not found';
  END IF;
END $$;

-- Backup support_tickets table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'support_tickets') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS support_tickets_backup_20250903 AS SELECT * FROM support_tickets';
    RAISE NOTICE '✅ Backed up support_tickets table';
  ELSE
    RAISE NOTICE '⚠️ Support_tickets table not found';
  END IF;
END $$;

-- Backup balance_adjustments table
DO $$
BEGIN
  IF EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'balance_adjustments') THEN
    EXECUTE 'CREATE TABLE IF NOT EXISTS balance_adjustments_backup_20250903 AS SELECT * FROM balance_adjustments';
    RAISE NOTICE '✅ Backed up balance_adjustments table';
  ELSE
    RAISE NOTICE '⚠️ Balance_adjustments table not found';
  END IF;
END $$;

-- Show backup summary
SELECT 
    table_name as "Backup Table",
    pg_size_pretty(pg_total_relation_size(table_schema||'.'||table_name)) as "Size",
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_name = t.table_name) as "Columns"
FROM information_schema.tables t
WHERE table_name LIKE '%_backup_20250903'
ORDER BY table_name;

-- Final message
DO $$
DECLARE
    backup_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO backup_count
    FROM information_schema.tables 
    WHERE table_name LIKE '%_backup_20250903';
    
    RAISE NOTICE '';
    RAISE NOTICE '✅ DATABASE BACKUP COMPLETE!';
    RAISE NOTICE '📊 Total tables backed up: %', backup_count;
    RAISE NOTICE '📅 Backup date: 2025-09-03';
    RAISE NOTICE '';
    RAISE NOTICE '⚠️ IMPORTANT: These backups will persist until manually deleted.';
    RAISE NOTICE 'To restore: DROP TABLE [table_name]; CREATE TABLE [table_name] AS SELECT * FROM [table_name]_backup_20250903;';
END $$;
