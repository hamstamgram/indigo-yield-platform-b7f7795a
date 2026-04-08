# Indigo Yield Platform — Comprehensive Audit Roadmap

> **Audit Date:** April 8, 2026
> **Auditor:** Senior Engineering Team
> **Build Status:** ✅ 0 TypeScript errors · 0 Linter warnings · 0 Console errors

---

## Table of Contents

1. [Executive Summary](#1-executive-summary)
2. [Platform Inventory](#2-platform-inventory)
3. [Completed Fixes](#3-completed-fixes)
4. [Open Issues (Pending)](#4-open-issues-pending)
5. [Verification Checklist](#5-verification-checklist)
6. [Frontend Route Map](#6-frontend-route-map)
7. [Edge Function Inventory](#7-edge-function-inventory)
8. [Database Table Inventory](#8-database-table-inventory)
9. [Database Function Inventory](#9-database-function-inventory)
10. [Trigger Inventory](#10-trigger-inventory)
11. [Financial Integrity Report](#11-financial-integrity-report)

---

## 1. Executive Summary

The Indigo Yield Platform underwent a full-stack security and integrity audit covering:

- **Frontend:** 22 live routes across 3 portals (Public, Investor, Admin)
- **Backend:** 18 edge functions, 40 database tables, 200+ database functions, 68 triggers
- **Security:** RLS policies, RBAC enforcement, storage access, privilege escalation vectors
- **Financial Integrity:** Ledger-to-position reconciliation, yield conservation, orphan detection

### Key Metrics

| Metric | Value |
|--------|-------|
| TypeScript Build | **0 errors** |
| ESLint / Linter | **0 warnings** |
| Console Errors | **None** (React Router v7 future flag warnings only) |
| Active Positions | 25 |
| Active Transactions | 282 |
| Active Yield Distributions | 36 |
| Active Funds | 5 |
| Ledger-Position Drift | **Zero across all 25 positions** |
| Database Triggers | **68 enabled** |
| Audit Table Size (post-cleanup) | ~32 MB (down from 1.2 GB) |

### Severity Summary

| Severity | Found | Fixed | Remaining |
|----------|-------|-------|-----------|
| **CRITICAL (P0)** | 4 | 2 | 2 |
| **HIGH (P1)** | 2 | 1 | 1 |
| **MEDIUM (P2)** | 2 | 1 | 1 |
| **LOW (P3–P4)** | 2 | 0 | 2 |

---

## 2. Platform Inventory

### Architecture Overview

```
┌─────────────────────────────────────────────────────┐
│                   Frontend (React 18 + Vite 5)      │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ Public   │  │ Investor     │  │ Admin Portal  │  │
│  │ 6 pages  │  │ 11 pages     │  │ 10 pages      │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
├─────────────────────────────────────────────────────┤
│              Supabase (PostgreSQL + Auth + Storage)  │
│  ┌──────────┐  ┌──────────────┐  ┌───────────────┐  │
│  │ 40 tables│  │ 200+ funcs   │  │ 68 triggers   │  │
│  └──────────┘  └──────────────┘  └───────────────┘  │
│  ┌──────────────────────────────────────────────┐   │
│  │ 18 Edge Functions (Deno)                     │   │
│  └──────────────────────────────────────────────┘   │
│  ┌──────────────────────────────────────────────┐   │
│  │ Storage: documents, statements (path-based)  │   │
│  └──────────────────────────────────────────────┘   │
└─────────────────────────────────────────────────────┘
```

---

## 3. Completed Fixes

### ✅ P0-A: `user_roles` Privilege Escalation — FIXED

**Problem:** `Allow role insert during signup` RLS policy let any authenticated user self-assign `admin` role.

**Fix Applied:**
- Dropped insecure INSERT policy on `user_roles`
- Created `assign_default_user_role()` SECURITY DEFINER function (hardcoded `'user'` role)
- Attached trigger `trg_assign_default_role` on `profiles` AFTER INSERT

### ✅ P0-B: Storage Bucket Cross-User Access — FIXED

**Problem:** `documents_bucket_authenticated_select` and `statements_bucket_authenticated_select` allowed any user to read all files.

**Fix Applied:**
- Dropped both broad `*_authenticated_select` policies
- Added `documents_select_own_or_admin` path-based ownership policy
- Existing `statements_select_own` + `statements_select_admin` policies already correct

### ✅ P1: 20 Functions Missing `search_path` — FIXED

**Problem:** 20 PL/pgSQL functions lacked `SET search_path = public`, creating search-path injection risk.

**Fix Applied:** `ALTER FUNCTION ... SET search_path = public` on all 20:

| Function | Fixed |
|----------|-------|
| `acquire_position_lock` | ✅ |
| `enforce_canonical_position_mutation` | ✅ |
| `cascade_void_to_allocations` | ✅ |
| `enforce_canonical_transaction_mutation` | ✅ |
| `enforce_transaction_via_rpc` | ✅ |
| `get_fees_account_for_fund` | ✅ |
| `get_position_at_date` | ✅ |
| `log_aum_position_mismatch` | ✅ |
| `nightly_aum_reconciliation` | ✅ |
| `preview_segmented_yield_distribution` | ✅ |
| `set_position_is_active` | ✅ |
| `sync_profile_role_from_profiles` | ✅ |
| `sync_profile_role_from_roles` | ✅ |
| `touch_updated_at` | ✅ |
| `validate_ib_parent_has_role` | ✅ |
| `validate_withdrawal_request` | ✅ |
| `run_v6_e2e_simulation` | ✅ |
| `run_v6_user_simulation` | ✅ |
| `run_v6_user_simulation_isolated` | ✅ |
| `run_v6_void_simulation` | ✅ |

### ✅ P2: Redundant RLS Policies — FIXED

**Problem:** Overlapping admin SELECT policies on `ib_commission_ledger` and `platform_fee_ledger`.

**Fix Applied:**
- Dropped `ib_commission_ledger_select`
- Dropped `platform_fee_ledger_select`

### ✅ Infrastructure: Audit Log Cleanup

- Purged stale audit data: **1.2 GB → ~32 MB**
- Added FK constraints on `transactions_v2`, `investor_positions`, `fee_allocations`
- Added unique indexes on `fund_daily_aum`, `platform_fee_ledger`, `ib_commission_ledger`, `investor_positions`
- Standardized all RLS admin checks to `is_admin()` function

---

## 4. Resolved Issues (Formerly Open)

> All 5 open issues from the initial audit have been resolved as of April 8, 2026.

### ✅ P0: `profiles.is_admin` Column Self-Escalation — FIXED

**Migration:** `P0 Security Fix` (April 8, 2026)

**Changes applied:**
1. **Dropped** `profiles_update_own_or_admin` RLS policy
2. **Created** `profiles_update_own_restricted` policy + `protect_profile_sensitive_fields` trigger blocking non-admin changes to: `is_admin`, `role`, `account_type`, `is_system_account`, `include_in_reporting`, `kyc_status`, `email`, `status`, `ib_parent_id`, `ib_commission_source`, `onboarding_date`
3. **Rewrote 11 database functions** to remove `profiles.is_admin` reads:
   - `can_insert_notification`, `ensure_admin`, `get_all_investors_summary`, `get_paged_investor_summaries`, `get_platform_stats`, `void_and_reissue_full_exit`, `get_investor_reports_v2`, `finalize_statement_period`, `unvoid_transaction`, `run_invariant_checks`, `rebuild_position_from_ledger`, `update_user_profile_secure`
4. **Updated 4 edge functions** to use `checkAdminAccess()` from `_shared/admin-check.ts`:
   - `set-user-password`, `send-email`, `excel_import`, `send-investor-report`

### ✅ P1: Asymmetric Void — Distribution `63b032b8` — FIXED

**Migration:** `Void Orphaned Distribution` (April 8, 2026)

**Result:** `void_yield_distribution` cascade-voided 5 linked transactions, restoring conservation integrity for fund `2c123c4f`.

### ✅ P2: `system_config` Exposed to All Users — FIXED

**Migration:** `Config & Policy Cleanup` (April 8, 2026)

**Change:** Dropped `system_config_read` policy. Only `system_config_admin_all` remains.

### ✅ P3: `investor_position_snapshots` Missing Investor SELECT — FIXED

**Migration:** `Config & Policy Cleanup` (April 8, 2026)

**Change:** Added `investor_position_snapshots_select_own` policy with `USING (investor_id = auth.uid())`.

### ✅ P4: Redundant `system_config_write` Policy — FIXED

**Migration:** `Config & Policy Cleanup` (April 8, 2026)

**Change:** Dropped `system_config_write`. Only `system_config_admin_all` remains.

---

## 5. Verification Checklist

| # | Check | Status | Details |
|---|-------|--------|---------|
| 1 | TypeScript build compiles | ✅ PASS | 0 errors |
| 2 | ESLint/linter clean | ✅ PASS | 0 warnings |
| 3 | Dev server starts | ✅ PASS | No errors in console |
| 4 | All SECURITY DEFINER functions have `search_path` | ✅ PASS | All patched |
| 5 | `user_roles` INSERT policy removed | ✅ PASS | Trigger-based assignment |
| 6 | Storage broad-access policies removed | ✅ PASS | Path-based ownership |
| 7 | Position-to-ledger drift = 0 | ✅ PASS | All 25 positions reconciled |
| 8 | Negative cost basis = 0 | ✅ PASS | None found |
| 9 | Orphaned positions (no profile) = 0 | ✅ PASS | None found |
| 10 | Orphaned transactions (no profile) = 0 | ✅ PASS | None found |
| 11 | FK constraints on financial tables | ✅ PASS | Active |
| 12 | Unique indexes on financial tables | ✅ PASS | Active |
| 13 | All 68 triggers enabled | ✅ PASS | All operational |
| 14 | Audit tables healthy | ✅ PASS | ~32 MB total |
| 15 | Admin check standardized to `is_admin()` | ✅ PASS | RLS policies |
| 16 | `profiles.is_admin` column restricted | ✅ FIXED | P0 — trigger blocks non-admin changes |
| 17 | 11 functions using `profiles.is_admin` patched | ✅ FIXED | P0 — all use `user_roles` now |
| 18 | 4 edge functions patched | ✅ FIXED | P0 — use `checkAdminAccess()` |
| 19 | Asymmetric void resolved | ✅ FIXED | P1 — distribution `63b032b8` voided |
| 20 | `system_config` restricted to admin | ✅ FIXED | P2 — `system_config_read` dropped |
| 21 | `investor_position_snapshots` investor access | ✅ FIXED | P3 — SELECT policy added |
| 22 | Redundant `system_config_write` dropped | ✅ FIXED | P4 |

---

## 6. Frontend Route Map

### Public Routes (No Auth Required)

| # | Route | Component | Lazy | Status |
|---|-------|-----------|------|--------|
| 1 | `/` | `Login` | No | ✅ Active |
| 2 | `/login` | `Login` | No | ✅ Active |
| 3 | `/forgot-password` | `ForgotPassword` | Yes | ✅ Active |
| 4 | `/reset-password` | `ResetPassword` | Yes | ✅ Active |
| 5 | `/admin-invite` | `AdminInvite` | Yes | ✅ Active |
| 6 | `/admin-invite-callback` | `AdminInviteCallback` | Yes | ✅ Active |
| 7 | `/investor-invite` | `InvestorInvite` | Yes | ✅ Active |
| 8 | `/health` | `Health` | Yes | ✅ Active |
| 9 | `/status` | `Status` | Yes | ✅ Active |
| 10 | `/terms` | `Terms` | Yes | ✅ Active |
| 11 | `/privacy` | `Privacy` | Yes | ✅ Active |
| 12 | `*` | `NotFound` | No | ✅ Active |

### Investor Routes (Protected — `ProtectedRoute`)

| # | Route | Component | Status |
|---|-------|-----------|--------|
| 1 | `/investor` | Overview Dashboard | ✅ Active |
| 2 | `/investor/portfolio` | Portfolio | ✅ Active |
| 3 | `/investor/transactions` | Transaction History | ✅ Active |
| 4 | `/investor/statements` | Statements | ✅ Active |
| 5 | `/investor/settings` | Settings (profile, password, 2FA) | ✅ Active |
| 6 | `/investor/yield-history` | Yield History | ✅ Active |
| 7 | `/investor/withdrawals` | Withdrawal History | ✅ Active |
| 8 | `/investor/withdrawals/new` | New Withdrawal | ✅ Active |
| 9 | `/transactions/:id` | Transaction Detail | ✅ Active |
| 10 | `/funds/:assetId` | Fund Detail | ✅ Active |
| 11 | `/portfolio/analytics` | Portfolio Analytics | ✅ Active |

### Admin Routes (Protected — `AdminRoute`)

| # | Route | Component | Status |
|---|-------|-----------|--------|
| 1 | `/admin` | Command Center Dashboard | ✅ Active |
| 2 | `/admin/investors` | Unified Investor List | ✅ Active |
| 3 | `/admin/investors/:id` | Investor Management Detail | ✅ Active |
| 4 | `/admin/ledger` | Transactions + Withdrawals | ✅ Active |
| 5 | `/admin/yield-history` | Yield Distribution History | ✅ Active |
| 6 | `/admin/reports` | Consolidated Reports | ✅ Active |
| 7 | `/admin/revenue` | Fees + IB Management | ✅ Active |
| 8 | `/admin/operations` | Health + Integrity + Audit | ✅ Active |
| 9 | `/admin/settings` | Platform Config + Admin List | ✅ Active |
| 10 | `/admin/transactions/new` | Manual Transaction Entry | ✅ Active |

---

## 7. Edge Function Inventory

| # | Function | Purpose | Auth | Status |
|---|----------|---------|------|--------|
| 1 | `admin-user-management` | User CRUD, role assignment | Admin | ✅ Deployed |
| 2 | `audit-leakage` | Run leakage audit report | Admin | ✅ Deployed |
| 3 | `ef_send_notification` | Push notification delivery | System | ✅ Deployed |
| 4 | `excel_import` | Bulk data import from Excel | Admin | ✅ Deployed |
| 5 | `generate-fund-performance` | Compute fund performance metrics | Admin | ✅ Deployed |
| 6 | `integrity-monitor` | Nightly health checks (13 checks) | Cron | ✅ Deployed |
| 7 | `monthly-report-scheduler` | Schedule monthly statement generation | Cron | ✅ Deployed |
| 8 | `notify-yield-applied` | Notify investors of yield application | System | ✅ Deployed |
| 9 | `process-report-delivery-queue` | Process statement email queue | Cron | ✅ Deployed |
| 10 | `process-withdrawal` | Withdrawal state machine processing | Admin | ✅ Deployed |
| 11 | `refresh-delivery-status` | Update email delivery status | Cron | ✅ Deployed |
| 12 | `send-admin-invite` | Send admin invitation emails | Admin | ✅ Deployed |
| 13 | `send-email` | Generic email sender | System | ✅ Deployed |
| 14 | `send-investor-report` | Send investor statement reports | Admin | ✅ Deployed |
| 15 | `send-notification-email` | Email notification delivery | System | ✅ Deployed |
| 16 | `send-report-email` | Report email delivery | System | ✅ Deployed |
| 17 | `set-user-password` | Admin password reset for users | Admin | ✅ Deployed |
| 18 | `_shared/` | Shared utilities (admin-check, CORS) | — | ✅ Active |

---

## 8. Database Table Inventory

### 40 Tables

| # | Table | Domain | RLS | Status |
|---|-------|--------|-----|--------|
| 1 | `admin_alerts` | Operations | ✅ | Active |
| 2 | `admin_integrity_runs` | Operations | ✅ | Active |
| 3 | `assets` | Reference | ✅ | Active |
| 4 | `audit_log` | Audit | ✅ Immutable | Active |
| 5 | `data_edit_audit` | Audit | ✅ | Active |
| 6 | `documents` | Documents | ✅ | Active |
| 7 | `error_code_metadata` | Reference | ✅ | Active |
| 8 | `fee_allocations` | Financial | ✅ + FK + Unique | Active |
| 9 | `fund_daily_aum` | Financial | ✅ + Unique | Active |
| 10 | `funds` | Core | ✅ | Active |
| 11 | `generated_statements` | Reporting | ✅ | Active |
| 12 | `global_fee_settings` | Config | ✅ Admin-only | Active |
| 13 | `ib_allocations` | Financial | ✅ | Active |
| 14 | `ib_commission_ledger` | Financial | ✅ + Unique | Active |
| 15 | `ib_commission_schedule` | Config | ✅ | Active |
| 16 | `investor_device_tokens` | Mobile | ✅ | Active |
| 17 | `investor_emails` | Identity | ✅ | Active |
| 18 | `investor_fee_schedule` | Config | ✅ | Active |
| 19 | `investor_fund_performance` | Reporting | ✅ | Active |
| 20 | `investor_position_snapshots` | Financial | ✅ Admin-only | Active |
| 21 | `investor_positions` | Financial | ✅ + FK + Unique | Active |
| 22 | `notifications` | Comms | ✅ | Active |
| 23 | `platform_fee_ledger` | Financial | ✅ + Unique | Active |
| 24 | `platform_invites` | Identity | ✅ | Active |
| 25 | `profiles` | Identity | ✅ ⚠️ P0 | Active |
| 26 | `rate_limit_config` | Config | ✅ | Active |
| 27 | `report_schedules` | Reporting | ✅ | Active |
| 28 | `risk_alerts` | Operations | ✅ | Active |
| 29 | `statement_email_delivery` | Reporting | ✅ | Active |
| 30 | `statement_periods` | Reporting | ✅ | Active |
| 31 | `statements` | Reporting | ✅ | Active |
| 32 | `support_tickets` | Support | ✅ | Active |
| 33 | `system_config` | Config | ✅ ⚠️ P2 | Active |
| 34 | `transactions_v2` | Financial | ✅ + FK | Active |
| 35 | `user_roles` | RBAC | ✅ | Active |
| 36 | `user_sessions` | Auth | ✅ | Active |
| 37 | `withdrawal_requests` | Financial | ✅ | Active |
| 38 | `yield_allocations` | Financial | ✅ | Active |
| 39 | `yield_distributions` | Financial | ✅ | Active |
| 40 | `yield_rate_sanity_config` | Config | ✅ | Active |

---

## 9. Database Function Inventory

### 200+ Functions by Domain

#### Core RBAC & Auth (16 functions)
| Function | Type | Sec Definer |
|----------|------|-------------|
| `assign_default_user_role` | Trigger | ✅ |
| `audit_user_role_changes` | Trigger | No |
| `can_access_investor` | RLS Helper | No |
| `can_access_notification` | RLS Helper | No |
| `can_insert_notification` | RLS Helper | ⚠️ Uses `profiles.is_admin` |
| `check_is_admin` (via `is_admin`) | RLS | ✅ |
| `compute_profile_role` | Helper | No |
| `create_profile_on_signup` | Trigger | ✅ |
| `current_user_is_admin_or_owner` | RLS Helper | No |
| `ensure_admin` | Guard | No |
| `get_user_admin_status` | Query | No |
| `has_role` | RLS Helper | ✅ |
| `has_super_admin_role` | RLS Helper | No |
| `is_admin` | RLS | ✅ |
| `is_super_admin` | RLS | ✅ |
| `require_admin` / `require_super_admin` | Guard | No |

#### Transaction & Position Management (30+ functions)
| Function | Purpose |
|----------|---------|
| `enforce_canonical_transaction_mutation` | Gate direct writes |
| `enforce_transaction_via_rpc` | Require RPC path |
| `enforce_transaction_asset_match` | Validate asset code |
| `enforce_economic_date` | Validate effective dates |
| `enforce_internal_tx_visibility` | Hide internal txns |
| `enforce_transactions_v2_immutability` | Block field mutation |
| `enforce_yield_distribution_guard` | Validate yield txns |
| `validate_transaction_amount` | Amount > 0 |
| `validate_transaction_fund_status` | Fund must be active |
| `validate_transaction_type` | Valid type enum |
| `protect_transaction_immutable_fields` | Field-level lock |
| `fn_ledger_drives_position` | Ledger → position sync |
| `cascade_void_from_transaction` | Cascade void logic |
| `recompute_on_void` | Recompute on void |
| `sync_position_last_tx_date` | Sync timestamp |
| `update_transaction` | Update RPC |
| `compute_position_from_ledger` | Ledger recomputation |
| `enforce_canonical_position_mutation` | Gate position writes |
| `enforce_canonical_position_write` | Gate position INSERT |
| `validate_position_fund_status` | Fund active check |
| `set_position_is_active` | Auto-set is_active |
| `maintain_high_water_mark` | HWM enforcement |
| `check_concentration_risk` | Risk alert trigger |
| `acquire_position_lock` | Advisory locking |
| `get_position_at_date` | Historical lookup |
| `rebuild_position_from_ledger` | Full rebuild RPC |
| `reconcile_investor_position_internal` | Internal reconcile |
| `batch_reconcile_all_positions` | Batch reconcile |
| `reconcile_all_positions` | Reconcile all |
| `repair_all_positions` | Repair all |
| `reset_all_investor_positions` | Reset (test) |

#### Yield Distribution (20+ functions)
| Function | Purpose |
|----------|---------|
| `apply_segmented_yield_distribution` | Main yield RPC |
| `apply_segmented_yield_distribution_v5` | V5 yield RPC |
| `apply_backfill_yield` | Historical backfill |
| `calculate_yield_allocations` | Allocation math |
| `crystallize_yield_before_flow` | Pre-flow crystallization |
| `enforce_canonical_yield_mutation` | Gate yield writes |
| `enforce_yield_event_date` | Date validation |
| `preview_segmented_yield_distribution` | Dry-run preview |
| `preview_segmented_yield_distribution_v5` | V5 dry-run |
| `validate_yield_distribution_prerequisites` | Pre-checks |
| `validate_yield_parameters` | Param validation |
| `validate_yield_rate_sanity` | Rate bounds check |
| `validate_dust_tolerance` | Dust threshold |
| `verify_yield_distribution_balance` | Conservation check |
| `alert_on_yield_conservation_violation` | Alert trigger |
| `cascade_void_to_allocations` | Void cascade |
| `sync_yield_date` | Date sync trigger |
| `finalize_month_yield` | Period finalization |
| `fix_yield_distribution_investor_count` | Count fix |
| `unvoid_yield_distribution` | Unvoid RPC |
| `void_and_reissue_full_exit` | Full exit void+reissue |
| `void_and_reissue_transaction` | Single void+reissue |

#### Withdrawal Management (12 functions)
| Function | Purpose |
|----------|---------|
| `create_withdrawal_request` | Submit withdrawal |
| `approve_withdrawal` | Admin approve |
| `reject_withdrawal` | Admin reject |
| `cancel_withdrawal_by_admin` | Admin cancel |
| `cancel_withdrawal_by_investor` | Investor cancel |
| `complete_withdrawal` | Mark complete |
| `delete_withdrawal` | Delete request |
| `start_processing_withdrawal` | Begin processing |
| `restore_withdrawal` | Restore deleted |
| `update_withdrawal` | Update fields |
| `validate_withdrawal_request` | Validation trigger |
| `guard_withdrawal_state_transitions` | State machine |
| `can_withdraw` | Balance check |
| `get_available_balance` | Available balance |
| `route_withdrawal_to_fees` | Route to fees account |

#### Fee & IB Management (15+ functions)
| Function | Purpose |
|----------|---------|
| `_resolve_investor_fee_pct` | Internal fee resolution |
| `_resolve_investor_ib_pct` | Internal IB resolution |
| `get_investor_fee_pct` | Fee % lookup |
| `get_investor_ib_pct` | IB % lookup |
| `get_fees_account_for_fund` | Fees account lookup |
| `auto_close_previous_fee_schedule` | Schedule auto-close |
| `auto_close_previous_ib_schedule` | IB schedule auto-close |
| `audit_fee_schedule_changes` | Audit trigger |
| `audit_ib_allocation_payout` | IB payout audit |
| `internal_route_to_fees` | Internal fee routing |
| `protect_allocation_immutable_fields` | Immutability guard |
| `sync_fee_allocations_voided_by_profile` | Profile sync |
| `sync_ib_allocations_voided_by_profile` | IB profile sync |
| `sync_ib_allocations_from_commission_ledger` | Ledger → IB sync |

#### AUM & Reporting (20+ functions)
| Function | Purpose |
|----------|---------|
| `get_active_funds_summary` | Fund overview |
| `get_admin_stats` | Admin dashboard stats |
| `get_all_investors_summary` | Investor list |
| `get_paged_investor_summaries` | Paginated investors |
| `get_aum_position_reconciliation` | AUM vs positions |
| `get_fund_aum_as_of` | Historical AUM |
| `get_fund_composition` | Fund breakdown |
| `get_fund_net_flows` | Net flow metrics |
| `get_fund_positions_sum` | Position totals |
| `get_fund_summary` | Fund detail |
| `get_funds_aum_snapshot` | AUM snapshot |
| `get_funds_daily_flows` | Daily flows |
| `get_funds_with_aum` | Funds + AUM |
| `get_investor_cumulative_yield` | Yield totals |
| `get_investor_yield_summary` | Yield summary |
| `get_monthly_platform_aum` | Monthly AUM |
| `get_platform_flow_metrics` | Platform flows |
| `get_platform_stats` | Dashboard stats |
| `get_position_reconciliation` | Position recon |
| `get_reporting_eligible_investors` | Eligible investors |
| `populate_investor_fund_performance` | Performance calc |
| `update_investor_aum_percentages` | AUM % update |
| `create_daily_position_snapshot` | Daily snapshot |
| `calc_avg_daily_balance` | Average balance |

#### Integrity & Health (20+ functions)
| Function | Purpose |
|----------|---------|
| `run_invariant_checks` | Core invariant suite |
| `run_integrity_check` | Full integrity |
| `run_integrity_pack` | Integrity package |
| `run_comprehensive_health_check` | Comprehensive health |
| `run_daily_health_check` | Daily health |
| `system_health_check` | System health |
| `check_all_funds_transaction_aum` | AUM vs txns |
| `check_aum_position_health` | AUM health |
| `check_aum_reconciliation` | AUM recon |
| `check_platform_data_integrity` | Data integrity |
| `check_transaction_sources` | Source validation |
| `check_duplicate_ib_allocations` | IB dedup |
| `check_duplicate_transaction_refs` | Ref dedup |
| `validate_aum_against_positions` | AUM validation |
| `validate_aum_matches_positions` | Strict validation |
| `validate_pre_yield_aum` | Pre-yield check |
| `audit_leakage_report` | Leakage detection |
| `assert_integrity_or_raise` | Raise on failure |
| `create_integrity_alert` | Alert creation |
| `alert_on_ledger_position_drift` | Drift alert |
| `log_aum_position_mismatch` | Mismatch logging |
| `log_ledger_mismatches` | Ledger logging |
| `get_health_trend` | Health history |
| `get_latest_health_status` | Current health |
| `nightly_aum_reconciliation` | Nightly recon |

#### Audit & Logging (15+ functions)
| Function | Purpose |
|----------|---------|
| `audit_delta_trigger` | JSONB diff trigger |
| `fn_trg_log_audit_event` | Audit event logger |
| `fn_audit_profiles_changes` | Profile change audit |
| `log_audit_event` | Manual audit entry |
| `log_data_edit` | Data edit logger |
| `log_financial_operation` | Financial op logger |
| `log_security_event` | Security event logger |
| `log_withdrawal_action` | Withdrawal action log |
| `log_delivery_status_change` | Delivery status log |
| `compute_jsonb_delta` | JSONB diff utility |
| `get_paged_audit_logs` | Paginated audit logs |
| `purge_old_audit_logs` | Cleanup old logs |
| `protect_audit_log_immutable_fields` | Immutability guard |
| `protect_audit_immutable_fields` | Yield audit guard |

#### Statement & Delivery (15+ functions)
| Function | Purpose |
|----------|---------|
| `finalize_statement_period` | Close period |
| `get_statement_period_summary` | Period summary |
| `get_statement_signed_url` | Signed URL |
| `generate_document_path` | Document path |
| `generate_statement_path` | Statement path |
| `is_period_locked` | Lock check |
| `is_yield_period_closed` | Period close check |
| `reopen_yield_period` | Reopen period |
| `queue_statement_deliveries` | Queue deliveries |
| `dispatch_report_delivery_run` | Dispatch run |
| `acquire_delivery_batch` | Batch acquisition |
| `mark_delivery_result` | Mark result |
| `mark_sent_manually` | Manual send mark |
| `cancel_delivery` | Cancel delivery |
| `retry_delivery` | Retry delivery |
| `requeue_stale_sending` | Requeue stale |
| `get_delivery_stats` | Delivery stats |
| `get_period_delivery_stats` | Period stats |
| `update_delivery_updated_at` | Timestamp update |

#### Profile & Identity (10+ functions)
| Function | Purpose |
|----------|---------|
| `update_user_profile_secure` | Secure profile update |
| `update_admin_role` | Admin role update |
| `merge_duplicate_profiles` | Profile merge |
| `preview_merge_duplicate_profiles` | Merge preview |
| `check_duplicate_profile` | Duplicate check |
| `check_email_uniqueness` | Email unique check |
| `block_test_profiles` | Block test data |
| `preserve_created_at` | Immutable created_at |
| `sync_profile_is_admin` | Sync admin flag |
| `sync_profile_role_from_profiles` | Role sync (profile→role) |
| `sync_profile_role_from_roles` | Role sync (role→profile) |
| `sync_profile_last_activity` | Activity timestamp |
| `export_investor_data` | Data export |

#### Utility & Infrastructure (15+ functions)
| Function | Purpose |
|----------|---------|
| `build_error_response` | Error JSON builder |
| `build_success_response` | Success JSON builder |
| `parse_platform_error` | Error parser |
| `raise_platform_error` | Error raiser |
| `is_canonical_rpc` | RPC guard check |
| `is_import_enabled` | Import feature flag |
| `is_within_edit_window` | Edit window check |
| `get_system_mode` | System mode query |
| `get_schema_dump` | Schema export |
| `get_admin_name` | Admin name lookup |
| `get_all_dust_tolerances` | Dust config |
| `get_dust_tolerance_for_fund` | Per-fund dust |
| `update_dust_tolerance` | Update dust config |
| `get_fund_base_asset` | Asset lookup |
| `check_fund_is_active` | Active check trigger |
| `check_historical_lock` | Historical lock |
| `increment_version` | Version increment |
| `touch_updated_at` / `set_updated_at` / `update_updated_at` / `update_updated_at_column` | Timestamp triggers |
| `refresh_materialized_view_concurrently` | View refresh |
| `refresh_yield_materialized_views` | Yield view refresh |

#### Testing & Simulation (6 functions)
| Function | Purpose |
|----------|---------|
| `run_v6_e2e_simulation` | E2E test suite |
| `run_v6_user_simulation` | User simulation |
| `run_v6_user_simulation_isolated` | Isolated user sim |
| `run_v6_void_simulation` | Void simulation |
| `purge_fund_data_for_testing` | Test data cleanup |
| `purge_fund_hard` | Hard fund purge |
| `reset_fund_test_data` | Fund reset |
| `reset_platform_data` | Platform reset |

#### IB Referral Queries (5 functions)
| Function | Purpose |
|----------|---------|
| `get_ib_parent_candidates` | Parent candidate list |
| `get_ib_referral_count` | Referral count |
| `get_ib_referral_detail` | Referral detail |
| `get_ib_referrals` | Referral list |
| `validate_ib_parent_has_role` | IB role validation |

---

## 10. Trigger Inventory

### 68 Triggers by Table

#### `audit_log` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `protect_audit_log_immutable` | BEFORE | UPDATE | `protect_audit_log_immutable_fields` |

#### `documents` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `trg_documents_sync_profile_ids` | BEFORE | INSERT | `sync_documents_profile_ids` |

#### `fee_allocations` (2 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `protect_fee_allocations_immutable` | BEFORE | UPDATE | `protect_allocation_immutable_fields` |
| `trg_fee_allocations_sync_voided_by` | BEFORE | INSERT | `sync_fee_allocations_voided_by_profile` |

#### `funds` (2 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `audit_funds_changes` | AFTER | INSERT | `log_data_edit` |
| `update_funds_updated_at` | BEFORE | UPDATE | `update_updated_at` |

#### `generated_statements` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `trg_update_last_activity_on_statement` | AFTER | INSERT | `update_last_activity_on_statement` |

#### `ib_allocations` (3 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `ib_allocation_payout_audit` | AFTER | UPDATE | `audit_ib_allocation_payout` |
| `protect_ib_allocations_immutable` | BEFORE | UPDATE | `protect_allocation_immutable_fields` |
| `trg_ib_allocations_sync_voided_by` | BEFORE | INSERT | `sync_ib_allocations_voided_by_profile` |

#### `ib_commission_ledger` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `trg_ib_commission_ledger_sync_allocations` | AFTER | INSERT | `sync_ib_allocations_from_commission_ledger` |

#### `ib_commission_schedule` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `trg_auto_close_previous_ib_schedule` | BEFORE | INSERT | `auto_close_previous_ib_schedule` |

#### `investor_device_tokens` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `investor_device_tokens_updated_at` | BEFORE | UPDATE | `touch_updated_at` |

#### `investor_fee_schedule` (2 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `audit_investor_fee_schedule_trigger` | AFTER | INSERT | `audit_fee_schedule_changes` |
| `trg_auto_close_previous_fee_schedule` | AFTER | INSERT | `auto_close_previous_fee_schedule` |

#### `investor_fund_performance` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `audit_investor_fund_performance_trigger` | AFTER | INSERT | `audit_investor_fund_performance_changes` |

#### `investor_positions` (9 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `delta_audit_investor_positions` | AFTER | INSERT | `audit_delta_trigger` |
| `trg_check_concentration_risk` | AFTER | INSERT | `check_concentration_risk` |
| `trg_enforce_canonical_position` | BEFORE | INSERT | `enforce_canonical_position_mutation` |
| `trg_enforce_canonical_position_write` | BEFORE | INSERT | `enforce_canonical_position_write` |
| `trg_investor_positions_active_fund` | BEFORE | INSERT | `check_fund_is_active` |
| `trg_maintain_hwm` | BEFORE | UPDATE | `maintain_high_water_mark` |
| `trg_set_position_is_active` | BEFORE | INSERT | `set_position_is_active` |
| `trg_validate_position_fund_status` | BEFORE | INSERT | `validate_position_fund_status` |
| `update_investor_positions_updated_at` | BEFORE | UPDATE | `update_updated_at` |

#### `profiles` (9 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `trg_assign_default_role` | AFTER | INSERT | `assign_default_user_role` |
| `trg_audit_profiles_changes` | AFTER | UPDATE | `fn_audit_profiles_changes` |
| `trg_block_test_profiles` | BEFORE | INSERT | `block_test_profiles` |
| `trg_check_duplicate_profile` | BEFORE | INSERT | `check_duplicate_profile` |
| `trg_check_email_uniqueness` | BEFORE | INSERT | `check_email_uniqueness` |
| `trg_preserve_created_at` | BEFORE | UPDATE | `preserve_created_at` |
| `trg_sync_profile_role_from_profiles` | BEFORE | INSERT | `sync_profile_role_from_profiles` |
| `trg_validate_ib_parent_role` | BEFORE | INSERT | `validate_ib_parent_has_role` |
| `update_profiles_updated_at` | BEFORE | UPDATE | `update_updated_at` |

#### `report_schedules` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `set_report_schedules_updated_at` | BEFORE | UPDATE | `set_updated_at` |

#### `statement_email_delivery` (2 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `trigger_delivery_updated_at` | BEFORE | UPDATE | `update_delivery_updated_at` |
| `trigger_log_delivery_status` | AFTER | UPDATE | `log_delivery_status_change` |

#### `statements` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `trg_statements_sync_profile_id` | BEFORE | INSERT | `sync_statements_investor_profile_id` |

#### `support_tickets` (1 trigger)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `update_support_tickets_updated_at` | BEFORE | UPDATE | `update_updated_at` |

#### `transactions_v2` (16 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `delta_audit_transactions_v2` | AFTER | INSERT | `audit_delta_trigger` |
| `protect_transactions_immutable` | BEFORE | UPDATE | `protect_transaction_immutable_fields` |
| `trg_cascade_void_from_transaction` | AFTER | UPDATE | `cascade_void_from_transaction` |
| `trg_enforce_canonical_transaction` | BEFORE | INSERT | `enforce_canonical_transaction_mutation` |
| `trg_enforce_economic_date` | BEFORE | INSERT | `enforce_economic_date` |
| `trg_enforce_internal_visibility` | BEFORE | INSERT | `enforce_internal_tx_visibility` |
| `trg_enforce_transaction_asset` | BEFORE | INSERT | `enforce_transaction_asset_match` |
| `trg_enforce_transaction_via_rpc` | BEFORE | INSERT | `enforce_transaction_via_rpc` |
| `trg_enforce_yield_distribution_guard` | BEFORE | INSERT | `enforce_yield_distribution_guard` |
| `trg_ledger_sync` | AFTER | INSERT | `fn_ledger_drives_position` |
| `trg_recompute_on_void` | AFTER | UPDATE | `recompute_on_void` |
| `trg_transactions_v2_active_fund` | BEFORE | INSERT | `check_fund_is_active` |
| `trg_transactions_v2_sync_voided_by` | BEFORE | INSERT | `sync_transactions_v2_voided_by_profile` |
| `trg_update_last_activity_on_transaction` | AFTER | INSERT | `update_investor_last_activity` |
| `trg_validate_transaction_amount` | BEFORE | INSERT | `validate_transaction_amount` |
| `trg_validate_transaction_fund_status` | BEFORE | INSERT | `validate_transaction_fund_status` |
| `trg_validate_tx_type` | BEFORE | INSERT | `validate_transaction_type` |
| `zz_trg_transactions_v2_immutability` | BEFORE | UPDATE | `enforce_transactions_v2_immutability` |

#### `user_roles` (3 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `audit_user_roles_trigger` | AFTER | INSERT | `audit_user_role_changes` |
| `sync_admin_status_on_role_change` | AFTER | INSERT | `sync_profile_is_admin` |
| `trg_sync_profile_role_from_roles` | AFTER | INSERT | `sync_profile_role_from_roles` |

#### `withdrawal_requests` (6 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `delta_audit_withdrawal_requests` | AFTER | INSERT | `audit_delta_trigger` |
| `trg_guard_withdrawal_state` | BEFORE | UPDATE | `guard_withdrawal_state_transitions` |
| `trg_update_last_activity_on_withdrawal` | AFTER | INSERT | `update_investor_last_activity_withdrawal` |
| `trg_withdrawal_requests_version` | BEFORE | UPDATE | `increment_version` |
| `trg_withdrawals_updated_at` | BEFORE | UPDATE | `set_updated_at` |
| `validate_withdrawal_request_trigger` | BEFORE | INSERT | `validate_withdrawal_request` |

#### `yield_distributions` (6 triggers)
| Trigger | Timing | Event | Function |
|---------|--------|-------|----------|
| `delta_audit_yield_distributions` | AFTER | INSERT | `audit_delta_trigger` |
| `protect_yield_distributions_immutable` | BEFORE | UPDATE | `protect_audit_immutable_fields` |
| `trg_alert_yield_conservation` | AFTER | INSERT | `alert_on_yield_conservation_violation` |
| `trg_cascade_void_to_allocations` | AFTER | UPDATE | `cascade_void_to_allocations` |
| `trg_enforce_canonical_yield` | BEFORE | INSERT | `enforce_canonical_yield_mutation` |
| `trg_sync_yield_date` | BEFORE | INSERT | `sync_yield_date` |
| `trg_validate_dust_tolerance` | BEFORE | INSERT | `validate_dust_tolerance` |

---

## 11. Financial Integrity Report

### Position-to-Ledger Reconciliation

All 25 active investor positions were verified against the transaction ledger. **Zero drift detected.**

| Check | Result |
|-------|--------|
| Positions with ledger drift | **0 / 25** |
| Positions with negative cost basis | **0 / 25** |
| Orphaned positions (no profile) | **0** |
| Orphaned transactions (no profile) | **0** |
| Active yield distributions | **36** |
| Conservation violations | **0** (except P1 asymmetric void) |

### Asymmetric Void Summary

| Item | Value |
|------|-------|
| Distribution ID | `63b032b8-7b16-4335-844e-b6d49e53dba0` |
| Fund | `2c122c4f` |
| Date | 2025-11-30 |
| Affected Investor | `b464a3f7` |
| Amount | 0.0924 USDT |
| Cause | Failed void-and-reissue (reissue never completed) |
| Status | **Pending void** |

### Leakage Audit (`audit_leakage_report()`)

| Check | Status |
|-------|--------|
| Asymmetric voids | ⚠️ 1 found (P1) |
| Negative cost basis | ✅ None |
| Fee leakage (charged ≠ credited) | ✅ None |
| IB commission leakage | ✅ None |

---

## Appendix: Migration History (Today)

| Migration | Content | Status |
|-----------|---------|--------|
| `20260408180849` | P0-A: Drop `user_roles` INSERT policy + SECURITY DEFINER trigger | ✅ Applied |
| `20260408180849` | P0-B: Drop storage broad-access policies + path-based ownership | ✅ Applied |
| `20260408180849` | P1: `search_path = public` on 20 functions | ✅ Applied |
| `20260408180849` | P2: Drop redundant `ib_commission_ledger_select` + `platform_fee_ledger_select` | ✅ Applied |

---

*Last updated: April 8, 2026*
