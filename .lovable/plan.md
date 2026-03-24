

# Yield History — Investor Allocations Column Mapping Audit

## Findings

| Column Header | Data Source | Status | Issue |
|---|---|---|---|
| **Investor** | `investorMap[alloc.investor_id]` → name/email | OK | Correctly mapped |
| **Gross Amount** | `alloc.gross_amount` | OK | Correctly mapped from `yield_allocations.gross_amount` |
| **Fees Paid** | `alloc.fee_amount` | OK | Correctly mapped, displayed as negative |
| **IB Comm.** | `alloc.ib_amount` | OK | Correctly mapped, displayed as negative |
| **Credits Earned** | Hardcoded `"-"` | BUG | The `yield_allocations` table has a `fee_credit` column but it is never fetched or displayed |
| **Net Yield** | `alloc.net_amount` | OK | Correctly mapped from `yield_allocations.net_amount` |
| **Position After** | `position_value_at_calc + net_amount` | LOGIC ISSUE | This manually adds `net_amount` to `position_value_at_calc`, but `position_value_at_calc` is the position **before** the yield. The addition is correct only if `net_amount` already includes the credit. If fee credits exist, the displayed "Position After" could be wrong since credits are ignored |

## Root Cause

Two things are missing:

1. **Service layer** (`yieldDistributionsPageService.ts` line 163-177): The Supabase query on `yield_allocations` does not select `fee_credit` or `fee_credit_transaction_id`. The `AllocationRow` type (line 36-50) also omits `fee_credit`.

2. **UI layer** (`YieldsTable.tsx` line 433): The "Credits Earned" cell is hardcoded to return `"-"` instead of displaying `alloc.fee_credit`.

## Distribution-Level "Total Credits" Column

The parent table also has a "Total Credits" column (line 280-296) that is hardcoded to `"-"`. The `DistributionRow` type and query similarly omit `total_fee_credit` from `yield_distributions`, even though that column exists in the database.

## Fix Plan

### Step 1: Update `AllocationRow` type and query
**File:** `src/services/admin/yields/yieldDistributionsPageService.ts`
- Add `fee_credit: number | null` to the `AllocationRow` type
- Add `fee_credit` to the Supabase select query (line 164-177)

### Step 2: Update `DistributionRow` type and query  
**File:** `src/services/admin/yields/yieldDistributionsPageService.ts`
- Add `total_fee_credit: number | null` to `DistributionRow` type
- Add `total_fee_credit` to the distribution query

### Step 3: Wire up the UI cells
**File:** `src/features/admin/yields/components/YieldsTable.tsx`
- Line 293-295: Replace hardcoded `"-"` in "Total Credits" column with `record.total_fee_credit` rendered via `FinancialValue`
- Line 433: Replace hardcoded `"-"` in allocation "Credits Earned" cell with `alloc.fee_credit` rendered via `FinancialValue`

### Step 4: Verify Position After calculation
The current formula `position_value_at_calc + net_amount` should be correct because `net_amount` in the yield engine already accounts for fee credits. No change needed here unless the V5 engine stores credits separately from net -- which it does not per the memory docs.

## Summary
- 2 hardcoded `"-"` cells need to be wired to real data
- 1 type + 1 query need `fee_credit` / `total_fee_credit` added
- No other column mappings are broken

