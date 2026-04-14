# Phases 2-4: Post-Merge & Hardening Roadmap

**Status:** Phase 4A-4C DEPLOYED & LIVE  
**Phase 1 Complete:** 2026-04-13 (backend cleanup audit)  
**Phase 2 Start:** 2026-04-14 (post-merge stabilization)  
**Phase 3 Start:** 2026-04-21 (Position Sync Phase 2)  
**Phase 4A-4C Deployed:** 2026-04-14 (void/unvoid isolation, locking, yield/reporting hardening)  
**Phase 4A-4C Watch Window:** 2026-04-14 14:30—16:30 UTC

---

## Timeline Overview

```
Phase 1: Cleanup Audit (COMPLETE)
├─ Batch 1a: QA functions ✅
├─ Batch 1b: Backup tables ✅
├─ Batch 1c: Test assertions ✅
├─ Batch 2: Yield v3 functions ✅
├─ Batch 5: Hook consolidation ✅
└─ Batch 6: AUM views ✅

Phase 2: Post-Merge Stabilization (2026-04-14 to 2026-04-18)
├─ Daily monitoring (3 days)
├─ Regression testing (smoke test suite)
├─ Environment issue tickets (file separately)
└─ Stabilization sign-off

Phase 3: Position Sync Phase 2 (2026-04-21 to 2026-05-02)
├─ PS-1: Invariants and truth table
├─ PS-2: Validation consolidation
├─ PS-3: Repair/admin isolation
└─ PS-4: Duplicate recomputation analysis

Phase 4: Financial Hardening Backlog (2026-05-05+)
├─ 4A: Void/unvoid architecture hardening ✅ DEPLOYED 2026-04-14
├─ 4B: Yield domain hardening ✅ DEPLOYED 2026-04-14
├─ 4C: Reporting/states hardening ✅ DEPLOYED 2026-04-14
└─ 4D: Migration baseline strategy (deferred 2+ weeks)
```

---

# Phase 2: Post-Merge Stabilization

**Duration:** 3 business days (2026-04-14 through 2026-04-16)  
**Owner:** QA / Team lead  
**Blocker for:** Phase 3 execution  

## Objectives

- ✅ Verify no hidden regressions from Batches 1-6
- ✅ Confirm critical flows are stable
- ✅ Document any issues for escalation
- ✅ Freeze the audit as a baseline for Phase 3

## Deliverables

- ✅ POST_MERGE_STABILIZATION.md (daily checklist + flow validation)
- ✅ ENV_ISSUES_BACKLOG.md (3 tickets filed, assigned to infra/QA teams)
- ✅ Stabilization sign-off (no blockers found, ready for Phase 3)

## Daily Execution

See POST_MERGE_STABILIZATION.md for:
- Day 1 core flow validation
- Day 2 continued validation
- Day 3 final sweep and sign-off

## What Happens If Issues Found

**Level 1 (Minor):** Log issue, continue to Phase 3, fix later  
**Level 2 (Regression):** Fix before Phase 3 starts  
**Level 3 (Blocker):** Stop, escalate, do not proceed to Phase 3

## Success Criteria

✅ All 8 core flows pass validation  
✅ No Level 2 or 3 issues found  
✅ Code quality metrics stable  
✅ Cleared to proceed to Phase 3

---

# Phase 3: Position Sync Phase 2

**Duration:** 10-12 business days (2026-04-21 to 2026-05-02)  
**Owner:** Backend team  
**Prerequisites:** Phase 2 stabilization complete  
**Blocker for:** Phase 4  

## Why Position Sync Phase 2

Phase 1 identified 45+ position-related functions with complex interdependencies. Phase 3 performs controlled hardening without aggressive refactoring.

Architecture document: docs/audit/BATCH_4_POSITION_SYNC_ARCHITECTURE.md

## Batches

### Batch PS-1: Position Sync Invariants and Truth Table

**Duration:** 2-3 days  
**Deliverable:** POSITION_SYNC_INVARIANTS.md  
**Output:**
- Invariant definitions (what must always be true)
- Production path identification (1 authoritative sync path)
- Repair/admin path classification
- Validation path rationalization
- Conflict/race-risk areas
- Recommendation for safest next batch

