

# Zero Trust Forensic Audit -- Round 2 Report

All critical issues from the prior audit sessions have been verified as fixed. This round focuses on **residual floating-point precision leaks** that remain in peripheral services and UI components, plus a confirmation of all previously audited sections.

---

## SECTION 1: FINANCIAL CORE

### 1. Dust and Precision -- Remaining Floating-Point Usage

**Previously Fixed (confirmed):**
- `transactionsV2Service.ts` -- now uses `parseFinancial()` (Decimal.js). PASS.
- `yieldPreviewService.ts` -- yield percentage now uses `parseFinancial` division. PASS.
- `feesService.ts` lines 204-211 -- INDIGO balance accumulation now uses `parseFinancial`. PASS.

**Still Using `Number()` / `parseFloat()` for Financial Values:**

| File | Line(s) | Pattern | Risk | Action |
|------|---------|---------|------|--------|
| `src/services/admin/feesService.ts` | 147 | `Number(tx.amount)` for fee record mapping | LOW -- display only, no aggregation | No change needed |
| `src/services/admin/feesService.ts` | 287-289 | `Number(a.gross_yield_amount)`, `Number(a.fee_percentage)`, `Number(a.fee_amount)` for fee allocation mapping | LOW -- display mapping to UI | No change needed |
| `src/services/admin/feesService.ts` | 324 | `Number(tx.amount)` in yield-by-fund accumulation loop | **HIGH** -- running sum loses precision | **FIX** |
| `src/services/admin/depositWithYieldService.ts` | 215 | `Number(p.current_value)` in AUM sum reduce | **HIGH** -- AUM calculation with precision loss | **FIX** |
| `src/services/admin/adminService.ts` | 55 | `Number(req.requested_amount)` in pending withdrawals sum | MEDIUM -- dashboard display total | **FIX** |
| `src/services/investor/investorPortfolioService.ts` | 65-66, 99-100 | `parseFloat(pos.shares)`, `Number(pos.current_value)` | LOW -- UI display values only | No change needed |
| `src/features/admin/investors/components/yields/InvestorYieldHistory.tsx` | 62-64, 70 | `parseFloat(String(e.gross_yield_amount))` in summary reduce | **HIGH** -- financial sum in UI | **FIX** |
| `src/features/admin/yields/components/YieldEventsTable.tsx` | 91 | `parseFloat(String(e.net_yield_amount))` with `isFinite` guard | MEDIUM -- partially fixed, still uses float | **FIX** |
| `src/hooks/data/admin/yield/useYieldSubmission.ts` | 84 | `parseFloat(yieldPreview.grossYield)` for toast message | LOW -- display-only for toast text | No change needed |
| `src/hooks/data/admin/yield/useYieldCalculation.ts` | 36 | `parseFloat(newAUM)` for input validation | LOW -- validation only, not calculation | No change needed |

**Rounding Mode:** Backend SQL uses `ROUND(value, 8)` (half away from zero). Frontend `Decimal.js` defaults to `ROUND_HALF_UP`. These are compatible. No action needed.

### 2. Conservation of Value

**Status: PASS** (confirmed from prior audit)
- V5 engine enforces `gross = net + fees + ib`.
- Dust residual assigned to largest non-fees investor.
- Opening AUM includes all account types.

### 3. Indigo Fee Recursive Loop

**Status: PASS** (confirmed from prior audit)
- INDIGO FEES has `fee_pct = 0` and `account_type = 'fees_account'`.
- V5 engine explicitly sets `v_fee_pct := 0` for `fees_account`.
- INDIGO earns gross yield, pays zero fees. No recursive loop.
- IB accounts pay standard fees on yield (confirmed as intended business rule).

---

## SECTION 2: SYSTEM INTEGRITY

### 4. Concurrency and Race Conditions

**Status: PASS** (confirmed from prior audit)

| Operation | Lock | Idempotency |
|-----------|------|-------------|
| Yield Distribution | `pg_advisory_xact_lock` | `reference_id` unique constraint |
| Deposit/Withdrawal | `pg_advisory_xact_lock` | `reference_id` unique per trigger |
| Void Transaction | `SELECT ... FOR UPDATE` | Row-level lock |

### 5. Historical Immutability

**Status: PASS** (confirmed from prior audit)
- `trg_protect_immutable_fields` on all financial tables.
- Void-only correction model (no edits to history).

### 6. Zombie and Ghost Accounts

**Status: PASS** (confirmed from prior audit)
- 0 orphaned ledger entries, 0 zombie positions.
- Integrity views monitor continuously.

---

## SECTION 3: DATA and STATE

### 7. Timezone and Date Boundary

