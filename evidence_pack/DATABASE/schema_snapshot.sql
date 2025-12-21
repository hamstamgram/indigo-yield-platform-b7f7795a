-- Schema Snapshot Query
-- Run this against Supabase to capture schema structure

-- List all tables with RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables 
WHERE schemaname = 'public'
ORDER BY tablename;

-- List all columns for key tables
SELECT 
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name IN (
    'generated_statements',
    'investor_fund_performance', 
    'transactions_v2',
    'fee_allocations',
    'ib_allocations',
    'investor_positions',
    'profiles'
)
ORDER BY table_name, ordinal_position;
