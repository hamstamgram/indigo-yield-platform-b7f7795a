# Indigo Yield Platform - Supabase Backend Audit Report
**Date:** 2025-12-02
**Project:** /Users/mama/indigo-yield-platform-v01

---

## Executive Summary

This comprehensive audit identifies gaps between the frontend TypeScript code and the Supabase backend database. The analysis reveals **CRITICAL** issues that will cause runtime errors, as well as numerous medium and high priority issues requiring attention.

### Key Findings:
- **8 CRITICAL issues** - Missing tables referenced in production code
- **3 HIGH priority issues** - Missing RPC functions 
- **2 MEDIUM priority issues** - Unreferenced Edge Functions
- **Multiple missing tables** in types.ts that don't exist in database

---

## 1. DATABASE TABLES AUDIT

### 1.1 CRITICAL: Tables Referenced in Code But Missing from Database

The following tables are referenced in frontend code but **DO NOT EXIST** in the Supabase database:

| Table Name | Status | Files Affected | Impact |
|------------|--------|----------------|--------|
| `transactions_v2` | **MISSING** | 15+ files | **CRITICAL** - Will cause runtime errors |
| `positions` | **MISSING** | 12+ files | **CRITICAL** - Portfolio display broken |
| `fee_calculations` | **MISSING** | feeService.ts (9 queries) | **CRITICAL** - Fee system broken |
| `platform_fees_collected` | **MISSING** | feeService.ts, expertInvestorService.ts | **CRITICAL** - Revenue tracking broken |
| `monthly_fee_summary` | **MISSING** | feeService.ts (2 queries) | **CRITICAL** - Fee reports broken |
| `investment_summary` | **MISSING** | investmentService.ts | **HIGH** - Summary views broken |
| `investments` | **MISSING** | 8+ files | **HIGH** - Investment tracking broken |
| `portfolio_history` | **MISSING** | expertInvestorService.ts | **MEDIUM** - Historical charts broken |
| `fund_daily_aum` | **MISSING** | aumService.ts (5 queries) | **CRITICAL** - AUM tracking broken |

#### Detailed File References:

**transactions_v2** (CRITICAL):
```
src/services/transactionService.ts:48
src/services/aumService.ts:84
src/services/depositService.ts:7, 77, 167, 189, 200, 218
src/services/withdrawalService.ts:124, 238, 245
src/utils/statementCalculations.ts
src/components/admin/AddTransactionDialog.tsx
src/components/admin/investors/InvestorTransactionsTab.tsx
src/components/profile/PrivacyTab.tsx
src/lib/reports/reportEngine.ts
src/routes/admin/transactions/AdminTransactionsPage.tsx
src/routes/transactions/TransactionsPage.tsx
src/routes/transactions/TransactionDetailsPage.tsx
```

**positions** (CRITICAL):
```
src/services/portfolioService.ts:30, 138
src/services/bulkOperationsService.ts:32, 148, 203, 229
src/services/expertInvestorService.ts:316, 493
src/services/depositService.ts:493, 500
src/utils/kpiCalculations.ts
src/components/admin/AdminPortfolios.tsx (5 queries)
src/components/admin/investors/InvestorPositionsTab.tsx
src/hooks/useAssetData.ts
```

**fee_calculations** (CRITICAL):
```
src/services/feeService.ts:242, 296, 335, 344, 353, 359, 379, 402, 429
```

**investments** (HIGH):
```
src/services/investmentService.ts:7, 66, 99, 124, 151, 178, 203
src/features/dashboard/hooks/useDashboardData.ts
src/components/admin/investors/InvestorTransactionsTab.tsx
src/routes/admin/AdminDashboard.tsx
```

### 1.2 Tables in types.ts But Missing from Database

The following tables are defined in `src/integrations/supabase/types.ts` but don't exist in the actual database:

```
admin_invites          - Defined in types.ts, NOT in database
assets                 - Defined in types.ts, NOT in database (assets_v2 exists)
assets_v2              - EXISTS (confirmed in database)
bank_accounts          - Defined in types.ts, NOT in database
crypto_wallets         - Defined in types.ts, NOT in database
daily_aum_entries      - Defined in types.ts, NOT in database
daily_nav              - Defined in types.ts, NOT in database
daily_yield_applications - Defined in types.ts, NOT in database
deposits               - Defined in types.ts, NOT in database
email_logs             - Defined in types.ts, NOT in database
fees                   - Defined in types.ts, NOT in database
generated_reports      - Defined in types.ts, NOT in database
investor_directory     - Defined in types.ts, NOT in database
investor_invites       - Defined in types.ts, NOT in database
onboarding_submissions - Defined in types.ts, NOT in database
portfolio_members      - Defined in types.ts, NOT in database
portfolio_nav_snapshots - Defined in types.ts, NOT in database
rate_limit_events      - Defined in types.ts, NOT in database
reconciliation         - Defined in types.ts, NOT in database
report_access_logs     - Defined in types.ts, NOT in database
report_definitions     - Defined in types.ts, NOT in database
report_schedules       - Defined in types.ts, NOT in database
report_shares          - Defined in types.ts, NOT in database
statements             - Defined in types.ts, NOT in database
support_tickets        - Defined in types.ts, NOT in database
system_config          - Defined in types.ts, NOT in database
transactions           - Defined in types.ts, NOT in database
user_totp_backup_codes - Defined in types.ts, NOT in database
user_totp_settings     - Defined in types.ts, NOT in database
withdrawal_audit_logs  - Defined in types.ts, NOT in database
yield_distribution_log - Defined in types.ts, NOT in database
yield_rates            - Defined in types.ts, NOT in database
yield_sources          - Defined in types.ts, NOT in database
```

### 1.3 Tables That Exist in Database

The following 23 tables actually exist in the database:

```
access_logs
admin_users
audit_log
balance_adjustments
benchmarks
daily_rates
documents
fund_configurations
fund_fee_history
funds
investor_emails
investor_monthly_reports
investor_positions
investors
notification_settings
notifications
platform_settings
price_alerts
profiles
secure_shares
user_sessions
web_push_subscriptions
yield_settings
```

---

## 2. RPC FUNCTIONS AUDIT

### 2.1 RPC Functions Called in Code

The following RPC functions are called in the frontend:

| Function Name | File Location | Status |
|---------------|---------------|--------|
| `apply_daily_yield_with_fees` | feeService.ts:53 | ✅ EXISTS |
| `get_investor_period_summary` | feeService.ts:175 | ✅ EXISTS |
| `get_profile_by_id` | investorService.ts:34, useAssetData.ts:54 | ✅ EXISTS |
| `create_withdrawal_request` | investorServiceV2.ts:261 | ✅ EXISTS |
| `set_fund_daily_aum` | aumService.ts:160 | ✅ EXISTS |
| `apply_daily_yield_to_fund` | aumService.ts:233 | ✅ EXISTS |
| `update_investor_aum_percentages` | aumService.ts:259 | ✅ EXISTS |
| `admin_create_transaction` | adminTransactionService.ts:14 | ✅ EXISTS |
| `get_user_reports` | reportsApi.ts:178 | ✅ EXISTS |
| `get_report_statistics` | reportsApi.ts:449 | ✅ EXISTS |
| `add_fund_to_investor` | fundService.ts:81 | ✅ EXISTS |
| `get_statement_period_summary` | statementsApi.ts:202 | ❌ **MISSING** |
| `finalize_statement_period` | statementsApi.ts:534 | ❌ **MISSING** |
| `get_investor_portfolio_summary` | PortfolioService.ts:15 | ✅ EXISTS |
| `get_total_aum` | kpiCalculations.ts:21 | ✅ EXISTS |
| `get_24h_interest` | kpiCalculations.ts:31 | ✅ EXISTS |
| `get_investor_count` | kpiCalculations.ts:41 | ✅ EXISTS |
| `get_profile_basic` | context.tsx:93 | ✅ EXISTS |
| `get_user_admin_status` | context.tsx:94 | ✅ EXISTS |

### 2.2 HIGH PRIORITY: Missing RPC Functions

These functions are called but **DO NOT EXIST** in the database:

1. **`get_statement_period_summary`** (HIGH)
   - File: `src/services/api/statementsApi.ts:202`
   - Impact: Statement generation will fail
   - Used for: Calculating period summaries for investor statements

2. **`finalize_statement_period`** (HIGH)  
   - File: `src/services/api/statementsApi.ts:534`
   - Impact: Statement finalization will fail
   - Used for: Closing out statement periods

### 2.3 RPC Functions in Database But Not Called

The database contains 97 RPC functions. The following are NOT referenced in frontend code (partial list of notable ones):

```
approve_withdrawal
backfill_historical_positions
calculate_positions
can_withdraw
cancel_withdrawal_by_admin
check_portfolio_access
cleanup_expired_reports
complete_withdrawal
create_daily_aum_entry
decrypt_totp_secret
distribute_monthly_yield
generate_document_path
generate_monthly_report_template
generate_statement_data
generate_statement_path
get_all_investors_with_details
get_all_investors_with_summary
get_all_non_admin_profiles
get_fund_net_flows
get_historical_position_data
get_pending_withdrawals
log_access_event
log_audit_event
log_security_event
recalculate_aum_percentages
reject_withdrawal
start_processing_withdrawal
validate_investment_integrity
```

