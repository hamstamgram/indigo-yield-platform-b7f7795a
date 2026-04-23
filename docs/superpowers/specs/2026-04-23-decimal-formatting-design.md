# Decimal Formatting Standardization — Design Spec

## Date: 2026-04-23
## Author: gstack autoplan
## Status: Approved

---

## 1. Problem Statement

Monetary amounts flow from PostgreSQL `NUMERIC(38,18)` → TypeScript `string` → UI. Somewhere in that pipeline, code converts those strings to JavaScript `number` (IEEE 754 double-precision, ~15 significant digits) or formats them incorrectly, causing:

- **Trailing zero stripping**: `1.23450000` displayed as `1.2345` in input fields, mismatching dropdown labels.
- **Precision loss on large values**: `12345678.90123456` → `12345678.901234558` due to `toNum()` / `Number()`.
- **`.toLocaleString()` no-ops on strings**: `requested_amount` is a `string`; calling `.toLocaleString()` on it returns the raw string with no thousand separators.
- **Mismatched display**: dropdown labels and input fields show different decimal precision for the same value.

### Known instances (already triaged)

| File | Line | Bug | Impact |
|------|------|-----|--------|
| `CreateWithdrawalDialog.tsx` | 163 | `parseFinancial(maxAmount).toFixed()` strips trailing zeros | Auto-fill amount doesn't match dropdown label |
| `NumericInput.tsx` | 42 | `formatWithCommas` uses `minimumFractionDigits: 0` | Input field strips zeros on blur |
| `WithdrawalDetailsDrawer.tsx` | 109 | `.toLocaleString()` on a string | No thousand separators |
| `RejectWithdrawalDialog.tsx` | 78 | `toNum()` converts to JS number | Precision loss for large values |

Estimated total instances across the frontend: **30–50 files**.

---

## 2. Design Goals

1. **Display consistency**: the same value rendered anywhere on the platform must look identical.
2. **Precision preservation**: no loss of `NUMERIC(38,18)` precision from database to eyeball.
3. **Prevention**: make it impossible (or at least very hard) to accidentally use `Number()` / `toNum()` / `parseFloat()` on a monetary value.
4. **No runtime breakage**: the platform is live; every change must be backward-compatible.

---

## 3. Solution — Three Layers

### Layer A: Type Safety (branded `FinancialString`)

Create an opaque type that can only be produced by safe constructors. This is compile-time enforcement, zero runtime cost.

```typescript
// src/types/financial.ts
declare const __financialBrand: unique symbol;

export type FinancialString = string & { readonly [__financialBrand]: true };

// Safe constructors — the ONLY ways to create a FinancialString
export function fromDbValue(val: string | number | null | undefined): FinancialString {
  if (val === null || val === undefined || val === "") return "0" as FinancialString;
  return String(val) as FinancialString;
}

export function fromDecimal(val: Decimal): FinancialString {
  return val.toString() as FinancialString;
}

export function fromFinancialString(val: string): FinancialString {
  return val as FinancialString;
}
```

**What this catches at compile time:**

```typescript
const amount: FinancialString = fromDbValue("1.23450000");

// ❌ These all fail TypeScript compilation
toNum(amount);
Number(amount);
parseFloat(amount);
amount.toLocaleString();
```

**Migration path:** We do NOT change all existing `string` type annotations to `FinancialString` in one go. That would be a massive refactor. Instead:
- New code uses `FinancialString`.
- Existing domain types (`Withdrawal.requested_amount`, `InvestorPosition.current_value`, etc.) are migrated incrementally as we touch files.
- The ESLint rule (Layer C) catches the runtime mistake on existing code.

### Layer B: Unified Formatter Utilities

Consolidate the scattered formatters into one source of truth.

**Existing utilities (keep and standardize on):**
- `formatAssetAmount(value, assetSymbol, maxDecimals?)` — display with symbol + commas
- `formatFinancialDisplay(value, maxDecimals?)` — display without symbol, trims trailing zeros
- `toDisplayString(value, maxDecimals?)` — display with commas, preserves precision

**New utility (add):**
- `formatInputValue(value: string, assetSymbol: string): string` — for input fields, preserves trailing zeros, uses asset-specific `minimumFractionDigits`

**Deprecated / to be removed:**
- `toNum` and `toNumber` on monetary values (keep for non-monetary numeric fields like `count`, `percentage`)
- Inline `Number(amount)` casts
- Inline `parseFloat(amount)`
- Inline `.toLocaleString()` on monetary strings
- `parseFinancial(x).toFixed()` without arguments (strips trailing zeros)

### Layer C: Prevention (ESLint Custom Rule)