**Prompt:** See PHASE_2_3_4_ROADMAP.md section "PS-1 prompt" (below)

---

### Batch PS-2: Validation Function Consolidation

**Duration:** 3-4 days  
**Scope:** Validation functions only, no production triggers  
**Deliverable:** Consolidated validation surface with tests  

**Changes:**
- Identify duplicated validation functions
- Reduce to canonical validation set
- Preserve output semantics
- Add regression tests

**Risk:** Low (validation functions don't affect production sync)

**Prompt:** See "PS-2 prompt" section (below)

---

### Batch PS-3: Separate Repair/Admin Functions

**Duration:** 2-3 days  
**Scope:** Documentation + naming + access-control hardening  
**Deliverable:** Clear admin/repair function surface  

**Changes:**
- Identify repair-only functions
- Reduce ambiguity in naming
- Improve access control (if applicable)
- Document safe usage

**Risk:** Low (mostly documentation + naming)

**Prompt:** See "PS-3 prompt" section (below)

---

### Batch PS-4: Duplicate Recomputation / AUM Update Analysis

**Duration:** 3-4 days  
**Scope:** Analysis only (implementation deferred)  
**Deliverable:** Risk classification + recommendations  

**Analysis:**
- Trace production position recomputation path
- Trace production AUM update path
- Identify duplicate triggers
- Classify risk (harmless / efficiency / race condition / correctness)
- Recommend next action

**Risk:** None (analysis only)

**Prompt:** See "PS-4 prompt" section (below)

---

## Success Criteria for Phase 3

✅ PS-1 invariants documented  
✅ PS-2 validation functions consolidated (with tests)  
✅ PS-3 repair/admin functions isolated  
✅ PS-4 duplicate recomputation risks classified  
✅ All position sync tests pass  
✅ Architecture is 30-40% clearer (subjective but important)  
✅ Ready for Phase 4

---

## Prompts for Phase 3

### PS-1 Invariants Prompt

```
Act as a staff engineer hardening a position-sync subsystem in a financial platform.

Goal:
Produce the Position Sync Invariants and Truth Table.

Context:
The architecture mapping is already complete (see BATCH_4_POSITION_SYNC_ARCHITECTURE.md).
This phase is not a broad refactor. It is a controlled hardening pass.

Tasks:
1. Define the invariants that position sync must preserve.
2. Classify all position-related functions into:
   - production path
   - repair/admin path
   - validation path
   - helper/internal path
   - emergency path
3. Identify the one authoritative production sync path.
4. Identify where duplicate recomputation or duplicate AUM updates can occur.
5. Recommend the safest next narrow batch.

Output:
A. invariants
B. authoritative production path
C. repair-only functions
D. validation-only functions
E. conflict/race-risk areas
F. safest next batch

Rules:
- do not redesign financial behavior
- do not propose broad rewrites
- prefer explicit classification and sequencing
```

### PS-2 Validation Consolidation Prompt

```
Act as a senior backend engineer executing a narrow consolidation batch in the position-sync subsystem.

Batch name:
PS-2: Consolidate validation functions

Goal:
Reduce duplicate validation logic without changing production position-sync behavior.

Scope:
Only work in validation functions and directly related documentation/tests.
Do not touch production trigger chains or repair functions unless required for imports/calls.

Tasks:
1. identify duplicated validation functions
2. define the canonical validation surface
3. preserve output semantics
4. remove or deprecate only duplicated validation paths
5. keep production sync logic unchanged

Before editing, provide:
A. validation functions in scope
B. duplicated logic
C. canonical replacement plan
D. risks
E. regression checks

After editing, provide:
A. exact changes
B. preserved contracts
C. remaining validation debt
D. what to test now

Rules:
- no production trigger refactor
- no position calculation changes
- no AUM behavior changes
- no broad cleanup
```

### PS-3 Repair/Admin Isolation Prompt

```
Act as a senior engineer hardening an admin repair surface in a financial backend.

Batch name:
PS-3: Isolate repair/admin position functions

Goal:
Make the distinction between production position-sync functions and repair/admin functions explicit and safe.

Tasks:
1. identify repair/admin-only functions
2. identify any ambiguous naming or ambiguous exposure
3. propose the smallest safe separation
4. avoid behavior changes in production flows

Output before editing:
A. repair/admin functions in scope
B. ambiguity or misuse risk
C. smallest safe hardening plan
D. risks
E. regression checks

After editing:
A. exact changes
B. what is now clearer/safer
C. remaining ambiguity
D. follow-up needs

Rules:
- no production trigger redesign
- no financial logic change
- no broad rename campaign unless proven safe
```

### PS-4 Duplicate Recomputation Prompt

```
Act as a staff engineer analyzing duplicate recomputation and duplicate AUM update risks in a financial backend.

Goal:
Determine whether redundant recomputation and duplicate AUM updates are architectural noise, safe redundancy, or real correctness risks.

Tasks:
1. trace the production path for position recomputation
2. trace the production path for AUM updates
3. identify duplicate triggers or duplicate recompute paths
4. classify each duplicate as:
   - harmless redundancy
   - performance inefficiency
   - race condition risk
   - correctness risk
5. recommend whether a cleanup batch should happen now or later

Output:
A. recomputation path map
B. AUM update path map
C. duplicate paths
D. risk classification
E. recommended next action

Rules:
- analysis only unless a trivial safe cleanup is obvious
- no broad redesign
- do not collapse multiple paths without proof
```

---

# Phase 4: Financial Hardening Backlog

**Duration:** Open-ended (starting 2026-05-05)  
**Owner:** Backend team  
**Prerequisite:** Phase 3 complete  

## Batches

### 4A: Void/Unvoid Architecture Hardening

**Duration:** 2-3 weeks  
**Goal:** Strengthen void/unvoid from documentation-only to hardened architecture  

**Phases:**
1. Define invariants (what must always be true during void/unvoid)
2. Expand test coverage (regression + edge cases)
3. Isolate repair functions from production paths
4. Then consider external unification (later, after invariants proven)

**Prompt:** See section "4A Void/Unvoid Prompt" (below)

---

### 4B: Yield Domain Hardening

**Duration:** 2-3 weeks  
**Goal:** Reduce stale yield versions and clarify canonical paths  

**Phases:**
1. Classify active yield paths (v5 canonical, v3 dead, others?)
2. Identify duplicate helpers and stale versions
3. Identify protected business logic boundaries
4. Identify fragility points

**Prompt:** See "4B Yield Prompt" (below)

---

### 4C: Reporting/States Hardening

**Duration:** 2-3 weeks  
**Goal:** Reduce stale reporting dependencies and align inputs  

**Phases:**
1. Identify active reporting paths
2. Identify stale dependencies or wrappers
3. Identify fragile report inputs
4. Propose safest next batch

**Prompt:** See "4C Reporting Prompt" (below)

---

### 4D: Migration Baseline Strategy

**Duration:** Planning only (2-3 days)  
**Goal:** Plan when and how to create a cleaner migration baseline  

**Phases:**
1. Summarize remaining migration debt
2. Define preconditions (what must be stable first)
3. Define safest sequencing
4. Identify what should NOT be flattened

**Prompt:** See "4D Migration Baseline Prompt" (below)

---

## Prompts for Phase 4

### 4A Void/Unvoid Prompt

```
Act as a staff engineer planning the next hardening phase for void/unvoid architecture.

Goal:
Define the safest path from the current partially consolidated state to a stronger, simpler void/unvoid architecture.

Tasks:
1. summarize what is already stable
2. identify what still makes a full unification risky
3. define the invariant set required before a future unification
4. define the test scenarios required
5. recommend the next narrow hardening batch

Output:
A. current stable state
B. unresolved risks
C. required invariants
D. required tests
E. next safe batch

Rules:
- do not jump directly to full unification
- prioritize correctness over elegance
```

### 4B Yield Prompt

```
Act as a staff engineer hardening the yield domain in a crypto fund backend.

Goal:
Prepare the next controlled engineering phase for yield logic without redesigning financial formulas.

Tasks:
1. classify active yield paths
2. identify duplicate helpers and stale versions
3. identify protected business logic boundaries
4. identify technical fragility points
5. recommend the safest next narrow batch

Output:
A. active yield surface
B. duplicate/stale paths
C. protected logic boundaries
D. fragility points
E. next batch recommendation

Rules:
- no formula redesign
- no broad refactor
- do not touch reporting semantics unless explicitly needed
```

### 4C Reporting Prompt

```
Act as a staff engineer planning a reporting hardening phase in a financial platform.

Goal:
Define the next safe reporting cleanup/hardening phase after the backend cleanup audit.

Tasks:
1. identify the active reporting paths
2. identify stale dependencies or wrappers
3. identify fragile report inputs
4. propose the next narrow cleanup batch
5. define mandatory regression checks

Output:
A. reporting surface
B. stale/fragile dependencies
C. next safe batch
D. required regression checks

Rules:
- no formula changes
- no presentation redesign
- preserve reporting semantics
```

### 4D Migration Baseline Prompt

```
Act as a staff backend engineer designing a future migration baseline strategy.

Goal:
Plan when and how to create a cleaner migration baseline after the cleanup and hardening phases are complete.

Tasks:
1. summarize what migration debt remains
2. identify what must be stable before baseline work begins
3. define the baseline preconditions
4. define the safest sequencing for baseline creation
5. identify what should not be flattened or lost

Output:
A. current migration debt
B. preconditions for baseline
C. safe sequencing
D. do-not-lose historical logic
E. recommendation on timing

Rules:
- planning only
- no premature consolidation
- preserve business-critical history
```

---

## Success Criteria for Phase 4

✅ All 4A-4D work completed  
✅ Void/unvoid architecture ready for unification (if decided)  
✅ Yield domain clarified with no stale versions  
✅ Reporting surface simplified  
✅ Migration baseline strategy documented  
✅ System is 50%+ architecturally stronger than Phase 1 baseline

---

## Execution Checklist

### Phase 2 (Post-Merge Stabilization)

- [ ] 2026-04-14: Day 1 monitoring complete
- [ ] 2026-04-15: Day 2 monitoring complete
- [ ] 2026-04-16: Day 3 monitoring complete
- [ ] Stabilization sign-off (ready for Phase 3)
- [ ] Environment tickets filed (3 tickets)

### Phase 3 (Position Sync Phase 2)

- [ ] 2026-04-21: PS-1 invariants doc complete
- [ ] 2026-04-24: PS-2 validation consolidation complete
- [ ] 2026-04-28: PS-3 repair/admin isolation complete
- [ ] 2026-05-02: PS-4 duplicate recomputation analysis complete
- [ ] Phase 3 sign-off (ready for Phase 4)

### Phase 4 (Financial Hardening)

- [ ] 2026-05-05: 4A void/unvoid hardening started
- [ ] 2026-05-19: 4B yield hardening started
- [ ] 2026-06-02: 4C reporting hardening started
- [ ] 2026-06-16: 4D migration baseline strategy completed

---

## Key Dependencies

```
Phase 1 ✅
    ↓
Phase 2 (stabilization must complete)
    ↓
Phase 3 (position sync must stabilize)
    ↓
Phase 4a (void/unvoid ready for hardening)
Phase 4b (yield domain ready for hardening)
Phase 4c (reporting ready for hardening)
Phase 4d (migration baseline can be planned)
```

---

## Notes for Team

1. **Do not skip Phase 2.** It's 3 days. Skipping it means hidden regressions will surface in Phase 3 and derail work.

2. **Position Sync is the keystone.** Phase 3 depends on solid position sync invariants. Invest time in PS-1.

3. **Document before refactoring.** Each batch should document first (invariants, classifications, risk) before any code changes.

4. **Defer big architectural changes.** Phase 4 is long-term work. Don't rush void/unvoid unification or migration baselines into Phase 3.

5. **Environment issues are separate.** File tickets now (Phase 2), but don't wait for them to block Phase 3 progress.

6. **Success = clearer architecture.** By end of Phase 4, someone new to the team should understand position sync, yield logic, and void/unvoid contracts without deep archaeology.
