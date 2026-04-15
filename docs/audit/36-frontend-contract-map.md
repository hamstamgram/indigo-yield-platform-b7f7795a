# Frontend Contract Map - Release Readiness Inventory

**Purpose:** Document what the frontend expects from the backend to identify drift risks.  
**Scope:** Active user flows, RPC calls, local contract definitions, assumptions.  
**Last Updated:** 2026-04-14

---

## A. Route-to-Contract Map

### 1. Yield Distribution (Admin)

| Route | Hook/Service | Backend RPC | Request Shape | Response Shape |
|-------|-------------|-------------|---------------|-----------------|
| `/admin/yields` → Apply | `yieldApplyService.applyYieldDistribution()` | `apply_segmented_yield_distribution_v5` | `{p_fund_id, p_period_end, p_recorded_aum, p_admin_id, p_purpose, p_distribution_date, p_opening_aum?}` | `{distribution_id, opening_aum, recorded_aum, gross, net, fees, ib, allocations, period_start, period_end, dust_amount}` |
| `/admin/yields` → Void | `yieldManagementService.voidYieldDistribution()` | `void_yield_distribution` | `{p_distribution_id, p_admin_id, p_reason, p_void_crystals}` | `{success, voided_count, voided_crystals, error}` |
| `/admin/yields` → Preview | `yieldPreviewService.previewYieldDistribution()` | `preview_segmented_yield_distribution_v5` | `{p_fund_id, p_period_end, p_recorded_aum, p_admin_id, p_purpose}` | `{period_start, period_end, opening_aum, recorded_aum, gross, net, fees, ib, allocation_count, dust}` |

### 2. Transaction Management (Admin)

| Route | Hook/Service | Backend RPC | Request Shape | Response Shape |
|-------|-------------|-------------|---------------|-----------------|
| `/admin/transactions` → Void | `adminTransactionHistoryService.voidTransaction()` | `void_transaction` | `{p_transaction_id, p_admin_id, p_reason}` | `{success, transaction_id, voided_at, aum_events_voided, daily_aum_voided, fee_allocations_voided, ib_ledger_voided, platform_fee_voided, yield_events_voided}` |
| `/admin/transactions` → Unvoid | `adminTransactionHistoryService.unvoidTransaction()` | `unvoid_transaction` | `{p_transaction_id, p_admin_id, p_reason}` | `{success, transaction_id, unvoided_at, ...}` |
| `/admin/transactions` → Bulk Void | `adminTransactionHistoryService.voidTransactionsBulk()` | `void_transactions_bulk` | `{p_transaction_ids[], p_admin_id, p_reason}` | `{success, results[]}` |
| `/admin/transactions` → Impact Check | `adminTransactionHistoryService.getVoidTransactionImpact()` | `get_void_transaction_impact` | `{p_transaction_id}` | `{affected_aum_events, affected_daily_aum, affected_fee_allocations, ...}` |

### 3. Withdrawal Management (Admin + Investor)

| Route | Hook/Service | Backend RPC | Request Shape | Response Shape |
|-------|-------------|-------------|---------------|-----------------|
| `/admin/withdrawals` → Approve | `withdrawalService.approveWithdrawal()` | `approve_withdrawal` | `{p_withdrawal_id, p_admin_id, p_approved_amount, p_approved_shares}` | `{success, withdrawal_id, transaction_id}` |
| `/admin/withdrawals` → Complete | `withdrawalService.completeWithdrawal()` | `approve_and_complete_withdrawal` | `{p_withdrawal_id, p_admin_id}` | `{success, withdrawal_id, transaction_id}` |
| `/admin/withdrawals` → Cancel | `withdrawalService.cancelWithdrawalAdmin()` | `cancel_withdrawal_by_admin_v2` | `{p_withdrawal_id, p_admin_id, p_reason}` | `{success, withdrawal_id}` |
| `/admin/withdrawals` → Void | `withdrawalService.voidCompletedWithdrawal()` | `void_completed_withdrawal` | `{p_withdrawal_id, p_admin_id, p_reason}` | `{success, withdrawal_id}` |
| `/investor/withdrawals` → Cancel | `investorWithdrawalService.cancelWithdrawal()` | `cancel_withdrawal_by_investor` | `{p_withdrawal_id}` | `{success, withdrawal_id}` |
| `/investor/withdrawals` → Create | `withdrawalService.createWithdrawalRequest()` | `create_withdrawal_request` | `{p_fund_id, p_investor_id, p_amount, p_shares, p_type}` | `{success, withdrawal_id}` |

### 4. Deposit/Investment (Investor)

