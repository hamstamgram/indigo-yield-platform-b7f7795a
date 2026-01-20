# Cost Basis Integrity System

## Overview

This document describes the cost_basis integrity system that prevents corruption and ensures investor positions always match the ledger.

---

## Cost Basis Policy (CFO-Approved)

### Definition

```
cost_basis = Sum(DEPOSIT amounts) - Sum(WITHDRAWAL amounts)
```

### Key Rules

| Transaction Type | Effect on cost_basis |
|-----------------|---------------------|
| DEPOSIT | + amount |
| WITHDRAWAL | - amount |
| YIELD/INTEREST | No effect |
| FEE/IB_DEBIT | No effect |
| IB_CREDIT/FEE_CREDIT | No effect |
| VOID | Reverses original effect |

### Current Value Policy

```
current_value = deposits - withdrawals + yield - fees + credits
```

---

## Architecture: Single Canonical Writer

### The Problem (Root Cause)

Before this fix, multiple writers could update `investor_positions`:

- `apply_deposit_with_crystallization` → wrote cost_basis
- `recompute_investor_position` trigger → also wrote cost_basis
- Race condition → doubled cost_basis

### The Solution

**One writer to rule them all:**

```
transactions_v2 INSERT/UPDATE/DELETE
        ↓
trg_recompute_position_on_tx (trigger)
        ↓
recompute_investor_position() (THE ONLY WRITER)
        ↓
investor_positions updated
```

All canonical RPCs now:
1. Insert/update `transactions_v2`
2. Let the trigger call `recompute_investor_position()`
3. Never directly update position fields

---

## Enforcement Guard

### `trg_enforce_canonical_position_write`

This trigger **BLOCKS** any direct writes to `cost_basis`, `current_value`, or `shares` unless:

1. The session variable `app.canonical_rpc = 'true'` is set, OR
2. The session variable `indigo.canonical_rpc = 'true'` is set

### Bypass (for canonical functions only)

```sql
-- Inside canonical RPCs:
PERFORM set_canonical_rpc();  -- Sets app.canonical_rpc = 'true'

-- Now updates are allowed
UPDATE investor_positions SET cost_basis = ... WHERE ...;
```

### What Happens on Blocked Write

1. Exception raised: `Direct writes to investor_positions are blocked`
2. Entry logged to `audit_log` with action = `BLOCKED_DIRECT_POSITION_WRITE`
3. Transaction rolled back

---

## Canonical Projection Functions

### `compute_position_from_ledger(p_investor_id, p_fund_id, p_as_of)`

**Purpose:** Read-only projection of what position values SHOULD be based on ledger.

**Returns:**
```json
{
  "investor_id": "...",
  "fund_id": "...",
  "as_of": "2026-01-20T00:00:00Z",
  "breakdown": {
    "deposits": 10000,
    "withdrawals": 2000,
    "yield": 500,
    "fees": 50,
    "ib_credits": 10
  },
  "computed": {
    "cost_basis": 8000,
    "current_value": 8460,
    "shares": 8460
  }
}
```

### `rebuild_position_from_ledger(p_investor_id, p_fund_id, p_admin_id, p_reason, p_dry_run)`

**Purpose:** Write the computed values to `investor_positions` (with audit trail).

**Usage:**
```sql
-- Preview changes (dry_run = true)
SELECT rebuild_position_from_ledger(
  'investor-uuid',
  'fund-uuid',
  'admin-uuid',
  'Manual repair after investigation',
  true  -- dry_run
);

-- Apply changes (dry_run = false)
SELECT rebuild_position_from_ledger(
  'investor-uuid',
  'fund-uuid',
  'admin-uuid',
  'Manual repair after investigation',
  false  -- apply
);
```

---

## Detection: Integrity Views

### `v_cost_basis_mismatch`

Detects any position where stored values differ from ledger projection.

```sql
SELECT * FROM v_cost_basis_mismatch;
```

**Returns:**
| Column | Description |
|--------|-------------|
| investor_id | UUID |
| fund_id | UUID |
| fund_code | e.g., "IND-BTC" |
| investor_email | Email |
| position_cost_basis | What's stored |
| computed_cost_basis | What ledger says |
| cost_basis_variance | Difference |
| cost_basis_variance_pct | Percentage difference |

**Healthy System:** This view should return 0 rows.

### Integration with Integrity Monitor

The `integrity-monitor` edge function includes this check:

```typescript
{
  name: "Cost Basis Mismatch",
  query: "SELECT * FROM v_cost_basis_mismatch LIMIT 5",
  severity: "critical",
  description: "Position cost_basis differs from ledger projection"
}
```

Any non-zero results will:
- Fail the integrity check
- Create an `admin_alert`
- Send Slack/email notifications (if configured)

---

## Repair Procedures

### Automated Batch Repair

For multiple corrupted positions:

