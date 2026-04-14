# Void/Unvoid Invariants and Atomic Operation Definitions

**Document Status:** Foundation for Phase 4A — Void/Unvoid Architecture Hardening  
**Date:** 2026-04-13  
**Purpose:** Define what must be true during void/unvoid operations to maintain financial correctness

---

## Overview

Void and unvoid operations are critical financial transactions that must be atomic and isolated from concurrent operations. This document defines four core invariants that protect data integrity and prevent position-ledger mismatches.

**Key Risk:** Concurrent void + yield apply can cause position updates and AUM updates to interleave, violating Invariant 1 (position = sum of transactions + yields). See POSITION_SYNC_DUPLICATE_ANALYSIS.md Finding 6 for detailed race condition scenario.

---

## Invariant 1: Atomic Void Operation Invariant

**Statement:** When a transaction is voided, three updates must be atomic (all-or-nothing):
1. `transactions_v2.is_voided` → TRUE
2. `investor_positions.current_value` → decreased by transaction amount
3. `fund_daily_aum.total_aum` → decreased by transaction amount

**Why It Matters:** If position is updated but AUM is not yet updated, a concurrent read of position + AUM will see inconsistent state (position reflects void, AUM does not). This violates the core invariant: `fund.total_aum = SUM(investor_positions)`.

**Concrete Scenario (Bad):**
```
Thread 1 (void_transaction):
  UPDATE transactions_v2 SET is_voided=true WHERE id='tx123'  ✓
  UPDATE investor_positions SET current_value = current_value - 1000  ✓
  [INTERLEAVING POINT - Another thread reads here]
  UPDATE fund_daily_aum SET total_aum = total_aum - 1000  ✓

Thread 2 (concurrent read):
  SELECT SUM(current_value) FROM investor_positions → $9,000 (voided)
  SELECT total_aum FROM fund_daily_aum → $10,000 (not yet updated)
  → MISMATCH: Invariant 4 violated
```

**Concrete Scenario (Good):**
```
Thread 1 (void_transaction) - SERIALIZABLE isolation:
  BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE
  UPDATE transactions_v2 SET is_voided=true WHERE id='tx123'
  UPDATE investor_positions SET current_value = current_value - 1000
  UPDATE fund_daily_aum SET total_aum = total_aum - 1000
  COMMIT
  [No concurrent reads possible during transaction]

Thread 2 (concurrent read):
  Blocks until Thread 1 commits, then reads consistent state
```

**How We Test It:**
```sql
-- Setup: Create investor, fund with deposit of $1,000
-- Record position before void
SELECT current_value INTO v_position_before WHERE investor_id=I, fund_id=F
  → Should be $1,000

-- Void the transaction
PERFORM void_transaction(tx_id, fund_id, 'test')

-- Record position and AUM after void (MUST be consistent)
SELECT current_value INTO v_position_after WHERE investor_id=I, fund_id=F
SELECT total_aum INTO v_aum_after WHERE fund_id=F
  → Both MUST be $0 (or their new values after void)
  → No intermediate state visible
```

**Implementation:**
- Use `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` in void_transaction()
- Use `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE` in unvoid_transaction()
- Both functions must complete atomically (no partial updates)

---

## Invariant 2: Void Cascade Invariant

**Statement:** When a transaction is voided, all downstream impacts must be voided atomically in the same transaction:
- If transaction is DEPOSIT: all yields earned on that deposit must be voided
- If transaction is WITHDRAWAL: related deposit that funded this withdrawal must be checked (optional, depends on policy)
- Void cascade must complete in same transaction (all-or-nothing)

**Why It Matters:** If void of deposit completes but cascade void of yields does not, the investor will have:
- Position = $0 (deposit voided)
- Ledger = DEPOSIT (voided) + YIELD (not voided) = yield amount
- Result: Position ($0) != Ledger (yield amount) — VIOLATION OF INVARIANT 1

**Concrete Scenario (Bad):**
```
Thread 1: void_transaction(deposit_tx)
  UPDATE transactions_v2 SET is_voided=true WHERE id=deposit_tx  ✓
  UPDATE investor_positions SET current_value = 0  ✓
  UPDATE fund_daily_aum SET total_aum = total_aum - 1000  ✓
  [Error or interrupt happens before cascade void completes]
  [Transaction rolls back partway]

Result: Deposit voided, but yield_tx still active
  Position = $0
  Ledger = DEPOSIT (voided, -$1000) + YIELD (active, +$50) = -$950
  Mismatch: Position $0 != Ledger -$950
```

