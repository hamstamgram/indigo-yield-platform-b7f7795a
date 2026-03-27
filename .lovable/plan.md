

# Fix Yield Distribution Preview & Confirm Dialog Numbers

## Problem Summary

Three bugs cause incorrect numbers in the yield distribution UI:

1. **`grossYield` passed as pre-formatted string** to `DistributeYieldDialog` -- Both call sites (AdminDashboard line 295, GlobalYieldFlow line 128) pass `ops.formatValue(toNum(...))` which produces `"5,803.10"`. Inside the dialog, `toNum("5,803.10")` calls `parseFloat()` which stops at the comma, returning `5`. This breaks the Ending Balance calculation (line 265) and the reconciliation `= Gross Yield` line (198).

2. **Missing `asOfAum` prop** in AdminDashboard -- Line 292-314 does not pass `asOfAum`, so Ending Balance always computes against `0`.

3. **Duplicate "INDIGO Fees Credit" rows** -- `DistributeYieldDialog` shows it twice (lines 204-210 and 220-227 with identical values). `YieldConfirmDialog` shows it twice (lines 128-131 and 139-143). `YieldPreviewResults` shows it twice (summary card line 137 and standalone card line 167).

---

## Changes

### 1. `GlobalYieldFlow.tsx` (line 128-131)
Pass raw string instead of pre-formatted:
```
grossYield={ops.yieldPreview?.grossYield ?? "0"}
```

### 2. `AdminDashboard.tsx` (lines 295-298, 312-313)
Pass raw string and add missing `asOfAum`:
```
grossYield={ops.yieldPreview?.grossYield ?? "0"}
...
asOfAum={ops.asOfAum}
```

### 3. `DistributeYieldDialog.tsx`
- **Line 159**: Format grossYield for display: `+{formatValue(toNum(grossYield), asset)}`
- **Line 198**: Same: `{formatValue(toNum(grossYield), asset)}`
- **Line 376**: Same for success phase
- **Lines 220-227**: Remove duplicate "INDIGO Fees Credit" row (the `indigoFeesCredit` one duplicates `totalFees`)
- Line 265 Ending Balance is already correct (`toNum(grossYield)` will now work since grossYield is a raw numeric string)

### 4. `YieldConfirmDialog.tsx`
- **Lines 139-144**: Remove duplicate "INDIGO FEES Credit" row (same value as "INDIGO Fees Credit" on line 128)

### 5. `YieldPreviewResults.tsx`
- **Lines 167-182**: Remove duplicate standalone "INDIGO FEES Credit" card (same value as summary card on line 137)

---

## Summary
- 5 files changed
- Critical arithmetic bug fixed (Ending Balance and Gross Yield display)
- Missing prop added (`asOfAum` on AdminDashboard)
- 3 duplicate UI rows removed

