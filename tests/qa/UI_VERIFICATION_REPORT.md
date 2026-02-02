# UI Verification Report
**Date**: 2026-02-02
**Test Environment**: https://indigo-yield-platform-v01.lovable.app (Production)
**Tester**: AI QA Agent via Playwright MCP
**Test Credentials**: QA test accounts (Admin, Investor, IB)

## Executive Summary

UI testing revealed a **CRITICAL BUG** in the Investor Portal: duplicate fund cards are displayed for the same position. This was supposed to be fixed in the previous session but the fix was incomplete.

### Status: FAILED
- ❌ Investor Portal: CRITICAL - Shows duplicate fund cards
- ✅ IB Portal: PASSED - Commissions display correctly
- ⚠️ Admin Portal: PARTIAL - Data integrity checks not run

---

## Test Results by Portal

### 1. Investor Portal ❌ FAILED

**Test Account**: `qa.investor@indigo.fund` / `QaTest2026!`
**Test URL**: https://indigo-yield-platform-v01.lovable.app/investor

#### Issue: Duplicate Fund Cards

**Observed Behavior**:
The investor dashboard displays TWO separate fund cards for the same IND-USDT position:

1. **Card 1**: "USDT Fund" (Stablecoin Fund)
   - Balance: 5,000.00 USDT
   - YTD Return: +0.00%
   - Earned: 0.00

2. **Card 2**: "USDT Fund" (USDT)
   - Balance: 4,940.00 USDT
   - YTD Return: +0.00%
   - Earned: 0.00

**Expected Behavior**:
Only ONE fund card should be displayed showing the current balance of 4,940.00 USDT.

**Database State (Verified)**:
```sql
SELECT investor_id, fund_id, fund_class, shares, current_value, cost_basis
FROM investor_positions
WHERE investor_id = (SELECT id FROM profiles WHERE email = 'qa.investor@indigo.fund');

Result: 1 row
- fund_id: 8ef9dc49-e76c-4882-84ab-a449ef4326db (IND-USDT)
- fund_name: Stablecoin Fund
- current_value: 4,940.00 USDT
- cost_basis: 4,900.00 USDT
```

**Root Cause Analysis**:
The duplicate is NOT in the database—it's in the frontend rendering logic. Investigation shows:

1. `investor_positions` table has only ONE position (4,940 USDT) ✅
2. `investor_fund_performance` table has only ONE record (mtd_ending_balance: 5,000 USDT) ⚠️
3. The `performanceService.getPerAssetStats()` function is supposed to override the stale performance record's ending balance with the live position balance
4. **HYPOTHESIS**: The override logic on line 182-183 of performanceService.ts is not working correctly, OR there's a mismatch in the fundName between the performance record and the live position

**Code Location**: `/src/services/shared/performanceService.ts:140-272`

**Impact**: HIGH
- Confuses investors about their actual balance
- Shows stale data from performance records alongside live data
- Breaks user trust in the platform

**Screenshots**:
- `tests/qa/screenshots/investor-dashboard-STILL-SHOWING-DUPLICATES.png`
- `tests/qa/screenshots/investor-overview-two-fund-cards.png`
- `tests/qa/screenshots/investor-portfolio-duplicate-positions.png`

---

### 2. Portfolio Page ❌ FAILED

**Test URL**: https://indigo-yield-platform-v01.lovable.app/investor/portfolio

**Observed Behavior**:
The Portfolio table shows "2 ASSETS" in the header, indicating the same duplicate issue affects the portfolio view.

**Browser Snapshot Data**:
```yaml
- heading "All Positions" [level=2]:
  - generic: 2 ASSETS
- table with 2 rows:
  1. USDT Stablecoin Fund - 5,000.00 USDT
  2. USDT Stablecoin Fund - 4,940.00 USDT
```

**Expected**: Should show "1 ASSET" with a single row for 4,940.00 USDT

---

### 3. IB Portal ✅ PASSED

**Test Account**: `qa.ib@indigo.fund` / `QaTest2026!`
**Test URL**: https://indigo-yield-platform-v01.lovable.app/ib

**Observed Behavior**: ✅ All correct
- Total Referrals: 1 (correct - QA Investor)
- Pending Commissions: 2.50 USDT (correct - 5% of 50 USDT deposit)
- Period Earnings (All Time): 2.50 USDT (correct)
- Commissions by Token: USDT - Pending: 2.50 USDT, Paid: 0.00 USDT (correct)
- Top Referrals: #1 QA Investor - 2.50 USDT (correct)

