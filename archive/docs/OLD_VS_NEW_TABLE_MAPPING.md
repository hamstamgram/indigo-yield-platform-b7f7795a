# OLD vs NEW Table Mapping - Complete Explanation

> **Date:** 2025-11-18
> **Purpose:** Understand what OLD tables do and what REPLACES them in the NEW workflow

---

## 🎯 **THE BIG PICTURE**

Your platform went through a **MAJOR WORKFLOW CHANGE:**

### **OLD WORKFLOW (Crypto Trading Platform):**
- Daily tracking of crypto prices
- Real-time portfolio updates
- Trading features (buy/sell/swap)
- Crypto wallet integration
- Price alerts and notifications

### **NEW WORKFLOW (Investment Reporting Platform):**
- Monthly data entry by admin
- Monthly reports generated for investors
- Email delivery to multiple recipients
- Simple transaction tracking
- Focus on reporting, not trading

**Result:** Many OLD tables became USELESS because the workflow changed completely!

---

## 📊 **TABLE-BY-TABLE MAPPING**

### **1. `deposits` (OLD) → `transactions` (NEW)**

**OLD PURPOSE:**
- Track when investors deposit crypto into platform
- Real-time deposit tracking
- Integration with blockchain APIs
- Automated deposit detection

**WHY IT'S EMPTY:**
- Nobody is depositing crypto in real-time
- Admin enters monthly data manually instead

**NEW REPLACEMENT:**
```
transactions table (EXISTS, 0 rows)
  ├─ transaction_type: 'DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE'
  ├─ amount: Decimal amount
  └─ Used for: Historical transaction tracking
```

**ALSO TRACKED IN:**
```
investor_monthly_reports.additions (monthly deposits)
investor_monthly_reports.withdrawals (monthly withdrawals)
```

**VERDICT:** ✅ **SAFE TO DELETE** - Replaced by `transactions` + `investor_monthly_reports.additions`

---

### **2. `yield_rates` (OLD) → `investor_monthly_reports.yield` (NEW)**

**OLD PURPOSE:**
- Track DAILY yield percentages for each asset
- Calculate daily interest accrual
- Power daily portfolio updates
- Display yield performance graphs

**DATA FOUND:** 6 rows (September 23, 2025)
```
BTC: 1.506849% daily
ETH: 1.643836% daily
SOL: 2.328767% daily
USDT: 1.972603% daily
USDC: 1.972603% daily
EURC: 1.369863% daily
```

**WHY YOU DON'T NEED DAILY RATES:**
- New workflow = MONTHLY reporting only
- Admin calculates monthly yield, not daily
- No daily graphs or tracking needed

**NEW REPLACEMENT:**
```
investor_monthly_reports table
  ├─ opening_balance: Start of month balance
  ├─ closing_balance: End of month balance
  ├─ additions: Deposits during month
  ├─ withdrawals: Withdrawals during month
  └─ yield: MONTHLY yield (calculated once per month)
```

**CALCULATION:**
```
Monthly Yield = closing_balance - opening_balance - additions + withdrawals
```

**VERDICT:** ✅ **SAFE TO DELETE** - Replaced by monthly yield tracking in `investor_monthly_reports`

---

### **3. `portfolio_history` (OLD) → `investor_monthly_reports` (NEW)**

**OLD PURPOSE:**
- Store DAILY snapshots of entire portfolio
- Track portfolio value changes over time
- Power historical performance graphs
- Show "portfolio on [specific date]"

**WHY IT'S EMPTY:**
- No daily tracking happening
- Admin only updates monthly, not daily

**NEW REPLACEMENT:**
```
investor_monthly_reports table
  ├─ report_month: '2025-09-01' (first day of month)
  ├─ closing_balance: Snapshot at end of month
  └─ One row per investor per asset per month
```

**EXAMPLE:**
```
OLD: portfolio_history
  Sep 1: $10,000
  Sep 2: $10,010
  Sep 3: $10,015
  ... (30 rows per month)

NEW: investor_monthly_reports
  Sep 2025: $10,450 (1 row per month)
```

**VERDICT:** ✅ **SAFE TO DELETE** - Replaced by `investor_monthly_reports` (monthly snapshots only)

---

### **4. `daily_nav` (OLD) → No replacement needed**

**OLD PURPOSE:**
- Calculate daily Net Asset Value for entire fund
- Track fund performance daily
- Display NAV graphs
- Required for mutual fund-style reporting

**WHY IT'S EMPTY:**
- Not running as a mutual fund
- No daily NAV calculations happening
- Investors track individual positions, not fund shares

**NEW WORKFLOW:**
- Individual investor tracking (not pooled fund)
- Each investor has their own positions
- No NAV needed