---

## 3. EDGE FUNCTIONS AUDIT

### 3.1 Edge Functions Called in Code

| Function Name | File Location | Deployed? |
|---------------|---------------|-----------|
| `send-email` | statementsApi.ts:454 | ✅ YES |
| `send-admin-invite` | AdminInvites.tsx:135, AdminUsersList.tsx:148 | ✅ YES |
| `set-user-password` | AdminUserManagement.tsx:33 | ✅ YES |
| `send-investor-report` | InvestorReports.tsx:368 | ✅ YES |
| `send-notification-email` | AdminStatementsPage.tsx:165 | ✅ YES |

### 3.2 Edge Functions Deployed But Not Called

The following Edge Functions exist in `supabase/functions/` but are NOT referenced in the frontend code:

```
admin-backfill-historical
admin-user-management
calculate-performance
calculate-yield
create-admin-user
ef_register_session
ef_send_notification
excel_export
excel_import
generate-report
generate-tax-documents
get-crypto-prices
init-crypto-assets
investor-audit
mfa-totp-disable
mfa-totp-initiate
mfa-totp-status
mfa-totp-verify
parity_check
portfolio-api
process-deposit
process-webhooks
process-withdrawal
run-compliance-checks
status
update-prices
upload-statement (newly created, empty)
verify_recaptcha
```

**Note:** Some of these may be called from backend jobs, webhooks, or scheduled tasks rather than directly from the frontend.

---

## 4. FOREIGN KEY / RELATIONSHIP ISSUES

### 4.1 Join Queries Found

The following join patterns were found in the code:

```typescript
// withdrawal_requests table (MISSING from database)
.select("*, investors(profile_id), funds(asset_symbol, fund_class)")
// File: src/services/withdrawalService.ts:101, 186

// investor_positions table (EXISTS)
.select("*, investor:investor_id(name)")
// File: src/services/dataIntegrityService.ts:308

// investor_positions table (EXISTS)  
.select("*, funds(name, code, asset_symbol)")
// File: src/lib/reports/reportEngine.ts:85

// profiles table (EXISTS)
.select("*, profile:profiles(*)")
// File: src/lib/report-generator.ts:51
```

### 4.2 Potential Foreign Key Issues

Since several referenced tables don't exist, the following join queries will fail:

1. **withdrawal_requests joins** - Table doesn't exist in database
2. **transactions_v2 joins** - Table doesn't exist in database  
3. **positions joins** - Table doesn't exist in database

---

## 5. COLUMN-LEVEL ISSUES

### 5.1 Tables With Confirmed Columns

The following tables exist with verified column structures:

**profiles** table (24 columns):
```
id, email, first_name, last_name, phone, is_admin, fee_percentage, avatar_url,
totp_enabled, totp_verified, created_at, updated_at, status, full_name, user_type,
date_of_birth, address, city, state, postal_code, country, kyc_status,
kyc_verified_at, kyc_rejection_reason
```

**investors** table (14 columns):
```
id, name, email, phone, tax_id, entity_type, kyc_status, kyc_date, aml_status,
accredited, status, onboarding_date, profile_id, created_at, updated_at
```

**investor_positions** table (17 columns):
```
investor_id, fund_id, shares, cost_basis, current_value, unrealized_pnl,
realized_pnl, last_transaction_date, lock_until_date, high_water_mark,
mgmt_fees_paid, perf_fees_paid, updated_at, fund_class, last_modified_by,
last_modified_at, aum_percentage
```

**funds** table (16 columns):
```
id, code, name, asset, inception_date, status, mgmt_fee_bps, perf_fee_bps,
high_water_mark, min_investment, lock_period_days, created_at, updated_at,
fund_class, total_aum, asset_symbol
```

**investor_monthly_reports** table (15 columns):
```
id, investor_id, report_month, asset_code, opening_balance, closing_balance,
additions, withdrawals, yield_earned, aum_manual_override, entry_date,
exit_date, created_at, updated_at, edited_by
```

**fund_fee_history** table (6 columns):
```
id, fund_id, mgmt_fee_bps, perf_fee_bps, effective_from, created_by, created_at
```

**balance_adjustments** table (9 columns):
```
id, user_id, fund_id, amount, currency, reason, notes, audit_ref,
created_at, created_by
```

### 5.2 Column Mismatch Analysis

