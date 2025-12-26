# Outstanding Items

**Generated:** 2024-12-21  
**Platform:** INDIGO Token-Denominated Investment Management

---

## P0 - Critical (Must Fix Immediately)

### 1. USD Formatting in PositionResetDialog.tsx ✅ FIXED
**File:** `src/components/admin/maintenance/PositionResetDialog.tsx`  
**Issue:** Uses `formatCurrency()` with USD style  
**Impact:** Admin-facing only, but violates token-only principle  
**Fix:** Replace with `formatTokenAmount()` helper

```typescript
// BEFORE (line 53-60):
const formatCurrency = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

// AFTER:
const formatTokenAmount = (value: number) => {
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(value);
};
```

### 2. USD Formatting in MaintenancePage.tsx ✅ FIXED
**File:** `src/routes/admin/MaintenancePage.tsx`  
**Issue:** Uses `formatCurrency()` with USD style  
**Impact:** Admin-facing only, but violates token-only principle  
**Fix:** Replace with `formatTokenAmount()` helper

```typescript
// BEFORE (line 66-74):
const formatCurrency = (value: number | undefined) => {
  if (value === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(value);
};

// AFTER:
const formatTokenAmount = (value: number | undefined) => {
  if (value === undefined) return "N/A";
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 8,
  }).format(value);
};
```

---

## P1 - High Priority (Fix This Sprint)

### 3. USD Label in CreateInvestmentDialog.tsx ✅ FIXED
**File:** `src/components/admin/investments/CreateInvestmentDialog.tsx`  
**Issue:** Label says "Amount (USD)" on line 171  
**Impact:** Misleading label, amount is token-denominated  
**Fix:** Change label to "Amount"

```typescript
// BEFORE (line 171):
<FormLabel>Amount (USD)</FormLabel>

// AFTER:
<FormLabel>Amount</FormLabel>
```

### 4. Generate Fund Performance Purpose Fallback ✅ FIXED
**File:** `supabase/functions/generate-fund-performance/index.ts`  
**Issue:** May have purpose fallback allowing NULL values  
**Impact:** Could generate non-reporting data for statements  
**Fix:** Verified strict `purpose = 'reporting'` is enforced

**Status:** Verified 2024-12-26 - Edge function correctly sets `purpose: 'reporting'` on all generated records.

---

## P2 - Medium Priority (Fix Next Sprint)

### 5. Missing Playwright Tests
**Files to Create:**
- `tests/e2e/admin-yield-workflow.spec.ts`
- `tests/e2e/report-generation.spec.ts`

**Tests Needed:**
1. Apply yield → verify transactions created
2. Generate report → verify one-per-period enforcement
3. Send statement → verify email logged

### 6. Missing Unit Tests for Idempotency
**Files to Create:**
- `src/utils/__tests__/yieldIdempotency.test.ts`

**Tests Needed:**
1. Running distribution twice produces zero net new rows
2. Conservation check: gross = net + fees
3. IB comes from fees only

### 7. Comments Mention USD in financial.ts
**File:** `src/utils/financial.ts`  
**Issue:** Comments mention USD in documentation  
**Impact:** Documentation inconsistency only  
**Fix:** Update comments to reference token denomination

---

## Completed Fixes

| Item | File | Status | PR |
|------|------|--------|-----|
| StatementsPage purpose filter | StatementsPage.tsx | ✅ Fixed | 2024-12-21 |
| PositionResetDialog USD | PositionResetDialog.tsx | ✅ Fixed | 2024-12-21 |
| MaintenancePage USD | MaintenancePage.tsx | ✅ Fixed | 2024-12-21 |
| CreateInvestmentDialog label | CreateInvestmentDialog.tsx | ✅ Fixed | 2024-12-21 |
| Generate Fund Performance purpose | generate-fund-performance/index.ts | ✅ Fixed | 2024-12-26 |

---

## Verification Checklist

- [ ] Run `rg -i 'USD|formatCurrency|toLocaleString.*currency' src/` - should return 0 investor-facing matches
- [ ] Run all unit tests: `npm test`
- [ ] Manual test: Apply yield twice, verify idempotency
- [ ] Manual test: Generate statement twice, verify duplicate rejection
- [ ] Manual test: Investor statements show reporting data only

---

## Notes

1. **USDT/USDC references are valid** - These are stablecoin token symbols, not USD references
2. **Asset fallbacks like "USDT" are acceptable** - Default asset for positions when fund data missing
3. **Admin-only USD references are lower priority** - Investors never see them
