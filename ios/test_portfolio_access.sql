-- Test Portfolio Data Access for iOS App
-- This script tests various scenarios to ensure RLS policies work correctly

-- 1. TEST USER CONTEXT SETUP
-- Simulate authenticated user context for testing
-- In a real Supabase environment, these would be set automatically by JWT

-- Test as investor user (h.monoja@protonmail.com)
-- You would run this in Supabase SQL Editor with actual user session

-- 2. BASIC DATA AVAILABILITY TEST
-- Check if basic tables exist and have data
SELECT 'Data Availability Check' as test_name;

SELECT
    'profiles' as table_name,
    COUNT(*) as record_count,
    COUNT(CASE WHEN role = 'investor' THEN 1 END) as investors,
    COUNT(CASE WHEN role = 'admin' THEN 1 END) as admins
FROM public.profiles;

SELECT
    'portfolios' as table_name,
    COUNT(*) as record_count
FROM public.portfolios;

SELECT
    'positions' as table_name,
    COUNT(*) as record_count
FROM public.positions;

-- 3. TEST SPECIFIC QUERIES USED BY iOS APP
-- These mirror the queries in PortfolioServiceWrapper.swift

SELECT 'Portfolio Query Test' as test_name;

-- Test the main portfolio query (line 37-42 in PortfolioServiceWrapper.swift)
-- This simulates: supabase.from("portfolios").select().eq("investor_id", userId).single()
SELECT
    id,
    investor_id,
    total_value,
    total_cost,
    total_gain,
    total_gain_percent,
    day_change,
    day_change_percent,
    week_change,
    week_change_percent,
    month_change,
    month_change_percent,
    year_change,
    year_change_percent,
    last_updated
FROM public.portfolios
WHERE investor_id = (
    SELECT id FROM auth.users WHERE email = 'h.monoja@protonmail.com'
)
LIMIT 1;

-- Test positions query (line 51-55 in PortfolioServiceWrapper.swift)
-- This simulates: supabase.from("positions").select().eq("portfolio_id", portfolioId)
SELECT
    p.id,
    p.portfolio_id,
    p.asset_symbol,
    p.asset_name,
    p.quantity,
    p.average_cost,
    p.current_price,
    p.market_value,
    p.total_gain,
    p.total_gain_percent,
    p.day_change,
    p.day_change_percent,
    p.allocation
FROM public.positions p
INNER JOIN public.portfolios pf ON pf.id = p.portfolio_id
WHERE pf.investor_id = (
    SELECT id FROM auth.users WHERE email = 'h.monoja@protonmail.com'
);

-- 4. TEST PERFORMANCE HISTORY QUERY
-- This simulates the query in lines 98-105 of PortfolioServiceWrapper.swift
SELECT 'Performance History Test' as test_name;

SELECT
    id,
    investor_id,
    date,
    portfolio_value as value,
    daily_return as gain,
    cumulative_return as gain_percent
FROM public.performance_history
WHERE investor_id = (
    SELECT id FROM auth.users WHERE email = 'h.monoja@protonmail.com'
)
AND date >= (CURRENT_DATE - INTERVAL '30 days')
ORDER BY date ASC;

-- 5. TEST ADMIN ACCESS
-- Test that admin users can see all data
SELECT 'Admin Access Test' as test_name;

-- This should work when authenticated as hammadou@Indigo.fund
SELECT
    'admin_portfolio_access' as test_type,
    COUNT(*) as accessible_portfolios
FROM public.portfolios;

-- 6. TEST RLS POLICY EFFECTIVENESS
-- These queries will show if RLS is properly blocking/allowing access
SELECT 'RLS Policy Test' as test_name;

-- Check that RLS is enabled
SELECT
    tablename,
    rowsecurity as rls_enabled
FROM pg_tables
WHERE schemaname = 'public'
AND tablename IN ('portfolios', 'positions', 'profiles', 'performance_history');

-- 7. TEST ERROR SCENARIOS
-- These might fail with RLS violations if policies are too restrictive
SELECT 'Error Scenario Tests' as test_name;

-- Test accessing portfolio without proper user context
-- This should return empty results or fail gracefully
SELECT COUNT(*) as should_be_zero_for_wrong_user
FROM public.portfolios
WHERE investor_id = '00000000-0000-0000-0000-000000000000';

-- 8. COMPREHENSIVE JOIN TEST
-- Test the complex query that might be used by the iOS app
SELECT 'Complex Join Test' as test_name;

SELECT
    prof.full_name,
    prof.account_number,
    pf.total_value,
    pf.total_gain_percent,
    pos.asset_symbol,
    pos.market_value,
    pos.allocation
FROM public.profiles prof
INNER JOIN public.portfolios pf ON pf.investor_id = prof.user_id
LEFT JOIN public.positions pos ON pos.portfolio_id = pf.id
WHERE prof.user_id = (
    SELECT id FROM auth.users WHERE email = 'h.monoja@protonmail.com'
);

-- 9. TEST SUPABASE CLIENT SIMULATION
-- Simulate the exact pattern used by Supabase client libraries
SELECT 'Supabase Client Simulation' as test_name;

-- Test with column selection (similar to .select() in Supabase)
SELECT
    json_build_object(
        'id', id,
        'investorId', investor_id,
        'totalValue', total_value,
        'totalCost', total_cost,
        'totalGain', total_gain,
        'totalGainPercent', total_gain_percent,
        'dayChange', day_change,
        'dayChangePercent', day_change_percent,
        'lastUpdated', last_updated
    ) as portfolio_json
FROM public.portfolios
WHERE investor_id = (
    SELECT id FROM auth.users WHERE email = 'h.monoja@protonmail.com'
);

-- 10. DEBUGGING INFORMATION
-- Get useful information for debugging
SELECT 'Debug Information' as test_name;

-- Show current user context (would be different in actual Supabase session)
SELECT
    'current_session' as info_type,
    current_user as current_db_user,
    session_user as session_db_user;

-- Show auth users
SELECT
    'auth_users' as info_type,
    id,
    email,
    created_at,
    last_sign_in_at
FROM auth.users
WHERE email IN ('hammadou@Indigo.fund', 'h.monoja@protonmail.com');

-- Show profiles
SELECT
    'user_profiles' as info_type,
    user_id,
    email,
    full_name,
    role,
    account_number,
    is_active
FROM public.profiles
ORDER BY created_at;

-- 11. FINAL VALIDATION
-- Ensure everything is properly set up
SELECT
    'validation_summary' as test_name,
    (SELECT COUNT(*) FROM public.profiles) as total_profiles,
    (SELECT COUNT(*) FROM public.portfolios) as total_portfolios,
    (SELECT COUNT(*) FROM public.positions) as total_positions,
    (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public') as total_policies;