| Route | Hook/Service | Backend RPC | Request Shape | Response Shape |
|-------|-------------|-------------|---------------|-----------------|
| `/investor/deposit` → Submit | `depositService.createDeposit()` | `apply_transaction_with_crystallization` | `{p_investor_id, p_fund_id, p_amount, p_type, p_tx_date, p_reference?}` | `{success, transaction_id, position_snapshot, crystallization}` |
| `/investor/deposit` → Reject | `depositService.rejectDeposit()` | `void_transaction` | `{p_transaction_id, p_admin_id, p_reason}` | (see transaction void response) |
| `/investor/invest` → Submit | `investmentService.createInvestment()` | `apply_transaction_with_crystallization` | `{p_investor_id, p_fund_id, p_amount, p_type, p_tx_date}` | `{success, transaction_id, position_snapshot, crystallization}` |

### 5. Position Adjustment (Admin)

| Route | Hook/Service | Backend RPC | Request Shape | Response Shape |
|-------|-------------|-------------|---------------|-----------------|
| `/admin/positions` → Adjust | `transactionService.adjustInvestorPosition()` | `adjust_investor_position` | `{p_investor_id, p_fund_id, p_new_shares, p_new_cost_basis, p_admin_id, p_reason}` | `{success, position_id, shares, cost_basis, current_value}` |

### 6. AUM Reconciliation (Admin)

| Route | Hook/Service | Backend RPC | Request Shape | Response Shape |
|-------|-------------|-------------|---------------|-----------------|
| `/admin/funds/aum` → Check | `aumReconciliationService.checkReconciliation()` | `check_aum_reconciliation` | `{p_fund_id?, p_date?}` | `{is_valid, drift_amount, drift_percentage, details[]}` |
| `/admin/funds/aum` → Get Snapshot | `fundService.getFundAUMAsOf()` | `get_fund_aum_as_of` | `{p_fund_id, p_date, p_purpose?}` | `{fund_id, aum_date, total_aum, nav_per_share, total_shares}` |

---

## B. Local Contract Source-of-Truth Map

### Generated Contracts (DO NOT EDIT - Regenerated via `npm run contracts:generate`)

| File | Contents | Source |
|------|----------|--------|
| `src/integrations/supabase/types.ts` | Full Supabase generated types (Tables, RPCs, Enums) | `npm run contracts:generate` |
| `src/contracts/rpcSignatures.ts` | Zod-validated RPC function registry + request/response schemas | `npm run contracts:generate` |
| `src/contracts/dbSchema.ts` | Table metadata (columns, PKs, RLS status) | `npm run contracts:generate` |
| `src/contracts/dbEnums.ts` | Enum schemas with validation (ACCESS_EVENT, ACCOUNT_TYPE, APP_ROLE, etc.) | `npm run contracts:generate` |
| `src/lib/rpc/types.ts` | TypeScript types for RPC call results | `npm run contracts:generate` |

### Handwritten Contracts

| File | Contents | Purpose |
|------|----------|---------|
| `src/lib/rpc/client.ts` | RPC call wrapper with rate limiting, retry logic, validation | Runtime RPC invocation |
| `src/lib/rpc/validation.ts` | Input validation for RPC params | Pre-call validation |
| `src/lib/rpc/normalization.ts` | Error normalization for user-facing messages | Error handling |
| `src/lib/validation/schemas.ts` | Zod schemas for form validation | Client-side form validation |
| `src/lib/validation/deposit.ts` | Deposit-specific validation | Deposit form |
| `src/lib/validation/investment.ts` | Investment-specific validation | Investment form |
| `src/types/domains/*.ts` | Domain-specific types (FeeAllocation, YieldDistribution, etc.) | Internal typing |

---

## C. Frontend Assumptions

### Critical Assumptions (Will Break if Violated)

