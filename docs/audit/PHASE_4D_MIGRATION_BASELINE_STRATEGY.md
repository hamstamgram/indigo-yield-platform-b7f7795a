# Phase 4D: Migration Baseline Strategy

**Status:** Planning Phase (2-3 days)  
**Date:** 2026-04-14  
**Owner:** Backend architecture team  
**Predecessor:** Phase 4A-4C (just deployed, 2026-04-14)

---

## Executive Summary

The codebase currently has **106 migrations** spanning March 7—April 14 (38 days). While Phase 1-3 cleanup removed technical debt, the migration baseline still contains:

- ~40 UUID-named, undocumented migrations
- Multiple fix/restore cycles indicating issue-driven development
- Restoration migrations suggesting historical schema churn
- 3 distinct phases layered on top of an obsolete March 7 baseline

**Recommendation:** Do NOT create a new baseline yet. Instead, stabilize for 4-6 weeks post-Phase 4, document the critical-path migrations, then plan baseline creation for mid-May or June when:
- Phase 4 watch windows complete
- Position Sync Phase 2 (if pursued) is stable
- All fix cycles from Phase 1-3 have been validated in production

---

## A. Current Migration Debt Analysis

### Migration Timeline Breakdown

| Period | Count | Characterization | Status |
|--------|-------|------------------|--------|
| **2026-03-07** | 1 | Foundation baseline | Obsolete baseline |
| **2026-03-07–03-20** | 20 | RPC restoration + drops + fixes | Phase 1 foundation work |
| **2026-03-20–04-10** | 60+ | UUID migrations (undocumented) | Issue-driven fixes, mostly undocumented |
| **2026-04-03–04-13** | 8 | Named fixes + comprehensive restoration | Phase 2-3 cleanup audit |
| **2026-04-14** | 4 | Phase 4 hardening (void/yield/reporting) | JUST DEPLOYED |
| **TOTAL** | **106** | — | — |

### Key Migration Patterns

**1. RPC Restoration Layer (2026-03-07 to 2026-03-08)**
```
- restore_dashboard_rpcs
- restore_apply_investor_transaction
- restore_investor_and_flow_rpcs
- restore_ib_commission_schedule
- restore_segmented_yield_rpcs
```
**Implication:** RPC surface was dropped and restored. Suggests unstable schema design early on.

**2. Early Fix Cycle (2026-03-09 to 2026-03-17)**
```
- fix_preview_volatility
- fix_tx_id_key_mismatch
- fix_adjustment_visibility
- fix_withdrawal_execution_date
- fix_distribution_type
```
**Implication:** Issues discovered in production/staging required hotfixes. Not consolidated into baseline.

**3. UUID Migration Blast (2026-03-19 to 2026-04-10)**
```
- 40+ migrations with UUIDs (902d22fe-d584-4292..., etc.)
- No semantic naming, no documentation in migration names
- Spanning 22 days of active development
```
**Implication:** Rapid, exploratory development. Likely includes both fixes and architectural experiments.

**4. Phase 1-3 Audit Cleanup (2026-04-03 to 2026-04-13)**
```
- fix_yield_deposit_day_exclusion (Phase 1 prep)
- comprehensive_restoration (Phase 1 foundation)
- drop_aum_views_batch_6 (Phase 3)
- isolate_repair_functions (Phase 3)
```
**Implication:** Controlled, documented cleanup work. These should remain in baseline.

**5. Phase 4 Hardening (2026-04-14)**
```
- 20260505_void_transaction_isolation (4A)
- 20260512_void_fund_level_locking (4B)
- 20260519_yield_domain_hardening_clean_state (4C)
- 20260526_consolidate_reporting_views (4C)
```
**Implication:** Stable, tested, production-deployed. These should remain in baseline.

---

## B. Remaining Migration Debt

### Critical vs. Non-Critical Migrations

**CRITICAL (must stay in baseline):**
1. Phase 1-3 cleanup audit migrations (isolate_repair_functions, drop_aum_views_batch_6, etc.)
2. Phase 4 hardening migrations (void isolation, locking, yield/reporting)
3. RPC restoration migrations (functions now in use, required for backward compatibility)
4. Named fix migrations (fix_withdrawal_execution_date, fix_yield_deposit_day_exclusion, etc.)

