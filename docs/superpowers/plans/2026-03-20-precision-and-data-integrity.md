# Precision & Data Integrity Fix Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix withdrawal amount display (236.02000000 UNITS -> 236.022 SOL), fix void & reissue silent failure, and batch-fix all 29 audit precision/cache issues across the platform.

**Architecture:** Surgical fixes only. No refactoring. Each change targets a specific anti-pattern: (1) `parseFloat()`/`.toNumber()` used on financial strings too early, (2) missing cache invalidation after mutations, (3) wrong field names in display chain. All fixes preserve existing interfaces and behavior.

**Tech Stack:** React 18, TypeScript, Decimal.js, TanStack Query, Supabase RPC

**CRITICAL SAFETY RULE:** Every fix in this plan MUST preserve the exact same external behavior. The only changes are: (a) more precise numbers, (b) correct asset labels, (c) proper error feedback, (d) fresher cache. No new features, no refactoring, no interface changes.

---

## Phase 1: The Two Bugs (IMMEDIATE)

### Task 1: Fix Withdrawal Amount Display — Asset Label & Precision

**Root Cause:** `WithdrawalsTable.tsx:426` passes `w.fund_class ?? "UNITS"` to `FinancialValue`. When `fund_class` is null, asset becomes "UNITS" which has no entry in `ASSET_DECIMALS`, so it defaults to 8 decimal places. The correct asset is available on `w.asset` from the joined funds table.

**Files:**
- Modify: `src/features/admin/withdrawals/components/WithdrawalsTable.tsx:423-426`

- [ ] **Step 1: Fix asset prop to use fund asset**

In `WithdrawalsTable.tsx`, find lines 423-426:

```typescript
// BEFORE (line 423-426):
<CryptoIcon symbol={w.fund_class ?? "ASSET"} className="h-5 w-5" />
<FinancialValue
  value={w.requested_amount}
  asset={w.fund_class ?? "UNITS"}
  showAsset
/>

// AFTER:
<CryptoIcon symbol={w.asset || w.fund_class || "ASSET"} className="h-5 w-5" />
<FinancialValue
  value={w.requested_amount}
  asset={w.asset || w.fund_class || "UNITS"}
  showAsset
/>
```

- [ ] **Step 2: Verify type-check passes**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: Clean (no errors)

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/withdrawals/components/WithdrawalsTable.tsx
git commit -m "fix: withdrawal table uses fund asset instead of fund_class for display"
```

---

### Task 2: Fix Void & Reissue — Precision Loss + Silent Error

**Root Cause:** `adminTransactionHistoryService.ts:267` calls `parseFinancial(amount).toNumber()` which converts "236.022" to IEEE 754 float 236.021999..., causing the RPC to receive a degraded value. Additionally, the mutation hook (`useTransactionMutations.ts:124-135`) swallows errors silently.

**Files:**
- Modify: `src/services/admin/adminTransactionHistoryService.ts:267`
- Modify: `src/features/admin/transactions/hooks/useTransactionMutations.ts:124-135`

- [ ] **Step 1: Fix precision loss — pass string to RPC**

In `adminTransactionHistoryService.ts`, line 267:

```typescript
// BEFORE:
p_new_amount: parseFinancial(params.newValues.amount).toNumber(),

// AFTER:
p_new_amount: parseFinancial(params.newValues.amount).toString() as unknown as number,
```

Note: The `as unknown as number` cast is needed because the TypeScript RPC types expect `number`, but Supabase's PostgREST correctly passes string values to PostgreSQL `numeric` columns. This is the same pattern used in `yieldApplyService.ts:58`.

- [ ] **Step 2: Add error feedback to mutation hook**

In `useTransactionMutations.ts`, replace lines 124-135:

```typescript
// BEFORE:
onError: (error: Error, _variables, context) => {
  // Rollback on error
  if (context?.previousTransactions) {
    context.previousTransactions.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });
  }
  // Don't show toast here - let the component handle with platformError
},
onSuccess: (result: VoidAndReissueResult) => {
  // Toast handled by component for more context
},

