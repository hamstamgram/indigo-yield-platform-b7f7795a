-- ==============================================================================
-- Database Health Check Script
-- Date: 2025-12-08
-- Purpose: Verify V2 architecture integrity after One ID Unification
-- ==============================================================================

\echo '======================================================================'
\echo 'INDIGO YIELD PLATFORM - DATABASE HEALTH CHECK'
\echo 'Architecture: V2 (One ID Unification)'
\echo '======================================================================'
\echo ''

-- ==============================================================================
-- CHECK 1: Verify investors table is dropped
-- ==============================================================================

\echo '1. Verifying investors table is dropped...'
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'investors'
    )
    THEN '❌ FAIL: investors table still exists'
    ELSE '✅ PASS: investors table successfully dropped'
  END as status;
\echo ''

-- ==============================================================================
-- CHECK 2: Verify no broken FK constraints to investors table
-- ==============================================================================

\echo '2. Checking for broken FK constraints...'
SELECT
  COUNT(*) as broken_fk_count,
  CASE
    WHEN COUNT(*) = 0 THEN '✅ PASS: No broken FK constraints'
    ELSE '❌ FAIL: ' || COUNT(*) || ' FK constraints reference dropped investors table'
  END as status
FROM pg_constraint
WHERE confrelid::regclass::text = 'public.investors'
  AND contype = 'f';

-- Show details if any found
SELECT
  conname AS constraint_name,
  conrelid::regclass AS table_name,
  pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE confrelid::regclass::text = 'public.investors'
  AND contype = 'f';
\echo ''

-- ==============================================================================
-- CHECK 3: Verify One ID system - profiles integrity
-- ==============================================================================

\echo '3. Verifying One ID system (profiles.id = auth.user.id)...'
SELECT
  COUNT(*) as total_profiles,
  COUNT(DISTINCT id) as unique_ids,
  COUNT(DISTINCT email) as unique_emails,
  CASE
    WHEN COUNT(*) = COUNT(DISTINCT id) AND COUNT(*) = COUNT(DISTINCT email)
    THEN '✅ PASS: All profiles have unique IDs and emails'
    ELSE '❌ FAIL: Duplicate IDs or emails detected'
  END as status
FROM profiles;
\echo ''

-- ==============================================================================
-- CHECK 4: Verify investor_positions integrity
-- ==============================================================================

\echo '4. Checking investor_positions integrity...'
WITH integrity_check AS (
  SELECT
    COUNT(*) as total_positions,
    COUNT(DISTINCT ip.investor_id) as unique_investors,
    SUM(CASE WHEN p.id IS NULL THEN 1 ELSE 0 END) as orphaned_records,
    SUM(CASE WHEN f.id IS NULL THEN 1 ELSE 0 END) as invalid_funds
  FROM investor_positions ip
  LEFT JOIN profiles p ON ip.investor_id = p.id
  LEFT JOIN funds f ON ip.fund_id = f.id
)
SELECT
  total_positions,
  unique_investors,
  orphaned_records,
  invalid_funds,
  CASE
    WHEN orphaned_records = 0 AND invalid_funds = 0
    THEN '✅ PASS: All positions reference valid profiles and funds'
    ELSE '❌ FAIL: ' || orphaned_records || ' orphaned investor_id, ' || invalid_funds || ' invalid fund_id'
  END as status
FROM integrity_check;
\echo ''

-- ==============================================================================
-- CHECK 5: Verify transactions_v2 integrity
-- ==============================================================================

\echo '5. Checking transactions_v2 integrity...'
WITH integrity_check AS (
  SELECT
    COUNT(*) as total_transactions,
    COUNT(DISTINCT t.investor_id) as unique_investors,
    SUM(CASE WHEN p.id IS NULL THEN 1 ELSE 0 END) as orphaned_records,
    SUM(CASE WHEN f.id IS NULL THEN 1 ELSE 0 END) as invalid_funds
  FROM transactions_v2 t
  LEFT JOIN profiles p ON t.investor_id = p.id
  LEFT JOIN funds f ON t.fund_id = f.id
)
SELECT
  total_transactions,
  unique_investors,
  orphaned_records,
  invalid_funds,
  CASE
    WHEN orphaned_records = 0 AND invalid_funds = 0
    THEN '✅ PASS: All transactions reference valid profiles and funds'
    ELSE '❌ FAIL: ' || orphaned_records || ' orphaned investor_id, ' || invalid_funds || ' invalid fund_id'
  END as status
