# Foreign Key Constraint Cleanup Plan

**Project**: Indigo Yield Platform
**Date**: 2026-01-09
**Purpose**: Consolidate duplicate/redundant FK constraints from accumulated migrations
**Status**: ANALYSIS & PLANNING PHASE - DO NOT EXECUTE YET

---

## Executive Summary

The database has accumulated duplicate and redundant foreign key constraints across multiple migration iterations. This document provides analysis and a migration plan to consolidate these constraints while maintaining data integrity.

### Affected Tables
- `transactions_v2`: 12 FK relationships (with duplicates)
- `investor_positions`: 5 FK relationships (with duplicates)
- `fund_daily_aum`: 5 FK relationships (with duplicates)

---

## 1. Current State Analysis

### 1.1 transactions_v2 FK Constraints

Based on TypeScript types and migration file analysis:

| Column | Constraint Name | References | Delete Rule | Status |
|--------|----------------|------------|-------------|---------|
| `distribution_id` | `fk_transactions_v2_distribution` | `yield_distributions(id)` | RESTRICT (inferred) | Keep |
| `fund_id` | `fk_transactions_v2_fund` | `funds(id)` | RESTRICT | Keep |
| `fund_id` | `transactions_v2_fund_id_fkey` | `funds(id)` | RESTRICT | **DUPLICATE** - Drop |
| `investor_id` | `fk_transactions_v2_investor` | `profiles(id)` | RESTRICT | Drop (prefer named) |
| `investor_id` | `transactions_v2_investor_id_fkey` | `profiles(id)` | CASCADE | **Keep** - Financial data FK |
| `approved_by` | `transactions_v2_approved_by_fkey` | `profiles(id)` | RESTRICT (inferred) | Keep |
| `created_by` | `transactions_v2_created_by_fkey` | `profiles(id)` | RESTRICT (inferred) | Keep |
| `voided_by` | `transactions_v2_voided_by_fkey` | `profiles(id)` | RESTRICT (inferred) | Keep |

**Identified Issues:**
1. **Duplicate fund_id FK**: Two constraints pointing to `funds(id)` - consolidate to one
2. **Conflicting investor_id FK**: Two constraints with different ON DELETE behaviors (RESTRICT vs CASCADE)
3. **CASCADE vs RESTRICT conflict**: Financial data should generally use RESTRICT to prevent accidental data loss

### 1.2 investor_positions FK Constraints

| Column | Constraint Name | References | Delete Rule | Status |
|--------|----------------|------------|-------------|---------|
| `fund_id` | `fk_investor_positions_fund` | `funds(id)` | RESTRICT | Keep |
| `fund_id` | `investor_positions_fund_id_fkey` | `funds(id)` | RESTRICT | **DUPLICATE** - Drop |
| `investor_id` | `fk_investor_positions_investor` | `profiles(id)` | RESTRICT | Keep |
| `investor_id` | `fk_investor_positions_profile` | `profiles(id)` | RESTRICT | **DUPLICATE** - Drop |
| `investor_id` | `investor_positions_investor_id_fkey` | `profiles(id)` | CASCADE | **DUPLICATE** - Drop |

**Identified Issues:**
1. **Triple investor_id FK**: Three constraints on the same relationship - consolidate to one
2. **Duplicate fund_id FK**: Two constraints on the same relationship
3. **Naming inconsistency**: Mixed naming conventions (fk_ prefix vs table_column_fkey)

### 1.3 fund_daily_aum FK Constraints

| Column | Constraint Name | References | Delete Rule | Status |
|--------|----------------|------------|-------------|---------|
| `created_by` | `fund_daily_aum_created_by_fkey` | `profiles(id)` | RESTRICT (inferred) | Keep |
| `fund_id` | `fund_daily_aum_fund_id_fkey` | `funds(id)` | RESTRICT | Keep |
| `voided_by` | `fund_daily_aum_voided_by_fkey` | `profiles(id)` | RESTRICT (inferred) | Keep |
| `updated_by` | `fund_daily_aum_updated_by_fkey` | `profiles(id)` | RESTRICT (inferred) | Keep (if exists) |

