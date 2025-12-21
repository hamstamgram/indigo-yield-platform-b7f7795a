-- RLS Policies Full Query
-- Extract all RLS policies from pg_policies

SELECT 
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual as using_clause,
    with_check as check_clause
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