FROM integrity_check;
\echo ''

-- ==============================================================================
-- CHECK 6: Verify investor_fund_performance column naming
-- ==============================================================================

\echo '6. Checking investor_fund_performance column naming...'
SELECT
  CASE
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'investor_fund_performance'
        AND column_name = 'investor_id'
    )
    THEN '✅ PASS: Uses investor_id (correct)'
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns
      WHERE table_name = 'investor_fund_performance'
        AND column_name = 'user_id'
    )
    THEN '❌ FAIL: Still uses user_id (should be investor_id)'
    ELSE '⚠️ WARNING: investor_fund_performance table not found'
  END as status;
\echo ''

-- ==============================================================================
-- CHECK 7: Verify active funds configuration
-- ==============================================================================

\echo '7. Verifying active funds (canonical IND-* set)...'
SELECT
  COUNT(*) as active_fund_count,
  string_agg(code, ', ' ORDER BY code) as fund_codes,
  CASE
    WHEN COUNT(*) = 6
      AND COUNT(*) FILTER (WHERE code IN ('IND-BTC','IND-ETH','IND-USDT','IND-SOL','IND-XRP','IND-XAUT')) = 6
    THEN '✅ PASS: IND-* funds configured correctly'
    ELSE '❌ FAIL: Expected active funds IND-BTC, IND-ETH, IND-USDT, IND-SOL, IND-XRP, IND-XAUT'
  END as status
FROM funds
WHERE status = 'active';

-- Show fund details
SELECT
  code,
  name,
  asset,
  status,
  inception_date
FROM funds
ORDER BY code;
\echo ''

-- ==============================================================================
-- CHECK 8: Verify RLS is enabled on core tables
-- ==============================================================================

\echo '8. Checking RLS policies...'
WITH rls_check AS (
  SELECT
    tablename,
    rowsecurity
  FROM pg_tables
  WHERE schemaname = 'public'
    AND tablename IN (
      'profiles', 'funds', 'investor_positions',
      'transactions_v2', 'withdrawal_requests',
      'investor_fund_performance'
    )
)
SELECT
  COUNT(*) as total_tables,
  COUNT(*) FILTER (WHERE rowsecurity = true) as rls_enabled,
  CASE
    WHEN COUNT(*) = COUNT(*) FILTER (WHERE rowsecurity = true)
    THEN '✅ PASS: RLS enabled on all core tables'
    ELSE '❌ FAIL: RLS not enabled on ' || (COUNT(*) - COUNT(*) FILTER (WHERE rowsecurity = true)) || ' tables'
  END as status
FROM rls_check;

-- Show details
SELECT
  tablename,
  CASE
    WHEN rowsecurity THEN '✅ Enabled'
    ELSE '❌ Disabled'
  END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'profiles', 'funds', 'investor_positions',
    'transactions_v2', 'withdrawal_requests',
    'investor_fund_performance'
  )
ORDER BY tablename;
\echo ''

-- ==============================================================================
-- CHECK 9: Verify performance indexes exist
-- ==============================================================================

\echo '9. Checking critical performance indexes...'
WITH expected_indexes AS (
  SELECT unnest(ARRAY[
    'idx_investor_positions_current_value',
    'idx_transactions_v2_fund_date',
    'idx_withdrawal_requests_status_date',
    'idx_investor_fund_performance_investor',
    'idx_transactions_v2_investor_type_date',
    'idx_investor_positions_fund_value'
  ]) as index_name
),
existing_indexes AS (
  SELECT indexname
  FROM pg_indexes
  WHERE schemaname = 'public'
)
SELECT
  COUNT(*) as expected_count,
  COUNT(ei.indexname) as existing_count,
  CASE
    WHEN COUNT(*) = COUNT(ei.indexname)
    THEN '✅ PASS: All critical indexes exist'
    ELSE '⚠️ WARNING: ' || (COUNT(*) - COUNT(ei.indexname)) || ' indexes missing'
  END as status