**Identified Issues:**
1. Relatively clean compared to other tables
2. May have implicit duplicates not visible in types file

---

## 2. Recommended Target State

### 2.1 Naming Convention Standard

Adopt consistent naming: `fk_<table>_<column>_<ref_table>`

Example: `fk_transactions_v2_fund_id_funds`

### 2.2 ON DELETE Behavior Standard

**Financial Data Policy:**
- **RESTRICT**: Default for all financial data relationships (transactions, positions, AUM)
- **CASCADE**: Only for audit/metadata fields (created_by, approved_by, etc.) where CASCADE is intentional
- **SET NULL**: For optional reference fields where orphaning is acceptable

**Rationale:**
- Financial transactions should never be automatically deleted
- Position data is critical and should be protected
- User deletions should be blocked if they have financial records
- Explicit cleanup required for data integrity

### 2.3 Consolidated Constraint List

#### transactions_v2 (Final: 6 constraints)
```sql
-- Distribution relationship
fk_transactions_v2_distribution_id_yield_distributions (RESTRICT)

-- Fund relationship
fk_transactions_v2_fund_id_funds (RESTRICT)

-- Investor relationship (main)
fk_transactions_v2_investor_id_profiles (RESTRICT) -- Changed from CASCADE

-- Audit trail relationships
fk_transactions_v2_approved_by_profiles (RESTRICT)
fk_transactions_v2_created_by_profiles (RESTRICT)
fk_transactions_v2_voided_by_profiles (RESTRICT)
```

#### investor_positions (Final: 2 constraints)
```sql
-- Fund relationship
fk_investor_positions_fund_id_funds (RESTRICT)

-- Investor relationship
fk_investor_positions_investor_id_profiles (RESTRICT)
```

#### fund_daily_aum (Final: 3-4 constraints)
```sql
-- Fund relationship
fk_fund_daily_aum_fund_id_funds (RESTRICT)

-- Audit trail relationships
fk_fund_daily_aum_created_by_profiles (RESTRICT)
fk_fund_daily_aum_voided_by_profiles (RESTRICT)
fk_fund_daily_aum_updated_by_profiles (RESTRICT) -- if column exists
```

---

## 3. Migration Strategy

### 3.1 Pre-Migration Validation

**Required Actions:**
1. Run diagnostic query to get current actual state:
   ```sql
   -- See /tmp/analyze_fks.sql or query in Section 6.1
   ```

2. Backup current constraint definitions:
   ```sql
   SELECT
       conname,
       pg_get_constraintdef(oid) as definition
   FROM pg_constraint
   WHERE contype = 'f'
       AND conrelid::regclass::text IN ('transactions_v2', 'investor_positions', 'fund_daily_aum');
   ```

3. Check for dependent objects (views, functions):
   ```sql
   SELECT DISTINCT dependent_view.relname as view_name
   FROM pg_depend
   JOIN pg_rewrite ON pg_depend.objid = pg_rewrite.oid
   JOIN pg_class as dependent_view ON pg_rewrite.ev_class = dependent_view.oid
   JOIN pg_class as source_table ON pg_depend.refobjid = source_table.oid
   WHERE source_table.relname IN ('transactions_v2', 'investor_positions', 'fund_daily_aum');
   ```

4. Verify no orphaned records exist:
   ```sql
   -- Check transactions_v2
   SELECT COUNT(*) FROM transactions_v2 t
   WHERE t.investor_id IS NOT NULL
       AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = t.investor_id);

   -- Check investor_positions
   SELECT COUNT(*) FROM investor_positions ip
   WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = ip.investor_id)
       OR NOT EXISTS (SELECT 1 FROM funds f WHERE f.id = ip.fund_id);

   -- Check fund_daily_aum
   SELECT COUNT(*) FROM fund_daily_aum fda
   WHERE NOT EXISTS (SELECT 1 FROM funds f WHERE f.id = fda.fund_id);
   ```

### 3.2 Migration Execution Order

**Phase 1: Drop Duplicate Constraints** (Low Risk)
- Drop constraints that are exact duplicates
- No behavior change, just cleanup

