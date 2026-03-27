

# Diagnostic Results & Remediation Plan

## Findings

### Issue 1: AUM Desync -- CONFIRMED

The BTC fund (`IND-BTC`) has a clear drift:
- **Snapshot AUM** (fund_daily_aum, latest): `20.38 BTC`
- **Live Positions Sum**: `10.38 BTC`
- **Exact Drift**: `10.00 BTC`

This 10 BTC delta means a voided transaction's position was correctly subtracted from `investor_positions` (via `trg_ledger_sync` + `trg_recompute_on_void`), but the `fund_daily_aum` snapshot was never refreshed. This confirms the bug we fixed in the last migration -- the old `void_transaction` called `recalculate_fund_aum_for_date` with 4 args instead of 2.

The fix we deployed is correct going forward, but the **existing stale snapshots from past voids need to be healed now**.

### Issue 2: Void Blocker -- NOT REPRODUCED

The audit log shows **5 successful voids** in the last hour, all with `success=true`. No errors in `admin_alerts`. The void cascade is working correctly after our migration fix.

If the UI still appears to "block" the void, it is likely the `check_aum_reconciliation` RPC call in the yield dialog throwing a type mismatch error (the service passes `p_as_of_date` as a `string`, but the DB function expects `date`). This would make the reconciliation widget silently fail, leaving stale "discrepancy" warnings visible and potentially blocking the yield confirm button (which requires `acknowledgeDiscrepancy` when `has_warning` is true).

### Issue 3: Reconciliation RPC Type Mismatch

The `check_aum_reconciliation` DB function signature is:
```
(p_fund_id uuid, p_tolerance_pct numeric DEFAULT 0.01, p_as_of_date date DEFAULT CURRENT_DATE)
```

But `aumReconciliationService.ts` passes `p_as_of_date` as a **string** (ISO date format). While Supabase usually casts this, the RPC wrapper may not handle it consistently, causing intermittent failures.

---

## Remediation Plan

### Step 1: Heal existing AUM snapshots (migration)

Run `recalculate_fund_aum_for_date` for BTC fund dates that have stale snapshots. This is a one-time data heal to sync `fund_daily_aum` with the current `investor_positions` reality.

```sql
-- Recalculate AUM for the dates that are stale
SELECT recalculate_fund_aum_for_date(
  '0a048d9b-c4cf-46eb-b428-59e10307df93'::uuid,
  d.aum_date
)
FROM fund_daily_aum d
WHERE d.fund_id = '0a048d9b-c4cf-46eb-b428-59e10307df93'
  AND d.is_voided = false
  AND d.aum_date >= '2026-03-01';
```

### Step 2: Fix `aumReconciliationService.ts` type cast

Ensure `p_as_of_date` is cast to `date` type explicitly, or remove the parameter entirely to use the DB default (`CURRENT_DATE`). This prevents silent failures in the reconciliation check.

### Step 3: Verify post-fix

After the heal, confirm:
- `fund_daily_aum` latest for BTC = live positions sum (10.38)
- `useAUMReconciliation` returns `has_warning: false`
- Void action works from UI with detailed error surfacing (from our previous fix)

---

## Technical Details

**Files to modify:**
- `src/features/admin/funds/services/aumReconciliationService.ts` -- explicit date cast
- One-time SQL heal via migration tool (not a schema migration, a data fix)

**Root cause chain:**
1. Old `void_transaction` called `recalculate_fund_aum_for_date(fund_id, date, purpose, admin_id)` -- 4 args
2. Function only accepts 2 args -- call silently failed in EXCEPTION handler
3. Position updated correctly, but AUM snapshot stayed stale
4. UI reads stale snapshot, shows "discrepancy", blocks yield confirm

**Risk:** Zero. The `recalculate_fund_aum_for_date` function simply sums active positions and upserts into `fund_daily_aum`. It is idempotent.

