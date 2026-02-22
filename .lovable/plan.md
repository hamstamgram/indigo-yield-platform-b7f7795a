

# Fix: Build Errors Breaking Admin Routing + Type Mismatches

## Problem

The app has 8 build errors caused by mismatches between the code and the auto-generated Supabase types (`types.ts`). These errors prevent the app from compiling correctly, which can cause the admin user to land on a broken page or get redirected to investor routes instead of admin routes.

The admin auth logic itself is correct -- adriel@indigo.fund has both `admin` and `super_admin` roles in the database, and the auth context properly queries `user_roles`. The issue is that **build failures break the app before the routing logic can execute**.

## Root Cause: 4 Type Mismatches

### 1. `force_delete_investor` RPC -- extra parameter

- **Generated type**: `Args: { p_investor_id: string }` (1 parameter)
- **Code sends**: `{ p_investor_id, p_admin_id }` (2 parameters)
- **File**: `src/features/admin/funds/services/reconciliationService.ts` line 101
- **Fix**: Remove `p_admin_id` from the call (the DB function doesn't accept it; admin identity comes from `auth.uid()`)

### 2. `merge_duplicate_profiles` RPC -- wrong parameter names

- **Generated type**: `Args: { p_keep_id: string; p_merge_id: string }`
- **Code sends**: `{ p_keep_profile_id, p_merge_profile_id }`
- **File**: `src/services/admin/integrityOperationsService.ts` line 371-373
- **Fix**: Rename parameters to `p_keep_id` and `p_merge_id`

### 3. `finalize_month_yield` RPC -- wrong parameter names and types

- **Generated type**: `Args: { p_admin_id?: string; p_fund_id: string; p_month: string }`
- **Code sends**: `{ p_fund_id, p_period_year, p_period_month, p_admin_id }` (extra `p_period_year`, wrong name `p_period_month` vs `p_month`)
- **File**: `src/services/admin/yields/yieldCrystallizationService.ts` lines 57-62
- **Fix**: Combine year and month into a single `p_month` string (e.g., `"2026-02"`) and remove `p_period_year`

### 4. `investor_yield_events` table -- does not exist in types

- **Generated type**: Table not found (may have been renamed or removed)
- **Code queries**: `supabase.from("investor_yield_events")` 
- **File**: `src/services/admin/yields/yieldCrystallizationService.ts` line 296
- **Fix**: Check what the correct table name is. The table might be `yield_distributions` or similar. If the table genuinely doesn't exist, replace with the correct table query or remove the function.

## Implementation Steps

### Step 1: Fix `reconciliationService.ts` (line 101)

Remove `p_admin_id` from the `force_delete_investor` call:
```typescript
const { data, error } = await rpc.call("force_delete_investor", {
  p_investor_id: investorId,
});
```

### Step 2: Fix `integrityOperationsService.ts` (lines 371-373)

Use correct parameter names:
```typescript
const { data, error } = await callRPC("merge_duplicate_profiles", {
  p_keep_id: keepProfileId,
  p_merge_id: mergeProfileId,
});
```

### Step 3: Fix `yieldCrystallizationService.ts` (lines 57-62)

Format the month parameter correctly:
```typescript
const monthStr = `${year}-${String(month).padStart(2, '0')}`;
const { data, error } = await callRPC("finalize_month_yield", {
  p_fund_id: fundId,
  p_month: monthStr,
  p_admin_id: adminId,
});
```

### Step 4: Fix `yieldCrystallizationService.ts` (lines 295-302)

Check the database for the correct table name for yield events. If the table is named differently (e.g., `yield_distributions` or a view), update the query. If no equivalent exists, the `getPendingYieldEventsCount` function needs to be rewritten against the correct schema.

## Outcome

All 8 build errors will be resolved. The app will compile correctly, and the admin routing logic (which is already correct) will execute properly, directing adriel@indigo.fund to `/admin` as expected.

