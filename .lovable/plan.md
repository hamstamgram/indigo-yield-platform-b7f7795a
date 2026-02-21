

# Fix: `operator does not exist: tx_type = transaction_type`

## Root Cause

The `apply_investor_transaction` function has two bugs that block all transaction creation:

### Bug 1: Enum type mismatch

The function parameter is declared as:
```sql
p_tx_type transaction_type
```

But `transactions_v2.type` column uses the `tx_type` enum. PostgreSQL cannot compare two different enum types, so lines like `AND type = p_tx_type` and the INSERT both fail.

The two enums have different value sets:
- `transaction_type` (legacy): DEPOSIT, WITHDRAWAL, INTEREST, FEE, DUST_ALLOCATION
- `tx_type` (current): DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, + 4 more

### Bug 2: Wrong audit table name

The function inserts into `audit_logs` (plural) but the table is `audit_log` (singular). This would fail even after fixing Bug 1.

## Fix: Single SQL Migration

Drop and recreate the function with:
1. `p_tx_type tx_type` instead of `p_tx_type transaction_type`
2. `INSERT INTO public.audit_log` instead of `INSERT INTO audit_logs`
3. Fix audit column names to match actual schema (`actor_user`, `action`, `entity`, `entity_id`, `new_values`)

Everything else stays identical.

## Frontend Type Sync

Update the generated types file so `apply_investor_transaction`'s `p_tx_type` parameter references `Database["public"]["Enums"]["tx_type"]` instead of `transaction_type`. The frontend already sends valid `tx_type` values (DEPOSIT, WITHDRAWAL), so no other code changes are needed.

## What This Unblocks

- Transaction creation (DEPOSIT, WITHDRAWAL)
- Any flow that calls `apply_investor_transaction` (investments, manual transactions)

Yield recording and voiding use separate functions that don't have this bug, so they should already work (or have separate issues to diagnose after this fix).

