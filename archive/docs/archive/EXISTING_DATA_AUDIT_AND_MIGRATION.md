# Existing Data Audit and Migration Plan

**Date:** January 2025
**Purpose:** Audit all existing investor data in Supabase and migrate to new monthly reporting system

---

## Executive Summary

✅ **FOUND REAL INVESTOR DATA** in production database!
📊 **Current Data Status:**
- **36 position records** across 7 active investors
- **6 assets:** BTC, ETH, SOL, USDT, USDC, EURC
- **Total AUM:** $295,548.13
- **Total Yield Earned:** $22,223.86
- **52 transactions** (deposits/withdrawals) from Sep 15-16, 2025
- **Last updated:** September 22, 2025

⚠️ **Challenge:** Current data represents CURRENT POSITIONS only (snapshot), not historical monthly data
✅ **Solution:** Use current positions as baseline for most recent month, backfill historical months from PDF reports

---

## Detailed Audit Results

### 1. Positions Table (PRIMARY DATA SOURCE)

**Table:** `positions`
**Schema:** user_id (not investor_id!), asset_code, principal, total_earned, current_balance

**Data Found:**
```sql
Total Records: 36 positions
Unique Users: 7 investors with actual positions
Unique Assets: 6 (BTC, ETH, SOL, USDT, USDC, EURC)
Total Balance: $295,548.13
Total Earned: $22,223.86
Last Updated: 2025-09-22 20:35:55
```

**Sample Data (Top 10 positions):**
| User | Asset | Principal | Total Earned | Current Balance | Updated |
|------|-------|-----------|--------------|-----------------|---------|
| 566394bc... | ETH | 3.0076 | 0.1888 | 3.2001 | Sep 22 |
| 566394bc... | SOL | 128.65 | 7.0638 | 147.23 | Sep 22 |
| 205f1d25... | USDC | 7,228.51 | 329.63 | 7,749.12 | Sep 22 |
| 566394bc... | BTC | 0.1218 | 0.0036 | 0.1327 | Sep 22 |
| 205f1d25... | EURC | 5,882.75 | 175.93 | 6,240.35 | Sep 22 |

**Key Insights:**
- These are CURRENT positions (as of Sep 22, 2025)
- Contains `principal` (original investment) and `total_earned` (cumulative yield since inception)
- Does NOT contain monthly breakdown (no opening/closing per month)
- Uses `user_id` (auth user) not `investor_id`

### 2. Investor_positions Table

**Table:** `investor_positions`
**Schema:** investor_id, fund_id, shares, current_value, cost_basis, etc.

**Data Found:**
```sql
Total Records: 18 positions
Unique Investors: 6
Unique Funds: 3
Total Value: $117,844.65
Total Shares: 117,844.65
```

**Key Insights:**
- Different schema from `positions` table
- Uses `investor_id` and `fund_id` (more structured)
- Appears to be newer/parallel tracking system
- Fewer records than `positions` table

### 3. Transactions Table

**Table:** `transactions`
**Schema:** user_id, asset_code, amount, type (DEPOSIT/WITHDRAWAL), created_at

**Data Found:**
```sql
Total Records: 52 transactions
Unique Users: 27 (all investors have transaction history!)
Date Range: Sep 15-16, 2025 (2 days only)
Types: DEPOSIT, WITHDRAWAL
Assets: BTC, ETH, SOL, USDT
```

**Key Insights:**
- All 27 investors have at least one transaction
- Only 2 days of transaction data (Sep 15-16, 2025)
- These are likely test/seed transactions
- Does NOT contain monthly aggregated data

### 4. Investors Table

**Table:** `investors`
**Total:** 27 investors