**Phase 2: Standardize Naming** (Low Risk)
- Rename remaining constraints to follow convention
- Use ALTER TABLE ... RENAME CONSTRAINT

**Phase 3: Modify ON DELETE Behavior** (HIGH RISK)
- Change CASCADE to RESTRICT on critical paths
- Requires careful testing
- **MUST coordinate with application code**

### 3.3 Risk Assessment

| Risk Level | Description | Mitigation |
|------------|-------------|------------|
| **LOW** | Dropping duplicate constraints | Verify both constraints have identical definitions |
| **LOW** | Renaming constraints | Does not affect behavior, only metadata |
| **HIGH** | Changing CASCADE to RESTRICT | **May break application deletion logic** |
| **MEDIUM** | Timing of deployment | Execute during maintenance window |

---

## 4. Migration SQL Scripts

### 4.1 Diagnostic Script (Run First)

```sql
-- ============================================
-- FK Constraint Diagnostic Query
-- Run this first to verify current state
-- ============================================

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
```

### 4.2 Phase 1: Drop Duplicate Constraints

```sql
-- ============================================
-- Phase 1: Drop Duplicate FK Constraints
-- Estimated Time: < 1 minute
-- Risk: LOW
-- ============================================

BEGIN;

-- Verify we're in transaction mode
SELECT 'Starting FK cleanup - Phase 1: Drop duplicates' as status;

-- ============================================
-- 1. transactions_v2 duplicates
-- ============================================

-- Drop duplicate fund_id FK (keeping fk_transactions_v2_fund)
ALTER TABLE public.transactions_v2
    DROP CONSTRAINT IF EXISTS transactions_v2_fund_id_fkey;

-- Drop old-style investor_id FK (keeping transactions_v2_investor_id_fkey for now)
ALTER TABLE public.transactions_v2
    DROP CONSTRAINT IF EXISTS fk_transactions_v2_investor;

-- Drop any other historical duplicates
ALTER TABLE public.transactions_v2
    DROP CONSTRAINT IF EXISTS fk_transactions_v2_profile;

-- ============================================
-- 2. investor_positions duplicates
-- ============================================

-- Drop duplicate fund_id FK
ALTER TABLE public.investor_positions
    DROP CONSTRAINT IF EXISTS investor_positions_fund_id_fkey;

-- Drop duplicate investor_id FKs (keep fk_investor_positions_investor)
ALTER TABLE public.investor_positions
    DROP CONSTRAINT IF EXISTS fk_investor_positions_profile;

ALTER TABLE public.investor_positions
    DROP CONSTRAINT IF EXISTS investor_positions_investor_id_fkey;

-- ============================================
-- 3. fund_daily_aum duplicates
-- ============================================

-- Check for any duplicates (less common in this table)
-- Add specific drops here after running diagnostic query

-- ============================================
-- Verification
-- ============================================

SELECT
    table_name,
    COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
GROUP BY table_name;

-- Expected results:
-- transactions_v2: 6 FKs
-- investor_positions: 2 FKs
-- fund_daily_aum: 3-4 FKs

-- If counts look correct, commit. Otherwise, rollback.
-- COMMIT;
ROLLBACK; -- Safety first - remove this after verification
```

### 4.3 Phase 2: Standardize Naming

