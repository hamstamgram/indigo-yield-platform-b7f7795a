
# Audit: Why Transactions, Yields, and Voids Are Failing

## Root Cause Found

After tracing every code path from UI to database and checking the Postgres error logs, the primary blocker has been identified.

### The Error (from database logs)

```
ERROR: operator does not exist: tx_type = transaction_type
HINT: No operator matches the given name and argument types.
```

This error fires every time you try to create a transaction.

---

## Bug 1 (CRITICAL): Enum Type Mismatch in `apply_investor_transaction`

The database has **two different enum types** for transaction categories:

- `tx_type` -- used by the `transactions_v2.type` column (DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, etc.)
- `transaction_type` -- a separate, older enum (DEPOSIT, WITHDRAWAL, INTEREST, FEE, DUST_ALLOCATION)

The `apply_investor_transaction` function declares its parameter as `transaction_type`:
```
p_tx_type transaction_type
```

But inside the function, it compares and assigns this value to the `transactions_v2.type` column, which is `tx_type`. PostgreSQL cannot compare two different enum types without an explicit cast, so it throws the error above.

**Fix:** Recreate the function with `p_tx_type tx_type` instead of `p_tx_type transaction_type`. This aligns the parameter with the column it writes to.

## Bug 2 (CRITICAL): Wrong Table Name in `apply_investor_transaction`

Inside the same function, the audit logging step inserts into `audit_logs` (plural), but the actual table is named `audit_log` (singular). Even if Bug 1 were fixed, this would cause the function to fail after inserting the transaction.

**Fix:** Change `INSERT INTO audit_logs` to `INSERT INTO public.audit_log` in the function body.

## Bug 3 (MODERATE): Generated Types Out of Sync

The Supabase generated types file (`src/integrations/supabase/types.ts`) declares:
```typescript
p_tx_type: Database["public"]["Enums"]["transaction_type"]
```

After fixing the DB function to use `tx_type`, the generated types need to be regenerated so the frontend sends the correct enum type.

---

## Impact Analysis

| Action | Blocked? | Reason |
|--------|----------|--------|
| Create Transaction | YES | Bug 1 + 2 in `apply_investor_transaction` |
| Record Yield | Likely NO | `apply_segmented_yield_distribution_v5` does not use `transaction_type` enum |
| Void Transaction | NO | `void_transaction` uses UUID lookups only, no enum comparison |
| Void Yield | NO | `void_yield_distribution` uses UUID lookups only |

If yield recording is also failing, it may be a different issue (UI-side or RLS). Once the transaction fix is deployed, we should re-test yields separately.

---

## Implementation Steps

### Step 1: Fix the database function (SQL migration)

Create a migration that drops and recreates `apply_investor_transaction` with:
- `p_tx_type tx_type` (instead of `transaction_type`)
- `INSERT INTO public.audit_log` (instead of `audit_logs`)
- Keep all other logic identical

### Step 2: Regenerate Supabase types

After the migration runs, regenerate the types file so `p_tx_type` is typed as `Database["public"]["Enums"]["tx_type"]` instead of `transaction_type`.

### Step 3: Verify the frontend enum validation

The frontend `TxTypeSchema` already validates against `tx_type` values (DEPOSIT, WITHDRAWAL, etc.), so the `mapTypeForDb("FIRST_INVESTMENT")` correctly returns `"DEPOSIT"` which is valid in both enums. No frontend changes needed.

### Step 4: Test all three flows

After deployment, verify:
1. Create a test DEPOSIT transaction
2. Record a yield distribution
3. Void the test transaction