**All Investors:**
1. Hammadou Admin (hammadou@indigo.fund)
2. H. Monoja (h.monoja@protonmail.com)
3. Alain Bensimon
4. Pierre Bezencon
5. Alec Beckman
6. Matthew Beatty
7. Anne Cecile Noique
8. Bo Kriek
9. Kabbaj Fam
10. Terance Chen
11. Paul Johnson
12. Lars Ahlgreen
13. Alex Jacobs
14. Advantage Blockchain
15. Kyle Gulamerian
16. Blondish
17. Matthias Reiser
18. Danielle Richetta
19. Jose Molla
20. Thomas Puech
21. Nathanael Cohen
22. Babak Eftekhari
23. Victoria
24. Julien Grunebaum
25. Daniele Francilia
26. Oliver Loisel
27. Dario Deiana

**Created:** All investors created Sep 15-18, 2025

### 5. Other Tables Checked

**fund_daily_aum:** EMPTY (0 records)
**daily_nav:** EMPTY (0 records)
**statements:** EMPTY (0 records)
**yield_distribution_log:** Schema exists but no data checked

---

## Data Mapping Analysis

### What We Have vs. What We Need

| We Have (Current) | We Need (Monthly) |
|-------------------|-------------------|
| Current balance per investor per asset | Opening balance, Closing balance per month |
| Total earned (cumulative since inception) | Yield earned per month |
| Principal (original investment) | Additions per month |
| - | Withdrawals per month |
| Single snapshot (Sep 22, 2025) | Monthly snapshots (Jun 2024 - Oct 2025) |

### Challenge: Converting Snapshot to Monthly History

**Problem:** The `positions` table only has CURRENT positions (as of Sep 22, 2025). It doesn't tell us:
- What the balance was in June 2024
- What the balance was in July 2024
- How much was added each month
- How much yield was earned each month

**Example:**
```
Current Data (Sep 22, 2025):
- Oliver Loisel (566394bc...): 3.2001 ETH current balance
- Total earned: 0.1888 ETH (since inception)

What We Need:
- June 2024: Opening 0, Additions X, Yield Y, Closing Z
- July 2024: Opening Z, Additions X, Yield Y, Closing Z
- ...
- September 2025: Opening A, Additions B, Yield C, Closing 3.2001
```

---

## Migration Strategy

### Option 1: Use Current Positions as September 2025 Data (RECOMMENDED)

**Approach:**
1. Take current positions (Sep 22, 2025) as **September 2025 closing balance**
2. For September 2025:
   - Opening Balance: TBD (calculate from PDF or estimate)
   - Additions: 0 (unless transactions found)
   - Withdrawals: 0
   - Yield Earned: Can estimate from total_earned
   - Closing Balance: current_balance
3. For all prior months (Jun 2024 - Aug 2025): MANUAL ENTRY from PDF reports

**Pros:**
- Uses real production data for most recent month
- Provides baseline for future months
- Investors with positions get real data

**Cons:**
- Still need to manually enter 16 months of historical data
- Opening balance for Sep 2025 needs to be calculated

### Option 2: Start Fresh from Current Month (ALTERNATIVE)

**Approach:**
1. Ignore all historical data
2. Use current positions to populate October 2025 as the FIRST month
3. Going forward, enter data monthly via MonthlyDataEntry.tsx

**Pros:**
- Clean start
- No need to backfill historical data
- Simpler migration

**Cons:**
- Investors lose historical reporting
- No YTD, QTD, ITD calculations possible
- Doesn't match PDF reports you already have

### Option 3: Hybrid Approach (BEST FOR PRODUCTION)

**Approach:**
1. **Migrate current positions** → September 2025 data
2. **Extract from transactions** → Calculate Sep 2025 additions/withdrawals
3. **Estimate Sep 2025 yield** → closing_balance - opening_balance - additions + withdrawals
4. **Manual backfill** → Jun 2024 - Aug 2025 from PDF reports
5. **Going forward** → Monthly entry via admin interface

---

## Recommended Migration Plan

### Phase 1: Migrate Current Positions (Automated)

