

# Core Bug Fixes: Frontend-Backend Integration Audit

## Executive Summary

This plan addresses **5 core issues** that cause systemic problems across the platform. Rather than fixing symptoms, we're addressing root causes that violate the established architecture patterns documented in `docs/DUPLICATE_PREVENTION_GOVERNANCE.md`.

---

## Issue 1: RPC Gateway Bypass in `yieldManagementService.ts`

### Problem
The `getYieldVoidImpact` function bypasses the centralized RPC gateway (`src/lib/rpc.ts`) with `as never` casting:

```typescript
const { data, error } = await supabase.rpc("get_void_aum_impact" as never, {
  p_record_id: recordId,
} as never);
```

### Root Cause
The comment states "get_void_aum_impact may not be in generated types yet" but the function IS present in `src/integrations/supabase/types.ts` at line 11446.

### Fix
1. Remove the `as never` casts
2. Use the `rpc.call()` gateway for consistent error handling, logging, and rate limiting

```typescript
// Before
const { data, error } = await supabase.rpc("get_void_aum_impact" as never, {
  p_record_id: recordId,
} as never);

// After
import { rpc } from "@/lib/rpc";

const { data, error } = await rpc.call("get_void_aum_impact", {
  p_record_id: recordId,
});
```

### Files to Modify
- `src/services/admin/yieldManagementService.ts` (lines 300-302)

---

## Issue 2: Edge Function Auth Regex Bug

### Problem
In `supabase/functions/process-withdrawal/index.ts`, the auth header parsing uses a double backslash that prevents correct token extraction:

```typescript
// Line 278 - BROKEN
const token = authHeader.replace(/^Bearer\\s+/i, "").trim();
```

The regex `Bearer\\s+` is looking for a literal backslash followed by "s+" instead of whitespace (`\s+`).

### Root Cause
This is the ONLY edge function (out of 23) using the regex pattern. All others use the simpler `"Bearer "` string replacement which works correctly.

### Fix
Align with the standard pattern used in all other edge functions:

```typescript
// Before
const token = authHeader.replace(/^Bearer\\s+/i, "").trim();

// After (matches 22 other edge functions)
const token = authHeader.replace("Bearer ", "").trim();
```

### Files to Modify
- `supabase/functions/process-withdrawal/index.ts` (line 278)

---

## Issue 3: Direct DB Write in Withdrawal Cancellation

### Problem
The `cancelWithdrawalRequest` function in `investorWithdrawalService.ts` performs a direct database update that bypasses:
- The `validate_withdrawal_transition` state machine guard
- Audit logging triggers
- The canonical `cancel_withdrawal_by_admin` RPC

```typescript
// Direct write - bypasses governance
const { error } = await supabase
  .from("withdrawal_requests")
  .update({
    status: "cancelled",
    cancellation_reason: reason || "Cancelled by investor",
    cancelled_at: new Date().toISOString(),
  })
  .eq("id", requestId)
  .eq("status", "pending");
```

### Root Cause
There are TWO cancellation paths:
1. `investorWithdrawalService.cancelWithdrawalRequest` - Direct DB write (for investors)
2. `withdrawalService.cancelWithdrawal` - Uses RPC (for admins)

The investor path bypasses all governance.

### Fix
Option A (Preferred): Create an investor-facing RPC `cancel_withdrawal_by_investor` that validates the user owns the request
Option B: Use the existing `cancel_withdrawal_by_admin` RPC with investor context validation

Since the existing RPC requires admin role (see types at line 10925-10927), we need to create a new RPC or modify the existing one.

**Recommended approach**: Update frontend to use an existing edge function or create a lightweight investor cancellation RPC.

### Files to Modify
- `src/services/investor/investorWithdrawalService.ts` (lines 108-120)
- Potentially create new RPC or edge function for investor-initiated cancellation

---

## Issue 4: Legacy Fallback with Wrong Parameter Names

### Problem
The `voidAndReissueTransaction` function has a fallback with incorrect parameter names:

```typescript
// Primary call - CORRECT
const { data, error } = await rpc.call("void_and_reissue_transaction", {
  p_original_tx_id: params.transactionId,  // ✓ Correct
  p_new_amount: ...,
  p_new_date: params.newValues.tx_date,    // ✓ Correct
  ...
});

// Fallback - WRONG parameter names
const legacy = await rpc.call("void_and_reissue_transaction" as any, {
  p_original_transaction_id: params.transactionId,  // ✗ Wrong
  p_new_tx_date: params.newValues.tx_date,          // ✗ Wrong (should be p_new_date)
  ...
});
```

