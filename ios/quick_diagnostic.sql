-- Quick Diagnostic Script for Supabase Database Issues
-- Run this in Supabase SQL Editor to identify problems

-- 1. Check if users exist in auth.users
SELECT
    'AUTH USERS CHECK' as check_type,
    email,
    id,
    created_at,
    email_confirmed_at IS NOT NULL as email_confirmed,
    CASE
        WHEN raw_app_meta_data IS NOT NULL THEN 'Has app metadata'
        ELSE 'No app metadata'
    END as metadata_status
FROM auth.users
WHERE email IN ('hammadou@indigo.fund', 'h.monoja@protonmail.com')
ORDER BY email;

-- 2. Check if profiles table exists and has data
SELECT
    'PROFILES TABLE CHECK' as check_type,
    COUNT(*) as profile_count,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admin_count,
    COUNT(CASE WHEN role = 'investor' THEN 1 END) as investor_count
FROM public.profiles;

-- 3. Check specific user profiles
SELECT
    'USER PROFILES' as check_type,
    email,
    role,
    is_active,
    created_at
FROM public.profiles
WHERE email IN ('hammadou@indigo.fund', 'h.monoja@protonmail.com')
ORDER BY email;

-- 4. Check portfolios table
SELECT
    'PORTFOLIOS CHECK' as check_type,
    COUNT(*) as portfolio_count,
    COALESCE(SUM(total_value), 0) as total_value_sum
FROM public.portfolios;

-- 5. Check if investor has portfolio
SELECT
    'INVESTOR PORTFOLIO' as check_type,
    prof.email,
    port.name,
    port.total_value,
    port.created_at
FROM public.profiles prof
LEFT JOIN public.portfolios port ON port.investor_id = prof.id
WHERE prof.email = 'h.monoja@protonmail.com';

-- 6. Check positions
SELECT
    'POSITIONS CHECK' as check_type,
    COUNT(*) as position_count,
    COUNT(DISTINCT portfolio_id) as portfolios_with_positions
FROM public.positions;

-- 7. Check RLS policies
SELECT
    'RLS POLICIES' as check_type,
    tablename,
    policyname,
    permissive,
    roles
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'portfolios', 'positions', 'transactions', 'daily_yields')
ORDER BY tablename, policyname;

-- 8. Check table permissions
SELECT
    'TABLE PERMISSIONS' as check_type,
    table_name,
    grantee,
    string_agg(privilege_type, ', ') as privileges
FROM information_schema.role_table_grants
WHERE table_schema = 'public'
AND table_name IN ('profiles', 'portfolios', 'positions', 'transactions', 'daily_yields')
AND grantee IN ('authenticated', 'anon', 'service_role')
GROUP BY table_name, grantee
ORDER BY table_name, grantee;

-- 9. Test data access for specific user (simulate iOS app query)
-- This simulates what the iOS app would query
SELECT
    'SIMULATED iOS QUERY' as check_type,
    'Testing portfolio access for h.monoja@protonmail.com' as description;

-- Get user ID for simulation
WITH user_context AS (
    SELECT id as user_id
    FROM auth.users
    WHERE email = 'h.monoja@protonmail.com'
)
-- Simulate portfolio query
SELECT
    'PORTFOLIO QUERY RESULT' as query_type,
    p.name as portfolio_name,
    p.total_value,
    COUNT(pos.id) as position_count
FROM public.portfolios p
LEFT JOIN public.positions pos ON pos.portfolio_id = p.id
CROSS JOIN user_context uc
WHERE p.investor_id = uc.user_id
GROUP BY p.id, p.name, p.total_value;

-- 10. Check if RLS is working correctly
SELECT
    'RLS STATUS CHECK' as check_type,
    schemaname,
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('profiles', 'portfolios', 'positions', 'transactions', 'daily_yields')
ORDER BY tablename;

-- 11. Final recommendations
SELECT
    'DIAGNOSTIC COMPLETE' as status,
    'Check results above for issues. Common problems:' as message
UNION ALL
SELECT
    'RECOMMENDATION' as status,
    '1. If no profiles exist, users need to be inserted into profiles table' as message
UNION ALL
SELECT
    'RECOMMENDATION' as status,
    '2. If RLS policies are missing, they need to be created' as message
UNION ALL
SELECT
    'RECOMMENDATION' as status,
    '3. If no portfolio exists for investor, create test data' as message
UNION ALL
SELECT
    'RECOMMENDATION' as status,
    '4. If permissions are missing, grant SELECT to authenticated role' as message;