**CANDIDATE FOR CONSOLIDATION (review during baseline planning):**
1. UUID migration blast (2026-03-19 to 2026-04-10)
   - Need to trace each one to understand what it does
   - Risk: some may be experimental or duplicate fixes
   - Opportunity: consolidate if multiple UUIDs fix the same issue
2. Multiple restoration cycles (why drop then restore?)
   - Investigate whether restoration pattern is necessary or historical artifact

**DEBT INDICATORS:**
- No semantic naming for 40+ migrations
- No documentation tying UUIDs to issues/requirements
- Multiple "restore_*" migrations suggest schema instability
- Multiple "fix_*" migrations suggest reactive rather than proactive work

---

## C. Preconditions for Baseline Creation

Before creating a new baseline, the following must be true:

### 1. **Phase 4 Stability (2-4 weeks post-deployment)**
- [ ] 2-hour watch window completes without Level 3 issues
- [ ] 1-week monitoring shows no void/unvoid regressions
- [ ] 2-week monitoring shows no yield/AUM inconsistencies
- [ ] Lock functions in production use (metrics > 0 calls per day)

**Why:** Phase 4 is the newest, highest-risk code. Let it stabilize before flattening.

### 2. **Migration Documentation Complete**
- [ ] Every UUID migration has a documented purpose (issue/ticket)
- [ ] Understand what each fix_* migration fixed (root cause)
- [ ] Clarify which migrations are safe to consolidate vs. critical to preserve

**Why:** Undocumented migrations make baseline creation risky. A baseline that can't be understood can't be safely modified later.

### 3. **Position Sync Phase 2 Complete (if pursued) or Deferred**
- [ ] Either: PS-1 through PS-4 completed and stable
- [ ] Or: Explicitly defer Position Sync Phase 2, accept position sync debt
- [ ] Clear understanding of final position sync architecture

**Why:** If we pursue PS Phase 2, it will add 5-10 more migrations. Don't baseline until we know if that's happening.

### 4. **Fix Cycle Closed**
- [ ] No outstanding "Level 2: Regression" issues from Phase 1-3 cleanup
- [ ] No new fix_* migrations added in past 2 weeks
- [ ] All emergency hotfixes completed

**Why:** If we're still in reactive fix mode, baseline creation will just lock in the wrong state.

### 5. **RPC Surface Stable**
- [ ] All restore_* migrations now represent the canonical RPC surface
- [ ] No more drops/restores planned
- [ ] RPC interface documented (parameters, return types)

**Why:** Baseline must represent the authoritative API surface.

---

## D. Safest Sequencing for Baseline Creation

### Phase D-1: Migration Audit (1 week)

**Step 1a: Catalog UUID migrations**
- Generate SQL to list migration version, name, and first line of file
- For each UUID migration:
  - Extract the SQL operations (CREATE, ALTER, DROP, etc.)
  - Search git log for commit message that mentions the UUID
  - Determine: what did this change and why?

**Step 1b: Root cause analysis for fix_* migrations**
- For each fix_*, identify:
  - What was broken (symptom)
  - What was fixed (root cause)
  - Whether the fix is still needed or was reverted

**Step 1c: Classify for consolidation**
- Categorize each migration:
  - CRITICAL: Must stay in baseline (RPC, Phase 1-3 audit, Phase 4)
  - SAFE: Can consolidate without risk (multiple versions of same fix)
  - RISKY: Consolidate only with deep testing (foundational schema changes)
  - UNKNOWN: Investigate before deciding

**Output:** Migration audit document with classification and risk levels.

---

### Phase D-2: Precondition Validation (ongoing, 2-6 weeks)

**2a: Phase 4 watch window** (0—2 hours)
- Run 2-hour monitoring checkpoints
- Escalate any Level 3 issues to rollback

**2b: Post-Phase 4 stabilization** (days 1—14)
- Daily monitoring for void/yield/AUM anomalies
- Weekly metrics on lock function usage, yield success rate, statement accuracy
- Document any Level 1/2 issues for future hardening

