# Supabase Database Schema Audit Report
**Project:** Indigo Yield Platform v01
**Project URL:** https://noekumitbfoxhsndwypz.supabase.co
**Date:** 2025-11-05
**Auditor:** Database Specialist

---

## Executive Summary

This comprehensive audit reviewed all database objects including 57 tables, 10 views, 88 functions, and 35 edge functions. The audit identified:

- **Critical Security Issues:** 5 tables missing RLS policies
- **Schema Duplication:** 3 pairs of v1/v2 tables requiring consolidation
- **Empty Tables:** 33 tables with 0 rows (potential cleanup candidates)
- **Function Issues:** 4 functions with mutable search_path security warnings
- **Missing Functionality:** Statements table structure exists but is empty (0 rows)

---

## 1. Complete Table Inventory

### 1.1 Core Tables (KEEP - Active Use)

#### **profiles** (27 rows) ✅
- **Purpose:** User authentication and profile management (extends auth.users)
- **Key Columns:** id (uuid), email, first_name, last_name, is_admin, fee_percentage, totp_enabled, status
- **RLS:** Enabled ✅
- **Status:** CORE - Required for authentication

#### **investors** (27 rows) ✅
- **Purpose:** Investor entity records separate from profiles
- **Key Columns:** id, name, email, phone, kyc_status, aml_status, profile_id, status
- **RLS:** Enabled ✅
- **Relationship:** Links to profiles via profile_id
- **Status:** CORE - Required for investor management

#### **funds** (6 rows) ✅
- **Purpose:** Investment fund definitions
- **Key Columns:** id, code, name, asset, fund_class, mgmt_fee_bps, perf_fee_bps, status
- **RLS:** Enabled ✅
- **Status:** CORE - Fund management

#### **investor_positions** (18 rows) ✅
- **Purpose:** Tracks investor holdings in funds
- **Key Columns:** investor_id, fund_id, shares, cost_basis, current_value, unrealized_pnl, fund_class, aum_percentage
- **RLS:** Enabled ✅
- **Status:** CORE - Position tracking

#### **transactions** (52 rows) ✅
- **Purpose:** Legacy transaction records
- **Key Columns:** id, user_id, asset_code (ENUM), amount, type, status, tx_hash
- **RLS:** Enabled ✅
- **Status:** ACTIVE - Legacy system, has data

#### **transactions_v2** (0 rows) ⚠️
- **Purpose:** New transaction system for portfolio management
- **Key Columns:** investor_id, fund_id, portfolio_id, asset_id, tx_date, amount, type, quantity, price_per_unit
- **RLS:** Enabled ✅
- **Status:** READY but EMPTY - New system not yet in use

#### **withdrawal_requests** (1 row) ✅
- **Purpose:** Handles withdrawal workflow
- **Key Columns:** investor_id, fund_id, requested_amount, status (ENUM), withdrawal_type, approved_by, settlement_date
- **RLS:** Enabled ✅
- **Status:** CORE - Withdrawal management (USER REPORTED ISSUES)

#### **statements** (0 rows) ❌
- **Purpose:** Monthly investor statements
- **Key Columns:** user_id, period_year, period_month, asset_code, begin_balance, additions, redemptions, net_income, storage_path
- **RLS:** Enabled ✅
- **Status:** CRITICAL MISSING - Table exists but no data (USER REPORTED NOT WORKING)

#### **positions** (36 rows) ✅
- **Purpose:** Current user asset positions
- **Key Columns:** user_id, asset_code (ENUM), principal, total_earned, current_balance
- **RLS:** Enabled ✅
- **Status:** ACTIVE - Position tracking

#### **portfolios_v2** (26 rows) ✅
- **Purpose:** User portfolio management (new system)
- **Key Columns:** id, owner_user_id, name, status, base_currency, inception_date
- **RLS:** Enabled ✅
- **Status:** ACTIVE - New portfolio system

#### **investor_monthly_reports** (650 rows) ✅
- **Purpose:** Monthly performance reports per investor/asset
- **Key Columns:** investor_id, report_month, asset_code, opening_balance, closing_balance, yield_earned
- **RLS:** Enabled ✅
- **Status:** ACTIVE - Most data of any table

#### **audit_log** (7,455 rows) ✅
- **Purpose:** System audit trail
- **Key Columns:** action, entity, entity_id, old_values, new_values, actor_user
- **RLS:** Enabled ✅
- **Status:** ACTIVE - Most used table

---

### 1.2 Asset Management Tables

