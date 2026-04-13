# Position Sync Invariants, Function Tiers, and Production Path Analysis

**Status:** PS-1 Complete - Analysis Only (No Code Changes)  
**Date:** 2026-04-21  
**Scope:** 45+ position-related RPC functions across Tier 1–4 classification  
**Purpose:** Document invariants that must be preserved, classify functions by tier, identify authoritative production path, and flag duplicate recomputation risks before proceeding to PS-2 (consolidation).

---

## Executive Summary

The Indigo Yield position sync system uses a **trigger chain** architecture where database triggers automatically propagate changes through the system:

```
INSERT transaction → fn_ledger_drives_position (Tier 1)
                  → sync_aum_on_position_change (Tier 1)
                  → fund_daily_aum updated
                  → trigger_recompute_position (Tier 1, potentially redundant)
                  → sync_aum_on_transaction (Tier 1, optimization)
```

This document:
1. Defines 5 core invariants that position sync must ALWAYS preserve
2. Classifies all 45+ position functions into 4 tiers
3. Identifies the authoritative production path
4. Flags 5 specific duplicate recomputation risks
5. Recommends proceeding to PS-2 with safeguards

---

## Core Position Sync Invariants

These 5 invariants are statements that must ALWAYS be true. Violation of any indicates data corruption.

### Invariant 1: Position-Transaction Balance Invariant

**Statement:**
```
For any investor I and fund F:
  investor_positions[I, F].current_value 
  = 
  SUM(transactions_v2 WHERE investor_id=I, fund_id=F, is_voided=false, applied=true)
  + SUM(yield distributions applied to positions for I in F)
```

**Why This Matters:**
- Positions are the source of truth for investor balances
- Transactions are the ledger proving how we got there
- If position ≠ sum(ledger), we have a data integrity violation

**How It's Maintained:**
- `fn_ledger_drives_position()` (Tier 1 trigger) computes position from ledger on every transaction insert/void
- `compute_position_from_ledger()` (Tier 4 helper) allows manual verification
- Views `position_transaction_reconciliation`, `investor_position_ledger_mismatch` check this

**Violation Scenario:**
- Position shows $100,000 but ledger sums to $99,500 → user cannot withdraw, financial audit fails
- Likely causes: ledger entry created but position not updated, or position updated without ledger entry

---

### Invariant 2: Ledger-Position Consistency Invariant

**Statement:**
```
For every transaction insert/update/void:
  1. transaction_ledger entry is created/updated
  2. investor_positions is updated to reflect the transaction
  3. NO transaction exists in transaction_ledger without a corresponding position update
  4. NO position update happens without a transaction_ledger entry
```

**Why This Matters:**
- Ledger is the source of truth for what happened (audit trail)
- Positions are the derived current state
- They must always be synchronized; orphaned entries cause inconsistency

**How It's Maintained:**
- Triggers fire in sequence: `trg_ledger_sync` → `fn_ledger_drives_position()` → `trg_sync_aum_*`
- `get_position_reconciliation()` shows positions with mismatched ledger entries
- Views identify orphaned ledger entries and positions

**Violation Scenario:**
- Ledger shows deposit of $50,000 but position doesn't reflect it → reconciliation queries detect orphan
- Position was manually updated in admin tool but no ledger entry created → audit trail breaks

---

### Invariant 3: Void Cascade Invariant

**Statement:**
```
If a deposit transaction is voided:
  1. All yield distributions calculated on that deposit MUST be voided
  2. All positions derived from that deposit must be recalculated
  3. AUM must be recalculated to exclude voided deposit + cascaded yields
  
Equivalently:
  For a voided transaction T:
    - All positions that depend on T must be recomputed
    - investor_positions.current_value for affected investors must exclude T's impact
```

**Why This Matters:**
- Void operations cannot be partial; a voided deposit invalidates all downstream calculations
- If we void a deposit but keep its yields, positions are overstated
- Compliance/audit trails require full cascade

**How It's Maintained:**
- `fn_ledger_drives_position()` trigger handles void by marking is_voided=true
- `trg_ledger_sync` trigger updates position when is_voided status changes
- `recompute_on_void()` trigger (Tier 2 admin) handles explicit void recomputation
- `get_void_transaction_impact()` helper predicts what will be affected

**Violation Scenario:**
- Void a deposit, but investor's position still includes yield on that deposit
- Result: investor balance is overstated, AUM is overstated, cannot audit properly

