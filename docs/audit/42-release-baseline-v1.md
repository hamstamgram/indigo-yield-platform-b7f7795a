# Indigo Yield Platform - Release Baseline v1.0

**Release Date:** 2026-04-14  
**Status:** PRODUCTION  
**Validation:** Full contract, flow, type, and schema audit completed

---

## A. Stable Release Baseline

### Active Canonical Backend Surfaces

| RPC | Purpose | Validation |
|-----|---------|------------|
| `apply_transaction_with_crystallization` | Deposit/withdrawal/position adjustment | Tested |
| `apply_segmented_yield_distribution_v5` | Monthly yield application | Tested (note: missing period_start/period_end) |
| `void_transaction` | Transaction reversal with cascade | Tested - schema fix applied |
| `unvoid_transaction` | Transaction restoration | Tested |
| `void_yield_distribution` | Yield reversal with cascade | Tested (note: returns voided_transactions not voided_count) |
| `create_withdrawal_request` | Investor withdrawal request | Tested |
| `approve_withdrawal` | Admin approval | Tested |
| `approve_and_complete_withdrawal` | Admin completion | Tested |
| `cancel_withdrawal_by_admin_v2` | Admin cancellation | Tested |
| `cancel_withdrawal_by_investor` | Investor self-cancellation | Tested |
| `check_aum_reconciliation` | AUM integrity check | Tested |

### Protected Tables (RPC-Only Mutations)

- `transactions_v2` - Insert via `apply_transaction_with_crystallization` only
- `yield_distributions` - Insert via `apply_segmented_yield_distribution_v5` only
- `fee_allocations` - Insert by yield RPC, void by `void_yield_distribution`
- `ib_allocations` - Insert by yield RPC, void by `void_yield_distribution`
- `investor_positions` - Recomputed via RPC, NOT directly mutated

### Active Canonical Frontend Flows

| Flow | Service | Validation |
|------|---------|------------|
| Investor Dashboard | `investorPortfolioSummaryService` | Tested |
| Deposit | `depositService.createDeposit()` | Tested |
| Withdrawal Request | `withdrawalService.createWithdrawalRequest()` | Tested |
| Yield Preview | `yieldPreviewService` | Tested |
| Yield Apply | `yieldApplyService.applyYieldDistribution()` | Tested |
| Transaction Void | `adminTransactionHistoryService.voidTransaction()` | Tested |
| AUM Reconciliation | `aumReconciliationService` | Tested |

### Critical Invariants

| Invariant | Verification | Enforcement |
|------------|--------------|-------------|
| Σ positions = fund_daily_aum | `check_aum_reconciliation` | Trigger after any transaction |
| transactions_v2 append-only | No UPDATE, void via is_voided columns | Migration + RPC audit |
| fee_allocations has no updated_at | Schema verified 2026-04-14 | Migration fixed |
| yield_distributions has no updated_at | Schema verified | Migration fixed |
| Withdrawal status enum: PENDING/APPROVED/PROCESSING/COMPLETED/CANCELLED/REJECTED | Type audit | Enum validation |

---

## B. Protected Boundaries

### Frontend → Backend Contract

| Boundary | Protection |
|----------|------------|
| RPC parameter names | Fixed via `rpcSignatures.ts` - regenerated before deploy |
| Table column assumptions | Verified against live schema before deploy |
| Enum values | Must match `dbEnums.ts` definitions |
| Response shape | Must match contract (notable: yield response missing period_start/period_end) |

### Data Mutation Boundaries

| Table | Allowed Mutation |
|-------|------------------|
| transactions_v2 | INSERT only (via RPC), void via is_voided columns only |
| yield_distributions | INSERT only (via RPC), void via is_voided column only |
| fee_allocations | INSERT by yield RPC, void via is_voided column only |
| fund_daily_aum | Upsert via triggers, explicit via `recalculate_fund_aum_for_date` |
| investor_positions | Recompute only via `recompute_investor_position` |