```sql
-- ============================================
-- Phase 2: Standardize FK Constraint Names
-- Estimated Time: < 1 minute
-- Risk: LOW (rename only)
-- ============================================

BEGIN;

SELECT 'Starting FK cleanup - Phase 2: Standardize naming' as status;

-- ============================================
-- 1. transactions_v2 renames
-- ============================================

-- Standardize distribution FK name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_distribution') THEN
        ALTER TABLE public.transactions_v2
            RENAME CONSTRAINT fk_transactions_v2_distribution
            TO fk_transactions_v2_distribution_id_yield_distributions;
    END IF;
END $$;

-- Standardize fund FK name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_transactions_v2_fund') THEN
        ALTER TABLE public.transactions_v2
            RENAME CONSTRAINT fk_transactions_v2_fund
            TO fk_transactions_v2_fund_id_funds;
    END IF;
END $$;

-- Standardize investor FK name (the one we're keeping)
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'transactions_v2_investor_id_fkey') THEN
        ALTER TABLE public.transactions_v2
            RENAME CONSTRAINT transactions_v2_investor_id_fkey
            TO fk_transactions_v2_investor_id_profiles;
    END IF;
END $$;

-- Audit trail FKs already have acceptable names (transactions_v2_*_fkey pattern)
-- Optionally rename these too for consistency:
-- approved_by, created_by, voided_by

-- ============================================
-- 2. investor_positions renames
-- ============================================

-- Standardize fund FK name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_investor_positions_fund') THEN
        ALTER TABLE public.investor_positions
            RENAME CONSTRAINT fk_investor_positions_fund
            TO fk_investor_positions_fund_id_funds;
    END IF;
END $$;

-- Standardize investor FK name
DO $$
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'fk_investor_positions_investor') THEN
        ALTER TABLE public.investor_positions
            RENAME CONSTRAINT fk_investor_positions_investor
            TO fk_investor_positions_investor_id_profiles;
    END IF;
END $$;

-- ============================================
-- 3. fund_daily_aum renames
-- ============================================

-- These already follow good naming convention (fund_daily_aum_*_fkey)
-- No changes needed

-- ============================================
-- Verification
-- ============================================

SELECT
    table_name,
    constraint_name
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
ORDER BY table_name, constraint_name;

-- COMMIT;
ROLLBACK; -- Safety first
```

### 4.4 Phase 3: Modify ON DELETE Behavior (HIGH RISK)

```sql
-- ============================================
-- Phase 3: Change CASCADE to RESTRICT
-- Estimated Time: 2-5 minutes (depends on data volume)
-- Risk: HIGH - MAY BREAK APPLICATION LOGIC
-- ============================================

-- WARNING: This phase changes database behavior
-- MUST coordinate with application code changes
-- MUST test in staging environment first
-- MUST have rollback plan ready

BEGIN;

SELECT 'Starting FK cleanup - Phase 3: Modify ON DELETE behavior' as status;

-- ============================================
-- CRITICAL: transactions_v2.investor_id
-- ============================================

-- Current: ON DELETE CASCADE (allows deletion of profiles to cascade delete transactions)
-- Target: ON DELETE RESTRICT (prevents deletion of profiles with transactions)

-- Step 1: Verify no orphaned records
DO $$
DECLARE
    orphan_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO orphan_count
    FROM transactions_v2 t
    WHERE t.investor_id IS NOT NULL
        AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = t.investor_id);

    IF orphan_count > 0 THEN
        RAISE EXCEPTION 'Found % orphaned transaction records. Fix before proceeding.', orphan_count;
    END IF;

    RAISE NOTICE 'Verification passed: No orphaned transactions found';
END $$;

-- Step 2: Drop existing CASCADE constraint
ALTER TABLE public.transactions_v2
    DROP CONSTRAINT IF EXISTS fk_transactions_v2_investor_id_profiles;

-- Step 3: Recreate with RESTRICT
ALTER TABLE public.transactions_v2
    ADD CONSTRAINT fk_transactions_v2_investor_id_profiles
    FOREIGN KEY (investor_id)
    REFERENCES public.profiles(id)
    ON DELETE RESTRICT;

-- ============================================
-- IMPACT: Application Code Changes Required
-- ============================================

-- The application must now handle profile deletion differently:
-- BEFORE: Could delete profiles with transactions (CASCADE deleted transactions)
-- AFTER: Cannot delete profiles with transactions (FK constraint blocks it)
--
-- Required Application Changes:
-- 1. Profile deletion must check for related transactions first
-- 2. Profile deletion may need to void/archive transactions instead
-- 3. Consider "soft delete" pattern for profiles (status = 'deleted')
-- 4. UI should warn users before attempting profile deletion

-- ============================================
-- Verification
-- ============================================

-- Verify new constraint
SELECT
    conname,
    confdeltype,
    CASE confdeltype
        WHEN 'r' THEN 'RESTRICT'
        WHEN 'c' THEN 'CASCADE'
        WHEN 'n' THEN 'SET NULL'
        WHEN 'a' THEN 'NO ACTION'
    END as delete_rule,
    pg_get_constraintdef(oid) as definition
FROM pg_constraint
WHERE conname = 'fk_transactions_v2_investor_id_profiles';

-- Test the constraint (should fail)
-- DO $$
-- BEGIN
--     -- This should now fail with FK constraint violation
--     -- DELETE FROM profiles WHERE id = (SELECT investor_id FROM transactions_v2 LIMIT 1);
--     RAISE NOTICE 'Constraint test would go here';
-- END $$;

-- COMMIT;
ROLLBACK; -- Safety first - only commit after thorough testing
```

