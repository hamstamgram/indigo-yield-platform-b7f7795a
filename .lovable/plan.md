
# Plan: Fix Build Error in AddTransactionDialog.tsx

## Problem

The build is failing with error:
```
src/features/admin/transactions/AddTransactionDialog.tsx(176,77): error TS2554: Expected 3 arguments, but got 4.
```

## Root Cause

On line 176, `previewDepositYield` is called with 4 arguments:
```typescript
previewDepositYield(selectedFundId, amountDec.toFixed(10), newTotalAum, txDate)
```

But the function signature in `src/services/admin/depositWithYieldService.ts` only accepts 3:
```typescript
export async function previewDepositYield(
  fundId: string,
  depositAmount: string | number,
  newTotalAum: string | number
): Promise<YieldPreviewResult>
```

The `txDate` parameter is being passed but not expected by the function.

## Solution

Remove the extra `txDate` argument from the function call. The `previewDepositYield` function queries the most recent `fund_aum_events` checkpoint and doesn't filter by date, so the `txDate` argument serves no purpose.

## Change Required

**File**: `src/features/admin/transactions/AddTransactionDialog.tsx`

**Line 176 - Current**:
```typescript
previewDepositYield(selectedFundId, amountDec.toFixed(10), newTotalAum, txDate)
```

**Line 176 - Fixed**:
```typescript
previewDepositYield(selectedFundId, amountDec.toFixed(10), newTotalAum)
```

## Also Update Dependencies Array

**Line 188 - Current**:
```typescript
}, [requiresYieldPreview, amount, closingAum, selectedFundId, txDate]);
```

**Line 188 - Fixed**:
```typescript
}, [requiresYieldPreview, amount, closingAum, selectedFundId]);
```

Since `txDate` is no longer used in the effect, it should be removed from the dependency array.

## Risk Assessment

- **Risk**: Very Low
- **Impact**: Fixes build error without changing behavior
- **Testing**: Verify deposit preview still works in the Add Transaction dialog

## Technical Notes

The `previewDepositYield` function uses the latest checkpoint from `fund_aum_events` ordered by `event_ts DESC`. If date-based filtering is needed in the future (to preview yields as of a specific date), that would require:
1. Adding `txDate` parameter to the function signature
2. Filtering the checkpoint query by date
3. This would be a separate enhancement ticket