**Screenshots**:
- `tests/qa/screenshots/ib-dashboard-after-fix.png`

**Assessment**: IB portal is functioning correctly. Commission calculations are accurate.

---

### 4. Admin Portal ⚠️ PARTIAL

**Test Account**: `qa.admin@indigo.fund` / `QaTest2026!`
**Test URL**: https://indigo-yield-platform-v01.lovable.app/admin

**Observed Behavior**:
- Command Center loaded successfully
- Fund Financials section shows IND-USDT with 4,940.00 USDT AUM (correct)
- System shows "2 pending" reports (expected)
- Risk Analysis tabs visible (Liquidity, Concentration, Platform Metrics)

**Data Integrity Page**:
- URL: https://indigo-yield-platform-v01.lovable.app/admin/integrity
- Status: "No check results yet" - integrity checks were not run during this session
- Note: Previous session dismissed stale alerts, but checks should be run to verify current state

**Screenshots**:
- `tests/qa/screenshots/admin-dashboard-after-fix.png`
- `tests/qa/screenshots/admin-data-integrity.png`

**Assessment**: Admin portal displays correctly. The AUM value of 4,940 USDT matches the correct database state, suggesting admin queries use a different code path than investor queries.

---

## Technical Investigation

### Database Queries Executed

1. **Investor Positions**:
```sql
SELECT ip.investor_id, ip.fund_id, ip.fund_class, ip.shares, ip.current_value, ip.cost_basis, ip.updated_at, f.code as fund_code, f.name as fund_name
FROM investor_positions ip
LEFT JOIN funds f ON ip.fund_id = f.id
WHERE ip.investor_id = (SELECT id FROM profiles WHERE email = 'qa.investor@indigo.fund')
ORDER BY ip.updated_at;

Result: 1 row (4,940 USDT) ✅
```

2. **Performance Records**:
```sql
SELECT ifp.investor_id, ifp.fund_name, ifp.period_id, ifp.mtd_ending_balance, sp.period_name, sp.period_end_date, ifp.created_at
FROM investor_fund_performance ifp
LEFT JOIN statement_periods sp ON ifp.period_id = sp.id
WHERE ifp.investor_id = (SELECT id FROM profiles WHERE email = 'qa.investor@indigo.fund')
ORDER BY sp.period_end_date DESC, ifp.created_at DESC
LIMIT 10;

Result: 1 row
- fund_name: "Stablecoin Fund"
- mtd_ending_balance: 5,000.00 (STALE - not updated after withdrawal)
```

3. **Funds Table**:
```sql
SELECT id, code, name, asset, fund_class
FROM funds
WHERE name = 'Stablecoin Fund' OR code = 'IND-USDT' OR asset = 'USDT'
ORDER BY name;

Result: 1 row (no duplicates) ✅
```

### Code Analysis

**File**: `/src/services/shared/performanceService.ts`

**Function**: `getPerAssetStats(userId: string)`

**Line 141-144**: Fetches both performance records and live positions
```typescript
const [records, livePositions] = await Promise.all([
  this.getInvestorPerformance({ userId }),
  getInvestorPositions(userId).catch(() => []),
]);
```

**Line 161-163**: Creates map of live balances by fund name
```typescript
const liveBalanceByAsset = new Map<string, number>();
livePositions.forEach((pos) => {
  liveBalanceByAsset.set(pos.fundName, pos.currentValue);
});
```

**Line 166-172**: Gets latest performance record for each fund
```typescript
const latestByFund = new Map<string, PerformanceRecord>();
records.forEach((rec) => {
  if (!latestByFund.has(rec.fund_name)) {
    latestByFund.set(rec.fund_name, rec);
  }
});
```

**Line 176-222**: Maps performance records to stats, using live balance as override
```typescript
const perAssetStats = Array.from(latestByFund.values())
  .filter((rec) => {
    const live = liveBalanceByAsset.get(rec.fund_name);
    return (live != null && live > 0) || Number(rec.mtd_ending_balance || 0) > 0;
  })
  .map((rec) => {
    const liveBalance = liveBalanceByAsset.get(rec.fund_name);
    const endingBalance = liveBalance ?? Number(rec.mtd_ending_balance || 0);
    // ... returns stat object with endingBalance
  });
```

