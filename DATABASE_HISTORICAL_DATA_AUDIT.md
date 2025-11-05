# Database Historical Data Audit Report

**Date:** January 2025
**Purpose:** Audit Supabase database for historical monthly investor data

---

## Executive Summary

✅ **Historical data structure EXISTS** - The `investor_monthly_reports` table is already in place
⚠️ **Data is EMPTY** - All records have zero balances (skeleton records only)
✅ **Statements table EXISTS** - Has proper schema but NO data records
📊 **Coverage:** 27 investors, 6 assets (BTC, ETH, SOL, USDT, USDC, EURC), 4 months (Jun-Sep 2024)

---

## Key Findings

### 1. `investor_monthly_reports` Table

**Status:** ✅ Table exists with correct schema
**Records:** 648 total records (27 investors × 6 assets × 4 months)
**Date Range:** June 2024 - September 2024
**Problem:** ⚠️ ALL RECORDS HAVE ZERO BALANCES

**Schema:**
```sql
- id: uuid (primary key)
- investor_id: uuid (references investors table)
- report_month: date (first day of month)
- asset_code: text (BTC, ETH, SOL, USDT, USDC, EURC)
- opening_balance: numeric(28,10)
- closing_balance: numeric(28,10)
- additions: numeric(28,10)
- withdrawals: numeric(28,10)
- yield_earned: numeric(28,10)
- aum_manual_override: numeric(28,10)
- entry_date: date
- exit_date: date
- created_at: timestamp
- updated_at: timestamp
- edited_by: uuid
```

**Sample Data (Sep 2024, SOL):**
```
Opening: 0.0000000000
Closing: 0.0000000000
Additions: 0.0000000000
Withdrawals: 0.0000000000
Yield: 0.0000000000
```

**Exception:** Only Sep 2024 SOL has ONE investor with actual data:
- Opening: 23.0 SOL
- Closing: 24.0 SOL
- Yield: 1.0 SOL

### 2. `statements` Table

**Status:** ✅ Table exists with correct schema
**Records:** ⚠️ ZERO records (completely empty)
**Schema:** Matches required report format exactly

**Schema:**
```sql
- id: uuid
- user_id: uuid (NOT investor_id!)
- period_year: integer
- period_month: integer
- asset_code: enum (SOL, BTC, ETH, USDC, USDT, EURC)
- begin_balance: numeric
- additions: numeric
- redemptions: numeric
- net_income: numeric
- end_balance: numeric
- rate_of_return_mtd: numeric
- rate_of_return_qtd: numeric
- rate_of_return_ytd: numeric
- rate_of_return_itd: numeric
- storage_path: text (for PDF)
- file_path: text
- signed_url: text
- url_expires_at: timestamp
- created_at: timestamp
- year: integer (duplicate?)
- month: integer (duplicate?)
- fund_code: text
```

**Important Note:** Uses `user_id` instead of `investor_id`

### 3. Investors

**Total Investors:** 27 active investors in the database

---

## Comparison: Database vs PDF Report

### PDF Report (October 2025) Shows:
- **Real investor names:** Luis Jose Molla, Babak Eftekhari, etc.
- **Real balances:**
  - BTC: 3.6967, 60.9061 ETH, etc.
  - Actual additions, withdrawals, yields
  - Rate of returns (0.27%, 0.64%, etc.)
- **Multiple funds per investor**
- **Different start dates** (FROM 08/2023, FROM 10/2025)

### Database Currently Has:
- ⚠️ Skeleton records with all zeros
- ⚠️ No actual financial data
- ⚠️ No historical monthly data from PDF

---

## Critical Issues Identified

### 🚨 Issue #1: Historical Data Not in Database
The PDF shows October 2025 data for 28+ investors, but the database only has:
- Empty records for Jun-Sep 2024
- NO data for Oct 2024 - Oct 2025 (15 months missing!)

### 🚨 Issue #2: Two Tables, Unclear Purpose
- `investor_monthly_reports` - Has some structure, all zeros
- `statements` - Completely empty
- Both have similar schemas but different column names

