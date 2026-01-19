# Mutation Inventory

## Overview

This document catalogs all database mutation paths in the Indigo Fund platform, covering RPCs, Edge Functions, and direct table operations. Each mutation is documented with its transaction boundaries, idempotency mechanism, and affected tables.

---

## Yield Distribution Mutations

### 1. `apply_daily_yield_to_fund_v2`

**Type:** RPC (PostgreSQL Function)

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `p_fund_id` | UUID | Target fund |
| `p_date` | DATE | Effective date |
| `p_gross_amount` | NUMERIC | Total yield to distribute |
| `p_admin_id` | UUID | Admin performing action |
| `p_purpose` | aum_purpose | 'transaction' or 'reporting' |

**Tables Modified:**
- `yield_distributions` - Creates distribution record
- `transactions_v2` - Creates interest entries per investor
- `fee_allocations` - Creates fee records per investor
- `ib_allocations` - Creates IB commission records
- `investor_positions` - Updates current_value
- `fund_daily_aum` - Updates AUM record

**Transaction Boundary:** Single atomic transaction

**Idempotency:** 
- `transactions_v2.reference_id` unique constraint prevents duplicates
- ON CONFLICT handlers for all inserts
- Re-running produces zero new rows on second run

**Called From:** `src/services/admin/yieldDistributionService.ts`

---

### 2. `preview_daily_yield_to_fund_v2`

**Type:** RPC (PostgreSQL Function)

**Parameters:** Same as `apply_daily_yield_to_fund_v2`

**Tables Modified:** None (read-only dry run)

**Returns:** JSON with preview of:
- Investor allocations
- Fee calculations
- IB commissions
- Position impacts

**Called From:** `src/services/admin/yieldDistributionService.ts`

---

### 3. `void_yield_distribution`

**Type:** RPC (PostgreSQL Function)

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `p_distribution_id` | UUID | Distribution to void |
| `p_admin_id` | UUID | Admin performing action |
| `p_reason` | TEXT | Void reason |

**Tables Modified:**
- `yield_distributions` - Sets status='voided', voided_at, voided_by
- `transactions_v2` - Marks related transactions as voided
- `fee_allocations` - Sets is_voided=true
- `ib_allocations` - Sets is_voided=true
- `investor_positions` - Reverses position changes

**Transaction Boundary:** Single atomic transaction

**Idempotency:** Already voided distributions are skipped

---

## Deposit Mutations

### 4. `createDeposit` (Service)

**Type:** Service Layer → Direct Insert

**Location:** `src/services/investor/depositService.ts`

**Tables Modified:**
- `deposits` - Creates deposit record
- `transactions_v2` - Creates deposit transaction
- `investor_positions` - Updates via trigger or RPC

**Transaction Boundary:** Multi-statement (not atomic by default)

**Idempotency:** 
- `reference_id` should be set to prevent duplicates
- Currently relies on UI preventing double-submit

**Improvement Needed:** Wrap in single RPC for atomicity

---

### 5. `approveDeposit`

**Type:** Service Layer → Update + Insert

**Location:** `src/services/investor/depositService.ts`

**Tables Modified:**
- `deposits` - Updates status
- `transactions_v2` - Creates confirmed transaction
- `investor_positions` - Updates current_value

**Transaction Boundary:** Should be atomic RPC

---

## Withdrawal Mutations

### 6. `createWithdrawalRequest`

**Type:** Service Layer → Direct Insert

**Location:** `src/services/investor/withdrawalService.ts` (or admin)

**Tables Modified:**
- `withdrawal_requests` - Creates request record

**Transaction Boundary:** Single insert (atomic)

**Idempotency:** No explicit mechanism; UI prevents duplicates

---

### 7. `approveWithdrawal`

**Type:** Service Layer → Multi-table Update

**Tables Modified:**
- `withdrawal_requests` - Updates status, approved_amount, approved_at
- `transactions_v2` - Creates withdrawal transaction
- `investor_positions` - Reduces current_value
- `fund_daily_aum` - Should update (verify)

**Transaction Boundary:** Should be atomic RPC

**Critical:** Must update positions atomically with transaction creation

---

### 8. `processWithdrawal` (Complete)

**Type:** Service Layer → Update

**Tables Modified:**
- `withdrawal_requests` - Updates status to 'completed', processed_at
- `transactions_v2` - Updates transaction as settled

**Transaction Boundary:** Multi-statement

---

## IB Management Mutations

### 9. `assignIBParent`

**Type:** Service Layer → Profile Update

**Location:** `src/services/admin/ibService.ts` (or similar)

**Tables Modified:**
- `profiles` - Updates ib_parent_id, ib_percentage

**Transaction Boundary:** Single update (atomic)

**Side Effects:**
- Future yield distributions will create IB allocations
- Historical allocations unchanged

