# Audit Inventory

> Generated: 2025-12-26
> Status: Complete platform audit

## Table 1: Pages and Routes

| Route | Component | Role | Read Sources | Write Sources | Cache Invalidation |
|-------|-----------|------|--------------|---------------|-------------------|
| `/` | Login.tsx | Public | - | auth.signIn | - |
| `/login` | Login.tsx | Public | - | auth.signIn | - |
| `/forgot-password` | ForgotPassword.tsx | Public | - | auth.resetPassword | - |
| `/reset-password` | ResetPassword.tsx | Public | - | auth.updateUser | - |
| `/admin` | AdminDashboard.tsx | Admin | funds, investor_positions, transactions_v2 | - | - |
| `/admin/funds` | FundManagementPage.tsx | Admin | funds, fund_daily_aum | funds (CRUD) | `funds`, `fund-aum` |
| `/admin/investors` | AdminInvestorsPage.tsx | Admin | profiles, investor_positions | profiles (update) | `investors` |
| `/admin/investors/:id` | investors/InvestorDetailPage.tsx | Admin | profiles, investor_positions, transactions_v2 | profiles, transactions_v2 | `investor-detail` |
| `/admin/ib` | ib/IBDashboardPage.tsx | Admin | profiles (ib role), ib_allocations | - | - |
| `/admin/ib/payouts` | ib/IBPayoutsPage.tsx | Admin | ib_allocations | ib_allocations (payout_status) | `ib-allocations` |
| `/admin/withdrawals` | AdminWithdrawalsPage.tsx | Admin | withdrawal_requests, withdrawal_audit_logs | withdrawal_requests (status) | `withdrawals` |
| `/admin/deposits` | AdminDepositsPage.tsx | Admin | deposits, transactions_v2 | transactions_v2 | `deposits`, `transactions` |
| `/admin/yield` | YieldOperationsPage.tsx | Admin | yield_distributions, fund_daily_aum | yield_distributions, transactions_v2, fee_allocations, ib_allocations | `yield`, `positions`, `funds` |
| `/admin/statements` | AdminStatementsPage.tsx | Admin | statement_periods, generated_statements | generated_statements | `statements` |
| `/admin/email-tracking` | AdminEmailTrackingPage.tsx | Admin | statement_email_delivery | statement_email_delivery | `email-delivery` |
| `/admin/integrity` | IntegrityDashboardPage.tsx | Admin | fund_aum_mismatch, investor_position_ledger_mismatch, yield_distribution_conservation_check | - | - |
| `/admin/audit-logs` | AdminAuditLogs.tsx | Admin | audit_log, audit_logs | - | - |
| `/admin/rates` | DailyRatesManagement.tsx | Admin | daily_rates | daily_rates | `rates` |
| `/admin/settings` | AdminSettings.tsx | Super Admin | system_2fa_policy | system_2fa_policy | `settings` |
| `/admin/users` | AdminUserManagement.tsx | Super Admin | profiles, user_roles, admin_invites | user_roles, admin_invites | `admin-users` |
| `/dashboard` | dashboard/Overview.tsx | Investor | profiles, investor_positions, transactions_v2 | - | - |
| `/investor/portfolio` | investor/PortfolioPage.tsx | Investor | investor_positions, funds | - | - |
| `/investor/statements` | investor/StatementsPage.tsx | Investor | generated_statements | - | - |
| `/investor/withdrawals` | withdrawals/WithdrawalRequestPage.tsx | Investor | withdrawal_requests | withdrawal_requests | `withdrawals` |
| `/ib/overview` | ib/IBOverviewPage.tsx | IB | ib_allocations, profiles (referrals) | - | - |
| `/ib/referrals` | ib/IBReferralsPage.tsx | IB | profiles (ib_parent_id = self) | - | - |
| `/settings` | settings/SettingsPage.tsx | Authenticated | profiles, notification_settings, user_totp_settings | profiles, notification_settings | `profile`, `settings` |

---

## Table 2: Backend Objects

### Core Tables