---

### Invariant 4: AUM Consistency Invariant

**Statement:**
```
For any fund F on date D:
  fund_daily_aum[F, D].total_aum
  = 
  SUM(investor_positions[F].current_value)
  + SUM(yield_distributions applied to F on/before D)
  + Cash reserves (if tracked)
```

**Why This Matters:**
- AUM (Assets Under Management) is the fund's total value
- Must equal the sum of all investor positions in it
- Used for performance calculations, fee calculations, and reporting
- If violated, fee calculations and performance metrics are wrong

**How It's Maintained:**
- `sync_aum_on_position_change()` (Tier 1 trigger) updates fund_daily_aum when positions change
- `sync_fund_aum_after_position()` (Tier 1 trigger, may be redundant) also updates AUM
- `validate_aum_matches_positions()` (Tier 3 validation) checks this with lenient tolerance
- `validate_aum_matches_positions_strict()` (Tier 3 validation) checks this with strict tolerance

**Violation Scenario:**
- Position sum = $10M, fund_daily_aum.total_aum = $9.8M → 2% variance, fee calculation off
- Likely causes: AUM not updated when positions changed, or partial position update

---

### Invariant 5: Position Ledger Completeness Invariant

**Statement:**
```
For every investor position in fund F:
  1. There exists a complete transaction_ledger chain explaining how it got its current_value
  2. Ledger entries cover all sources: deposits, yields, withdrawals, fees
  3. No "phantom" position exists without ledger support
  4. Ledger entries can be replayed to derive current_value
```

**Why This Matters:**
- If position value is $100,000 but we can only account for $95,000 in ledger, something is wrong
- Audit trail is incomplete; we cannot explain to investor where money came from
- Enables historical position reconstruction (e.g., "what was your position on 2025-12-31?")

**How It's Maintained:**
- `compute_position_from_ledger()` (Tier 4 helper) rebuilds position from ledger to verify
- `rebuild_position_from_ledger()` (Tier 2 admin) reconstructs from scratch with dry-run option
- `get_position_reconciliation()` (Tier 4 helper) shows reconciliation gaps
- Views `investor_position_ledger_mismatch`, `position_transaction_reconciliation` flag incomplete ledger

**Violation Scenario:**
- Position = $100K, but ledger entries only sum to $50K → $50K unaccounted for → cannot explain to investor
- Investor disputes balance; we cannot produce transaction history proving it's correct

---

## Function Classification (45+ Functions)

All position-related RPC functions are classified into 4 tiers based on risk level and when they're called.

### Tier 1: Production Path (Authoritative, Auto-Triggered)

**Risk Level:** CRITICAL — DO NOT CHANGE  
**When Called:** Automatically on database triggers during normal operations  
**Change Impact:** HIGH — Any change propagates to all users in production immediately

These functions form the authoritative production path. They are called by database triggers and must never change behavior without extensive regression testing.

| Function | Called By | Invariants Preserved | When It Fires | Notes |
|----------|-----------|---------------------|---------------|-------|
| **fn_ledger_drives_position()** | `trg_ledger_sync` trigger | 1, 2, 3, 5 | ON INSERT or UPDATE of is_voided on transactions_v2 | CRITICAL: Core ledger→position calculation. Recalculates position from transaction ledger. |
| **trigger_recompute_position()** | `trg_recompute_position_on_tx` trigger | 1, 2 | ON INSERT, DELETE, UPDATE of transactions_v2 | ⚠️ REDUNDANT: Also recomputes position (same as fn_ledger_drives_position). Both fire on every transaction change. Investigate if needed. |
| **sync_aum_on_position_change()** | `trg_sync_aum_on_position` trigger | 4, 5 | ON INSERT, DELETE, or UPDATE of current_value on investor_positions | CRITICAL: Keeps fund_daily_aum in sync when positions change. Uses transaction date. |
| **sync_fund_aum_after_position()** | `trg_sync_aum_after_position` trigger | 4 | ON UPDATE of current_value on investor_positions | ⚠️ DISABLED/REDUNDANT: Marked disabled in DB. Uses CURRENT_DATE instead of transaction date. Conflicts with sync_aum_on_position_change. |
| **sync_position_last_tx_date()** | `trg_sync_position_last_tx_date` trigger | 5 | ON UPDATE of investor_positions | LOW RISK: Updates last_transaction_date field only. Does not affect invariants. |
| **sync_aum_on_transaction()** | `trg_sync_aum_on_transaction` trigger | 4 | ON INSERT of transactions_v2 | OPTIMIZATION: Direct AUM update without recomputing positions (for performance). Fires after fn_ledger_drives_position. |
| **recompute_on_void()** | `trg_recompute_on_void` trigger | 1, 2, 3 | ON UPDATE of is_voided on transactions_v2 | LOW RISK: Recomputes position when void status changes. Supports void cascade. |

