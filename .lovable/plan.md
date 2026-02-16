

# Deep Platform Audit Report

## Summary

After extensive codebase analysis, I identified **14 findings** across 4 categories: duplicate functions, logic/math issues, architectural violations, and dead code.

---

## Category 1: Duplicate Functions (6 findings)

### D1. `getActiveFunds()` -- 3 identical implementations

- `src/services/admin/fundService.ts` line 294
- `src/services/admin/feesService.ts` line 79
- `src/services/shared/profileService.ts` line 226 (class method)

All three query `funds` with `status = 'active'`, select `id, code, name, asset`. Plus a 4th near-duplicate `getActiveFundsForList()` in `src/services/investor/fundViewService.ts` line 62.

**Fix**: Delete from `feesService` and `profileService`; import from `fundService`.

### D2. `getFundInvestorComposition()` -- 2 different implementations

- `src/services/admin/dashboardMetricsService.ts` line 187 -- direct DB query, includes ALL account types
- `src/services/admin/yieldHistoryService.ts` line 271 (`getFundInvestorCompositionWithYield`) -- uses `get_fund_composition` RPC, investor-only

Both are exported from the admin barrel. The dashboard version includes fees/IB accounts (correct for dashboard) while the yield version excludes them (correct for yield). However, the yield barrel re-exports with an alias `as getFundInvestorComposition`, creating a name collision in the barrel.

**Fix**: Rename the yield version to `getFundInvestorCompositionForYield` to eliminate ambiguity.

### D3. `getInvestorPositionsWithFunds()` -- 2 implementations

- `src/services/investor/fundViewService.ts` line 140 -- full join, filters zero-value
- `src/services/admin/yieldHistoryService.ts` line 322 -- minimal join, filters active funds only

Different return types and filters. Both are re-exported from barrels.

**Fix**: Rename yield version to `getInvestorPositionsForYield` to prevent import confusion.

### D4. `changePassword()` vs `updatePassword()` -- duplicate auth functions

- `src/services/auth/authService.ts:updatePassword()` -- canonical
- `src/services/profile/profileSettingsService.ts:changePassword()` -- identical body

**Fix**: Delete `changePassword` from profileSettingsService; consumers import from authService.

### D5. `resetPasswordForEmail()` vs `sendPasswordResetEmail()` -- duplicate in same file

- `src/services/auth/authService.ts` lines 128 and 203 -- both call `supabase.auth.resetPasswordForEmail` with nearly identical logic

**Fix**: Delete `sendPasswordResetEmail`; use `resetPasswordForEmail` everywhere.

### D6. `deleteInvestorProfile()` vs `deleteInvestorUser()` vs `forceDeleteInvestor()`

Three different deletion paths:
- `investorSettingsService.deleteInvestorProfile()` -- direct `profiles.delete()` (bypasses RLS policy `no_profile_deletes` which uses `USING (false)` -- this will ALWAYS fail silently or error)
- `userService.deleteInvestorUser()` -- edge function call
- `reconciliationService.forceDeleteInvestor()` -- RPC call

**Critical**: `deleteInvestorProfile` uses `supabase.from("profiles").delete()` but the RLS policy `no_profile_deletes` is `USING (false)` -- meaning this call will always return 0 rows deleted without error (Supabase silent failure). This is dead/broken code.

**Fix**: Remove `deleteInvestorProfile`. All deletions must go through the edge function or RPC.

---

## Category 2: Math/Precision Issues (3 findings)

### M1. `Number()` used for financial values instead of `Decimal.js`

Per project standards (documented in `DUPLICATE_PREVENTION_GOVERNANCE.md`), financial math must use `Decimal.js`. However, multiple services use raw `Number()`:

- `investorPositionService.ts` lines 112-115, 169-175, 502-508 -- `Number(pos.shares || 0)`
- `investorPortfolioService.ts` lines 65-66
- `feesService.ts` line 221

These convert database `NUMERIC(28,10)` values to JavaScript `Number`, which only has ~15 digits of precision. For large balances this could cause rounding errors.

**Fix**: Use `parseFinancial()` consistently (already imported in some of these files but not used for all conversions).

### M2. Allocation percentage uses native division