---

### 10. `reassignIBParent`

**Type:** Service Layer → Profile Update

**Tables Modified:**
- `profiles` - Updates ib_parent_id
- `audit_log` - Should log the change

**Important:** Does NOT retroactively change allocations

---

## Fee Management Mutations

### 11. `setInvestorFeePercentage`

**Type:** Service Layer → Profile Update

**Tables Modified:**
- `profiles` - Updates fee_percentage
- `investor_fee_schedule` - Creates schedule record

**Transaction Boundary:** Should be atomic

---

### 12. `applyManualFee`

**Type:** Service Layer → Transaction Insert

**Tables Modified:**
- `transactions_v2` - Creates fee transaction
- `investor_positions` - Reduces current_value

**Transaction Boundary:** Should be atomic RPC

---

## Position Management Mutations

### 13. `adjustInvestorPosition`

**Type:** RPC (PostgreSQL Function)

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `p_investor_id` | UUID | Target investor |
| `p_fund_id` | UUID | Target fund |
| `p_amount` | NUMERIC | Adjustment amount (+/-) |
| `p_reason` | TEXT | Adjustment reason |
| `p_admin_id` | UUID | Admin performing action |

**Tables Modified:**
- `balance_adjustments` - Creates audit record
- `transactions_v2` - Creates adjustment transaction
- `investor_positions` - Updates current_value

**Transaction Boundary:** Single atomic transaction

**Idempotency:** None (intentionally allows multiple adjustments)

---

### 14. `resetAllPositions`

**Type:** RPC (PostgreSQL Function)

**Parameters:**
| Parameter | Type | Description |
|-----------|------|-------------|
| `p_confirmation_code` | TEXT | Safety code |
| `p_admin_id` | UUID | Admin performing action |

**Tables Modified:**
- `investor_positions_archive` - Archives current positions
- `transactions_v2_archive` - Archives transactions
- `investor_positions` - Deletes all
- `transactions_v2` - Deletes all
- `position_reset_log` - Creates audit entry

**Transaction Boundary:** Single atomic transaction

**DANGER:** Destructive operation for test/reset scenarios only

---

## Statement Mutations

### 15. `generateStatement`

**Type:** Service Layer → Insert

**Location:** `src/services/statements/statementService.ts`

**Tables Modified:**
- `generated_statements` - Creates statement record
- `fund_period_snapshot` - Creates if missing
- `investor_period_snapshot` - Creates if missing

**Transaction Boundary:** Should be atomic

---

### 16. `lockStatementPeriod`

**Type:** Service Layer → Update

**Tables Modified:**
- `statement_periods` - Sets is_closed=true
- `fund_period_snapshot` - Sets is_locked=true

**Transaction Boundary:** Should be atomic

---

## Audit and Logging

### 17. `createAuditLogEntry`

**Type:** Trigger / Service

**Tables Modified:**
- `audit_log` - Insert only, never update/delete

**Triggered By:**
- All financial mutations (should be)
- Profile changes
- Yield distributions

---

## Edge Functions

### 18. `process-webhooks`

**Location:** `supabase/functions/process-webhooks/index.ts`

**Handles:**
- Stripe payment confirmations
- External deposit confirmations
- DocuSign completion

**Tables Modified (varies by webhook type):**
- `deposits` - Status updates
- `transactions_v2` - New records
- `webhook_logs` - Audit trail

---

## Cache Invalidation Requirements

After each mutation, these query keys must be invalidated:

| Mutation | Query Keys to Invalidate |
|----------|-------------------------|
| `apply_daily_yield` | `funds`, `investor-positions`, `transactions`, `ib-allocations`, `fee-allocations`, `dashboard-stats` |
| `approveWithdrawal` | `withdrawals`, `investor-positions`, `transactions`, `fund-aum` |
| `createDeposit` | `deposits`, `investor-positions`, `transactions` |
| `assignIBParent` | `investors`, `ib-referrals`, `ib-overview` |
| `generateStatement` | `statements`, `period-snapshots` |

---

## Missing RPC Candidates

These operations should be consolidated into atomic RPCs:

1. **`approve_deposit_atomic`** - Deposit approval + transaction + position update
2. **`approve_withdrawal_atomic`** - Withdrawal approval + transaction + position update
3. **`reassign_ib_with_audit`** - IB change + audit log entry
4. **`generate_period_snapshot`** - Snapshot creation with locking

---

## Verification Checklist

For each mutation, verify:
- [ ] Transaction boundary is atomic (single RPC)
- [ ] Idempotency mechanism exists (reference_id or similar)
- [ ] Audit log entry created
- [ ] Position updates happen atomically with transactions
- [ ] Cache invalidation triggers correct query keys
- [ ] Error handling rolls back partial state
