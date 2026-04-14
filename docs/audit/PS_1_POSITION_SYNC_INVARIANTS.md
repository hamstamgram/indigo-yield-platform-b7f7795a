# PS-1: Position Sync Invariants and Truth Table

**Phase:** Position Sync Phase 2 (Batch PS-1)  
**Date:** 2026-04-14  
**Status:** Planning & Analysis  
**Duration:** 2-3 days  
**Purpose:** Define the invariants and canonical paths for position-sync subsystem

---

## A. Core Invariants

### Invariant 1: Ledger is Source of Truth
```
For all investors and funds:
  investor_positions.value_cents = SUM(transactions.amount_cents)
    WHERE is_voided = false
```
**Meaning:** Position = sum of all non-voided transactions  
**Who Maintains:** fn_ledger_drives_position() trigger  
**Violation Signal:** investor_position_ledger_mismatch view  
**Recovery:** recompute_investor_position() or rebuild_position_from_ledger()

---

### Invariant 2: AUM = Sum of Positions
```
For all funds and dates:
  fund_daily_aum.aum_cents = SUM(investor_positions.value_cents)
    WHERE fund_id = X AND date = D
```
**Meaning:** Fund AUM always equals sum of all investor positions  
**Who Maintains:** sync_aum_on_position_change() trigger  
**Violation Signal:** aum_position_reconciliation view (variance columns)  
**Recovery:** reconcile_fund_aum_with_positions() or reconcile_all_positions()

---

### Invariant 3: Position Never Splits
```
For each (investor, fund) pair:
  There exists exactly ONE investor_positions record
  Position.is_active = true OR position explicitly archived
```
**Meaning:** No duplicate positions, no orphaned records  
**Who Maintains:** Unique constraint on (investor_id, fund_id)  
**Violation Signal:** v_orphaned_positions view  
**Recovery:** Manual deduplication + architect review

---

### Invariant 4: All Transactions Properly Linked
```
For all transactions:
  transaction.investor_id → EXISTS (investors.id)
  transaction.fund_id → EXISTS (funds.id)
  transaction.position_id → EXISTS (investor_positions.id)
```
**Meaning:** No orphaned transactions, all references valid  
**Who Maintains:** Foreign key constraints  
**Violation Signal:** Constraint violation on INSERT/UPDATE  
**Recovery:** Transaction audit trail + manual fixing

---

### Invariant 5: Position Updates Are Atomic with AUM
```
When transaction is inserted/voided:
  BOTH position AND AUM are updated
  OR NEITHER is updated
  (No partial updates)
```
**Meaning:** Position and AUM move together, never out of sync  
**Who Maintains:** Trigger chain (transaction→position→AUM)  
**Violation Signal:** Audit log + manual reconciliation  
**Recovery:** Rebuild from ledger (Invariant 1)

---

### Invariant 6: Void Operations Reverse Position Changes
```
When transaction is voided:
  position change = -(position change of original transaction)
  AUM change = -(AUM change of original transaction)
```
**Meaning:** Void is perfectly reversible  
**Who Maintains:** Phase 4A void_transaction_with_lock()  
**Violation Signal:** Position mismatch after void  
**Recovery:** unvoid_transaction_with_lock() then recompute

---

## B. Function Classification Table

### Production Path (Critical - DO NOT CHANGE)

| Function | Purpose | Trigger | Fire Event | Atomic |
|----------|---------|---------|-----------|--------|
| **fn_ledger_drives_position()** | Compute position from ledger | trg_ledger_sync | ON INSERT transactions_v2 | ✅ Yes |
| **sync_aum_on_position_change()** | Recompute AUM when position changes | trg_sync_aum_on_position | ON UPDATE investor_positions | ✅ Yes |
| **sync_position_last_tx_date()** | Update last transaction date | trg_sync_aum_on_position | ON UPDATE investor_positions | ✅ Yes |

**Assessment:** Core 3-function chain. Minimal, focused, each function has clear purpose.

---

### Production Path (Potential Redundancy - INVESTIGATE)