### 4.5 Rollback Script

```sql
-- ============================================
-- ROLLBACK SCRIPT
-- Use if migration needs to be reversed
-- ============================================

BEGIN;

SELECT 'Starting FK constraint rollback' as status;

-- ============================================
-- Restore transactions_v2 original state
-- ============================================

-- Restore CASCADE behavior on investor_id
ALTER TABLE public.transactions_v2
    DROP CONSTRAINT IF EXISTS fk_transactions_v2_investor_id_profiles;

ALTER TABLE public.transactions_v2
    ADD CONSTRAINT transactions_v2_investor_id_fkey
    FOREIGN KEY (investor_id)
    REFERENCES public.profiles(id)
    ON DELETE CASCADE;

-- Restore duplicate fund FK
ALTER TABLE public.transactions_v2
    ADD CONSTRAINT transactions_v2_fund_id_fkey
    FOREIGN KEY (fund_id)
    REFERENCES public.funds(id)
    ON DELETE RESTRICT;

-- ============================================
-- Restore investor_positions original state
-- ============================================

-- Restore duplicate fund FK
ALTER TABLE public.investor_positions
    ADD CONSTRAINT investor_positions_fund_id_fkey
    FOREIGN KEY (fund_id)
    REFERENCES public.funds(id)
    ON DELETE RESTRICT;

-- ============================================
-- Verification
-- ============================================

SELECT
    table_name,
    constraint_name,
    pg_get_constraintdef(pgc.oid) as definition
FROM information_schema.table_constraints tc
JOIN pg_constraint pgc ON pgc.conname = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
ORDER BY tc.table_name, tc.constraint_name;

-- COMMIT;
ROLLBACK; -- Review output before committing rollback
```

---

## 5. Testing & Validation Plan

### 5.1 Pre-Migration Tests

**Data Integrity Tests:**
```sql
-- 1. Check for orphaned records
SELECT 'transactions_v2 orphans' as test, COUNT(*) as count
FROM transactions_v2 t
WHERE t.investor_id IS NOT NULL
    AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = t.investor_id)
UNION ALL
SELECT 'investor_positions orphans', COUNT(*)
FROM investor_positions ip
WHERE NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = ip.investor_id)
UNION ALL
SELECT 'fund_daily_aum orphans', COUNT(*)
FROM fund_daily_aum fda
WHERE NOT EXISTS (SELECT 1 FROM funds f WHERE f.id = fda.fund_id);

-- Expected: All counts should be 0

-- 2. Count current constraints
SELECT table_name, COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
GROUP BY table_name;
```

### 5.2 Post-Migration Tests

**Constraint Verification:**
```sql
-- 1. Verify expected constraint count
SELECT table_name, COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
    AND table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
GROUP BY table_name;

-- Expected:
-- transactions_v2: 6
-- investor_positions: 2
-- fund_daily_aum: 3-4

-- 2. Verify ON DELETE behavior
SELECT
    tc.table_name,
    tc.constraint_name,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
    AND tc.table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
ORDER BY tc.table_name, tc.constraint_name;

-- Verify all critical FKs have RESTRICT

-- 3. Test CASCADE prevention
-- This should fail after Phase 3:
DO $$
DECLARE
    test_profile_id UUID;
BEGIN
    -- Get a profile with transactions
    SELECT investor_id INTO test_profile_id
    FROM transactions_v2
    WHERE investor_id IS NOT NULL
    LIMIT 1;

    -- Try to delete (should fail)
    BEGIN
        DELETE FROM profiles WHERE id = test_profile_id;
        RAISE EXCEPTION 'UNEXPECTED: Profile deletion succeeded when it should have been blocked';
    EXCEPTION WHEN foreign_key_violation THEN
        RAISE NOTICE 'SUCCESS: FK constraint prevented profile deletion as expected';
    END;
END $$;
```

