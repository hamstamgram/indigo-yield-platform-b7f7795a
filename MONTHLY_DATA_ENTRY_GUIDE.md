# Monthly Data Entry Guide for Admins

**Version:** 1.0
**Date:** January 2025
**Purpose:** Complete guide for entering monthly investor data in the new manual workflow

---

## Overview

The platform has been restructured from **automated daily calculations** to **manual monthly data entry**. This matches your actual business process where monthly reports are prepared from internal records (as shown in the October 2025 PDF).

### What Changed

| Old System | New System |
|------------|------------|
| Daily AUM input | Monthly data entry |
| Automated yield calculations | Manual yield entry |
| Fee management | Removed |
| Generate reports from automated data | View reports from manual data |

---

## Monthly Workflow

### Step 1: Access Monthly Data Entry

1. Log in as admin
2. Navigate to **Monthly Data Entry** (in admin navigation)
3. You'll see the data entry interface

### Step 2: Select Month and Asset

**Month Selector:**
- Use the month picker to select the reporting month
- Format: YYYY-MM (e.g., "2025-10" for October 2025)
- Default: Current month

**Asset Selector:**
- Choose which fund to enter data for:
  - BTC (BTC YIELD FUND)
  - ETH (ETH YIELD FUND)
  - SOL (SOL YIELD FUND)
  - USDT (USDT FUND)
  - USDC (USDC FUND)
  - EURC (EURC FUND)

**Important:** You must enter data separately for each asset. For example, if an investor has positions in BTC, ETH, and SOL, you need to:
1. Select October 2025, BTC → Enter data for all investors
2. Select October 2025, ETH → Enter data for all investors
3. Select October 2025, SOL → Enter data for all investors

### Step 3: Enter Data for All Investors

The table shows all 27 investors. For each investor, enter:

#### Column 1: Opening Balance
- Beginning balance for the month
- Should match previous month's closing balance
- In crypto units (not USD)
- Example: 3.6967 BTC

#### Column 2: Additions
- Deposits made during the month
- In crypto units
- Example: 0.0620 BTC
- If no deposits: enter 0

#### Column 3: Withdrawals
- Redemptions made during the month
- In crypto units
- Example: 0.5000 BTC
- If no withdrawals: enter 0

#### Column 4: Yield Earned
- Net income for the month
- In crypto units
- Calculate this from your internal records
- Example: 0.0101 BTC (which is 0.27% yield)
- Rate of return = (Yield / Opening Balance) × 100

#### Column 5: Closing Balance
- **AUTO-CALCULATED** (you cannot edit this)
- Formula: Opening + Additions - Withdrawals + Yield
- Example: 3.6967 + 0.0620 - 0 + 0.0101 = 3.7688 BTC

#### Column 6: Entry Date (Optional)
- Date the investor started this fund
- Format: YYYY-MM-DD
- Example: 2023-08-15
- Use this to track "FROM 08/2023" as shown in reports

#### Column 7: Exit Date (Optional)
- Date the investor fully exited this fund
- Format: YYYY-MM-DD
- Leave blank if investor is still active

### Step 4: Review Summary Cards

Before saving, check the summary cards at the top:

- **Opening Balance:** Total across all investors
- **Additions:** Total deposits (green)
- **Withdrawals:** Total redemptions (red)
- **Yield Earned:** Total yields (blue)
- **Closing Balance:** Total ending balance

These should match your fund-level totals.

### Step 5: Save All Changes

1. Review all entered data
2. Click **"Save All Changes"** button (top right)
3. Wait for confirmation toast: "Monthly data saved successfully"
4. The "Unsaved changes" warning will disappear

**Important Notes:**
- All data is saved in one transaction
- If there's an error, no data is saved (atomic operation)
- You can edit and re-save anytime
- Each save updates the `edited_by` field for audit trail

---

## Data Entry Best Practices

### 1. Data Accuracy
- Double-check numbers against your source documents (PDF reports)
- Use copy-paste from Excel/CSV if you have data there
- Opening balance MUST match previous month's closing balance

### 2. Monthly Cadence
- Enter data on the first business day of each month
- Complete all assets before moving to the next month
- Start with current month, then backfill historical months

### 3. Historical Data Entry
According to the audit, you need to enter data for:
- **June 2024** through **October 2025**
- **17 months** total
- **6 assets** per month
- **27 investors** per asset
- **Total:** ~2,754 data entries