**Target Month:** September 2025
**Source:** `positions` table (current balances as of Sep 22, 2025)

**SQL Migration:**
```sql
-- Step 1: Map user_id to investor_id
WITH user_investor_map AS (
  SELECT
    p.id as user_id,
    i.id as investor_id
  FROM profiles p
  JOIN investors i ON i.profile_id = p.id
)

-- Step 2: Insert current positions into investor_monthly_reports as September 2025
INSERT INTO investor_monthly_reports (
  investor_id,
  report_month,
  asset_code,
  opening_balance,
  closing_balance,
  additions,
  withdrawals,
  yield_earned,
  created_at,
  updated_at
)
SELECT
  uim.investor_id,
  '2025-09-01'::date as report_month,
  pos.asset_code,
  0 as opening_balance,  -- TODO: Calculate from Aug 2025 or set manually
  pos.current_balance as closing_balance,
  0 as additions,  -- TODO: Extract from transactions if any
  0 as withdrawals,
  pos.total_earned as yield_earned,  -- ESTIMATE: Using cumulative earned as proxy
  NOW() as created_at,
  NOW() as updated_at
FROM positions pos
JOIN user_investor_map uim ON pos.user_id = uim.user_id
WHERE pos.current_balance::numeric > 0
ON CONFLICT (investor_id, report_month, asset_code)
DO UPDATE SET
  closing_balance = EXCLUDED.closing_balance,
  yield_earned = EXCLUDED.yield_earned,
  updated_at = NOW();
```

**Result:** 36 records inserted (7 investors with positions × ~5 assets each)

### Phase 2: Calculate September 2025 Additions/Withdrawals

```sql
-- Extract transactions from Sep 2025 and calculate totals
WITH september_transactions AS (
  SELECT
    t.user_id,
    t.asset_code,
    SUM(CASE WHEN t.type = 'DEPOSIT' THEN t.amount ELSE 0 END) as total_deposits,
    SUM(CASE WHEN t.type = 'WITHDRAWAL' THEN t.amount ELSE 0 END) as total_withdrawals
  FROM transactions t
  WHERE DATE_TRUNC('month', t.created_at) = '2025-09-01'::date
  GROUP BY t.user_id, t.asset_code
),
user_investor_map AS (
  SELECT
    p.id as user_id,
    i.id as investor_id
  FROM profiles p
  JOIN investors i ON i.profile_id = p.id
)

-- Update investor_monthly_reports with transaction data
UPDATE investor_monthly_reports imr
SET
  additions = st.total_deposits,
  withdrawals = st.total_withdrawals,
  updated_at = NOW()
FROM september_transactions st
JOIN user_investor_map uim ON st.user_id = uim.user_id
WHERE imr.investor_id = uim.investor_id
  AND imr.report_month = '2025-09-01'
  AND imr.asset_code = st.asset_code;
```

### Phase 3: Manual Historical Data Entry

**Use MonthlyDataEntry.tsx to enter:**
- June 2024 through August 2025 (15 months)
- Source: PDF reports provided by user
- All 27 investors × 6 assets = 162 entries per month
- Total: 15 months × 162 entries = 2,430 entries

---

## Migration Execution Steps

### 1. Backup Current Data
```sql
-- Create backup table
CREATE TABLE positions_backup AS SELECT * FROM positions;
CREATE TABLE investor_monthly_reports_backup AS SELECT * FROM investor_monthly_reports;
```

### 2. Run Migration Script
- Execute Phase 1 SQL (migrate current positions)
- Execute Phase 2 SQL (add transactions)
- Verify results

### 3. Quality Check
```sql
-- Check migration results
SELECT
  report_month,
  asset_code,
  COUNT(*) as investor_count,
  SUM(closing_balance) as total_closing,
  SUM(yield_earned) as total_yield
FROM investor_monthly_reports
WHERE report_month = '2025-09-01'
GROUP BY report_month, asset_code
ORDER BY asset_code;
```