### 5.3 Application Integration Tests

**Required Application Tests:**
1. Profile deletion workflow
2. Transaction creation/deletion
3. Position management
4. Fund operations
5. Audit log integrity

**Test Scenarios:**
- Attempt to delete user with transactions (should fail)
- Attempt to delete fund with positions (should fail)
- Create new transactions (should succeed)
- Update existing transactions (should succeed)
- Soft delete vs hard delete handling

---

## 6. Implementation Checklist

### Pre-Migration (Required)
- [ ] Review this plan with database architect
- [ ] Review with application developers (CASCADE → RESTRICT impact)
- [ ] Create full database backup
- [ ] Schedule maintenance window
- [ ] Run diagnostic queries in production (read-only)
- [ ] Test full migration in staging environment
- [ ] Verify application handles RESTRICT constraints
- [ ] Document expected downtime

### Migration Execution
- [ ] Announce maintenance window to users
- [ ] Put application in maintenance mode
- [ ] Create point-in-time backup
- [ ] Run Phase 1 (Drop Duplicates)
- [ ] Verify Phase 1 results
- [ ] Run Phase 2 (Standardize Naming)
- [ ] Verify Phase 2 results
- [ ] **STOP HERE** - Do not run Phase 3 without application code changes

### Phase 3 (Separate Deployment)
- [ ] Update application code for RESTRICT behavior
- [ ] Deploy application changes
- [ ] Test in staging with Phase 3 migration
- [ ] Schedule Phase 3 maintenance window
- [ ] Run Phase 3 (Change CASCADE → RESTRICT)
- [ ] Verify Phase 3 results
- [ ] Test application functionality
- [ ] Monitor for FK constraint violations

### Post-Migration
- [ ] Run all validation queries
- [ ] Test critical application paths
- [ ] Monitor error logs for FK violations
- [ ] Update documentation
- [ ] Notify team of completion
- [ ] Remove maintenance mode

---

## 7. Risks & Mitigation

### High Risk Items

1. **CASCADE to RESTRICT Change**
   - **Risk**: Application code may expect CASCADE behavior for profile deletions
   - **Impact**: HIGH - Could break user deletion workflows
   - **Mitigation**:
     - Deploy application changes first
     - Implement soft delete pattern
     - Add explicit transaction cleanup before profile deletion
     - Test thoroughly in staging

2. **Long-Running Transaction**
   - **Risk**: Large tables may cause constraint operations to take time
   - **Impact**: MEDIUM - Extended maintenance window
   - **Mitigation**:
     - Schedule during low-traffic period
     - Monitor transaction duration
     - Have rollback ready

3. **Orphaned Records**
   - **Risk**: Existing orphaned records block constraint creation
   - **Impact**: MEDIUM - Migration fails, needs data cleanup
   - **Mitigation**:
     - Run orphan detection before migration
     - Clean up orphans first
     - Document cleanup process

### Medium Risk Items

1. **Application Downtime**
   - **Risk**: Maintenance window required for safe execution
   - **Impact**: MEDIUM - User service disruption
   - **Mitigation**:
     - Schedule during off-peak hours
     - Communicate schedule in advance
     - Prepare rollback plan

2. **Testing Coverage**
   - **Risk**: Untested edge cases may surface in production
   - **Impact**: MEDIUM - Unexpected errors after deployment
   - **Mitigation**:
     - Comprehensive staging tests
     - Gradual rollout if possible
     - Monitor closely after deployment

---

## 8. Timeline

### Recommended Phased Approach

**Week 1: Analysis & Planning**
- Run diagnostic queries in production (read-only)
- Validate orphan detection
- Review with stakeholders

