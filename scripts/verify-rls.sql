-- ============================================
-- RLS VERIFICATION SCRIPT FOR INDIGO YIELD PLATFORM
-- ============================================
-- Purpose: Verify Row-Level Security is properly enabled
-- after applying EMERGENCY_SECURITY_PATCH
--
-- Usage:
--   psql $DATABASE_URL -f scripts/verify-rls.sql
--
-- Expected Results:
--   - All critical tables have RLS enabled
--   - All tables have appropriate RLS policies
--   - Audit log has immutable policies (no UPDATE/DELETE)
--   - No overly permissive policies
-- ============================================

BEGIN;

-- ============================================
-- SECTION 1: CHECK RLS ENABLED ON ALL TABLES
-- ============================================
-- Expected Result: 0 vulnerable tables
--
-- This query checks for tables without RLS protection.
-- Tables in 'public' schema and not system tables.

\echo ''
\echo '=========================================='
\echo 'SECTION 1: RLS ENABLEMENT CHECK'
\echo '=========================================='

SELECT
    COUNT(*) as vulnerable_tables,
    CASE
        WHEN COUNT(*) = 0 THEN '✅ PASS: All tables protected'
        ELSE '❌ FAIL: Unprotected tables found'
    END as status
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '%_id_seq';

-- List vulnerable tables (if any)
\echo ''
\echo 'Vulnerable tables (if any):'
SELECT
    tablename,
    '❌ VULNERABLE' as status
FROM pg_tables
WHERE schemaname = 'public'
  AND NOT rowsecurity
  AND tablename NOT LIKE 'pg_%'
  AND tablename NOT LIKE '%_id_seq'
ORDER BY tablename;

-- ============================================
-- SECTION 2: VERIFY SPECIFIC PROTECTED TABLES
-- ============================================
-- Expected Result: All critical tables show as protected

\echo ''
\echo '=========================================='
\echo 'SECTION 2: CRITICAL TABLES RLS STATUS'
\echo '=========================================='

SELECT
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ Protected'
        ELSE '❌ VULNERABLE'
    END as rls_status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN (
    'investor_emails',
    'email_logs',
    'onboarding_submissions',
    'fee_transactions',
    'generated_statements',
    'audit_log',
    'daily_rates',
    'withdrawal_requests',
    'email_queue',
    'legacy_system_migration',
    'investor_fund_performance',
    'transactions',
    'positions',
    'statements',
    'fees',
    'deposits',
    'rate_limits'
  )
ORDER BY
    CASE WHEN rowsecurity THEN 1 ELSE 0 END,
    tablename;

-- ============================================
-- SECTION 3: POLICY COUNT BY TABLE
-- ============================================
-- Expected Result: >0 policies for each protected table

\echo ''
\echo '=========================================='
\echo 'SECTION 3: POLICY COUNT BY TABLE'
\echo '=========================================='

SELECT
    COALESCE(t.tablename, 'TOTAL') as table_name,
    COUNT(p.policyname) as policy_count,
    STRING_AGG(p.policyname, ', ' ORDER BY p.policyname) as policy_names
FROM pg_tables t
LEFT JOIN pg_policies p ON (
    t.tablename = p.tablename
    AND t.schemaname = p.schemaname
)
WHERE t.schemaname = 'public'
  AND t.tablename IN (
    'investor_emails',
    'email_logs',
    'onboarding_submissions',
    'fee_transactions',
    'generated_statements',
    'audit_log',
    'daily_rates',
    'withdrawal_requests',
    'email_queue',
    'legacy_system_migration',
    'investor_fund_performance',
    'transactions',
    'positions',
    'statements',
    'fees',
    'deposits',
    'rate_limits'
  )
GROUP BY t.tablename WITH ROLLUP
ORDER BY
    CASE WHEN t.tablename IS NULL THEN 1 ELSE 0 END,
    t.tablename;

-- ============================================
-- SECTION 4: VERIFY investor_emails POLICIES
-- ============================================
-- Expected Result: SELECT and INSERT policies for user data

\echo ''
\echo '=========================================='
\echo 'SECTION 4: investor_emails TABLE'
\echo '=========================================='