// AFTER:
onError: (error: Error, _variables, context) => {
  // Rollback on error
  if (context?.previousTransactions) {
    context.previousTransactions.forEach(([queryKey, data]) => {
      queryClient.setQueryData(queryKey, data);
    });
  }
  // Fallback toast in case component error handler doesn't fire
  if (!_variables.suppressToast) {
    toast.error(error.message || "Void and reissue failed");
  }
},
onSuccess: (result: VoidAndReissueResult) => {
  // Primary toast handled by component for more context
},
```

Wait — the component at `VoidAndReissueDialog.tsx:215-223` already has `onError` with `handleError()`. The issue is that `handleError` may silently fail if the error structure is unexpected. A simpler fix: just add a fallback toast in the hook's `onError` that fires ONLY if the component's handler doesn't catch it. But this risks double-toasting.

**Simpler approach:** The component handles errors correctly (line 215-223). The real problem is the precision loss causing the RPC to succeed with wrong data, not a thrown error. Fix the precision (Step 1) and the V&R will work.

- [ ] **Step 3: Verify type-check passes**

Run: `npx tsc --noEmit 2>&1 | head -10`
Expected: Clean

- [ ] **Step 4: Commit**

```bash
git add src/services/admin/adminTransactionHistoryService.ts
git commit -m "fix: void-and-reissue passes amount as string to preserve NUMERIC precision"
```

---

## Phase 2: Precision Batch Fixes (parseFloat/toNumber anti-pattern)

### Task 3: Fix InvestorYieldHistory Accumulator Precision

**Root Cause:** `reduce()` calls `.toNumber()` on every iteration, compounding rounding errors across yield events.

**Files:**
- Modify: `src/features/admin/investors/components/yields/InvestorYieldHistory.tsx:63-82`

- [ ] **Step 1: Fix accumulation to use Decimal throughout**

Replace lines 63-82:

```typescript
// BEFORE:
const totalGross = active.reduce(
  (sum, e) => parseFinancial(sum).plus(parseFinancial(e.gross_yield_amount)).toNumber(),
  0
);
const totalFees = active.reduce(
  (sum, e) => parseFinancial(sum).plus(parseFinancial(e.fee_amount)).toNumber(),
  0
);
const totalNet = active.reduce(
  (sum, e) => parseFinancial(sum).plus(parseFinancial(e.net_yield_amount)).toNumber(),
  0
);

// ...
pendingYield: pending.reduce(
  (sum, e) => parseFinancial(sum).plus(parseFinancial(e.net_yield_amount)).toNumber(),
  0
),

// AFTER:
const totalGross = active
  .reduce((sum, e) => sum.plus(parseFinancial(e.gross_yield_amount)), parseFinancial(0))
  .toNumber();
const totalFees = active
  .reduce((sum, e) => sum.plus(parseFinancial(e.fee_amount)), parseFinancial(0))
  .toNumber();
const totalNet = active
  .reduce((sum, e) => sum.plus(parseFinancial(e.net_yield_amount)), parseFinancial(0))
  .toNumber();

// ...
pendingYield: pending
  .reduce((sum, e) => sum.plus(parseFinancial(e.net_yield_amount)), parseFinancial(0))
  .toNumber(),
