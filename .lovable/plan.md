
# Phase 5A: Complete Component File Movement

## Overview
Move all remaining 35 investor component files from the root `investors/` directory into their designated subdirectories. Each file will have its imports updated, and the barrel files will be updated to use local imports.

---

## Files to Move by Directory

### 1. List Components (9 files → `list/`)

| File | Has Cross-Imports | Import Updates Needed |
|------|------------------|----------------------|
| `EditableInvestorRow.tsx` | `./InviteInvestorDialog` | `../forms` |
| `InvestorFiltersBar.tsx` | None | None |
| `InvestorsHeader.tsx` | None | None |
| `InvestorsTable.tsx` | `./EditableInvestorRow`, `./InvestorsTableHeader`, `./MobileInvestorCard` | Local `./` (same dir), `../MobileInvestorCard` |
| `InvestorsTableHeader.tsx` | None | None |
| `InvestorTableContainer.tsx` | `./SearchBar`, `./InvestorsTable` | Local `./` (same dir) |
| `InvestorTableRow.tsx` | None | None |
| `SearchBar.tsx` | None | None |
| `UnifiedInvestorsTable.tsx` | Check for cross-imports | TBD |

### 2. Tab Components (9 files → `tabs/`)

| File | Has Cross-Imports | Import Updates Needed |
|------|------------------|----------------------|
| `InvestorTabs.tsx` | `./InvestorOverviewTab`, `./InvestorPositionsTab`, `./InvestorWithdrawalsTab`, `./InvestorReportsTab`, `./InvestorSettingsTab`, `./ledger` | Local `./` (same dir), `../ledger` |
| `InvestorOverviewTab.tsx` | None | None |
| `InvestorPortfolioTab.tsx` | `./InvestorPositionsTab`, `./InvestorYieldManager`, `./InvestorYieldHistory` | Local `./InvestorPositionsTab`, `../yields` |
| `InvestorPositionsTab.tsx` | None | None |
| `InvestorTransactionsTab.tsx` | None | None |
| `InvestorWithdrawalsTab.tsx` | None | None |
| `InvestorActivityTab.tsx` | `./InvestorTransactionsTab`, `./InvestorWithdrawalsTab`, `./InvestorReportsTab` | Local `./` (same dir) |
| `InvestorReportsTab.tsx` | None | None |
| `InvestorSettingsTab.tsx` | None | None |

### 3. Form Components (5 files → `forms/`)

| File | Has Cross-Imports | Import Updates Needed |
|------|------------------|----------------------|
| `AddInvestorDialog.tsx` | `./wizard/AddInvestorWizard` | `../wizard/AddInvestorWizard` |
| `InternalRouteDialog.tsx` | None | None |
| `InvestorForm.tsx` | None | None |
| `InvestorProfileEditor.tsx` | None | None |
| `InviteInvestorDialog.tsx` | None | None |

### 4. Yield Components (3 files → `yields/`)

| File | Has Cross-Imports | Import Updates Needed |
|------|------------------|----------------------|
| `InvestorFeeManager.tsx` | None | None |
| `InvestorYieldHistory.tsx` | None | None |
| `InvestorYieldManager.tsx` | None | None |

### 5. Report Components (3 files → `reports/`)

| File | Has Cross-Imports | Import Updates Needed |
|------|------------------|----------------------|
| `HistoricalReportsDashboard.tsx` | None | None |
| `MonthlyReportsTable.tsx` | None | None |
| `ReportRecipientsEditor.tsx` | None | None |

### 6. Bulk Components (2 files → `bulk/`)

| File | Has Cross-Imports | Import Updates Needed |
|------|------------------|----------------------|
| `BulkOperationsPanel.tsx` | None | None |
| `BulkDataGenerator.tsx` | None | None |

### 7. Shared Components (3 files → `shared/`)

| File | Has Cross-Imports | Import Updates Needed |
|------|------------------|----------------------|
| `FundAssetDropdown.tsx` | None | None |
| `FundPositionCard.tsx` | None | None |
| `IBSettingsSection.tsx` | None | None |

---

## Implementation Steps

### Step 1: Move List Components (9 files)
1. Create files in `list/` directory with updated imports
2. Update `list/index.ts` to use local imports (`./` instead of `../`)
3. Delete original files

### Step 2: Move Tab Components (9 files)
1. Create files in `tabs/` directory with updated imports
2. Update `tabs/index.ts` to use local imports
3. Handle cross-references:
   - `InvestorTabs.tsx` imports from `./ledger` → `../ledger`
   - `InvestorPortfolioTab.tsx` imports yields → `../yields`
4. Delete original files