SELECT
    policyname,
    polcmd as operation,
    CASE
        WHEN polpermissive THEN '⚠️ PERMISSIVE (allows)'
        ELSE '✅ Restrictive (denies)'
    END as policy_type,
    polqual as condition
FROM pg_policies
WHERE tablename = 'investor_emails'
  AND schemaname = 'public'
ORDER BY policyname;

-- Validate investor_emails has required policies
SELECT
    CASE
        WHEN COUNT(*) >= 2 THEN '✅ PASS: investor_emails has required policies'
        ELSE '❌ FAIL: investor_emails missing policies'
    END as validation
FROM pg_policies
WHERE tablename = 'investor_emails'
  AND schemaname = 'public'
  AND policyname IN ('investor_emails_select_own', 'investor_emails_admin_manage');

-- ============================================
-- SECTION 5: VERIFY email_logs POLICIES
-- ============================================
-- Expected Result: SELECT and admin management policies

\echo ''
\echo '=========================================='
\echo 'SECTION 5: email_logs TABLE'
\echo '=========================================='

SELECT
    policyname,
    polcmd as operation,
    CASE
        WHEN polpermissive THEN '⚠️ PERMISSIVE (allows)'
        ELSE '✅ Restrictive (denies)'
    END as policy_type
FROM pg_policies
WHERE tablename = 'email_logs'
  AND schemaname = 'public'
ORDER BY policyname;

-- ============================================
-- SECTION 6: VERIFY onboarding_submissions POLICIES
-- ============================================
-- Expected Result: Admin-only policies

\echo ''
\echo '=========================================='
\echo 'SECTION 6: onboarding_submissions TABLE'
\echo '=========================================='

SELECT
    policyname,
    polcmd as operation,
    CASE
        WHEN polpermissive THEN '⚠️ PERMISSIVE (allows)'
        ELSE '✅ Restrictive (denies)'
    END as policy_type
FROM pg_policies
WHERE tablename = 'onboarding_submissions'
  AND schemaname = 'public'
ORDER BY policyname;

-- Validate admin-only
SELECT
    CASE
        WHEN COUNT(*) >= 1 THEN '✅ PASS: onboarding_submissions is admin-only'
        ELSE '❌ FAIL: Missing admin-only policy'
    END as validation
FROM pg_policies
WHERE tablename = 'onboarding_submissions'
  AND schemaname = 'public'
  AND policyname = 'onboarding_admin_only';

-- ============================================
-- SECTION 7: VERIFY fee_transactions POLICIES
-- ============================================
-- Expected Result: User and admin policies

\echo ''
\echo '=========================================='
\echo 'SECTION 7: fee_transactions TABLE'
\echo '=========================================='

SELECT
    policyname,
    polcmd as operation,
    CASE
        WHEN polpermissive THEN '⚠️ PERMISSIVE (allows)'
        ELSE '✅ Restrictive (denies)'
    END as policy_type
FROM pg_policies
WHERE tablename = 'fee_transactions'
  AND schemaname = 'public'
ORDER BY policyname;

-- ============================================
-- SECTION 8: VERIFY generated_statements POLICIES
-- ============================================
-- Expected Result: User access and admin management

\echo ''
\echo '=========================================='
\echo 'SECTION 8: generated_statements TABLE'
\echo '=========================================='

SELECT
    policyname,
    polcmd as operation,
    CASE
        WHEN polpermissive THEN '⚠️ PERMISSIVE (allows)'
        ELSE '✅ Restrictive (denies)'
    END as policy_type
FROM pg_policies
WHERE tablename = 'generated_statements'
  AND schemaname = 'public'
ORDER BY policyname;

-- ============================================
-- SECTION 9: VERIFY AUDIT LOG IMMUTABILITY
-- ============================================
-- Expected Result: NO UPDATE or DELETE policies
-- Only INSERT and SELECT policies

\echo ''
\echo '=========================================='
\echo 'SECTION 9: AUDIT LOG IMMUTABILITY CHECK'
\echo '=========================================='

SELECT
    policyname,
    polcmd as operation,
    CASE
        WHEN polpermissive THEN '⚠️ PERMISSIVE (allows)'
        ELSE '✅ Restrictive (denies)'
    END as policy_type
FROM pg_policies
WHERE tablename = 'audit_log'
  AND schemaname = 'public'
ORDER BY policyname, polcmd;