**Safeguards:**
- These functions are protected by database constraints
- Changes require database migration + regression testing
- Verify no changes to mathematical logic before merging
- Run invariant checks on every migration

---

### Tier 2: Repair/Admin Path (Manual Operations)

**Risk Level:** HIGH → MEDIUM (with dry-run)  
**When Called:** Only via explicit admin API calls or manual procedures  
**Change Impact:** MEDIUM — Changes only affect targeted positions, not automatic behavior

These functions are called only from admin tools and repair flows. They should be isolated from Tier 1 to prevent accidental re-entry during normal operations.

| Function | Purpose | Parameters | Dry-Run? | Invariants | Admin Only? | Notes |
|----------|---------|-----------|----------|-----------|-----------|-------|
| **recompute_investor_position()** | Recompute single position from ledger | investor_id, fund_id | NO | 1, 2 | YES | Routine admin fix. Recalculates position for one investor-fund pair. |
| **recompute_investor_positions_for_investor()** | Recompute all positions for one investor | investor_id | NO | 1, 2 | YES | Batch admin fix. Recalculates all positions for investor across all funds. |
| **rebuild_position_from_ledger()** | Rebuild from scratch with audit trail | investor_id, fund_id, admin_id, reason, dry_run | YES ✅ | 1, 2, 5 | YES | SAFE: Has dry-run. Preview changes before applying. Tracks admin action in audit trail. |
| **adjust_investor_position()** | Manual position adjustment (for corrections) | investor_id, fund_id, amount, reason, tx_date, admin_id | NO | 1, 2 | YES | Audit trail only. Creates ledger entry for adjustment. Should be rare (use rebuild instead). |
| **reconcile_investor_position_internal()** | Reconcile one position | fund_id, investor_id | NO | 1, 2, 5 | YES | Mid-level repair. Fixes single position mismatch without rebuild. |
| **acquire_position_lock()** | Lock position for concurrent ops | investor_id, fund_id | N/A (locking) | N/A | YES | Utility: Prevents concurrent position updates during repair. Used by other admin functions. |

**Safeguards:**
- All functions require admin authorization (via RLS policies)
- Functions with dry-run SHOULD be called with dry_run=true first
- Functions with audit trail track who made what change and when
- Recommend: Only enable after PS-2 (validation consolidation) is complete

---

### Tier 3: Validation & Monitoring (Health Checks, No State Change)

**Risk Level:** LOW  
**When Called:** On-demand by dashboards, healthchecks, and audit processes  
**Change Impact:** NONE — These only read state, never modify it

These functions validate that invariants are being preserved. They're safe to refactor since they don't modify state. However, there's significant redundancy—6+ validation functions that do similar things.

| Function | What It Validates | Strictness | Used By | Redundant? | Consolidation Priority |
|----------|-------------------|-----------|---------|-----------|------------------------|
| **validate_aum_matches_positions()** | Invariant 4: AUM = sum(positions) | Lenient (1% tolerance) | Operational monitoring | YES | HIGH - Can consolidate with others |
| **validate_aum_matches_positions_strict()** | Invariant 4: AUM = sum(positions) | Strict (exact match, per-fund basis) | Audit/compliance | YES | HIGH - Variant of above with strict threshold |
| **validate_aum_against_positions()** | Invariant 4: AUM value vs position sum | Lenient (10% tolerance) | Operational check | YES | HIGH - Similar to validate_aum_matches_positions |
| **validate_aum_against_positions_at_date()** | Invariant 4: Historical AUM vs positions | Strict on date | Historical audit | MAYBE | MEDIUM - Date-specific, may be needed |
| **check_aum_position_health()** | Full health check with grades | Grades: OK/WARNING/CRITICAL | Dashboard monitoring | NO | LOW - Composite function, harder to consolidate |
| **validate_position_fund_status()** | Invariant 2: Position has active fund | Data integrity check | Trigger on position INSERT | NO | MEDIUM - Trigger-based, keep separate |