Add a custom ESLint rule `no-native-number-on-money` that bans:

1. `toNum(expression)` / `toNumber(expression)` where `expression` matches `*amount*`, `*balance*`, `*value*`, `*price*`, `*cost*`, `*fee*`
2. `Number(expression)` on the same patterns
3. `parseFloat(expression)` on the same patterns
4. `expression.toLocaleString()` where `expression` matches the same patterns

**Rule configuration:**

```json
{
  "rules": {
    "@indigo/no-native-number-on-money": ["error", {
      "monetaryPatterns": ["amount", "balance", "value", "price", "cost", "fee"]
    }]
  }
}
```

**Enforcement:** This rule runs in the pre-commit hook alongside existing checks.

---

## 4. Audit & Fix Plan

### Phase 1: Full Audit (automated)

Run grep across `src/` for:

```bash
# Pattern 1: toNum / toNumber on money
grep -rn "toNum\|toNumber" --include="*.ts" --include="*.tsx" src/ | grep -i "amount\|balance\|value\|price\|cost\|fee"

# Pattern 2: Number() on money
grep -rn "Number(" --include="*.ts" --include="*.tsx" src/ | grep -i "amount\|balance\|value\|price\|cost\|fee"

# Pattern 3: parseFloat on money
grep -rn "parseFloat(" --include="*.ts" --include="*.tsx" src/ | grep -i "amount\|balance\|value\|price\|cost\|fee"

# Pattern 4: toLocaleString on money variables
grep -rn "\.toLocaleString()" --include="*.ts" --include="*.tsx" src/ | grep -i "amount\|balance\|value\|price\|cost\|fee"

# Pattern 5: parseFinancial(...).toFixed() without arguments
grep -rn "parseFinancial(.*)\.toFixed()" --include="*.ts" --include="*.tsx" src/
```

Expected output: list of ~30–50 violations across admin withdrawals, investor dashboard, fund performance, transaction history, KPI cards, and shared components.

### Phase 2: Categorize by Severity

| Severity | Criteria | Action |
|----------|----------|--------|
| **Critical** | User-facing withdrawal / deposit amount display | Fix immediately |
| **High** | Admin fund management, investor balance display | Fix immediately |
| **Medium** | Reporting, analytics, historical data | Fix in batch |
| **Low** | Internal debug logging, non-monetary numbers | Mark as safe |

### Phase 3: Fix Instances

For each violation, apply the correct pattern:

**Pattern A: Displaying an amount → use `formatAssetAmount`**
```typescript
// BEFORE
{toNum(withdrawal.requested_amount).toLocaleString()}

// AFTER
{formatAssetAmount(withdrawal.requested_amount, withdrawal.asset)}
```

**Pattern B: Input field value → preserve raw string**
```typescript
// BEFORE
setValue("amount", parseFinancial(maxAmount).toFixed());

// AFTER
setValue("amount", String(maxAmount));
```

**Pattern C: Comparison / arithmetic → use Decimal.js**
```typescript
// BEFORE
const balance = toNum(position.current_value);
if (balance > max) { ... }

// AFTER
const balance = parseFinancial(position.current_value);
if (balance.gt(maxAmount)) { ... }
```

**Pattern D: NumericInput blur formatting → use asset min decimals**
```typescript
// BEFORE (NumericInput.tsx)
minimumFractionDigits: 0

// AFTER
minimumFractionDigits: isFocused ? 0 : (asset ? getAssetDecimals(asset) : 2)
```

### Phase 4: Add the ESLint Rule

Create `eslint-plugin-indigo` or add as a local rule in `.eslint/rules/`.

### Phase 5: Regression Testing

For each touched component, verify with these test values:

| Value | Expected Display | Why |
|-------|-----------------|-----|
| `1.23456789` | `1.23456789` | 8-decimal precision |
| `12345678.90123456` | `12,345,678.90123456` | Large + high precision |
| `0.00000001` | `0.00000001` | Dust amount |
| `1000000.00000000` | `1,000,000.00000000` | Round number, all zeros shown |
| `null` / `undefined` | `0` | Graceful handling |

---

## 5. File Touch List (estimated)

### Known critical files (already triaged)
- `src/features/admin/withdrawals/components/CreateWithdrawalDialog.tsx`
- `src/features/admin/withdrawals/components/WithdrawalDetailsDrawer.tsx`
- `src/features/admin/withdrawals/components/RejectWithdrawalDialog.tsx`
- `src/components/common/NumericInput.tsx`

