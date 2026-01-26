

# Phase 5A Cleanup: Delete Original Files

## Overview
Delete the 23 redundant original component files from the root `src/components/admin/investors/` directory. These files have already been moved to their respective subdirectories and the imports have been updated.

---

## Files to Delete

### List Components (9 files)
```
src/components/admin/investors/EditableInvestorRow.tsx
src/components/admin/investors/InvestorFiltersBar.tsx
src/components/admin/investors/InvestorsHeader.tsx
src/components/admin/investors/InvestorsTable.tsx
src/components/admin/investors/InvestorsTableHeader.tsx
src/components/admin/investors/InvestorTableContainer.tsx
src/components/admin/investors/InvestorTableRow.tsx
src/components/admin/investors/SearchBar.tsx
src/components/admin/investors/UnifiedInvestorsTable.tsx
```

### Tab Components (9 files)
```
src/components/admin/investors/InvestorTabs.tsx
src/components/admin/investors/InvestorOverviewTab.tsx
src/components/admin/investors/InvestorPortfolioTab.tsx
src/components/admin/investors/InvestorPositionsTab.tsx
src/components/admin/investors/InvestorTransactionsTab.tsx
src/components/admin/investors/InvestorWithdrawalsTab.tsx
src/components/admin/investors/InvestorActivityTab.tsx
src/components/admin/investors/InvestorReportsTab.tsx
src/components/admin/investors/InvestorSettingsTab.tsx
```

### Form Components (5 files)
```
src/components/admin/investors/AddInvestorDialog.tsx
src/components/admin/investors/InternalRouteDialog.tsx
src/components/admin/investors/InvestorForm.tsx
src/components/admin/investors/InvestorProfileEditor.tsx
src/components/admin/investors/InviteInvestorDialog.tsx
```

---

## Files to Keep at Root

These files remain at root level (not deleted):
- `MobileInvestorCard.tsx` - Used by `MobileInvestorCard/` subdirectory
- `index.ts` - Main barrel file for the investors module

---

## Implementation

Single batch deletion of all 23 files.

---

## Post-Cleanup Verification

After deletion:
1. Run `npm run build` - Confirm no import errors
2. Check `/admin/investors` page loads correctly
3. Verify investor drawer opens with all tabs working

---

## Expected Final Structure

```
src/components/admin/investors/
├── bulk/                    ✅ (2 files)
├── detail/                  ✅ (6 files)
├── forms/                   ✅ (5 files)
├── ledger/                  ✅ (existing)
├── list/                    ✅ (9 files)
├── MobileInvestorCard/      ✅ (existing)
├── reports/                 ✅ (3 files)
├── shared/                  ✅ (3 files)
├── tabs/                    ✅ (9 files)
├── wizard/                  ✅ (existing)
├── yields/                  ✅ (3 files)
├── MobileInvestorCard.tsx   ✅ (stays)
└── index.ts                 ✅ (stays)
```

No loose component files at root level except `MobileInvestorCard.tsx`.

