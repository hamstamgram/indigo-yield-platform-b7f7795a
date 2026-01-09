-- ============================================
-- FK CONSTRAINT DIAGNOSTIC QUERIES
-- Indigo Yield Platform - 2026-01-09
-- ============================================
-- Purpose: Analyze current state of FK constraints
--          before executing cleanup migration
-- Safe to run: All queries are read-only
-- ============================================

-- ============================================
-- Query 1: List All Current FK Constraints
-- ============================================
-- Shows complete details of all FK constraints
-- on the three target tables

\echo '=== Query 1: All FK Constraints with Details ==='

SELECT
    tc.table_name,
    tc.constraint_name,
    kcu.column_name,
    ccu.table_name AS foreign_table_name,
    ccu.column_name AS foreign_column_name,
    rc.update_rule,
    rc.delete_rule,
    pg_get_constraintdef(pgc.oid) as full_definition
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
    AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage AS ccu
    ON ccu.constraint_name = tc.constraint_name
    AND ccu.table_schema = tc.table_schema
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
    AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name, tc.constraint_name;

-- ============================================
-- Query 2: Count FKs per Table
-- ============================================
-- Quick summary of constraint counts

\echo ''
\echo '=== Query 2: FK Count Summary ==='

SELECT
    table_name,
    COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
    AND table_schema = 'public'
GROUP BY table_name
ORDER BY table_name;

\echo ''
\echo 'Expected after cleanup:'
\echo '  transactions_v2: 6 FKs'
\echo '  investor_positions: 2 FKs'
\echo '  fund_daily_aum: 3-4 FKs'

-- ============================================
-- Query 3: Identify Duplicate Constraints
-- ============================================
-- Finds constraints on same column-target pairs

\echo ''
\echo '=== Query 3: Duplicate FK Constraints ==='

WITH fk_details AS (
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        tc.constraint_name,
        rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
)
SELECT
    table_name,
    column_name,
    foreign_table_name,
    COUNT(*) as duplicate_count,
    STRING_AGG(constraint_name || ' (' || delete_rule || ')', ', ' ORDER BY constraint_name) as constraints
FROM fk_details
GROUP BY table_name, column_name, foreign_table_name
HAVING COUNT(*) > 1
ORDER BY table_name, column_name;

\echo ''
\echo 'If no rows returned: No duplicates found'
\echo 'If rows returned: Multiple constraints on same relationship'

-- ============================================
-- Query 4: Check for Orphaned Records
-- ============================================
-- Detects data integrity issues before migration

\echo ''
\echo '=== Query 4: Orphaned Records Check ==='

-- transactions_v2 orphans
SELECT 'transactions_v2.investor_id orphans' as check_name, COUNT(*) as orphan_count
FROM transactions_v2 t
WHERE t.investor_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = t.investor_id)

UNION ALL

SELECT 'transactions_v2.fund_id orphans', COUNT(*)
FROM transactions_v2 t
WHERE NOT EXISTS (SELECT 1 FROM funds f WHERE f.id = t.fund_id)

UNION ALL

SELECT 'transactions_v2.distribution_id orphans', COUNT(*)
FROM transactions_v2 t
WHERE t.distribution_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM yield_distributions yd WHERE yd.id = t.distribution_id)

UNION ALL

-- investor_positions orphans
SELECT 'investor_positions.investor_id orphans', COUNT(*)
FROM investor_positions ip
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = ip.investor_id)

UNION ALL

SELECT 'investor_positions.fund_id orphans', COUNT(*)
FROM investor_positions ip
WHERE NOT EXISTS (SELECT 1 FROM funds f WHERE f.id = ip.fund_id)

UNION ALL

-- fund_daily_aum orphans
SELECT 'fund_daily_aum.fund_id orphans', COUNT(*)
FROM fund_daily_aum fda
WHERE NOT EXISTS (SELECT 1 FROM funds f WHERE f.id = fda.fund_id)

