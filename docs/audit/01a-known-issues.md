# Known Issues - Page Inventory Analysis

**Date:** September 2, 2025  
**Source:** Complete page inventory and route analysis  
**Priority Classification:** P0 (Critical) | P1 (High) | P2 (Medium)

---

## P0 Critical Issues (Fix Immediately)

### 1. 🔴 Route Conflict: Duplicate `/documents` Mapping

**Issue:** The `/documents` path is mapped to TWO different components within DashboardLayout:
- Line 112: `<Route path="/documents" element={<DocumentsVault />} />`
- Line 146: `<Route path="/documents" element={<DocumentsPage />} />`

**Impact:** Route conflict causes unpredictable behavior. React Router will match the first route (DocumentsVault), making DocumentsPage unreachable.

**Root Cause:** Legacy migration where old DocumentsPage wasn't removed when DocumentsVault was added.

**Reproduction:**
1. Navigate to `/documents` as LP user
2. Only DocumentsVault renders (line 112 takes precedence)
3. DocumentsPage component is dead code

**Solution Options:**
- Option A: Keep DocumentsVault, remove DocumentsPage import/route
- Option B: Change paths to `/documents/vault` and `/documents/list`
- Option C: Consolidate functionality into single component

---

### 2. 🔴 Broken Link: `/deposits` Route Missing

**Issue:** EnhancedDashboard (main LP dashboard) contains a "Request Deposit" button linking to `/deposits`, but no route exists for this path.

**Location:** `src/pages/EnhancedDashboard.tsx:302`
```tsx
<Link to="/deposits">Request Deposit</Link>
```

**Impact:** Clicking "Request Deposit" results in 404/NotFound page, breaking core LP workflow.

**Root Cause:** Dashboard quick actions were added before deposits page implementation.

**Reproduction:**
1. Login as LP user
2. Navigate to `/dashboard`
3. Click "Request Deposit" button in Quick Actions
4. Results in 404 error

**Solution:** Either implement DepositsPage component and route, or remove the broken link.

---

### 3. 🔴 Admin Redirect Inefficiency: Double Hop

**Issue:** Admin users get redirected twice when accessing dashboard:
1. DashboardLayout redirects `/dashboard` → `/admin-dashboard` (line 104 in DashboardLayout)
2. App.tsx redirects `/admin-dashboard` → `/admin` (line 140)

**Impact:** Unnecessary redirect chain, poor UX, potential for redirect loops.

**Root Cause:** Legacy route cleanup incomplete during admin portal restructure.

**Reproduction:**
1. Login as admin user
2. Navigate to `/dashboard`
3. Observe double redirect in browser history

**Solution:** Update DashboardLayout to redirect directly to `/admin`, remove `/admin-dashboard` redirect.

---

### 4. 🔴 Mixed Admin Guard Patterns

**Issue:** Admin access control is handled in TWO places:
- RequireAdmin wrapper components around routes
- DashboardLayout admin detection and redirects

**Impact:** Potential race conditions, double redirects, inconsistent behavior.

**Locations:**
- RequireAdmin: Lines 115-154 in App.tsx
- DashboardLayout: Admin check and redirect logic

**Solution:** Standardize on RequireAdmin guards, remove admin logic from DashboardLayout.

---

### 5. 🔴 Unused Legacy Imports

**Issue:** Multiple imported components are not used in routes:

**Unused Imports:**
- `InstallPrompt` (line 38) - imported but `SimpleInstallPrompt` used instead
- `YieldSourcesManagement` (line 33) - imported but not routed
- `Support` (line 54) - imported but not routed
- `InvestorDetail` (line 31) - imported but not routed
- `YieldSettings` (line 32) - imported but not routed

**Impact:** Bundle size bloat, developer confusion, maintenance overhead.

**Solution:** Remove unused imports after confirming they're not referenced elsewhere.

---

## P1 High Priority Issues

### 6. 🟡 Route Overlap: Admin Investor Creation

**Issue:** Two routes exist for creating investor accounts:
- `/admin/investors/new` → AdminInvestorNewPage
- `/admin/investors/create` → InvestorAccountCreation

**Impact:** Functional overlap, user confusion, maintenance burden.

**Solution:** Consolidate to single route, likely `/admin/investors/new`.

---

### 7. 🟡 Settings Fragmentation

**Issue:** Settings are scattered across multiple routes:
- `/settings` → SettingsPage (general)
- `/settings/profile` → ProfileSettingsPage
- `/settings/notifications` → NotificationSettingsPage
- `/settings/security` → SecuritySettings
- `/settings/sessions` → SessionManagementPage

**Impact:** Poor UX, inconsistent navigation, no unified settings experience.

**Solution:** Create unified settings hub with tabbed interface.

---

### 8. 🟡 Legacy Admin Routes Still Active

**Issue:** Legacy admin routes still function alongside new structure:
- `/admin-tools` (should redirect to new admin structure)
- `/admin-operations` (should redirect to new admin structure)

**Impact:** Confusion about which admin interface to use, maintenance of two systems.

**Solution:** Redirect legacy routes to new admin structure or sunset gracefully.

---

## P2 Medium Priority Issues

### 9. 🟢 Yield Settings Duplication

**Issue:** Two yield-related admin routes may overlap:
- `/admin/yield-settings` → AdminYieldSettingsPage
- `/admin/yield` → YieldSettingsManagement

**Impact:** Potential functional overlap, user confusion.

**Recommendation:** Audit both components to determine if consolidation is needed.

---

### 10. 🟢 Navigation Coverage Gaps

**Issue:** Many routes exist but are not present in navigation configs:

**Missing from Navigation:**
- Support tickets, notifications, portfolio analytics
- Most settings pages (only general `/settings` in accountNav)
- Many admin pages (only 4 of 20+ admin routes in adminNav)

**Impact:** Routes are accessible but not discoverable through navigation.

**Solution:** Audit which routes should be in navigation vs. accessed through other means.

---

## Verification Steps

### For Route Conflicts:
1. Test `/documents` route behavior
2. Verify DocumentsPage is unreachable
3. Confirm DocumentsVault renders correctly

### For Broken Links:
1. Navigate to `/dashboard` as LP
2. Click all quick action buttons
3. Verify destination pages load correctly

### For Admin Redirects:
1. Login as admin
2. Navigate to `/dashboard`
3. Monitor browser history for redirect chain
4. Verify final landing on correct admin page

### For Component Usage:
1. Search codebase for each unused import
2. Confirm no dynamic imports or string-based references
3. Safely remove unused code

---

## Summary Statistics

- **Total Routes Analyzed:** 47
- **P0 Critical Issues:** 5
- **P1 High Priority:** 3  
- **P2 Medium Priority:** 2
- **Route Conflicts:** 1
- **Broken Links:** 1
- **Legacy Cleanup Items:** 4

**Next Action:** Address P0 issues before proceeding with Phase 1 steps 2-6.
