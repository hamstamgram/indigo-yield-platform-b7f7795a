# After Cleanup: Complete Database Structure

> **What You'll Have Left After Deleting 8-9 Tables**
> **Date:** 2025-11-18

---

## 🎯 EXECUTIVE SUMMARY

**BEFORE Cleanup:** 20+ tables
**AFTER Cleanup:** 12 tables
**Reduction:** 40-50%

**Data Loss:** ZERO (only deleting empty tables + optionally 6 rows of Sept 23 daily rates)

---

## 📊 YOUR COMPLETE DATABASE AFTER CLEANUP

### **TABLES THAT WILL REMAIN (12 tables)**

---

## 1️⃣ **USER & AUTHENTICATION (2 tables)**

### **`profiles`**
- **Purpose:** User account information linked to Supabase Auth
- **Current Data:** 0 rows (awaiting production users)
- **Schema:**
  ```sql
  id UUID PRIMARY KEY REFERENCES auth.users(id)
  email TEXT UNIQUE NOT NULL
  first_name TEXT
  last_name TEXT
  phone TEXT
  is_admin BOOLEAN DEFAULT FALSE
  created_at TIMESTAMPTZ
  ```
- **Used For:** User authentication, admin access control
- **Status:** ✅ KEEP - Core authentication table

### **`investors`**
- **Purpose:** Master investor list
- **Current Data:** 0 rows (awaiting production investors)
- **Schema:**
  ```sql
  id UUID PRIMARY KEY
  profile_id UUID REFERENCES profiles(id)
  name TEXT NOT NULL
  email TEXT
  company_name TEXT
  type TEXT -- 'individual' or 'company'
  status TEXT -- 'active', 'inactive', 'pending'
  created_at TIMESTAMPTZ
  ```
- **Used For:** Investor master data, linking to monthly reports
- **Status:** ✅ KEEP - Core investor tracking

---

## 2️⃣ **INVESTMENT TRACKING (3 tables)**

### **`investor_monthly_reports` ⭐ PRIMARY TABLE**
- **Purpose:** Single source of truth for monthly investor data
- **Current Data:** 0 rows (awaiting monthly data entry)
- **Schema:**
  ```sql
  id UUID PRIMARY KEY
  investor_id UUID REFERENCES investors(id)
  asset_code TEXT -- 'BTC', 'ETH', 'SOL', 'USDT', 'USDC', 'EURC'
  report_month DATE -- '2025-09-01'
  opening_balance NUMERIC(38,18)
  additions NUMERIC(38,18) -- Monthly deposits
  withdrawals NUMERIC(38,18) -- Monthly withdrawals
  yield NUMERIC(38,18) -- Monthly yield/interest
  closing_balance NUMERIC(38,18)
  entry_date DATE
  exit_date DATE (optional)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  edited_by UUID
  ```
- **Used For:**
  - Monthly data entry by admin
  - Generating investor reports
  - Historical tracking (month-by-month)
  - Calculating rate of return
- **Status:** ✅ KEEP - **YOUR MOST IMPORTANT TABLE**

### **`positions` (LEGACY)**
- **Purpose:** Current investor positions (old system)
- **Current Data:** 0 rows
- **Schema:**
  ```sql
  id UUID PRIMARY KEY
  investor_id UUID REFERENCES investors(id)
  asset_code TEXT
  principal NUMERIC(38,18)
  current_balance NUMERIC(38,18)
  total_earned NUMERIC(38,18)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  ```
- **Used For:** Legacy data (being replaced by `investor_monthly_reports`)
- **Status:** ⚠️ KEEP TEMPORARILY - Will deprecate after full migration
- **Action:** Migrate data to `investor_monthly_reports` then delete

### **`transactions`**
- **Purpose:** Transaction history log
- **Current Data:** 0 rows (awaiting production transactions)
- **Schema:**
  ```sql
  id UUID PRIMARY KEY
  investor_id UUID REFERENCES investors(id)
  asset_code TEXT
  transaction_type TEXT -- 'DEPOSIT', 'WITHDRAWAL', 'INTEREST', 'FEE'
  amount NUMERIC(38,18)
  transaction_date TIMESTAMPTZ
  description TEXT
  created_at TIMESTAMPTZ
  ```
- **Used For:**
  - Historical transaction log
  - Audit trail
  - Transaction search/filtering
- **Status:** ✅ KEEP - Useful for detailed transaction history

---

## 3️⃣ **ASSET MANAGEMENT (1 table)**

### **`assets` ⭐ HAS DATA (6 rows)**
- **Purpose:** Define available assets
- **Current Data:** 6 rows
  ```
  1. BTC - Bitcoin
  2. ETH - Ethereum
  3. SOL - Solana
  4. USDT - USD Tether
  5. USDC - USD Coin
  6. EURC - Euro Coin
  ```
- **Schema:**
  ```sql
  id SERIAL PRIMARY KEY
  symbol TEXT UNIQUE -- 'BTC', 'ETH', etc.
  name TEXT -- 'Bitcoin', 'Ethereum', etc.
  icon_url TEXT
  decimal_places INTEGER
  is_active BOOLEAN DEFAULT TRUE
  created_at TIMESTAMPTZ
  ```
