

# QA Audit Plan: INDIGO Yield Platform

This plan addresses every item in the QA prompt across all 4 phases, identifying what is already implemented, what needs fixes, and what needs verification via live testing.

---

## Phase 1: Core Architecture and Entity Roles

### 1A. INDIGO Fees as an Investor -- IMPLEMENTED, NEEDS LIVE VERIFICATION

The INDIGO Fees account (`169bb053-36cb-4f6e-93ea-831f0dfeaf1d`) is stored in `src/constants/fees.ts` and treated as an investor entity:

- `feesService.ts` queries `investor_positions` and `transactions_v2` for this account ID
- The yield V5 RPC (`apply_segmented_yield_distribution_v5`) includes all active positions in distribution, which should include the INDIGO Fees account if it has a position
- `accountUtils.ts` has explicit helpers (`isIndigoFeesAccount`, `isSystemAccount`) to identify this account

**Action**: Live verification only -- log in as admin, check that INDIGO Fees appears in investor list and its balance grows after yield distributions.

### 1B. Decimal Precision (3 decimal places for investors) -- IMPLEMENTED

- `INVESTOR_DISPLAY_DECIMALS = 3` is defined in `src/types/asset.ts` (line 100)
- `formatInvestorAmount()` in `src/utils/assets.ts` applies this precision
- Used in `FundDetailsPage.tsx`, `ApproveWithdrawalDialog.tsx`, and other investor-facing components

**Action**: No code changes needed. Verify visually that investor balances display 3 decimals.

---

## Phase 2: "Paul Johnson" Segmented Yield Scenario -- IMPLEMENTED

The V5 segmented yield engine (`apply_segmented_yield_distribution_v5` and `preview_segmented_yield_distribution_v5`) handles this scenario by design:

- Crystallization events define segment boundaries (mid-period deposits/withdrawals)
- Each segment allocates yield proportionally by balance within that segment
- Pre-deposit yield goes only to existing investors; post-deposit yield is shared

**Action**: Live verification only -- create the exact scenario (Indigo LP with 1250 SOL, +2 SOL gain, Paul deposits 234.17 SOL, month-end AUM 1500 SOL) and verify the preview shows correct segmented allocation.

---

## Phase 3: Fee Management and Pre-Flow Logic

### 3A. Fee Hierarchy -- IMPLEMENTED

The database RPC `get_investor_fee_pct` implements a hierarchy:
1. Per-fund fee schedule (`investor_fee_schedule` table) -- highest priority
2. Investor global fee (`profiles.fee_pct`)
3. Global platform default (`global_fee_settings.platform_fee_pct`)

`FeeScheduleSection.tsx` UI allows adding per-fund overrides with messaging: "Overrides take priority over the global fee default."

**Action**: Live verification -- set fund default 15%, investor custom 20%, run yield preview, confirm 20% is applied.

### 3B. IB Splits -- IMPLEMENTED

IB commissions are tracked via `ib_allocations` and `ib_commission_ledger` tables. The V5 engine tracks IB running balances between segments. `ib_commission_schedule` allows per-investor IB percentage configuration.

**Action**: Live verification -- assign IB, set commission, run yield, confirm split.

### 3C. Transaction Pre-Flow Input -- RESOLVED

The "Create Transaction" modal (`AdminManualTransaction.tsx`) has removed preflow/yield from the deposit flow:
- Line 129: `closing_aum: undefined` with comment "No preflow AUM -- yield handled via Record Yield"
- Line 182-183: Description states "Yield distribution is handled separately via the 'Record Yield' menu"

The "Void and Reissue" dialog still has a Closing AUM field but auto-fills from existing preflow records.

**Action**: No code changes needed. The field was effectively removed from the primary transaction creation path.

---

## Phase 4: Reporting and UI/UX

### 4A. Report Date Selection -- IMPLEMENTED

`InvestorReports.tsx` (lines 259-301) has separate Year and Month dropdowns:
- Year selector: generates options from 2024 to current year (line 270)
- Month selector: all 12 months (line 291)