### 4. Batch Entry Strategy
Recommended order:
1. Start with October 2025 (most recent, in PDF)
2. Work backwards: Sep 2025, Aug 2025, etc.
3. Use the PDF reports as source documents
4. Assign different months to different team members

### 5. Quality Checks
After entering data for a month, verify:
- [ ] All investors have data (27 rows filled)
- [ ] Opening balances match previous month's closing
- [ ] Summary totals look reasonable
- [ ] No negative balances (unless allowed)
- [ ] Closing balances auto-calculated correctly

---

## Using Historical PDF Reports

Your October 2025 PDF shows the exact format needed:

**From PDF:**
```
Luis Jose Molla - BTC YIELD FUND
Beginning Balance: 3.6967 BTC
Additions: 0.0620 BTC
Net Income: 0.0101 BTC
Ending Balance: 3.7688 BTC
Rate of Return: 0.27%
```

**Enter in Platform:**
- Month: 2025-10
- Asset: BTC
- Investor: Luis Jose Molla
- Opening: 3.6967
- Additions: 0.0620
- Withdrawals: 0 (not in PDF, so 0)
- Yield: 0.0101
- Closing: 3.7688 (auto-calculated)

---

## Viewing Reports

After entering data, you can view it in two places:

### 1. Investor Reports (Admin View)
**Path:** Admin → Investor Reports

**What you see:**
- List of all investors
- Which investors have data vs. missing data
- Summary cards: Total Investors, Reports Generated, Missing Reports, Total AUM, Total Yield
- Filter by month and investor name
- View details per investor (all their assets)
- Send reports button (email integration placeholder)

**Use this to:**
- Verify data was entered correctly
- See which investors still need data
- Send monthly reports to investors

### 2. Monthly Statements (Investor View)
**Path:** Investor Portal → Statements

**What investors see:**
- Filter by year and asset
- All their historical monthly statements
- Each statement shows:
  - Beginning Balance
  - Additions (+green)
  - Net Income (+blue)
  - Ending Balance
  - Rate of Return (%)
- Download PDF button (placeholder)

**Use this to:**
- QA your data entry from investor perspective
- Ensure investor experience is correct
- Verify calculations display properly

---

## Troubleshooting

### Problem: "No investors found"
**Solution:** Investors table is empty. Add investors first via Investor Management.

### Problem: "Data not saving"
**Possible causes:**
1. Network error - check connection
2. Missing required fields - ensure all numeric fields have values (or 0)
3. Invalid investor_id - database constraint error

**Check:** Browser console (F12) for error messages

### Problem: "Opening balance doesn't match previous closing"
**Solution:** This is OK for the first month or if there were adjustments. For subsequent months, they should match. If they don't:
1. Check previous month's data
2. Verify no mid-month adjustments
3. Contact accounting team for clarification

### Problem: "Closing balance calculation looks wrong"
**Check the formula:**
- Closing = Opening + Additions - Withdrawals + Yield
- Use a calculator to verify
- Ensure all fields are numbers (not text)

### Problem: "Investor can't see their statements"
**Check:**
1. Data entered for that investor?
2. Investor has valid investor_id in database?
3. investor_id linked to their profile_id?
4. Investor logged in with correct account?

### Problem: "Which table is the source of truth?"
**Answer:** `investor_monthly_reports` is the ONLY source of truth now.
- `statements` table is empty and deprecated
- All queries read from `investor_monthly_reports`
- All data entry writes to `investor_monthly_reports`

---

## Database Schema Reference

**Table:** investor_monthly_reports

| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| investor_id | uuid | Foreign key to investors table |
| report_month | date | First day of month (YYYY-MM-01) |
| asset_code | text | BTC, ETH, SOL, USDT, USDC, EURC |
| opening_balance | numeric(28,10) | Beginning balance |
| closing_balance | numeric(28,10) | Ending balance |
| additions | numeric(28,10) | Deposits |
| withdrawals | numeric(28,10) | Redemptions |
| yield_earned | numeric(28,10) | Net income |
| entry_date | date | Fund start date (optional) |
| exit_date | date | Fund exit date (optional) |
| aum_manual_override | numeric(28,10) | Manual override (rarely used) |
| edited_by | uuid | Last admin who edited |
| created_at | timestamp | Creation timestamp |
| updated_at | timestamp | Last update timestamp |

**Unique Constraint:** (investor_id, report_month, asset_code)
- You cannot have duplicate records for same investor/month/asset
- Upsert operation will update existing records

---

## FAQ