```sql
-- Step 1: Preview all repairs
SELECT fix_cost_basis_anomalies(
  'admin-uuid',
  'Batch repair from ledger projection',
  true  -- dry_run
);

-- Step 2: Review output, get CFO sign-off

-- Step 3: Apply repairs
SELECT fix_cost_basis_anomalies(
  'admin-uuid',
  'Batch repair from ledger projection',
  false  -- apply
);
```

### Single Position Repair

For one specific position:

```sql
-- Step 1: Investigate
SELECT * FROM v_cost_basis_mismatch 
WHERE investor_id = 'xxx' AND fund_id = 'yyy';

SELECT compute_position_from_ledger('investor-uuid', 'fund-uuid');

-- Step 2: Preview repair
SELECT rebuild_position_from_ledger(
  'investor-uuid',
  'fund-uuid',
  'admin-uuid',
  'Repair: cost_basis drift detected by nightly monitor',
  true
);

-- Step 3: Apply
SELECT rebuild_position_from_ledger(
  'investor-uuid',
  'fund-uuid',
  'admin-uuid',
  'Repair: cost_basis drift detected by nightly monitor',
  false
);

-- Step 4: Verify
SELECT * FROM v_cost_basis_mismatch 
WHERE investor_id = 'xxx' AND fund_id = 'yyy';
-- Should return 0 rows
```

---

## Prevention: Guardrails

### 1. Single Writer Architecture
Only `recompute_investor_position()` can write position fields.

### 2. Trigger Enforcement
`trg_enforce_canonical_position_write` blocks unauthorized writes.

### 3. Duplicate Writer Elimination (Jan 2026)

**Phase 1 - Core RPCs:**

| Function | Status |
|----------|--------|
| `apply_deposit_with_crystallization` | ✅ No direct writes |
| `apply_withdrawal_with_crystallization` | ✅ No direct writes |
| `void_transaction` | ✅ No direct writes |
| `void_yield_distribution` | ✅ No direct writes |
| `admin_create_transaction` | ✅ No direct writes |

**Phase 2 - Remaining Functions:**

| Function | Status |
|----------|--------|
| `add_fund_to_investor` | ✅ Creates shell only, trigger populates |
| `adjust_investor_position` | ✅ Relies on trigger chain |
| `admin_create_transactions_batch` | ✅ Relies on trigger chain |
| `apply_transaction_with_crystallization` | ✅ Relies on trigger chain |
| `fix_doubled_cost_basis` | ✅ Uses set_canonical_rpc() bypass |
| `reconcile_all_positions` | ✅ Uses set_canonical_rpc() bypass |
| `reconcile_investor_position` | ✅ Uses set_canonical_rpc() bypass |
| `rollback_yield_correction` | ✅ Uses set_canonical_rpc() bypass |

**Archived (Execute Revoked):**
- `process_yield_distribution` - DEPRECATED
- `process_yield_distribution_with_dust` - DEPRECATED

Position updates are handled EXCLUSIVELY by the trigger chain:
- `transactions_v2` INSERT → `trg_recompute_position_on_tx` → `recompute_investor_position()`
- `transactions_v2` UPDATE (void) → `trg_recompute_on_void` → `recompute_investor_position()`

### 4. Idempotent Transactions
`reference_id` unique constraint prevents double-application.

### 5. Integrity Monitoring
- `run_integrity_pack()` RPC for on-demand checks
- `integrity-monitor` edge function for scheduled checks
- `v_cost_basis_mismatch` view for quick visibility

### 6. Audit Trail
All repairs logged to `audit_log` with:
- `action = 'cost_basis_repair'` or `'position_rebuild_from_ledger'`
- Old and new values
- Admin who performed the repair
- Reason for the repair

---

## Regression Testing

Run regression tests after any changes:

```bash
psql $DATABASE_URL -f tests/sql/cost_basis_regression.sql
```

### Test Coverage

| Test | Description |
|------|-------------|
| TEST 1 | `compute_position_from_ledger` returns valid results |
| TEST 2 | `v_cost_basis_mismatch` view is accessible |
| TEST 3 | `rebuild_position_from_ledger` dry_run works |
| TEST 4 | Direct writes are blocked |
| TEST 5 | Canonical RPC flag allows writes |
| TEST 6 | Transaction idempotency via `reference_id` |
| TEST 7 | `run_integrity_pack` includes cost_basis check |

---

## Runbook Summary

### Detect
```sql
SELECT * FROM v_cost_basis_mismatch;
```

### Repair
```sql
SELECT rebuild_position_from_ledger(investor_id, fund_id, admin_id, reason, dry_run);
```

### Validate
```sql
SELECT * FROM v_cost_basis_mismatch WHERE investor_id = 'xxx';
-- Should return 0 rows
```

### Prevent
- All writes go through `transactions_v2` → trigger → `recompute_investor_position()`
- Direct writes blocked by `trg_enforce_canonical_position_write`
- Nightly integrity checks via `integrity-monitor`

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-20 | Duplicate writer elimination: removed direct position writes from 5 core RPCs |
| 2026-01-20 | Initial implementation: single canonical writer, enforcement guard, integrity view |