**VERDICT:** ✅ **SAFE TO DELETE** - Feature abandoned (not a pooled fund)

---

### **5. `benchmarks` (OLD) → No replacement needed**

**OLD PURPOSE:**
- Store benchmark indices (S&P 500, BTC index, etc.)
- Compare portfolio performance vs benchmarks
- Display "You beat the market by X%"

**WHY IT'S EMPTY:**
- No benchmark comparison features built
- Too complex for current workflow
- Investors don't need this

**VERDICT:** ✅ **SAFE TO DELETE** - Feature never implemented

---

### **6. `reconciliation` (OLD) → No replacement needed**

**OLD PURPOSE:**
- Reconcile blockchain balances vs database balances
- Detect discrepancies (blockchain says X, database says Y)
- Alert admin to missing transactions
- Automated blockchain scanning

**WHY IT'S EMPTY:**
- No blockchain integration
- Admin enters data manually
- No automated reconciliation needed

**VERDICT:** ✅ **SAFE TO DELETE** - No blockchain integration exists

---

### **7. `withdrawal_requests` (OLD) → `withdrawals` (NEW)**

**OLD PURPOSE:**
- Store investor withdrawal requests
- Workflow: Investor requests → Admin approves → Execute
- Track pending withdrawals
- Multi-step approval process

**WHY IT'S EMPTY:**
- No self-service withdrawal system built
- Admin handles withdrawals manually

**NEW REPLACEMENT:**
```
withdrawals table (DOES NOT EXIST YET)
  ├─ investor_id
  ├─ asset_code
  ├─ amount
  ├─ status: 'pending', 'approved', 'completed'
  └─ requested_at, completed_at
```

**CURRENT TRACKING:**
```
investor_monthly_reports.withdrawals (monthly withdrawal amount)
transactions.transaction_type = 'WITHDRAWAL'
```

**VERDICT:** ✅ **SAFE TO DELETE** - Replaced by simpler `withdrawals` table (to be created) or tracked in `investor_monthly_reports`

---

### **8. `secure_shares` (OLD) → No replacement needed**

**OLD PURPOSE:**
- Generate secure sharing links for portfolios
- Allow investors to share portfolio view with others (e.g., accountants)
- Time-limited access tokens
- "Share Portfolio" feature

**WHY IT'S EMPTY:**
- Feature never built
- Too complex for current needs
- Security concerns

**VERDICT:** ✅ **SAFE TO DELETE** - Feature abandoned

---

### **9. `bank_accounts` (OLD) → No replacement needed**

**OLD PURPOSE:**
- Store investor bank account details
- ACH transfers
- Fiat deposits/withdrawals
- Link to Plaid or Stripe

**WHY IT'S EMPTY:**
- User explicitly said "no bank accounts needed"
- No fiat transfers happening
- Crypto-only platform

**VERDICT:** ✅ **SAFE TO DELETE** - User requirement: "we don't need bank accounts"

---

## 🔄 **WORKFLOW COMPARISON**

### **OLD Workflow (Daily Crypto Trading)**

```
1. Investor deposits crypto → deposits table
2. Daily yield rates updated → yield_rates table
3. Daily portfolio snapshot → portfolio_history table
4. Daily NAV calculated → daily_nav table
5. Compare vs benchmarks → benchmarks table
6. Blockchain reconciliation → reconciliation table
7. Investor requests withdrawal → withdrawal_requests table
8. Share portfolio link → secure_shares table
9. Fiat transfers → bank_accounts table
```

**Database writes per day:** 50-100+ records
**Admin effort:** Low (automated)
**Complexity:** High (many tables, blockchain integration)

---

### **NEW Workflow (Monthly Investment Reporting)**

```
1. Admin enters monthly data → investor_monthly_reports table
   ├─ Opening balance
   ├─ Additions (deposits)
   ├─ Withdrawals
   ├─ Yield (calculated)
   └─ Closing balance

2. Admin generates reports → Uses investor_monthly_reports data

3. Admin sends emails → email_logs table tracks delivery
   └─ Multi-email support: investor_emails table

4. Investors view statements → Query investor_monthly_reports
```

**Database writes per month:** 162 records (27 investors × 6 assets)
**Admin effort:** Medium (manual data entry)
**Complexity:** Low (one main table, simple workflow)

---

## ✅ **SAFE TO DELETE SUMMARY**

