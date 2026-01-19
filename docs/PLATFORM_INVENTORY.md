# Platform Inventory
## INDIGO Crypto Yield Platform - Complete System Inventory

**Generated:** 2026-01-19  
**Version:** Phase 2 Cleanup Complete

---

## 1. Frontend Routes (115 Total)

### 1.1 Public Routes (No Auth Required)

| Route | Component | Purpose |
|-------|-----------|---------|
| `/login` | `LoginPage` | User authentication |
| `/forgot-password` | `ForgotPasswordPage` | Password reset request |
| `/reset-password` | `ResetPasswordPage` | Password reset form |
| `/terms` | `TermsOfService` | Legal terms |
| `/privacy` | `PrivacyPolicy` | Privacy policy |
| `/health` | `HealthCheck` | System health endpoint |
| `/status` | `StatusPage` | System status |
| `/ib-signup/:inviteCode` | `IBSignupPage` | IB invite registration |

### 1.2 Investor Portal Routes (Role: investor)

| Route | Component | Data Dependencies | Mutations |
|-------|-----------|-------------------|-----------|
| `/investor` | `InvestorOverviewPage` | `investor_positions`, `transactions_v2` | None |
| `/investor/portfolio` | `PortfolioPage` | `investor_positions`, `funds` | None |
| `/investor/performance` | `PerformancePage` | `investor_positions`, `yield_distributions` | None |
| `/investor/transactions` | `TransactionsPage` | `transactions_v2` | None |
| `/investor/transactions/:id` | `TransactionDetailPage` | `transactions_v2` | None |
| `/investor/statements` | `StatementsPage` | `generated_statements`, `documents` | None |
| `/investor/documents` | `DocumentsPage` | `documents` | None |
| `/investor/settings` | `SettingsPage` | `profiles`, `user_totp_settings` | `profiles.update` |
| `/investor/yield-history` | `YieldHistoryPage` | `investor_yield_events` | None |
| `/investor/deposits` | `InvestorDepositsPage` | `transactions_v2` (type=DEPOSIT) | None |
| `/investor/withdrawals` | `InvestorWithdrawalsPage` | `withdrawal_requests` | `create_withdrawal_request` |

### 1.3 Admin Portal Routes (Role: admin)

| Route | Component | Data Dependencies | Mutations |
|-------|-----------|-------------------|-----------|
| `/admin` | `AdminDashboard` | `funds`, `investor_positions`, `transactions_v2` | None |
| `/admin/deposits` | `AdminDepositsPage` | `transactions_v2` (deposits) | `apply_deposit_with_crystallization` |
| `/admin/withdrawals` | `AdminWithdrawalsPage` | `withdrawal_requests` | `approve_withdrawal`, `reject_withdrawal` |
| `/admin/yield` | `YieldOperationsPage` | `funds`, `fund_daily_aum` | `apply_daily_yield_to_fund_v3` |
| `/admin/yield/preview` | `YieldPreviewPage` | `funds`, `investor_positions` | `preview_daily_yield_to_fund_v3` |
| `/admin/recorded-yields` | `RecordedYieldsPage` | `yield_distributions` | None |
| `/admin/funds` | `FundManagementPage` | `funds`, `fund_daily_aum` | CRUD on `funds` |
| `/admin/funds/:id` | `FundDetailPage` | `funds`, `investor_positions` | Fund updates |
| `/admin/investors` | `InvestorManagementPage` | `profiles`, `investor_positions` | Profile updates |
| `/admin/investors/:id` | `InvestorDetailPage` | `profiles`, `investor_positions`, `transactions_v2` | Position updates |
| `/admin/transactions` | `TransactionHistoryPage` | `transactions_v2` | `void_transaction` |
| `/admin/transactions/:id` | `TransactionDetailPage` | `transactions_v2` | `void_transaction` |
| `/admin/ib` | `IBManagementPage` | `ib_allocations`, `profiles` | IB CRUD |
| `/admin/ib/:id` | `IBDetailPage` | `ib_allocations`, `ib_commission_ledger` | Allocation updates |
| `/admin/statements` | `StatementsManagementPage` | `statement_periods`, `generated_statements` | Statement generation |
| `/admin/reports` | `ReportsPage` | `generated_reports` | Report generation |
| `/admin/integrity` | `IntegrityDashboard` | Views: `fund_aum_mismatch`, `v_ledger_reconciliation` | Corrections |
| `/admin/audit-log` | `AuditLogPage` | `audit_log` | None |
| `/admin/settings` | `AdminSettingsPage` | System configs | Config updates |

