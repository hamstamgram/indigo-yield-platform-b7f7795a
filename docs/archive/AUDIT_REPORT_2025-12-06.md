# Comprehensive Codebase & Database Audit Report

> **Generated:** 2025-12-06 21:40 UTC
> **Project:** indigo-yield-platform-v01
> **Audit Type:** Full System Analysis (Ultrathink)

---

## Executive Summary

| Category | Status | Issues Found |
|----------|--------|--------------|
| **Build Status** | ✅ PASS | Compiles in 4.67s |
| **Database Tables** | ⚠️ GAPS | 13 missing, 16 unused |
| **RPC Functions** | ⚠️ GAPS | 16 missing, 40 unused |
| **Security (PII Logging)** | ⚠️ ISSUES | 19 console.log statements with sensitive data |
| **Security (Secrets)** | ✅ OK | No hardcoded API keys found |
| **RLS Policies** | ✅ OK | 235 policies configured |
| **Migration Sync** | ❌ BROKEN | Local/remote out of sync |

---

## 1. Database Schema Analysis

### 1.1 Tables Summary
- **Code references:** 50 tables
- **Database has:** 53 tables
- **Missing in DB (will cause runtime errors):** 13
- **Extra in DB (unused):** 16

### 1.2 Missing Tables (CRITICAL)

These tables are referenced in code but don't exist in the database:

| Table | Used In | Impact |
|-------|---------|--------|
| `fund_daily_aum` | `aumService.ts:64,200,338` | AUM calculations broken |
| `generated_reports` | `PerformanceReportPage.tsx:18` | Report viewing broken |
| `investments` | `AdminDashboard.tsx:97`, `AdminOperationsHub.tsx:85` | Dashboard errors |
| `admin_users` | Various | Admin user management |
| `investment_summary` | Services | Portfolio summaries |
| `reports` | Reports feature | Report generation |
| `report_definitions` | Reports feature | Report templates |
| `report_schedules` | Reports feature | Scheduled reports |
| `report_access_logs` | Reports feature | Report audit trail |
| `price_alerts` | Notifications | Price alert feature |
| `platform_fees_collected` | Fees | Fee tracking |
| `monthly_fee_summary` | Fees | Fee summaries |
| `kyc-documents` | Storage bucket ref | KYC document storage |

### 1.3 Unused Tables (Cleanup Candidates)

These tables exist but aren't referenced in code:

```
audit_logs, benchmarks, data_edit_audit, excel_import_log,
fees, fund_configurations, import_locks, reconciliation,
secure_shares, statement_metadata, system_2fa_policy,
user_access_logs_enhanced, user_totp_backup_codes,
web_push_subscriptions, withdrawal_audit_logs, yield_settings
```

---

## 2. RPC Functions Analysis

### 2.1 Functions Summary
- **Code calls:** 23 functions
- **Database has:** 47 functions
- **Missing in DB (will cause runtime errors):** 16
- **Extra in DB (unused):** 40

### 2.2 Missing Functions (CRITICAL)

| Function | Used In | Purpose |
|----------|---------|---------|
| `get_profile_by_id` | `investorService.ts:31` | Profile lookup |
| `get_investor_portfolio_summary` | `PortfolioService.ts:15,96` | Portfolio aggregation |
| `add_fund_to_investor` | `fundService.ts:79` | Add investor to fund |
| `admin_create_transaction` | `adminTransactionService.ts:14` | Admin transactions |
| `log_security_event` | `security-logger.ts:140` | Security audit logging |
| `get_report_statistics` | Reports | Report analytics |
| `get_user_reports` | Reports | User report access |
| `apply_daily_yield_to_fund` | Yield processing | Daily yield application |
| `apply_daily_yield_with_fees` | Yield processing | Yield with fee deduction |
| `distribute_monthly_yield` | Yield processing | Monthly distribution |
| `get_fund_net_flows` | Analytics | Fund flow calculation |
| `get_investor_period_summary` | Statements | Period summaries |
| `send_daily_rate_notifications` | Notifications | Rate notifications |
| `set_fund_daily_aum` | AUM tracking | Daily AUM recording |
| `update_fund_aum_baseline` | AUM tracking | AUM baseline updates |
| `update_investor_aum_percentages` | AUM tracking | Investor % updates |

---

## 3. Security Analysis

### 3.1 PII Logging Issues (HIGH PRIORITY)

The following files contain `console.log` statements that may expose sensitive data:

| File | Line | Issue |
|------|------|-------|
| `MobileInvestorCard/index.tsx` | 71 | Logs investor ID and fee |
| `MobileInvestorCard/index.tsx` | 94 | Logs fee update response |
| `Login.tsx` | 75 | Logs email during login |
| `Login.tsx` | 94 | Logs user object on success |
| `AdminPortfolios.tsx` | 113 | Logs user count |
| `DashboardLayout.tsx` | 28 | Logs user redirect |
| `InvestorManagementPanel.tsx` | 43, 53 | Logs investor data updates |
| `useRealtimeSubscription.ts` | 41, 46 | Logs real-time payloads |