**Concrete Scenario (Good):**
```
Thread 1: void_transaction(deposit_tx) - SERIALIZABLE:
  BEGIN TRANSACTION ISOLATION LEVEL SERIALIZABLE
  UPDATE transactions_v2 SET is_voided=true WHERE id=deposit_tx
  UPDATE investor_positions SET current_value = 0
  UPDATE fund_daily_aum SET total_aum = total_aum - 1000
  
  -- Cascade void (same transaction)
  PERFORM cascade_void_to_yields(deposit_tx, fund_id)
    → UPDATE investor_yield_events SET is_voided=true WHERE trigger_transaction_id=deposit_tx
    → All yields cascade voided atomically
  
  INSERT INTO audit_log (...)
  COMMIT  [All or nothing]

Result: Both deposit and yields voided together
  Position = $0
  Ledger = DEPOSIT (voided) + YIELD (voided) = $0
  Match: Position $0 = Ledger $0 ✓
```

**How We Test It:**
```sql
-- Setup: Create deposit with yield
INSERT INTO transactions_v2 (deposit_tx, amount=1000)
INSERT INTO investor_yield_events (yield_tx, amount=50, trigger_transaction_id=deposit_tx)

-- Record counts before void
SELECT COUNT(*) FROM investor_yield_events WHERE is_voided=false AND trigger_transaction_id=deposit_tx
  → Should be 1

-- Void the deposit
PERFORM void_transaction(deposit_tx, fund_id, 'test cascade')

-- Verify cascade void (MUST have voided the yield)
SELECT COUNT(*) FROM investor_yield_events WHERE is_voided=true AND trigger_transaction_id=deposit_tx
  → Must be 1 (the yield that was related to deposit)

-- Verify position matches ledger
SELECT SUM(amount) FROM transactions_v2 WHERE investor_id=I, fund_id=F, is_voided=false
SELECT SUM(amount) FROM investor_yield_events WHERE investor_id=I, fund_id=F, is_voided=false
  → Position must equal sum of both (should be $0 if all voided)
```

**Implementation:**
- Call `cascade_void_to_yields(p_transaction_id, p_fund_id)` within same transaction as void
- All void updates (transaction, position, AUM, yields) happen together
- No partial completions possible

---

## Invariant 3: Unvoid Restoration Invariant

**Statement:** When a transaction is unvoided:
1. `transactions_v2.is_voided` → FALSE
2. `investor_positions.current_value` → increased by transaction amount (restores to pre-void value)
3. `fund_daily_aum.total_aum` → increased by transaction amount
4. **Yields that were cascade-voided are NOT automatically restored** — admin must reapply manually if desired

**Why It Matters:** Unvoid is not a true "undo" operation. It restores the original transaction but NOT the yields that were voided because of it. This prevents confusion: if user voids a deposit, the yields on that deposit are voided. If user then unvoids, they might expect yields to come back automatically, but they shouldn't (yields must be intentionally reapplied).

**Concrete Scenario (Expected Behavior):**
```
Initial State:
  Deposit: $1,000
  Yield: $50
  Position: $1,050

After void_transaction(deposit):
  Deposit: $1,000 (voided)
  Yield: $50 (voided)
  Position: $0

After unvoid_transaction(deposit):
  Deposit: $1,000 (active)
  Yield: $50 (STILL VOIDED - not restored)
  Position: $1,000 (NOT $1,050 - yields not auto-restored)
  
  Admin must manually reapply yield if desired.
```

**Why Not Auto-Restore?**
1. Yields are computed based on market conditions at time of application. Reapplying old yield may not match current market (would need recalculation).
2. Admin might intentionally void yields and not want them back when unvoiding the transaction.
3. Audit trail needs to be clear: unvoid restores transaction, but yields are a separate decision.

**How We Test It:**
```sql
-- Setup: Create investor, fund, deposit with yield
INSERT INTO transactions_v2 (tx_id='tx123', amount=1000, is_voided=false)
INSERT INTO investor_yield_events (yield_id='yld456', amount=50, trigger_transaction_id='tx123', is_voided=false)

-- Record position before void
SELECT current_value FROM investor_positions WHERE investor_id=I, fund_id=F
  → $1,050

-- Void and unvoid
PERFORM void_transaction('tx123', fund_id, 'test')
PERFORM unvoid_transaction('tx123', fund_id, 'test unvoid')

-- Verify state after unvoid
SELECT current_value FROM investor_positions WHERE investor_id=I, fund_id=F
  → $1,000 (yield NOT restored)
  
SELECT is_voided FROM investor_yield_events WHERE yield_id='yld456'
  → true (yield still voided, not auto-restored)

-- Error if position == $1,050 (wrong - yields should not be auto-restored)
ASSERT position = 1000, 'Position should be $1,000 (yields not auto-restored)'
```

