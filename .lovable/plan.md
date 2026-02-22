

# Fix: Build Errors Blocking Admin Routing

## Problem

4 build errors prevent the app from compiling. When the app fails to build properly, the admin routing logic never executes, so adriel@indigo.fund gets dumped onto the investor portal (or a broken page). The admin auth is fine in the database -- the build just needs to succeed.

## Fixes

### Fix 1: `reconciliationService.ts` line 101 -- Remove extra `p_admin_id`

The DB function `force_delete_investor` only accepts `p_investor_id`. Remove the `p_admin_id` parameter (admin identity is resolved server-side via `auth.uid()`).

Also update the function signature to drop the unused `adminId` parameter.

### Fix 2: `integrityOperationsService.ts` lines 371-373 -- Rename parameters

Change `p_keep_profile_id` to `p_keep_id` and `p_merge_profile_id` to `p_merge_id` to match the DB function signature.

### Fix 3: `yieldCrystallizationService.ts` lines 57-62 -- Fix `finalize_month_yield` call

The DB function expects `{ p_fund_id, p_month, p_admin_id }` where `p_month` is a string. Replace `p_period_year` and `p_period_month` with a single `p_month` formatted as `"YYYY-MM"`:
```
p_month: `${year}-${String(month).padStart(2, '0')}`
```

### Fix 4: `yieldCrystallizationService.ts` lines 295-302 -- Replace non-existent table

`investor_yield_events` does not exist. The equivalent data lives in `yield_allocations` (which has `net_amount`, `is_voided`, `fund_id`, `distribution_id`). Rewrite `getPendingYieldEventsCount` to query `yield_allocations` joined with `yield_distributions` for the date filter, using `net_amount` instead of `net_yield_amount`.

### Technical Details

**File: `src/features/admin/funds/services/reconciliationService.ts`**
- Line 98: Change signature to `forceDeleteInvestor(investorId: string)`
- Line 99-102: Remove `p_admin_id` from the RPC call

**File: `src/services/admin/integrityOperationsService.ts`**
- Line 372: `p_keep_profile_id` becomes `p_keep_id`
- Line 373: `p_merge_profile_id` becomes `p_merge_id`

**File: `src/services/admin/yields/yieldCrystallizationService.ts`**
- Lines 57-62: Replace `p_period_year` and `p_period_month` with `p_month: \`${year}-${String(month).padStart(2, '0')}\``
- Lines 295-302: Rewrite query to use `yield_allocations` table with `net_amount` column, filtering by `fund_id`, `is_voided = false`, and joining `yield_distributions` for date range