### Expected additional files (from audit)
- `src/features/admin/withdrawals/components/ApproveWithdrawalDialog.tsx`
- `src/features/admin/withdrawals/components/WithdrawalStats.tsx`
- `src/features/admin/withdrawals/components/BulkRestoreWithdrawalsDialog.tsx`
- `src/features/admin/withdrawals/components/WithdrawalBulkActionToolbar.tsx`
- `src/features/admin/withdrawals/pages/AdminWithdrawalsPage.tsx`
- `src/features/admin/withdrawals/hooks/useWithdrawalSelection.ts`
- `src/hooks/data/shared/useAvailableBalance.ts`
- `src/hooks/data/shared/useAssetData.ts`
- `src/features/shared/services/withdrawalService.ts`
- `src/features/shared/services/transactionsV2Service.ts`
- `src/features/shared/services/feeScheduleService.ts`
- `src/features/investor/dashboard/components/PortfolioSummary.tsx`
- `src/features/investor/dashboard/components/AssetAllocationChart.tsx`
- `src/features/investor/dashboard/components/TransactionHistory.tsx`
- `src/features/investor/dashboard/components/PerformanceMetrics.tsx`
- `src/features/investor/withdrawals/components/CreateWithdrawalForm.tsx`
- `src/features/investor/withdrawals/components/WithdrawalHistory.tsx`
- `src/features/investor/withdrawals/components/WithdrawalSummary.tsx`
- `src/features/fund/components/FundPerformanceCard.tsx`
- `src/features/fund/components/AUMChart.tsx`
- `src/features/fund/components/YieldDistributionTable.tsx`
- `src/features/fund/components/FeeBreakdown.tsx`
- `src/features/fund/components/InvestorList.tsx`
- `src/components/common/AmountDisplay.tsx` (if exists)
- `src/utils/assets.ts`
- `src/utils/financial.ts`
- `src/utils/numeric.ts`
- `src/types/asset.ts`
- `src/types/financial.ts` (new)
- `.eslintrc.json`
- `.eslint/rules/no-native-number-on-money.js` (new)

---

## 6. Migration Guide (for future developers)

Save as `docs/patterns/financial-formatting.md`:

```markdown
# Financial Formatting Guidelines

## The Rule
Monetary values are stored as `string` (or `FinancialString`) with `NUMERIC(38,18)` precision from PostgreSQL. **Never convert them to JavaScript `number`.**

## DO
- Use `formatAssetAmount(value, assetSymbol)` for display with symbol.
- Use `formatFinancialDisplay(value, maxDecimals?)` for display without symbol.
- Use `parseFinancial(value)` for arithmetic (returns `Decimal`).
- Use `fromDbValue(value)` to create a `FinancialString`.

## DON'T
- `toNum(amount)` — precision loss
- `Number(amount)` — precision loss
- `parseFloat(amount)` — precision loss
- `amount.toLocaleString()` — no-op on strings, no thousand separators
- `parseFinancial(x).toFixed()` without arguments — strips trailing zeros
```

---

## 7. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|------------|
| ESLint rule catches non-monetary `toNum` usage | Medium | False positives | Exclude non-monetary variable names (`count`, `percentage`, `index`, `id`) from the rule |
| `FinancialString` type causes cascading TypeScript errors | Medium | Build breakage | Migrate incrementally; don't change domain type definitions in one PR |
| Formatting changes break snapshot tests | Low | CI failure | Update snapshots as part of the PR |
| Large refactor scope causes merge conflicts | Medium | Delay | Break into 3 PRs: (1) critical withdrawal components, (2) investor portal, (3) admin/reporting + lint rule |

---

## 8. Success Criteria

- [ ] All 4 known critical instances are fixed.
- [ ] Audit produces zero new `toNum`/`Number`/`parseFloat`/`toLocaleString` violations on monetary values.
- [ ] ESLint rule `no-native-number-on-money` passes on all `src/` files.
- [ ] Visual regression: dropdown labels, input fields, and detail drawers show identical precision for the same value.
- [ ] Adriel can see and withdraw exact amounts with full precision displayed.

---

## 9. Timeline Estimate

| Phase | Effort | Duration |
|-------|--------|----------|
| Full audit + categorization | 1 dev | 2 hours |
| Fix critical instances (4 known + ~10 more) | 1 dev | 4 hours |
| Fix investor portal + admin tables | 1 dev | 4 hours |
| Add ESLint rule + pre-commit wiring | 1 dev | 3 hours |
| Regression testing + snapshot updates | 1 dev | 2 hours |
| **Total** | | **~15 hours** |

Recommended split into **3 PRs** to minimize risk:
1. **PR 1**: Critical withdrawal components + `NumericInput` fix (blocks Adriel)
2. **PR 2**: Investor portal + admin tables + remaining components
3. **PR 3**: ESLint rule + `FinancialString` type + migration guide