**Implementation:**
- unvoid_transaction() restores is_voided=FALSE and position/AUM
- Does NOT restore cascade-voided yields
- Returns warning message: "Yields that were cascade-voided are not automatically restored. Admin must reapply yields if needed."

---

## Invariant 4: Fund-Level Lock Invariant

**Statement:** All position and AUM updates for a given fund must be protected by a fund-level advisory lock. This prevents concurrent void and yield apply operations on the same fund from interleaving.

**Why It Matters:** The race condition in POSITION_SYNC_DUPLICATE_ANALYSIS.md Finding 6 shows how concurrent void and yield apply can interleave:

```
Timeline (Race Condition):
  T1: void_transaction(deposit_tx) starts
      Acquires transaction-level lock (not fund-level)
      
  T2: apply_yield_distribution starts on same fund (concurrent)
      Reads yield_allocations for fund
      Tries to apply yield on deposit_tx
      
  T1: Cascades void to investor_yield_events
      Marks related yields as voided
      [But T2 already read them as active!]
      
  T2: Applies yield on voided transaction
      Position = $0 + $50 = $50
      Ledger = DEPOSIT (voided, -1000) + YIELD (new, +50) = -$950
      MISMATCH: Position $50 != Ledger -$950

Problem: Fund-level lock would serialize T1 and T2:
  T1 acquires fund lock (fund_id)
  T2 waits for fund lock
  T1 completes void entirely (cascade + AUM + audit)
  T2 acquires fund lock
  T2 reads consistent fund state (deposit actually voided)
  T2 applies yield correctly
  Result: No race condition
```

**How We Test It:**
```sql
-- Setup: Create investor, fund, deposit, yield_allocation
-- Two concurrent sessions simulating void and yield apply

-- Session 1:
PERFORM void_transaction_with_lock(deposit_tx, fund_id, 'test void')
  [Acquires fund lock, executes void, releases lock]

-- Session 2 (concurrent, but waiting):
PERFORM apply_yield_distribution_v5_with_lock(fund_id, ..., ...)
  [Waits for Session 1's fund lock, then executes]

-- Result: Void completes first, then yield apply sees consistent state
-- No interleaving, no race condition

-- Verify position-ledger match after both operations
SELECT COUNT(*) FROM (
  SELECT ip.investor_id, ip.fund_id
  FROM investor_positions ip
  WHERE ip.current_value != (
    SELECT COALESCE(SUM(amount), 0)
    FROM transactions_v2
    WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id AND is_voided = FALSE
    UNION ALL
    SELECT COALESCE(SUM(amount), 0)
    FROM investor_yield_events
    WHERE investor_id = ip.investor_id AND fund_id = ip.fund_id AND is_voided = FALSE
  )
)
  → Must be 0 (no mismatches)
```

**Implementation:**
- Create wrapper functions: `void_transaction_with_lock()`, `unvoid_transaction_with_lock()`, `apply_yield_distribution_v5_with_lock()`
- All three wrappers use same fund-level advisory lock: `pg_advisory_lock(hashtext(fund_id::TEXT))`
- Lock acquired before reading any fund state, released after COMMIT
- Ensures void and yield operations never interleave on same fund

---

## Current Implementation Status

### void_transaction() - Baseline
**Location:** supabase/migrations/20260307000000_definitive_baseline.sql (line 16985)

**Current Strengths:**
- Uses transaction-level advisory lock: `pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::text))`
- Cascades void to fund_aum_events, fund_daily_aum, fee_allocations, ib_commission_ledger, platform_fee_ledger, investor_yield_events
- Recalculates AUM after cascade: `PERFORM recalculate_fund_aum_for_date(...)`
- Comprehensive audit logging

