# TypeScript RPC Migration Guide

## Overview
This guide documents the migration of all Supabase RPC function calls to use proper TypeScript return types, eliminating type erasure and improving type safety across the platform.

## Problem Statement
Previously, RPC calls like this lost type information:
```typescript
// ❌ BEFORE - Type erasure
const { data } = await supabase.rpc('create_withdrawal_request', {
  p_investor_id: investorId,
  p_fund_id: fundId,
  p_amount: amount
});
// data is typed as 'unknown'
```

## Solution
We've created typed RPC helpers and applied proper return types:
```typescript
// ✅ AFTER - Properly typed
const { data } = await supabase
  .rpc('create_withdrawal_request', {
    p_investor_id: investorId,
    p_fund_id: fundId,
    p_amount: amount
  })
  .returns<Database["public"]["Functions"]["create_withdrawal_request"]["Returns"]>();
// data is now typed as 'string' (the actual return type)
```

## New Files Created

### 1. `/src/integrations/supabase/rpc-helpers.ts`
Type-safe RPC wrapper utilities with convenience functions:

```typescript
// Usage Option 1: Helper function
import { callRpc } from "@/integrations/supabase/rpc-helpers";

const { data, error } = await callRpc("approve_withdrawal", {
  p_request_id: withdrawalId,
  p_approved_amount: amount
});
// data is automatically typed as boolean

// Usage Option 2: Throwing helper
import { callRpcOrThrow } from "@/integrations/supabase/rpc-helpers";

const data = await callRpcOrThrow("create_withdrawal_request", {
  p_investor_id: investorId,
  p_fund_id: fundId,
  p_amount: amount
});
// data is typed as string, throws on error
```

## Files Updated

### ✅ Completed
1. **src/services/auth/authService.ts**
   - `get_user_admin_status` - Returns: `boolean`

2. **src/services/investor/withdrawalService.ts**
   - `approve_withdrawal` - Returns: `boolean`
   - `reject_withdrawal` - Returns: `boolean`
   - `start_processing_withdrawal` - Returns: `boolean`
   - `complete_withdrawal` - Returns: `boolean`
   - `cancel_withdrawal_by_admin` - Returns: `boolean`
   - `create_withdrawal_request` - Returns: `string` (request ID)
   - `route_withdrawal_to_fees` - Returns: `boolean`
   - `update_withdrawal` - Returns: `boolean`
   - `delete_withdrawal` - Returns: `boolean`

3. **src/services/operations/snapshotService.ts**
   - `generate_fund_period_snapshot` - Returns: `string` (snapshot ID)
   - `lock_fund_period_snapshot` - Returns: `boolean`
   - `is_period_locked` - Returns: `boolean`
   - `get_period_ownership` - Returns: `Json` (ownership data array)
   - `unlock_fund_period_snapshot` - Returns: `boolean`

### 🔄 Needs Migration
The following files still need the same pattern applied:

#### Admin Services
- **src/services/admin/yieldCrystallizationService.ts**
  - `crystallize_yield_before_flow` - Returns: `Json`
  - `finalize_month_yield` - Returns: `Json`
  - `crystallize_month_end` - Returns: `Json`

- **src/services/admin/deliveryService.ts**
  - `get_delivery_stats` - Returns: `Json`
  - `queue_statement_deliveries` - Returns: `Json`
  - `retry_delivery` - Returns: `boolean`
  - `cancel_delivery` - Returns: `boolean`
  - `mark_sent_manually` - Returns: `boolean`
  - `requeue_stale_sending` - Returns: `Json`

- **src/services/admin/aumReconciliationService.ts**
  - `check_aum_reconciliation` - Returns: `Json`

- **src/services/admin/adminTransactionHistoryService.ts**
  - `update_transaction` - Returns: `boolean`
  - `void_transaction` - Returns: `boolean`

- **src/services/admin/systemAdminService.ts**
  - `update_admin_role` - Returns: `boolean`
  - `check_duplicate_transaction_refs` - Returns: `number`
  - `check_duplicate_ib_allocations` - Returns: `number`

- **src/services/admin/dashboardMetricsService.ts**
  - `get_historical_nav` - Returns: `Json`
  - `retry_delivery` - Returns: `boolean`