UNION ALL

SELECT 'fund_daily_aum.created_by orphans', COUNT(*)
FROM fund_daily_aum fda
WHERE fda.created_by IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = fda.created_by);

\echo ''
\echo 'Expected: All counts should be 0'
\echo 'If any count > 0: Fix orphaned records before migration'

-- ============================================
-- Query 5: ON DELETE Behavior Analysis
-- ============================================
-- Shows which constraints use CASCADE

\echo ''
\echo '=== Query 5: ON DELETE Behavior Summary ==='

SELECT
    tc.table_name,
    rc.delete_rule,
    COUNT(*) as constraint_count,
    STRING_AGG(tc.constraint_name, ', ' ORDER BY tc.constraint_name) as constraint_names
FROM information_schema.table_constraints AS tc
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
    AND tc.table_schema = 'public'
GROUP BY tc.table_name, rc.delete_rule
ORDER BY tc.table_name, rc.delete_rule;

\echo ''
\echo 'Financial data recommendation: All should be RESTRICT (NO ACTION)'
\echo 'CASCADE on critical data is risky'

-- ============================================
-- Query 6: Conflicting Constraints
-- ============================================
-- Finds same relationship with different behaviors

\echo ''
\echo '=== Query 6: Conflicting ON DELETE Behaviors ==='

WITH fk_behaviors AS (
    SELECT
        tc.table_name,
        kcu.column_name,
        ccu.table_name AS foreign_table_name,
        tc.constraint_name,
        rc.delete_rule
    FROM information_schema.table_constraints AS tc
    JOIN information_schema.key_column_usage AS kcu
        ON tc.constraint_name = kcu.constraint_name
    JOIN information_schema.constraint_column_usage AS ccu
        ON ccu.constraint_name = tc.constraint_name
    JOIN information_schema.referential_constraints AS rc
        ON rc.constraint_name = tc.constraint_name
    WHERE tc.constraint_type = 'FOREIGN KEY'
        AND tc.table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
)
SELECT
    table_name,
    column_name,
    foreign_table_name,
    COUNT(DISTINCT delete_rule) as different_behaviors,
    STRING_AGG(DISTINCT constraint_name || ' (' || delete_rule || ')', ', ' ORDER BY constraint_name) as conflicts
FROM fk_behaviors
GROUP BY table_name, column_name, foreign_table_name
HAVING COUNT(DISTINCT delete_rule) > 1
ORDER BY table_name, column_name;

\echo ''
\echo 'If rows returned: Same FK with different ON DELETE rules'
\echo 'These MUST be consolidated to one consistent rule'

-- ============================================
-- Query 7: Table Statistics
-- ============================================
-- Shows table sizes for migration planning

\echo ''
\echo '=== Query 7: Table Statistics ==='

SELECT
    schemaname,
    tablename,
    pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as total_size,
    pg_size_pretty(pg_relation_size(schemaname||'.'||tablename)) as table_size,
    n_live_tup as row_count
FROM pg_stat_user_tables
WHERE tablename IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

\echo ''
\echo 'Larger tables may take longer to ALTER'

-- ============================================
-- Query 8: Related Views and Functions
-- ============================================
-- Identifies objects that depend on these tables

\echo ''
\echo '=== Query 8: Dependent Objects ==='

SELECT DISTINCT
    dependent_ns.nspname as schema_name,
    dependent_view.relname as object_name,
    dependent_view.relkind as object_type,
    CASE dependent_view.relkind
        WHEN 'r' THEN 'table'
        WHEN 'v' THEN 'view'
        WHEN 'm' THEN 'materialized view'
        WHEN 'f' THEN 'foreign table'
    END as type_description
FROM pg_depend
JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
JOIN pg_namespace dependent_ns ON dependent_ns.oid = dependent_view.relnamespace
WHERE source_table.relname IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
    AND dependent_view.relname != source_table.relname
ORDER BY dependent_view.relname;