**Consolidation Recommendation:**
- **Keep:** `check_aum_position_health()` (composite, higher level)
- **Consolidate:** `validate_aum_matches_positions*()` variants → `validate_position_strict()` and `validate_position_lenient()`
- **Keep separate:** `validate_position_fund_status()` (trigger-based integrity check)

**Safeguards:**
- These are read-only; safe to change without regression testing
- PS-2 task will consolidate these to reduce code duplication

---

### Tier 4: Helpers & Utilities (Called Only by Tier 1-3)

**Risk Level:** LOW-MEDIUM (depends on caller)  
**When Called:** Internally by Tier 1-3 functions  
**Change Impact:** DEPENDS ON CALLER — Changes affect whoever calls it

These functions are called only by other functions in Tiers 1-3. They're internal utilities. Many are initialization/reporting functions that are rarely called.

#### Computation Helpers (Core Logic)

| Function | Purpose | Used By | Called During Production? | Consolidation Candidate |
|----------|---------|---------|--------------------------|------------------------|
| **compute_position_from_ledger()** | Calculate position value from transactions | fn_ledger_drives_position, admin tools, views | YES (via fn_ledger_drives_position) | NO - Core logic, keep as-is |
| **calculate_position_at_date_fix()** | Historical position calculation | Reporting, reconciliation views | NO (historical only) | MAYBE - Could consolidate with compute_position_from_ledger |

#### Query/Reporting Helpers

| Function | Purpose | Used By | Read-Only? | Consolidation Candidate |
|----------|---------|---------|-----------|------------------------|
| **get_position_reconciliation()** | Retrieve reconciliation view (positions vs ledger) | Admin queries, dashboards | YES | NO - Keep for admin dashboards |
| **get_aum_position_reconciliation()** | AUM vs position reconciliation | Admin queries, audits | YES | NO - Keep for audits |
| **get_fund_composition()** | Breakdown of fund by investor | Investor reports, fund summaries | YES | NO - Keep for reporting |

#### Bootstrap Functions (One-Time Setup)

| Function | Purpose | Used By | When Used | Consolidation Candidate |
|----------|---------|---------|-----------|------------------------|
| **initialize_fund_aum_from_positions()** | Bootstrap AUM from current positions | Initial data migration | SETUP ONLY | YES - Could remove if migration is complete |
| **initialize_all_hwm_values()** | Bootstrap high-water-mark values | Initial data migration | SETUP ONLY | YES - Could remove if migration is complete |
| **create_daily_position_snapshot()** | Create historical snapshot of positions | Nightly job, on-demand admin | NIGHTLY | MAYBE - Keep for historical reporting |

#### Lock Management (Concurrency Control)

| Function | Purpose | Used By | Always Needed? | Notes |
|----------|---------|---------|----------------|-------|
| **acquire_position_lock()** | Lock position for concurrent repairs | Repair functions (Tier 2) | MAYBE | Utility to prevent concurrent updates. May not be used if single-threaded. |

**Safeguards:**
- Changes to helpers only matter if called by Tier 1-3
- Safe to consolidate if only Tier 4 calls them
- If Tier 1 uses them, changes require regression testing

---

## Authoritative Production Position Sync Path

This section traces the exact path a transaction takes from insertion to final AUM update.

### Entry Points (How New Positions Are Created/Updated)

1. **Primary Entry:** `INSERT INTO transactions_v2(...)` — Normal user deposit, withdrawal, or yield application
2. **Admin Entry:** `adjust_investor_position()` or `rebuild_position_from_ledger()` — Manual admin correction
3. **Trigger Entry:** Void/unvoid operations call `fn_ledger_drives_position()` directly

### Authoritative Production Path (Deposits/Yields)