### Root Cause
The database signature (from types.ts lines 12333-12343) is:
```
p_admin_id: string
p_closing_aum: number
p_new_amount: number
p_new_date: string
p_new_notes: string
p_original_tx_id: string
p_reason: string
```

The fallback uses non-existent parameters (`p_original_transaction_id`, `p_new_tx_date`).

### Fix
Remove the dead fallback code. If the primary call fails, it should fail clearly - not attempt a call with wrong parameters that will also fail.

```typescript
// Remove this entire fallback block (lines 255-271)
if (error) {
  // Fallback for legacy signatures...
  const legacy = await rpc.call("void_and_reissue_transaction" as any, {
    p_original_transaction_id: params.transactionId,  // DELETE THIS
    ...
  });
  ...
}
```

### Files to Modify
- `src/services/admin/adminTransactionHistoryService.ts` (lines 255-271)

---

## Issue 5: Failing RPCs in Production Log

### Problem
The `artifacts/rpc-run-log.json` shows three failing RPCs:
1. `apply_deposit_with_crystallization` - FAIL
2. `apply_deposit_with_crystallization_idempotency` - FAIL
3. `check_aum_reconciliation` - FAIL

### Root Cause Analysis Needed
These failures require database-side investigation:
1. Check if the RPCs exist and have correct signatures
2. Check if required parameters are missing or mistyped
3. Check if there are missing prerequisites (e.g., AUM records)

### Fix
1. Verify RPC signatures match between frontend (`src/lib/rpc.ts`) and database
2. The `check_aum_reconciliation` RPC exists in contracts but the failure suggests a runtime issue

### Files to Investigate
- `src/services/admin/aumReconciliationService.ts` (uses `check_aum_reconciliation`)
- Database function definitions (require SQL access)

---

## Issue 6: Parameter Inconsistency (`undefined` vs `null`)

### Problem
The `p_notes` parameter is passed as `undefined` in some services and `null` in others:

```typescript
// investorWithdrawalService.ts
p_notes: notes || undefined,  // Sends undefined

// Other services may send null
p_notes: notes || null,
```

### Root Cause
PostgreSQL and Supabase treat `undefined` and `null` differently in some cases. The generated types show `p_notes` as optional, but consistency is important.

### Fix
Standardize to `null` for database parameters (PostgreSQL convention):

```typescript
// Before
p_notes: notes || undefined,

// After
p_notes: notes ?? null,
```

### Files to Modify
- `src/services/investor/investorWithdrawalService.ts` (line 98)
- `src/services/investor/investorPortfolioService.ts` (line 154)

---

## Implementation Priority

| Priority | Issue | Risk Level | Effort |
|----------|-------|------------|--------|
| P0 | Issue 2: Edge Function Regex Bug | **Critical** - Auth failures | 5 min |
| P0 | Issue 1: RPC Gateway Bypass | High - Inconsistent error handling | 10 min |
| P1 | Issue 4: Dead Fallback Code | Medium - Masks real errors | 10 min |
| P1 | Issue 3: Direct DB Write | Medium - Bypasses audit trail | 30 min |
| P2 | Issue 6: Parameter Inconsistency | Low - Edge cases only | 5 min |
| P2 | Issue 5: Failing RPCs | Requires investigation | TBD |

---

## Technical Implementation Details

### Changes Summary

| File | Change Type | Lines Affected |
|------|-------------|----------------|
| `supabase/functions/process-withdrawal/index.ts` | Fix regex | Line 278 |
| `src/services/admin/yieldManagementService.ts` | Use RPC gateway | Lines 6, 297-309 |
| `src/services/admin/adminTransactionHistoryService.ts` | Remove dead code | Lines 255-271 |
| `src/services/investor/investorWithdrawalService.ts` | RPC migration + param fix | Lines 98, 108-120 |
| `src/services/investor/investorPortfolioService.ts` | Param consistency | Line 154 |

### Testing Approach

After fixes:
1. Test withdrawal flow end-to-end (login → request → cancel)
2. Test yield void impact preview
3. Test transaction void-and-reissue
4. Verify console logs show RPC gateway logging
5. Run `npm run test:vitest` for reconciliation tests