### RLS Policy Boundaries

| Table | Policy |
|-------|--------|
| profiles | Owner read, admin full |
| funds | Public read, admin write |
| investor_positions | Owner read, admin full |
| transactions_v2 | Owner read, admin write |
| withdrawal_requests | Owner read, admin write |

---

## C. Deprecated Surfaces

### Removed/Forbidden Functions

| Function | Status | Replacement |
|----------|--------|-------------|
| `unvoid_yield_distribution` | Removed from DB | N/A (yield void only) |
| `update_yield_aum` | Removed | fund_daily_aum triggers |
| Direct `.insert()` on transactions_v2 | Forbidden | `apply_transaction_with_crystallization` |
| Direct `.update()` on transactions_v2 | Forbidden | `void_transaction` / `unvoid_transaction` |
| `updated_at` on fee_allocations | Does not exist | N/A (schema verified) |
| `updated_at` on transactions_v2 | Does not exist | N/A (append-only ledger) |

### Deprecated Frontend Patterns

| Pattern | Status | Replacement |
|---------|--------|-------------|
| `TransactionRecord` local type | Deprecated | Import from `types/domains/transaction.ts` |
| `TransactionRow` local type | Deprecated | Import from domain types |
| Manual position updates | Forbidden | Use `adjust_investor_position` RPC |

---

## D. Deferred Backlog

| Ticket | Description | Priority | Owner |
|-------|-------------|----------|-------|
| D-1 | Fix `void_yield_distribution` to return `voided_count` or update frontend to read `voided_transactions` | P0 | Backend |
| D-2 | Add `period_start`, `period_end` to yield distribution RPC response | P1 | Backend |
| D-3 | Run enum validation query against live DB to verify frontend matches | P1 | DevOps |
| D-4 | Consolidate duplicate Transaction types (remove local copies, import from domain) | P2 | Frontend |
| D-5 | Add runtime enum validation on app load | P3 | Frontend |
| D-6 | Document yield cascade failure scenarios | P3 | Backend |

---

## E. Release Watch Obligations

### First 72 Hours (Intensive)

| Signal | Check Frequency | Alert Threshold |
|--------|-----------------|-----------------|
| void_transaction errors | Continuous | > 0% |
| void_yield_distribution errors | Continuous | > 0% |
| apply_yield_distribution errors | Continuous | > 0% |
| AUM drift | Hourly | Any > 0.01 |
| Duplicate transactions | Hourly | Any |
| Negative positions | Hourly | Any |

### First Month (Standard)

| Signal | Check Frequency | Alert Threshold |
|--------|-----------------|-----------------|
| Statement delivery success | Daily | < 95% |
| Withdrawal stuck PENDING | Daily | > 5 for > 24h |
| Position-AUM drift | Daily | Any > 0.01 |
| RPC error rate | Weekly | > 1% |

### Ongoing (Maintenance)

| Signal | Check Frequency |
|--------|-----------------|
| Monthly yield applies | Per schedule |
| Quarterly statements | Per schedule |
| AUM reconciliation | Daily |

---

## F. Rollback Protocol (If Needed)

### Immediate Rollback Triggers
- T1: Financial data corruption (any amount wrong)
- T2: AUM drift > 1%
- T3: Duplicate transaction accepted
- T4: Negative balance created

### Rollback Command
```bash
# Point to pre-release database snapshot
supabase db reset --db-url [pre-release-snapshot-url]
```

### Post-Rollback Actions
1. Notify stakeholders
2. Document incident
3. Re-run validation before re-deploy
4. Fix root cause

---

## G. Sign-off

| Role | Name | Date |
|------|------|------|
| Backend Lead | [TBD] | 2026-04-14 |
| Frontend Lead | [TBD] | 2026-04-14 |
| DevOps | [TBD] | 2026-04-14 |
| Product | [TBD] | 2026-04-14 |

**Baseline Version:** 1.0  
**Next Review:** 2026-05-14 (30-day post-release)