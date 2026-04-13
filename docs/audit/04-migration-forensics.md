# Migration Forensics

**Source**: 98 migrations analyzed (20260307 - 20260413)
**Period**: 37 days of active migration development
**Status**: RECENT HIGH-CHURN (22 migrations in 7 days at end)

## Migration Timeline

### Phase 1: Baseline Foundation (2026-03-07)

| Migration | Purpose | Risk |
|-----------|---------|------|
| 20260307000000_definitive_baseline.sql | Core schema + 49 tables | HIGH — "definitive" suggests prior loss |
| 20260307000004_restore_dashboard_rpcs.sql | Dashboard query functions | HIGH — "restore" suggests recovery |
| 20260307000005_restore_apply_investor_transaction.sql | Transaction RPC | HIGH — "restore" |
| 20260307000006_restore_investor_and_flow_rpcs.sql | Flow functions | HIGH — "restore" |
| 20260307000007_restore_ib_commission_schedule.sql | IB schema | MEDIUM |
| 20260307000008_restore_segmented_yield_rpcs.sql | Yield RPC suite | MEDIUM |
| 20260307000009_drop_v4_crystallizations.sql | Remove v4 yield logic | MEDIUM — cleanup |

**Signal**: "restore_*" pattern suggests prior complete or partial schema loss/corruption

---

### Phase 2: Bug Fixes & Corrections (2026-03-08 to 2026-03-20)

| Date | Migration | Type | Risk |
|------|-----------|------|------|
| 2026-03-08 | fix_preview_volatility.sql | HOTFIX | MEDIUM — Stability issue |
| 2026-03-09 | fix_tx_id_key_mismatch.sql | HOTFIX | HIGH — Data integrity |
| 2026-03-13 | fix_adjustment_visibility.sql | HOTFIX | MEDIUM |
| 2026-03-15 | drop_stale_yield_v5_overload.sql | CLEANUP | MEDIUM — Version cleanup |
| 2026-03-16 | fix_withdrawal_execution_date.sql | HOTFIX | MEDIUM — Business logic |
| 2026-03-17 | fix_distribution_type.sql | HOTFIX | MEDIUM — Enum/type issue |
| 2026-03-20 | void_cascade_dust_sweeps.sql | FEATURE | HIGH — Void logic |

**Pattern**: 7 bug fixes in 13 days = 1 fix every ~2 days
**Signal**: Schema instability, edge cases not caught in initial baseline

---

### Phase 3: Data & Logic Reconciliation (2026-03-19 to 2026-04-08)

**13 UUID-named migrations** (rapid succession, 2026-03-19 14:09 to 2026-03-19 15:48):
- 20260319140952_18da7e0b-777c-4199-b149-f270b1761d0c.sql
- 20260319141712_ccfa745c-bbfd-400f-b143-a9b79743b12d.sql
- ... (11 more)

**Pattern**: UUID naming + rapid succession (40-minute span)
**Signal**: Likely auto-generated or merge artifacts
**Risk**: Unknown purpose, potential garbage

---

### Phase 4: Recent Intensive Patching (2026-04-08 to 2026-04-13)

| Date | Migration | Purpose | Risk |
|------|-----------|---------|------|
| 2026-04-08 | 20260408191518_*.sql | Fix | ? |
| 2026-04-08 | 20260408195502_*.sql | Fix | ? |
| ... | (8 more UUID migrations) | ? | ? |
| 2026-04-12 | add_simple_rpc_wrappers.sql | Feature | LOW |
| 2026-04-13 | comprehensive_restoration.sql | RESTORATION | HIGH — 2nd baseline restore |
| 2026-04-13 | 20260413134513_*.sql | Test setup | LOW |
| 2026-04-13 | 20260413135228_*.sql | BLOCKER | CRITICAL — Assertions fail |

**Signal**: 22 migrations in 7 days = 3x normal velocity
**Signal**: Two "comprehensive_restoration" migrations = multiple resets
**Critical**: Last migration contains test assertions that fail locally

---

## Current Relevance Analysis

### Actively Used
- ✅ All Phase 1 baseline (core schema required)
- ✅ Phase 2 bug fixes (applied to remote DB)
- ✅ Key Phase 3 migrations (data structure needed)
- ✅ Phase 4 RPC wrappers (recent feature)

### Questionable
- ❓ 13 UUID-named migrations (unclear purpose)
- ❓ `comprehensive_restoration.sql` (duplicate baseline?)
- ❓ `void_cascade_dust_sweeps.sql` (test or production?)

### Blocked
- 🚫 20260413135228 — Test assertions fail locally

