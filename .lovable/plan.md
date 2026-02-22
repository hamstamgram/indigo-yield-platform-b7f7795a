

# Fix: Build Error + Apply Yield Failure

Two issues to fix:

---

## Issue 1: Build Error -- `TX_TYPE_VALUES` missing `"IB"` enum value

The database `tx_type` enum now includes `"IB"` but `TX_TYPE_VALUES` in `src/contracts/dbEnums.ts` does not. The compile-time sync check at line 1233 correctly catches this mismatch.

**File**: `src/contracts/dbEnums.ts` line 826-839

**Fix**: Add `"IB"` to the `TX_TYPE_VALUES` array and add `IB: "IB"` to the `DB_TX_TYPE` constant.

---

## Issue 2: Apply Yield Fails -- `visibility_scope` column does not exist

The function `getPendingYieldEventsCount` in `src/services/admin/yields/yieldCrystallizationService.ts` (lines 286-315) queries `yield_distributions.visibility_scope`, but this column does not exist on the `yield_distributions` table. It was part of a now-dropped `investor_yield_events` table.

The DB logs confirm this is the only active error: `column yield_distributions_1.visibility_scope does not exist` (4 occurrences).

**What the function is trying to do**: Count pending (not-yet-finalized) yield allocations for a fund in a period.

**What exists in the table**: The `yield_distributions` table has `status` (values: `applied`, `voided`) and `distribution_type` (values: `daily`, `month_end`). There is no concept of "admin_only" visibility -- the V6 architecture abolished yield events and visibility scoping.

**Fix**: Rewrite the query in `getPendingYieldEventsCount` to query `yield_distributions` directly (not via the broken join through `yield_allocations`) using existing columns:

```typescript
const { data, error } = await supabase
  .from("yield_distributions")
  .select("id, net_yield")
  .eq("fund_id", fundId)
  .eq("is_voided", false)
  .eq("distribution_type", "daily")
  .gte("period_start", formatDateForDB(periodStart))
  .lte("period_end", formatDateForDB(periodEnd));
```

This queries non-voided daily (transaction checkpoint) distributions in the period -- which is the V6 equivalent of "admin_only pending yield events."

Also update the `YieldEvent` interface (lines 20-44) to remove the `visibility_scope` field since it no longer exists anywhere in the schema.

---

## Files Changed

| File | Change |
|------|--------|
| `src/contracts/dbEnums.ts` | Add `"IB"` to `TX_TYPE_VALUES` and `DB_TX_TYPE` |
| `src/services/admin/yields/yieldCrystallizationService.ts` | Rewrite `getPendingYieldEventsCount` to use `yield_distributions` directly; remove `visibility_scope` from `YieldEvent` interface |

No database migrations needed. No new features added.

