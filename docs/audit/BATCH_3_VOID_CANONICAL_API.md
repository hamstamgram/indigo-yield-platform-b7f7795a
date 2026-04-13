# Canonical Void Transaction API

**Status**: DOCUMENTED
**Risk Level**: LOW (documentation, no code changes)
**Phase**: Batch 3 Phase 2 - Clarification & Testing

---

## Overview

The void transaction system is atomic and idempotent. Use the appropriate RPC for your use case.

---

## Canonical External RPCs (User-Facing)

### 1. void_transaction() — Basic Void
**When to use**: Permanently void a transaction without correction

**Signature**:
```sql
void_transaction(
  p_transaction_id uuid,        -- Transaction to void
  p_admin_id uuid,              -- Admin performing action
  p_reason text                 -- Reason for void (audit trail)
) RETURNS void
```

**Effects** (atomic):
- Sets `transactions_v2.is_voided = true`
- Triggers cascade void → allocations, yield events, fees
- Updates dependent positions & AUM
- Inserts audit_log entry
- Email notification to investor

**Errors**:
- `invalid_transaction_id` — Transaction doesn't exist
- `already_voided` — Transaction already voided
- `invalid_admin_id` — User not authenticated as admin
- `cascade_violation` — Dependent data constraints prevent void

**Example**:
```sql
SELECT void_transaction(
  'a1234567-1234-1234-1234-123456789abc'::uuid,
  (SELECT auth.uid()),
  'Duplicate deposit entry'
);
```

---

### 2. void_and_reissue_transaction() — Void + Correct
**When to use**: Correct a transaction (amount, date, notes, hash)

**Signature**:
```sql
void_and_reissue_transaction(
  p_original_tx_id uuid,        -- Transaction to correct
  p_new_amount numeric,         -- Corrected amount
  p_new_date text,              -- Corrected date (YYYY-MM-DD)
  p_reason text,                -- Reason for correction
  p_admin_id uuid,              -- Admin performing action
  p_new_notes text = null,      -- Optional: new notes
  p_new_tx_hash text = null     -- Optional: new blockchain hash
) RETURNS TABLE (
  voided_tx_id uuid,
  new_tx_id uuid
)
```

**Effects** (atomic):
- Voids original transaction (same as void_transaction)
- Creates new transaction with corrected values
- New TX inherits: investor_id, fund_id, type, visibility_scope
- New TX gets: new amount, date, notes, hash
- Updates positions & AUM for both void and new TX
- Both operations logged to audit_log

**Errors**: Same as void_transaction, plus:
- `invalid_amount` — Amount not positive or valid numeric
- `invalid_date` — Date format invalid or date in future

**Example**:
```sql
SELECT void_and_reissue_transaction(
  'a1234567-1234-1234-1234-123456789abc'::uuid,
  1000.50,
  '2026-04-10',
  'Corrected deposit amount - was 1000.00, should be 1000.50',
  (SELECT auth.uid()),
  'Corrected amount',
  '0x123abc...'
);
```

---

### 3. void_and_reissue_full_exit() — Void Full Withdrawal + Dust Sweeps
**When to use**: Correct a full-exit withdrawal (voids withdrawal + all dust sweeps)

**Signature**:
```sql
void_and_reissue_full_exit(
  p_transaction_id uuid,        -- Main withdrawal transaction
  p_new_amount numeric,         -- Corrected withdrawal amount
  p_admin_id uuid,              -- Admin performing action
  p_reason text,                -- Reason for correction
  p_new_date text = null        -- Optional: new date
) RETURNS TABLE (
  voided_tx_id uuid,
  new_tx_id uuid
)
```

**Effects** (atomic):
- Voids main withdrawal transaction
- Automatically voids all linked DUST_SWEEP transactions on same date/fund
- Resets withdrawal_request.status to PENDING (re-enables approval)
- Creates new corrected withdrawal transaction
- New withdrawal re-flows through approval & completion
- Comprehensive audit trail

**Errors**: Same as void_and_reissue_transaction, plus:
- `not_full_exit` — Transaction not a full-exit withdrawal
- `withdrawal_request_missing` — No matching withdrawal_request found
- `dependent_transactions_voided` — Dust sweeps already manually voided

