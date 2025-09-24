-- Database Diagnosis for Indigo Yield Platform
-- Analyzing RLS policies, table structure, and permissions
-- Issue: iOS app can authenticate but cannot load portfolio data

-- 1. CHECK DATABASE STRUCTURE
-- List all tables related to portfolios and investments
SELECT schemaname, tablename, tableowner
FROM pg_tables
WHERE schemaname = 'public'
AND tablename LIKE '%portfolio%'
OR tablename LIKE '%investor%'
OR tablename LIKE '%position%'
ORDER BY tablename;

-- Check if key tables exist
SELECT
    'portfolios' as table_name,
    EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portfolios') as exists
UNION ALL
SELECT
    'positions' as table_name,
    EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'positions') as exists
UNION ALL
SELECT
    'investors' as table_name,
    EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'investors') as exists
UNION ALL
SELECT
    'profiles' as table_name,
    EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'profiles') as exists
UNION ALL
SELECT
    'performance_history' as table_name,
    EXISTS(SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'performance_history') as exists;

-- 2. CHECK TABLE SCHEMAS
-- Portfolios table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'portfolios'
ORDER BY ordinal_position;

-- Positions table structure
SELECT
    column_name,
    data_type,
    is_nullable,
    column_default
FROM information_schema.columns
WHERE table_schema = 'public'
AND table_name = 'positions'
ORDER BY ordinal_position;

-- 3. CHECK ROW LEVEL SECURITY (RLS)
-- Check if RLS is enabled on critical tables
SELECT
    schemaname,
    tablename,
    rowsecurity as rls_enabled,
    rowsecurity::text as rls_status
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('portfolios', 'positions', 'investors', 'profiles', 'performance_history')
ORDER BY tablename;

-- 4. ANALYZE RLS POLICIES
-- Get all RLS policies for portfolio-related tables
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('portfolios', 'positions', 'investors', 'profiles', 'performance_history')
ORDER BY tablename, policyname;

-- 5. CHECK USER ROLES AND PERMISSIONS
-- Check database roles
SELECT rolname, rolsuper, rolinherit, rolcreaterole, rolcreatedb, rolcanlogin, rolreplication
FROM pg_roles
WHERE rolname IN ('postgres', 'authenticated', 'anon', 'service_role')
ORDER BY rolname;

-- Check table permissions for authenticated role
SELECT
    grantee,
    table_schema,
    table_name,
    privilege_type
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('portfolios', 'positions', 'investors', 'profiles', 'performance_history')
AND grantee IN ('authenticated', 'anon', 'public')
ORDER BY table_name, grantee;

-- 6. CHECK AUTH SCHEMA
-- Check auth.users table structure (limited access)
SELECT column_name, data_type
FROM information_schema.columns
WHERE table_schema = 'auth'
AND table_name = 'users'
ORDER BY ordinal_position;

-- 7. TEST DATA EXISTENCE
-- Check if there's actual data in key tables
SELECT
    'portfolios' as table_name,
    count(*) as record_count
FROM portfolios
UNION ALL
SELECT
    'positions' as table_name,
    count(*) as record_count
FROM positions
UNION ALL
SELECT
    'profiles' as table_name,
    count(*) as record_count
FROM profiles
WHERE true; -- This will show if RLS blocks the query

-- 8. CHECK SPECIFIC USER DATA
-- Try to find data for known test users
-- Replace with actual UUIDs when available
SELECT
    'Test query for auth.users access' as description,
    id,
    email,
    created_at
FROM auth.users
WHERE email IN ('hammadou@Indigo.fund', 'h.monoja@protonmail.com')
LIMIT 5;

-- 9. RLS POLICY ANALYSIS
-- Get detailed policy definitions for portfolios table
SELECT
    'Policy Analysis for portfolios table' as description,
    policyname,
    cmd as command,
    permissive,
    qual as using_expression,
    with_check as check_expression
FROM pg_policies
WHERE schemaname = 'public' AND tablename = 'portfolios';

-- 10. FUNCTION PERMISSIONS
-- Check if any functions are used for data access
SELECT
    routine_name,
    routine_type,
    security_type,
    definer_rights
FROM information_schema.routines
WHERE routine_schema = 'public'
AND routine_name LIKE '%portfolio%' OR routine_name LIKE '%investor%'
ORDER BY routine_name;

-- 11. FOREIGN KEY RELATIONSHIPS
-- Check relationships between tables
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name
FROM
    information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
      ON tc.constraint_name = kcu.constraint_name
      AND tc.table_schema = kcu.table_schema
    JOIN information_schema.constraint_column_usage AS ccu
      ON ccu.constraint_name = tc.constraint_name
      AND ccu.table_schema = tc.table_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
AND tc.table_name IN ('portfolios', 'positions', 'investors', 'profiles')
ORDER BY tc.table_name;

-- 12. CHECK JWT TOKEN CLAIMS
-- This would need to be run in context of an authenticated request
-- but shows what claims should be available
SELECT
    'JWT Claims Check' as description,
    current_setting('request.jwt.claims', true) as jwt_claims_raw;