- **Used For:**
  - Asset dropdown lists in UI
  - Validation of asset codes
  - Asset metadata (names, icons, decimals)
- **Status:** ✅ KEEP - **CRITICAL** - Referenced by all position/report tables

---

## 4️⃣ **REPORTING & COMMUNICATION (0 tables currently, 2 pending deployment)**

### **`investor_emails` (NOT DEPLOYED YET)**
- **Purpose:** Multi-email support for investors/companies
- **Expected Data:** ~30-40 emails (27 investors, some with multiple emails)
- **Schema:**
  ```sql
  id UUID PRIMARY KEY
  investor_id UUID REFERENCES investors(id)
  email TEXT NOT NULL
  is_primary BOOLEAN DEFAULT FALSE
  verified BOOLEAN DEFAULT FALSE
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  ```
- **Used For:**
  - Sending reports to multiple recipients per investor
  - Company email lists (CEO, CFO, Admin)
- **Status:** 🔜 DEPLOY SOON - Migration file exists, needs deployment

### **`email_logs` (NOT DEPLOYED YET)**
- **Purpose:** Track email delivery
- **Expected Data:** Grows with each email sent
- **Schema:**
  ```sql
  id UUID PRIMARY KEY
  investor_id UUID REFERENCES investors(id)
  recipient_email TEXT NOT NULL
  subject TEXT
  email_type TEXT -- 'monthly_report', 'notification', etc.
  status TEXT -- 'sent', 'delivered', 'bounced', 'failed'
  sent_at TIMESTAMPTZ
  delivered_at TIMESTAMPTZ
  error_message TEXT
  ```
- **Used For:**
  - Email delivery tracking
  - Debugging email issues
  - Audit trail of communications
- **Status:** 🔜 DEPLOY SOON - Migration file exists, needs deployment

---

## 5️⃣ **ONBOARDING (0 tables currently, 1 pending deployment)**

### **`onboarding_submissions` (NOT DEPLOYED YET)**
- **Purpose:** Track Airtable onboarding submissions
- **Expected Data:** ~10-20 submissions
- **Schema:**
  ```sql
  id UUID PRIMARY KEY
  airtable_record_id TEXT UNIQUE
  submission_data JSONB -- Raw Airtable data
  sync_status TEXT -- 'pending', 'processed', 'error'
  processed_at TIMESTAMPTZ
  investor_id UUID REFERENCES investors(id)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  ```
- **Used For:**
  - Sync Airtable submissions to database
  - Track which submissions became investors
  - Prevent duplicate processing
- **Status:** 🔜 DEPLOY SOON - Migration file exists, needs deployment

---

## 6️⃣ **OPERATIONS & SUPPORT (3 tables)**

### **`documents`**
- **Purpose:** Document storage metadata
- **Current Data:** 0 rows (awaiting production documents)
- **Schema:**
  ```sql
  id UUID PRIMARY KEY
  investor_id UUID REFERENCES investors(id)
  title TEXT NOT NULL
  file_url TEXT NOT NULL
  file_type TEXT
  category TEXT
  uploaded_by UUID REFERENCES profiles(id)
  uploaded_at TIMESTAMPTZ
  ```
- **Used For:**
  - Store investor documents
  - Contracts, statements, tax forms
  - Document sharing with investors
- **Status:** ✅ KEEP - Document management needed

### **`support_tickets`**
- **Purpose:** Customer support ticket tracking
- **Current Data:** 0 rows (awaiting production tickets)
- **Schema:**
  ```sql
  id UUID PRIMARY KEY
  investor_id UUID REFERENCES investors(id)
  subject TEXT NOT NULL
  description TEXT
  status TEXT -- 'open', 'in_progress', 'resolved', 'closed'
  priority TEXT -- 'low', 'medium', 'high', 'urgent'
  assigned_to UUID REFERENCES profiles(id)
  created_at TIMESTAMPTZ
  updated_at TIMESTAMPTZ
  resolved_at TIMESTAMPTZ
  ```
- **Used For:**
  - Track investor support requests
  - Assign tickets to admins
  - Support workflow
- **Status:** ✅ KEEP - Support system needed

### **`funds` (EXISTS)**
- **Purpose:** Fund/pool definitions (if running multiple funds)
- **Current Data:** 0 rows
- **Schema:** Unknown (table exists but empty)
- **Status:** ❓ REVIEW - Might be unused, check if needed

---

## 🎯 **SUMMARY: YOUR DATABASE AFTER CLEANUP**

### **Core Functionality (6 tables):**
1. ✅ `profiles` - User authentication
2. ✅ `investors` - Investor master list
3. ✅ `investor_monthly_reports` - **PRIMARY DATA TABLE**
4. ✅ `positions` - Legacy (temporary, to be deprecated)
5. ✅ `transactions` - Transaction log
6. ✅ `assets` - Asset definitions (6 assets)