### 🚨 Issue #3: Table Schema Mismatch
- `statements` uses `user_id` (auth user)
- `investor_monthly_reports` uses `investor_id` (investor record)
- Both should probably use `investor_id`

---

## Data Migration Requirements

To make the platform match the PDF reports, we need to:

### Phase 1: Import Historical Data (Jun 2024 - Oct 2025)
1. **Source:** PDF reports from team
2. **Destination:** `investor_monthly_reports` table
3. **Months:** June 2024 through October 2025 (17 months)
4. **Format:** Manual data entry by admin team

### Phase 2: Create Admin Data Entry Interface
1. Month selector (dropdown)
2. Investor selector (dropdown or table view)
3. Per-fund entry fields:
   - Asset (BTC/ETH/SOL/USDT)
   - Beginning Balance
   - Additions (deposits)
   - Redemptions (withdrawals)
   - Net Income (yield)
   - Ending Balance (auto-calculated)
   - Rate of Return (auto-calculated)

### Phase 3: Enable Historical Access for Investors
1. Query `investor_monthly_reports` for logged-in investor
2. Display all historical months available
3. Group by asset/fund
4. Show MTD, QTD, YTD, ITD calculations

---

## Recommended Data Structure

### Single Source of Truth: `investor_monthly_reports`

**Why?**
- Already has correct schema
- Uses `investor_id` (proper foreign key)
- Has all required fields for PDF report
- Includes `edited_by` for audit trail

**Keep `statements` table for:**
- PDF storage (after generation)
- Signed URLs for downloads
- Archive of generated reports

---

## Action Plan

### ✅ Step 1: Audit Complete
- Identified both tables
- Confirmed schema matches requirements
- Identified data gaps (all zeros)

### 🔄 Step 2: Create Admin Interface (NEXT)
- Monthly data entry form
- Bulk import capability
- Edit/update existing records
- Validation rules

### ⏳ Step 3: Historical Data Import
- Team enters historical data from PDFs
- Jun 2024 - Oct 2025 (17 months)
- All 27+ investors
- All 4-6 funds per investor

### ⏳ Step 4: Investor Access
- Update StatementsPage.tsx to read from `investor_monthly_reports`
- Add filtering by year/month/asset
- Display historical data in cards
- PDF download (generate on-demand)

### ⏳ Step 5: Remove Automated Features
- Remove DailyAUMManagement.tsx (daily input)
- Remove automated yield calculations
- Remove fee management
- Keep only monthly manual entry

---

## Database Schema Recommendations

### Keep as-is:
```sql
investor_monthly_reports (
  id,
  investor_id,           -- ✅ Correct FK
  report_month,          -- ✅ First day of month
  asset_code,            -- ✅ BTC, ETH, SOL, USDT, USDC, EURC
  opening_balance,       -- ✅ Beginning balance
  closing_balance,       -- ✅ Ending balance
  additions,             -- ✅ Deposits
  withdrawals,           -- ✅ Redemptions
  yield_earned,          -- ✅ Net income
  aum_manual_override,   -- ✅ Admin override
  entry_date,            -- ✅ Fund start date
  exit_date,             -- ✅ Fund exit date
  edited_by,             -- ✅ Audit trail
  created_at,
  updated_at
)
```

### Add indexes for performance:
```sql
CREATE INDEX idx_reports_investor_month ON investor_monthly_reports(investor_id, report_month DESC);
CREATE INDEX idx_reports_month_asset ON investor_monthly_reports(report_month, asset_code);
```

---

## Conclusion

✅ **Good News:** Database structure is already correct
⚠️ **Challenge:** All historical data needs to be manually entered
🎯 **Solution:** Build admin interface for monthly data entry
📊 **Result:** Platform will generate reports from manually-entered data (matching current business process)

**Next Steps:**
1. Build admin monthly data entry interface
2. Import historical data (team effort)
3. Update investor access to show historical reports
4. Remove daily/automated features