**Line 224-266**: Adds live positions that have no performance record
```typescript
const fundsInStats = new Set(perAssetStats.map((s) => s.fundName));
livePositions.forEach((pos) => {
  if (pos.currentValue > 0 && !fundsInStats.has(pos.fundName)) {
    perAssetStats.push({
      fundName: pos.fundName,
      assetSymbol: pos.asset,
      // ... creates new stat object
    });
  }
});
```

**ISSUE HYPOTHESIS**:
The logic *appears* correct - it should override the performance record's ending balance with the live position balance. However, the UI is showing two cards, which means either:

1. The `fundName` from the performance record ("Stablecoin Fund") doesn't match the `fundName` from the live position, OR
2. The override is not being applied correctly, OR
3. The performance record is being added twice to the array

**NEXT STEPS**:
1. Add logging to see what fundName values are being used
2. Check if the position's fundName is "Stablecoin Fund" or "USDT Fund"
3. Verify the override logic is actually being executed
4. Consider updating the investor_fund_performance record when withdrawals occur

---

## Recommendations

### Immediate Actions (P0 - Critical)

1. **Fix Duplicate Fund Cards**
   - Investigate why `liveBalance` override is not working
   - Add deduplication logic to ensure only one card per fund
   - Consider updating performance records when transactions occur
   - Add unit tests for `getPerAssetStats()` function

2. **Update Performance Records**
   - The `investor_fund_performance.mtd_ending_balance` should be updated when withdrawals occur
   - Currently showing 5,000 USDT (stale) instead of 4,940 USDT (current)
   - This might be a trigger issue or RPC logic gap

### Short-term Actions (P1 - High)

3. **Add Data Validation**
   - Create integrity check that compares investor_positions.current_value vs investor_fund_performance.mtd_ending_balance
   - Alert when they diverge by more than a tolerance threshold

4. **Improve Test Coverage**
   - Add Playwright E2E test that verifies only one fund card per position
   - Add test that checks performance records update after transactions

### Long-term Actions (P2 - Medium)

5. **Consider Architecture Change**
   - Investor dashboard should always use live position data as source of truth
   - Performance records should be for historical snapshots only
   - Separate "current balance" (live) from "period performance" (historical)

---

## Test Artifacts

### Screenshots
- `/tests/qa/screenshots/lovable-login-redirect.png` - Initial redirect issue
- `/tests/qa/screenshots/ib-dashboard-after-fix.png` - IB portal (PASSED)
- `/tests/qa/screenshots/investor-dashboard-STILL-SHOWING-DUPLICATES.png` - Duplicate issue (FAILED)
- `/tests/qa/screenshots/investor-overview-two-fund-cards.png` - Both cards visible (FAILED)
- `/tests/qa/screenshots/investor-portfolio-duplicate-positions.png` - Portfolio view (FAILED)
- `/tests/qa/screenshots/investor-portfolio-scrolled.png` - Portfolio scrolled view
- `/tests/qa/screenshots/admin-dashboard-after-fix.png` - Admin Command Center (PASSED)
- `/tests/qa/screenshots/admin-data-integrity.png` - Data Integrity page

### Test Data
- Investor: qa.investor@indigo.fund (UUID: 7a796560-b35d-4d02-af4b-2cf1641c0830)
- Position: IND-USDT (fund_id: 8ef9dc49-e76c-4882-84ab-a449ef4326db)
- Current Value: 4,940.00 USDT
- Stale Performance Record: 5,000.00 USDT

---

## Conclusion

While the previous session successfully:
- ✅ Dropped 5 duplicate RPC overloads
- ✅ Fixed performanceService.ts logic (code level)
- ✅ Dismissed stale data integrity alerts

**The UI still shows duplicate fund cards**, indicating the fix was incomplete or incorrect. The database state is correct (only one position exists), but the frontend rendering creates two cards from a combination of:
1. Stale performance record (5,000 USDT)
2. Live position data (4,940 USDT)

**This is a CRITICAL bug that must be fixed before the platform can be considered production-ready.**

**Recommended Next Step**: Debug the `getPerAssetStats()` function with actual runtime data to see why the fundName matching and balance override logic isn't working as expected.

---

**Report Generated**: 2026-02-02 07:30 UTC
**Test Session Duration**: ~15 minutes
**Tools Used**: Playwright MCP (browser automation), Supabase SQL queries
**Test Status**: ❌ FAILED - Critical bug found