**2c: Position Sync decision** (by 2026-04-21)
- Decide: pursue Phase 3 (PS-1 through PS-4) or defer?
- If pursue: defer baseline work until Phase 3 complete
- If defer: baseline work can proceed (fewer migrations to worry about)

**Output:** Precondition checklist with go/no-go decision for baseline work.

---

### Phase D-3: Baseline Creation (if preconditions met, 3—5 days)

**3a: Generate new baseline migration**

```sql
-- 20260505000000_consolidate_baseline.sql
-- Purpose: Flatten 106 migrations into single baseline
-- Scope: Preserve all CRITICAL schema and functions
-- Excludes: All UUID migrations, all fix_* migrations (consolidated into new state)

-- Start with production schema snapshot (pg_dump)
-- Verify:
--   1. All Phase 1-3 cleanup still applied (tables dropped, functions removed)
--   2. All Phase 4 hardening functions exist (void_with_lock, etc.)
--   3. All RPC surface intact
-- End state: Same schema as current, but in 1 migration instead of 106
```

**3b: Validate baseline equivalence**
- Generate schema hash of current production
- Apply baseline migration to development branch
- Generate schema hash of branch
- Assert: hashes match (schema is identical)

**3c: Test rollback path**
- Can you downgrade from new baseline to old state?
- Can you upgrade from old state to new baseline?
- Rollback procedure documented

**Output:** New baseline migration, validated and tested.

---

### Phase D-4: Deployment & Cutover (2—3 days)

**4a: Create development branch from baseline**
- Branch from baseline, apply baseline migration
- Verify all tests pass
- Verify position sync, yield, void operations work normally

**4b: Merge to main**
- Baseline is now the authoritative starting point for future development
- Old migrations remain in history (git), but new branches start from baseline

**4c: Document baseline contract**
- Update README with: "As of 2026-05-XX, baseline includes X functions, Y views, Z RPC endpoints"
- Document what should NOT change in baseline (canonical positions, yield v5, etc.)

**Output:** Merged baseline, documented, ready for future development.

---

## E. What Should NOT Be Flattened

### Preserve in Baseline (Immutable Contract)

**1. Phase 1-3 Cleanup Decisions**
- Removed v3 yield functions (v5 is canonical)
- Removed QA helper functions
- Removed 13 stale AUM views
- Removed backup tables
- Reason: These removals are **intentional architectural decisions**, not debt

**2. Phase 4 Hardening Functions**
- void_transaction_with_lock()
- unvoid_transaction_with_lock()
- apply_yield_distribution_v5_with_lock()
- Reason: New production functions, critical for avoiding race conditions

**3. RPC Surface**
- dashboard_rpcs
- apply_investor_transaction_rpc
- segmented_yield_rpcs
- Reason: External consumers depend on these

**4. Position Sync Architecture** (if Phase 3 pursued)
- Whatever PS-1 through PS-4 define as canonical
- Reason: Complex interdependencies, not safe to consolidate

### Do Consolidate (Merge into Baseline State)