#### **assets** (6 rows) ✅
- **Purpose:** Legacy asset definitions
- **Key Columns:** id (serial), symbol (asset_code ENUM), name, icon_url, decimal_places
- **RLS:** Enabled ✅
- **Status:** LEGACY - Consider consolidation with assets_v2

#### **assets_v2** (6 rows) ✅
- **Purpose:** New asset system
- **Key Columns:** asset_id (text), symbol, name, chain, kind, price_source, coingecko_id
- **RLS:** Enabled ✅
- **Status:** ACTIVE - New system

#### **asset_prices** (12 rows) ✅
- **Purpose:** Historical asset price data
- **RLS:** Enabled ✅
- **Status:** ACTIVE

#### **yield_rates** (6 rows) ✅
- **Purpose:** Yield rate definitions per asset
- **RLS:** Enabled ✅
- **Status:** ACTIVE

#### **yield_sources** (36 rows) ✅
- **Purpose:** Yield source tracking per user/asset
- **RLS:** Enabled ✅
- **Status:** ACTIVE

---

### 1.3 Reporting & Analytics Tables

#### **portfolio_history** (540 rows) ✅
- **Purpose:** Historical portfolio snapshots
- **RLS:** Enabled ✅
- **Status:** ACTIVE - Good data volume

#### **daily_nav** (0 rows) ⚠️
- **Purpose:** Daily Net Asset Value calculations per fund
- **Key Columns:** fund_id, nav_date, aum, nav_per_share, gross_return_pct, net_return_pct
- **RLS:** Enabled ✅
- **Status:** READY but EMPTY - NAV tracking not started

#### **generated_reports** (0 rows) ❌
- **Purpose:** Generated report metadata
- **RLS:** DISABLED ❌ **SECURITY ISSUE**
- **Status:** Missing RLS policies

#### **report_definitions** (13 rows) ❌
- **Purpose:** Report template definitions
- **RLS:** DISABLED ❌ **SECURITY ISSUE**
- **Status:** Missing RLS policies

#### **report_schedules** (0 rows) ❌
- **Purpose:** Scheduled report generation
- **RLS:** DISABLED ❌ **SECURITY ISSUE**
- **Status:** Missing RLS policies

#### **report_shares** (0 rows) ❌
- **Purpose:** Report sharing functionality
- **RLS:** DISABLED ❌ **SECURITY ISSUE**
- **Status:** Missing RLS policies

#### **report_access_logs** (0 rows) ❌
- **Purpose:** Report access audit trail
- **RLS:** DISABLED ❌ **SECURITY ISSUE**
- **Status:** Missing RLS policies

---

### 1.4 Empty Tables (Candidates for Review)

**Tables with 0 rows (33 total):**
- access_logs (0) - audit logging
- admin_invites (0) - admin invitation system
- balance_adjustments (0) - manual balance corrections
- benchmarks (0) - performance benchmarks
- daily_aum_entries (0) - AUM tracking
- daily_nav (0) - NAV calculations ⚠️ **NEEDED**
- daily_yield_applications (0) - yield distribution
- deposits (0) - deposit tracking
- documents (0) - document management
- fee_calculations (0) - fee computation
- fees (0) - fee records
- fund_daily_aum (0) - fund AUM tracking
- fund_fee_history (0) - fee history
- generated_reports (0) - report files ⚠️ **NEEDED**
- monthly_fee_summary (0) - fee summaries
- notifications (0) - user notifications
- platform_fees_collected (0) - platform fees
- portfolio_members (0) - portfolio sharing
- portfolio_nav_snapshots (0) - portfolio NAV
- rate_limit_events (0) - rate limiting
- reconciliation (0) - data reconciliation
- report_access_logs (0) - report access audit
- report_schedules (0) - scheduled reports
- report_shares (0) - report sharing
- secure_shares (0) - secure document sharing
- statements (0) - monthly statements ❌ **CRITICAL**
- transactions_v2 (0) - new transaction system ⚠️
- user_access_logs_enhanced (0) - enhanced access logs
- user_sessions (0) - session management
- user_totp_backup_codes (0) - 2FA backup codes
- user_totp_settings (0) - 2FA settings
- web_push_subscriptions (0) - push notifications
- yield_distribution_log (0) - yield distribution history
- yield_settings (0) - yield configuration

---

## 2. View Inventory (10 views)

### 2.1 Active Views (KEEP)