- **src/services/admin/yieldCorrectionService.ts**
  - `preview_yield_correction_v2` - Returns: `Json`
  - `apply_yield_correction_v2` - Returns: `Json`
  - `get_yield_corrections` - Returns: `Json`

- **src/services/admin/recordedYieldsService.ts**
  - `is_super_admin` - Returns: `boolean`

- **src/services/admin/requestsQueueService.ts**
  - `approve_withdrawal` - Returns: `boolean`
  - `reject_withdrawal` - Returns: `boolean`

- **src/services/admin/internalRouteService.ts**
  - `internal_route_to_fees` - Returns: `Json`

#### Investor Services
- **src/services/investor/investorPortfolioService.ts**
  - `create_withdrawal_request` - Returns: `string`

- **src/services/investor/investorDataService.ts**
  - `create_withdrawal_request` - Returns: `string`

- **src/services/investor/transactionsV2Service.ts**
  - `void_transaction` - Returns: `boolean`
  - `get_void_transaction_impact` - Returns: `Json`

#### Shared Services
- **src/services/shared/adminToolsService.ts**
  - `refresh_fund_aum_cache` - (Check types.ts for return type)

#### API Services
- **src/services/api/statementsApi.ts**
  - `get_statement_period_summary` - Returns: `Json`

#### Hooks
- **src/hooks/data/admin/useAdminInvites.ts**
  - `is_super_admin` - Returns: `boolean`
  - `create_admin_invite` - Returns: `string`

- **src/hooks/data/shared/useProfiles.ts**
  - `is_super_admin` - Returns: `boolean`

## Migration Pattern

For each file, follow these steps:

### Step 1: Add Type Import
```typescript
import type { Database } from "@/integrations/supabase/types";
```

### Step 2: Update RPC Calls
```typescript
// Before
const { data, error } = await supabase.rpc('function_name', {
  p_param: value
});

// After
const { data, error } = await supabase
  .rpc('function_name', {
    p_param: value
  })
  .returns<Database["public"]["Functions"]["function_name"]["Returns"]>();
```

### Step 3: Alternative - Use Helper Functions
```typescript
import { callRpc } from "@/integrations/supabase/rpc-helpers";

const { data, error } = await callRpc('function_name', {
  p_param: value
});
```

## Quick Reference: Common RPC Return Types

| Function Name | Return Type | Description |
|--------------|-------------|-------------|
| `approve_withdrawal` | `boolean` | Success indicator |
| `create_withdrawal_request` | `string` | Request ID |
| `is_super_admin` | `boolean` | Admin status |
| `generate_fund_period_snapshot` | `string` | Snapshot ID |
| `finalize_month_yield` | `Json` | Yield finalization result |
| `get_delivery_stats` | `Json` | Delivery statistics |
| `void_transaction` | `boolean` | Success indicator |
| `update_admin_role` | `boolean` | Success indicator |

## Type Safety Benefits

### Before Migration
```typescript
// Type erasure - data is unknown
const { data } = await supabase.rpc('is_super_admin');
if (data) { // TypeScript doesn't know data is boolean
  // ...
}
```

### After Migration
```typescript
// Properly typed - data is boolean
const { data } = await supabase
  .rpc('is_super_admin')
  .returns<Database["public"]["Functions"]["is_super_admin"]["Returns"]>();

if (data === true) { // TypeScript enforces boolean comparison
  // ...
}
```

## Testing

After migration, verify:
1. No TypeScript compilation errors
2. IDE autocomplete works for return types
3. Type guards work correctly
4. No runtime errors from type mismatches

## Notes

- All RPC function return types are defined in `/src/integrations/supabase/types.ts`
- The `Database` type is auto-generated from Supabase schema
- Parameter names use `p_` prefix as defined in database functions
- Use `.returns<T>()` method for inline typing
- Use helper functions for cleaner code

## Future Improvements

1. Consider creating typed wrappers for frequently used RPC functions
2. Add JSDoc comments with return type descriptions
3. Create unit tests for RPC helper functions
4. Add runtime validation for critical RPC calls

## Related Files

- `/src/integrations/supabase/types.ts` - Auto-generated database types
- `/src/integrations/supabase/client.ts` - Supabase client setup
- `/src/integrations/supabase/rpc-helpers.ts` - Type-safe RPC utilities

---

Generated: 2026-01-09
Status: Migration In Progress