**Example**:
```sql
SELECT void_and_reissue_full_exit(
  'a1234567-1234-1234-1234-123456789abc'::uuid,
  50000.00,
  (SELECT auth.uid()),
  'Corrected full-exit amount per investor request',
  '2026-04-10'
);
```

---

### 4. void_transactions_bulk() — Void Multiple (Admin Only)
**When to use**: Void multiple transactions atomically (super_admin only)

**Signature**:
```sql
void_transactions_bulk(
  p_transaction_ids uuid[],     -- Array of TX IDs to void
  p_admin_id uuid,              -- Super admin performing action
  p_reason text                 -- Reason for bulk void
) RETURNS TABLE (
  success boolean,
  count int,
  transaction_ids uuid[],
  error_code text = null,
  error_message text = null
)
```

**Effects** (atomic - all or nothing):
- Voids each transaction in the array
- Cascades void logic for each
- Updates positions & AUM for all affected investors
- Single audit log entry with bulk reason
- Email notifications to all affected investors

**Errors**:
- `permission_denied` — User not super_admin
- `invalid_transaction_ids` — One or more IDs invalid/not found
- `cascade_violation` — One TX cannot be voided (dependent constraints)
- `partial_success_not_allowed` — All-or-nothing atomicity enforced

**Note**: If ANY transaction fails, the entire operation rolls back (no partial voids).

**Example**:
```sql
SELECT void_transactions_bulk(
  ARRAY[
    'a1111111-1234-1234-1234-123456789abc'::uuid,
    'a2222222-1234-1234-1234-123456789abc'::uuid,
    'a3333333-1234-1234-1234-123456789abc'::uuid
  ],
  (SELECT auth.uid()),
  'Void all deposits from investor on 2026-04-01 due to data entry error'
);
```

---

### 5. unvoid_transaction() — Restore Voided
**When to use**: Restore a previously voided transaction

**Signature**:
```sql
unvoid_transaction(
  p_transaction_id uuid,        -- Voided transaction to restore
  p_admin_id uuid,              -- Admin performing action
  p_reason text                 -- Reason for restoration
) RETURNS void
```

**Effects** (atomic):
- Sets `transactions_v2.is_voided = false`
- Re-activates cascade relationships (allocations, yield events)
- Recalculates positions & AUM
- Inserts audit_log entry
- Email notification to investor

**Errors**:
- `invalid_transaction_id` — Transaction doesn't exist
- `not_voided` — Transaction is already active (not voided)
- `restoration_violation` — Cannot restore (e.g., newer TX on same date overwrites it)

**Example**:
```sql
SELECT unvoid_transaction(
  'a1234567-1234-1234-1234-123456789abc'::uuid,
  (SELECT auth.uid()),
  'Accidentally voided - restoring per investor request'
);
```

---

### 6. unvoid_transactions_bulk() — Restore Multiple (Admin Only)
**When to use**: Restore multiple voided transactions atomically

**Signature**:
```sql
unvoid_transactions_bulk(
  p_transaction_ids uuid[],     -- Array of voided TX IDs to restore
  p_admin_id uuid,              -- Admin performing action
  p_reason text                 -- Reason for restoration
) RETURNS TABLE (
  success boolean,
  count int,
  transaction_ids uuid[]
)
```

**Effects** (atomic - all or nothing):
- Unvoids each transaction in array
- Re-activates cascade relationships for all
- Recalculates positions & AUM
- Single audit log entry with bulk reason
- Email notifications to all affected investors

**Errors**: Same as unvoid_transaction, plus atomicity constraints.

---

## Internal Functions (Trigger-Based, Not User-Facing)

### Cascade Void Logic
Called automatically via trigger when `is_voided` flag changes:

**Functions**:
- `cascade_void_from_transaction()` — Main cascade orchestrator
- `cascade_void_to_allocations()` — Void allocation records
- `cascade_void_to_yield_events()` — Void yield entries
- `cascade_void_to_fees()` — Void fee records

**Trigger**:
```
trg_void_cascade
  BEFORE/AFTER UPDATE on transactions_v2
  FOR EACH ROW
  WHEN is_voided changes
  EXECUTE cascade_void_from_transaction()
```