| Object | Type | RLS | Security Notes | Primary Callers |
|--------|------|-----|----------------|-----------------|
| profiles | Table | ✅ Yes | `profiles_select_own`, `profiles_select_admin` | All authenticated users |
| funds | Table | ✅ Yes | Public read, admin write | Fund pages, yield RPCs |
| investor_positions | Table | ✅ Yes | Owner or admin only | Portfolio, yield, deposits |
| transactions_v2 | Table | ✅ Yes | Owner or admin only | All financial operations |
| yield_distributions | Table | ✅ Yes | Admin only | Yield operations |
| fee_allocations | Table | ✅ Yes | Owner + admin select | Yield apply, reports |
| ib_allocations | Table | ✅ Yes | IB + admin access | IB payouts, yield |
| withdrawal_requests | Table | ✅ Yes | Owner or admin | Withdrawal flow |
| withdrawal_audit_logs | Table | ✅ Yes | Admin select only | Audit trail |
| statement_periods | Table | ✅ Yes | Authenticated read | Statements |
| generated_statements | Table | ✅ Yes | Owner or admin | Statement delivery |
| statement_email_delivery | Table | ✅ Yes | Owner or admin | Email tracking |
| fund_daily_aum | Table | ✅ Yes | Purpose-based access | NAV, reporting |
| daily_rates | Table | ✅ Yes | Public read, admin write | Rates page |
| user_roles | Table | ✅ Yes | Self or admin | Role management |
| admin_invites | Table | ✅ Yes | Admin only | User management |

### Integrity Views

| Object | Type | Security | Purpose |
|--------|------|----------|---------|
| fund_aum_mismatch | View | SECURITY INVOKER + is_admin() | Detect AUM vs positions discrepancy |
| investor_position_ledger_mismatch | View | SECURITY INVOKER + is_admin() | Detect position vs ledger discrepancy |
| yield_distribution_conservation_check | View | SECURITY INVOKER + is_admin() | Detect yield conservation violations |
| v_period_orphans | View | SECURITY INVOKER + is_admin() | Detect orphaned periods |
| v_transaction_distribution_orphans | View | SECURITY INVOKER + is_admin() | Detect orphaned transactions |
| v_ib_allocation_orphans | View | SECURITY INVOKER + is_admin() | Detect orphaned IB allocations |

### KPI Views

| Object | Type | Security | Purpose |
|--------|------|----------|---------|
| v_investor_kpis | View | SECURITY INVOKER + inline auth | Investor KPI aggregation |
| v_live_investor_balances | View | SECURITY INVOKER + is_admin() | Live balance calculation |
| v_itd_returns | View | SECURITY INVOKER | ITD return calculations |

### Core RPC Functions

| Function | Security | Admin Required | Purpose |
|----------|----------|----------------|---------|
| apply_daily_yield_to_fund_v2 | SECURITY DEFINER | ✅ Yes (checked) | Apply yield distribution |
| preview_daily_yield_to_fund_v2 | SECURITY DEFINER | ✅ Yes (checked) | Preview yield distribution |
| void_yield_distribution | SECURITY DEFINER | ✅ Yes (checked) | Void yield distribution |
| admin_create_transaction | SECURITY DEFINER | ✅ Yes (checked) | Create deposit/transaction |
| add_fund_to_investor | SECURITY DEFINER | ✅ Yes (checked) | Add investor position |
| update_withdrawal_status | SECURITY DEFINER | ✅ Yes (checked) | Withdrawal state change |
| cancel_withdrawal_by_admin | SECURITY DEFINER | ✅ Yes (checked) | Cancel withdrawal |
| delete_withdrawal | SECURITY DEFINER | ✅ Yes (checked) | Delete withdrawal (soft or hard) |
| is_admin | SECURITY DEFINER | - | Role check utility |
| is_admin_safe | SECURITY DEFINER | - | Safe role check (no recursion) |
| is_admin_for_jwt | SECURITY DEFINER | - | JWT-based role check |
| has_role | SECURITY DEFINER | - | Generic role check |
| check_is_admin | SECURITY DEFINER | - | Admin verification |

### Edge Functions

| Function | Auth | Purpose |
|----------|------|---------|
| send-email | JWT Required | Send transactional emails |
| send-report-mailersend | JWT Required | Send statement emails |
| process-report-delivery-queue | Service Role | Process email queue |
| mailersend-webhook | Webhook Signature | Handle email events |
| excel_import | JWT Required | Import Excel data |
| excel_export | JWT Required | Export Excel data |
| generate-monthly-statements | JWT Required | Generate statements |
| calculate-yield | JWT Required | Calculate yield preview |
| admin-user-management | JWT Required | Admin user CRUD |
| mfa-totp-* | JWT Required | 2FA management |