### Q: Do I need to enter data for investors with zero balance?
**A:** Yes, enter all investors with zeros. This helps track "Missing Reports" count and ensures all investors appear in reports even if inactive that month.

### Q: Can I bulk import from CSV?
**A:** Not yet. The "Import CSV" button is disabled (placeholder). You must enter data manually via the table interface.

### Q: Can I edit data after saving?
**A:** Yes! Select the same month/asset, modify values, and save again. The upsert will update existing records.

### Q: What if I make a mistake?
**A:** Just re-enter the correct data and save. The system tracks who edited (audit trail) but doesn't keep version history.

### Q: How do I calculate yield percentage?
**A:** Rate of Return (%) = (Yield Earned / Opening Balance) × 100
Example: (0.0101 / 3.6967) × 100 = 0.27%

### Q: Should I round numbers?
**A:** Keep full precision (8 decimal places for crypto). The system stores numeric(28,10) so 10 decimal places are supported.

### Q: What about MTD, QTD, YTD, ITD?
**A:** Those are calculated dynamically when viewing reports. You only enter monthly data.

### Q: Can investors edit their own data?
**A:** No. Only admins can enter/edit monthly data. Investors have read-only access.

---

## Admin Checklist

Use this checklist each month:

### Monthly Data Entry (1st business day of month)

- [ ] Log in as admin
- [ ] Navigate to Monthly Data Entry
- [ ] Select previous month (e.g., if today is Dec 1, select Nov)
- [ ] Select BTC asset
- [ ] Enter all 27 investors' BTC data
- [ ] Review summary cards (totals look correct?)
- [ ] Save all changes
- [ ] Repeat for ETH asset
- [ ] Repeat for SOL asset
- [ ] Repeat for USDT asset
- [ ] Repeat for USDC asset
- [ ] Repeat for EURC asset

### Report Review (After data entry)

- [ ] Navigate to Investor Reports
- [ ] Select the month just entered
- [ ] Verify "Reports Generated" count = 27
- [ ] Verify "Missing Reports" count = 0
- [ ] Check Total AUM looks reasonable
- [ ] Check Total Yield looks reasonable
- [ ] Click "View Details" on a few investors to spot-check

### Investor QA (Sample check)

- [ ] Log in as test investor (or use your own investor account)
- [ ] Navigate to Statements
- [ ] Select year and asset
- [ ] Verify statement appears for the new month
- [ ] Check all numbers match what you entered
- [ ] Verify rate of return calculation is correct
- [ ] Log out

### Send Reports (When ready)

- [ ] Navigate to Investor Reports
- [ ] Click "Send Reports" button
- [ ] Confirm email sent count
- [ ] (Email integration pending - currently placeholder)

---

## Support

If you encounter issues:

1. **Check Database Audit Report:** DATABASE_HISTORICAL_DATA_AUDIT.md
2. **Review this guide:** MONTHLY_DATA_ENTRY_GUIDE.md
3. **Check browser console:** Press F12, look for errors
4. **Contact development team:** Provide screenshot and error message

---

## Appendix A: Data Migration Plan

To enter 17 months of historical data (Jun 2024 - Oct 2025):

### Option 1: Manual Entry (Time-intensive)
- Estimated time: 2-3 hours per month
- Total: ~40 hours
- Assign to: Multiple team members
- Tools: Web interface only

### Option 2: CSV Import (Future)
- Create CSV template matching table schema
- Populate CSV from Excel/source documents
- Use bulk import feature (when implemented)
- Estimated time: 10-15 hours total

### Option 3: Direct Database Insert (Technical)
- Export data to SQL INSERT statements
- Run via Supabase SQL editor
- Requires SQL knowledge
- Fastest option: ~2-3 hours total
- Risk: No validation, easy to make mistakes

**Recommended:** Option 1 for now (manual entry), then implement CSV import for future use.

---

## Appendix B: Glossary

- **AUM:** Assets Under Management (total investor holdings)
- **MTD:** Month-to-Date
- **QTD:** Quarter-to-Date
- **YTD:** Year-to-Date
- **ITD:** Inception-to-Date (since investor started)
- **Additions:** Deposits, new investments
- **Redemptions/Withdrawals:** Money taken out
- **Net Income:** Yield earned (profit from fund performance)
- **Rate of Return:** Percentage gain for the period
- **Closing Balance:** Ending balance (what investor has at end of month)
- **Opening Balance:** Beginning balance (what investor had at start of month)

---

## Document Version History

- **v1.0 (January 2025):** Initial guide for new monthly data entry system
