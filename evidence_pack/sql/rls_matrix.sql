-- Evidence Pack: RLS Matrix Query
-- Shows all tables with RLS status and all policies

-- 1. All public tables with RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity AS rls_enabled,
    CASE 
        WHEN rowsecurity THEN 'PROTECTED ✓'
        ELSE 'UNPROTECTED ✗'
    END AS status
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;

-- 2. All RLS policies with details
SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd AS command,
    qual AS using_expression,
    with_check AS with_check_expression
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;

-- 3. Summary: Tables without RLS (should be empty or justified)
SELECT 
    tablename,
    'NO RLS - REVIEW REQUIRED' AS warning
FROM pg_tables
WHERE schemaname = 'public'
  AND rowsecurity = false
ORDER BY tablename;

-- 4. Policy count per table
SELECT 
    t.tablename,
    t.rowsecurity AS rls_enabled,
    COALESCE(p.policy_count, 0) AS policy_count
FROM pg_tables t
LEFT JOIN (
    SELECT tablename, COUNT(*) AS policy_count
    FROM pg_policies
    WHERE schemaname = 'public'
    GROUP BY tablename
) p ON t.tablename = p.tablename
WHERE t.schemaname = 'public'
ORDER BY t.tablename;