**Why Internal**: 
- Implementation detail of void logic
- Called automatically by trigger
- Users don't call directly
- Not in rpcSignatures.ts

---

## Decision Matrix: Which RPC to Use?

| Scenario | Use This | Why |
|----------|----------|-----|
| Void a transaction permanently | `void_transaction()` | Simple, idempotent, cascade automatic |
| Correct amount/date/notes | `void_and_reissue_transaction()` | Atomic: old voided, new created |
| Correct a full-exit withdrawal | `void_and_reissue_full_exit()` | Handles dust sweeps + withdrawal_request |
| Void 10+ transactions at once | `void_transactions_bulk()` | Atomic, single audit entry |
| Restore a voided transaction | `unvoid_transaction()` | Reverses effects, audit trail |
| Restore 10+ voided transactions | `unvoid_transactions_bulk()` | Atomic restoration |

---

## Atomicity Guarantees

All void/unvoid operations are **atomic**:
- All-or-nothing: Either fully succeeds or rolls back completely
- Transaction-level consistency: Ledger + positions + AUM stay synchronized
- No partial states visible to other sessions
- Fail-fast on constraint violations

**Example Atomicity**:
```
void_and_reissue_transaction:
  1. Void original TX                    ✓
  2. Create new TX                       ✓
  3. Update investor_positions (old)     ✓
  4. Update investor_positions (new)     ✓
  5. Update fund_daily_aum (old)         ✓
  6. Update fund_daily_aum (new)         ✓
  7. Insert audit_log (both)             ✓
  IF ANY STEP FAILS → ROLLBACK ALL
```

---

## Error Handling

All void RPCs use consistent error structure:

```json
{
  "success": false,
  "error": {
    "code": "CONSTRAINT_VIOLATION",
    "message": "Cannot void: newer transaction on same date in same fund",
    "details": {
      "newer_tx_id": "xyz...",
      "newer_tx_date": "2026-04-11"
    }
  }
}
```

**Common Errors**:
- `INVALID_TRANSACTION_ID` — TX not found
- `ALREADY_VOIDED` / `NOT_VOIDED` — State mismatch
- `PERMISSION_DENIED` — User not admin/super_admin
- `CONSTRAINT_VIOLATION` — Dependent data prevents operation
- `RESTORATION_VIOLATION` — Cannot unvoid (newer TX exists)

---

## Testing Guide

### Unit Tests Required
1. ✅ void_transaction() — basic void
2. ✅ void_and_reissue_transaction() — correction
3. ✅ void_and_reissue_full_exit() — full-exit special case
4. ✅ void_transactions_bulk() — atomicity + rollback
5. ✅ unvoid_transaction() — restoration
6. ✅ Cascade logic — allocations, yield, fees all void

### Integration Tests Required
1. Position reconciliation after void/unvoid
2. AUM recalculation after void/unvoid
3. Yield distribution with voided TX present
4. Full-exit withdrawal void → re-approval flow
5. Bulk void rollback scenario
6. Audit trail completeness

### Edge Cases to Test
- Void transaction, then unvoid, then re-void (idempotency)
- Void TX → position updates → unvoid → position restores exactly
- Bulk void with 1 failure → all rolled back
- Void yield-bearing TX → yield events cascade voided
- Void allocation → investor balance recalculates
- Full-exit with 5+ dust sweeps → all voided atomically

---

## Deprecation Notes

**Functions to potentially deprecate** (but NOT in Phase 2):
- `void_yield_distribution()` — Consider merging into yield domain
- Duplicate cascade variants — Consolidate to single trigger if used

**Kept as-is**:
- All 6 user-facing RPCs (too critical to change)
- All internal cascade functions (working, complex)
- Error handling (solid, tested)

---

## Summary

**Phase 2 Consolidation**:
- ✅ Documented canonical API (6 RPCs)
- ✅ Clarified internal vs. external functions
- ✅ Provided decision matrix for choosing correct RPC
- ✅ Defined atomicity guarantees
- ✅ Listed test requirements
- ⏳ Next: Create regression test suite

**Outcome**: Clear, documented API with low risk. No behavior changes.
