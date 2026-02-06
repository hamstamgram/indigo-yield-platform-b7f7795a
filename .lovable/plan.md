
# Phase 3: Code Quality Improvements

## Summary

This phase addresses code quality issues identified in the architecture audit, focusing on reducing code duplication, improving test organization, and completing the IB asset logos fix from the earlier approved plan.

---

## Task 3.1: Use `formatTransactionType()` in Transaction History Service

**File:** `src/services/admin/adminTransactionHistoryService.ts`

**Issue:** Lines 153-165 duplicate display type mapping logic that already exists in `src/types/domains/transaction.ts`:

```typescript
// Current duplicate logic in service (lines 153-165):
if (tx.type === "DEPOSIT") displayType = "Top-up";
else if (tx.type === "WITHDRAWAL") displayType = "Withdrawal";
// etc.

// Already exists in transaction.ts:
export function formatTransactionType(type: TransactionType): string {...}
```

**Solution:** 
1. Import `formatTransactionType` from `@/types/domains/transaction`
2. Extend `formatTransactionType` to support subtype display (or create a new `formatDisplayType` helper)
3. Replace inline mapping with utility call

**Changes:**
- Add `SUBTYPE_DISPLAY_MAP` and a new `getTransactionDisplayType(type, subtype)` function to `src/types/domains/transaction.ts`
- Update `adminTransactionHistoryService.ts` to use the centralized function

---

## Task 3.2: Fix IB Active Assets (from earlier approved plan)

**Files:** 
- `src/features/admin/ib/hooks/useIBManagementPage.ts`
- `src/features/admin/ib/pages/IBManagementPage.tsx`

**Issue:** The "Active Funds" column shows broken logos because `activeFunds` contains fund UUIDs, not asset symbols.

**Solution:**
1. In hook: Rename `activeFunds: string[]` to `activeAssets: string[]` in the `IBProfile` interface
2. In hook: Convert `activeFundIds` to asset symbols using the existing `fundToAsset` map
3. In page: Update column to use `ib.activeAssets` directly with CryptoIcon

---

## Task 3.3: Organize Test Directory Structure

**Current state:** Tests directory has 40+ markdown reports and spec files at root level mixed with organized subdirectories.

**Solution:** Move all report files to `tests/reports/` subdirectory:

```text
tests/
  ├── reports/                    <- NEW: Move all .md and .json reports here
  │   ├── ACCOUNTING_COMPARISON_2026-01-25.md
  │   ├── ADMIN_PORTAL_TESTING_REPORT.md
  │   └── ... (35+ report files)
  ├── accessibility/              (keep)
  ├── e2e/                        (keep)
  ├── fixtures/                   (keep)
  ├── integration/                (keep)
  ├── qa/                         (keep)
  ├── screenshots/                (keep)
  ├── sql/                        (keep)
  ├── unit/                       (keep)
  ├── utils/                      (keep)
  ├── README.md                   (keep at root)
  └── *.spec.ts                   (move to e2e/ or integration/)
```

**Files to move:**
- All `*.md` (except README files) → `tests/reports/`
- All `*.json` (report files) → `tests/reports/`
- Consider moving root-level `*.spec.ts` files to appropriate subdirectories

---

## Task 3.4: Document Deprecated Shim Files

**Location:** `src/hooks/data/index.ts` contains a deprecation note:

```typescript
// Individual shim files in this directory are deprecated and will be removed in v2.0.
```

**Solution:** Create `docs/DEPRECATED_SHIMS.md` to track:
1. List of deprecated shim files
2. Migration path for each
3. Target removal version (v2.0)

---

## Implementation Order

| # | Task | Effort | Files |
|---|------|--------|-------|
| 1 | Fix IB activeAssets (complete earlier plan) | Low | 2 files |
| 2 | Centralize displayType mapping | Low | 2 files |
| 3 | Organize test reports | Medium | 35+ files moved |
| 4 | Document deprecated shims | Low | 1 new doc file |

---

## Files to Modify

| File | Change |
|------|--------|
| `src/types/domains/transaction.ts` | Add `getTransactionDisplayType()` helper |
| `src/services/admin/adminTransactionHistoryService.ts` | Use centralized display type function |
| `src/features/admin/ib/hooks/useIBManagementPage.ts` | Change `activeFunds` → `activeAssets` with conversion |
| `src/features/admin/ib/pages/IBManagementPage.tsx` | Update Active Funds column to use `activeAssets` |
| `tests/reports/` (new directory) | Move 35+ report files |
| `docs/DEPRECATED_SHIMS.md` (new file) | Document deprecation plan |

---

## Testing

After implementation:
1. Navigate to `/admin/ib-management` - verify Active Funds column shows proper crypto logos
2. Navigate to `/admin/transactions` - verify transaction display types still render correctly
3. Run `npm run test` to ensure test discovery still works after file reorganization