### 1.4 IB Portal Routes (Role: ib)

| Route | Component | Data Dependencies | Mutations |
|-------|-----------|-------------------|-----------|
| `/ib` | `IBOverviewPage` | `ib_allocations`, `profiles` | None |
| `/ib/referrals` | `ReferralsPage` | `profiles` (referrals) | None |
| `/ib/referrals/:id` | `ReferralDetailPage` | `profiles`, `investor_positions` | None |
| `/ib/commissions` | `CommissionsPage` | `ib_commission_ledger` | None |
| `/ib/payouts` | `PayoutsPage` | `ib_payouts` | None |
| `/ib/settings` | `IBSettingsPage` | `profiles`, `ib_allocations` | Profile updates |

---

## 2. Frontend API Surface

### 2.1 RPC Gateway Calls (Primary Pattern)

All mutations go through `src/lib/rpc.ts` gateway:

```typescript
rpc.call<T>(functionName: RPCFunctionName, params: Record<string, unknown>): Promise<T>
```

**Critical Mutation RPCs Called:**

| RPC Function | Called From | Parameters |
|--------------|-------------|------------|
| `apply_deposit_with_crystallization` | `depositService.createDeposit()` | `p_fund_id, p_investor_id, p_amount, p_closing_aum, p_effective_date, p_admin_id, p_notes, p_purpose` |
| `apply_withdrawal_with_crystallization` | `withdrawalService.applyWithdrawal()` | `p_fund_id, p_investor_id, p_amount, p_new_total_aum, p_tx_date, p_admin_id, p_notes, p_purpose` |
| `apply_daily_yield_to_fund_v3` | `yieldOperationsService.applyYield()` | `p_fund_id, p_yield_date, p_gross_yield_pct, p_created_by, p_purpose` |
| `preview_daily_yield_to_fund_v3` | `yieldOperationsService.previewYield()` | `p_fund_id, p_yield_date, p_new_aum, p_purpose` |
| `void_transaction` | `transactionService.voidTransaction()` | `p_transaction_id, p_reason, p_admin_id` |
| `create_withdrawal_request` | `withdrawalService.createRequest()` | `p_investor_id, p_fund_id, p_amount, p_asset` |
| `approve_withdrawal` | `withdrawalService.approve()` | `p_request_id, p_admin_id, p_approved_amount` |
| `reject_withdrawal` | `withdrawalService.reject()` | `p_request_id, p_admin_id, p_reason` |

### 2.2 Direct Database Reads (supabase.from)

| Service | Table | Query Pattern |
|---------|-------|---------------|
| `fundService` | `funds` | `.select('*').order('name')` |
| `fundService` | `fund_daily_aum` | `.select('*').eq('fund_id', id).order('aum_date', { ascending: false })` |
| `positionService` | `investor_positions` | `.select('*, funds(*)')` |
| `transactionService` | `transactions_v2` | `.select('*').eq('investor_id', id)` |
| `withdrawalService` | `withdrawal_requests` | `.select('*, profiles(*), funds(*)')` |
| `yieldService` | `yield_distributions` | `.select('*').eq('fund_id', id)` |
| `profileService` | `profiles` | `.select('*').eq('id', userId)` |
| `auditService` | `audit_log` | `.select('*').order('created_at', { ascending: false })` |

### 2.3 Edge Function Calls