1. **audit_events_v** - Unified audit event view (combines multiple audit sources)
2. **investor_directory** - Investor listing with profile info
3. **investor_positions_by_class** - Position aggregation by fund class
4. **portfolio_overview_v** - Portfolio summary with total values
5. **positions_current_v** - Current position details with prices
6. **v_fund_kpis** - Fund performance KPIs (MTD, QTD, YTD, ITD returns)
7. **v_investor_kpis** - Investor summary KPIs
8. **v_itd_returns** - Inception-to-date returns by fund
9. **withdrawal_queue** - Withdrawal request details with investor info
10. **admin_portfolio_overview_v** - Admin view of all portfolios

**Status:** All views are properly defined and useful ✅

---

## 3. Function Inventory (88 functions)

### 3.1 Core Functions (KEEP)

#### Authentication & Authorization
- `is_admin()` - Admin check
- `is_admin_safe()` - Safe admin check
- `is_admin_secure()` - Secure admin check (recommended)
- `is_admin_v2()` - V2 admin check
- `check_is_admin(user_id)` - User-specific admin check
- `get_user_admin_status(user_id)` - Get admin status
- `ensure_admin()` - Throw error if not admin
- `can_access_user(user_uuid)` - User access check
- `is_2fa_required(p_user_id)` - Check 2FA requirement

**Note:** Multiple `is_admin*` variants indicate evolution - recommend consolidating to `is_admin_secure()`

#### 2FA/TOTP Functions
- `encrypt_totp_secret(secret_text)` - Encrypt TOTP secret
- `decrypt_totp_secret(encrypted_secret)` - Decrypt TOTP secret

#### Investor Management
- `create_investor_profile()` - Create investor with profile
- `get_all_investors_with_details()` - List all investors
- `get_all_investors_with_summary()` - Investor summaries
- `get_all_non_admin_profiles()` - Non-admin user list
- `get_investor_count()` - Count investors
- `add_fund_to_investor()` - Add fund position
- `get_investor_positions_by_class()` - Position aggregation
- `update_user_profile_secure()` - Secure profile update

#### Portfolio Management
- `calculate_positions(p_portfolio_id)` - Calculate portfolio positions
- `check_portfolio_access()` - Portfolio access check
- `has_portfolio_access()` - Portfolio access verification

#### Transaction & Withdrawal Management
- `create_withdrawal_request()` - Create withdrawal
- `approve_withdrawal()` - Approve withdrawal request
- `reject_withdrawal()` - Reject withdrawal
- `cancel_withdrawal_by_admin()` - Admin cancel withdrawal
- `start_processing_withdrawal()` - Begin withdrawal processing
- `complete_withdrawal()` - Finalize withdrawal
- `can_withdraw()` - Check withdrawal eligibility

#### Yield & Fee Functions
- `apply_daily_yield()` - Apply yield to positions
- `apply_daily_yield_to_fund()` - Apply fund-level yield
- `apply_daily_yield_with_fees()` - Apply yield with fee deduction
- `populate_yield_sources()` - Initialize yield sources
- `set_fund_daily_aum()` - Set fund AUM

#### Statement Generation
- `generate_statement_data()` - Generate statement data ⚠️ **CRITICAL**
- `generate_statement_path()` - Generate storage path
- `generate_monthly_report_template()` - Generate report template
- `generate_historical_statements()` - Backfill historical statements

#### Reporting Functions
- `get_report_statistics()` - Report usage statistics ⚠️ Security warning
- `get_user_reports()` - User report list ⚠️ Security warning
- `cleanup_expired_reports()` - Clean old reports ⚠️ Security warning
- `calculate_next_run_time()` - Schedule calculation ⚠️ Security warning

#### Fund Performance
- `fund_period_return(fund_id, start_date, end_date)` - Calculate period returns
- `create_daily_aum_entry()` - Create AUM entry
- `backfill_historical_positions()` - Historical data backfill

#### Data Migration Functions (Consider Removing)
- `migrate_legacy_positions()` - Legacy migration
- `migrate_legacy_positions_temp()` - Temp migration
- `migrate_legacy_to_new_system()` - System migration
- `populate_yield_sources_simple()` - Simple yield init
- `populate_yield_sources_temp()` - Temp yield init

#### Audit & Logging
- `log_audit_event()` - Log audit event
- `log_access_event()` - Log access event
- `log_security_event()` - Log security event
- `log_withdrawal_action()` - Log withdrawal action

