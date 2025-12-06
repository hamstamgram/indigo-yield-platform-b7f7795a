# Monthly Investor Workflow & Statement Generation Guide

## Overview

This guide explains how the ULTRATHINK platform handles monthly investor data updates and statement generation. The platform uses a **manual monthly data entry** system where admins input investor performance data once per month, which generates monthly statements visible to investors.

---

## Table of Contents

1. [How It Works - High Level](#how-it-works---high-level)
2. [Admin Monthly Workflow](#admin-monthly-workflow)
3. [How Investors Update Their Assets](#how-investors-update-their-assets)
4. [How Statements Are Generated](#how-statements-are-generated)
5. [How to Preview Statements](#how-to-preview-statements)
6. [Database Schema](#database-schema)
7. [Step-by-Step Example](#step-by-step-example)
8. [Monthly Checklist for Admins](#monthly-checklist-for-admins)

---

## How It Works - High Level

### The Manual Monthly System

**ULTRATHINK does NOT automatically calculate yields or balances.** Instead:

1. **Admin enters data monthly** for each investor, for each asset
2. **Data includes**: Opening balance, additions, withdrawals, yield, closing balance
3. **System validates** the data and stores it in `investor_monthly_reports` table
4. **Investors view** their monthly statements showing all their assets
5. **Rate of return** is calculated automatically from the entered data

### Why Manual Entry?

- Matches actual business workflow (PDF reports generated monthly)
- Admin has full control over what investors see
- No complex automation to maintain
- Audit trail for all changes (who entered/edited data)
- Flexible for different asset types and calculation methods

---

## Admin Monthly Workflow

### Step 1: Navigate to Monthly Data Entry

1. Login as admin
2. Navigate to **Admin > Monthly Data Entry** (`/admin/monthly-data-entry`)
3. You'll see the data entry interface

### Step 2: Select Month and Asset

**Month Selector:**
- Choose the month you're entering data for (e.g., "November 2025")
- Default: Current month
- Can select past months to backfill or edit

**Asset Selector:**
- Choose the asset: BTC, ETH, SOL, USDT, USDC, or EURC
- You'll enter data for all investors for this ONE asset at a time

### Step 3: Enter Data for Each Investor

For each investor, enter 7 columns of data:

| Column | Description | Auto-calculated? |
|--------|-------------|------------------|
| **Opening Balance** | Balance at start of month | No - you enter |
| **Additions** | Deposits made during month | No - you enter |
| **Withdrawals** | Withdrawals made during month | No - you enter |
| **Yield** | Profit earned during month | No - you enter |
| **Closing Balance** | Balance at end of month | **YES - auto-calculated** |
| **Entry Date** | Date investor entered (optional) | No - you enter |
| **Exit Date** | Date investor exited (optional) | No - you enter |

**Closing Balance Formula:**
```
Closing Balance = Opening Balance + Additions - Withdrawals + Yield
```

The closing balance is automatically calculated as you type. You can override it if needed.

### Step 4: Review Summary

At the top of the page, you'll see summary cards:

- **Total Opening Balance**: Sum across all investors
- **Total Additions**: Total deposits this month
- **Total Withdrawals**: Total withdrawals this month
- **Total Yield**: Total profit distributed
- **Total Closing Balance**: Sum of all closing balances

**Quality Check:** Verify these totals match your PDF report.

### Step 5: Save the Data

1. Click **"Save All Changes"** button
2. System validates:
   - Closing balance calculation is correct
   - No negative balances (unless explicitly allowed)
   - All required fields filled
3. Data saved to database
4. Confirmation message displayed

### Step 6: Repeat for Each Asset

1. Select next asset (e.g., switch from BTC to ETH)
2. Enter data for all investors for that asset
3. Save
4. Continue until all 6 assets are complete

---

## How Investors Update Their Assets

**Important: Investors do NOT directly update their own data.**

### The Process

1. **Investor deposits/withdraws** → Transaction happens outside the platform (bank transfer, etc.)
2. **Admin records transaction** → Either manually or via transaction import
3. **End of month** → Admin enters the net effect in "Additions" or "Withdrawals" column
4. **Investor sees statement** → Next month's statement reflects the new balance

### Example Flow

**Scenario:** John wants to add $5,000 to his BTC position mid-month.

1. **John contacts admin** (via support, email, or phone)
2. **John transfers $5,000** to the fund's bank account
3. **Admin verifies receipt** of funds
4. **Admin records transaction** (optional: in transaction log for tracking)
5. **End of month:** Admin enters John's data:
   - Opening Balance: $10,000 (from previous month)
   - **Additions: $5,000** ← John's deposit
   - Withdrawals: $0
   - Yield: $150 (calculated based on when deposit arrived)
   - Closing Balance: $15,150 (auto-calculated)
6. **John logs in next month** and sees his new $15,150 balance on his statement

### Why This Approach?

- **Security**: Investors can't accidentally or maliciously change their balances
- **Accuracy**: Admin verifies all transactions before recording
- **Audit trail**: Admin's name recorded for every data entry
- **Flexibility**: Can handle complex situations (partial month yields, fees, etc.)

---

## How Statements Are Generated

### Automatic Generation

Statements are **NOT generated as PDFs automatically**. Instead:

1. **Data is entered** in Monthly Data Entry page
2. **Data is stored** in database table `investor_monthly_reports`
3. **Investors view** their statements in real-time via web interface
4. **PDFs can be generated** on-demand (future feature)

### What Investors See

When an investor logs in and navigates to **Statements** (`/statements`), they see:

**Statement List View:**
- Grid of all their funds/assets
- For each asset:
  - Asset name and icon (BTC, ETH, etc.)
  - Latest balance
  - Month-to-date yield
  - Year-to-date return percentage
- Filter by year
- Click any asset to see details

**Statement Detail View (for one asset):**
- Full table showing all months
- Columns: Month, Opening, Additions, Withdrawals, Yield, Closing, Rate of Return
- Rate of return calculated: `(Yield / Opening Balance) × 100`
- Sortable by month
- Option to download (placeholder for PDF)

### Data Flow

```
Admin enters data → Database (investor_monthly_reports) → API (Supabase)
                                                              ↓
                                          Investor views statements page
                                                              ↓
                                          React fetches data via useInvestorMonthlyReports hook
                                                              ↓
                                          Displays in StatementsPage.tsx component
```

---

## How to Preview Statements

### As Admin - Preview What Investor Sees

**Method 1: View Investor Reports Page**

1. Navigate to **Admin > Investor Reports** (`/admin/investor-reports`)
2. See list of all investors
3. For each investor, see:
   - Which months have data
   - Which assets have data
   - Status (Complete, Partial, Missing)
4. Click **"View Report"** next to any investor
5. See exactly what that investor sees on their statements page

**Method 2: Check Monthly Data Entry**

1. Navigate to **Admin > Monthly Data Entry**
2. Select the month you just entered
3. Select each asset
4. Review the data in the table
5. Summary cards show totals - verify against your source document

**Method 3: Admin Preview (Future Feature)**

Planned feature: Direct PDF preview before "sending" to investors.

---

### As Investor - View Your Own Statements

1. Login as an investor
2. Navigate to **Statements** from main menu
3. See all your assets in grid view
4. Filter by year (e.g., "2025", "2024")
5. Click any asset card to see monthly detail
6. Table shows all months with data
7. Automatically calculated:
   - Rate of return per month
   - Year-to-date totals
   - Cumulative yield

---

## Database Schema

### investor_monthly_reports Table

| Column | Type | Description | Required |
|--------|------|-------------|----------|
| `id` | UUID | Primary key | Auto |
| `investor_id` | UUID | Foreign key to `investors` table | Yes |
| `asset_code` | TEXT | Asset symbol (BTC, ETH, etc.) | Yes |
| `report_month` | DATE | First day of month (2025-11-01) | Yes |
| `opening_balance` | DECIMAL | Balance at month start | Yes |
| `additions` | DECIMAL | Deposits during month | Default: 0 |
| `withdrawals` | DECIMAL | Withdrawals during month | Default: 0 |
| `yield` | DECIMAL | Profit earned during month | Default: 0 |
| `closing_balance` | DECIMAL | Balance at month end | Yes |
| `entry_date` | DATE | Date investor entered (optional) | No |
| `exit_date` | DATE | Date investor exited (optional) | No |
| `created_at` | TIMESTAMP | When record created | Auto |
| `edited_at` | TIMESTAMP | When record last edited | Auto |
| `edited_by` | UUID | Admin who last edited | Auto |

**Constraints:**
- Unique: `(investor_id, asset_code, report_month)` - one record per investor/asset/month
- Foreign keys: `investor_id` → `investors.id`, `edited_by` → `profiles.id`

**Indexes:**
- Primary: `id`
- Unique composite: `investor_id + asset_code + report_month`
- Index on: `report_month` (for date filtering)
- Index on: `investor_id` (for investor lookups)

---

## Step-by-Step Example

### Scenario: Enter November 2025 Data for All Investors - BTC Asset

**Given:**
- 7 investors with BTC positions
- November PDF report shows all balances
- Need to enter data for November 2025

**Step 1: Open Monthly Data Entry**

Navigate to `/admin/monthly-data-entry`

**Step 2: Select Parameters**

- Month: **November 2025**
- Asset: **BTC**

**Step 3: Enter Data Row by Row**

| Investor | Opening | Additions | Withdrawals | Yield | Closing (auto) |
|----------|---------|-----------|-------------|-------|----------------|
| Alice Smith | $10,000 | $0 | $0 | $150 | **$10,150** |
| Bob Johnson | $25,000 | $5,000 | $0 | $450 | **$30,450** |
| Carol Lee | $8,500 | $0 | $1,000 | $125 | **$7,625** |
| David Chen | $15,000 | $2,000 | $0 | $255 | **$17,255** |
| Emma Wilson | $12,000 | $0 | $0 | $180 | **$12,180** |
| Frank Brown | $20,000 | $0 | $3,000 | $255 | **$17,255** |
| Grace Davis | $9,500 | $1,000 | $0 | $158 | **$10,658** |

**Step 4: Review Summary**

- Total Opening: $100,000
- Total Additions: $8,000
- Total Withdrawals: $4,000
- Total Yield: $1,573
- Total Closing: **$105,573**

**Verification:** $100,000 + $8,000 - $4,000 + $1,573 = $105,573 ✅

**Step 5: Save**

Click **"Save All Changes"**

System saves 7 records to database:
```sql
INSERT INTO investor_monthly_reports (
  investor_id, asset_code, report_month,
  opening_balance, additions, withdrawals, yield, closing_balance,
  edited_by
) VALUES
  ('alice-uuid', 'BTC', '2025-11-01', 10000, 0, 0, 150, 10150, 'admin-uuid'),
  ('bob-uuid', 'BTC', '2025-11-01', 25000, 5000, 0, 450, 30450, 'admin-uuid'),
  ... (5 more records)
```

**Step 6: Verify - What Investors See**

- Alice logs in → Statements → Sees BTC card
- Clicks BTC card → Sees November 2025 row:
  - Opening: $10,000
  - Additions: $0
  - Yield: $150
  - Closing: $10,150
  - Rate: 1.5% (150/10000)

**Step 7: Repeat for Other Assets**

Now repeat Step 2-6 for:
- ETH (7 investors)
- SOL (5 investors)
- USDT (7 investors)
- USDC (5 investors)
- EURC (5 investors)

---

## Monthly Checklist for Admins

### Beginning of Month (Days 1-5)

- [ ] Receive PDF reports from fund manager
- [ ] Verify PDF reports are complete and accurate
- [ ] Identify any new investors or exited investors
- [ ] Note any large additions/withdrawals requiring special attention

### Data Entry (Days 5-10)

- [ ] **BTC**: Enter data for all investors with BTC positions
  - [ ] Select November 2025, BTC
  - [ ] Enter all rows
  - [ ] Verify summary totals match PDF
  - [ ] Save
- [ ] **ETH**: Repeat for ETH
- [ ] **SOL**: Repeat for SOL
- [ ] **USDT**: Repeat for USDT
- [ ] **USDC**: Repeat for USDC
- [ ] **EURC**: Repeat for EURC

### Quality Assurance (Days 10-12)

- [ ] Navigate to **Admin > Investor Reports**
- [ ] Verify all investors show "Complete" status for current month
- [ ] Spot-check 3-5 investors:
  - [ ] View their report
  - [ ] Compare to PDF source
  - [ ] Verify calculations correct
- [ ] Check summary totals across all assets

### Investor Communication (Days 12-15)

- [ ] Draft monthly email to investors (future: automated)
- [ ] Inform investors statements are available
- [ ] Provide link to login: `https://platform.ultrathink.com/statements`
- [ ] Set up support hours for investor questions

### Ongoing (All Month)

- [ ] Monitor investor questions/support tickets
- [ ] Handle mid-month transactions (record for next month)
- [ ] Update any corrections discovered
- [ ] Prepare for next month

---

## Key Differences from Automated Systems

### What This System Does NOT Do

❌ **Automatic daily balance updates** - Only monthly
❌ **Real-time yield calculations** - Only monthly
❌ **Automatic transaction processing** - Manual entry
❌ **Self-service investor deposits** - Admin processes all
❌ **PDF generation** - Currently web-view only (PDF planned)

### What This System DOES Do

✅ **Full admin control** - You decide what investors see
✅ **Monthly snapshot accuracy** - Matches your PDF reports
✅ **Audit trail** - Track who entered/edited every value
✅ **Flexible data model** - Handle any asset, any situation
✅ **Investor transparency** - Clean web interface for viewing
✅ **Scalable** - Works for 27 investors or 2,700 investors

---

## Troubleshooting

### "Closing balance doesn't match PDF"

**Solution:** Check your entry:
1. Opening balance correct? (Should = last month's closing)
2. Additions/withdrawals entered correctly?
3. Yield entered correctly?
4. Formula: Closing = Opening + Additions - Withdrawals + Yield

### "Investor says they don't see November data"

**Checklist:**
1. Did you enter data for that investor's assets?
2. Did you save after entering?
3. Did investor refresh their browser?
4. Check Admin > Investor Reports - does it show "Complete"?
5. Check database directly if needed

### "Need to edit data after saving"

**Solution:**
1. Navigate to Monthly Data Entry
2. Select the month you need to edit
3. Select the asset
4. Data loads with existing values
5. Make your changes
6. Save - updates existing records
7. `edited_by` field tracks who made the change

### "Opening balance wrong for November"

**Root cause:** Last month's closing balance was wrong

**Solution:**
1. Fix October data first (correct closing balance)
2. Then update November opening balance to match
3. Or: Just update November opening manually if October can't be changed

---

## Future Enhancements

### Planned Features

1. **PDF Generation**
   - Click "Download PDF" on any statement
   - Professional PDF report with logo, charts
   - Email PDF to investor automatically

2. **Bulk Import**
   - Upload Excel/CSV file
   - Automatically populate all investors
   - Reduces manual data entry

3. **Transaction Integration**
   - Record deposits/withdrawals as they happen
   - Automatically populate "Additions/Withdrawals" at month-end
   - Still requires admin review before finalizing

4. **Email Automation**
   - Automatically email investors when new statement available
   - Scheduled notifications
   - Custom templates

5. **Mobile App**
   - iOS/Android apps for investors
   - Push notifications for new statements
   - Same data, better mobile UX

---

## Summary

The ULTRATHINK platform uses a **simple, manual, monthly data entry system** that gives admins full control while providing investors with transparent, accurate statements.

**Admin workflow:**
1. Receive PDF reports
2. Enter data once per month via Monthly Data Entry page
3. Data stored in database
4. Investors can view statements immediately

**Investor experience:**
1. Login to platform
2. Navigate to Statements
3. See all their assets with latest balances
4. Click any asset for monthly detail
5. Automatically calculated returns

**Key principle:** Admin enters data → System displays it → Everyone sees the same numbers

This approach prioritizes **accuracy, control, and transparency** over automation complexity.

---

## Support

For questions or issues:
- **Admin Training**: Contact your platform administrator
- **Technical Support**: [Support page] or email support@ultrathink.com
- **Feature Requests**: Submit via admin dashboard feedback form
