
# Frontend-Backend Function Flow & Column Mismatch Audit

## Critical Finding: Numeric Precision Violations

The codebase declares a standard that all NUMERIC(28,10) database fields must be handled as `string` to prevent JavaScript floating-point precision loss. However, **multiple services violate this standard**, creating silent data corruption risks in a financial platform.

---

## CRITICAL: Precision-Losing `number` Types for Financial Data

### 1. `investorDetailService.ts` -- InvestorPosition uses `number` for financials

**File:** `src/services/admin/investorDetailService.ts` (lines 34-42)

The local `InvestorPosition` interface declares `current_value`, `cost_basis`, `unrealized_pnl` as `number`, and the mapping at line 166-174 does `p.current_value || 0` (coercing NUMERIC to JS number). The total is then computed with `reduce((sum, p) => sum + p.current_value, 0)` -- pure JS arithmetic on financial values.

**Fix:** Change interface fields to `string`, use `parseFinancial()` / `Decimal.js` for aggregation. Align with the canonical `InvestorPosition` from `@/types/domains/investor` which correctly uses strings.

### 2. `feesService.ts` -- All financial interfaces use `number`

**File:** `src/services/admin/feesService.ts`

- `FeeRecord.amount` (line 21): `number`
- `FeeSummary.totalAmount` (line 30): `number`
- `FeeAllocation.base_net_income/fee_percentage/fee_amount` (lines 43-45): `number`
- `YieldEarned.totalYieldEarned` (line 57): `number`
- `indigoFeesBalance` (line 71): `Record<string, number>`

These are all NUMERIC columns from `transactions_v2`, `platform_fee_ledger`, and `investor_positions`. The mapping uses `Number(tx.amount)` and plain JS `+` for aggregation.

**Fix:** Change all financial fields to `string`, use `parseFinancial()` for computations. Note: The canonical `FeeAllocation` in `@/types/domains/feeAllocation.ts` correctly uses strings -- this service defines a **duplicate, weaker type** with the same name.

### 3. `recordedYieldsService.ts` -- YieldRecord uses `number` for AUM/yield fields

**File:** `src/services/admin/recordedYieldsService.ts`

- `YieldRecord.total_aum` (line 19): `number`
- `YieldRecord.nav_per_share/total_shares` (lines 20-21): `number | null`
- `YieldRecord.gross_yield/net_yield/total_fees/total_ib` (lines 33-36): `number | null`

These map to NUMERIC columns in `fund_daily_aum` and `yield_distributions`.

**Fix:** Change to `string`, use `parseFinancial()` for display/calculations.

### 4. `dashboardMetricsService.ts` -- All dashboard types use `number`

**File:** `src/services/admin/dashboardMetricsService.ts`

- `AUMHistoryPoint.aum` (line 17): `number`
- `FinancialMetrics.totalAum/totalDeposits/totalWithdrawals/netFlow` (lines 26-30): `number`
- `FlowData.aum/daily_inflows/daily_outflows/net_flow_24h` (lines 34-38): `number`
- `InvestorComposition.balance/ownership_pct` (lines 70-71): `number`

The `getTransactionFlowMetrics()` correctly uses `parseFinancial()` internally but then calls `.toNumber()` to convert back, losing the precision it just preserved.

**Fix:** Keep as `string` through the full pipeline, only call `.toNumber()` at the final UI rendering step if needed.

### 5. `yieldManagementService.ts` -- Mixed precision

**File:** `src/services/admin/yields/yieldManagementService.ts`

- `UpdateYieldResult.old_aum/new_aum` (lines 21-22): `number`
- `YieldDetails.total_aum` (line 73): `number`
- `updateYieldAum()` takes `newTotalAum: number` parameter (line 163)

**Fix:** Use `string` for AUM values; pass string to RPC (PostgreSQL handles string-to-NUMERIC correctly).

---

## CRITICAL: RPC Parameter Precision Loss

### 6. `rpc/client.ts` -- `parseFloat()` destroys precision in canonical helpers

**File:** `src/lib/rpc/client.ts`

The `deposit()`, `withdrawal()`, `applyYield()`, and `previewYield()` helpers all call `parseFloat(params.amount)` or `parseFloat(params.recordedAum)` (lines 219, 241, 263, 279) before passing to the RPC.

`parseFloat("0.00000001234567890123456789")` loses digits beyond ~17 significant digits. PostgreSQL NUMERIC(28,10) supports 28 digits.

**Fix:** Pass the string value directly to the RPC. PostgreSQL accepts string input for NUMERIC parameters. The `callRPC` wrapper in `yieldApplyService.ts` already does this correctly with `parsedAum.toString() as unknown as number`.

### 7. `withdrawalService.ts` -- `parseFloat()` on withdrawal amounts

**File:** `src/services/investor/withdrawalService.ts`

- `approveAndComplete()` (line 255): `parseFloat(processedAmount)`
- `createWithdrawal()` (line 403): `parseFloat(params.amount)`
- `updateWithdrawal()` (line 433): `parseFloat(params.requestedAmount)`

**Fix:** Pass string values directly; use the `as unknown as number` cast pattern already established elsewhere.

---

## HIGH: Duplicate/Conflicting Type Definitions

### 8. `feesService.FeeAllocation` vs `@/types/domains/feeAllocation.FeeAllocation`

Two completely different interfaces with the same name:
- **Canonical** (`@/types/domains/feeAllocation.ts`): camelCase fields, `string` for NUMERIC, maps from `fee_allocations` table
- **Service** (`feesService.ts`): snake_case fields, `number` for NUMERIC, maps from `platform_fee_ledger` table

These represent different data sources but the same concept. Consumers importing "FeeAllocation" get different types depending on import path.

