

# Fix: Yield Recording -- Transaction Date Visibility and Zero Yield Block

## Two Confirmed Bugs

### Bug A: "Transaction Date" shown during Reporting flow
**File:** `src/features/admin/yields/components/YieldInputForm.tsx` (lines 358-393)

The "Transaction Date" date picker renders for ALL purposes. It should only appear when `purpose === 'transaction'` since reporting yields don't create actual transactions.

**Fix:** Wrap lines 358-393 in `{!isReporting && ( ... )}`. The variable `isReporting` already exists on line 115.

---

### Bug B: Zero Yield blocked by validation
**File:** `src/hooks/data/admin/yield/useYieldCalculation.ts` (lines 44-49)

Current logic:
- Line 44-46: `newAUMValue < baseAum` shows error and **returns** (blocks preview entirely)
- Line 47-48: `newAUMValue === baseAum` shows info toast "No yield to distribute" (doesn't block, but is confusing)

**Fix:**
- Remove the hard block on `newAUMValue < baseAum` (negative yields / losses are valid)
- Remove the info toast on `newAUMValue === baseAum` (zero yield is valid for reporting)
- Both conditions should proceed silently to the preview step

---

## Technical Changes

### File 1: `src/features/admin/yields/components/YieldInputForm.tsx`
- Wrap the Transaction Date block (lines 358-393) with `{!isReporting && ( ... )}`

### File 2: `src/hooks/data/admin/yield/useYieldCalculation.ts`
- Remove lines 44-49 (the `< baseAum` block and `=== baseAum` toast)
- Allow all non-negative AUM values to proceed to preview

### Files affected: 2
### Risk: Low -- no backend changes, just UI visibility and removing an overly strict frontend guard

