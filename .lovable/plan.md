

# Live Void Cascade Test Plan

## Test Candidate (Lowest-Risk Transaction Found)

| Field | Value |
|-------|-------|
| TX ID | `4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d` |
| Type | `DUST` |
| Amount | `+0.000000000000000001` BTC (1 wei) |
| Date | 2025-03-31 |
| Investor | Indigo Fees (system account) |
| Fund | IND-BTC (`0a048d9b-...`) |

**Pre-test baseline:** Position = `0.044322787675625682`, Active BTC txs = 43, Audit entries = 2.

**Ghost table status:** `investor_yield_events` does NOT exist (confirmed). The void RPC's `IF EXISTS` guard will skip that cascade step cleanly.

## Why I Cannot Execute This

The `supabase--read_query` tool has SELECT/INSERT-only access. `void_transaction` is a SECURITY DEFINER RPC that performs UPDATEs. You need to run this in the **Supabase SQL Editor** or via the **test script** (`scripts/void-test-tx.mjs` pattern).

## Commands to Run in Supabase SQL Editor

### Step 1: Execute Void
```sql
SELECT void_transaction(
  '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d'::uuid,
  'd7f936ee-768b-4d93-83e8-f88a6cf10ae9'::uuid,
  'Phase 9 live void cascade test - 1 wei dust'
);
```

### Step 2: Verify Cascade (run immediately after)
```sql
-- 1. TX should be voided
SELECT id, type, amount, is_voided, voided_by, voided_at
FROM transactions_v2 WHERE id = '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d';

-- 2. Position should decrease by 0.000000000000000001
SELECT current_value, cost_basis, updated_at
FROM investor_positions
WHERE investor_id = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93';
-- EXPECTED: current_value = 0.044322787675625681

-- 3. Audit log should have new void entry
SELECT action, entity, created_at, meta
FROM audit_log
WHERE entity_id = '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d'
ORDER BY created_at DESC LIMIT 1;

-- 4. Ledger reconciliation still clean
SELECT * FROM v_ledger_reconciliation;
-- EXPECTED: 0 rows
```

### Step 3: Unvoid to Restore (cleanup)
```sql
SELECT unvoid_transaction(
  '4dc8cfc6-f417-4064-a1e9-b3f29bf1a46d'::uuid,
  'd7f936ee-768b-4d93-83e8-f88a6cf10ae9'::uuid,
  'Restoring after successful cascade test'
);
```

### Step 4: Verify Restoration
```sql
-- Position should be back to 0.044322787675625682
SELECT current_value FROM investor_positions
WHERE investor_id = 'b464a3f7-60d5-4bc0-9833-7b413bcc6cae'
  AND fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93';

-- Reconciliation still clean
SELECT * FROM v_ledger_reconciliation;
```

## What This Validates

1. `void_transaction` RPC executes without error (ghost table guard works)
2. `trg_ledger_sync` fires and reverses the position delta
3. Audit log records the void action
4. Ledger reconciliation remains at 0 violations after void
5. `unvoid_transaction` restores position exactly (no precision loss)
6. Full round-trip: position returns to exact original value

## Expected Results

| Check | Expected |
|-------|----------|
| TX `is_voided` | `true` after Step 1, `false` after Step 3 |
| Position after void | `0.044322787675625681` (decreased by 1 wei) |
| Position after unvoid | `0.044322787675625682` (exact restoration) |
| `v_ledger_reconciliation` | 0 rows at all times |
| Audit log | New `void_transaction` entry with reason |

Run these 4 steps in the Supabase SQL Editor and paste the results back. I will analyze the output for any anomalies.