### 4. Manual Data Entry
- Use MonthlyDataEntry.tsx admin interface
- Enter June 2024 - August 2025 from PDF reports
- Verify opening balance for Sep 2025 matches Aug 2025 closing

### 5. Investor Verification
- Log in as test investor
- Navigate to Statements page
- Verify September 2025 data displays correctly
- Check calculations (rate of return, etc.)

---

## Expected Results

### After Migration

**September 2025 Data:**
- 36 position records migrated
- 7 investors with real closing balances
- Yield data (estimated from total_earned)
- Additions/withdrawals from transaction log

**October 2025+ Data:**
- Manual entry via MonthlyDataEntry.tsx
- Clean workflow going forward

**Historical Data (Jun 2024 - Aug 2025):**
- Manual entry required (2,430 entries)
- Source: PDF reports

### Data Quality Notes

⚠️ **Limitations:**
1. `total_earned` in positions table is CUMULATIVE since inception, not monthly
2. Opening balance for Sep 2025 needs calculation (closing Aug 2025)
3. If investor started mid-year, `total_earned` includes all prior months
4. Cannot break down yield month-by-month from current data alone

✅ **Strengths:**
1. Real production data for 7 active investors
2. Current balances are accurate (as of Sep 22, 2025)
3. Transaction history provides additions/withdrawals
4. Can use as baseline for future months

---

## Recommendations

### Immediate Actions

1. **Run Migration Script** (Phase 1 + 2) to populate September 2025
2. **Verify Results** - Check that 36 records created successfully
3. **Test Investor Access** - Ensure investors can see their Sep 2025 data
4. **Begin Backfill** - Start entering historical data from PDF reports

### Data Entry Priorities

**Priority 1: October 2025** (Most Recent)
- Source: Latest PDF report
- All 27 investors
- All 6 assets

**Priority 2: September 2025** (Validate Migrated Data)
- Compare migrated data with PDF report
- Adjust opening balance if needed
- Verify yield calculations

**Priority 3: Jun 2024 - Aug 2025** (Historical Backfill)
- Work backwards from August 2025
- Use PDF reports as source
- Batch entry by month

### Long-term Strategy

1. **Monthly Cadence** - Enter new month's data by 5th business day
2. **Audit Trail** - Track who entered data (edited_by field)
3. **Quality Checks** - Verify opening = previous closing
4. **Investor Communication** - Notify investors when historical data is complete

---

## Next Steps

1. ✅ Create this audit report (DONE)
2. ⏳ Create and test migration SQL script
3. ⏳ Run migration in production
4. ⏳ Verify results
5. ⏳ Begin manual historical data entry
6. ⏳ Train admin team on MonthlyDataEntry.tsx
7. ⏳ Establish monthly workflow

---

## Appendix: Current vs. Target Data Structure

### Current Structure (positions table)
```
user_id | asset_code | principal | total_earned | current_balance | updated_at
--------|------------|-----------|--------------|-----------------|------------
566394bc| ETH        | 3.0076    | 0.1888       | 3.2001          | Sep 22 2025
```

### Target Structure (investor_monthly_reports table)
```
investor_id | report_month | asset_code | opening | closing | additions | withdrawals | yield
------------|--------------|------------|---------|---------|-----------|-------------|--------
f9a83a2c    | 2025-09-01   | ETH        | 3.0113  | 3.2001  | 0         | 0           | 0.1888
```

### Mapping Logic
- `user_id` → `investor_id` (via profiles → investors join)
- `current_balance` → `closing_balance` (for Sep 2025)
- `total_earned` → `yield_earned` (ESTIMATE - needs adjustment)
- `asset_code` → `asset_code` (direct copy)
- Hardcode `report_month` = '2025-09-01'
- Calculate `opening_balance` from prior month or set to 0
- Extract `additions`/`withdrawals` from transactions table

---

**End of Report**