| Function | Auth | Called From | Purpose |
|----------|------|-------------|---------|
| `process-withdrawal` | JWT | WithdrawalRequestForm | Create withdrawal with compliance |
| `generate-report` | JWT/Admin | ReportsPage | Async report generation |
| `generate-monthly-statements` | Admin | StatementsPage | Batch statement generation |
| `send-notification-email` | Service | Various | Email delivery |
| `mfa-totp-generate` | JWT | SettingsPage | Generate TOTP secret |
| `mfa-totp-verify` | JWT | SettingsPage | Verify TOTP code |
| `mfa-totp-disable` | JWT | SettingsPage | Disable 2FA |

---

## 3. Backend RPC Functions

### 3.1 Canonical Mutation RPCs (PROTECTED)

These are the ONLY authorized paths for financial mutations:

| Function | Signature | Target Tables | Security |
|----------|-----------|---------------|----------|
| `apply_deposit_with_crystallization` | `(p_fund_id uuid, p_investor_id uuid, p_amount numeric, p_closing_aum numeric, p_effective_date date, p_admin_id uuid, p_notes text, p_purpose aum_purpose) → json` | `transactions_v2`, `investor_positions`, `fund_aum_events`, `fund_daily_aum` | DEFINER |
| `apply_withdrawal_with_crystallization` | `(p_fund_id uuid, p_investor_id uuid, p_amount numeric, p_new_total_aum numeric, p_tx_date date, p_admin_id uuid, p_notes text, p_purpose aum_purpose) → json` | `transactions_v2`, `investor_positions`, `fund_aum_events`, `fund_daily_aum` | DEFINER |
| `apply_daily_yield_to_fund_v3` | `(p_fund_id uuid, p_yield_date date, p_gross_yield_pct numeric, p_created_by uuid, p_purpose aum_purpose) → jsonb` | `yield_distributions`, `investor_yield_events`, `transactions_v2`, `investor_positions` | DEFINER |
| `apply_transaction_with_crystallization` | `(p_investor_id uuid, p_fund_id uuid, p_tx_type text, p_amount numeric, ...) → jsonb` | `transactions_v2`, `investor_positions`, `fund_aum_events` | DEFINER |
| `apply_yield_correction_v2` | `(p_fund_id uuid, p_period_start date, p_period_end date, ...) → jsonb` | `yield_distributions`, `correction_runs` | DEFINER |

### 3.2 Withdrawal Workflow RPCs

| Function | Purpose | Status Transitions |
|----------|---------|-------------------|
| `create_withdrawal_request` | Create pending request | → `pending` |
| `approve_withdrawal` | Admin approves | `pending` → `approved` |
| `reject_withdrawal` | Admin rejects | `pending` → `rejected` |
| `start_processing_withdrawal` | Begin processing | `approved` → `processing` |
| `complete_withdrawal` | Mark complete | `processing` → `completed` |
| `cancel_withdrawal_by_admin` | Admin cancel | `pending/approved` → `cancelled` |
| `route_withdrawal_to_fees` | Fee routing | Updates fee allocations |

### 3.3 Read-Only RPCs

| Function | Returns | Used By |
|----------|---------|---------|
| `preview_daily_yield_to_fund_v3` | Yield preview data | YieldPreviewPage |
| `get_fund_positions` | Fund investor positions | FundDetailPage |
| `get_investor_portfolio` | Investor holdings | InvestorPortfolio |
| `check_aum_reconciliation` | Reconciliation status | IntegrityDashboard |
| `validate_aum_matches_positions` | Validation result | IntegrityDashboard |

### 3.4 Integrity Check RPCs

| Function | Purpose |
|----------|---------|
| `run_integrity_check` | Full system integrity scan |
| `check_system_integrity` | Quick health check |
| `verify_yield_distribution_balance` | Yield conservation check |
| `detect_orphaned_transactions` | Find unlinked transactions |
| `repair_position_from_ledger` | Position recalculation |

---

## 4. Database Schema

### 4.1 Core Financial Tables

