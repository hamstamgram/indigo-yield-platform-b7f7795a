# Flow Matrix

> Generated: 2025-12-26
> Status: All flows documented and verified

## Overview

This document provides a summary of all operational flows in the platform with links to detailed documentation.

---

## Flow Documentation Index

| Flow | Document | Status | Last Verified |
|------|----------|--------|---------------|
| Deposits | [DEPOSIT_FLOW.md](flows/DEPOSIT_FLOW.md) | ✅ Complete | 2025-12-26 |
| Withdrawals | [WITHDRAWAL_FLOW.md](flows/WITHDRAWAL_FLOW.md) | ✅ Complete | 2025-12-26 |
| Yield Distribution | [YIELD_FLOW.md](flows/YIELD_FLOW.md) | ✅ Complete | 2025-12-26 |
| IB Management | [IB_FLOW.md](flows/IB_FLOW.md) | ✅ Complete | 2025-12-26 |
| Statements | [STATEMENT_FLOW.md](flows/STATEMENT_FLOW.md) | ✅ Complete | 2025-12-26 |
| Admin Roles | [ADMIN_ROLES_FLOW.md](flows/ADMIN_ROLES_FLOW.md) | ✅ Complete | 2025-12-26 |

---

## Operation Status Matrix

### Financial Operations

| Operation | RPC | Atomic | Idempotent | Invariants | Status |
|-----------|-----|--------|------------|------------|--------|
| Create Deposit | `admin_create_transaction` | ✅ | ✅ reference_id | Position = Ledger | ✅ PASS |
| Approve Deposit | Direct update | ⚠️ | ✅ deposit.id | - | ✅ PASS |
| Create Withdrawal | Direct insert | ✅ | ✅ request.id | Balance check | ✅ PASS |
| Approve Withdrawal | `update_withdrawal_status` | ✅ | ✅ request.id | State machine | ✅ PASS |
| Reject Withdrawal | `update_withdrawal_status` | ✅ | ✅ request.id | State machine | ✅ PASS |
| Complete Withdrawal | `update_withdrawal_status` | ✅ | ✅ request.id | Position = Ledger | ✅ PASS |
| Cancel Withdrawal | `cancel_withdrawal_by_admin` | ✅ | ✅ request.id | State machine | ✅ PASS |
| Delete Withdrawal | `delete_withdrawal` | ✅ | ✅ request.id | - | ✅ PASS |
| Preview Yield | `preview_daily_yield_to_fund_v2` | ✅ | ✅ (read-only) | - | ✅ PASS |
| Apply Yield | `apply_daily_yield_to_fund_v2` | ✅ | ✅ reference_id | Conservation | ✅ PASS |
| Void Yield | `void_yield_distribution` | ✅ | ✅ distribution.id | - | ✅ PASS |

### IB Operations

| Operation | Method | Atomic | Idempotent | Side Effects | Status |
|-----------|--------|--------|------------|--------------|--------|
| Assign IB Parent | Profile update | ✅ | ✅ investor.id | Future allocations | ✅ PASS |
| Reassign IB | Profile update | ✅ | ✅ investor.id | Future allocations | ✅ PASS |
| Remove IB Parent | Profile update | ✅ | ✅ investor.id | Future allocations | ✅ PASS |
| Mark Payout Paid | Allocation update | ✅ | ✅ allocation.id | - | ✅ PASS |
| Batch Payout | Multi-update | ⚠️ | ✅ batch.id | - | ✅ PASS |

### Statement Operations

| Operation | Method | Atomic | Idempotent | Dependencies | Status |
|-----------|--------|--------|------------|--------------|--------|
| Generate Statement | Insert | ✅ | ✅ investor+period | Period closed | ✅ PASS |
| Send Statement Email | Edge function | ✅ | ✅ delivery.id | Statement exists | ✅ PASS |
| Track Delivery | Webhook update | ✅ | ✅ message_id | - | ✅ PASS |
| Lock Period | Update | ✅ | ✅ period.id | All statements sent | ✅ PASS |

### Admin Operations

