# Schema Inventory

**Source**: Remote Supabase project `nkfimvovosdehmyyjubn` schema dump (24,686 lines)
**Generated**: 2026-04-13
**Status**: COMPLETE for analysis

## Overview

| Category | Count | Status |
|----------|-------|--------|
| Tables | 49 | Active |
| Views | 21 | Active (mostly integrity checks) |
| Functions/RPCs | 318 | Active + Archived |
| Migrations | 98 | Mixed quality |

## Core Tables (Production Data)

### Investor & Fund Management
- `profiles` — User accounts (investors, IB agents, admins)
- `funds` — Fund definitions
- `investor_positions` — Investor holdings per fund
- `investor_fund_performance` — Yield and performance metrics
- `investor_position_snapshots` — Historical position snapshots

### Transactions & Accounting
- `transactions_v2` — Main transaction ledger (v2 is canonical)
- `investor_daily_balance` — Rolling account balance
- `yield_allocations` — Yield allotments per investor
- `yield_distributions` — Fund-wide yield crystallization
- `yield_rate_sanity_config` — Yield validation limits

### Fee & IB Management
- `fee_allocations` — Fee ledger per investor
- `investor_fee_schedule` — Fee rate configuration
- `ib_allocations` — IB referral fee allocations
- `ib_commission_ledger` — IB commission tracking
- `ib_commission_schedule` — IB rate configuration

### AUM & Risk
- `fund_aum_events` — AUM transaction log
- `fund_daily_aum` — Daily fund valuation
- `fund_yield_snapshots` — Yield snapshot per fund per date
- `investor_yield_events` — Investor yield transactions
- `risk_alerts` — Risk monitoring alerts

### Operational
- `asset s` — Fund underlying assets
- `withdrawal_requests` — Withdrawal pipeline
- `generated_statements` — Statement records
- `statement_email_delivery` — Email tracking
- `audit_log` — All data modifications
- `admin_alerts` — Admin notifications
- `documents` — Supporting documents (PDFs, etc.)

## Backup Tables (Historical/Dead Code)

⚠️ **8 backup tables exist**:
- `_fee_schedule_backup`
- `_fund_aum_backup`
- `_funds_backup`
- `_ib_schedule_backup`
- `_positions_backup`
- `_profiles_backup`
- `_transactions_backup`
- `_user_roles_backup`

**Question**: Are these still referenced? Should be moved to archive folder.

## Views (Integrity & Reconciliation)

### Health Checks (21 total)
- `v_ledger_reconciliation` — Position vs. ledger alignment
- `v_fund_aum_position_health` — Fund balancing
- `aum_position_reconciliation` — AUM → Position sync
- `position_transaction_reconciliation` — Ledger consistency
- `yield_distribution_conservation_check` — Yield conservation

### Orphan Detection
- `v_orphaned_positions` — Positions without owner
- `v_orphaned_transactions` — Transactions without position
- `v_fee_allocation_orphans` — Unmatched fee records
- `v_transaction_distribution_orphans` — Yield orphans

### Risk & Anomalies
- `v_liquidity_risk` — Low-balance indicators
- `v_yield_conservation_violations` — Yield math errors
- `v_potential_duplicate_profiles` — Data quality issues

## Functions & RPCs (318 total)

### Critical Business Logic (High Priority)

#### Yield Distribution (Crystallization)
- `apply_daily_yield_with_validation()` — Daily yield accrual
- `process_yield_distribution()` — Fund yield allocation
- `crystallize_month_end()` — Period-end crystallization
- `preview_adb_yield_distribution_v3()` — Yield preview
- `validate_yield_distribution_prerequisites()` — Pre-flight checks

#### Transaction Pipeline
- `apply_deposit_with_crystallization()` — Deposit workflow
- `apply_withdrawal_with_crystallization()` — Withdrawal workflow
- `approve_and_complete_withdrawal()` — Withdrawal approval
- `void_and_reissue_transaction()` — Void/reissue lifecycle
- `unvoid_transaction()` — Undo voids

#### AUM Management
- `set_fund_daily_aum()` — Set daily fund valuation
- `sync_aum_on_position_change()` — Position → AUM sync
- `sync_aum_on_transaction()` — Transaction → AUM sync
- `reconcile_fund_aum_with_positions()` — Balance check
- `validate_aum_against_positions()` — AUM integrity

#### Position Management
- `adjust_investor_position()` — Update holdings
- `recompute_investor_position()` — Rebuild position
- `calculate_position_at_date_fix()` — Historical position
- `rebuild_position_from_ledger()` — Reconstruct from TX

### Administrative RPCs (Medium Priority)