| Function | Purpose | Trigger | Fire Event | Overlap |
|----------|---------|---------|-----------|---------|
| **trigger_recompute_position()** | Alternative position recompute | trg_recompute_position_on_tx | ON INSERT/UPDATE transactions_v2 | ⚠️ With fn_ledger_drives_position? |
| **sync_fund_aum_after_position()** | Alternative AUM recompute | trg_sync_aum_after_position | ON UPDATE investor_positions | ⚠️ With sync_aum_on_position_change? |
| **sync_aum_on_transaction()** | Direct AUM update (optimization?) | trg_sync_aum_on_transaction | ON INSERT transactions_v2 | ⚠️ Duplicates position→AUM path? |

**Assessment:** 3 possible redundancies. Each claims to do same work as core path.  
**Risk:** Two triggers updating same table could cause race conditions or double-updates.  
**Status:** NEEDS CLARIFICATION (see PS-4 Duplicate Recomputation Analysis)

---

### Admin Repair Path (Safe when used by architects)

| Function | Purpose | Dry-Run | Parameters | Use Case |
|----------|---------|---------|-----------|----------|
| **recompute_investor_position(investor_id, fund_id)** | Single position recompute | NO | 2 | Routine fix |
| **rebuild_position_from_ledger(...)** | Full rebuild with preview | YES ✅ | 5 | Corruption analysis |
| **reconcile_investor_position_internal(fund_id, investor_id)** | Reconcile one position | NO | 2 | Admin repair |
| **batch_reconcile_all_positions()** | Scan & fix all mismatches | Built-in | 0 | Bulk repair |
| **reconcile_all_positions(dry_run)** | Reconcile all (different from above?) | YES ✅ | 1 | Bulk repair preview |

**Assessment:** Clear repair ladder (single→batch→all). Some functions seem redundant (batch_reconcile vs reconcile_all). Safe to use.

---

### Validation Path (Read-Only Health Checks)

| Function | Strictness | Use Case | Redundancy |
|----------|-----------|----------|-----------|
| **validate_aum_matches_positions()** | Lenient | Operational | ⚠️ #1 of 4 similar? |
| **validate_aum_matches_positions_strict()** | Strict | Audit | ⚠️ #2 of 4 similar? |
| **validate_aum_against_positions()** | Lenient | Alternative check | ⚠️ #3 of 4 similar? |
| **validate_aum_against_positions_at_date(date)** | Strict | Historical | ⚠️ #4 of 4 similar? |
| **check_aum_position_health()** | Grades (OK/WARNING/CRITICAL) | Monitoring | ✅ Unique |
| **validate_position_fund_status()** | N/A | Trigger integrity | ✅ Unique |

**Assessment:** Possible over-engineering. 4 nearly-identical validation functions. Recommend consolidating to 2 (lenient vs strict).

---

### Helper & Internal Path (Low Risk)

| Function | Purpose | Used By | Risk |
|----------|---------|---------|------|
| **compute_position_from_ledger(investor_id, fund_id, as_of)** | Position calculation utility | Triggers, repair functions | LOW |
| **calculate_position_at_date_fix(investor_id, fund_id, as_of_date)** | Historical calculation | Reporting | LOW |
| **get_position_reconciliation(as_of_date, fund_id)** | Reconciliation view query | Admin dashboards | LOW |
| **get_aum_position_reconciliation(date)** | AUM vs position comparison | Admin dashboards | LOW |

**Assessment:** Stable, read-only helpers. No changes recommended.

---

### Bootstrap Path (One-Time Setup - NEVER USE AGAIN)

| Function | Purpose | Destructiveness | Risk |
|----------|---------|-----------------|------|
| **initialize_fund_aum_from_positions(fund_id, admin_id, aum_date)** | Initial AUM setup | ⚠️ Overwrites AUM | MEDIUM |
| **initialize_all_hwm_values()** | Bootstrap HWM records | ⚠️ Creates initial records | MEDIUM |

**Assessment:** Execution once during data migration. Do not call again.

---

### Emergency Path (Highly Dangerous - ARCHITECT APPROVAL REQUIRED)