| Operation | Method | Atomic | Idempotent | Restrictions | Status |
|-----------|--------|--------|------------|--------------|--------|
| Assign Role | Insert | ✅ | ✅ user+role | Super admin only | ✅ PASS |
| Remove Role | Delete | ✅ | ✅ user+role | Super admin only | ✅ PASS |
| Create Invite | Insert | ✅ | ✅ invite_code | Admin only | ✅ PASS |
| Use Invite | Update + insert | ✅ | ✅ invite_code | Valid + unused | ✅ PASS |
| Create Fund | Insert | ✅ | ✅ fund.id | Admin only | ✅ PASS |
| Update Fund | Update | ✅ | ✅ fund.id | Admin only | ✅ PASS |
| Deactivate Fund | Update status | ✅ | ✅ fund.id | No active positions | ✅ PASS |

---

## Invariant Verification Matrix

| Invariant | Verification View | Tolerance | Checked After |
|-----------|-------------------|-----------|---------------|
| Fund AUM = Sum(Positions) | `fund_aum_mismatch` | 0.0001 | Yield, Deposit, Withdrawal |
| Position = Sum(Ledger) | `investor_position_ledger_mismatch` | 0.0001 | All financial ops |
| Yield Conservation | `yield_distribution_conservation_check` | 0.01 | Yield apply |
| IB Allocation Valid | `v_ib_allocation_orphans` | 0 | Yield apply |
| No Orphan Periods | `v_period_orphans` | 0 | Statement generation |
| No Orphan Transactions | `v_transaction_distribution_orphans` | 0 | Yield apply |

---

## Cache Invalidation Matrix

| Operation | Query Keys Invalidated |
|-----------|----------------------|
| Deposit Create | `deposits`, `transactions`, `investor-positions`, `fund-aum` |
| Withdrawal Complete | `withdrawals`, `transactions`, `investor-positions`, `fund-aum` |
| Yield Apply | `yield-distributions`, `transactions`, `investor-positions`, `fund-aum`, `fee-allocations`, `ib-allocations` |
| IB Assign/Reassign | `investors`, `ib-referrals`, `ib-overview` |
| Statement Generate | `statements`, `period-snapshots` |
| Statement Deliver | `email-delivery`, `statements` |
| Role Change | `admin-users`, `user-roles` |
| Fund Update | `funds`, `fund-aum` |

---

## Error Recovery Matrix

| Error | Detection | Recovery | Prevention |
|-------|-----------|----------|------------|
| Position != Ledger | Integrity view | `adjustInvestorPosition` RPC | Atomic RPCs |
| AUM != Positions | Integrity view | `correction_runs` system | Atomic RPCs |
| Orphan Transactions | Integrity view | Void and re-apply | Distribution ID tracking |
| Orphan IB Allocations | Integrity view | Manual review | IB validation at apply |
| Duplicate Transactions | Unique constraint | Idempotent retry | reference_id uniqueness |
| Invalid State Transition | RPC validation | Manual status fix | State machine in RPC |

---

## Testing Checklist

### Pre-Deployment

- [ ] Run `scripts/db-smoke-test.sh`
- [ ] Verify all integrity views return 0 rows
- [ ] Test deposit → yield → withdrawal flow
- [ ] Test IB assignment and allocation
- [ ] Test statement generation and delivery
- [ ] Verify admin role restrictions

### Post-Deployment

- [ ] Check integrity dashboard for violations
- [ ] Verify audit logs are being created
- [ ] Confirm email delivery tracking works
- [ ] Test investor portal access
- [ ] Test IB portal access
- [ ] Verify admin dashboard loads

---

## Quick Reference

### Critical Files

| Purpose | File |
|---------|------|
| Invariants | `docs/invariants.md` |
| Data Model | `docs/DATA_MODEL.md` |
| Mutations | `docs/mutation-inventory.md` |
| Security | `docs/SECURITY_REVIEW.md` |
| Migration Safety | `docs/MIGRATION_HYGIENE.md` |

### Critical RPCs

| Purpose | Function |
|---------|----------|
| Apply Yield | `apply_daily_yield_to_fund_v2` |
| Preview Yield | `preview_daily_yield_to_fund_v2` |
| Create Transaction | `admin_create_transaction` |
| Withdrawal Status | `update_withdrawal_status` |
| Cancel Withdrawal | `cancel_withdrawal_by_admin` |

### Critical Views

| Purpose | View |
|---------|------|
| AUM Check | `fund_aum_mismatch` |
| Position Check | `investor_position_ledger_mismatch` |
| Yield Check | `yield_distribution_conservation_check` |
| Investor KPIs | `v_investor_kpis` |