### Step 3: Move Form Components (5 files)
1. Create files in `forms/` directory
2. Update `AddInvestorDialog.tsx`: `./wizard/` → `../wizard/`
3. Update `forms/index.ts` to use local imports
4. Delete original files

### Step 4: Move Yield Components (3 files)
1. Create files in `yields/` directory
2. Update `yields/index.ts` to use local imports
3. Delete original files

### Step 5: Move Report Components (3 files)
1. Create files in `reports/` directory
2. Update `reports/index.ts` to use local imports
3. Delete original files

### Step 6: Move Bulk Components (2 files)
1. Create files in `bulk/` directory
2. Update `bulk/index.ts` to use local imports
3. Delete original files

### Step 7: Move Shared Components (3 files)
1. Create files in `shared/` directory
2. Update `shared/index.ts` to use local imports
3. Delete original files

---

## Barrel File Updates

After moving, each barrel file will be updated:

**`list/index.ts`** (after move):
```typescript
export { default as EditableInvestorRow } from "./EditableInvestorRow";
export { InvestorFiltersBar } from "./InvestorFiltersBar";
export { default as InvestorsHeader } from "./InvestorsHeader";
export { default as InvestorsTable } from "./InvestorsTable";
export { default as InvestorsTableHeader } from "./InvestorsTableHeader";
export { default as InvestorTableContainer } from "./InvestorTableContainer";
export { default as InvestorTableRow } from "./InvestorTableRow";
export { default as SearchBar } from "./SearchBar";
export { UnifiedInvestorsTable } from "./UnifiedInvestorsTable";
```

**`tabs/index.ts`** (after move):
```typescript
export { InvestorTabs } from "./InvestorTabs";
export { default as InvestorOverviewTab } from "./InvestorOverviewTab";
export { InvestorPortfolioTab } from "./InvestorPortfolioTab";
export { default as InvestorPositionsTab } from "./InvestorPositionsTab";
export { default as InvestorTransactionsTab } from "./InvestorTransactionsTab";
export { default as InvestorWithdrawalsTab } from "./InvestorWithdrawalsTab";
export { InvestorActivityTab } from "./InvestorActivityTab";
export { default as InvestorReportsTab } from "./InvestorReportsTab";
export { default as InvestorSettingsTab } from "./InvestorSettingsTab";
```

(Similar pattern for other barrels)

---

## Cross-Component Import Fixes

| In File (after move) | Original Import | New Import |
|---------------------|-----------------|------------|
| `list/EditableInvestorRow.tsx` | `./InviteInvestorDialog` | `../forms/InviteInvestorDialog` |
| `list/InvestorsTable.tsx` | `./MobileInvestorCard` | `../MobileInvestorCard` |
| `tabs/InvestorTabs.tsx` | `./ledger` | `../ledger` |
| `tabs/InvestorPortfolioTab.tsx` | `./InvestorYieldManager`, `./InvestorYieldHistory` | `../yields` |
| `forms/AddInvestorDialog.tsx` | `./wizard/AddInvestorWizard` | `../wizard/AddInvestorWizard` |

---

## Files Summary

### Files to Create (34 total)
- `list/`: 9 component files
- `tabs/`: 9 component files  
- `forms/`: 5 component files
- `yields/`: 3 component files
- `reports/`: 3 component files
- `bulk/`: 2 component files
- `shared/`: 3 component files

### Files to Delete (34 total)
All original files in root `investors/` directory after successful move

### Barrel Files to Update (7 total)
- `list/index.ts`
- `tabs/index.ts`
- `forms/index.ts`
- `yields/index.ts`
- `reports/index.ts`
- `bulk/index.ts`
- `shared/index.ts`

---

## Testing Checklist

After implementation:
1. Run `npm run build` - Verify no TypeScript errors
2. Navigate to `/admin/investors` - List loads correctly
3. Open investor drawer - Detail tabs work
4. Test Add Investor dialog - Wizard functions
5. Check yield management - Yields tab works
6. Verify no console errors about missing modules

---

## Expected Final Structure

```text
src/components/admin/investors/
├── detail/           ✅ (6 files - already done)
├── list/             ⏳ (9 files to move)
├── tabs/             ⏳ (9 files to move)
├── forms/            ⏳ (5 files to move)
├── yields/           ⏳ (3 files to move)
├── reports/          ⏳ (3 files to move)
├── bulk/             ⏳ (2 files to move)
├── shared/           ⏳ (3 files to move)
├── ledger/           ✅ (existing)
├── wizard/           ✅ (existing)
├── MobileInvestorCard/ ✅ (existing - stays at root)
├── MobileInvestorCard.tsx (stays - used by MobileInvestorCard/)
└── index.ts          ✅ (already updated)
```
