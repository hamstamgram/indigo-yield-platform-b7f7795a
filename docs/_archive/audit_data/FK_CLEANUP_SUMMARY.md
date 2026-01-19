# FK Constraint Cleanup - Quick Reference

**Date**: 2026-01-09
**Status**: Analysis Complete - Ready for Review

---

## Executive Summary

The database has accumulated **duplicate and redundant foreign key constraints** across three critical tables during iterative development. This cleanup will:

- **Remove 8-10 duplicate constraints**
- **Standardize naming conventions**
- **Change CASCADE to RESTRICT** on financial data (requires app changes)

---

## Problem Overview

### Current State (Estimated)

| Table | Current FK Count | Target FK Count | Duplicates to Remove |
|-------|------------------|-----------------|----------------------|
| `transactions_v2` | 10-12 | 6 | 4-6 |
| `investor_positions` | 5-7 | 2 | 3-5 |
| `fund_daily_aum` | 3-5 | 3-4 | 0-1 |

### Key Issues

1. **Multiple FKs on same column** (e.g., `transactions_v2.investor_id` has 2+ constraints)
2. **Conflicting ON DELETE behaviors** (CASCADE vs RESTRICT on same relationship)
3. **Inconsistent naming** (mix of `fk_` prefix and `_fkey` suffix)

---

## Migration Phases

### Phase 1: Drop Duplicates (LOW RISK)
- Drop exact duplicate constraints
- No behavior change
- **Safe to execute immediately**

### Phase 2: Standardize Naming (LOW RISK)
- Rename constraints to consistent format
- No behavior change
- **Safe to execute immediately**

### Phase 3: Change CASCADE → RESTRICT (HIGH RISK)
- Changes database behavior
- **REQUIRES APPLICATION CODE CHANGES**
- **Must test in staging first**
- **Coordinate with development team**

---

## Critical Change: CASCADE → RESTRICT

### What's Changing

**BEFORE** (Current - Dangerous):
```sql
-- Deleting a profile CASCADE deletes all their transactions
-- THIS IS VERY RISKY for financial data
transactions_v2.investor_id → profiles.id ON DELETE CASCADE
```

**AFTER** (Target - Safe):
```sql
-- Deleting a profile is BLOCKED if they have transactions
-- THIS IS SAFE for financial data
transactions_v2.investor_id → profiles.id ON DELETE RESTRICT
```

### Application Impact

**What Breaks:**
- Profile deletion now fails if user has transactions
- Need to implement "soft delete" pattern
- UI must warn users before deletion attempts

**Required Code Changes:**
1. Check for transactions before allowing profile deletion
2. Implement soft delete (status = 'deleted')
3. Or require explicit transaction cleanup first
4. Update error handling for FK violations

---

## Quick Start Guide

### Step 1: Run Diagnostics (5 minutes)

```bash
cd /Users/mama/indigo-yield-platform-v01
psql -d your_database -f fk_diagnostic_queries.sql > fk_analysis.txt
```

Review the output to verify current state.

### Step 2: Test in Staging (1-2 days)

```sql
-- In staging database
BEGIN;
\i supabase/migrations/FK_PHASE1_drop_duplicates.sql
-- Review output
COMMIT; -- or ROLLBACK if issues found
```

### Step 3: Deploy Phase 1 & 2 (15 minutes production downtime)

```sql
-- In production (during maintenance window)
BEGIN;
-- Phase 1: Drop duplicates
-- Phase 2: Rename constraints
-- Verify
COMMIT;
```

### Step 4: Update Application (1-2 weeks)

- Deploy new profile deletion logic
- Test thoroughly in staging
- Monitor for FK violations

### Step 5: Deploy Phase 3 (15 minutes production downtime)

```sql
-- After application changes are deployed
BEGIN;
-- Phase 3: CASCADE → RESTRICT
-- Verify
COMMIT;
```

---

## Files in This Package

1. **FK_CONSTRAINT_CLEANUP_PLAN.md** - Complete detailed plan (read this first)
2. **fk_diagnostic_queries.sql** - Diagnostic queries to run first
3. **FK_CLEANUP_SUMMARY.md** - This quick reference
4. **(Generated from Phase 1-3 sections in main plan)** - Migration SQL scripts

---

## Risk Assessment

| Phase | Risk Level | Can Break App? | Requires Code Changes? |
|-------|-----------|----------------|------------------------|
| Phase 1 | LOW | No | No |
| Phase 2 | LOW | No | No |
| Phase 3 | HIGH | **YES** | **YES** |

---

## Decision Tree