#### Trigger Functions
- `set_updated_at()` - Update timestamp trigger
- `update_updated_at()` - Update timestamp
- `update_updated_at_column()` - Update timestamp column
- `update_audit_fields()` - Update audit fields
- `audit_transaction_changes()` - Audit transaction changes
- `log_data_edit()` - Log data edits
- `log_withdrawal_creation()` - Log withdrawal creation
- `log_cancel_on_status_change()` - Log cancellation
- `ensure_investor_for_profile()` - Ensure investor exists

#### Utility Functions
- `generate_document_path()` - Document path generation
- `get_security_headers()` - Security headers
- `is_within_edit_window()` - Check edit window
- `is_valid_share_token()` - Validate share token

---

### 3.2 Functions with Security Issues ⚠️

**4 functions have mutable search_path (security warning):**
1. `calculate_next_run_time()` - Schedule calculation
2. `get_report_statistics()` - Report statistics
3. `cleanup_expired_reports()` - Report cleanup
4. `get_user_reports()` - User report retrieval

**Recommendation:** Add `SECURITY DEFINER SET search_path = public, pg_temp` to these functions

---

### 3.3 Obsolete/Duplicate Functions (Consider Removing)

**Admin Check Duplication:**
- `is_admin()` - Basic version
- `is_admin_safe()` - Safe version
- `is_admin_secure()` - Secure version ✅ **RECOMMENDED**
- `is_admin_v2()` - V2 version
- `check_is_admin()` - User-specific

**Recommendation:** Standardize on `is_admin_secure()` and remove others

**Migration Functions (One-time use):**
- `migrate_legacy_positions()`
- `migrate_legacy_positions_temp()`
- `migrate_legacy_to_new_system()`
- `populate_yield_sources()`
- `populate_yield_sources_simple()`
- `populate_yield_sources_temp()`

**Recommendation:** Archive these functions if migration is complete

---

## 4. Edge Function Inventory (35 functions)

### 4.1 Active Edge Functions

#### Core Operations
1. **get-crypto-prices** (v74) - Fetch crypto prices ✅
2. **init-crypto-assets** (v73) - Initialize crypto assets ✅
3. **update-prices** (v4) - Update asset prices ✅
4. **price-proxy** (v6) - Price proxy service ✅

#### Admin Functions
5. **send-admin-invite** (v72) - Admin invitation emails ✅
6. **check-admin-status** (v19) - Check admin status ✅
7. **admin-user-management** (v16) - User management ✅
8. **admin-backfill-historical** (v15) - Historical data backfill ✅
9. **set-user-password** (v37) - Set user password ✅

#### Email & Notifications
10. **send-email** (v36) - Email sending ✅
11. **send-notification-email** (v17) - Notification emails ✅
12. **ef_send_notification** (v53) - Event notification ✅

#### Excel Import/Export
13. **excel_import** (v53) - Excel data import ✅
14. **excel_export** (v53) - Excel data export ✅
15. **parity_check** (v53) - Data parity validation ✅

#### Authentication & Security
16. **verify_recaptcha** (v53) - reCAPTCHA verification ✅
17. **mfa-totp-initiate** (v14) - TOTP setup ✅
18. **mfa-totp-verify** (v14) - TOTP verification ✅
19. **mfa-totp-status** (v14) - TOTP status check ✅
20. **mfa-totp-disable** (v14) - TOTP disable ✅

#### Transactions & Withdrawals
21. **process-deposit** (v4) - Process deposits ✅
22. **process-withdrawal** (v4) - Process withdrawals ✅
23. **process-webhooks** (v4) - Webhook processing ✅

#### Reporting & Analytics
24. **generate-report** (v4) - Generate reports ⚠️ **NEEDS DATA**
25. **generate-tax-documents** (v4) - Tax document generation ✅
26. **calculate-performance** (v4) - Performance calculations ✅
27. **calculate-yield** (v10) - Yield calculations ✅
28. **daily-yield-calculation** (v6) - Daily yield calc ✅
29. **sign-statement-url** (v6) - Statement URL signing ⚠️ **STATEMENTS ISSUE**

#### Portfolio Management
30. **portfolio-api** (v10) - Portfolio API endpoints ✅
31. **investor-audit** (v7) - Investor audit ✅

#### Compliance & Registration
32. **run-compliance-checks** (v4) - Compliance verification ✅
33. **submit-to-airtable** (v24) - Airtable integration ✅
34. **ef_register_session** (v52) - Session registration ✅

#### Health Check
35. **status** (v53) - Service status check ✅