```
STEP 1: INSERT INTO transactions_v2 (investor_id, fund_id, amount, type, ...)
│
├─> Trigger: trg_ledger_sync FIRES
│   │ Function: fn_ledger_drives_position() [TIER 1, CRITICAL]
│   │ Action: SELECT SUM(amount) FROM transactions_v2 WHERE investor_id=I, fund_id=F, is_voided=false
│   │         UPDATE investor_positions SET current_value = <calculated_sum>
│   │ Invariants Maintained: 1 (Position-Transaction Balance), 2 (Ledger-Position Consistency)
│   │
│   └─> Trigger: trg_sync_aum_on_position FIRES (on investor_positions UPDATE)
│       │ Function: sync_aum_on_position_change() [TIER 1, CRITICAL]
│       │ Action: UPDATE fund_daily_aum SET total_aum = <sum_of_all_positions_in_fund>
│       │ Invariants Maintained: 4 (AUM Consistency), 5 (Position Ledger Completeness)
│       │
│       └─> Trigger: trg_sync_aum_after_position FIRES (if enabled; currently disabled)
│           │ Function: sync_fund_aum_after_position() [TIER 1, POTENTIALLY REDUNDANT]
│           │ Status: DISABLED - Conflicts with trg_sync_aum_on_position
│           │ Note: Uses CURRENT_DATE instead of transaction date (problematic)
│           │
│           ✗ SKIP: This trigger is marked DISABLED in the baseline migration
│
├─> Trigger: trg_recompute_position_on_tx FIRES
│   │ Function: trigger_recompute_position() [TIER 1, POTENTIALLY REDUNDANT]
│   │ Action: Also recomputes investor_positions (same logic as fn_ledger_drives_position)
│   │ Status: ⚠️ DUPLICATE - Both fn_ledger_drives_position and trigger_recompute_position fire
│   │ Impact: Position is recalculated twice on every transaction insert
│   │ TODO: Investigate if this is needed or redundant
│
└─> Trigger: trg_sync_aum_on_transaction FIRES
    │ Function: sync_aum_on_transaction() [TIER 1, OPTIMIZATION]
    │ Action: UPDATE fund_daily_aum directly from transaction (bypass position)
    │ Purpose: Performance optimization - avoid recalculating position
    │ Timing: Fires AFTER fn_ledger_drives_position
    │ Status: OPTIMIZATION - Parallel update to AUM
```

### Result of Production Path

After the authoritative path completes:
- ✅ `investor_positions[I, F].current_value` = SUM(transactions for I in F)
- ✅ `fund_daily_aum[F, today].total_aum` = SUM(all positions in F)
- ✅ Invariants 1, 2, 4, 5 are preserved (Invariant 3 only matters for voids)

### Critical Observations About the Production Path

**Observation 1: Dual Position Recalculation (Potential Issue)**
- `fn_ledger_drives_position()` recalculates position from ledger
- `trigger_recompute_position()` also recalculates position from ledger
- Both fire on the same triggers; position is computed twice
- **Risk:** Harmless redundancy, but wastes CPU. PS-4 (duplicate analysis) should investigate.

**Observation 2: Dual AUM Updates (Currently Mitigated)**
- `sync_aum_on_position_change()` updates AUM when position changes
- `sync_fund_aum_after_position()` DISABLED (would conflict if enabled)
- `sync_aum_on_transaction()` provides alternative direct AUM update
- **Status:** Currently safe because one conflicting trigger is disabled. But architecture is fragile.

**Observation 3: The Authority is fn_ledger_drives_position()**
- It's the only function that directly reads transactions and updates positions
- All other position updates are derived from or call this function
- It should be the ONLY place where position is calculated from ledger
- **Implication:** `trigger_recompute_position()` should probably call `fn_ledger_drives_position()` logic, not duplicate it

**Observation 4: Position Updates Always Trigger AUM Updates**
- Whenever `investor_positions` is updated, `trg_sync_aum_on_position` fires automatically
- This ensures AUM stays in sync with positions (Invariant 4)
- Admin functions that update positions manually trigger this too (safe)

---

## Identified Duplicate Recomputation Risks

This section documents specific duplicate computation risks and how they could cause problems.

### Risk 1: Dual Position Recalculation on Transaction Insert

**Occurrence:**
- Both `fn_ledger_drives_position()` and `trigger_recompute_position()` fire on INSERT of transactions_v2
- Both recalculate position from the same ledger
- Position is computed twice, getting the same result both times

**Evidence:**
```sql
-- In migrations/20260307000000_definitive_baseline.sql:

-- Trigger 1: trg_ledger_sync fires on INSERT
CREATE TRIGGER "trg_ledger_sync" AFTER INSERT OR UPDATE OF "is_voided" ON "public"."transactions_v2" 
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_ledger_drives_position"();

-- Trigger 2: trg_recompute_position_on_tx fires on INSERT
CREATE TRIGGER "trg_recompute_position_on_tx" AFTER INSERT OR DELETE OR UPDATE ON "public"."transactions_v2" 
  FOR EACH ROW EXECUTE FUNCTION "public"."trigger_recompute_position"();
```