FROM expected_indexes ex
LEFT JOIN existing_indexes ei ON ex.index_name = ei.indexname;

-- Show missing indexes
SELECT
  ex.index_name as missing_index
FROM (
  SELECT unnest(ARRAY[
    'idx_investor_positions_current_value',
    'idx_transactions_v2_fund_date',
    'idx_withdrawal_requests_status_date',
    'idx_investor_fund_performance_investor',
    'idx_transactions_v2_investor_type_date',
    'idx_investor_positions_fund_value'
  ]) as index_name
) ex
LEFT JOIN pg_indexes ei ON ex.index_name = ei.indexname AND ei.schemaname = 'public'
WHERE ei.indexname IS NULL;
\echo ''

-- ==============================================================================
-- CHECK 10: Verify views are using correct tables
-- ==============================================================================

\echo '10. Checking view definitions...'
SELECT
  viewname,
  CASE
    WHEN definition LIKE '%public.investors%'
    THEN '❌ FAIL: References dropped investors table'
    ELSE '✅ PASS: Uses profiles table'
  END as status
FROM pg_views
WHERE schemaname = 'public'
  AND viewname IN (
    'v_investor_kpis',
    'withdrawal_queue',
    'v_live_investor_balances'
  )
ORDER BY viewname;
\echo ''

-- ==============================================================================
-- CHECK 11: Data volume summary
-- ==============================================================================

\echo '11. Database statistics...'
SELECT
  'profiles' as table_name,
  COUNT(*) as record_count,
  COUNT(*) FILTER (WHERE is_admin = true) as admin_count,
  COUNT(*) FILTER (WHERE is_admin = false) as investor_count
FROM profiles
UNION ALL
SELECT
  'funds',
  COUNT(*),
  COUNT(*) FILTER (WHERE status = 'active'),
  COUNT(*) FILTER (WHERE status != 'active')
FROM funds
UNION ALL
SELECT
  'investor_positions',
  COUNT(*),
  COUNT(DISTINCT investor_id),
  COUNT(DISTINCT fund_id)
FROM investor_positions
UNION ALL
SELECT
  'transactions_v2',
  COUNT(*),
  COUNT(DISTINCT investor_id),
  COUNT(DISTINCT fund_id)
FROM transactions_v2
ORDER BY table_name;
\echo ''

-- ==============================================================================
-- CHECK 12: AUM Verification (Native Tokens)
-- ==============================================================================

\echo '12. Current AUM by fund (in native tokens)...'
SELECT
  f.code as fund_code,
  f.asset,
  COUNT(DISTINCT ip.investor_id) as investor_count,
  ROUND(SUM(ip.current_value)::numeric, 8) as total_aum,
  CASE
    WHEN SUM(ip.current_value) > 0
    THEN '✅ Active'
    ELSE '⚠️ No AUM'
  END as status
FROM funds f
LEFT JOIN investor_positions ip ON f.id = ip.fund_id
WHERE f.status = 'active'
GROUP BY f.code, f.asset
ORDER BY f.code;
\echo ''

-- ==============================================================================
-- SUMMARY
-- ==============================================================================

\echo '======================================================================'
\echo 'HEALTH CHECK COMPLETE'
\echo '======================================================================'
\echo ''
\echo 'Review the results above. All checks should show ✅ PASS.'
\echo 'Any ❌ FAIL or ⚠️ WARNING requires immediate attention.'
\echo ''
\echo 'Next steps:'
\echo '1. If any critical issues found, run: psql -f supabase/migrations/20251208_post_audit_fixes.sql'
\echo '2. Review DATABASE_AUDIT_REPORT.md for detailed findings'
\echo '3. Update application code to use profiles table instead of investors'
\echo ''