---

## Crystallization Architecture (P0 - 2026-01-16)

### Overview

The platform enforces "crystallize yield before every transaction" to ensure accurate position tracking. This means:
1. Every balance-changing transaction must go through the canonical RPC
2. Yield is crystallized (calculated and applied) before any deposit/withdrawal/adjustment
3. Direct inserts to `transactions_v2` are blocked by trigger

### Canonical Transaction Flow

```
┌─────────────────────────────────────────────────────────────────┐
│                    TRANSACTION REQUEST                           │
│         (Deposit/Withdrawal/Fee/Adjustment)                      │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│           apply_transaction_with_crystallization()               │
│  - Validate tx_type, amount, reference_id                        │
│  - Acquire advisory lock on (investor_id, fund_id)               │
│  - Check idempotency (reference_id already exists?)              │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│              IS CRYSTALLIZATION NEEDED?                          │
│  - For DEPOSIT/WITHDRAWAL/ADJUSTMENT: YES                        │
│  - Check: last_yield_crystallization_date < tx_date?             │
└─────────────────────────────────────────────────────────────────┘
                    │                       │
                   YES                      NO
                    ▼                       │
┌─────────────────────────────────────┐    │
│    crystallize_yield_before_flow()  │    │
│  - Get current AUM                  │    │
│  - Calculate yield for period       │    │
│  - Distribute to all positions      │    │
│  - Update last_crystal_date         │    │
└─────────────────────────────────────┘    │
                    │                       │
                    └───────────┬───────────┘
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                   APPLY TRANSACTION                              │
│  - Insert into transactions_v2                                   │
│  - Update investor_positions.current_value                       │
│  - Update investor_positions.last_transaction_date               │
│  - Update investor_positions.last_yield_crystallization_date     │
└─────────────────────────────────────────────────────────────────┘
                               │
                               ▼
┌─────────────────────────────────────────────────────────────────┐
│                    RETURN RESULT                                 │
│  { success, tx_id, crystallized_yield_amount, balance_after }    │
└─────────────────────────────────────────────────────────────────┘
```

### Crystallization RPCs

| Function | Purpose | Security |
|----------|---------|----------|
| `apply_transaction_with_crystallization` | **CANONICAL RPC** - All transactions must use this | DEFINER |
| `crystallize_yield_before_flow` | Core crystallization logic | DEFINER |
| `batch_crystallize_fund` | Bulk crystallize all stale positions | DEFINER |
| `is_crystallization_current` | Check if position needs crystallization | DEFINER |
| `preview_crystallization` | Preview what crystallization would do | DEFINER |

### Bypass Protection

| Layer | Mechanism | Effect |
|-------|-----------|--------|
| Trigger | `trg_enforce_transaction_via_rpc` | Blocks direct INSERTs with invalid source |
| Privilege | REVOKE INSERT on transactions_v2 | Prevents client-side inserts |
| Audit | `transaction_bypass_attempts` table | Logs blocked attempts |
| Index | `transactions_v2_reference_id_unique` | Enforces idempotency |

### Integrity Views

| View | Purpose | Expected |
|------|---------|----------|
| `v_crystallization_gaps` | Positions needing crystallization | 0 rows after batch_crystallize |
| `v_crystallization_dashboard` | Per-fund crystallization summary | Monitor |
| `v_transaction_sources` | Transaction source audit | All should be approved sources |
| `check_transaction_sources()` | RPC to check sources | All should be OK |

### Average Daily Balance (ADB) Yield Allocation

For fair yield distribution to mid-month deposits:

| Function | Purpose |
|----------|---------|
| `calc_avg_daily_balance` | Calculate time-weighted balance over period |
| `preview_adb_yield` | Preview ADB-based yield allocation |
| `apply_adb_yield_distribution` | Apply ADB-based yield with transactions |

### Invariants

| Invariant | Verification | Action if Violated |
|-----------|--------------|-------------------|
| Position = Ledger Sum | `v_ledger_reconciliation` | `recompute_investor_position` |
| Yield Conservation | `v_yield_conservation_check` | Void and reapply |
| No Stale Crystal | `v_crystallization_gaps` (stale) | Run `batch_crystallize_fund` |
| All Tx via RPC | `v_transaction_sources` | Investigate bypass |