#### transactions_v2
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| investor_id | uuid | NO | - | FK → profiles.id |
| fund_id | uuid | NO | - | FK → funds.id |
| type | tx_type | NO | - | ENUM |
| amount | numeric | NO | - | Always positive |
| tx_date | date | NO | - | Entry date |
| value_date | date | YES | - | Economic date |
| asset | text | NO | - | BTC, ETH, etc |
| fund_class | text | YES | - | = asset |
| source | tx_source | YES | - | ENUM |
| visibility_scope | visibility_scope | YES | 'investor_visible' | ENUM |
| is_voided | boolean | NO | false | Soft delete |
| voided_at | timestamptz | YES | - | Void timestamp |
| voided_by | uuid | YES | - | Admin who voided |
| notes | text | YES | - | Admin notes |
| created_at | timestamptz | NO | now() | |
| created_by | uuid | YES | - | Admin ID |
| reference_id | text | YES | - | Idempotency key |

**RLS:** Admin full access, Investor read own + investor_visible only

#### investor_positions
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| investor_id | uuid | NO | - | Composite PK |
| fund_id | uuid | NO | - | Composite PK |
| current_value | numeric | NO | 0 | Current balance |
| cost_basis | numeric | YES | 0 | Total invested |
| units | numeric | YES | - | Share units |
| last_tx_date | date | YES | - | Last transaction |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

**RLS:** Admin full access, Investor read own positions

#### withdrawal_requests
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| investor_id | uuid | NO | - | FK → profiles.id |
| fund_id | uuid | NO | - | FK → funds.id |
| requested_amount | numeric | NO | - | Original request |
| approved_amount | numeric | YES | - | May be partial |
| status | withdrawal_status | NO | 'pending' | ENUM |
| wallet_address | text | YES | - | Destination |
| approved_by | uuid | YES | - | Admin ID |
| approved_at | timestamptz | YES | - | |
| completed_at | timestamptz | YES | - | |
| rejection_reason | text | YES | - | |
| created_at | timestamptz | NO | now() | |

**RLS:** Admin full access, Investor CRUD own pending requests

#### yield_distributions
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| fund_id | uuid | NO | - | FK → funds.id |
| effective_date | date | NO | - | Yield date |
| gross_yield | numeric | NO | - | Total yield amount |
| yield_rate | numeric | YES | - | Percentage |
| summary_json | jsonb | YES | - | Distribution details |
| is_voided | boolean | NO | false | Soft delete |
| created_at | timestamptz | NO | now() | |
| created_by | uuid | YES | - | Admin ID |

**RLS:** Admin only

### 4.2 Fund Tables

#### funds
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| code | text | NO | - | Unique code |
| name | text | NO | - | Display name |
| asset | text | NO | - | BTC, ETH, etc |
| status | fund_status | YES | 'active' | ENUM |
| strategy | text | YES | - | Description |
| inception_date | date | NO | CURRENT_DATE | |
| mgmt_fee_bps | integer | YES | 0 | Management fee |
| perf_fee_bps | integer | YES | 2000 | Performance fee (20%) |
| high_water_mark | numeric | YES | 0 | HWM for perf fee |
| min_investment | numeric | YES | - | Minimum deposit |
| lock_period_days | integer | YES | - | Lock-up period |
| cooling_off_hours | integer | YES | - | Withdrawal cooling |
| large_withdrawal_threshold | numeric | YES | - | Approval threshold |

#### fund_daily_aum
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| fund_id | uuid | NO | - | FK → funds.id |
| aum_date | date | NO | - | Snapshot date |
| total_aum | numeric | NO | 0 | AUM value |
| purpose | aum_purpose | NO | 'transaction' | ENUM |
| nav_per_share | numeric | YES | - | NAV |
| total_shares | numeric | YES | - | Outstanding shares |
| is_voided | boolean | NO | false | Soft delete |
| source | text | YES | 'ingested' | Data source |
| created_at | timestamptz | YES | now() | |
| created_by | uuid | YES | - | |