### **Reporting & Communication (2 tables - to deploy):**
7. 🔜 `investor_emails` - Multi-email support
8. 🔜 `email_logs` - Email tracking

### **Onboarding (1 table - to deploy):**
9. 🔜 `onboarding_submissions` - Airtable sync

### **Operations (3 tables):**
10. ✅ `documents` - Document storage
11. ✅ `support_tickets` - Support system
12. ❓ `funds` - Fund definitions (review if needed)

---

## 📊 **WORKFLOW WITH REMAINING TABLES**

### **Monthly Reporting Workflow:**
```
Step 1: Admin enters monthly data
  └─> INSERT INTO investor_monthly_reports
      ├─ opening_balance
      ├─ additions
      ├─ withdrawals
      ├─ yield
      └─ closing_balance

Step 2: Generate reports
  └─> SELECT * FROM investor_monthly_reports
      WHERE report_month = '2025-09-01'

Step 3: Get recipient emails
  └─> SELECT * FROM investor_emails
      WHERE investor_id = ?
      AND (is_primary = true OR verified = true)

Step 4: Send emails
  └─> INSERT INTO email_logs
      (recipient_email, status, sent_at)
```

### **Investor View Statements:**
```
SELECT
  imr.*,
  i.name as investor_name,
  a.symbol as asset_symbol,
  a.name as asset_name
FROM investor_monthly_reports imr
JOIN investors i ON imr.investor_id = i.id
JOIN assets a ON imr.asset_code = a.symbol
WHERE i.profile_id = current_user_id
ORDER BY imr.report_month DESC
```

---

## ✅ **WHAT YOU'LL LOSE (ALL EMPTY)**

### **Tables Being Deleted (8-9 tables):**
1. ❌ `deposits` - 0 rows
2. ❌ `yield_rates` - 6 rows (Sept 23 daily rates - optional delete)
3. ❌ `portfolio_history` - 0 rows
4. ❌ `daily_nav` - 0 rows
5. ❌ `benchmarks` - 0 rows
6. ❌ `reconciliation` - 0 rows
7. ❌ `withdrawal_requests` - 0 rows
8. ❌ `secure_shares` - 0 rows
9. ❌ `bank_accounts` - 0 rows

**Total Data Loss:** ZERO (all tables empty except yield_rates with 6 legacy rows)

---

## 🎯 **WHAT YOU CAN DO WITH REMAINING TABLES**

### ✅ **Core Investment Tracking:**
- Track 27 investors across 6 assets
- Monthly data entry (162 entries per month)
- Historical tracking (unlimited months)
- Calculate monthly yields and returns
- View investor portfolios

### ✅ **Reporting:**
- Generate monthly statements
- Email reports to multiple recipients per investor
- Track email delivery
- Historical report access

### ✅ **Operations:**
- Investor onboarding from Airtable
- Document storage and sharing
- Support ticket management
- Transaction history

### ❌ **What You CANNOT Do (by design):**
- Daily portfolio tracking (monthly only)
- Real-time crypto price updates
- Blockchain integration
- Automated deposits/withdrawals
- Daily yield calculations
- NAV calculations (not a pooled fund)
- Benchmark comparisons
- Portfolio sharing links
- Bank account management

---

## 📈 **DATABASE SIZE COMPARISON**

**BEFORE Cleanup:**
- 20+ tables
- Feature bloat: 40-50%
- Complexity: HIGH
- Maintenance: DIFFICULT

**AFTER Cleanup:**
- 12 tables (9 active + 3 to deploy)
- Focused on core workflow
- Complexity: LOW
- Maintenance: EASY

**Reduction:** 40-50% fewer tables
**Data Loss:** 0% (only empty tables deleted)
**Functionality:** 100% retained (all needed features work)

---

## 🚀 **NEXT STEPS AFTER CLEANUP**

### **Immediate (Day 1):**
1. Delete 8-9 empty tables
2. Verify remaining tables intact
3. Test core workflows

### **Week 1:**
1. Deploy 3 new tables (`investor_emails`, `email_logs`, `onboarding_submissions`)
2. Migrate data from `positions` → `investor_monthly_reports`
3. Begin monthly data entry

### **Month 1:**
1. Backfill historical data (Jun 2024 - Oct 2025)
2. Deprecate `positions` table
3. Establish monthly workflow

---

## ✅ **FINAL ANSWER: WHAT YOU'LL HAVE LEFT**

**12 Clean, Focused Tables:**
- User management (2 tables)
- Investment tracking (3 tables)
- Asset management (1 table)
- Reporting & communication (2 tables, pending deployment)
- Onboarding (1 table, pending deployment)
- Operations (3 tables)

**Simple, Maintainable Workflow:**
- Monthly data entry → Generate reports → Email delivery
- No blockchain complexity
- No daily tracking overhead
- No unused features

**100% Functional Platform:**
- Everything you need, nothing you don't
- Clean architecture
- Easy to understand
- Simple to maintain

---

**This is a MUCH better database structure for your actual workflow!**
