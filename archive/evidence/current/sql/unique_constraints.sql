-- Evidence Pack: Unique Constraints for Report Enforcement
-- Run this against your Supabase database to verify constraints

-- 1. Show unique constraint on generated_statements (investor_id, period_id)
SELECT 
    tc.constraint_name,
    tc.table_name,
    kcu.column_name,
    tc.constraint_type
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu 
    ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_name = 'generated_statements'
  AND tc.constraint_type = 'UNIQUE'
ORDER BY tc.constraint_name, kcu.ordinal_position;

-- 2. Show all indexes on generated_statements
SELECT 
    indexname,
    indexdef
FROM pg_indexes
WHERE tablename = 'generated_statements';

-- 3. Verify constraint exists for one-report-per-period
SELECT 
    conname AS constraint_name,
    pg_get_constraintdef(oid) AS constraint_definition
FROM pg_constraint
WHERE conrelid = 'generated_statements'::regclass
  AND contype = 'u';

-- 4. Test constraint by attempting duplicate insert (should fail)
-- DO NOT RUN IN PRODUCTION - FOR TESTING ONLY
/*
INSERT INTO generated_statements (investor_id, period_id, user_id, html_content, fund_names, generated_by)
VALUES (
    '00000000-0000-0000-0000-000000000001', -- test investor
    '00000000-0000-0000-0000-000000000001', -- test period
    '00000000-0000-0000-0000-000000000001', -- test user
    '<html>test</html>',
    ARRAY['BTC'],
    '00000000-0000-0000-0000-000000000001'
);

-- Second insert with same investor_id + period_id should fail
INSERT INTO generated_statements (investor_id, period_id, user_id, html_content, fund_names, generated_by)
VALUES (
    '00000000-0000-0000-0000-000000000001', -- same investor
    '00000000-0000-0000-0000-000000000001', -- same period
    '00000000-0000-0000-0000-000000000001',
    '<html>test 2</html>',
    ARRAY['BTC'],
    '00000000-0000-0000-0000-000000000001'
);
-- Expected error: duplicate key value violates unique constraint "unique_investor_period"
*/