**1. UUID Migrations**
- Extract what they changed, merge changes into baseline
- Discard migration files themselves (they're just exploratory history)
- Reason: No semantic value, just noise

**2. Fix_* Migrations (once root cause investigated)**
- If fix_withdrawal_execution_date fixed column X, baseline includes the fixed state
- Migration file itself can be discarded
- Reason: Baseline should represent corrected state, not history of corrections

**3. Multiple Restore Cycles**
- If RPC was dropped then restored, baseline includes the restored state only
- Reason: Final state is what matters, not the churn

---

## F. Recommendation: Timeline & Governance

### Recommended Baseline Creation Timeline

```
2026-04-14: Phase 4 deployed, watch window active
2026-04-16: Watch window complete (if no rollbacks)
2026-04-21: Phase 4 stability report (1 week metrics)
2026-04-28: Precondition review (2 weeks post-deployment)
2026-05-05: Phase 4D-1 migration audit complete (1 week)
2026-05-12: Phase 4D-2 precondition validation complete (2 weeks total)
2026-05-19: Decision: Phase 3 pursue or defer?
2026-05-26: Phase 4D-3 baseline creation (if preconditions met)
2026-06-02: Baseline merged to main
```

**Why this timeline?**
- 2+ weeks post-Phase 4 deployment = safe stability window
- 1 week audit work = understand migration landscape
- Decisions point at 3 weeks = clear go/no-go on Position Sync Phase 3
- Baseline ready mid-June (6 weeks post-Phase 4)

### Governance Rules

**RULE 1: No baseline until Phase 4 stable**
- Phase 4 must have 2+ weeks of production operation
- No new migrations rolled back
- All metrics (void latency, yield success, AUM consistency) stable

**RULE 2: Document before consolidating**
- Every UUID migration must be explained before baseline creation
- If you can't explain what a migration does, don't consolidate it

**RULE 3: Preserve architectural intent**
- Phase 1-3 cleanup decisions (removals) are intentional, not debt
- Phase 4 hardening (new functions) is non-negotiable
- Baseline is the contract for future development, guard it carefully

**RULE 4: Test equivalence**
- New baseline must produce identical schema to current state
- Verified by automated schema comparison (hash or diffing tool)
- Never merge a baseline unless this is proven

---

## G. Critical Success Factors

| Factor | Metric | Target |
|--------|--------|--------|
| Phase 4 stability | No Level 3 issues in 2-week window | 100% pass |
| Migration understanding | % of migrations with documented purpose | 95%+ |
| Baseline equivalence | Schema hash match (current vs baseline) | Exact match |
| Rollback validation | Can rollback baseline successfully | Yes |
| Team confidence | Team comfort with baseline approach | High |

---

## H. Risk Register

| Risk | Probability | Impact | Mitigation |
|------|-------------|--------|-----------|
| Phase 4 regression discovered post-baseline | Medium | High | Wait 2+ weeks post-Phase 4 before baseline creation |
| UUID migration consolidation loses important logic | Medium | High | Audit migrations before consolidating; preserve migration files in git history |
| Baseline doesn't match production schema | Low | Critical | Automated schema comparison tool required; always verify before merge |
| Future developers don't understand baseline decisions | High | Medium | Document baseline contract (what is immutable, why) |
| Baseline creation takes longer than 3-5 days | Medium | Low | Start migration audit early (Phase D-1) |

---

## Summary: Next Steps

### Immediate (2026-04-14 to 2026-04-16)
- [ ] Complete Phase 4 2-hour watch window
- [ ] No critical issues found = green light to continue
- [ ] Document any Level 1/2 issues for backlog

### Short-term (2026-04-21 to 2026-05-05)
- [ ] Run Phase 4D-1 migration audit (1 week)
- [ ] Catalog 106 migrations, understand each one
- [ ] Classify as CRITICAL / SAFE / RISKY / UNKNOWN
- [ ] Decide: pursue Phase 3 or defer?

### Medium-term (2026-05-05 to 2026-05-26)
- [ ] Monitor Phase 4 stability (2—4 weeks post-deployment)
- [ ] Validate all preconditions met
- [ ] Plan Phase 4D-3 baseline creation (only if preconditions met)

### Long-term (2026-05-26 to 2026-06-02)
- [ ] Create baseline migration (if decision is "go")
- [ ] Test baseline equivalence and rollback
- [ ] Merge baseline to main

### Deferred (if Position Sync Phase 3 pursued)
- [ ] Defer baseline creation until Phase 3 complete
- [ ] Redo Phase 4D analysis with PS-1 through PS-4 included
- [ ] Baseline created mid-July instead

---

## Appendix: Migration Debt Snapshot (2026-04-14)

```
Total migrations: 106
Foundation baseline: 20260307000000 (obsolete, should be replaced)
RPC restoration: 5 migrations
Early fixes: 5 migrations
UUID blast: 40+ migrations (undocumented)
Phase 1-3 cleanup: 6 migrations (documented)
Phase 4 hardening: 4 migrations (documented, production-deployed)

Debt indicators:
- 40+ migrations without semantic naming
- Multiple restore/drop cycles (schema instability?)
- Multiple fix_* migrations (reactive development pattern)
- No consolidated baseline since March 7

Next baseline: Mid-June 2026 (if preconditions met)
```