**Week 2: Staging Testing**
- Deploy Phase 1 & 2 to staging
- Run comprehensive tests
- Validate constraint changes

**Week 3: Phase 1 & 2 Production Deployment**
- Execute duplicate removal (Phase 1)
- Execute naming standardization (Phase 2)
- Validate results
- Monitor application

**Week 4+: Application Updates**
- Update application code for RESTRICT behavior
- Deploy application changes
- Test in staging

**Week 5+: Phase 3 Production Deployment**
- Execute ON DELETE behavior change (Phase 3)
- Validate results
- Monitor for FK violations
- Final verification

---

## 9. Monitoring & Alerts

### Post-Migration Monitoring

**Database Metrics:**
```sql
-- Check for FK violations in logs
SELECT * FROM pg_stat_database_conflicts
WHERE datname = current_database();

-- Monitor constraint check performance
SELECT schemaname, tablename, indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
FROM pg_stat_user_indexes
WHERE tablename IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
ORDER BY idx_scan DESC;
```

**Application Logs:**
- Monitor for FK constraint violation errors
- Track profile deletion attempts
- Log transaction creation failures

**Alerts:**
- Set up alerts for FK violation errors
- Monitor application error rates
- Track database query performance

---

## 10. Documentation Updates

After successful migration, update:

1. **Database Schema Documentation**
   - Update FK constraint diagrams
   - Document ON DELETE behaviors
   - Update naming conventions guide

2. **Application Documentation**
   - Update profile deletion workflow
   - Document soft delete pattern
   - Update API error handling

3. **Operations Runbooks**
   - Update backup/restore procedures
   - Document constraint management
   - Update troubleshooting guides

---

## 11. Stakeholder Sign-Off

**Required Approvals:**

- [ ] Database Architect: _______________________ Date: _______
- [ ] Lead Backend Developer: _______________________ Date: _______
- [ ] DevOps Lead: _______________________ Date: _______
- [ ] Product Owner: _______________________ Date: _______

---

## 12. References

### Migration Files Analyzed
- `supabase/migrations/003_excel_backend.sql` - Initial schema
- `supabase/migrations/20251218_fix_broken_refs.sql` - FK fixes
- `supabase/migrations/20251223170108_*.sql` - FK additions
- `supabase/migrations/20251220160659_*.sql` - Archive tables
- `src/integrations/supabase/types.ts` - Current TypeScript schema

### Database Objects
- **Tables**: transactions_v2, investor_positions, fund_daily_aum
- **Referenced Tables**: profiles, funds, yield_distributions
- **Archive Tables**: transactions_v2_archive, investor_positions_archive, fund_daily_aum_archive

### PostgreSQL Documentation
- [Foreign Key Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)
- [ALTER TABLE](https://www.postgresql.org/docs/current/sql-altertable.html)
- [ON DELETE Actions](https://www.postgresql.org/docs/current/ddl-constraints.html#DDL-CONSTRAINTS-FK)

---

## Appendix A: Quick Reference

### Constraint Naming Convention
```
fk_<source_table>_<column>_<target_table>
```

### ON DELETE Actions
- **RESTRICT**: Prevent deletion if referenced (recommended for financial data)
- **CASCADE**: Delete dependent rows (use cautiously)
- **SET NULL**: Set FK to NULL (for optional relationships)
- **NO ACTION**: Similar to RESTRICT (default)

### Useful Queries

**List all FKs:**
```sql
SELECT conname, conrelid::regclass, confrelid::regclass, pg_get_constraintdef(oid)
FROM pg_constraint
WHERE contype = 'f' AND connamespace = 'public'::regnamespace;
```

**Find duplicate FKs:**
```sql
SELECT conrelid::regclass as table_name, conkey, confrelid::regclass, COUNT(*)
FROM pg_constraint
WHERE contype = 'f'
GROUP BY conrelid, conkey, confrelid
HAVING COUNT(*) > 1;
```

---

**END OF DOCUMENT**

**Status**: Analysis complete. Ready for stakeholder review.
**Next Step**: Run diagnostic queries and validate with actual database state.
**Critical**: Do not execute Phase 3 without application code changes.