\echo ''
\echo 'These objects may be affected by FK changes'
\echo 'Test them after migration'

-- ============================================
-- Query 9: Backup Current Constraint Definitions
-- ============================================
-- Creates a backup of current state

\echo ''
\echo '=== Query 9: Constraint Definition Backup ==='

SELECT
    conname as constraint_name,
    conrelid::regclass as table_name,
    pg_get_constraintdef(oid) as definition,
    CASE confdeltype
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'a' THEN 'NO ACTION'
        WHEN 'd' THEN 'SET DEFAULT'
    END as delete_action
FROM pg_constraint
WHERE contype = 'f'
    AND conrelid::regclass::text IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
ORDER BY conrelid::regclass::text, conname;

\echo ''
\echo 'Save this output for rollback reference'

-- ============================================
-- Query 10: Specific FK Analysis
-- ============================================
-- Detailed look at specific problematic constraints

\echo ''
\echo '=== Query 10: High-Risk Constraint Details ==='

-- Check transactions_v2.investor_id specifically
SELECT
    'transactions_v2.investor_id' as critical_fk,
    tc.constraint_name,
    rc.delete_rule,
    pg_get_constraintdef(pgc.oid) as full_definition,
    CASE
        WHEN rc.delete_rule = 'CASCADE' THEN 'HIGH RISK - Will be changed to RESTRICT'
        WHEN rc.delete_rule = 'NO ACTION' THEN 'OK - Already safe'
        WHEN rc.delete_rule = 'RESTRICT' THEN 'OK - Already safe'
        ELSE 'REVIEW - Unexpected behavior'
    END as risk_assessment
FROM information_schema.table_constraints AS tc
JOIN information_schema.key_column_usage AS kcu
    ON tc.constraint_name = kcu.constraint_name
JOIN information_schema.referential_constraints AS rc
    ON rc.constraint_name = tc.constraint_name
JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
WHERE tc.table_name = 'transactions_v2'
    AND kcu.column_name = 'investor_id'
    AND tc.constraint_type = 'FOREIGN KEY';

\echo ''
\echo 'CASCADE on investor_id is the primary concern'

-- ============================================
-- Summary Report
-- ============================================

\echo ''
\echo '============================================'
\echo 'DIAGNOSTIC SUMMARY'
\echo '============================================'
\echo ''
\echo 'Review all query outputs above.'
\echo ''
\echo 'Pre-migration checklist:'
\echo '  [ ] Query 1: Document all current constraints'
\echo '  [ ] Query 2: Verify FK counts match expectations'
\echo '  [ ] Query 3: Identify all duplicates'
\echo '  [ ] Query 4: Ensure zero orphaned records'
\echo '  [ ] Query 5: Understand current ON DELETE distribution'
\echo '  [ ] Query 6: Resolve any conflicting behaviors'
\echo '  [ ] Query 7: Note table sizes for timing estimates'
\echo '  [ ] Query 8: Document dependent objects for testing'
\echo '  [ ] Query 9: Save constraint definitions for rollback'
\echo '  [ ] Query 10: Assess risk of CASCADE → RESTRICT change'
\echo ''
\echo 'Next steps:'
\echo '  1. Review FK_CONSTRAINT_CLEANUP_PLAN.md'
\echo '  2. Test migration in staging environment'
\echo '  3. Coordinate application code changes'
\echo '  4. Schedule maintenance window'
\echo '  5. Execute Phase 1 and 2 (safe changes)'
\echo '  6. Deploy application changes'
\echo '  7. Execute Phase 3 (behavioral changes)'
\echo ''
\echo '============================================'

-- ============================================
-- Export Results (Optional)
-- ============================================

-- To save results to CSV:
-- \copy (SELECT ... FROM ...) TO '/tmp/fk_analysis.csv' WITH CSV HEADER

-- To generate HTML report:
-- \H
-- \o /tmp/fk_report.html
-- (run queries)
-- \o
-- \H