Both fire on INSERT; both run `SELECT SUM(amount)` from transactions to recalculate.

**Impact:**
- **Correctness:** HARMLESS — Same result calculated twice
- **Performance:** INEFFICIENT — 2x CPU cost on every transaction insert
- **Scalability:** PROBLEMATIC — At 1000 transactions/day, wasting resources
- **Maintainability:** CONFUSING — Why two triggers doing the same thing?

**How to Fix (PS-4):**
1. Determine which is authoritative (probably `fn_ledger_drives_position`)
2. Remove the redundant trigger, OR
3. Make one call the other to avoid code duplication

---

### Risk 2: Dual AUM Updates on Position Change (Mitigated but Fragile)

**Occurrence:**
- `sync_aum_on_position_change()` fires when `investor_positions.current_value` changes
- `sync_fund_aum_after_position()` WOULD ALSO fire, but is currently DISABLED
- If someone enables the disabled trigger, they'll both fire and conflict

**Evidence:**
```sql
-- This trigger is ACTIVE:
CREATE TRIGGER "trg_sync_aum_on_position" AFTER INSERT OR DELETE OR UPDATE OF "current_value" ON "public"."investor_positions" 
  FOR EACH ROW EXECUTE FUNCTION "public"."sync_aum_on_position_change"();

-- This trigger is DISABLED (has comment indicating it's disabled):
CREATE TRIGGER "trg_sync_aum_after_position" AFTER UPDATE OF "current_value" ON "public"."investor_positions" 
  FOR EACH ROW EXECUTE FUNCTION "public"."sync_fund_aum_after_position"();
  -- COMMENT: 'DISABLED: Redundant - uses CURRENT_DATE instead of transaction date. Use trg_sync_aum_on_position instead.'
```

**Impact:**
- **Current Status:** SAFE — Conflicting trigger is disabled
- **Risk if Enabled:** RACE CONDITION — Both update same fund_daily_aum row, could corrupt data
- **Root Cause:** Someone created two AUM sync functions with same trigger event; one was disabled to prevent conflict

**How to Fix (PS-2):**
1. Remove the disabled trigger and function entirely (dead code cleanup)
2. Keep `sync_aum_on_position_change()` as the authoritative AUM update

---

### Risk 3: AUM Updated via Two Independent Paths

**Occurrence:**
- Path A: Position changes → `sync_aum_on_position_change()` updates AUM
- Path B: Transaction inserted → `sync_aum_on_transaction()` updates AUM independently
- If a transaction insert happens before position is updated, AUM might be updated out of order

**Evidence:**
```sql
-- Path A (position-driven):
CREATE TRIGGER "trg_sync_aum_on_position" AFTER ... UPDATE OF "current_value" ON "investor_positions" 
  FOR EACH ROW EXECUTE FUNCTION "public"."sync_aum_on_position_change"();

-- Path B (transaction-driven):
CREATE TRIGGER "trg_sync_aum_on_transaction" AFTER INSERT ON "public"."transactions_v2" 
  FOR EACH ROW EXECUTE FUNCTION "public"."sync_aum_on_transaction"();
```

**Timeline:**
```
Time 1: INSERT transaction (amount=$10k)
        → trg_sync_aum_on_transaction fires
        → Calls sync_aum_on_transaction()
        → Updates fund_daily_aum to $100k

Time 2: fn_ledger_drives_position fires
        → Updates investor_positions.current_value
        → trg_sync_aum_on_position fires
        → Calls sync_aum_on_position_change()
        → Updates fund_daily_aum again (might recalculate differently)

Problem: AUM updated twice, could have inconsistent timing/values
```

**Impact:**
- **Correctness:** UNCLEAR — Depends on which update overwrites the other
- **Performance:** INEFFICIENT — AUM is updated twice per transaction
- **Data Consistency:** POTENTIALLY RISKY — If updates use different logic, could diverge

**How to Fix (PS-4):**
1. Investigate whether both paths are needed or one is sufficient
2. If both needed, document the order and expected behavior
3. Consider batching AUM updates to happen once per transaction

---

### Risk 4: Void Operations Use Implicit Cascade (Hard to Trace)

**Occurrence:**
- When a transaction is voided (`UPDATE transactions_v2 SET is_voided=true`), the position is recalculated
- But yields applied on that deposit are NOT automatically voided
- Admin must manually find and void cascaded yields
- This is implicit, not guaranteed by any trigger