| # | Assumption | Location | Risk |
|---|------------|----------|------|
| 1 | `void_transaction` returns `success` boolean | `adminTransactionHistoryService.ts:230` | HIGH - UI checks `.success` to show success toast |
| 2 | `void_transaction` returns `fee_allocations_voided` count | `transactionsV2Service.ts:117` | MEDIUM - UI displays cascade counts |
| 3 | `apply_segmented_yield_distribution_v5` returns `distribution_id` | `yieldApplyService.ts:80` | HIGH - UI uses this to redirect/render success |
| 4 | `apply_segmented_yield_distribution_v5` returns `allocation_count` | `yieldApplyService.ts:96` | MEDIUM - UI displays investor count |
| 5 | `void_yield_distribution` returns `voided_count` | `yieldManagementService.ts:121` | MEDIUM - UI logs warning if 0 |
| 6 | `withdrawal_requests` has `updated_at` column | `useWithdrawalFormData.ts` (realtime) | HIGH - Subscription filters on `updated_at` |
| 7 | `investor_positions` has `updated_at` column | `useUserAssets.ts` (realtime) | HIGH - Subscription filters on `updated_at` |
| 8 | `fee_allocations` has `is_voided` column | `feesService.ts` | HIGH - Query filters on `is_voided` |
| 9 | `transactions_v2` has `is_voided`, `voided_at`, `voided_by`, `void_reason` columns | Various | HIGH - Void state display |
| 10 | `yield_distributions` has `is_voided` column | `yieldDistributionsPageService.ts` | HIGH - Query filters on `is_voided` |
| 11 | All RPC responses are JSON objects with `success` or error in root | `rpc/client.ts` | HIGH - Global error handling |
| 12 | All dates are ISO strings or PostgreSQL-compatible | Multiple services | MEDIUM - Date serialization |
| 13 | Financial amounts are returned as strings (not floats) | `yieldApplyService.ts:88-99` | HIGH - Display uses String, parse may fail on float |

### Enum Assumptions

| Enum | Expected Values | Location | Risk if Drifted |
|------|----------------|----------|-----------------|
| `transaction_types` | DEPOSIT, WITHDRAWAL, YIELD, FEE, TRANSFER, ADJUSTMENT | `dbEnums.ts` | HIGH - Switch cases may fail |
| `withdrawal_status` | PENDING, APPROVED, PROCESSING, COMPLETED, CANCELLED, REJECTED | `dbEnums.ts` | HIGH - Status display breaks |
| `fund_class` | STRATEGY, INDEX, STRUCTURED | `dbEnums.ts` | MEDIUM - Fund filtering |
| `aum_purpose` | transaction, yield, reporting, manual | `rpcSignatures.ts` | HIGH - RPC calls fail |
| `yield_distribution_type` | deposit, withdrawal, transaction, adjustment, month_end | `dbEnums.ts` | MEDIUM - Filtering breaks |

---

## D. Risk Areas

### High Risk (Immediate Break on Contract Drift)

| Risk | Description | Detection Method |
|------|-------------|-------------------|
| **Schema drift on void columns** | Backend removed `updated_at` from `fee_allocations`, frontend sends it | Test void transaction flow |
| **Missing response fields** | RPC returns fewer fields than expected (e.g., no `fee_allocations_voided`) | TypeScript compile error OR runtime undefined |
| **Enum value drift** | New enum value added server-side not in `dbEnums.ts` | Silent mismatch, switch falls through |
| **Realtime subscription filter** | Subscriptions on `updated_at` fail if column removed | WebSocket errors in console |
| **JSON response shape change** | RPC returns array instead of object | Type error or runtime crash |

### Medium Risk (Degraded UX, Not Immediate Crash)

| Risk | Description | Detection Method |
|------|-------------|-------------------|
| **Rate limit mismatch** | Frontend expects specific rate limits (`client.ts:43-65`) | 429 errors increase |
| **Missing optional fields** | RPC returns optional fields as undefined | Empty displays, logs |
| **Date format inconsistency** | Backend returns `TIMESTAMPTZ`, frontend expects `DATE` | Display offset by timezone |
| **Numeric precision** | Backend returns `NUMERIC`, frontend parses as `float` | Rounding errors on display |

### Low Risk (Documentation/Process Issues)

| Risk | Description |
|------|-------------|
| **Stale generated types** | `npm run contracts:generate` not run after schema change |
| **Undocumented RPC** | New RPC added without updating `rpcSignatures.ts` |
| **Inconsistent error codes** | Backend uses different error codes than frontend expects |

---

## E. Regression Checklist

Before each release, verify:

- [ ] Run `npm run contracts:generate` and diff check
- [ ] Void a transaction and verify cascade counts display
- [ ] Apply yield distribution and verify investor count displays
- [ ] Create withdrawal and verify realtime update works
- [ ] Check browser console for RLS/policy errors
- [ ] Verify all enum values in use match `dbEnums.ts`
- [ ] Test one flow with each fund class (STRATEGY, INDEX, STRUCTURED)

---

## F. Contract Sync Commands

```bash
# Regenerate contracts from live database
npm run contracts:generate

# Check for drift (compare to last commit)
git diff src/contracts/

# Verify specific table columns
psql -c "SELECT column_name FROM information_schema.columns WHERE table_name = 'fee_allocations'"
```