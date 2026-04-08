# Launch Fix Plan - Indigo Yield Platform

**Created**: 2026-02-11
**Target**: Soft launch readiness
**Estimated Effort**: 3-4 days

---

## Phase 1: Critical Bug Fixes (Day 1-2)

### 1.1 BUG-C1: Cross-Currency Yield Aggregation
**Location**: `/investor/yield-history` page
**Problem**: Summing BTC + USDT values together in totals
**Root Cause**: Likely in `useInvestorYieldEvents` hook or the component aggregating without grouping by asset

**Fix Steps**:
1. Find the yield history hook (`src/hooks/investor/useInvestorYieldEvents.ts`)
2. Find the page component (`src/pages/investor/YieldHistoryPage.tsx`)
3. Ensure totals are grouped by `asset_code` or `fund.asset`
4. Display separate totals per currency (BTC: X, USDT: Y)

**Acceptance**: Yield History shows per-currency totals, no cross-currency math

---

### 1.2 BUG-C2: Performance Page All Zeros
**Location**: `/portfolio/analytics` or `/investor/performance`
**Problem**: Beginning Balance, Additions, Redemptions, Net Income, Return all show 0.00
**Root Cause**: Either query returns no data, wrong date range, or component not wired to hook

**Fix Steps**:
1. Find performance page component
2. Trace data flow: Component -> Hook -> Service -> DB query
3. Check if query actually returns data (add console.log or check network tab)
4. Fix the broken link in the chain

**Acceptance**: Performance page shows real values matching transactions_v2 data

---

## Phase 2: High Priority Display Bugs (Day 2)

### 2.1 BUG-H1: Dashboard YTD Return/Earned Always Zero
**Location**: `/investor` dashboard
**Problem**: YTD Return shows +0.00%, Earned shows 0.00 for all assets
**Root Cause**: YTD calculation logic broken or not querying yield transactions

**Fix Steps**:
1. Find investor dashboard component
2. Find the hook calculating YTD metrics
3. Query should SUM(amount) from transactions_v2 WHERE type='YIELD' AND tx_date >= start_of_year
4. Fix calculation or query

---

### 2.2 BUG-H2: Portfolio MTD Net Change Zero
**Location**: `/investor/portfolio`
**Problem**: Month-to-date net change always 0.00
**Root Cause**: Similar to YTD - calculation not pulling yield data

**Fix Steps**:
1. Find portfolio page MTD calculation
2. Should compare current_value to start-of-month snapshot or sum transactions

---

### 2.3 BUG-H3: Yield History Event Balance/Percentage Zero
**Location**: `/investor/yield-history` individual events
**Problem**: Each yield event shows balance=0.00, yield%=0.0000%
**Root Cause**: `balance_at_time` or `position_snapshot` not being populated or fetched

**Fix Steps**:
1. Check yield_allocations table for `balance_snapshot` or similar column
2. If column exists but not populated, fix the yield distribution RPC
3. If column doesn't exist, either add it or calculate from historical transactions

---

## Phase 3: Dead Route Cleanup (Day 2, 30 min)

### 3.1 Remove Dead Routes
**Problem**: `/admin/maintenance` accessible with destructive "Reset All Positions" button
**Fix**: Delete route definitions and components that were supposed to be removed

**Files to check**:
- `src/routes/AdminRoutes.tsx` or equivalent
- Remove routes: `/admin/maintenance`, `/admin/bypass-attempts`
- Delete orphaned page components if they exist

---

## Phase 4: Infrastructure (Day 3-4, Parallel Work)

### 4.1 Error Tracking - Sentry Setup
**Effort**: 2 hours
**Steps**:
1. `npm install @sentry/react`
2. Create Sentry project, get DSN
3. Add to `src/main.tsx` initialization
4. Configure source maps upload in build

### 4.2 Uptime Monitoring
**Effort**: 30 min
**Options**: UptimeRobot (free), BetterStack, Checkly
**Steps**:
1. Sign up for service
2. Add HTTP check for production URL
3. Configure alert (email/Slack)

### 4.3 Rate Limiting
**Effort**: 2-4 hours
**Options**:
- Supabase Edge Functions with rate limiting middleware
- Cloudflare (if fronting the app)
- Application-level with localStorage/sessionStorage (basic)

### 4.4 Session Hardening
**Effort**: 1 hour
**Steps**:
1. Configure Supabase Auth session duration
2. Add idle timeout detection in React
3. Secure cookie settings (if applicable)

---

## Phase 5: Documentation (Day 4)

### 5.1 User FAQ
**Effort**: 2 hours
**Content**:
- How do I view my portfolio?
- How do I request a withdrawal?
- What is yield and when is it distributed?
- How are fees calculated?

### 5.2 Support Email
**Effort**: 30 min
- Set up support@indigo.fund or similar
- Add to footer/settings page
- Document response SLA internally

---

## Execution Order

| Priority | Task | Effort | Blocker? |
|----------|------|--------|----------|
| 1 | BUG-C1: Cross-currency sum | 2-3h | YES |
| 2 | BUG-C2: Performance zeros | 2-3h | YES |
| 3 | BUG-H1: Dashboard YTD | 1-2h | Soft |
| 4 | BUG-H2: Portfolio MTD | 1h | Soft |
| 5 | BUG-H3: Yield event balance | 2h | Soft |
| 6 | Dead route cleanup | 30m | No |
| 7 | Sentry | 2h | No |
| 8 | Uptime monitoring | 30m | No |
| 9 | FAQ/Docs | 2h | No |

---

## Verification

After each fix:
```bash
npx tsc --noEmit
npm run build
```

After all Phase 1-2 fixes:
- Manual smoke test on affected pages
- Re-run Playwright verification if available
- Update UI_DATA_TEST_REPORT.md with results

---

## Out of Scope (Post-Launch)

- Unit/integration tests (add incrementally)
- Service layer refactor (works, just ugly)
- IB system removal (keep for now)
- Staging environment
- Load testing