-- Check for dangerous UPDATE/DELETE policies
\echo ''
\echo 'Checking for UPDATE/DELETE policies (should be empty or restrictive):'

SELECT
    policyname,
    polcmd as operation,
    CASE
        WHEN (polcmd = 'UPDATE' OR polcmd = 'DELETE') AND polpermissive THEN
            '❌ CRITICAL: Permissive ' || polcmd || ' policy found!'
        WHEN (polcmd = 'UPDATE' OR polcmd = 'DELETE') AND NOT polpermissive THEN
            '✅ OK: ' || polcmd || ' is blocked (restrictive)'
        ELSE '✅ OK'
    END as audit_status
FROM pg_policies
WHERE tablename = 'audit_log'
  AND schemaname = 'public'
  AND polcmd IN ('UPDATE', 'DELETE')
ORDER BY polcmd;

-- Validate audit log protection
SELECT
    CASE
        WHEN COUNT(*) = 0 THEN '✅ PASS: No permissive UPDATE/DELETE policies on audit_log'
        ELSE '❌ FAIL: Found permissive UPDATE/DELETE policies'
    END as audit_validation
FROM pg_policies
WHERE tablename = 'audit_log'
  AND schemaname = 'public'
  AND polcmd IN ('UPDATE', 'DELETE')
  AND polpermissive;

-- ============================================
-- SECTION 10: VERIFY daily_rates POLICIES
-- ============================================
-- Expected Result: RLS policies present

\echo ''
\echo '=========================================='
\echo 'SECTION 10: daily_rates TABLE'
\echo '=========================================='

SELECT
    policyname,
    polcmd as operation,
    CASE
        WHEN polpermissive THEN '⚠️ PERMISSIVE'
        ELSE '✅ Restrictive'
    END as policy_type
FROM pg_policies
WHERE tablename = 'daily_rates'
  AND schemaname = 'public'
ORDER BY policyname;

-- ============================================
-- SECTION 11: VERIFY withdrawal_requests POLICIES
-- ============================================
-- Expected Result: Ownership-based policies

\echo ''
\echo '=========================================='
\echo 'SECTION 11: withdrawal_requests TABLE'
\echo '=========================================='

SELECT
    policyname,
    polcmd as operation,
    CASE
        WHEN polpermissive THEN '⚠️ PERMISSIVE'
        ELSE '✅ Restrictive'
    END as policy_type
FROM pg_policies
WHERE tablename = 'withdrawal_requests'
  AND schemaname = 'public'
ORDER BY policyname;

-- ============================================
-- SECTION 12: RATE LIMITING TABLE VERIFICATION
-- ============================================
-- Expected Result: rate_limits table exists and is protected

\echo ''
\echo '=========================================='
\echo 'SECTION 12: RATE LIMITING TABLE'
\echo '=========================================='

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_tables
            WHERE tablename = 'rate_limits'
            AND schemaname = 'public'
        ) THEN '✅ PASS: rate_limits table exists'
        ELSE '❌ FAIL: rate_limits table not found'
    END as rate_limits_exists;

SELECT
    tablename,
    CASE
        WHEN rowsecurity THEN '✅ Protected'
        ELSE '❌ Vulnerable'
    END as rls_status
FROM pg_tables
WHERE tablename = 'rate_limits'
  AND schemaname = 'public';

-- ============================================
-- SECTION 13: CHECK FOR OVERLY PERMISSIVE POLICIES
-- ============================================
-- Expected Result: No overly permissive policies found

\echo ''
\echo '=========================================='
\echo 'SECTION 13: POLICY PERMISSIVENESS CHECK'
\echo '=========================================='

\echo ''
\echo 'Permissive policies (potential security concern):'

SELECT
    tablename,
    policyname,
    polcmd as operation,
    '⚠️ Review this policy' as recommendation
FROM pg_policies
WHERE schemaname = 'public'
  AND polpermissive = true
ORDER BY tablename, policyname;

-- ============================================
-- SECTION 14: SUMMARY STATISTICS
-- ============================================
-- Overall RLS health metrics

\echo ''
\echo '=========================================='
\echo 'SECTION 14: RLS HEALTH SUMMARY'
\echo '=========================================='

