

# Audit Report: AUM Cards, Investor Count, and Yield AUM Accuracy

## Issue 1: AUM Cards Don't Update Quickly After a Deposit

### Root Cause

There are **two separate AUM data sources** using different query keys and different RPCs:

| Component | Hook | RPC | Query Key |
|-----------|------|-----|-----------|
| Header AUM bar | `useFundAUM` | `get_funds_with_aum` | `fund-aum-unified` |
| Yield operations page | `useActiveFundsWithAUM` | `get_active_funds_summary` | `active-funds-with-aum` |

After a deposit triggers `invalidateAfterTransaction()`, the cache invalidation graph includes `fundAumUnified` (header bar) but does **NOT** include `activeFundsWithAUM` (yield page). So the yield page only updates when its 5-second staleTime naturally expires.

For the header bar specifically: `useFundAUM` has a Realtime subscription on `investor_positions` changes, plus `refetchInterval: 15000` (15 seconds), and `staleTime: 5000`. The Realtime subscription should trigger an immediate refetch when `investor_positions` changes (via the `recompute_investor_position` trigger that fires after `apply_investor_transaction`). However, there is a potential timing gap: the Realtime subscription fires `invalidateQueries` which only marks the cache stale -- if the component isn't actively mounted or visible, the refetch may be delayed.

### Fix

1. Add `QUERY_KEYS.activeFundsWithAUM` to the `transaction` entry in the `INVALIDATION_GRAPH` in `src/utils/cacheInvalidation.ts`
2. After mutation success in `useTransactionHooks.ts`, call `refetchQueries` (not just `invalidateQueries`) for the AUM keys to force an immediate network request

---

## Issue 2: Apply Yield Shows Wrong Investor Count

### Root Cause

Two different RPCs count investors differently:

- **`get_active_funds_summary`** (used in the yield fund selector): Correctly counts only `account_type = 'investor'` -- SOL shows 2 investors, XRP shows 1 investor
- **`get_funds_with_aum`** (used in header AUM bar): Counts ALL account types with `current_value > 0`, including IB agents and the INDIGO Fees system account -- SOL shows 4, XRP shows 3

The **yield preview RPC** (`preview_segmented_yield_distribution_v5`) returns `investor_count` as `jsonb_array_length(v_allocations_out)` which counts ALL participants in the allocation array, including:
- The INDIGO Fees account (always included for fee credits)
- IB agents (included for IB credit display)
- Actual investors

Current data shows:
- **SOL fund**: 2 real investors + 1 IB agent + 1 fees account = 4 shown in preview
- **XRP fund**: 1 real investor + 1 IB agent + 1 fees account = 3 shown in preview

So when the user clicks "Apply Yield to 4 Investors" for SOL, 2 of those are system/IB accounts, not real investors.

### Fix

1. In `get_funds_with_aum` RPC: Filter `investor_count` to only `account_type = 'investor'` (matching the pattern already used by `get_active_funds_summary`)
2. In `preview_segmented_yield_distribution_v5` RPC: Add a separate `investor_count` field that counts only `account_type = 'investor'` participants, while keeping `participant_count` for the total allocation array length
3. Update the "Apply Yield to N Investors" button text in `YieldPreviewResults.tsx` to use the investor-only count

---

## Issue 3: AUM Not Shown Accurately for SOL and XRP in Yield Form

### Root Cause

The yield input form (`YieldInputForm.tsx`) displays AUM via:

```typescript
// In useYieldOperationsState.ts line 41
const asOfAum = liveFund?.total_aum ?? selection.selectedFund?.total_aum ?? null;
```

This pulls `total_aum` from `useActiveFundsWithAUM` which calls `get_active_funds_summary`. The RPC correctly sums ALL positions with `current_value > 0` for AUM calculation.

Actual database values:
- **SOL**: 1,500.0000 SOL total (2 investors: 1263.33 + 236.29, plus IB: 0.037, fees: 0.337)
- **XRP**: 229,731.09 XRP total (1 investor: 229,585.31, plus IB: 29.13, fees: 116.65)

The `parseFinancial(f.total_aum).toNumber()` conversion in `yieldHistoryService.ts` line 256 converts the database NUMERIC to a JavaScript number. For these values (max ~229K with 10 decimal places), `toNumber()` should be safe since they're well within JavaScript's safe integer range when considering the decimal places.

**Potential issue**: The `formatValue` function used in the yield form is `formatAUM(value, asset)` which uses `Intl.NumberFormat`. For SOL/XRP, `getAUMDecimals` returns `{ min: 2, max: 6 }`. If the actual value has more than 6 decimal places, trailing precision is silently dropped in the display. However, for AUM display (showing totals like 1,500 SOL), this shouldn't cause visible inaccuracy.

The more likely problem is a **stale cache issue**: when the user opens the yield dialog, `asOfAum` comes from `liveFund?.total_aum` which may be stale if `activeFundsWithAUM` hasn't been refetched recently (5s staleTime). If a deposit was just processed, the old AUM value may still be displayed.

### Fix

1. When opening the yield dialog, force a refetch of `activeFundsWithAUM` before displaying AUM
2. Add `activeFundsWithAUM` to the transaction invalidation graph (same fix as Issue 1)

---

## Summary of Required Changes

| # | Severity | Fix | Files |
|---|----------|-----|-------|
| 1 | HIGH | Add `activeFundsWithAUM` to transaction invalidation graph | `src/utils/cacheInvalidation.ts` |
| 2 | HIGH | Fix `get_funds_with_aum` to count only `account_type='investor'` | SQL migration |
| 3 | HIGH | Add `investor_count` (investor-only) to yield preview RPC | SQL migration |
| 4 | MEDIUM | Update yield preview button to show investor-only count | `src/features/admin/yields/components/YieldPreviewResults.tsx` |
| 5 | MEDIUM | Force refetch of fund AUM when opening yield dialog | `src/hooks/data/admin/useYieldOperationsState.ts` |
| 6 | LOW | Use `refetchQueries` instead of `invalidateQueries` for critical AUM keys after mutations | `src/hooks/data/shared/useTransactionHooks.ts` |

### Implementation Order

**Phase 1 -- Cache & Invalidation (items 1, 5, 6):** Ensure AUM data refreshes immediately after deposits across all consumers.

**Phase 2 -- Investor Count Accuracy (items 2, 3, 4):** Fix both RPCs to distinguish between "all participants" and "real investors", then update the UI to display the correct count.
