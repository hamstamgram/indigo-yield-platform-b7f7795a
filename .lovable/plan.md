
# Full Stack Audit Report -- Remaining Bugs & Vulnerabilities

---

## Summary

After tracing data from PostgreSQL triggers through RPCs, services, hooks, and UI components, and comparing against the previous audit remediation work, here is the current state. Previous rounds fixed ~25 issues. This audit found **11 remaining bugs** across 4 severity levels.

---

## P0 -- Critical Security

### BUG 1: `anon` Role Has EXECUTE on ALL Financial RPCs (UNFIXED from Prior Audit)

No post-baseline migration has revoked `anon` grants. The definitive baseline (line 21953+) grants `ALL ON FUNCTION` to `anon` for every RPC including `void_transaction`, `set_canonical_rpc`, `apply_segmented_yield_distribution_v5`, `approve_and_complete_withdrawal`, `force_delete_investor`, etc.

- **Risk**: The anon key is embedded in the client JS bundle. While most RPCs have internal `is_admin()` checks, `set_canonical_rpc` has NO auth check -- calling it with the anon key sets session flags that bypass ALL mutation guards (`trg_enforce_canonical_position_write`, `enforce_canonical_yield_mutation`, etc.).
- **Fix**: New SQL migration to revoke `anon` EXECUTE on ~50 admin-mutation RPCs. Key functions:

```sql
REVOKE ALL ON FUNCTION public.set_canonical_rpc(boolean) FROM anon;
REVOKE ALL ON FUNCTION public.void_transaction(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.void_yield_distribution(uuid, uuid, text, boolean) FROM anon;
REVOKE ALL ON FUNCTION public.approve_and_complete_withdrawal(uuid, numeric, text, text, boolean, integer) FROM anon;
REVOKE ALL ON FUNCTION public.apply_segmented_yield_distribution_v5(uuid, date, numeric, uuid, aum_purpose, date) FROM anon;
REVOKE ALL ON FUNCTION public.adjust_investor_position(uuid, uuid, numeric, text, date, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.force_delete_investor(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.void_transactions_bulk(uuid[], uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.unvoid_transaction(uuid, uuid, text) FROM anon;
REVOKE ALL ON FUNCTION public.apply_investor_transaction(uuid, uuid, tx_type, numeric, date, text, uuid, text, aum_purpose, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.crystallize_yield_before_flow(uuid, numeric, text, text, timestamptz, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.recompute_investor_position(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.recalculate_fund_aum_for_date(uuid, date) FROM anon;
REVOKE ALL ON FUNCTION public.add_fund_to_investor(uuid, text, numeric, numeric) FROM anon;
REVOKE ALL ON FUNCTION public.acquire_position_lock(uuid, uuid) FROM anon;
REVOKE ALL ON FUNCTION public.acquire_withdrawal_lock(uuid) FROM anon;
REVOKE ALL ON FUNCTION public.acquire_yield_lock(uuid, date) FROM anon;
```

### BUG 2: `void_yield_distribution` Missing `is_admin()` Check (UNFIXED)

The latest version in migration `20260327113803` has NO admin authentication. It accepts `p_admin_id` as a parameter but never verifies the caller. Combined with BUG 1, any authenticated user can void any yield distribution.

- **Fix**: Add after line 27 (`PERFORM set_config...`):
```sql
IF NOT public.is_admin() THEN
  RAISE EXCEPTION 'Unauthorized: admin role required';
END IF;
```

---

## P1 -- Edge Function Security

### BUG 3: `process-report-delivery-queue` Still Falls Back to `profiles.is_admin`

Lines 77-91 of `supabase/functions/process-report-delivery-queue/index.ts` still use a `profiles.is_admin` fallback after the `user_roles` check. The shared `admin-check.ts` module correctly removed this fallback (line 57: "No fallback to profiles.is_admin"), but this specific Edge Function has its own inline check that was never updated.

- **Risk**: An authenticated investor could `UPDATE profiles SET is_admin = true WHERE id = auth.uid()` (RLS allows self-update), then call this Edge Function to trigger unauthorized email sends.
- **Fix**: Remove lines 77-91 and replace with a simple deny:
```typescript
if (!isAdmin) {
  return new Response(JSON.stringify({ error: "Forbidden" }), { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } });
}
```

---

## P2 -- Precision & Data Integrity

### BUG 4: `yieldAumService.ts` Uses `Number()` for AUM Values

Line 66: `aumValue: Number(row.aum_value || 0)`. AUM values from the database are `NUMERIC(38,18)` strings. `Number()` loses precision beyond 15 significant digits.

- **Fix**: `aumValue: parseFinancial(row.aum_value || 0).toNumber()` -- uses Decimal.js safe parse.

### BUG 5: `adminService.ts` Accumulates Withdrawals via `.toNumber()` Loop

Lines 55-59: `withdrawalRequests?.reduce((sum, req) => parseFinancial(sum).plus(parseFinancial(req.requested_amount)).toNumber(), 0)` -- each iteration converts Decimal back to `number` via `.toNumber()`, then re-parses on the next iteration. This Decimal->Number->Decimal loop causes cumulative IEEE 754 drift.

