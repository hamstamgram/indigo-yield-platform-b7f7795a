

# Surgical Alignment and State Reconciliation

## Overview

Five targeted updates addressing: a build error, fund lifecycle, investor deletion safety, deterministic sorting, dust transaction visibility on Revenue page, and nomenclature alignment.

---

## 0. Build Error Fix (Blocker)

**Root cause:** The `DUST` value was added to the `tx_type` Postgres enum (visible in `supabase/types.ts`) but `TX_TYPE_VALUES` in `src/contracts/dbEnums.ts` line 826 is missing `"DUST"`. The compile-time symmetry check on line 1235 correctly flags the mismatch.

**Fix:** Add `"DUST"` to `TX_TYPE_VALUES` array and add `DUST: "DUST"` to the `DB_TX_TYPE` object.

| File | Change |
|------|--------|
| `src/contracts/dbEnums.ts` line 838 | Add `"DUST"` after `"DUST_SWEEP"` in `TX_TYPE_VALUES` |
| `src/contracts/dbEnums.ts` line 871 | Add `DUST: "DUST"` after `DUST_SWEEP` in `DB_TX_TYPE` |

---

## 1. Fund Lifecycle: Soft Delete / Hard Delete

**Discovery -- FK constraints on `funds` (14 tables):**

| Constraint | Table | On Delete |
|------------|-------|-----------|
| fk_transactions_v2_fund | transactions_v2 | RESTRICT |
| fk_investor_positions_fund | investor_positions | RESTRICT |
| fk_fee_allocations_fund_v2 | fee_allocations | RESTRICT |
| fk_yield_distributions_fund_new | yield_distributions | RESTRICT |
| yield_allocations_fund_id_fkey | yield_allocations | (default = RESTRICT) |
| ib_allocations_fund_id_fkey | ib_allocations | (default = RESTRICT) |
| ib_commission_ledger_fund_id_fkey | ib_commission_ledger | (default = RESTRICT) |
| platform_fee_ledger_fund_id_fkey | platform_fee_ledger | (default = RESTRICT) |
| investor_daily_balance_fund_id_fkey | investor_daily_balance | (default = RESTRICT) |
| investor_position_snapshots_fund_id_fkey | investor_position_snapshots | (default = RESTRICT) |
| withdrawal_requests_fund_id_fkey | withdrawal_requests | CASCADE |
| ib_commission_schedule_fund_id_fkey | ib_commission_schedule | CASCADE |
| investor_fee_schedule_fund_id_fkey | investor_fee_schedule | CASCADE |
| admin_integrity_runs | admin_integrity_runs | (default = RESTRICT) |

**Current state:** `deleteFund` in `fundService.ts` already exists and does manual cascade cleanup. The `deactivateFund` sets `status = 'deprecated'`. The `funds` table already has a `status` enum with `deprecated` value -- this IS the soft delete.

**No code changes needed here.** The existing `deleteFund` (hard delete with cascade) and `deactivateFund` (soft delete to `deprecated`) already cover both paths. The `useDeleteFund` hook and `EditFundDialog` already wire these to the UI.

---

## 2. Investor Deletion: Safety Gate

**Discovery -- FK RESTRICT constraints on `profiles`:**
- `fee_allocations.investor_id` -- ON DELETE RESTRICT
- `investor_positions.investor_id` -- ON DELETE RESTRICT
- `transactions_v2.investor_id` -- ON DELETE RESTRICT (x2)

**Current state:** `force_delete_investor` RPC exists and does manual cascade DELETE of all related records before deleting the profile. It requires `super_admin`. The `useDeleteInvestor` hook calls `deleteInvestorUser` which calls this RPC.

**Gap:** The frontend `useDeleteInvestor` does NOT pre-check for active balances. It calls the RPC directly and lets the RPC do a hard-delete regardless of position state.

**Fix:** Add a pre-flight check in the `useDeleteInvestor` mutation that queries `investor_positions` for non-zero `current_value` before calling the RPC. If active positions exist, throw a user-friendly error.

| File | Change |
|------|--------|
| `src/hooks/data/shared/useInvestorMutations.ts` | Add pre-flight query for active positions before calling `deleteInvestorUser`. If `current_value > 0` exists, throw error: "Cannot delete investor with active balance of X in fund Y. Withdraw or transfer first." |

---

## 3. Deterministic Multi-Key Sorting

**Current state:** `useSortableColumns` in `src/hooks/ui/useSortableColumns.ts` sorts by a single key. When values are identical, row order is non-deterministic.

**Fix:** Add a tiebreaker sort. When the primary comparison returns 0, fall back to a secondary key. The hook already receives generic `T[]` data, so we add an optional `tiebreaker` parameter (defaults to `"created_at"` or `"id"`).

| File | Change |
|------|--------|
| `src/hooks/ui/useSortableColumns.ts` | Add optional `tiebreakerKey` parameter to `useSortableColumns`. When primary comparison returns 0, compare by tiebreaker field descending (newest first). Default: `"created_at"` |

---

## 4. Dust Transactions on Revenue Page

**Current state:** The last diff already updated `feesService.ts` to include `DUST` and `DUST_SWEEP` in the query filters, and `FeeTransactionsTable.tsx` to render a badge for `DUST`/`DUST_SWEEP` types. This part is done.

**Remaining gap:** The `route_withdrawal_to_fees` RPC creates transactions with type `INTERNAL_WITHDRAWAL`/`INTERNAL_CREDIT`, NOT `DUST` or `DUST_SWEEP`. The dust-sweep logic from full withdrawals also needs to be traced.

After checking the full withdrawal dust logic: the `complete_withdrawal` RPC handles full-exit dust by routing residual amounts to the INDIGO Fees account. These transactions are typed as `INTERNAL_CREDIT` with notes mentioning "dust". The Revenue page filter already includes `investor_id.eq.${INDIGO_FEES_ACCOUNT_ID}` which catches ALL transactions credited to the fees account regardless of type. So dust transactions are already visible on the Revenue page.

**No additional code changes needed for dust visibility.**

---

## 5. Nomenclature: FEE_CREDIT Label

**Current state:** The `FeeTransactionsTable.tsx` badge for `FEE_CREDIT` shows "Management Fee". The user wants this renamed to its standardized name.

The `fee_kind` enum has `mgmt` and `perf`. The `FEE_CREDIT` transaction type represents the platform's share of yield (performance fee credit to the INDIGO Fees account). Calling it "Management Fee" is misleading since there are no management fees (CFO policy: mgmt_fee_bps frozen at 0).

**Fix:** Rename the label from "Management Fee" to "Performance Fee" in the badge.

| File | Change |
|------|--------|
| `src/features/admin/fees/components/FeeTransactionsTable.tsx` line 51 | Change `"Management Fee"` to `"Performance Fee"` |

---

## Summary of All Changes

| # | File | Change | Risk |
|---|------|--------|------|
| 0 | `src/contracts/dbEnums.ts` | Add `"DUST"` to `TX_TYPE_VALUES` and `DB_TX_TYPE` | None -- aligns contract with DB |
| 2 | `src/hooks/data/shared/useInvestorMutations.ts` | Add pre-flight balance check before deletion | Low -- adds safety gate |
| 3 | `src/hooks/ui/useSortableColumns.ts` | Add tiebreaker sort key | Low -- backward compatible |
| 5 | `src/features/admin/fees/components/FeeTransactionsTable.tsx` | Rename "Management Fee" to "Performance Fee" | None -- label only |

**No SQL migrations required.** No database function changes. No enum alterations.

Items 1 (fund lifecycle) and 4 (dust visibility) require no changes -- the existing code already handles them correctly.