WITH stats AS (
    SELECT
        COUNT(*) FILTER (WHERE rowsecurity) as protected_tables,
        COUNT(*) FILTER (WHERE NOT rowsecurity) as unprotected_tables,
        COUNT(*) as total_tables
    FROM pg_tables
    WHERE schemaname = 'public'
      AND tablename NOT LIKE 'pg_%'
      AND tablename NOT LIKE '%_id_seq'
),
policy_stats AS (
    SELECT
        COUNT(*) as total_policies,
        COUNT(*) FILTER (WHERE polpermissive) as permissive_policies,
        COUNT(*) FILTER (WHERE NOT polpermissive) as restrictive_policies
    FROM pg_policies
    WHERE schemaname = 'public'
)
SELECT
    s.protected_tables,
    s.unprotected_tables,
    s.total_tables,
    ROUND(100.0 * s.protected_tables / s.total_tables, 1) as protection_percentage,
    p.total_policies,
    p.permissive_policies,
    p.restrictive_policies,
    CASE
        WHEN s.unprotected_tables = 0 AND p.permissive_policies = 0
        THEN '✅ EXCELLENT: Full RLS protection'
        WHEN s.unprotected_tables = 0 THEN '✅ GOOD: All tables protected'
        WHEN s.protected_tables > 0 THEN '⚠️ MEDIUM: Some tables unprotected'
        ELSE '❌ CRITICAL: Multiple unprotected tables'
    END as rls_health_status
FROM stats s, policy_stats p;

-- ============================================
-- SECTION 15: CRITICAL TABLES CHECKLIST
-- ============================================
-- Verify all critical tables from EMERGENCY_SECURITY_PATCH

\echo ''
\echo '=========================================='
\echo 'SECTION 15: CRITICAL TABLES CHECKLIST'
\echo '=========================================='

WITH critical_tables AS (
    SELECT 'investor_emails' as tablename
    UNION ALL SELECT 'email_logs'
    UNION ALL SELECT 'onboarding_submissions'
    UNION ALL SELECT 'fee_transactions'
    UNION ALL SELECT 'generated_statements'
    UNION ALL SELECT 'audit_log'
    UNION ALL SELECT 'email_queue'
    UNION ALL SELECT 'legacy_system_migration'
    UNION ALL SELECT 'investor_fund_performance'
    UNION ALL SELECT 'transactions'
    UNION ALL SELECT 'positions'
    UNION ALL SELECT 'statements'
    UNION ALL SELECT 'fees'
    UNION ALL SELECT 'deposits'
    UNION ALL SELECT 'rate_limits'
),
table_status AS (
    SELECT
        ct.tablename,
        COALESCE(pt.rowsecurity, false) as has_rls,
        COUNT(p.policyname) as policy_count
    FROM critical_tables ct
    LEFT JOIN pg_tables pt ON (
        ct.tablename = pt.tablename
        AND pt.schemaname = 'public'
    )
    LEFT JOIN pg_policies p ON (
        ct.tablename = p.tablename
        AND p.schemaname = 'public'
    )
    GROUP BY ct.tablename, pt.rowsecurity
)
SELECT
    tablename,
    CASE WHEN has_rls THEN '✅' ELSE '❌' END as rls_enabled,
    policy_count,
    CASE
        WHEN has_rls AND policy_count > 0 THEN '✅ PASS'
        WHEN has_rls THEN '⚠️ Protected but no policies'
        ELSE '❌ FAIL'
    END as status
FROM table_status
ORDER BY status DESC, tablename;

-- ============================================
-- SECTION 16: WITHDRAWAL FUNCTION VERIFICATION
-- ============================================
-- Verify the secure withdrawal function exists

\echo ''
\echo '=========================================='
\echo 'SECTION 16: SECURE WITHDRAWAL FUNCTION'
\echo '=========================================='

SELECT
    CASE
        WHEN EXISTS (
            SELECT 1 FROM pg_proc p
            JOIN pg_namespace n ON p.pronamespace = n.oid
            WHERE n.nspname = 'public'
            AND p.proname = 'create_withdrawal_request_secure'
        ) THEN '✅ PASS: Secure withdrawal function exists'
        ELSE '❌ FAIL: Secure withdrawal function not found'
    END as function_status;

-- ============================================
-- SECTION 17: CONSTRAINTS VERIFICATION
-- ============================================
-- Verify positive balance constraints exist

