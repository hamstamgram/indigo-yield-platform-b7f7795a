
# Fix: Transaction Filters and Rename Interest/Yield to Yield

## Issues Found

### Problem 1: Filter Not Working Correctly
The "Interest/Yield" base type filter in the admin transactions page sends `type=INTEREST` to the database, but the system also uses `YIELD` as a separate transaction type. This means transactions with `type=YIELD` are excluded from filter results.

### Problem 2: Inconsistent Naming
The label "Interest/Yield" appears in multiple places, which is confusing since:
- The database has two separate enum values: `INTEREST` and `YIELD`
- The system primarily uses `YIELD` for yield distribution transactions
- "Interest" is legacy terminology

## Root Cause
In `AdminTransactionsPage.tsx` line 342:
```typescript
<SelectItem value="INTEREST">Interest/Yield</SelectItem>
```
This only filters for `type=INTEREST`, missing all `type=YIELD` transactions.

## Solution

### Changes Required

**1. `src/features/admin/transactions/pages/AdminTransactionsPage.tsx`**
- Line 342: Change filter value from `INTEREST` to `YIELD` and label from "Interest/Yield" to "Yield"
- Line 357: Change display category label from "Interest/Yield" to "Yield"

**2. `src/services/admin/adminTransactionHistoryService.ts`**
- Line 76: Change `yield_credit: "Interest/Yield"` to `yield_credit: "Yield"`
- Line 158: Change fallback from `"Interest/Yield"` to `"Yield"`

**3. `src/types/domains/transaction.ts`**
- Line 294: Keep `INTEREST: "Interest"` but ensure it's separate from Yield labeling

## Technical Details

The database enum `tx_type` includes both:
- `INTEREST` - Legacy/external interest 
- `YIELD` - Platform yield distributions

The yield distribution RPC (`apply_adb_yield_distribution_v3`) creates transactions with `type=YIELD`, so the filter should use `YIELD` to capture these.

## Files to Modify
| File | Lines | Change |
|------|-------|--------|
| `AdminTransactionsPage.tsx` | 342, 357 | Update filter value and labels |
| `adminTransactionHistoryService.ts` | 76, 158 | Update display mapping |

## Testing
After implementation:
1. Navigate to Admin > Transactions
2. Apply "Yield" base type filter
3. Verify yield distribution transactions appear
4. Apply "Yield" category filter
5. Verify transactions with `displayType="Yield"` appear