- **Fix**: Accumulate as Decimal, convert once at the end:
```typescript
const pendingWithdrawals = withdrawalRequests?.reduce(
  (sum, req) => sum.plus(parseFinancial(req.requested_amount)),
  parseFinancial(0)
).toNumber() || 0;
```

### BUG 6: `requestsQueueService.ts` Uses `Number()` on Withdrawal Amount

Line 46: `Number(parseFinancial(params.amount).toString())` -- double conversion. `parseFinancial` returns a Decimal, `.toString()` gives a string, then `Number()` converts to float. Should use `.toNumber()` directly.

- **Fix**: `updatePayload.approved_amount = parseFinancial(params.amount).toNumber();`

### BUG 7: `depositService.ts` Uses `Number(String(amount))` for Notification

Line 194: `Number(String(amount))` -- a redundant double cast. While this is for a non-financial notification display, it sets a bad precedent.

- **Fix**: `parseFinancial(amount).toNumber()`

### BUG 8: `feeScheduleService.ts` Uses Bare `Number()` for Fee Percentages

Lines 33 and 193: `Number(row.fee_pct || 0)` and `Number(data.fee_pct)`. Fee percentages are small values (0-100), so precision loss is unlikely, but inconsistent with the Decimal standard.

- **Fix**: `parseFinancial(row.fee_pct || 0).toNumber()`

---

## P2 -- UI State & Display

### BUG 9: `ExpertPositionsTable` Edit Uses `parseFloat()` for Position Values

Lines 156, 175, 196: `parseFloat(e.target.value) || 0` feeds into edit state for `shares`, `costBasis`, and `currentValue`. These values then feed into position adjustment mutations.

- **Fix**: Replace with `toNum(e.target.value)` for consistency with the rest of the codebase. The values are stored in React state and will be passed as strings to RPCs.

### BUG 10: `adminService.ts` Uses Hardcoded Placeholder for 24h Yield

Line 62: `const interest24h = totalAum * 0.0001;` -- this is a hardcoded placeholder that calculates a fake 0.01% daily yield. It displays in the admin dashboard as a real metric.

- **Fix**: Either implement a real 24h yield RPC (sum YIELD transactions from last 24h) or clearly label this as "N/A" / remove from dashboard KPIs.

---

## P3 -- Dead Code & Redundancy

### BUG 11: Duplicate `checkAumExists` Functions

Two separate implementations exist:
1. `transactionFormDataService.ts` line 58: Actually queries `fund_daily_aum` (the real one used by hooks)
2. `transactionDetailsService.ts` line 181: Returns `{ exists: true }` always (dead code)

The dead version in `transactionDetailsService.ts` should be deleted. It is exported but only the `transactionFormDataService` version is consumed by hooks.

---

## Clean Areas (No Issues Found)

- `toFinancialString()` -- correctly uses `.toFixed(18)` (fixed in prior round)
- `Decimal.js` precision set to 40 (fixed in prior round)
- `YieldDistributionsPage` void handlers -- all 3 active handlers call `invalidateAfterYieldOp` (fixed in prior round)
- `VoidYieldDialog` -- deprecated impact preview removed (fixed in prior round)
- Dead yield functions (`voidYieldRecord`, `updateYieldAum`, `getYieldVoidImpact`) -- all removed (fixed in prior round)
- `statementGenerator.ts` -- uses asset-aware decimal places (fixed in prior round)
- `yieldCrystallizationService.ts` -- uses Decimal accumulation (fixed in prior round)
- No direct INSERT/UPDATE on protected tables from frontend components
- Advisory locks in `void_transaction`, `void_yield_distribution`, `approve_and_complete_withdrawal` are correctly scoped
- Trigger cascade (`trg_ledger_sync` -> `fn_ledger_drives_position`) is atomic within transaction
- No implicit float casts in SQL functions (all use `numeric(38,18)`)

---

## Implementation Plan

### Phase 1: P0 Security (1 SQL migration)
- New migration revoking `anon` EXECUTE on all admin RPCs
- Add `is_admin()` check to `void_yield_distribution`

### Phase 2: P1 Edge Function Fix (1 file)
- `process-report-delivery-queue/index.ts`: Remove `profiles.is_admin` fallback

### Phase 3: P2 Precision Fixes (5 files)
- `yieldAumService.ts`: `Number()` -> `parseFinancial().toNumber()`
- `adminService.ts`: Fix reduce accumulation loop + remove fake 24h yield
- `requestsQueueService.ts`: Fix double conversion
- `depositService.ts`: Fix notification amount cast
- `feeScheduleService.ts`: Fix bare `Number()` on fee_pct

### Phase 4: P2 UI Fix (1 file)
- `ExpertPositionsTable.tsx`: `parseFloat()` -> `toNum()` in edit handlers

### Phase 5: P3 Cleanup (1 file)
- `transactionDetailsService.ts`: Delete dead `checkAumExists`

**Total: 1 SQL migration + 8 TypeScript files**
