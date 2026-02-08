# E2E Bug Report - February 7, 2026

**Tester**: Automated (Claude Code + Playwright MCP)
**Date**: 2026-02-07
**Target**: Vercel deployment (https://indigo-yield-platform-v01-hamstamgrams-projects.vercel.app)
**Note**: Primary Lovable deployment is DOWN ("Project not found"). Vercel deployment is STALE (running old code).

---

## CRITICAL: Deployment Issues

### BUG-001: Lovable deployment is down
- **Severity**: CRITICAL
- **URL**: https://indigo-yield-platform-v01.lovable.app/
- **Expected**: App loads normally
- **Actual**: Returns "Project not found" page
- **Impact**: Production is inaccessible
- **Action**: Check Lovable dashboard, redeploy from main branch

### BUG-002: Vercel deployment is stale (old code)
- **Severity**: CRITICAL
- **URL**: https://indigo-yield-platform-v01-hamstamgrams-projects.vercel.app
- **Evidence**:
  - Calls RPCs that no longer exist in current code (`get_profile_basic`, `get_profile_by_id`)
  - Queries table `investors` which doesn't exist (current code uses `profiles`)
  - Routes that exist in current code return 404 (`/admin/transactions`, `/admin/yield`, `/ib/*`)
- **Impact**: Vercel backup deployment shows old code, masking current state
- **Action**: Trigger Vercel redeploy from latest main branch

---

## HIGH: Missing Database Objects (may be intentionally removed)

### BUG-003: `log_security_event` RPC fails on every page load
- **Severity**: HIGH
- **RPC**: `log_security_event(p_event_type, p_severity, p_user_id, p_details)`
- **Status**: RPC EXISTS in DB, but current codebase only has it in generated types (no actual calls in src/)
- **Actual behavior**: Every page navigation triggers a 400/404 error in console
- **Root cause**: Old deployed code calls it; current code doesn't. After redeployment this should resolve.
- **Action**: Confirm no code references remain after deployment. Consider dropping the RPC if unused.

### BUG-004: `get_profile_basic` and `get_profile_by_id` RPCs don't exist
- **Severity**: HIGH (on stale deployment only)
- **Called from**: Multiple pages (dashboard, investors, reports, every navigation)
- **Status**: RPCs do NOT exist in DB. Current code does NOT call them (grep returns 0 matches).
- **Root cause**: Old deployed code references these. After redeployment this should resolve.
- **Action**: None - will auto-fix with fresh deployment

### BUG-005: `investors` view/table doesn't exist
- **Severity**: HIGH (on stale deployment only)
- **Called from**: Admin Investors page, Admin Reports page
- **Query**: `investors?select=*&order=name.asc`
- **Status**: No `investors` table/view exists. Current code does NOT query it (grep returns 0 matches).
- **Root cause**: Old deployed code references this. After redeployment this should resolve.
- **Action**: None - will auto-fix with fresh deployment

---

## MEDIUM: UI/UX Issues (persist in current code)

### BUG-006: Fund AUM shows misleading "Last updated: 2026-02-28"
- **Severity**: MEDIUM
- **Page**: Admin > Fund Management > AUM Management
- **Expected**: Clear labeling that this is a month-end reporting snapshot date
- **Actual**: Shows "Last updated: 2026-02-28" which appears to be a future date
- **Root cause**: The `fund_daily_aum` table stores reporting-purpose entries with month-end dates. The UI labels the reporting date as "Last updated".
- **Action**: Relabel to "Month-end snapshot" or show the `updated_at` timestamp instead

### BUG-007: Admin Dashboard Total AUM shows "$0.00M" with USD formatting
- **Severity**: MEDIUM
- **Page**: Admin Dashboard
- **Expected**: AUM displayed in native crypto units per fund (e.g., "43 BTC, 45,220 USDT")
- **Actual**: Shows "$0.00M" - uses USD dollar sign formatting
- **Impact**: Misleading for a crypto-native platform. Also shows $0 which may be a query issue.
- **Action**: Display AUM per fund in native token amounts, or show aggregate with label

### BUG-008: Fund cards show "0 Investors" despite having AUM
- **Severity**: MEDIUM
- **Page**: Admin > Fund Management > AUM Management
- **Observed**: BTC Fund shows 43.000000 BTC AUM but "Investors: 0", USDT Fund shows 45,220 USDT but "Investors: 0"
- **Root cause**: Investor count query may be filtering incorrectly or using a different source
- **Action**: Verify the investor count query matches active positions per fund

### BUG-009: Admin Dashboard shows "44 Total Investors, 0 active"
- **Severity**: MEDIUM
- **Page**: Admin Dashboard
- **Expected**: Consistent investor counts
- **Actual**: 44 total but 0 active. The "active" filter may be too restrictive.
- **Action**: Check the active investor counting logic

### BUG-010: Admin sidebar overlaps tab navigation on some pages
- **Severity**: MEDIUM
- **Page**: Admin > Fund Management (and potentially others with horizontal tabs)
- **Reproduction**: When sidebar is open on narrower viewports, clicking tabs fails because the sidebar's navigation menu intercepts pointer events
- **Workaround**: Close the sidebar first, then click tabs
- **Action**: Fix z-index or pointer-events on sidebar vs content area

### BUG-011: Admin Reports page shows "$0.00" for Total AUM and Total Yield
- **Severity**: MEDIUM
- **Page**: Admin > Reports & Analytics
- **Expected**: AUM in native token amounts
- **Actual**: "$0.00" with USD formatting - same issue as BUG-007

---

## LOW: Console Errors (non-blocking)

### BUG-012: Google Fonts fail to load on every page
- **Severity**: LOW
- **Error**: `Loading the font 'https://fonts.gstatic.com/...' failed`
- **Impact**: Fonts fall back to system defaults. Visual inconsistency.
- **Root cause**: Likely CSP or CORS configuration on the Vercel deployment
- **Action**: Verify font loading configuration for both Lovable and Vercel deployments

### BUG-013: Sentry/analytics connection failures
- **Severity**: LOW
- **Error**: `Connecting to 'https://o4509944393629696.ingest.us.sentry.io'` - connection refused
- **Impact**: Error monitoring is not functioning
- **Action**: Verify Sentry DSN configuration and ensure the project exists

### BUG-014: WebSocket connection to Supabase Realtime fails
- **Severity**: LOW
- **Error**: `WebSocket connection to 'wss://nkfimvovosdehmyyjubn.supabase.co/realtime/...'` failed
- **Impact**: Real-time subscriptions don't work
- **Action**: Check Supabase realtime configuration

---

## INFORMATIONAL: Stale Deployment Route Audit

The following routes exist in the current codebase but returned 404 on the Vercel deployment (expected to work after fresh deployment):

| Route | Status on Vercel | Status in Code |
|-------|-----------------|----------------|
| `/admin/transactions` | 404 | Defined in `routing/routes/admin/transactions.tsx` |
| `/admin/transactions/new` | Not tested | Defined in `routing/routes/admin/transactions.tsx` |
| `/admin/yield` | 404 | Defined in `routing/routes/admin/operations.tsx` |
| `/admin/yield-distributions` | Not tested | Defined in `routing/routes/admin/operations.tsx` |
| `/admin/fees` | Not tested | Likely defined |
| `/admin/system-health` | Not tested | Likely defined |
| `/admin/integrity` | Not tested | Likely defined |
| `/admin/ib-management` | Not tested | Likely defined |
| `/ib` | 404 | Defined in `routing/routes/ib.tsx` |
| `/ib/referrals` | Not tested | Defined in `routing/routes/ib.tsx` |
| `/ib/commissions` | Not tested | Defined in `routing/routes/ib.tsx` |
| `/ib/payouts` | Not tested | Defined in `routing/routes/ib.tsx` |

### Routes that DO work on stale Vercel deployment:
| Route | Status |
|-------|--------|
| `/` | Landing page loads |
| `/login` | Login form works, auth succeeds |
| `/dashboard` | Investor dashboard loads (empty portfolio) |
| `/admin` | Admin dashboard loads |
| `/admin/investors` | Loads but data query fails (stale code) |
| `/admin/funds` | Loads with AUM data |
| `/admin/withdrawals` | Loads (no requests) |
| `/admin/reports` | Loads (no data) |
| `/admin/audit-logs` | Loads (empty) |
| `/transactions` | Loads with transaction data |
| `/withdrawals` | Loads (no requests) |

---

## Summary

| Severity | Count | Notes |
|----------|-------|-------|
| CRITICAL | 2 | Both deployment-related |
| HIGH | 3 | All caused by stale deployment |
| MEDIUM | 6 | Mix of UI/UX and data issues |
| LOW | 3 | Console errors, non-blocking |
| **Total** | **14** | |

### Priority Actions:
1. **Redeploy to Lovable** - Restore primary deployment
2. **Redeploy to Vercel** - Update backup with latest code
3. **After deployment**: Re-run E2E testing to validate BUG-003 through BUG-005 are resolved
4. **Fix UI bugs**: BUG-006 through BUG-011 require code changes
5. **Fix infrastructure**: Font loading, Sentry, WebSocket configs
