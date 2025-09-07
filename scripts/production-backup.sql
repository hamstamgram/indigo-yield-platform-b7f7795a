-- Production Database Backup Script
-- Run this in Supabase SQL Editor before deployment
-- Date: 2025-09-05

-- Create backup schema if it doesn't exist
CREATE SCHEMA IF NOT EXISTS backup_20250905;

-- Backup core tables (only if they exist)
DO $$ 
BEGIN
    -- Backup profiles table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') THEN
        CREATE TABLE backup_20250905.profiles AS SELECT * FROM public.profiles;
        RAISE NOTICE 'Backed up profiles table';
    END IF;
    
    -- Backup deposits table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'deposits') THEN
        CREATE TABLE backup_20250905.deposits AS SELECT * FROM public.deposits;
        RAISE NOTICE 'Backed up deposits table';
    END IF;
    
    -- Backup withdrawals table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawals') THEN
        CREATE TABLE backup_20250905.withdrawals AS SELECT * FROM public.withdrawals;
        RAISE NOTICE 'Backed up withdrawals table';
    END IF;
    
    -- Backup withdrawal_requests table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'withdrawal_requests') THEN
        CREATE TABLE backup_20250905.withdrawal_requests AS SELECT * FROM public.withdrawal_requests;
        RAISE NOTICE 'Backed up withdrawal_requests table';
    END IF;
    
    -- Backup interests table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'interests') THEN
        CREATE TABLE backup_20250905.interests AS SELECT * FROM public.interests;
        RAISE NOTICE 'Backed up interests table';
    END IF;
    
    -- Backup statements table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'statements') THEN
        CREATE TABLE backup_20250905.statements AS SELECT * FROM public.statements;
        RAISE NOTICE 'Backed up statements table';
    END IF;
    
    -- Backup fund_classes table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'fund_classes') THEN
        CREATE TABLE backup_20250905.fund_classes AS SELECT * FROM public.fund_classes;
        RAISE NOTICE 'Backed up fund_classes table';
    END IF;
    
    -- Backup import_cutover_guards table
    IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'import_cutover_guards') THEN
        CREATE TABLE backup_20250905.import_cutover_guards AS SELECT * FROM public.import_cutover_guards;
        RAISE NOTICE 'Backed up import_cutover_guards table';
    END IF;
END $$;

-- Verify backup
SELECT 
    table_name, 
    (SELECT COUNT(*) FROM information_schema.columns WHERE table_schema = 'backup_20250905' AND table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'backup_20250905'
ORDER BY table_name;