**Status:** All edge functions are active and properly deployed ✅

---

## 5. Schema Issues & Recommendations

### 5.1 CRITICAL ISSUES ❌

#### **1. Statements Not Working (USER REPORTED)**
**Problem:** `statements` table exists but is completely empty (0 rows)
- Function `generate_statement_data()` exists
- Function `generate_statement_path()` exists
- Edge function `sign-statement-url` exists
- **BUT NO DATA IS BEING GENERATED**

**Root Cause Analysis:**
- Need to verify if statement generation is triggered
- Check if `generate_statement_data()` is being called
- Verify storage bucket configuration
- Check for errors in statement generation process

**Recommendation:**
```sql
-- 1. Test statement generation manually
SELECT generate_statement_data(
  (SELECT id FROM investors LIMIT 1),
  2025,
  10
);

-- 2. Check if storage bucket exists
SELECT * FROM storage.buckets WHERE name = 'statements';

-- 3. Create missing bucket if needed
INSERT INTO storage.buckets (id, name, public)
VALUES ('statements', 'statements', false);

-- 4. Verify RLS policies on storage.objects
```

#### **2. Withdrawal Issues (USER REPORTED)**
**Problem:** Users report withdrawals not working properly
- `withdrawal_requests` table has only 1 row (very low for a platform)
- Multiple withdrawal functions exist and look correct
- Edge function `process-withdrawal` exists

**Investigation Needed:**
1. Check withdrawal request creation flow
2. Verify approval workflow
3. Test `can_withdraw()` function
4. Review withdrawal status transitions
5. Check if there are validation errors preventing requests

**Test Queries:**
```sql
-- Test withdrawal eligibility
SELECT can_withdraw(
  (SELECT id FROM investors LIMIT 1),
  (SELECT id FROM funds LIMIT 1),
  100
);

-- Check withdrawal audit logs
SELECT * FROM withdrawal_audit_logs ORDER BY created_at DESC;

-- Review withdrawal queue
SELECT * FROM withdrawal_queue;
```

---

### 5.2 SECURITY ISSUES ❌

#### **Missing RLS Policies (5 tables)**
**CRITICAL:** These tables are exposed without row-level security:

1. **generated_reports** - Report files accessible by anyone
2. **report_definitions** - Report templates accessible by anyone
3. **report_schedules** - Scheduled reports accessible by anyone
4. **report_shares** - Shared reports accessible by anyone
5. **report_access_logs** - Audit logs accessible by anyone

**Fix Required:**
```sql
-- Enable RLS
ALTER TABLE generated_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_access_logs ENABLE ROW LEVEL SECURITY;

-- Add policies
CREATE POLICY "Users view own reports"
  ON generated_reports FOR SELECT
  USING (user_id = auth.uid() OR is_admin_secure());

CREATE POLICY "Admins manage report definitions"
  ON report_definitions FOR ALL
  USING (is_admin_secure());

CREATE POLICY "Users manage own schedules"
  ON report_schedules FOR ALL
  USING (user_id = auth.uid() OR is_admin_secure());

CREATE POLICY "Users view shared reports"
  ON report_shares FOR SELECT
  USING (shared_with_user_id = auth.uid() OR created_by = auth.uid() OR is_admin_secure());

CREATE POLICY "Admins view access logs"
  ON report_access_logs FOR SELECT
  USING (is_admin_secure());
```

#### **Function Security Warnings (4 functions)**
Functions with mutable search_path vulnerability:
1. `calculate_next_run_time()`
2. `get_report_statistics()`
3. `cleanup_expired_reports()`
4. `get_user_reports()`

**Fix Required:**
```sql
-- Example fix for each function
ALTER FUNCTION calculate_next_run_time(...)
  SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION get_report_statistics(...)
  SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION cleanup_expired_reports(...)
  SECURITY DEFINER SET search_path = public, pg_temp;

ALTER FUNCTION get_user_reports(...)
  SECURITY DEFINER SET search_path = public, pg_temp;
```

---

### 5.3 SCHEMA DUPLICATION (Consolidation Needed)

#### **1. Assets Tables Duplication**
- `assets` (6 rows) - Legacy system using ENUM
- `assets_v2` (6 rows) - New system using text

**Recommendation:**
- Migrate all references from `assets` to `assets_v2`
- Drop `assets` table after migration
- Drop `asset_code` ENUM type if no longer used