| Table | Rows | Replaced By | Safe to Delete? |
|-------|------|-------------|-----------------|
| `deposits` | 0 | `transactions` + `investor_monthly_reports.additions` | ✅ YES |
| `yield_rates` | 6 | `investor_monthly_reports.yield` (monthly) | ✅ YES |
| `portfolio_history` | 0 | `investor_monthly_reports` (monthly snapshots) | ✅ YES |
| `daily_nav` | 0 | Not needed (not a pooled fund) | ✅ YES |
| `benchmarks` | 0 | Not needed (feature abandoned) | ✅ YES |
| `reconciliation` | 0 | Not needed (no blockchain integration) | ✅ YES |
| `withdrawal_requests` | 0 | `withdrawals` (simpler table) | ✅ YES |
| `secure_shares` | 0 | Not needed (feature abandoned) | ✅ YES |
| `bank_accounts` | 0 | Not needed (crypto-only) | ✅ YES |

**Total:** 8 tables safe to delete
**Data loss:** Only 6 rows in `yield_rates` (September 23 daily rates)

---

## 🎯 **WHAT STAYS (Core Tables)**

### **1. `investor_monthly_reports` (NEW - PRIMARY TABLE)**
- **Purpose:** Single source of truth for monthly investor data
- **Replaces:** deposits, yield_rates, portfolio_history, daily_nav
- **Status:** Active, awaiting data entry

### **2. `investors` (CORE)**
- **Purpose:** Master investor list
- **Status:** Active, 27 investors

### **3. `positions` (LEGACY - TO BE DEPRECATED)**
- **Purpose:** Current positions (old system)
- **Replaced by:** `investor_monthly_reports`
- **Action:** Keep temporarily, migrate data to monthly reports

### **4. `transactions` (CORE)**
- **Purpose:** Transaction history (deposits, withdrawals, fees)
- **Status:** Active but empty
- **Replaces:** `deposits` table

### **5. `investor_emails` (NEW)**
- **Purpose:** Multi-email support for companies
- **Status:** Not deployed yet (migration file exists)
- **Replaces:** `investors.email` (single email)

### **6. `email_logs` (NEW)**
- **Purpose:** Track email delivery
- **Status:** Not deployed yet (migration file exists)

### **7. `profiles` (CORE)**
- **Purpose:** User authentication
- **Status:** Active, 27+ users

### **8. `assets` (CORE)**
- **Purpose:** Asset definitions (BTC, ETH, SOL, USDT, USDC, EURC)
- **Status:** Active, 6 rows
- **Used by:** All asset-related tables

### **9. `documents` (CORE)**
- **Purpose:** Document storage
- **Status:** Active but empty

### **10. `support_tickets` (CORE)**
- **Purpose:** Support ticket tracking
- **Status:** Active but empty

---

## 🚀 **RECOMMENDED ACTION**

### **Step 1: Delete Empty OLD Tables (8 tables)**
```sql
DROP TABLE IF EXISTS deposits CASCADE;
DROP TABLE IF EXISTS portfolio_history CASCADE;
DROP TABLE IF EXISTS daily_nav CASCADE;
DROP TABLE IF EXISTS benchmarks CASCADE;
DROP TABLE IF EXISTS reconciliation CASCADE;
DROP TABLE IF EXISTS withdrawal_requests CASCADE;
DROP TABLE IF EXISTS secure_shares CASCADE;
DROP TABLE IF EXISTS bank_accounts CASCADE;
```

### **Step 2: DECIDE on yield_rates (6 rows)**
**Option A:** DELETE - New workflow uses monthly yield, not daily
**Option B:** KEEP - Historical reference for September 23, 2025

### **Step 3: Deploy NEW Tables (3 tables not deployed yet)**
```sql
-- Run migration: 20251118_multi_email_onboarding.sql
CREATE TABLE investor_emails (...);
CREATE TABLE onboarding_submissions (...);
CREATE TABLE email_logs (...);
```

### **Step 4: Migrate Data from positions → investor_monthly_reports**
- Keep `positions` table temporarily
- Use as source data for monthly reports
- Deprecate after full migration

---

## 📊 **FINAL DATABASE STRUCTURE**

### **Production (After Cleanup):**

**Core Tables (12):**
1. profiles
2. investors
3. investor_emails (NEW)
4. investor_monthly_reports (NEW - PRIMARY)
5. positions (LEGACY - to deprecate)
6. transactions
7. assets
8. onboarding_submissions (NEW)
9. email_logs (NEW)
10. documents
11. support_tickets
12. funds

**Total Tables:** 12 (down from 20+)
**Reduction:** 40-50%

---

**Summary:** OLD tables were built for DAILY crypto trading workflow. NEW workflow is MONTHLY investment reporting. Old tables became obsolete when workflow changed. All OLD functionality is now in `investor_monthly_reports` (one powerful table vs many specialized tables).
