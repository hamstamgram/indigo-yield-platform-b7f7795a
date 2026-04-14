# Migration Baseline Strategy

**Phase:** 4D (Deferred)  
**Status:** Planning Only  
**Last Updated:** 2026-04-14

---

## Executive Summary

Migration consolidation should wait until production is stable and recent hardening work has proven durable. This document outlines the preconditions and safe approach.

---

## 1. Current Migration Debt

### Observed Issues

| Issue | Severity | Impact |
|-------|----------|--------|
| Duplicate function redefinitions | MEDIUM | Hard to maintain |
| Old naming conventions | LOW | Confusion |
| Historical corrective chains | MEDIUM | Debugging difficulty |
| Embedded assumptions | LOW | Technical debt |

### Migration Files Summary

```
supabase/migrations/
├── 2026-02-*  (Pre-squash era - many redundant redefs)
├── 2026-03-*  (Post-consolidation - cleaner)
├── 2026-04-*  (Current hardening - canonical)
└── archived_migrations/  (Historical - intact)
```

---

## 2. Baseline Preconditions

Before baseline creation:

- [ ] PS-3/PS-4 migrations stable in production for 30 days
- [ ] No drift detected via monitoring views for 7 consecutive days
- [ ] No serialization failures in logs for 14 days
- [ ] No hotfix schema changes queued
- [ ] Load testing complete and passing
- [ ] rollback procedure documented and tested

**Earliest Baseline Date:** 30+ days post PS-4 deployment

---

## 3. Do-Not-Flatten Historical Logic

### Must Preserve

| Migration | Reason |
|-----------|--------|
| void_transaction isolation | Core audit trail |
| fund_daily_aum canonical enforcement | AUM integrity |
| yield conservation triggers | Financial correctness |
| position recompute triggers | Ledger-driven model |
| audit_log structure | Compliance |

### Can Flatten

| Migration | Replacement |
|----------|-------------|
| Old recalc functions | Single canonical version |
| Multiple backup views | One primary view |
| Legacy naming | Current conventions |

---

## 4. Safe Sequencing

### Phase 1: Inventory (Week 1-2)

1. List all migrations with purposes
2. Identify true duplicates
3. Document which functions are called vs spare

### Phase 2: Deprecate (Week 3-4)

1. Add deprecation comments to spare functions
2. Redirect calls to canonical
3. Observe for 7 days

### Phase 3: Archive (Week 5-6)

1. Move deprecated to archived_migrations/
2. Remove from main migrations/
3. Document in baseline changelog

### Phase 4: Consolidate (Week 7-8)

1. Create consolidated baseline migration
2. Test in staging
3. Document delta from current state

---

## 5. Recommendation

**Do NOT consolidate immediately.**

Current state is stable. Migration debt is manageable. Wait until:

1. More time passes with PS-4 stable
2. Load testing completes
3. Team has cycles for verification

The cost of early consolidation (risk) outweighs the cost of delay (convenience).

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-04-14 | Initial migration baseline strategy | Phase 4 Execution |