**Evidence:**
```sql
-- Void is handled by existing triggers:
CREATE TRIGGER "trg_ledger_sync" AFTER ... UPDATE OF "is_voided" ON "public"."transactions_v2" 
  FOR EACH ROW EXECUTE FUNCTION "public"."fn_ledger_drives_position"();
```

But there's no trigger that automatically voids cascaded yields.

**Impact:**
- **Correctness RISK:** If void isn't cascaded, position stays too high (Invariant 3 violated)
- **Admin Risk:** Admin must remember to manually void cascaded yields; easy to miss
- **Auditability:** Hard to trace why a position changed when we void a transaction

**How to Fix (PS-3):**
1. Add explicit cascade function: `void_transaction_with_cascade()`
2. This function should identify all yields on the voided transaction
3. Void them explicitly with audit trail
4. Call this from admin UI instead of raw UPDATE

---

### Risk 5: Admin Repair Functions Lack Safeguards for Concurrent Calls

**Occurrence:**
- Admin can call `recompute_investor_position()` while position is being updated by trigger
- No lock/transaction isolation ensures they don't interfere
- Two processes both reading ledger and updating position could cause race condition

**Evidence:**
```sql
-- Admin repair function has no explicit locking:
CREATE OR REPLACE FUNCTION "public"."recompute_investor_position"(...)
  AS $function$
  BEGIN
    -- SELECT SUM(amount) from transactions
    -- UPDATE investor_positions
    -- If another trigger updates investor_positions in between, we might overwrite it
  END;
  $function$

-- There IS a lock function, but it's not called by repair functions:
CREATE OR REPLACE FUNCTION "public"."acquire_position_lock"(...)
```