\echo ''
\echo '=========================================='
\echo 'SECTION 17: DATA INTEGRITY CONSTRAINTS'
\echo '=========================================='

SELECT
    c.conname as constraint_name,
    t.relname as table_name,
    CASE
        WHEN c.contype = 'c' THEN 'CHECK'
        WHEN c.contype = 'p' THEN 'PRIMARY KEY'
        WHEN c.contype = 'u' THEN 'UNIQUE'
        WHEN c.contype = 'f' THEN 'FOREIGN KEY'
        ELSE c.contype
    END as constraint_type,
    '✅ Active' as status
FROM pg_constraint c
JOIN pg_class t ON c.conrelid = t.oid
WHERE t.relname IN ('positions', 'transactions')
  AND c.conname IN ('positive_balance', 'positive_transaction_amount')
ORDER BY t.relname, c.conname;

-- ============================================
-- FINAL VERIFICATION SUMMARY
-- ============================================
-- Overall security posture

\echo ''
\echo '=========================================='
\echo 'FINAL VERIFICATION SUMMARY'
\echo '=========================================='

SELECT
    CASE
        WHEN (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' AND NOT rowsecurity AND tablename NOT LIKE 'pg_%' AND tablename NOT LIKE '%_id_seq') = 0
        AND (SELECT COUNT(*) FROM pg_policies WHERE schemaname = 'public' AND tablename = 'audit_log' AND polcmd IN ('UPDATE', 'DELETE') AND polpermissive) = 0
        THEN '✅ PASS: RLS VERIFICATION SUCCESSFUL'
        ELSE '❌ FAIL: RLS VERIFICATION FAILED'
    END as overall_status;

\echo ''
\echo '=========================================='
\echo 'End of RLS Verification Script'
\echo 'Timestamp: now()'
\echo '=========================================='

COMMIT;

-- ============================================
-- EXPLANATION OF RESULTS
-- ============================================
--
-- Expected Results Interpretation:
--
-- SECTION 1: RLS ENABLEMENT CHECK
--   - Should show: vulnerable_tables = 0
--   - All tables in public schema should be protected
--
-- SECTION 2: CRITICAL TABLES
--   - investor_emails: ✅ Protected
--   - email_logs: ✅ Protected
--   - onboarding_submissions: ✅ Protected
--   - fee_transactions: ✅ Protected
--   - generated_statements: ✅ Protected
--   - audit_log: ✅ Protected
--   - daily_rates: ✅ Protected
--   - withdrawal_requests: ✅ Protected
--   - All others: ✅ Protected
--
-- SECTION 3: POLICY COUNTS
--   - Each critical table should have 1+ policies
--   - TOTAL should have 25+ policies
--
-- SECTION 4-11: TABLE-SPECIFIC POLICIES
--   - investor_emails: Should have "investor_emails_select_own" + "investor_emails_admin_manage"
--   - email_logs: Should have "email_logs_select_own" + "email_logs_admin_manage"
--   - onboarding_submissions: Should have "onboarding_admin_only"
--   - fee_transactions: Should have user + admin policies
--   - generated_statements: Should have user + admin policies
--   - audit_log: Should have INSERT and SELECT ONLY (no UPDATE/DELETE)
--   - daily_rates: Should have appropriate policies
--   - withdrawal_requests: Should have ownership-based policies
--
-- SECTION 9: AUDIT LOG IMMUTABILITY
--   - CRITICAL: No UPDATE or DELETE policies should exist with polpermissive = true
--   - Only INSERT and SELECT policies should allow access
--   - audit_log_no_update and audit_log_no_delete must exist with polpermissive = false
--
-- SECTION 13: PERMISSIVENESS
--   - Review any permissive policies found
--   - Most permissive policies should have restrictive conditions in polqual
--
-- SECTION 14: HEALTH SUMMARY
--   - Protection percentage should be 100%
--   - Status should be "EXCELLENT" or "GOOD"
--   - No permissive policies without conditions
--
-- If any checks fail:
--   1. Review EMERGENCY_SECURITY_PATCH.sql for issues
--   2. Check if patch was applied correctly
--   3. Verify database permissions
--   4. Contact security team immediately
--
-- ============================================