Cannot perform detailed column mismatch analysis for missing tables:
- `transactions_v2` - Table doesn't exist
- `positions` - Table doesn't exist
- `fee_calculations` - Table doesn't exist
- `platform_fees_collected` - Table doesn't exist
- `monthly_fee_summary` - Table doesn't exist
- `investment_summary` - Table doesn't exist
- `investments` - Table doesn't exist
- `portfolio_history` - Table doesn't exist
- `fund_daily_aum` - Table doesn't exist

---

## 6. PRIORITY RECOMMENDATIONS

### CRITICAL (Fix Immediately - Production Blockers)

1. **Create missing core tables** or update code to use correct table names:
   - `transactions_v2` (15+ files affected)
   - `positions` (12+ files affected)
   - `fee_calculations` (9 queries in feeService.ts)
   - `platform_fees_collected` (revenue tracking)
   - `monthly_fee_summary` (fee reporting)
   - `fund_daily_aum` (AUM calculations)

2. **Investigate schema mismatch**: 
   - types.ts defines 50+ tables
   - Database only has 23 tables
   - This suggests either:
     a) types.ts is outdated/incorrect
     b) Migration scripts weren't run
     c) Wrong database environment

### HIGH Priority (Fix Within 1 Week)

1. **Create missing RPC functions**:
   - `get_statement_period_summary`
   - `finalize_statement_period` 

2. **Fix missing tables**:
   - `investments` (8 files affected)
   - `investment_summary` (summary views)

3. **Update types.ts** to match actual database schema

### MEDIUM Priority (Fix Within 2 Weeks)

1. **Document unused Edge Functions** - Determine if they should be called or removed
2. **Fix missing `portfolio_history` table** for historical charts
3. **Review admin_invites** - Used in code but missing from database

### LOW Priority (Tech Debt)

1. Clean up unused RPC functions in database
2. Remove unused table definitions from types.ts
3. Add better error handling for missing tables
4. Implement database schema validation tests

---

## 7. NEXT STEPS

### Immediate Actions Required:

1. **Determine root cause** of table mismatch:
   ```bash
   # Check if connected to correct database
   # Verify SUPABASE_URL and SUPABASE_ANON_KEY in .env
   # Check if migrations need to be run
   ```

2. **Run schema verification**:
   ```sql
   -- Compare expected vs actual tables
   SELECT table_name 
   FROM information_schema.tables 
   WHERE table_schema = 'public' 
   AND table_type = 'BASE TABLE';
   ```

3. **Create migration plan** for missing tables

4. **Add runtime error handling** for missing tables as temporary fix

5. **Update types.ts** to reflect actual database schema

### Recommended Investigation:

- Check `supabase/migrations/` directory for pending migrations
- Review `APPLY_ALL_MIGRATIONS.sql` and other migration scripts
- Verify database connection strings in environment variables
- Check if different environments (dev/staging/prod) have different schemas

---

## 8. FILES REQUIRING IMMEDIATE ATTENTION

### Files with CRITICAL issues (will fail at runtime):

```
src/services/feeService.ts - 9 queries to fee_calculations (missing)
src/services/depositService.ts - 9 queries to transactions_v2 (missing)
src/services/withdrawalService.ts - 6 queries to transactions_v2, withdrawal_requests (missing)
src/services/portfolioService.ts - 4 queries to positions (missing)
src/services/bulkOperationsService.ts - 6 queries to positions (missing)
src/services/aumService.ts - 7 queries to fund_daily_aum, transactions_v2 (missing)
src/services/investmentService.ts - 7 queries to investments (missing)
src/services/expertInvestorService.ts - 3 queries to positions, portfolio_history (missing)
src/services/api/statementsApi.ts - 2 RPC calls to missing functions
src/routes/admin/AdminDashboard.tsx - queries to investments (missing)
src/routes/transactions/TransactionsPage.tsx - queries to transactions_v2 (missing)
src/components/admin/AdminPortfolios.tsx - 5 queries to positions (missing)
```

---

## APPENDIX A: Audit Methodology

This audit was performed using:
1. Supabase Management API to query actual database schema
2. Grep/ripgrep analysis of TypeScript/TSX source files
3. Manual inspection of types.ts table definitions
4. Cross-reference of frontend queries vs backend tables
5. Analysis of RPC function calls vs database functions
6. Review of Edge Functions directory vs function invocations

---

## APPENDIX B: Database Connection Details

- **Project Reference:** nkfimvovosdehmyyjubn
- **Access Token:** sbp_d6447fd289e297e5c7c2c51f954a36a0a1e94641
- **API Endpoint:** https://api.supabase.com/v1/projects/{ref}/database/query
- **Audit Date:** 2025-12-02
- **Project Path:** /Users/mama/indigo-yield-platform-v01

---

**END OF REPORT**