#### fund_aum_events
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| fund_id | uuid | NO | - | FK → funds.id |
| event_ts | timestamptz | NO | - | Event time |
| event_date | date | NO | - | Event date |
| purpose | aum_purpose | NO | - | ENUM |
| trigger_type | text | NO | - | deposit/withdrawal/yield |
| trigger_reference | text | YES | - | Transaction ID |
| opening_aum | numeric | NO | - | Before event |
| post_flow_aum | numeric | YES | - | After flow |
| closing_aum | numeric | NO | - | After all effects |
| is_voided | boolean | NO | false | Soft delete |

### 4.3 User Tables

#### profiles
| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | - | PK, FK → auth.users |
| email | text | NO | - | Unique |
| first_name | text | YES | - | |
| last_name | text | YES | - | |
| role | app_role | YES | 'investor' | ENUM |
| account_type | account_type | YES | 'investor' | ENUM |
| status | text | YES | 'active' | |
| phone | text | YES | - | |
| wallet_address | text | YES | - | Crypto address |
| ib_id | uuid | YES | - | Referring IB |
| created_at | timestamptz | YES | now() | |
| updated_at | timestamptz | YES | now() | |

---

## 5. Database Enums

### 5.1 Transaction Enums

| Enum | Values | Usage |
|------|--------|-------|
| `tx_type` | DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT, IB_DEBIT | `transactions_v2.type` |
| `tx_source` | manual_admin, yield_distribution, fee_allocation, ib_allocation, system_bootstrap, correction, withdrawal_processing, withdrawal_reversal | `transactions_v2.source` |
| `visibility_scope` | investor_visible, admin_only | `transactions_v2.visibility_scope` |

### 5.2 Fund Enums

| Enum | Values | Usage |
|------|--------|-------|
| `fund_status` | active, inactive, suspended, deprecated, pending | `funds.status` |
| `aum_purpose` | reporting, transaction | `fund_daily_aum.purpose`, `fund_aum_events.purpose` |

### 5.3 Withdrawal Enums

| Enum | Values | Usage |
|------|--------|-------|
| `withdrawal_status` | pending, approved, processing, completed, rejected, cancelled | `withdrawal_requests.status` |

### 5.4 User Enums

| Enum | Values | Usage |
|------|--------|-------|
| `app_role` | super_admin, admin, moderator, ib, user, investor | `profiles.role` |
| `account_type` | investor, ib, fees_account | `profiles.account_type` |

### 5.5 Asset Enums

| Enum | Values | Usage |
|------|--------|-------|
| `asset_code` | BTC, ETH, SOL, USDT, EURC, xAUT, XRP, ADA | `assets.symbol` |

### 5.6 Other Enums

| Enum | Values | Usage |
|------|--------|-------|
| `document_type` | statement, notice, terms, tax, other | `documents.type` |
| `notification_type` | deposit, statement, performance, system, support, withdrawal, yield | `notifications.type` |
| `notification_priority` | low, medium, high | `notifications.priority` |
| `fee_kind` | mgmt, perf | `fee_allocations.fee_type` |
| `access_event` | login, logout, 2fa_setup, 2fa_verify, session_revoked, password_change | `access_logs.event` |

---

## 6. Database Views

### 6.1 Integrity Views

| View | Purpose | Dependencies |
|------|---------|--------------|
| `aum_position_reconciliation` | Compare AUM to sum of positions | `funds`, `fund_daily_aum`, `investor_positions` |
| `fund_aum_mismatch` | Detect AUM discrepancies | `funds`, `fund_daily_aum`, `investor_positions` |
| `v_ledger_reconciliation` | Compare positions to transaction sum | `investor_positions`, `transactions_v2`, `funds`, `profiles` |
| `yield_distribution_conservation_check` | Verify yield = fees + IB + net | `yield_distributions`, `fee_allocations`, `ib_commission_ledger` |

### 6.2 Portfolio Views

| View | Purpose | Dependencies |
|------|---------|--------------|
| `v_live_investor_balances` | Current investor balances | `investor_positions`, `funds` |
| `v_investor_kpis` | Investor metrics | `investor_positions`, `transactions_v2` |
| `mv_fund_summary` | Fund summary metrics | `funds`, `fund_daily_aum`, `investor_positions` |