#### Reporting & Statements
- `get_investor_reports_v2()` — Investor report generation
- `generate_statement_path()` — Statement file path
- `queue_statement_deliveries()` — Schedule delivery
- `dispatch_report_delivery_run()` — Send reports

#### Health & Integrity
- `run_integrity_check()` — Full system validation
- `run_daily_health_check()` — Daily diagnostics
- `run_comprehensive_health_check()` — Deep audit
- `check_platform_data_integrity()` — Platform validation

#### Admin Tools
- `get_all_investors_summary()` — Investor list
- `get_platform_stats()` — Platform KPIs
- `get_fund_summary()` — Fund detail
- `force_delete_investor()` — Hard delete (dangerous)
- `reset_all_data_keep_profiles()` — Reset helper

### Supporting Functions (Low Priority)

#### Authorization & Roles
- `is_admin()` — Admin check
- `is_super_admin()` — Super admin check
- `can_access_investor()` — Access control
- `current_user_is_admin_or_owner()` — Auth check

#### Triggers & Sync
- `update_updated_at_column()` — Timestamp sync
- `set_updated_at()` — Manual timestamp
- `sync_profile_is_admin()` — Admin sync
- `maintain_high_water_mark()` — HWM maintenance

#### Utilities
- `build_error_response()` — Error formatting
- `build_success_response()` — Response formatting
- `log_audit_event()` — Audit logging
- `parse_platform_error()` — Error parsing

## Enums

- `app_role` — ('investor', 'ib_agent', 'admin')
- `account_type` — ('individual', 'corporate')
- `aum_purpose` — ('deposit', 'yield', 'withdrawal', 'fee', ...)
- `tx_source` — ('deposit', 'withdrawal', 'yield', 'fee', ...)

## Suspicious Patterns

### Pattern 1: Function Versioning
- `preview_segmented_yield_distribution_v5()` suggests v1-v4 exist or existed
- `preview_adb_yield_distribution_v3()` suggests v1-v2 exist
- **Question**: Are old versions still referenced?

### Pattern 2: Backup Tables + "_backup" Suffix
- 8 backup tables suggest data migration or rollback scenarios
- **Question**: Are they used? Can they be archived?

### Pattern 3: Redundant Void Functions
- `void_and_reissue_transaction()`
- `void_and_reissue_full_exit()`
- `void_transaction_bulk()`
- `cascade_void_from_transaction()`
- **Question**: Which is canonical?

### Pattern 4: Multiple AUM Sync Functions
- `sync_aum_on_position_change()`
- `sync_aum_on_transaction()`
- `sync_fund_aum_events_voided_by_profile()`
- `update_fund_aum_baseline()`
- **Question**: Should be consolidated?

### Pattern 5: Reconciliation Views (21 total)
- Suggests ongoing data integrity issues
- **Question**: Are violations being fixed proactively or just monitored?

## Naming Inconsistencies

### Transaction Versions
- `transactions_v2` (canonical)
- No `transactions_v1` visible (archived?)
- Suggested: Clarify v1 status

### Function Naming
- Mix of verb-based: `apply_`, `calculate_`, `validate_`
- Mix of status-based: `is_`, `check_`, `ensure_`
- Mix of effect-based: `sync_`, `update_`, `maintain_`

### View Naming
- Prefix `v_` inconsistent (some have it, some don't)
- Prefix inconsistent: `aum_`, `fund_aum_`, etc.

## Dead Code Candidates

Functions with suspicious names/patterns:
- `qa_seed_world()` — QA test helper
- `block_test_profiles()` — Test blocker
- `qa_admin_id()`, `qa_fund_id()`, `qa_investor_id()` — QA fixtures
- `create_profile_on_signup()` — Trigger function (may be dead)

## Risk Assessment

| Risk | Count | Examples |
|------|-------|----------|
| Backup tables still in place | 8 | `_profiles_backup`, `_transactions_backup` |
| Function version proliferation | 3+ | `v3`, `v5` yield functions |
| Duplicate void logic | 4 | Multiple void functions |
| Orphan detection views | 8+ | Suggests data quality issues |
| QA code in production | 4+ | `qa_*` functions, `block_test_profiles` |

## Recommendations for Next Steps

### High Priority
1. [ ] Clarify: Are backup tables used? If not, archive them.
2. [ ] Clarify: Is `transactions_v1` truly dead?
3. [ ] Clarify: Which void/reissue function is canonical?
4. [ ] Remove or isolate QA code from production

### Medium Priority
1. [ ] Consolidate AUM sync functions
2. [ ] Investigate why 21 reconciliation views exist
3. [ ] Standardize view naming (`v_` prefix inconsistency)
4. [ ] Document function version strategy

### Low Priority
1. [ ] Standardize function naming patterns
2. [ ] Clean up archived migrations
3. [ ] Consolidate error handling functions