**Migration Plan:**
```sql
-- 1. Verify all references use assets_v2
SELECT
  tc.table_name,
  kcu.column_name
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
  ON tc.constraint_name = kcu.constraint_name
WHERE tc.table_schema = 'public'
  AND tc.constraint_type = 'FOREIGN KEY'
  AND kcu.referenced_table_name = 'assets';

-- 2. If no references, drop legacy table
-- DROP TABLE assets;
```

#### **2. Transaction Tables Duplication**
- `transactions` (52 rows) - Legacy system (has data)
- `transactions_v2` (0 rows) - New system (empty)

**Status:** Migration not yet started
**Recommendation:**
- Keep both for now
- `transactions` contains historical data
- `transactions_v2` ready for new data
- Plan migration strategy
- Document which system is active

---

### 5.4 MISSING FUNCTIONALITY

#### **1. Statement Generation System**
**Missing/Broken:**
- No data in `statements` table (0 rows)
- Monthly statement generation not working
- User cannot view/download statements

**Needed Components:**
1. Scheduled job to generate monthly statements
2. PDF generation logic
3. Storage bucket configuration
4. Statement notification system

**Implementation Checklist:**
```sql
-- Create storage bucket for statements
INSERT INTO storage.buckets (id, name, public)
VALUES ('statements', 'statements', false);

-- Add storage RLS policies
CREATE POLICY "Users view own statements"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'statements' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Schedule monthly statement generation
-- (Use pg_cron or edge function scheduler)
```

#### **2. Asset Performance Tracking**
**Missing:**
- `daily_nav` table empty (0 rows)
- NAV calculations not running
- Performance metrics incomplete

**Needed:**
- Daily NAV calculation job
- Populate `daily_nav` with historical data
- Enable fund performance tracking

**Implementation:**
```sql
-- Backfill historical NAV data
SELECT create_daily_aum_entry(CURRENT_DATE - INTERVAL '1 day');
SELECT create_daily_aum_entry(CURRENT_DATE);

-- Schedule daily NAV calculation
-- (Use pg_cron: '0 0 * * *' to run daily)
```

#### **3. Admin Investor Management**
**Missing Views:**
- Need comprehensive investor dashboard
- Missing investor activity tracking
- Incomplete position reconciliation

**Recommendation:**
- Create `v_admin_investor_dashboard` view
- Add investor activity timeline view
- Enhance `investor_directory` view with more metrics

---

## 6. DELETE CANDIDATES

### 6.1 SAFE TO DELETE (After Verification)

#### **Obsolete Functions:**
```sql
-- Multiple is_admin variants (keep only is_admin_secure)
DROP FUNCTION IF EXISTS is_admin();
DROP FUNCTION IF EXISTS is_admin_safe();
DROP FUNCTION IF EXISTS is_admin_v2();
-- Keep: is_admin_secure()

-- Migration functions (one-time use, if migration complete)
DROP FUNCTION IF EXISTS migrate_legacy_positions();
DROP FUNCTION IF EXISTS migrate_legacy_positions_temp();
DROP FUNCTION IF EXISTS migrate_legacy_to_new_system();
DROP FUNCTION IF EXISTS populate_yield_sources_temp();

-- Test/debug functions
DROP FUNCTION IF EXISTS test_profiles_access();
```

#### **Empty Unused Tables (Verify First):**
These tables are empty and may not be needed:
```sql
-- Security/audit (if using other systems)
DROP TABLE IF EXISTS rate_limit_events CASCADE; -- 0 rows
DROP TABLE IF EXISTS user_sessions CASCADE; -- 0 rows (if not using session tracking)

-- Notifications (if not implemented)
DROP TABLE IF EXISTS notifications CASCADE; -- 0 rows
DROP TABLE IF EXISTS web_push_subscriptions CASCADE; -- 0 rows

-- Document management (if not implemented)
DROP TABLE IF EXISTS documents CASCADE; -- 0 rows
DROP TABLE IF EXISTS secure_shares CASCADE; -- 0 rows

-- Sharing (if not implemented)
DROP TABLE IF EXISTS portfolio_members CASCADE; -- 0 rows
```

**⚠️ WARNING:** Only delete after confirming these features are not planned!

---

### 6.2 DO NOT DELETE (Keep for Future Use)

These tables are empty but needed for planned functionality:
- `statements` - Critical for statement generation ✅
- `generated_reports` - Needed for reporting system ✅
- `daily_nav` - Needed for NAV tracking ✅
- `transactions_v2` - New transaction system ✅
- `withdrawal_requests` - Active but low usage ✅
- `daily_yield_applications` - Yield distribution tracking ✅
- `user_totp_settings` - 2FA implementation ✅
- `user_totp_backup_codes` - 2FA backup codes ✅