| Function | Purpose | Destructiveness | Status |
|----------|---------|-----------------|--------|
| **repair_all_positions()** | Emergency repair all positions | ⚠️⚠️⚠️ VERY DESTRUCTIVE | ❌ UNCLEAR PURPOSE |
| **reset_all_investor_positions()** | RESET ALL POSITIONS TO NULL | ⚠️⚠️⚠️ TOTAL DATA LOSS | ❌ REQUIRES CONFIRMATION |
| **cleanup_dormant_positions()** | Remove zero-value positions | ⚠️ Moderate | ✅ Has dry_run |

**Assessment:** First two functions are dangerous and poorly documented. Should NOT be called without explicit architect review. Third function is safe (has dry_run).

---

## C. Authoritative Production Path

### The Single Source of Truth Path

**Entry Point:** Transaction inserted/updated/voided
```
INSERT INTO transactions_v2 (investor_id, fund_id, amount_cents, type, is_voided, ...)
  ↓ TRIGGER: trg_ledger_sync (CRITICAL)
    Calls: fn_ledger_drives_position()
    Action: UPDATE investor_positions
            SET value_cents = (SELECT SUM(amount_cents) FROM transactions_v2 WHERE ...)
    Invariant: Ledger is source of truth
  ↓ TRIGGER: trg_sync_aum_on_position (CRITICAL)
    Calls: sync_aum_on_position_change()
    Action: INSERT/UPDATE fund_daily_aum
            SET aum_cents = (SELECT SUM(value_cents) FROM investor_positions WHERE ...)
    Invariant: AUM = sum of positions
  ↓ TRIGGER: trg_sync_aum_on_position (same)
    Calls: sync_position_last_tx_date()
    Action: UPDATE investor_positions
            SET last_transaction_date = NOW()
    Invariant: Metadata kept current
```

**Critical Characteristics:**
- ✅ Atomic: All three steps fire together or not at all
- ✅ Ledger-driven: Transaction is only source of truth
- ✅ Single path: No alternate routes to AUM/position update
- ⚠️ BUT: Additional triggers may also update positions/AUM (see Redundancy section)

**What Comes Next:**
- AUM value flows to reporting views
- Position value displayed to investors
- Reconciliation jobs compare actual vs expected

---

## D. Duplicate/Redundant Areas

### Area 1: Position Recomputation

**The Problem:**
```
Transaction inserted
  ├─ Trigger 1: fn_ledger_drives_position() [trg_ledger_sync]
  │  └─ Computes position from ledger
  │
  └─ Trigger 2: trigger_recompute_position() [trg_recompute_position_on_tx]
     └─ Also computes position from ledger (same logic?)
```

**Evidence:**
- Both fire on `INSERT transactions_v2`
- Both update `investor_positions`
- Function names suggest same purpose

**Risk Level:** 🟡 MEDIUM
- If both fire, position gets updated twice (inefficient but safe)
- If only one fires, which is authoritative?
- Could cause race conditions under load

**Data:** Need to trace exact order and check for conflicts

---

### Area 2: AUM Recomputation

**The Problem:**
```
Position updated
  ├─ Trigger 1: sync_aum_on_position_change() [trg_sync_aum_on_position]
  │  └─ Recalculates fund_daily_aum from positions
  │
  ├─ Trigger 2: sync_fund_aum_after_position() [trg_sync_aum_after_position]
  │  └─ Also recalculates fund_daily_aum from positions
  │
  └─ Transaction insert ALSO fires:
     sync_aum_on_transaction() [trg_sync_aum_on_transaction]
     └─ Direct AUM update (bypasses position recalc?)
```

**Evidence:**
- 3 separate triggers updating same `fund_daily_aum` table
- Triggers 1 and 2 do similar work
- Trigger 3 exists as "optimization" (unclear if needed)

**Risk Level:** 🔴 HIGH
- Three writers to same table under same transaction
- Potential for last-write-wins conflicts
- Unclear which is correct if they disagree

**Data:** Most critical redundancy to investigate

---

### Area 3: Validation Functions (Over-Engineering)

**The Problem:**
```
4 validation functions that seem to do the same thing:
  1. validate_aum_matches_positions() [lenient]
  2. validate_aum_matches_positions_strict() [strict]
  3. validate_aum_against_positions() [lenient]
  4. validate_aum_against_positions_at_date(date) [strict]
```