### 6.3 Operational Views

| View | Purpose | Dependencies |
|------|---------|--------------|
| `v_orphaned_transactions` | Transactions without positions | `transactions_v2`, `investor_positions` |
| `v_period_orphans` | Period without snapshots | `statement_periods`, `fund_period_snapshot` |
| `v_crystallization_dashboard` | Crystallization status | Multiple tables |

---

## 7. Edge Functions

| Function | Path | Auth | DB Objects |
|----------|------|------|------------|
| `process-withdrawal` | `/functions/v1/process-withdrawal` | JWT | `withdrawal_requests`, `profiles` |
| `generate-report` | `/functions/v1/generate-report` | JWT/Admin | `generated_reports`, storage |
| `generate-monthly-statements` | `/functions/v1/generate-monthly-statements` | Admin | `statements`, `investor_positions` |
| `send-notification-email` | `/functions/v1/send-notification-email` | Service | `notifications` |
| `mfa-totp-generate` | `/functions/v1/mfa-totp-generate` | JWT | `user_totp_settings` |
| `mfa-totp-verify` | `/functions/v1/mfa-totp-verify` | JWT | `user_totp_settings` |
| `mfa-totp-disable` | `/functions/v1/mfa-totp-disable` | JWT | `user_totp_settings` |
| `validate-otp` | `/functions/v1/validate-otp` | JWT | `user_totp_settings` |
| `health-check` | `/functions/v1/health-check` | None | None |

---

## 8. RLS Policies Summary

### 8.1 transactions_v2

| Policy | Command | Condition |
|--------|---------|-----------|
| Admin-only access | ALL | `is_admin()` |
| Users view own investor-visible | SELECT | `investor_id = auth.uid() AND visibility_scope = 'investor_visible'` |

### 8.2 investor_positions

| Policy | Command | Condition |
|--------|---------|-----------|
| Admins can manage | ALL | `is_admin()` |
| Users can view own | SELECT | `investor_id = auth.uid()` |

### 8.3 withdrawal_requests

| Policy | Command | Condition |
|--------|---------|-----------|
| Admin manage | ALL | `is_admin()` |
| Users create own | INSERT | `investor_id = auth.uid()` |
| Users view own | SELECT | `investor_id = auth.uid()` |
| Users cancel own pending | UPDATE | `investor_id = auth.uid() AND status = 'pending'` |

### 8.4 yield_distributions

| Policy | Command | Condition |
|--------|---------|-----------|
| Admin-only access | ALL | `is_admin()` |

---

## 9. Triggers

| Trigger | Table | Timing | Function |
|---------|-------|--------|----------|
| `update_profiles_updated_at` | `profiles` | BEFORE UPDATE | `update_updated_at()` |
| `update_funds_updated_at` | `funds` | BEFORE UPDATE | `update_updated_at()` |
| `audit_transactions_v2` | `transactions_v2` | AFTER INSERT/UPDATE/DELETE | `log_audit_entry()` |
| `audit_investor_positions` | `investor_positions` | AFTER UPDATE | `log_audit_entry()` |
| `notify_withdrawal_status` | `withdrawal_requests` | AFTER UPDATE | `notify_withdrawal_change()` |

---

## 10. Indexes (Critical)

| Table | Index | Columns | Purpose |
|-------|-------|---------|---------|
| `transactions_v2` | `idx_tx_investor_fund` | `investor_id, fund_id` | Position queries |
| `transactions_v2` | `idx_tx_date` | `tx_date` | Date range queries |
| `transactions_v2` | `idx_tx_type` | `type` | Type filtering |
| `fund_daily_aum` | `idx_fda_fund_date` | `fund_id, aum_date` | AUM lookups |
| `investor_positions` | PK | `investor_id, fund_id` | Composite key |
| `withdrawal_requests` | `idx_wr_investor` | `investor_id` | Investor queries |
| `withdrawal_requests` | `idx_wr_status` | `status` | Status filtering |
| `yield_distributions` | `idx_yd_fund_date` | `fund_id, effective_date` | Yield history |
