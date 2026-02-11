# IB Portal Test Report
**Date**: 2026-01-27
**Tester**: Claude Code (Automated Testing)
**Test Scope**: IB Portal Authentication and Routing
**Status**: CRITICAL ISSUE FOUND

---

## Executive Summary

The IB Portal is **completely inaccessible** to IB users due to a routing configuration issue in the DashboardLayout component. IB users are redirected to the login page when attempting to access any IB route.

### Root Cause
The `DashboardLayout.tsx` component only recognizes two route types:
1. Admin routes (paths starting with `/admin`)
2. Investor routes (paths starting with `/investor` or `/dashboard`)

IB routes (`/ib/*`) are not recognized, causing the layout to incorrectly classify them as admin routes and redirect non-admin IB users to `/investor`, which then redirects them back to login.

---

## Test Environment

**Test User**: qa.ib@indigo.fund
**Password**: QaTest2026!
**User ID**: e6571dc6-dcc8-4bbe-aa96-cb813c91cee3
**Role**: IB (verified in user_roles table)
**Test URL**: https://indigo-yield-platform.lovable.app/

---

## Database Verification

```sql
SELECT
  u.id,
  u.email,
  ur.role,
  ur.created_at as role_assigned_at
FROM auth.users u
LEFT JOIN user_roles ur ON u.id = ur.user_id
WHERE u.email = 'qa.ib@indigo.fund';
```

**Result**: User exists with IB role assigned on 2026-01-24 15:25:47

---

## Test Results

### Test 1: Login with IB Credentials
- **Action**: Login with qa.ib@indigo.fund / QaTest2026!
- **Expected**: Redirect to IB Dashboard (/ib)
- **Actual**: Redirected to login page
- **Status**: FAILED
- **Screenshot**: ib-login-redirect-issue.png

### Test 2: Direct Navigation to /ib
- **Action**: Navigate directly to /ib after login
- **Expected**: Display IB Dashboard
- **Actual**: Infinite redirect loop, eventual logout
- **Status**: FAILED

### Test 3: IB Role Check
- **Action**: Query user_roles table for IB role
- **Expected**: Role = 'ib'
- **Actual**: Role = 'ib' (CORRECT)
- **Status**: PASSED

---

## Issue Analysis

### Code Review: DashboardLayout.tsx

**Problem Location**: Lines 23-66 in `/src/components/layout/DashboardLayout.tsx`

```typescript
// Lines 23-29: Route classification logic
const isAdminRoute = currentPath.startsWith("/admin") || currentPath === "/admin-operations";

const isInvestorRoute =
  currentPath === "/investor" ||
  currentPath.startsWith("/investor/") ||
  currentPath === "/dashboard";
```

**Missing**: IB route classification

```typescript
// Lines 59-66: Redirect logic
if (isInvestorRoute && verifiedIsAdmin && !adminWantsInvestorView) {
  navigate("/admin", { replace: true });
} else if (isAdminRoute && !verifiedIsAdmin) {
  // THIS CONDITION CATCHES IB ROUTES!
  console.warn("[DashboardLayout] Non-admin accessing admin route, redirecting to /investor");
  navigate("/investor", { replace: true });
}
```

### Redirect Flow for IB Users

1. IB user logs in successfully
2. User is redirected to `/ib` (default IB dashboard)
3. DashboardLayout checks route:
   - `isAdminRoute = false` (doesn't match `/admin`)
   - `isInvestorRoute = false` (doesn't match `/investor` or `/dashboard`)
4. Neither condition matches, so route is treated as "admin route"
5. Line 62 triggers: "Non-admin trying to access admin routes"
6. User is redirected to `/investor`
7. Investor routes check IB role, redirect back to `/ib`
8. Infinite loop until session expires
9. User is logged out and redirected to login page

---

## Impact Assessment

**Severity**: CRITICAL
**Affected Users**: All IB users
**Business Impact**:
- IB users cannot access any IB portal functionality
- Commission tracking unavailable
- Referral management unavailable
- IB payouts inaccessible

**Affected Routes**:
- /ib (IB Dashboard)
- /ib/referrals (Referrals Page)
- /ib/referrals/:id (Referral Detail)
- /ib/commissions (Commission Ledger)
- /ib/payouts (Payout History)
- /ib/settings (IB Settings)

---

## Recommended Fix

### Solution 1: Add IB Route Recognition (Recommended)

Modify `DashboardLayout.tsx` to recognize IB routes:

```typescript
// Add IB route check
const isIBRoute = currentPath.startsWith("/ib");

// Update redirect logic
if (isInvestorRoute && verifiedIsAdmin && !adminWantsInvestorView) {
  navigate("/admin", { replace: true });
} else if (isAdminRoute && !verifiedIsAdmin) {
  navigate("/investor", { replace: true });
} else if (isIBRoute && !hasIBRole) {
  // Non-IB trying to access IB routes
  navigate("/investor", { replace: true });
}
```

This requires adding IB role check to DashboardLayout:

```typescript
const { isIB, isLoading: ibRoleLoading } = useUserRole(); // Add IB check
const hasIBRole = isIB && !isAdmin; // IB users should not also be admins
```

### Solution 2: Separate IB Layout (Alternative)

Create a dedicated IBLayout component that doesn't inherit DashboardLayout's redirect logic:

```typescript
// src/components/layout/IBLayout.tsx
export function IBLayout() {
  // IB-specific layout without admin/investor redirect logic
}
```

Then update AppRoutes.tsx:

```typescript
<Route path="/ib" element={<IBLayout />}>
  {IBUserRoutes()}
</Route>
```

---

## Verification Steps

After implementing the fix:

1. Login as qa.ib@indigo.fund
2. Verify redirect to /ib dashboard
3. Navigate to each IB route:
   - /ib/referrals
   - /ib/commissions
   - /ib/payouts
   - /ib/settings
4. Verify no infinite loops or unexpected redirects
5. Test with QA Investor referral data visible
6. Verify data isolation (IB sees only their referred investors)

---

## Additional Findings

### IBRoute.tsx Analysis

The IB route guard (`src/routing/IBRoute.tsx`) is correctly implemented:
- Checks for user authentication
- Queries user_roles table for IB role
- Redirects to /dashboard if not IB
- Redirects to /login if not authenticated

**The IBRoute guard works correctly. The issue is in DashboardLayout.**

### IB Routes Configuration

IB routes are properly configured in `src/routing/routes/ib.tsx`:
- All 6 IB pages are lazy-loaded
- IBRoute wrapper is applied to all routes
- Legacy redirect from /ib/dashboard to /ib exists

**The route configuration is correct. The issue is in DashboardLayout.**

---

## Screenshots

### Issue: Login Redirect Loop
![IB Login Redirect Issue](/tmp/playwright-output/ib-login-redirect-issue.png)

IB user is logged out and redirected to login page after attempting to access IB routes.

---

## Recommendations

1. **Immediate**: Implement Solution 1 to add IB route recognition to DashboardLayout
2. **Short-term**: Add integration tests for IB route access
3. **Long-term**: Consider refactoring DashboardLayout to use a route config object instead of hardcoded path checks

---

## Test Conclusion

**Overall Status**: CRITICAL FAILURE
**Blocker**: Yes - IB Portal is completely inaccessible
**Recommendation**: Deploy fix immediately before IB users attempt access

---

## Next Steps

1. Apply recommended fix to DashboardLayout.tsx
2. Re-run full IB portal test suite
3. Verify all 6 IB pages are accessible
4. Test with QA IB user and verify referral data
5. Add regression tests for IB routing