**Current Gaps (Identified in PS-4):**
- ✗ No SERIALIZABLE isolation level (uses default READ COMMITTED)
- ✗ Advisory lock is transaction-level, not fund-level (doesn't prevent concurrent yield apply)
- ✗ Position and AUM updates are separate statements with no isolation guarantee

### unvoid_transaction() - Baseline
**Location:** supabase/migrations/20260307000000_definitive_baseline.sql (line 14627)

**Current Strengths:**
- Validates admin privileges
- Locks transaction row: `SELECT ... FROM transactions_v2 WHERE id = p_transaction_id FOR UPDATE`
- Updates is_voided=FALSE
- Audit logging

**Current Gaps (Identified in PS-4):**
- ✗ No SERIALIZABLE isolation level
- ✗ No fund-level lock (concurrent yield apply could read partially-restored state)
- ✗ Returns warning message about AUM needing recalculation (should be automatic)

---

## Fixes Required (Phase 4A)

### Fix 1: Add SERIALIZABLE Isolation
- Wrap void_transaction() in `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`
- Wrap unvoid_transaction() in `SET TRANSACTION ISOLATION LEVEL SERIALIZABLE`
- Ensures position + AUM updates are atomic

### Fix 2: Add Fund-Level Advisory Locks
- Create wrapper function: `void_transaction_with_lock()` that acquires fund-level lock before calling void_transaction()
- Create wrapper function: `unvoid_transaction_with_lock()` that acquires fund-level lock before calling unvoid_transaction()
- Create wrapper function: `apply_yield_distribution_v5_with_lock()` that acquires fund-level lock before calling apply_segmented_yield_distribution_v5()
- All three wrappers use same lock ID to serialize operations on same fund

### Fix 3: Update Service Layer
- Update advancedTransactionService.ts to call wrapper functions instead of base RPC functions
- Update yieldApplyService.ts to call wrapper function for yield application

---

## Test Coverage Required

### Test 1: Atomic Void Operation (Invariant 1)
**File:** tests/migrations/void_unvoid_concurrency_tests.sql

Test that void operation is atomic:
```sql
-- Setup: investor, fund, deposit $1,000
-- Void the transaction
PERFORM void_transaction(tx_id, fund_id, 'test')
-- Assert: position = $0 AND aum = $0
-- Assert: no intermediate state visible to concurrent reads
```

### Test 2: Unvoid Restores Position (Invariant 3)
**File:** tests/migrations/void_unvoid_concurrency_tests.sql

Test that unvoid restores position but not yields:
```sql
-- Setup: investor, fund, deposit $1,000 + yield $50
-- Position before void: $1,050
-- Void transaction
PERFORM void_transaction(tx_id, fund_id, 'test')
-- Position after void: $0
-- Unvoid transaction
PERFORM unvoid_transaction(tx_id, fund_id, 'test unvoid')
-- Assert: position = $1,000 (NOT $1,050 - yields not restored)
-- Assert: yield is_voided = true (still voided)
```

### Test 3: Fund-Level Lock Prevents Race (Invariant 4)
**File:** tests/migrations/void_unvoid_concurrency_tests.sql

Test that fund-level lock serializes void and yield:
```sql
-- Setup: investor, fund, deposit $1,000 with yield allocation
-- Session 1: Void in transaction A
-- Session 2: Apply yield in transaction B (concurrent)
-- Assert: One waits for the other (locks serialize)
-- Assert: Final position-ledger state is consistent (no mismatch)
-- Verify: position = sum(non-voided transactions) + sum(non-voided yields)
```

---

## Rollback Plan

If issues arise during Phase 4A:

1. **If SERIALIZABLE isolation causes deadlocks:**
   - Reduce isolation level to READ COMMITTED (lose atomicity guarantee)
   - Rely on fund-level locks instead for serialization
   - Accept temporary race condition risk until better solution found

2. **If advisory locks cause contention:**
   - Monitor lock wait times in production
   - If p99 lock wait > 100ms, consider reducing scope (e.g., transaction-level locks)
   - Trade off correctness for performance if necessary

3. **If cascade void fails:**
   - Use explicit try-catch in void_transaction()
   - On cascade failure, roll back entire void operation
   - Return error to admin with explanation

---

## Related Documents

- **POSITION_SYNC_DUPLICATE_ANALYSIS.md** — Identifies race condition in Finding 6
- **POSITION_SYNC_INVARIANTS.md** — Core 5 invariants (this extends with 4 void/unvoid specific)
- **VOID_UNVOID_HARDENING_COMPLETE.md** — Results after Phase 4A implementation

---

## Document History

| Date | Author | Change |
|------|--------|--------|
| 2026-04-13 | Claude Code Agent | Initial document: 4 invariants + current implementation status + fixes required |

