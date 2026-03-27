

# Similar Issues Found Across the Platform

## Summary

After scanning all migrations, triggers, and RPCs, I found **3 issues** of the same class as the swapped-parameter bug -- all in the database layer, all involving trigger/function logic gaps.

---

## Issue 1: `fn_ledger_drives_position` missing `INTERNAL_WITHDRAWAL` / `INTERNAL_CREDIT` in cost_basis (MEDIUM)

**What**: The incremental trigger `fn_ledger_drives_position` only handles `DEPOSIT`, `WITHDRAWAL`, and `ADJUSTMENT` in its cost_basis CASE statements. `INTERNAL_WITHDRAWAL` and `INTERNAL_CREDIT` (used by internal fund transfers / fee routing) fall through to `ELSE cost_basis` (no change).

Meanwhile, the full recompute functions (`recompute_investor_position`, `reconcile_investor_position_internal`) correctly handle both:
```sql
WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(amount)
WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
```

**Impact**: After an internal transfer, `cost_basis` is stale until a full recompute runs. The `v_cost_basis_mismatch` integrity check would flag this drift.

**Fix**: Add `INTERNAL_CREDIT` and `INTERNAL_WITHDRAWAL` to all 3 paths (INSERT, void, unvoid) in `fn_ledger_drives_position`'s cost_basis CASE statements, matching the full recompute logic.

---

## Issue 2: Dust sweep cascade in `void_transaction` missing `investor_id` filter (LOW-MEDIUM)

**What**: When voiding a WITHDRAWAL, the cascade void for dust sweeps uses:
```sql
WHERE type = 'DUST_SWEEP'
  AND fund_id = v_tx.fund_id
  AND tx_date = v_tx.tx_date
  AND (reference_id LIKE 'dust-sweep-%' OR reference_id LIKE 'dust-credit-%')
```

This is missing `AND investor_id = v_tx.investor_id`. If two full-exit withdrawals happen on the same day from the same fund, voiding one would cascade-void the other investor's dust sweep.

Additionally, the pattern matches `dust-credit-%` (the fees_account side), which is correct (both sides should be voided), but relying on date + fund matching rather than referencing the specific `request_id` is fragile.

**Impact**: Only triggers with concurrent same-day full-exit withdrawals from the same fund. Low probability at current AUM, but a data integrity risk.

**Fix**: Add `investor_id` filter OR match the specific request_id embedded in the dust sweep reference_id. Safest approach: use the withdrawal's `reference_id` to derive the dust sweep reference_id directly:
```sql
WHERE type = 'DUST_SWEEP'
  AND fund_id = v_tx.fund_id
  AND is_voided = false
  AND (
    investor_id = v_tx.investor_id
    OR reference_id LIKE 'dust-credit-%'
  )
  AND tx_date = v_tx.tx_date
```

---

## Issue 3: `recompute_on_void` comment is misleading (COSMETIC)

**What**: The migration comment says "fn_ledger_drives_position already set indigo.canonical_rpc = 'true'" but `fn_ledger_drives_position` does NOT set this flag. It works because the calling RPC (e.g., `void_transaction`) sets it before the UPDATE. The skip logic is still correct, but the comment is wrong and could mislead future maintainers.

**Fix**: Correct the comment to: "The calling RPC already set indigo.canonical_rpc = 'true' before updating transactions_v2."

---

## Files Changed

| File | Change |
|------|--------|
| New SQL migration | Fix `fn_ledger_drives_position` cost_basis for INTERNAL_WITHDRAWAL/INTERNAL_CREDIT |
| Same migration | Add `investor_id` filter to dust sweep cascade in `void_transaction` |
| Same migration | Fix misleading comment in `recompute_on_void` |

## Risk Assessment

- Issue 1 (cost_basis drift): Low risk fix -- adds missing CASE branches, no behavior change for existing types
- Issue 2 (dust cascade): Low risk fix -- tightens WHERE clause, only prevents false positives
- Issue 3 (comment): Zero risk