**Action**: No code changes needed.

### 4B. Zero-Activity Reports -- NEEDS LIVE VERIFICATION

The `generate-fund-performance` edge function handles report generation. Need to verify it returns empty/zero data for investors with no activity in the selected period.

**Action**: Live test -- generate a report for a month before an investor joined. Verify no phantom data.

### 4C. Withdrawals -- IMPLEMENTED

`ApproveWithdrawalDialog.tsx` has:
- Full Exit toggle (line 56): `isFullExit` state
- Auto-fill balance with dust handling (lines 73-83): truncates to `INVESTOR_DISPLAY_DECIMALS` and calculates dust
- Dust routed to INDIGO Fees (line 162): "Full exit completed. Dust routed to INDIGO Fees."

**Action**: Live verification only.

### 4D. Transaction History Ordering -- NEEDS VERIFICATION

**Action**: Check `adminTransactionHistoryService.ts` for ordering. Verify newest-first in UI.

### 4E. Transaction Deletion / Void -- IMPLEMENTED

`void_transaction` RPC cascades to:
- `fund_aum_events` (via `reference_id` matching)
- Position recalculation via `recompute_investor_position()` trigger

**Action**: Live test -- void a transaction, verify position/yield recalculation is clean.

---

## Phase 5: Blocker Bug Verification

### 5A. "Failed to reset fund default fees" -- IMPLEMENTED

`EditFundDialog.tsx` (lines 119-131) has `resetToGlobalDefault()` which calls `feeSettingsService.getGlobalPlatformFee()`. The service (`feeSettingsService.ts`) queries `global_fee_settings` table for `platform_fee_pct` with a fallback to 0.20.

**Potential Issue**: The error might occur if the `global_fee_settings` table has no row for `platform_fee_pct`. The code handles this with a fallback, but the toast says "Failed to fetch global fee settings" on catch.

**Action**: 
1. Verify `global_fee_settings` table has a `platform_fee_pct` row
2. Live test the reset button in Edit Fund dialog

### 5B. "Error generating yield" -- NEEDS INVESTIGATION

This could stem from multiple points in the yield apply flow. Common causes:
- Missing preflow AUM for the period
- Conservation check failure
- No active positions in the fund

**Action**: 
1. Check edge function logs for `apply_segmented_yield_distribution_v5` errors
2. Verify `fund_aum_events` has proper records for the fund/period
3. Live test yield generation with a clean fund

### 5C. Inability to delete/modify reports -- IMPLEMENTED

`useDeleteInvestorReport` hook (in `useReports.ts`) calls `deleteInvestorReport()` service which:
1. Deletes `investor_fund_performance` records
2. Deletes `generated_statements` records

The delete button is visible in `InvestorReports.tsx` (line 516) with a Trash2 icon.

**Action**: Live test -- generate a report, then delete it. Verify clean removal.

---

## Summary: What Needs Code Changes vs. Live Testing

| Item | Status | Needs Code Change? |
|------|--------|-------------------|
| INDIGO Fees as investor | Implemented | No -- live verify |
| 3 decimal precision | Implemented | No |
| Segmented yield (Paul scenario) | Implemented (V5 engine) | No -- live verify |
| Fee hierarchy | Implemented | No -- live verify |
| IB splits | Implemented | No -- live verify |
| Pre-flow field removed | Implemented | No |
| Month/Year report selector | Implemented (back to 2024) | No |
| Zero-activity reports | Needs verification | Possibly -- edge function |
| Full withdrawal auto-fill | Implemented | No |
| Transaction ordering | Needs verification | Possibly |
| Void transaction cascade | Implemented | No -- live verify |
| Reset fund fees bug | Needs DB check | Possibly -- DB seed |
| Yield generation error | Needs investigation | Possibly |
| Delete reports | Implemented | No -- live verify |

**Conclusion**: The codebase has implementations for all QA items. The remaining work is primarily live verification and investigating the 3 reported bugs (fee reset, yield generation error, report deletion) which likely stem from database state or edge function issues rather than frontend code.