**Fix:** Rename the service version to `PlatformFeeLedgerEntry` or align both to use the canonical type with a transform layer.

### 9. `investorDetailService.InvestorPosition` vs `@/types/domains/investor.InvestorPosition`

- **Canonical** (`@/types/domains/investor.ts`): `string` financials, full field set
- **Service** (`investorDetailService.ts`): `number` financials, simplified subset with `fund_name/fund_code/asset`

**Fix:** Use the canonical type and add a view-model wrapper for the joined fund fields.

---

## HIGH: `void_yield_distribution` Signature Mismatch

### 10. Service passes `p_reason` but RPC contract marks it optional

**File:** `src/services/admin/yields/yieldManagementService.ts` (line 133-138)

The service passes `p_void_crystals` parameter which is correctly optional per the contract. However, the `FUNCTION_SIGNATURES.csv` shows the DB function signature as `(p_distribution_id uuid, p_admin_id uuid, p_reason text)` -- `p_reason` is a required positional param, but the `rpcSignatures.ts` marks it as optional. The `callRPC` call includes it, so no runtime error, but the contract metadata is incorrect.

**Fix:** Move `p_reason` from `optionalParams` to `requiredParams` in `rpcSignatures.ts`.

---

## MEDIUM: `as never` Type Escape Hatches

### 11. `withdrawalService.ts` uses `as never` casts

**File:** `src/services/investor/withdrawalService.ts`

- `approveAndComplete()` (line 264): `rpc.call("approve_and_complete_withdrawal" as never, params as never)`
- `restoreWithdrawal()` (line 470): `rpc.call("restore_withdrawal_by_admin" as never, {...} as never)`

These bypass all type checking. If the RPC function names or parameters change, no compile-time error will catch it.

**Fix:** Add proper type definitions for these RPCs in the generated types, or use `callRPC` which has the correct typing.

---

## MEDIUM: `(supabase.rpc as any)` Bypass

### 12. `adminTransactionHistoryService.ts` uses `(supabase.rpc as any)`

**File:** `src/services/admin/adminTransactionHistoryService.ts`

- `unvoidTransaction()` (line 340): `(supabase.rpc as any)("unvoid_transaction", ...)`
- `voidTransactionsBulk()` (line 363): `(supabase.rpc as any)("void_transactions_bulk", ...)`
- `unvoidTransactionsBulk()` (line 392): `(supabase.rpc as any)("unvoid_transactions_bulk", ...)`

These bypass both type checking AND the RPC gateway (no rate limiting, no logging, no error normalization).

**Fix:** Use `rpc.call()` or `callRPC()` instead. All three RPCs are registered in `rpcSignatures.ts` and should work with the typed gateway.

---

## MEDIUM: `withdrawalService.ts` Still in Investor Folder but Contains Admin Logic

The file at `src/services/investor/withdrawalService.ts` (592 lines) contains admin operations like `approveAndComplete`, `rejectWithdrawal`, `cancelWithdrawal`, `routeToFees`, `restoreWithdrawal`, and `logBulkAudit`. This was flagged in the previous audit (item 3) but not yet moved.

**Fix:** Move admin-only methods to `src/services/admin/withdrawalAdminService.ts`. Keep only investor-portal methods in the investor service.

---

## Summary: Prioritized Fix Steps

| # | Severity | Issue | Files |
|---|----------|-------|-------|
| 1 | CRITICAL | `parseFloat()` precision loss in RPC client helpers | `src/lib/rpc/client.ts` |
| 2 | CRITICAL | `number` types for financials in `investorDetailService` | `src/services/admin/investorDetailService.ts` |
| 3 | CRITICAL | `number` types for financials in `feesService` | `src/services/admin/feesService.ts` |
| 4 | CRITICAL | `number` types for financials in `recordedYieldsService` | `src/services/admin/recordedYieldsService.ts` |
| 5 | CRITICAL | `number` types for financials in `dashboardMetricsService` | `src/services/admin/dashboardMetricsService.ts` |
| 6 | CRITICAL | `parseFloat()` in withdrawal amount params | `src/services/investor/withdrawalService.ts` |
| 7 | CRITICAL | `number` in `yieldManagementService` AUM fields | `src/services/admin/yields/yieldManagementService.ts` |
| 8 | HIGH | Duplicate `FeeAllocation` type with conflicting shapes | `feesService.ts` vs `@/types/domains/feeAllocation.ts` |
| 9 | HIGH | Duplicate `InvestorPosition` with conflicting shapes | `investorDetailService.ts` vs `@/types/domains/investor.ts` |
| 10 | HIGH | `void_yield_distribution` signature metadata mismatch | `src/contracts/rpcSignatures.ts` |
| 11 | MEDIUM | `as never` type escape hatches bypass type safety | `src/services/investor/withdrawalService.ts` |
| 12 | MEDIUM | `(supabase.rpc as any)` bypasses RPC gateway | `src/services/admin/adminTransactionHistoryService.ts` |
| 13 | MEDIUM | Admin logic in investor service folder | `src/services/investor/withdrawalService.ts` |

### Implementation Order

**Phase 1 -- Precision Fixes (items 1-7):** Convert all financial interfaces to `string`, replace `parseFloat()` with direct string passing for RPC, use `parseFinancial()` / `Decimal.js` for any calculations.

**Phase 2 -- Type Deduplication (items 8-10):** Rename conflicting local types, align with canonical domain types, fix RPC contract metadata.

**Phase 3 -- Gateway Compliance (items 11-12):** Replace `as never` / `as any` with proper typed `rpc.call()` or `callRPC()`.

**Phase 4 -- Structural (item 13):** Split withdrawal service between admin and investor domains.