```
Do you have duplicate FK constraints?
├─ Yes → Proceed with Phase 1 & 2
│   └─ Test in staging → Deploy to production
└─ No → Skip to Phase 3 planning

Do you have CASCADE on financial data FKs?
├─ Yes → HIGH PRIORITY to change to RESTRICT
│   ├─ Update application code first
│   ├─ Deploy app changes
│   └─ Then execute Phase 3 migration
└─ No → You're done!
```

---

## Before You Begin - Checklist

Essential prerequisites:

- [ ] Full database backup created
- [ ] Diagnostic queries executed and reviewed
- [ ] No orphaned records found
- [ ] Staging environment available for testing
- [ ] Maintenance window scheduled
- [ ] Team notified of planned changes
- [ ] Rollback plan reviewed

For Phase 3 only:

- [ ] Application code updated for RESTRICT behavior
- [ ] Application changes tested in staging
- [ ] Application changes deployed to production
- [ ] Team trained on new profile deletion process

---

## Quick Commands

### Check Current FK Count
```sql
SELECT table_name, COUNT(*) as fk_count
FROM information_schema.table_constraints
WHERE constraint_type = 'FOREIGN KEY'
  AND table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum')
GROUP BY table_name;
```

### Check for Orphaned Records
```sql
-- transactions_v2 orphans
SELECT COUNT(*) FROM transactions_v2 t
WHERE t.investor_id IS NOT NULL
  AND NOT EXISTS (SELECT 1 FROM profiles p WHERE p.id = t.investor_id);
-- Should return 0
```

### Check CASCADE vs RESTRICT
```sql
SELECT tc.table_name, tc.constraint_name, rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.referential_constraints rc
  ON rc.constraint_name = tc.constraint_name
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_name IN ('transactions_v2', 'investor_positions', 'fund_daily_aum');
```

---

## Who to Contact

| Question | Contact |
|----------|---------|
| Database changes approval | Database Architect |
| Application code changes | Lead Backend Developer |
| Deployment scheduling | DevOps Lead |
| Business impact assessment | Product Owner |
| Financial data concerns | Compliance Officer |

---

## Timeline Estimate

**Conservative Approach (Recommended):**
- Week 1: Analysis & planning (this document)
- Week 2: Staging testing (Phase 1 & 2)
- Week 3: Production deployment (Phase 1 & 2)
- Weeks 4-5: Application updates
- Week 6: Phase 3 deployment

**Aggressive Approach (Higher Risk):**
- Day 1: Analysis complete
- Day 2-3: Staging testing
- Day 4: Phase 1 & 2 production deployment
- Weeks 2-3: Application updates & Phase 3

---

## Success Criteria

After migration, you should see:

✅ **transactions_v2**: Exactly 6 FK constraints
✅ **investor_positions**: Exactly 2 FK constraints
✅ **fund_daily_aum**: 3-4 FK constraints
✅ All financial data FKs use RESTRICT (not CASCADE)
✅ Zero orphaned records
✅ All constraints follow naming convention
✅ Application works without FK violations

---

## Red Flags - Stop and Review

🚨 **STOP the migration if:**
- Orphaned records found (Query 4)
- Staging tests reveal unexpected behavior
- Application team not ready for Phase 3
- No recent database backup
- Downtime window too short
- Team members unavailable for support

---

## Common Questions

### Q: Can I skip Phase 3?
A: You can delay it, but CASCADE on financial data is a **security risk**. Phase 3 should be done eventually.

### Q: Will this break existing queries?
A: Phase 1 & 2 won't break anything. Phase 3 only affects DELETE operations on profiles table.

### Q: How long will production be down?
A: Phase 1 & 2: ~15 minutes. Phase 3: ~15 minutes. Total: ~30 minutes if done separately.

### Q: Can I run this during business hours?
A: Phase 1 & 2: Maybe, if low traffic. Phase 3: No, requires maintenance window.

### Q: What if something goes wrong?
A: Use the rollback script in the main plan. All phases are in transactions and can be rolled back.

---

## Next Steps

1. **Read the full plan**: Open `FK_CONSTRAINT_CLEANUP_PLAN.md`
2. **Run diagnostics**: Execute `fk_diagnostic_queries.sql`
3. **Review with team**: Share findings with stakeholders
4. **Schedule testing**: Book staging environment
5. **Plan deployment**: Set maintenance window
6. **Execute**: Follow phased approach

---

**Remember**: Phase 1 & 2 are safe. Phase 3 requires careful coordination with application team.

For questions or concerns, review the full plan document or contact the database team.