`investorPositionService.ts` line 175:
```typescript
allocationPercentage: totalValue > 0 ? (Number(fp.current_value) / totalValue) * 100 : 0
```

This should use `Decimal.js` division to avoid floating-point artifacts (e.g., 33.33333333333333% vs 33.3333333333%).

**Fix**: Use `toDecimal(fp.current_value).div(totalValue).times(100).toNumber()`.

### M3. Portfolio performance uses potentially unsafe division

`investorPortfolioSummaryService.ts` line 130:
```typescript
ytd_percentage: totalValue > 0 ? (totalPnL / (totalValue - totalPnL)) * 100 : 0
```

If `totalValue === totalPnL` (100% gain), this divides by zero. No guard for this edge case.

**Fix**: Add `(totalValue - totalPnL) !== 0` guard.

---

## Category 3: Architectural Violations (3 findings)

### A1. `checkAdminStatus()` in investor position service

`src/services/investor/investorPositionService.ts` line 516 contains an admin check function that queries `profiles.is_admin` directly. Per project memory, admin status must come from `is_admin()` RPC or `user_roles` table, not `profiles.is_admin` field (which the auth context explicitly says can be manipulated).

**Fix**: Replace with `rpc.call("is_admin")` or remove entirely (auth context already provides `isAdmin`).

### A2. Direct Supabase query in feature hooks

`src/features/admin/reports/hooks/useStatementData.ts` line 173 uses `supabase.from("generated_statements").delete()` directly instead of going through a service layer. This violates the service-layer isolation standard.

**Fix**: Move to `statementAdminService.ts`.

### A3. `getTotalAUM()` and `getActiveInvestorCount()` make redundant RPC calls

Both functions in `investorPositionService.ts` (lines 218 and 235) independently call `supabase.rpc("get_platform_stats")` -- meaning if both are called together (which `adminService.ts` line 48-49 does), the same RPC executes twice.

**Fix**: Create a unified `getPlatformStats()` that returns both values from a single call.

---

## Category 4: Dead/Broken Code (2 findings)

### B1. `fetchPendingInvites()` returns empty array

`investorPositionService.ts` line 316 -- the comment says "admin_invites table was dropped" and the function returns `[]`. This is dead code still exported and potentially called.

**Fix**: Remove function and update consumers.

### B2. `revokeSession()` is a no-op

`investorPortalService.ts` line 326 -- "user_sessions table was dropped - no-op". Dead code.

**Fix**: Remove function and update consumers to show a "not available" message.

---

## Implementation Priority

| Priority | Finding | Risk | Effort |
|----------|---------|------|--------|
| P0 | D6 (deleteInvestorProfile always fails) | Data integrity | Low |
| P0 | M3 (division by zero in portfolio) | Runtime crash | Low |
| P0 | A1 (admin check bypasses RBAC) | Security | Low |
| P1 | M1 (Number() precision loss) | Financial accuracy | Medium |
| P1 | D1 (3x getActiveFunds) | Maintainability | Low |
| P1 | A3 (double RPC call) | Performance | Low |
| P2 | D2-D5 (other duplicates) | Code quality | Low |
| P2 | A2, B1, B2 (cleanup) | Code quality | Low |

## Technical Implementation

### Step 1 -- P0 Fixes
1. Delete `deleteInvestorProfile` from `investorSettingsService.ts` and remove from barrel
2. Add division-by-zero guard in `investorPortfolioSummaryService.ts` line 130
3. Replace `checkAdminStatus()` body with `rpc.call("is_admin")` or deprecate

### Step 2 -- P1 Fixes
4. Consolidate `getActiveFunds` into `fundService.ts` only; update imports in `feesService` and `profileService`
5. Create `getPlatformStats()` function returning `{ totalAum, investorCount }` from a single RPC call
6. Replace `Number()` casts with `parseFinancial()` in position mapping functions

### Step 3 -- P2 Cleanup
7. Delete `sendPasswordResetEmail` and `changePassword` duplicates
8. Rename ambiguous `getInvestorPositionsWithFunds` and `getFundInvestorComposition` variants
9. Move direct Supabase call from `useStatementData.ts` to service layer
10. Remove dead `fetchPendingInvites` and `revokeSession` functions

