# RPC Signatures Reference

> **Last Updated**: 2026-01-19  
> **Purpose**: Canonical reference for all RPC function signatures to prevent parameter mismatches

## Overview

This document defines the canonical parameter order and names for all RPC functions. All frontend code **MUST** match these signatures exactly.

---

## Void Operations

All void operations follow a consistent pattern: **entity_id → admin_id → reason**

| Function | Signature |
|----------|-----------|
| `void_transaction` | `(p_transaction_id, p_admin_id, p_reason)` |
| `void_yield_distribution` | `(p_distribution_id, p_admin_id, p_reason)` |
| `void_fund_daily_aum` | `(p_record_id, p_reason, p_admin_id)` |
| `void_and_reissue_transaction` | `(p_original_transaction_id, p_corrected_amount, p_corrected_date, p_admin_id, p_reason)` |

### ⚠️ Common Mistakes

```typescript
// ❌ WRONG - p_void_reason doesn't exist
rpc.call("void_transaction", {
  p_transaction_id: id,
  p_void_reason: reason,  // WRONG NAME
  p_admin_id: adminId,
});

// ❌ WRONG - wrong parameter order in object (TypeScript won't catch this)
rpc.call("void_transaction", {
  p_transaction_id: id,
  p_reason: reason,
  p_admin_id: adminId,  // OK but order should match canonical
});

// ✅ CORRECT
rpc.call("void_transaction", {
  p_transaction_id: id,
  p_admin_id: adminId,
  p_reason: reason,
});
```

---

## Deposit/Withdrawal Operations

### apply_deposit_with_crystallization

```typescript
rpc.call("apply_deposit_with_crystallization", {
  p_investor_id: string,      // Required
  p_fund_id: string,          // Required
  p_amount: number,           // Required
  p_closing_aum: number,      // Required - NOT p_new_total_aum
  p_effective_date: string,   // Required - NOT p_tx_date
  p_notes: string | null,     // Optional
  p_admin_id: string,         // Required
});
```

### apply_withdrawal_with_crystallization

```typescript
rpc.call("apply_withdrawal_with_crystallization", {
  p_investor_id: string,      // Required
  p_fund_id: string,          // Required
  p_amount: number,           // Required
  p_new_total_aum: number,    // Required - NOT p_closing_aum
  p_tx_date: string,          // Required - NOT p_effective_date
  p_notes: string | null,     // Optional
  p_admin_id: string,         // Required
});
```

### ⚠️ Deposit vs Withdrawal Parameter Names

| Parameter | Deposit | Withdrawal |
|-----------|---------|------------|
| AUM | `p_closing_aum` | `p_new_total_aum` |
| Date | `p_effective_date` | `p_tx_date` |

---

## Yield Operations

### apply_daily_yield_to_fund_v3

```typescript
rpc.call("apply_daily_yield_to_fund_v3", {
  p_fund_id: string,
  p_yield_date: string,
  p_gross_yield_amount: number,
  p_admin_id: string,
  p_notes: string | null,
});
```

### preview_daily_yield_to_fund_v3

```typescript
rpc.call("preview_daily_yield_to_fund_v3", {
  p_fund_id: string,
  p_yield_date: string,
  p_gross_yield_amount: number,
});
```

---

## Transaction Operations

### admin_create_transaction

```typescript
rpc.call("admin_create_transaction", {
  p_investor_id: string,
  p_fund_id: string,
  p_tx_type: string,
  p_amount: number,
  p_tx_date: string,
  p_notes: string | null,
  p_reference_id: string | null,  // For idempotency
});
```

### edit_transaction

```typescript
rpc.call("edit_transaction", {
  p_transaction_id: string,
  p_new_notes: string | null,
  p_new_tx_date: string | null,
  p_admin_id: string,
  p_reason: string,
});
```

### update_transaction

```typescript
rpc.call("update_transaction", {
  p_transaction_id: string,
  p_updates: Json,  // Object with fields to update
  p_admin_id: string,
  p_reason: string,
});
```

### delete_transaction

```typescript
rpc.call("delete_transaction", {
  p_transaction_id: string,
  p_admin_id: string,
  p_reason: string,
});
```

---

## Query/Preview Operations

### get_void_transaction_impact

```typescript
rpc.call("get_void_transaction_impact", {
  p_transaction_id: string,
});

// Returns:
{
  transaction_id: string,
  investor_name: string,
  fund_name: string,
  tx_type: string,
  amount: number,
  current_position: number,
  projected_position: number,
  position_change: number,
  affected_aum_count: number,
  affected_yield_count: number,
  would_go_negative: boolean,
}
```

### get_fund_aum_as_of

```typescript
rpc.call("get_fund_aum_as_of", {
  p_fund_id: string,
  p_as_of_date: string,
  p_purpose: string,  // 'TRADING' | 'REPORTING'
});
```

---

## Admin/Auth Operations

### is_admin / is_super_admin

```typescript
// No parameters
rpc.call("is_admin", {});
rpc.call("is_super_admin", {});
```

### get_user_role

```typescript
rpc.call("get_user_role", {
  p_user_id: string,
});
```

---

## Validation Scripts

To verify RPC signatures are correct:

```bash
# Full audit with TypeScript
npx ts-node scripts/audit-rpc-signatures.ts

# Quick pre-deploy check
./scripts/pre-deploy-rpc-check.sh

# As part of full platform audit
./scripts/run-full-audit.sh
```

---

## Adding New RPCs

When adding a new RPC:

1. Add the signature to `scripts/audit-rpc-signatures.ts` in `CANONICAL_SIGNATURES`
2. Add documentation to this file
3. Ensure `src/integrations/supabase/types.ts` is regenerated
4. Run the audit script to verify all calls match

---

## Changelog

| Date | Change |
|------|--------|
| 2026-01-19 | Fixed `void_transaction` and `void_yield_distribution` parameter order |
| 2026-01-19 | Created initial documentation |