### 3.2 Hardcoded Secrets
- ✅ **No hardcoded API keys or tokens found**
- ✅ **TOTP secrets properly handled in dedicated auth code**

### 3.3 TODOs Requiring Attention

| File | Issue |
|------|-------|
| `mfa-manager.ts:176` | TODO: Implement server-side secret storage |
| `totp-service.ts:39,53,73` | TODO: Implement TOTP with otplib |
| `totp-service.ts:105,114` | TODO: Generate secure backup codes |

---

## 4. Migration Status

### 4.1 Current State
- **Local migrations:** 20 files (20251205150000 - 20251206220000)
- **Remote migrations:** 45+ (includes old 001-015 format)
- **Status:** ❌ OUT OF SYNC

### 4.2 Migration Sync Issue

The remote database has migrations (001, 002, 003, etc.) that don't exist locally. This prevents `supabase db push` from working.

**Recommended Fix:**
```bash
# Option 1: Repair migration history
supabase migration repair --status reverted 001 002 003 004 007 008 009 010 011 012 013 014 015

# Option 2: Pull remote and reconcile
supabase db pull
```

---

## 5. Build Analysis

### 5.1 Build Status
- ✅ **Compilation:** Success (4.67s)
- ⚠️ **Chunk Warning:** `excelGenerator` chunk > 500KB

### 5.2 Bundle Size Concerns

| Chunk | Size | Status |
|-------|------|--------|
| `excelGenerator` | 947 KB | ⚠️ Too large |
| `pdf` | 415 KB | Acceptable |
| `index` | 369 KB | Acceptable |
| `html2canvas` | 201 KB | Acceptable |

---

## 6. Recommended Fixes (Priority Order)

### Phase 1: Critical Database Fixes (IMMEDIATE)

1. **Create missing tables** - Without these, major features are broken:
   - `fund_daily_aum`
   - `generated_reports`
   - `investments`

2. **Create missing RPC functions**:
   - `get_profile_by_id`
   - `get_investor_portfolio_summary`
   - `add_fund_to_investor`
   - `admin_create_transaction`
   - `log_security_event`

### Phase 2: Security Fixes (HIGH)

1. Remove PII from console.log in:
   - `MobileInvestorCard/index.tsx`
   - `Login.tsx`
   - `AdminPortfolios.tsx`

2. Add NODE_ENV guards to remaining debug logs

### Phase 3: Migration Sync (MEDIUM)

1. Run `supabase migration repair` to fix history
2. Generate fresh types: `supabase gen types typescript`

### Phase 4: Code Cleanup (LOW)

1. Remove or implement the unused 16 database tables
2. Consider removing unused 40 RPC functions
3. Address TODOs in MFA implementation

---

## 7. Verification Commands

```bash
# After fixes, verify:

# 1. Check missing tables resolved
grep -rn '"fund_daily_aum"\|"generated_reports"\|"investments"' src/

# 2. Check missing functions resolved
grep -rn '"get_profile_by_id"\|"log_security_event"' src/

# 3. Check PII logging removed
grep -rn "console.log" src/ | grep -i "investor\|user\|email" | wc -l

# 4. Verify build
npm run build

# 5. Verify migrations
supabase migration list
```

---

## Appendix A: Full Table Comparison

### Tables in Database (53)
```
access_logs, admin_invites, assets, audit_log, audit_logs,
balance_adjustments, benchmarks, daily_nav, daily_rates,
data_edit_audit, deposits, documents, email_logs,
excel_import_log, fee_calculations, fees, fund_configurations,
fund_fee_history, funds, generated_statements, import_locks,
investor_emails, investor_fund_performance, investor_invites,
investor_monthly_reports, investor_positions, investors,
notification_settings, notifications, onboarding_submissions,
portfolio_history, positions, profiles, reconciliation,
secure_shares, statement_email_delivery, statement_metadata,
statement_periods, statements, support_tickets, system_2fa_policy,
system_config, transactions, transactions_v2,
user_access_logs_enhanced, user_sessions, user_totp_backup_codes,
user_totp_settings, web_push_subscriptions, withdrawal_audit_logs,
withdrawal_requests, yield_rates, yield_settings
```

### Tables in Code (50)
```
access_logs, admin_invites, admin_users, assets, audit_log,
balance_adjustments, daily_nav, daily_rates, deposits, documents,
email_logs, fee_calculations, fund_daily_aum, fund_fee_history,
funds, generated_reports, generated_statements, investment_summary,
investments, investor_emails, investor_fund_performance,
investor_invites, investor_monthly_reports, investor_positions,
investors, kyc-documents, monthly_fee_summary, notification_settings,
notifications, onboarding_submissions, platform_fees_collected,
portfolio_history, positions, price_alerts, profiles,
report_access_logs, report_definitions, report_schedules, reports,
statement_email_delivery, statement_periods, statements,
support_tickets, system_config, transactions, transactions_v2,
user_sessions, user_totp_settings, withdrawal_requests, yield_rates
```

---

*Generated by Claude Code Ultrathink Audit*