---

## Table 3: Operations Matrix

| Operation | UI Trigger | RPC/Path | Tables Written | Invariants Checked | Idempotency Key | Status |
|-----------|------------|----------|----------------|-------------------|-----------------|--------|
| **Deposit Create** | Admin Deposits Page | `admin_create_transaction` | transactions_v2, investor_positions, fund_daily_aum | Position = Ledger | reference_id | ✅ PASS |
| **Deposit Approve** | Admin action | Status update | deposits (status) | - | deposit.id | ✅ PASS |
| **Withdrawal Create** | Investor/Admin | Direct insert | withdrawal_requests | Balance >= Amount | request.id | ✅ PASS |
| **Withdrawal Approve** | Admin action | `update_withdrawal_status` | withdrawal_requests, withdrawal_audit_logs | Valid state transition | request.id | ✅ PASS |
| **Withdrawal Reject** | Admin action | `update_withdrawal_status` | withdrawal_requests, withdrawal_audit_logs | Valid state transition | request.id | ✅ PASS |
| **Withdrawal Process** | Admin action | `update_withdrawal_status` | withdrawal_requests, withdrawal_audit_logs | Valid state transition | request.id | ✅ PASS |
| **Withdrawal Complete** | Admin action | `update_withdrawal_status` | withdrawal_requests, transactions_v2, investor_positions | Position = Ledger | request.id | ✅ PASS |
| **Withdrawal Cancel** | Admin action | `cancel_withdrawal_by_admin` | withdrawal_requests, withdrawal_audit_logs | Valid state transition | request.id | ✅ PASS |
| **Withdrawal Delete** | Admin action | `delete_withdrawal` | withdrawal_requests, withdrawal_audit_logs (cascade) | - | request.id | ✅ PASS |
| **Yield Preview** | Yield page | `preview_daily_yield_to_fund_v2` | None (read-only) | - | - | ✅ PASS |
| **Yield Apply** | Yield page | `apply_daily_yield_to_fund_v2` | yield_distributions, transactions_v2, fee_allocations, ib_allocations, investor_positions | Conservation, Position = Ledger | distribution.id + reference_id | ✅ PASS |
| **Yield Void** | Yield page | `void_yield_distribution` | All distribution tables (voided) | - | distribution.id | ✅ PASS |
| **IB Assign** | Investor detail | Profile update | profiles (ib_parent_id) | - | investor.id | ✅ PASS |
| **IB Reassign** | Investor detail | Profile update | profiles (ib_parent_id) | - | investor.id | ✅ PASS |
| **IB Payout Mark Paid** | IB Payouts | Update | ib_allocations (payout_status) | - | allocation.id | ✅ PASS |
| **Statement Generate** | Statements page | Insert | generated_statements | Period closed | investor_id + period_id | ✅ PASS |
| **Statement Deliver** | Statements page | Edge function + insert | statement_email_delivery | Statement exists | delivery.id | ✅ PASS |
| **Admin Role Assign** | User management | Insert | user_roles | - | user_id + role | ✅ PASS |
| **Admin Invite** | User management | Insert | admin_invites | - | invite_code | ✅ PASS |
| **Fund Create** | Funds page | Insert | funds | - | fund.id | ✅ PASS |
| **Fund Update** | Funds page | Update | funds | - | fund.id | ✅ PASS |
| **Fund Deactivate** | Funds page | Update | funds (status) | No active positions | fund.id | ✅ PASS |

---

## Summary

- **Total Pages Audited**: 25+
- **Total Tables with RLS**: 40+
- **Total RPC Functions**: 30+
- **Total Edge Functions**: 20+
- **Operations Verified**: 20+
- **All Operations**: ✅ PASS

### Key Findings

1. **All core tables have RLS enabled** with appropriate policies
2. **All SECURITY DEFINER functions include explicit admin checks**
3. **All views converted to SECURITY INVOKER** with inline auth
4. **Idempotency enforced** via unique constraints on reference_id
5. **Integrity views exist** for all core invariants
6. **Withdrawal audit logs use canonical plural name** with compatibility view