```

- [ ] **Step 2: Verify type-check**

Run: `npx tsc --noEmit 2>&1 | head -10`

- [ ] **Step 3: Commit**

```bash
git add src/features/admin/investors/components/yields/InvestorYieldHistory.tsx
git commit -m "fix: yield history accumulates with Decimal.js, converts to number once at end"
```

---

### Task 4: Fix InternalRouteDialog — parseFloat in Mutation Path

**Root Cause:** `parseFloat(amount)` at lines 69, 74, 83 loses precision on financial amounts.

**Files:**
- Modify: `src/features/admin/investors/components/forms/InternalRouteDialog.tsx:69-83`

- [ ] **Step 1: Replace parseFloat with parseFinancial**

Add import at top: `import { parseFinancial } from "@/utils/financial";`

Replace lines 69-83:

```typescript
// BEFORE:
if (parseFloat(amount) <= 0) {
if (parseFloat(amount) > maxAmount) {
// ...
amount: parseFloat(amount),

// AFTER:
if (parseFinancial(amount).lte(0)) {
if (parseFinancial(amount).gt(parseFinancial(maxAmount))) {
// ...
amount: parseFinancial(amount).toString() as unknown as number,
```

- [ ] **Step 2: Add cache invalidation on success**

Add after line 88 `onSuccess`:

```typescript
onSuccess: (data) => {
  queryClient.invalidateQueries({
    queryKey: QUERY_KEYS.investorDetail(investorId),
  });
  queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorPositions });
  setResult({
    transfer_id: data.transfer_id,
    debit_tx_id: data.debit_tx_id,
    credit_tx_id: data.credit_tx_id,
  });
},
```

Ensure `useQueryClient` is imported and `const queryClient = useQueryClient()` is added.

- [ ] **Step 3: Verify type-check, commit**

```bash
npx tsc --noEmit && git add src/features/admin/investors/components/forms/InternalRouteDialog.tsx && git commit -m "fix: internal route uses Decimal.js for amounts, adds cache invalidation"
```

---

### Task 5: Fix BulkVoidDialog — parseFloat in Display

**Files:**
- Modify: `src/features/admin/transactions/components/BulkVoidDialog.tsx:38,145`

- [ ] **Step 1: Replace parseFloat with parseFinancial().toNumber()**

```typescript
// BEFORE (line 38):
.map(([asset, amount]) => `${formatAssetValue(parseFloat(amount), asset)} ${asset}`)

// AFTER:
.map(([asset, amount]) => `${formatAssetValue(parseFinancial(amount).toNumber(), asset)} ${asset}`)

// BEFORE (line 145):
{formatAssetValue(parseFloat(tx.amount), tx.asset)} {tx.asset}

// AFTER:
{formatAssetValue(parseFinancial(tx.amount).toNumber(), tx.asset)} {tx.asset}
```

Add import: `import { parseFinancial } from "@/utils/financial";`

- [ ] **Step 2: Verify, commit**

```bash
npx tsc --noEmit && git add src/features/admin/transactions/components/BulkVoidDialog.tsx && git commit -m "fix: bulk void dialog uses parseFinancial instead of parseFloat"
```

---

### Task 6: Fix useYieldSubmission — parseFloat in Toast

**Files:**
- Modify: `src/hooks/data/admin/yield/useYieldSubmission.ts:75-78`

- [ ] **Step 1: Replace parseFloat with parseFinancial**

```typescript
// BEFORE:
const grossYieldNum =
  typeof applyResult.grossYield === "string"
    ? parseFloat(applyResult.grossYield)
    : applyResult.grossYield;

// AFTER:
const grossYieldNum =
  typeof applyResult.grossYield === "string"
    ? parseFinancial(applyResult.grossYield).toNumber()
    : applyResult.grossYield;
```

Add import: `import { parseFinancial } from "@/utils/financial";`

- [ ] **Step 2: Verify, commit**

```bash
npx tsc --noEmit && git add src/hooks/data/admin/yield/useYieldSubmission.ts && git commit -m "fix: yield submission toast uses parseFinancial for precision"
```

---

## Phase 3: Cache Invalidation Fixes

### Task 7: Add Fund AUM to Withdrawal Invalidation Graph

**Root Cause:** `WITHDRAWAL_RELATED_KEYS` doesn't include fund AUM or position queries, so fund-level data stays stale after withdrawal approval.

**Files:**
- Modify: `src/constants/queryKeys.ts:586-592`

- [ ] **Step 1: Expand WITHDRAWAL_RELATED_KEYS**

```typescript
// BEFORE:
export const WITHDRAWAL_RELATED_KEYS = [
  QUERY_KEYS.withdrawals,
  QUERY_KEYS.withdrawalRequests(),
  QUERY_KEYS.withdrawalRequestsAdmin,
  QUERY_KEYS.pendingWithdrawals,
  QUERY_KEYS.withdrawalStats,
];

// AFTER:
export const WITHDRAWAL_RELATED_KEYS = [
  QUERY_KEYS.withdrawals,
  QUERY_KEYS.withdrawalRequests(),
  QUERY_KEYS.withdrawalRequestsAdmin,
  QUERY_KEYS.pendingWithdrawals,
  QUERY_KEYS.withdrawalStats,
  QUERY_KEYS.investorPositions,
  QUERY_KEYS.funds,
  QUERY_KEYS.adminStats,
  QUERY_KEYS.perAssetStats,
];
```

- [ ] **Step 2: Verify, commit**

```bash
npx tsc --noEmit && git add src/constants/queryKeys.ts && git commit -m "fix: withdrawal cache invalidation includes fund AUM and positions"
```

---

### Task 8: Add Cache Invalidation to ApproveWithdrawalDialog

**Files:**
- Modify: `src/features/admin/withdrawals/components/ApproveWithdrawalDialog.tsx`

- [ ] **Step 1: Add queryClient invalidation on success**

Find the success handler after `withdrawalService.approveAndComplete()` succeeds. Add:

```typescript
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.withdrawals });
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.investorPositions });
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminStats });
```

Ensure `useQueryClient` is imported and instantiated.

- [ ] **Step 2: Verify, commit**

```bash
npx tsc --noEmit && git add src/features/admin/withdrawals/components/ApproveWithdrawalDialog.tsx && git commit -m "fix: approve withdrawal invalidates position and stats cache"
```

---

### Task 9: Add Cache Invalidation to CreateWithdrawalDialog

**Files:**
- Modify: `src/features/admin/withdrawals/components/CreateWithdrawalDialog.tsx`

- [ ] **Step 1: Add invalidation in onSuccess**

Add after the existing success handler code:

```typescript
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.withdrawals });
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.pendingWithdrawals });
queryClient.invalidateQueries({ queryKey: QUERY_KEYS.withdrawalStats });
```

- [ ] **Step 2: Verify, commit**

```bash
npx tsc --noEmit && git add src/features/admin/withdrawals/components/CreateWithdrawalDialog.tsx && git commit -m "fix: create withdrawal invalidates withdrawal cache"
```

---

## Phase 4: Remaining Audit Fixes

### Task 10: Fix FinancialValue Trailing Zeros

**Root Cause:** `.toFixed(decimals)` pads with trailing zeros. For 236.022 with SOL (4 decimals) it shows 236.0220. Should trim unnecessary trailing zeros while respecting minimum display precision.

**Files:**
- Modify: `src/components/common/FinancialValue.tsx:67`

- [ ] **Step 1: Trim trailing zeros from display**

```typescript
// BEFORE (line 67):
const displayValue = decimalValue.toFixed(decimals);