---

## 7. ENUM Types (6 types)

1. **asset_code** - {BTC,ETH,SOL,USDT,USDC,EURC} ✅
2. **fund_status** - {active,inactive,suspended} ✅
3. **transaction_type** - {DEPOSIT,WITHDRAWAL,INTEREST,FEE} ✅
4. **transaction_status** - {pending,confirmed,failed,cancelled} ✅
5. **tx_type** - {DEPOSIT,WITHDRAWAL,INTEREST,FEE,ADJUSTMENT} ✅ (Similar to transaction_type)
6. **withdrawal_status** - {pending,approved,processing,completed,rejected,cancelled} ✅
7. **withdrawal_action** - {create,approve,reject,processing,complete,cancel,update} ✅
8. **report_type** - {portfolio_performance,transaction_history,tax_report,monthly_statement,...} ✅
9. **report_status** - {queued,processing,completed,failed,cancelled} ✅
10. **report_format** - {pdf,excel,csv,json} ✅
11. **notification_type** - {deposit,statement,performance,system,support} ✅
12. **ticket_status** - {open,in_progress,waiting_on_lp,closed} ✅

**Recommendation:** Consider consolidating `transaction_type` and `tx_type` (very similar)

---

## 8. Priority Action Items

### 🔴 **CRITICAL (Fix Immediately)**

1. **Fix Statement Generation**
   - Debug `generate_statement_data()` function
   - Verify storage bucket exists
   - Test statement generation manually
   - Create scheduled job for monthly generation

2. **Fix Withdrawal Issues**
   - Test withdrawal creation flow
   - Verify `can_withdraw()` function
   - Check approval workflow
   - Review audit logs for errors

3. **Enable RLS on Report Tables**
   - Add RLS policies to 5 report tables
   - Prevent unauthorized access to reports
   - Test policies with non-admin users

### 🟡 **HIGH PRIORITY (Fix This Week)**

4. **Fix Function Security Issues**
   - Add search_path to 4 functions
   - Follow security best practices

5. **Start NAV Calculations**
   - Backfill `daily_nav` table
   - Schedule daily NAV calculation
   - Enable fund performance tracking

6. **Consolidate Admin Functions**
   - Standardize on `is_admin_secure()`
   - Update all references
   - Remove obsolete variants

### 🟢 **MEDIUM PRIORITY (Fix This Month)**

7. **Schema Consolidation**
   - Plan assets v1 → v2 migration
   - Plan transactions v1 → v2 migration
   - Document migration strategy

8. **Clean Up Empty Tables**
   - Review 33 empty tables
   - Determine which are needed
   - Archive or drop unnecessary tables

9. **Improve Admin Views**
   - Create investor dashboard view
   - Add activity timeline view
   - Enhance existing views

### 🔵 **LOW PRIORITY (Nice to Have)**

10. **Remove Migration Functions**
    - Archive one-time migration functions
    - Document migration history
    - Clean up function namespace

11. **Database Optimization**
    - Add missing indexes
    - Optimize slow queries
    - Review query plans

---

## 9. Recommended Schema Improvements

### 9.1 Missing Indexes (Performance)
```sql
-- Transaction queries
CREATE INDEX idx_transactions_user_date ON transactions(user_id, created_at DESC);
CREATE INDEX idx_transactions_v2_portfolio_date ON transactions_v2(portfolio_id, occurred_at DESC);

-- Position queries
CREATE INDEX idx_positions_user_asset ON positions(user_id, asset_code);
CREATE INDEX idx_investor_positions_investor_fund ON investor_positions(investor_id, fund_id);

-- Statement queries
CREATE INDEX idx_statements_user_period ON statements(user_id, period_year, period_month);

-- Withdrawal queries
CREATE INDEX idx_withdrawals_status_date ON withdrawal_requests(status, request_date DESC);
```

### 9.2 Missing Constraints
```sql
-- Ensure positive amounts
ALTER TABLE transactions ADD CONSTRAINT chk_transactions_amount_positive
  CHECK (amount > 0);

ALTER TABLE withdrawal_requests ADD CONSTRAINT chk_withdrawal_amount_positive
  CHECK (requested_amount > 0);

-- Ensure valid date ranges
ALTER TABLE statements ADD CONSTRAINT chk_statements_month_valid
  CHECK (period_month BETWEEN 1 AND 12);
```