**Status: PASS** (confirmed from prior audit)
- All dates use `formatDateForDB()` / `date-fns.format()`.
- `toISOString().split("T")[0]` is prohibited.
- PostgreSQL `date` type is timezone-agnostic for financial dates.

### 8. Negative Yield

**Status: BY DESIGN**
- V5 engine skips segments with `v_seg_yield > 0` guard -- negative yield segments are not distributed.
- `crystallize_yield_before_flow` raises exception for negative gross yield.
- This is an intentional design decision: the platform distributes gains only.
- The frontend hides negative yield display in the input form (cosmetic -- does not block submission).

---

## FIX PLAN (5 items, Priority order)

### Fix 1: HIGH -- `feesService.ts` line 324 -- Yield Accumulation Precision

Replace `Number()` accumulation with `parseFinancial()`:

```typescript
// BEFORE:
existing.total += Number(tx.amount || 0);

// AFTER:
existing.total = parseFinancial(existing.total).plus(parseFinancial(tx.amount || 0)).toNumber();
```

### Fix 2: HIGH -- `depositWithYieldService.ts` line 215 -- AUM Sum Precision

Replace `Number()` reduce with `parseFinancial()`:

```typescript
// BEFORE:
return (positions || []).reduce((sum, p) => sum + Number(p.current_value || 0), 0);

// AFTER:
return (positions || []).reduce(
  (sum, p) => parseFinancial(sum).plus(parseFinancial(p.current_value || 0)).toNumber(),
  0
);
```

### Fix 3: HIGH -- `InvestorYieldHistory.tsx` lines 62-64, 70 -- Summary Stats Precision

Replace `parseFloat()` reduces with `parseFinancial()`:

```typescript
// BEFORE:
const totalGross = active.reduce((sum, e) => sum + parseFloat(String(e.gross_yield_amount)), 0);

// AFTER:
const totalGross = active.reduce(
  (sum, e) => parseFinancial(sum).plus(parseFinancial(e.gross_yield_amount)).toNumber(),
  0
);
```
Apply same pattern to `totalFees`, `totalNet`, and `pendingYield`.

### Fix 4: MEDIUM -- `YieldEventsTable.tsx` line 91 -- Total Yield Precision

Replace `parseFloat()` reduce with `parseFinancial()`:

```typescript
// BEFORE:
const totalYield = filteredEvents.reduce(
  (sum, e) => {
    const val = parseFloat(String(e.net_yield_amount));
    return Number.isFinite(val) ? sum + val : sum;
  },
  0
);

// AFTER:
const totalYield = filteredEvents.reduce(
  (sum, e) => parseFinancial(sum).plus(parseFinancial(e.net_yield_amount || 0)).toNumber(),
  0
);
```

### Fix 5: MEDIUM -- `adminService.ts` line 55 -- Pending Withdrawals Sum

Replace `Number()` reduce with `parseFinancial()`:

```typescript
// BEFORE:
const pendingWithdrawals =
  withdrawalRequests?.reduce((sum, req) => sum + Number(req.requested_amount), 0) || 0;

// AFTER:
const pendingWithdrawals =
  withdrawalRequests?.reduce(
    (sum, req) => parseFinancial(sum).plus(parseFinancial(req.requested_amount)).toNumber(),
    0
  ) || 0;
```

---

## Audit Verdict Summary

| Section | Status | Action Required |
|---------|--------|-----------------|
| Core Yield Engine Precision | PASS | None |
| Peripheral Service Precision | 5 files with float math | 5 fixes above |
| Conservation of Value | PASS | None |
| Indigo Fee Loop | PASS (0% fee confirmed) | None |
| Concurrency/Locks | PASS | None |
| Historical Immutability | PASS | None |
| Orphaned Records | PASS (0 found) | None |
| RLS Security | PASS (fixed in prior session) | None |
| Timezone/Date | PASS | None |
| Negative Yield | BY DESIGN (gains only) | None |

### Files to Change

| File | Change | Priority |
|------|--------|----------|
| `src/services/admin/feesService.ts` | `parseFinancial()` for yield accumulation (line 324) | HIGH |
| `src/services/admin/depositWithYieldService.ts` | `parseFinancial()` for AUM sum (line 215) | HIGH |
| `src/features/admin/investors/components/yields/InvestorYieldHistory.tsx` | `parseFinancial()` for 4 summary reduces (lines 62-64, 70) | HIGH |
| `src/features/admin/yields/components/YieldEventsTable.tsx` | `parseFinancial()` for total yield reduce (line 91) | MEDIUM |
| `src/services/admin/adminService.ts` | `parseFinancial()` for pending withdrawals sum (line 55) | MEDIUM |

