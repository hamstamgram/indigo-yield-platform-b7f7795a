# Investor Portal Test Report
**Date**: 2026-01-27
**Tester**: Claude AI
**Test Account**: qa.investor@indigo.fund

## Executive Summary

The QA investor account has been successfully created with proper data in the database, but the Investor Portal UI is not displaying positions because it relies on the `investor_fund_performance` table which is only populated during yield distribution cycles.

## Test Credentials Used
- **Email**: qa.investor@indigo.fund
- **Password**: QaTest2026!
- **Profile ID**: 7a796560-b35d-4d02-af4b-2cf1641c0830

## Database Verification

### ✅ Profile Data
```sql
SELECT * FROM profiles WHERE email = 'qa.investor@indigo.fund';
```
**Result**: Profile exists with correct data:
- ID: 7a796560-b35d-4d02-af4b-2cf1641c0830
- Name: QA Investor
- Status: active
- Account Type: investor
- IB Parent: e6571dc6-dcc8-4bbe-aa96-cb813c91cee3 (QA IB)
- IB Commission: 5%

### ✅ Position Data
```sql
SELECT * FROM investor_positions WHERE investor_id = '7a796560-b35d-4d02-af4b-2cf1641c0830';
```
**Result**: Position exists with correct data:
- Fund: IND-USDT (Stablecoin Fund)
- Shares: 5000.0000
- Cost Basis: 5000.0000
- Current Value: 5000.0000
- Is Active: true

### ✅ Transaction Data
```sql
SELECT * FROM transactions_v2 WHERE investor_id = '7a796560-b35d-4d02-af4b-2cf1641c0830';
```
**Result**: Deposit transaction exists:
- Type: DEPOSIT
- Amount: 5000.0000 USDT
- Transaction Date: 2025-12-01
- Value Date: 2025-12-01
- Reference: qa_test_deposit_de94ade8-021d-48d0-9a81-29daf93fb935
- Notes: "QA Test deposit for investor portal testing"

### ❌ Performance Data
```sql
SELECT * FROM investor_fund_performance WHERE investor_id = '7a796560-b35d-4d02-af4b-2cf1641c0830';
```
**Result**: NO RECORDS FOUND

This is the root cause of the issue.

## UI Test Results

### 1. Login ✅
- Successfully logged in with QA investor credentials
- Redirected to investor portal (/investor)
- Proper authentication and session management

### 2. Dashboard ❌
**URL**: `/investor`

**Issue**: Shows "No active positions found"

**Root Cause**: The `InvestorOverviewPage` component uses the `usePerAssetStats()` hook, which queries the `investor_fund_performance` table via `performanceService.getPerAssetStats()`. Since no performance records exist for this investor, the query returns an empty array.

**Code Path**:
```
InvestorOverviewPage.tsx
  → usePerAssetStats() hook
  → performanceService.getPerAssetStats(userId)
  → performanceService.getInvestorPerformance({ userId })
  → queries investor_fund_performance table
  → filters by mtd_ending_balance > 0
  → returns empty array (no records)
```

**Expected vs Actual**:
- Expected: Display 5000 USDT position from `investor_positions` table
- Actual: Displays "No active positions found"

### 3. Portfolio ❌
**URL**: `/investor/portfolio`

**Issue**: Shows "0 ASSETS" and "No Positions Found"

**Root Cause**: Same as dashboard - relies on `investor_fund_performance` table

### 4. Transactions ⚠️ (Not Tested)
**URL**: `/investor/transactions`
Browser session closed before completing this test. Need to retry.

### 5. Performance ⚠️ (Not Tested)
**URL**: `/investor/performance`
Not tested yet.

### 6. Yield History ⚠️ (Not Tested)
**URL**: `/investor/yield-history`
Not tested yet.

### 7. Statements ⚠️ (Not Tested)
**URL**: `/investor/statements`
Not tested yet.

### 8. Documents ⚠️ (Not Tested)
**URL**: `/investor/documents`
Not tested yet - this page had a 500 error in previous reports.

### 9. Settings ⚠️ (Not Tested)
**URL**: `/investor/settings`
Not tested yet.

## Root Cause Analysis

The Investor Portal has an architectural design issue where it assumes that all active positions will have corresponding records in the `investor_fund_performance` table. However, this table is only populated during monthly yield distribution cycles.

### When Performance Records Are Created
The `investor_fund_performance` table is populated by:
1. Monthly statement generation process
2. Yield distribution operations
3. Performance calculation jobs

### The Problem
New investors or investors with recent deposits will have:
- ✅ Records in `investor_positions` table (current state)
- ✅ Records in `transactions_v2` table (transaction history)
- ❌ NO records in `investor_fund_performance` table (until first yield cycle)

This means their positions won't display in the UI until the first performance calculation runs.

## Recommended Fixes

### Option 1: Fallback to investor_positions (RECOMMENDED)
Modify the dashboard and portfolio pages to:
1. First query `investor_fund_performance` for historical data
2. If no records found, fallback to querying `investor_positions` directly
3. Display current position data even without performance history

### Option 2: Auto-generate Initial Performance Record
When a new position is created (via deposit), automatically create an initial record in `investor_fund_performance` with:
- Beginning balance: 0
- Ending balance: deposit amount
- Net income: 0
- Rate of return: 0%

This would ensure the position displays immediately.

### Option 3: Use investor_positions for Current View
Create a separate "Current Positions" section that always queries `investor_positions` directly, while keeping the performance-based views for historical data.

## Action Items

1. **HIGH PRIORITY**: Fix dashboard and portfolio to display positions from `investor_positions` when no performance records exist
2. **MEDIUM PRIORITY**: Complete remaining UI tests (Transactions, Performance, Yield History, Statements, Documents, Settings)
3. **LOW PRIORITY**: Consider auto-generating initial performance records on deposit creation
4. **DOCUMENTATION**: Update developer documentation to explain the difference between `investor_positions` (current state) and `investor_fund_performance` (historical/calculated)

## Screenshots Captured

1. `/tmp/playwright-output/investor-portal-blank.png` - Login page before credentials entered
2. `/tmp/playwright-output/1-investor-dashboard.png` - Dashboard showing "No active positions" error
3. `/tmp/playwright-output/2-investor-portfolio.png` - Portfolio showing "0 ASSETS" error

## Test Data Summary

| Item | Status | Details |
|------|--------|---------|
| Profile Created | ✅ | qa.investor@indigo.fund |
| Position Created | ✅ | 5000 USDT in IND-USDT |
| Transaction Created | ✅ | DEPOSIT of 5000 USDT on 2025-12-01 |
| Performance Record | ❌ | Not created - causes UI to show no positions |
| UI Displays Position | ❌ | Dashboard and Portfolio show empty state |

## Conclusion

The data setup is correct, but the UI architecture has a flaw where it only displays positions that have performance records. This is a code issue, not a data issue. The investor has a valid 5000 USDT position, but it's not visible in the UI until a performance calculation cycle runs.

This should be fixed by implementing Option 1 (fallback to investor_positions) or Option 3 (separate current positions view) to ensure positions are always visible regardless of performance calculation status.
