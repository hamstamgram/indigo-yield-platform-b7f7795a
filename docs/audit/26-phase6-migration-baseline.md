# Phase 6A: Migration Baseline Classification

**Phase:** 6A  
**Status:** Classification Complete  
**Last Updated:** 2026-04-14

---

## Preconditions Met

| # | Criterion | Status |
|---|----------|--------|
| 1 | Phase 5 evidence exists | ✅ Invariant tests pass |
| 2 | No unexplained drift | ✅ 0 drift |
| 3 | No hotfix migrations queued | ✅ Complete |
| 4 | Monitoring active | ✅ 3 views |

---

## Migration Inventory Classification

### Category: Foundational (MUST PRESERVE)

| Migration | Purpose |
|----------|---------|
| 20260307000000_definitive_baseline.sql | Core schema baseline |
| 20260307000000_*_restore_*.sql | Core RPCs |
| 20260428000000_isolate_repair_functions.sql | PS-3 repair isolation |
| 20260414000000_*_runtime_warnings.sql | PS-3 runtime warnings |
| 20260414000001_*_ps4_*.sql | PS-4 trigger cleanup |

### Category: Corrective (PRESERVE, DO NOT FLATTEN)

| Migration | Purpose |
|----------|---------|
| 20260424000000_consolidate_position_validation.sql | Position validation |
| 20260408160000_*_void_withdrawal.sql | Void withdrawal fix |
| 20260505000000_void_transaction_isolation.sql | Void isolation |
| 20260512000000_void_fund_level_locking.sql | Locking |

### Category: Deprecated (CAN ARCHIVE)

| Migration | Purpose |
|----------|---------|
| 20260313_*.sql | Old yield v3/v4 |
| 20260316_*.sql | Legacy fixes |
| 20260307000009_*.sql | v4 crystallizations |

### Category: Yield Hardening (PRESERVE)

| Migration | Purpose |
|----------|---------|
| 20260526000000_consolidate_reporting_views.sql | Yield domain |
| 20260414120000_fix_yield_conservation_trigger_timing.sql | Conservation |

---

## Recommended Actions

### Priority 1: Archive Deprecated Migrations

Move to `supabase/archived_migrations/`:
- 20260313_* (old fixes)
- 20260314_* (legacy)
- 20260315_* (deprecated)

### Priority 2: Consolidate Restore Stack

The 20260307 restore_*.sql sequence could be consolidated:
- 20260307000004_restore_dashboard_rpcs.sql
- 20260307000005_restore_apply_investor_transaction.sql
- 20260307000006_restore_investor_and_flow_rpcs.sql
- 20260307000007_restore_ib_commission_schedule.sql
- 20260307000008_restore_segmented_yield_rpcs.sql

### Priority 3: Verify No Loss

Before any consolidation, verify:
- All current functions exist
- All triggers fire correctly
- No behavioral changes

---

## Execution Sequence (When Ready)

1. **Inventory:** List all migrations ✅ (COMPLETE)
2. **Classify:** Categorize by type ✅ (COMPLETE)
3. **Archive:** Move deprecated to `archived_migrations/` (NEXT)
4. **Consolidate:** Combine restore stack (DEFERRED - risk)
5. **Baseline:** Create new baseline migration (DEFERRED - risk)

---

## Risk Assessment

| Action | Risk | Mitigation |
|--------|------|-----------|
| Archive deprecated migrations | LOW | No schema changes |
| Consolidate restore stack | HIGH | Complex, many dependencies |
| New baseline | HIGH | May break assumptions |

**Recommendation:** Archive only. Do NOT consolidate until more stability window passes.

---

## Document History

| Date | Change | Author |
|------|--------|--------|
| 2026-04-14 | Initial classification | Phase 6 Execution |