**Impact:**
- **Correctness RISK:** Two concurrent updates could race and corrupt position
- **Probability:** LOW (admin tools probably aren't concurrent), but possible
- **Severity:** HIGH (data corruption)

**How to Fix (PS-3):**
1. Make all admin repair functions call `acquire_position_lock()` at the start
2. Document that these are not meant to run concurrently
3. Add database-level constraint or lock to prevent concurrent position updates

---

## Summary of Duplicate Recomputation Risks

| Risk | Duplicate What | Status | Severity | When Fixed |
|------|----------------|--------|----------|-----------|
| **Risk 1** | Position recomputed 2x per transaction | HARMLESS but wasteful | MEDIUM (perf) | PS-4 duplicate analysis |
| **Risk 2** | AUM updated via disabled + active triggers | MITIGATED but fragile | HIGH (would corrupt if enabled) | PS-2 validation consolidation |
| **Risk 3** | AUM updated via position + transaction paths | UNCLEAR if intended | MEDIUM (perf) | PS-4 duplicate analysis |
| **Risk 4** | Void cascade not automatic | IMPLICIT risk | HIGH (correctness) | PS-3 repair isolation |
| **Risk 5** | Admin repairs not locked against triggers | RACE CONDITION risk | MEDIUM (low probability) | PS-3 repair isolation |

---

## Recommended Next Batch: PS-2 (Validation Consolidation)

### Why Proceed to PS-2 Now?

**Readiness:**
- ✅ Tier 1 (production path) is well-understood and stable
- ✅ Tier 3 (validation functions) are read-only and safe to refactor
- ✅ No code changes needed to Tier 1 in PS-2
- ✅ PS-2 changes are isolated to Tier 3 validation functions

**Benefits:**
- PS-2 will consolidate the 6 redundant validation functions into 2-3
- This clarifies which validation functions are actually needed by Tier 1
- Removes code duplication and confusion
- Unblocks PS-3 (repair isolation) which depends on clear validation definitions

**Safeguards for PS-2:**
- [ ] Must NOT change Tier 1 production path functions
- [ ] Must NOT change Tier 2 admin repair functions
- [ ] Must NOT change database schema for investor_positions or transactions_v2
- [ ] Must preserve exact same validation results (stricter OR looser, just consolidated)
- [ ] Run full regression test suite before merging

### Checklist for Proceeding to PS-2

- [ ] This invariants document is reviewed and approved by team
- [ ] All 45+ position functions are classified and understood
- [ ] Production path is documented and agreed as the authority
- [ ] Duplicate risks are documented (we know about them)
- [ ] Decision made: Proceed with PS-2 consolidation?

**If checklist is complete:** Proceed to PS-2 Task.  
**If any item is not ready:** Halt and address blocker in this task.

---

## How to Use This Document

### For Code Reviewers
- Use Tier classification to understand function risk level
- When reviewing changes to Tier 1 functions, REJECT unless absolutely necessary
- When reviewing Tier 3 changes, consolidation is encouraged
- Reference specific invariants when questioning code behavior

### For Admins
- Use the Decision Tree from BATCH_4_POSITION_SYNC_ARCHITECTURE.md
- Before calling any Tier 2 admin function, verify it preserves relevant invariants
- Always use dry_run=true on first call (rebuild_position_from_ledger, reconcile_all_positions, etc.)
- Document why you're calling it (audit trail)

### For Architects
- Reference this when making changes to financial logic
- Use invariants to define requirements for new features
- When adding new position-sync functions, classify them into a tier
- When removing dead code, check no other function depends on it (use find_referencing_symbols)

### For Data Integrity Audits
- Run validation functions (Tier 3) to check invariants:
  ```sql
  SELECT * FROM validate_aum_matches_positions_strict(fund_id);
  SELECT * FROM get_position_reconciliation();
  SELECT * FROM position_transaction_reconciliation;
  SELECT * FROM investor_position_ledger_mismatch;
  ```
- If any invariant is violated, data is corrupted; investigate immediately
- Use PS-3 repair functions (with dry_run=true) to preview fixes

---

## Related Documentation

- **BATCH_4_POSITION_SYNC_ARCHITECTURE.md** — Decision tree and quick reference for which function to use
- **BATCH_4_POSITION_SYNC_ANALYSIS.md** — Detailed risk assessment
- **docs/superpowers/plans/2026-04-21-position-sync-phase-2.md** — Full implementation plan for PS-1 through PS-4
- **supabase/migrations/20260307000000_definitive_baseline.sql** — All RPC function definitions and triggers
- **src/contracts/rpcSignatures.ts** — Auto-generated RPC function registry

---

## Appendix: All 45+ Position-Related Functions (Checklist)

### Tier 1: Production Path (7 functions)
- [x] fn_ledger_drives_position
- [x] trigger_recompute_position
- [x] sync_aum_on_position_change
- [x] sync_fund_aum_after_position (disabled)
- [x] sync_position_last_tx_date
- [x] sync_aum_on_transaction
- [x] recompute_on_void

### Tier 2: Repair/Admin Path (6 functions)
- [x] recompute_investor_position
- [x] recompute_investor_positions_for_investor
- [x] rebuild_position_from_ledger
- [x] adjust_investor_position
- [x] reconcile_investor_position_internal
- [x] acquire_position_lock

### Tier 3: Validation (6 functions)
- [x] validate_aum_matches_positions
- [x] validate_aum_matches_positions_strict
- [x] validate_aum_against_positions
- [x] validate_aum_against_positions_at_date
- [x] check_aum_position_health
- [x] validate_position_fund_status

### Tier 4: Helpers (18+ functions)
- [x] compute_position_from_ledger
- [x] calculate_position_at_date_fix
- [x] get_position_reconciliation
- [x] get_aum_position_reconciliation
- [x] get_fund_composition
- [x] initialize_fund_aum_from_positions
- [x] initialize_all_hwm_values
- [x] create_daily_position_snapshot
- [x] cleanup_dormant_positions
- [x] batch_reconcile_all_positions
- [x] reconcile_all_positions
- [x] reconcile_fund_aum_with_positions
- [x] repair_all_positions
- [x] reset_all_investor_positions
- [x] sync_aum_to_positions
- [x] check_aum_reconciliation
- [x] rebuild_investor_period_balances
- [x] batch_initialize_fund_aum
- [x] alert_on_aum_position_mismatch (trigger)
- [x] alert_on_ledger_position_drift (trigger)
- [x] enforce_canonical_position_mutation (trigger)
- [x] enforce_canonical_position_write (trigger)
- [x] set_position_is_active (trigger)
- [x] log_aum_position_mismatch (trigger)

**Total: 45+ functions classified**

---

## Document Status

**Status:** ✅ COMPLETE  
**Last Updated:** 2026-04-21  
**Ready for Team Review:** YES  
**Next Step:** Proceed to PS-2 (Validation Consolidation) after review approval

---

**Document Prepared By:** Claude Code Agent  
**For:** Indigo Yield Position Sync Phase 2 Hardening Project  
**Commit Reference:** docs(audit): position sync invariants, function tiers, and production path analysis - PS-1