### 9.3 Audit Trail Enhancement
```sql
-- Add comprehensive audit trigger to key tables
CREATE TRIGGER audit_statements_changes
  AFTER INSERT OR UPDATE OR DELETE ON statements
  FOR EACH ROW EXECUTE FUNCTION log_data_edit();

CREATE TRIGGER audit_positions_changes
  AFTER INSERT OR UPDATE OR DELETE ON positions
  FOR EACH ROW EXECUTE FUNCTION log_data_edit();
```

---

## 10. Data Quality Issues

### 10.1 Inconsistencies Found

1. **Low Withdrawal Volume** - Only 1 withdrawal request for 27 investors
2. **Empty Statements** - 0 statements generated despite 27 active investors
3. **Missing NAV Data** - 0 daily NAV entries despite 6 active funds
4. **Sparse Transaction History** - Only 52 legacy transactions

**Recommendation:** Investigate if this is a new platform or if data migration is incomplete

---

## 11. Summary Statistics

| Category | Count | Notes |
|----------|-------|-------|
| **Tables** | 57 | 24 active, 33 empty |
| **Views** | 10 | All active |
| **Functions** | 88 | 4 with security warnings |
| **Edge Functions** | 35 | All deployed |
| **ENUMs** | 12 | Well-defined |
| **RLS Enabled** | 52/57 | 5 missing policies ❌ |
| **Empty Tables** | 33 | Review needed |
| **Active Users** | 27 | profiles + investors |
| **Funds** | 6 | Active funds |
| **Total Rows** | ~9,847 | Mostly in audit_log |

---

## 12. Final Recommendations

### Immediate Actions (This Week)
1. ✅ Fix statement generation - CRITICAL for user experience
2. ✅ Debug withdrawal issues - USER REPORTED PROBLEM
3. ✅ Enable RLS on 5 report tables - SECURITY ISSUE
4. ✅ Fix 4 function security warnings - SECURITY ISSUE

### Short Term (This Month)
5. ✅ Start NAV calculations for fund performance
6. ✅ Consolidate admin check functions
7. ✅ Plan asset/transaction table migration
8. ✅ Review and clean up 33 empty tables

### Long Term (Next Quarter)
9. ✅ Optimize database performance (indexes, constraints)
10. ✅ Complete v1 → v2 migrations
11. ✅ Remove obsolete migration functions
12. ✅ Enhance admin dashboards and views

---

## Appendix A: All Database Objects Reference

### Tables (57)
access_logs, admin_invites, admin_users, asset_prices, assets, assets_v2, audit_log, balance_adjustments, benchmarks, daily_aum_entries, daily_nav, daily_yield_applications, data_edit_audit, deposits, documents, fee_calculations, fees, fund_configurations, fund_daily_aum, fund_fee_history, funds, generated_reports, investor_monthly_reports, investor_positions, investors, monthly_fee_summary, notifications, platform_fees_collected, portfolio_history, portfolio_members, portfolio_nav_snapshots, portfolios_v2, positions, profiles, rate_limit_events, reconciliation, report_access_logs, report_definitions, report_schedules, report_shares, secure_shares, statements, support_tickets, system_2fa_policy, system_config, transactions, transactions_v2, user_access_logs_enhanced, user_sessions, user_totp_backup_codes, user_totp_settings, web_push_subscriptions, withdrawal_audit_logs, withdrawal_requests, yield_distribution_log, yield_rates, yield_settings, yield_sources

### Views (10)
admin_portfolio_overview_v, audit_events_v, investor_directory, investor_positions_by_class, portfolio_overview_v, positions_current_v, v_fund_kpis, v_investor_kpis, v_itd_returns, withdrawal_queue

### Edge Functions (35)
admin-backfill-historical, admin-user-management, calculate-performance, calculate-yield, check-admin-status, daily-yield-calculation, ef_register_session, ef_send_notification, excel_export, excel_import, generate-report, generate-tax-documents, get-crypto-prices, init-crypto-assets, investor-audit, mfa-totp-disable, mfa-totp-initiate, mfa-totp-status, mfa-totp-verify, parity_check, portfolio-api, price-proxy, process-deposit, process-webhooks, process-withdrawal, run-compliance-checks, send-admin-invite, send-email, send-notification-email, set-user-password, sign-statement-url, status, submit-to-airtable, update-prices, verify_recaptcha

---

**End of Report**

For questions or clarifications, please review the specific sections above.