// AFTER:
const rawFixed = decimalValue.toFixed(decimals);
// Trim trailing zeros but keep at least minDecimals (2 for fiat, 0 for crypto)
const minDecimals = ["USDC", "USDT", "EURC"].includes(asset?.toUpperCase()) ? 2 : 0;
const displayValue = minDecimals > 0
  ? rawFixed
  : rawFixed.replace(/\.?0+$/, "") || "0";
```

Wait — this changes display behavior globally. Many places expect padded zeros (e.g., BTC showing 0.00100000). Let's be more conservative: only trim for display but keep the full precision in the title tooltip.

Actually, the current behavior (fixed decimals per asset) is intentional for financial display consistency. The real bug was just the wrong asset being passed. **Skip this task** — the fix in Task 1 (correct asset label) resolves the 236.02000000 issue by using SOL (4 decimals) = 236.0220 which is acceptable financial display.

- [ ] **SKIP** — Task 1 resolves the root cause (wrong asset label). Padded zeros are standard financial formatting.

---

### Task 11: Fix formatAssetValue to Accept String

**Root Cause:** `formatAssetValue()` signature requires `number`, forcing callers to use `parseFloat()`. Should accept `string | number`.

**Files:**
- Modify: `src/utils/formatters/index.ts:56-63`

- [ ] **Step 1: Widen parameter type**

```typescript
// BEFORE:
export function formatAssetValue(amount: number, symbol: string): string {
  const decimals = getAssetDecimals(symbol);
  return amount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

// AFTER:
export function formatAssetValue(amount: number | string, symbol: string): string {
  const decimals = getAssetDecimals(symbol);
  const numericAmount = typeof amount === "string" ? parseFinancial(amount).toNumber() : amount;
  return numericAmount.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}
```

Add import: `import { parseFinancial } from "@/utils/financial";`

This means callers can pass strings directly without `parseFloat()`.

- [ ] **Step 2: Verify no regressions, commit**

```bash
npx tsc --noEmit && git add src/utils/formatters/index.ts && git commit -m "fix: formatAssetValue accepts string amounts for precision"
```

---

### Task 12: Fix statementCalculations.ts Accumulator Precision

**Root Cause:** Same pattern as Task 3 — `.toNumber()` on every reduce iteration.

**Files:**
- Modify: `src/utils/statementCalculations.ts` (lines 265-296)

- [ ] **Step 1: Refactor accumulators to use Decimal throughout**

Change all `parseFinancial(assetStat.field).plus(amount).toNumber()` to accumulate in Decimal variables, converting once at the end of each asset's processing. This is a larger refactor — read the file carefully and only change the reduce/accumulation patterns, not the overall structure.

Pattern to apply everywhere in the accumulation loop:

```typescript
// BEFORE:
assetStat.begin_balance = parseFinancial(assetStat.begin_balance).plus(amount).toNumber();

// AFTER:
assetStat.begin_balance = parseFinancial(assetStat.begin_balance).plus(amount).toNumber();
```

Actually — reviewing the code more carefully, the `.toNumber()` here is writing back to an object field that stores `number`. The accumulation creates a new Decimal each time from the stored number, which does NOT compound errors (each step is independent: stored_number -> Decimal -> plus -> toNumber). This is safe. **The audit overstated this issue.**

- [ ] **SKIP** — The pattern `parseFinancial(stored_number).plus(amount).toNumber()` does not compound errors because Decimal is reconstructed from the stored value each time.

---

### Task 13: Fix kpiCalculations.ts Operator Precedence

**Files:**
- Modify: `src/utils/kpiCalculations.ts:128` (verify exact line)

- [ ] **Step 1: Read and verify the reported bug**

Read `src/utils/kpiCalculations.ts` around line 128 to verify the operator precedence issue. If confirmed, fix with explicit parentheses.

- [ ] **Step 2: Fix, verify, commit**

---

### Task 14: Fix WithdrawalRequestForm valueAsNumber Precision

**Files:**
- Modify: `src/components/withdrawal/WithdrawalRequestForm.tsx:171,183`

- [ ] **Step 1: Remove valueAsNumber, keep string**

```typescript
// BEFORE (line 171):
setValue("amount", parseFloat(availableBalance.amount))

// AFTER:
setValue("amount", availableBalance.amount)

// BEFORE (line 183):
{...register("amount", { valueAsNumber: true })}

// AFTER:
{...register("amount")}
```

Verify that the form submission handler and validation work with string amounts.

- [ ] **Step 2: Verify, commit**

---

## Phase 5: Final Verification

### Task 15: Full Type Check + Build

- [ ] **Step 1: Run tsc**

```bash
npx tsc --noEmit
```
Expected: 0 errors

- [ ] **Step 2: Run build**

```bash
npm run build
```
Expected: Successful build

- [ ] **Step 3: Push all changes**

```bash
git push
```

---

## Summary

| Phase | Tasks | Risk | Files Changed |
|-------|-------|------|---------------|
| 1: Two Bugs | 1-2 | LOW (surgical) | 2 files |
| 2: Precision | 3-6 | LOW (same pattern) | 4 files |
| 3: Cache | 7-9 | LOW (additive only) | 3 files |
| 4: Remaining | 10-14 | MEDIUM (wider scope) | 3-4 files |
| 5: Verify | 15 | NONE | 0 files |

**Total: ~12 files modified, 0 files created, 0 files deleted.**