### Candidates for Archive
- `draft_calculate_yield_distribution.sql` — Incomplete name format
- `20260327102803_*` — Contains test assertions (move to tests/)
- Backup migrations if not referenced

---

## Risk Signals & Consolidation Patterns

### Signal 1: Multiple Baselines
Three migrations claim to be "foundational":
1. `20260307000000_definitive_baseline.sql`
2. `20260413000000_comprehensive_restoration.sql`
3. Plus multiple `restore_*` migrations

**Issue**: Should have ONE definitive baseline, not multiple "restores"
**Action**: Clarify which is truth, archive others

---

### Signal 2: Version Proliferation

**Yield Functions**:
- v3, v4, v5 exist in migration history
- v4 was dropped in 20260307000009
- v5 overload dropped in 20260315000001
- Current canonical: v5 or v3?

**Transaction Ledger**:
- `transactions_v2` is current
- v1 missing (deleted? archived?)

**Action**: Document function version strategy, archive old versions

---

### Signal 3: Void/Reissue Logic Fragmentation

Multiple migrations touch void logic:
- `void_cascade_dust_sweeps.sql` (20260320)
- `cascade_void_from_transaction()` function
- `cascade_void_to_allocations()` function
- `cascade_void_to_yield_events()` function
- `void_and_reissue_transaction()` function
- `unvoid_transaction()` function

**Action**: Map which void function is canonical, consolidate

---

### Signal 4: Test Code in Production Migrations

Two migrations contain test/assertion logic:
1. `20260327102803_7b93d8c3-6c1c-422a-9a49-de3f4241a375.sql`
   - Contains `ASSERT` statements
   - Tests void/unvoid cascade behavior
   - Uses hardcoded test UUIDs

2. `20260413135228_980d6177-ab44-47fc-bfe6-dc65a8d4f8a6.sql`
   - Inserts test user role data
   - May fail if test data doesn't exist

**Action**: Extract to `tests/migrations/` folder, separate from prod

---

### Signal 5: Rapid Recent Velocity

Last 7 days = 22 migrations (vs. baseline 1-2 per day)

**Possible causes**:
- Response to production issue
- Development sprint finishing
- Multiple developers merging changes
- Automated migration generation

**Action**: Audit git history to understand context

---

## Consolidation Opportunities

### Safe to Consolidate
1. **Phase 1 baseline** + **Phase 2 fixes** → Single consolidated baseline
   - Reduces 14 migrations to 1
   - Make it idempotent and self-healing

2. **Multiple void fixes** → Single canonical void implementation
   - Consolidate logic, keep migration history

### Unsafe Without Review
1. **UUID-named migrations** — Purpose unclear, investigate first
2. **comprehensive_restoration** — Why two baselines?
3. **Test migrations** — Move to separate suite

### Archive Candidates
1. `draft_calculate_yield_distribution.sql` — Incomplete
2. All `_backup` tables in schema
3. Old yield function versions (v3, v4)

---

## Human Review Questions

1. **Why do we have 5 "restore_*" migrations + "comprehensive_restoration"?**
   - Indicates prior schema loss?
   - Multiple recovery attempts?
   - Should consolidate to single authoritative baseline

2. **What are the 13 UUID-named migrations doing?**
   - Are they necessary?
   - Can they be deleted?
   - Or should they be documented?

3. **Is `transactions_v1` truly gone?**
   - Was it corrupted/deleted intentionally?
   - Are there lingering references?

4. **Should test assertions be in migrations?**
   - Move 20260327102803 + 20260413135228 to test suite
   - Keep migrations schema-only

5. **Why 22 migrations in 7 days?**
   - Is this a response to production issues?
   - Or normal development velocity?
   - Check git history for context

---

## Recommendations

### Immediate (This Week)
1. Extract test assertions from migrations
2. Fix/comment-out 20260413135228 assertions to unblock local DB
3. Document why multiple "restore" migrations exist

### Short Term (Next Week)
1. Consolidate baseline + fixes into single authoritative migration
2. Clarify void/reissue logic and pick canonical function
3. Investigate and document 13 UUID migrations
4. Decide fate of backup tables

### Long Term (This Month)
1. Establish migration naming standard (no UUIDs unless necessary)
2. Separate test assertions into test migration suite
3. Document function versioning strategy
4. Create migration consolidation plan for cleanup

---

## Migration Checklist

- [ ] Extract test assertions
- [ ] Fix blocker migration 20260413135228
- [ ] Clarify "restore_*" vs "comprehensive_restoration" intent
- [ ] Investigate 13 UUID migrations
- [ ] Document function version strategy (yield v3/v4/v5, tx v1/v2)
- [ ] List candidate migrations for archival
- [ ] Establish naming standards for future migrations