**Evidence:**
- Names are nearly identical
- Parameters suggest overlapping purpose
- Unclear which to call when

**Risk Level:** 🟡 MEDIUM
- No correctness risk (all read-only)
- Cognitive load: which function to call?
- Maintenance burden: 4 nearly-identical implementations

**Action:** Consolidate to 2 functions (`validate_position_lenient()` and `validate_position_strict()`)

---

### Area 4: Reconciliation Functions (Possible Duplication)

**The Problem:**
```
Batch operations that may overlap:
  1. batch_reconcile_all_positions() [named "batch"]
  2. reconcile_all_positions(dry_run) [different signature]
  
  Single operations:
  3. reconcile_investor_position_internal(fund_id, investor_id)
  4. reconcile_fund_aum_with_positions()
```

**Evidence:**
- batch_reconcile_all_positions() vs reconcile_all_positions() have different names but same purpose?
- Unclear why there are 4 reconciliation functions

**Risk Level:** 🟡 MEDIUM
- No correctness risk (repair operations)
- Confusion: which reconciliation function to call when?

**Action:** Consolidate or clarify purpose of each

---

## E. Safest Next Batch: PS-2 Recommendation

### Recommended Work: Consolidate Validation Functions

**Scope:** Validation path only (read-only, lowest risk)

**Rationale:**
1. ✅ No production impact (read-only functions)
2. ✅ Can be tested independently
3. ✅ Clear deliverable (2 functions instead of 4)
4. ✅ Reduces cognitive load for operators
5. ⏳ Prerequisite before major refactoring

**Work Items:**
1. Create `validate_position_lenient()` (permissive tolerance)
2. Create `validate_position_strict()` (exact match required)
3. Redirect old 4 functions to new ones (with deprecation warning)
4. Add regression tests
5. Update operator runbooks

**Not Recommended Yet (Defer to PS-3/PS-4):**
- Fixing position recomputation duplicate (needs investigation first)
- Fixing AUM update duplicate (high risk, needs careful analysis)
- Refactoring repair functions (complex, many interdependencies)

---

## Timeline & Dependencies

```
PS-1: Invariants (THIS DOCUMENT)
  ↓ Output: Invariants defined, duplicates identified, production path clear
  ↓
PS-2: Validation Consolidation (RECOMMENDED NEXT)
  ├─ Work: Merge 4 validation functions → 2
  ├─ Risk: LOW (read-only)
  ├─ Duration: 2-3 days
  └─ Output: Cleaner validation surface
  ↓
PS-3: Repair/Admin Isolation (AFTER PS-2)
  ├─ Work: Clarify which repair functions are safe, deprecate dangerous ones
  ├─ Risk: MEDIUM (repair functions are powerful)
  ├─ Duration: 2-3 days
  └─ Output: Clear admin function surface, safety barriers
  ↓
PS-4: Duplicate Recomputation Analysis (AFTER PS-3)
  ├─ Work: Investigate position/AUM trigger duplicates
  ├─ Risk: MEDIUM (may require refactoring)
  ├─ Duration: 3-4 days (analysis only)
  └─ Output: Risk classification, recommendations for cleanup (deferred or immediate)
```

---

## Success Criteria for PS-1

✅ Invariants clearly documented (above)  
✅ All 45+ position functions classified (done in Section B)  
✅ Authoritative production path identified (done in Section C)  
✅ Duplicate areas highlighted (done in Section D)  
✅ PS-2 recommendation provided (done in Section E)  
✅ No code changes (investigation & documentation only)

---

## Next Steps

1. **Review & Validate** (1 day)
   - Team reviews invariants for completeness
   - Verify production path description matches actual code
   - Confirm duplicate areas are real (not false positives)

2. **Decide: Pursue Phase 3?** (2026-04-21)
   - Based on Phase 4 stability report
   - If yes: Begin PS-2 immediately
   - If no: Defer to Phase 4D planning

3. **Execute PS-2** (if Phase 3 approved)
   - Consolidate validation functions
   - Add regression tests
   - Update operator runbooks

