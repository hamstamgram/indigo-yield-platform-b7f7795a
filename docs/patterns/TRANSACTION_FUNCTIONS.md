# Transaction Functions Architecture

> **Last Updated**: P2-03 cleanup (January 2026)

## Overview

This document describes the canonical transaction-related RPC functions in the platform.
All transaction mutations MUST go through these RPCs - direct table writes are forbidden.

## Canonical Mutation RPCs

### Transaction Creation

| Function | Use Case | Idempotency |
|----------|----------|-------------|
| `admin_create_transaction` | Single transaction creation | `reference_id` constraint |
| `admin_create_transactions_batch` | Bulk import/batch processing | `reference_id` per transaction |
| `apply_deposit_with_crystallization` | Deposits with yield crystallization | `reference_id` constraint |
| `apply_withdrawal_with_crystallization` | Withdrawals with yield crystallization | `reference_id` constraint |

### Transaction Modification

| Function | Use Case | Constraints |
|----------|----------|-------------|
| `edit_transaction` | Metadata-only edits (notes, visibility) | Non-financial fields only |
| `update_transaction` | Edits with full audit trail | Non-financial fields only |
| `void_and_reissue_transaction` | Correct financial errors | Creates new corrected transaction |

### Transaction Voiding

| Function | Use Case | Authorization |
|----------|----------|---------------|
| `void_transaction` | Standard void with audit | Admin role |
| `void_transaction_with_approval` | Void requiring dual approval | Admin + approval |

### Transaction Deletion

| Function | Use Case | Authorization |
|----------|----------|---------------|
| `delete_transaction` | Permanently delete voided transaction | Super admin only |

## Transaction Lifecycle

```
┌──────────────┐     ┌──────────────┐     ┌──────────────┐
│   CREATED    │────▶│    VOIDED    │────▶│   DELETED    │
│  is_voided=  │     │  is_voided=  │     │  (removed)   │
│    false     │     │    true      │     │              │
└──────────────┘     └──────────────┘     └──────────────┘
       │                    │
       │                    │ void_and_reissue
       │                    ▼
       │             ┌──────────────┐
       │             │ NEW TX       │
       │             │ (corrected)  │
       └─────────────┴──────────────┘
```

## Edit vs Update vs Void

| Operation | Allowed Changes | Use When |
|-----------|-----------------|----------|
| `edit_transaction` | notes, visibility_scope, source | Quick metadata fix |
| `update_transaction` | Same as edit + audit metadata | Need audit trail for change |
| `void_and_reissue_transaction` | Any field (creates new tx) | Financial correction needed |

**Rule**: Never edit financial fields (amount, date, type). Use void_and_reissue instead.

## Position Recompute Integration

All transaction mutations trigger automatic position recompute via database trigger:

```sql
-- Trigger on transactions_v2
CREATE TRIGGER trg_recompute_position_after_transaction
AFTER INSERT OR UPDATE OR DELETE ON transactions_v2
FOR EACH ROW EXECUTE FUNCTION recompute_investor_position();
```

This ensures `Position = Sum(Ledger WHERE is_voided=false)` invariant is always maintained.

## Idempotency Pattern

All transaction creation RPCs use `reference_id` for idempotency:

```typescript
// Frontend generates unique reference
const referenceId = `manual_${investorId}_${fundId}_${Date.now()}`;

// RPC call
const result = await rpc.call("admin_create_transaction", {
  p_investor_id: investorId,
  p_fund_id: fundId,
  p_amount: amount,
  p_type: "DEPOSIT",
  p_reference_id: referenceId,  // Idempotency key
});
```

Duplicate calls with the same `reference_id` will fail with a unique constraint violation,
preventing double-processing of the same transaction.

## Impact Preview

Before voiding, always preview the impact:

```typescript
const { data: impact } = await rpc.call("get_void_transaction_impact", {
  p_transaction_id: transactionId,
});

// impact contains:
// - current_position: number
// - projected_position: number
// - aum_impact: number
// - warnings: string[]
```

## Removed Functions

The following deprecated functions were removed in P2-03:

| Function | Reason |
|----------|--------|
| `handle_ledger_transaction` | Deprecated, raised exception on call |

## Related Documentation

- [rpcSignatures.ts](../../src/contracts/rpcSignatures.ts) - RPC contract definitions
- [DEPOSIT_FLOW.md](../flows/DEPOSIT_FLOW.md) - Deposit flow details
- [WITHDRAWAL_FLOW.md](../flows/WITHDRAWAL_FLOW.md) - Withdrawal flow details
