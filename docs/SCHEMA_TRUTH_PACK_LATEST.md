# Schema Truth Pack — Production Database
## Extracted: 2026-01-16 from Production (nkfimvovosdehmyyjubn)

---

## A) Critical Tables with Primary Keys

| Table | Primary Key | Column Count | Notes |
|-------|-------------|--------------|-------|
| `investor_positions` | **COMPOSITE: (fund_id, investor_id)** | 18 | Position state |
| `transactions_v2` | `id` (uuid) | 30 | Ledger |
| `profiles` | `id` (uuid) | 24 | User accounts |
| `funds` | `id` (uuid) | 19 | Fund definitions |
| `withdrawal_requests` | `id` (uuid) | 29 | Withdrawal state machine |
| `withdrawal_audit_logs` | `id` (uuid) | 6 | **CANONICAL audit log (plural)** |
| `fund_daily_aum` | `id` (uuid) | 19 | AUM snapshots |
| `yield_distributions` | `id` (uuid) | 36 | Yield distribution records |
| `yield_allocations` | `id` (uuid) | 15 | Per-investor yield allocations |
| `fee_allocations` | `id` (uuid) | 18 | Fee distributions |
| `ib_allocations` | `id` (uuid) | 23 | IB commission allocations |
| `daily_nav` | **COMPOSITE: (fund_id, nav_date)** | 16 | NAV records |
| `transaction_bypass_attempts` | `id` (uuid) | 10 | Bypass audit log |

---

## B) transactions_v2 Schema

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| id | uuid | NO | gen_random_uuid() | PK |
| fund_id | uuid | NO | | FK → funds.id |
| investor_id | uuid | YES | | FK → profiles.id |
| tx_date | date | NO | CURRENT_DATE | Transaction date |
| value_date | date | NO | CURRENT_DATE | Value date |
| asset | text | NO | | Asset code |
| amount | numeric | NO | | Signed amount |
| type | tx_type | NO | | Enum |
| balance_before | numeric | YES | | Snapshot |
| balance_after | numeric | YES | | Snapshot |
| tx_hash | text | YES | | Blockchain hash |
| reference_id | text | YES | | **Idempotency key (UNIQUE INDEX)** |
| notes | text | YES | | |
| approved_by | uuid | YES | | FK → profiles.id |
| approved_at | timestamptz | YES | | |
| created_by | uuid | YES | | FK → profiles.id |
| created_at | timestamptz | YES | now() | |
| fund_class | text | YES | | |
| purpose | aum_purpose | YES | 'transaction' | |
| source | tx_source | YES | 'manual_admin' | **Track origin** |
| is_system_generated | boolean | YES | false | |
| visibility_scope | visibility_scope | NO | 'investor_visible' | |
| transfer_id | uuid | YES | | FK for internal transfers |
| distribution_id | uuid | YES | | FK → yield_distributions.id |
| correction_id | uuid | YES | | FK → yield_corrections.id |
| tx_subtype | text | YES | | |
| **is_voided** | boolean | NO | false | **Soft delete flag** |
| voided_at | timestamptz | YES | | |
| voided_by | uuid | YES | | |
| void_reason | text | YES | | |

**Key Indexes:**
- `transactions_v2_pkey` — PRIMARY KEY on `id`
- `transactions_v2_reference_id_unique` — UNIQUE on `reference_id` WHERE NOT NULL
- `idx_transactions_v2_integrity_check` — (investor_id, fund_id, is_voided) WHERE is_voided = false

---

## C) investor_positions Schema

| Column | Type | Nullable | Default | Notes |
|--------|------|----------|---------|-------|
| fund_id | uuid | NO | | **PK part 1** |
| investor_id | uuid | NO | | **PK part 2** |
| shares | numeric | NO | 0 | |
| cost_basis | numeric | NO | 0 | |
| current_value | numeric | NO | 0 | **Crystallized balance** |
| unrealized_pnl | numeric | YES | 0 | |
| realized_pnl | numeric | YES | 0 | |
| last_transaction_date | date | YES | | |
| lock_until_date | date | YES | | |
| high_water_mark | numeric | YES | | |
| mgmt_fees_paid | numeric | YES | 0 | |
| perf_fees_paid | numeric | YES | 0 | |
| updated_at | timestamptz | YES | now() | |
| fund_class | text | YES | | |
| aum_percentage | numeric | YES | 0 | |
| **last_yield_crystallization_date** | date | YES | | **Crystallization tracking** |
| cumulative_yield_earned | numeric | YES | 0 | |
| is_active | boolean | YES | true | |

---

## D) Enum Types

### tx_type
```
DEPOSIT, WITHDRAWAL, INTEREST, FEE, ADJUSTMENT, FEE_CREDIT, IB_CREDIT, YIELD, INTERNAL_WITHDRAWAL, INTERNAL_CREDIT, IB_DEBIT
```

### tx_source
```
manual_admin, yield_distribution, fee_allocation, ib_allocation, system_bootstrap, investor_wizard, internal_routing, yield_correction, withdrawal_completion, rpc_canonical, crystallization, system, migration
```

### withdrawal_status
```
pending, approved, processing, completed, rejected, cancelled
```

### withdrawal_action
```
create, approve, reject, processing, complete, cancel, update, route_to_fees
```

### aum_purpose
```
reporting, transaction
```

### visibility_scope
```
investor_visible, admin_only
```

---

## E) Critical Functions/RPCs

### Crystallization Functions
| Function | Signature | Security |
|----------|-----------|----------|
| `apply_transaction_with_crystallization` | (p_investor_id uuid, p_fund_id uuid, p_tx_type text, p_amount numeric, p_tx_date date, p_reference_id text, p_notes text, p_admin_id uuid, p_new_total_aum numeric, p_purpose aum_purpose) | DEFINER |
| `crystallize_yield_before_flow` | (p_fund_id uuid, p_closing_aum numeric, p_trigger_type text, p_trigger_reference text, p_event_ts timestamptz, p_admin_id uuid, p_purpose aum_purpose) | DEFINER |
| `batch_crystallize_fund` | (p_fund_id uuid, p_target_date date, p_new_total_aum numeric, p_admin_id uuid, p_dry_run boolean) | DEFINER |
| `is_crystallization_current` | (p_investor_id uuid, p_fund_id uuid, p_target_date date) | DEFINER |
| `preview_crystallization` | (p_investor_id uuid, p_fund_id uuid, p_target_date date, p_new_total_aum numeric) | DEFINER |
| `crystallize_month_end` | (p_fund_id uuid, p_month_end_date date, p_closing_aum numeric, p_admin_id uuid) | DEFINER |

### Transaction Functions
| Function | Signature | Security |
|----------|-----------|----------|
| `admin_create_transaction` | (p_investor_id uuid, p_fund_id uuid, p_type text, p_amount numeric, p_tx_date date, p_notes text, p_reference_id text, p_admin_id uuid) | DEFINER |
| `void_transaction` | (p_transaction_id uuid, p_admin_id uuid, p_reason text) | DEFINER |
| `void_and_reissue_transaction` | (p_original_tx_id uuid, p_new_amount numeric, p_new_date date, p_new_notes text, p_closing_aum numeric, p_admin_id uuid, p_reason text) | DEFINER |
| `recompute_investor_position` | (p_investor_id uuid, p_fund_id uuid) | DEFINER |

### Withdrawal Functions
| Function | Signature | Security |
|----------|-----------|----------|
| `create_withdrawal_request` | (p_investor_id uuid, p_fund_id uuid, p_amount numeric, p_type text, p_notes text) | DEFINER |
| `approve_withdrawal` | (p_request_id uuid, p_approved_amount numeric, p_admin_notes text) | DEFINER |
| `reject_withdrawal` | (p_request_id uuid, p_reason text, p_admin_notes text) | DEFINER |
| `start_processing_withdrawal` | (p_request_id uuid, p_admin_id uuid) | DEFINER |
| `complete_withdrawal` | (p_request_id uuid, p_tx_hash text, p_admin_notes text) | DEFINER |
| `cancel_withdrawal_by_admin` | (p_request_id uuid, p_reason text, p_admin_notes text) | DEFINER |
| `delete_withdrawal` | (p_withdrawal_id uuid, p_reason text, p_hard_delete boolean) | DEFINER |
| `route_withdrawal_to_fees` | (p_request_id uuid, p_reason text) | DEFINER |
| `log_withdrawal_action` | (p_request_id uuid, p_action withdrawal_action, p_details jsonb) | DEFINER |

### Yield Functions
| Function | Signature | Security |
|----------|-----------|----------|
| `apply_daily_yield_to_fund_v3` | (p_fund_id uuid, p_yield_date date, p_gross_yield_pct numeric, p_created_by uuid, p_purpose aum_purpose) | DEFINER |
| `preview_daily_yield_to_fund_v3` | (p_fund_id uuid, p_yield_date date, p_new_aum numeric, p_purpose text) | DEFINER |
| `void_yield_distribution` | (p_distribution_id uuid, p_reason text, p_admin_id uuid) | DEFINER |

### Reconciliation Functions
| Function | Signature | Security |
|----------|-----------|----------|
| `reconcile_investor_position` | (p_investor_id uuid, p_fund_id uuid, p_admin_id uuid, p_action text) | DEFINER |
| `reconcile_all_positions` | (p_dry_run boolean) | DEFINER |
| `check_transaction_sources` | () | DEFINER |

---

## F) Views (45 total)

### Integrity/Reconciliation Views (MUST return 0 rows when healthy)
| View | Purpose |
|------|---------|
| `v_ledger_reconciliation` | Ledger vs position balance check |
| `v_position_transaction_variance` | Variance breakdown by tx_type |
| `v_ledger_position_mismatches` | Position discrepancies |
| `v_missing_withdrawal_transactions` | Withdrawals without ledger entries |
| `v_yield_conservation_check` | Yield conservation identity |
| `v_yield_conservation_violations` | Yield conservation failures |
| `v_yield_allocation_violations` | Allocation math errors |
| `v_crystallization_gaps` | Positions needing crystallization |
| `v_potential_duplicate_profiles` | Duplicate email detection |
| `v_transaction_sources` | Transaction source audit |
| `fund_aum_mismatch` | AUM vs positions discrepancy |
| `investor_position_ledger_mismatch` | Per-investor mismatch |

### Orphan Detection Views
| View | Purpose |
|------|---------|
| `v_period_orphans` | Orphaned accounting periods |
| `v_transaction_distribution_orphans` | Transactions with invalid distribution refs |
| `v_fee_allocation_orphans` | Fee allocations with invalid refs |
| `v_ib_allocation_orphans` | IB allocations with invalid refs |
| `v_orphaned_positions` | Positions without valid investor/fund |
| `v_orphaned_transactions` | Transactions without valid refs |

### Admin Dashboard Views
| View | Purpose |
|------|---------|
| `v_crystallization_dashboard` | Per-fund crystallization summary |
| `v_position_crystallization_status` | All positions with crystal status |
| `withdrawal_queue` | Active withdrawals |
| `withdrawal_audit_log` | **Compatibility view → withdrawal_audit_logs** |

---

## G) Triggers on transactions_v2 (19 total)

| Trigger | Event | Function |
|---------|-------|----------|
| `trg_enforce_transaction_via_rpc` | BEFORE INSERT | `enforce_transaction_via_rpc()` |
| `zz_trg_transactions_v2_immutability` | BEFORE UPDATE | `enforce_transactions_v2_immutability()` |
| `protect_transactions_immutable` | BEFORE UPDATE | `protect_transaction_immutable_fields()` |
| `trg_validate_transaction_amount` | BEFORE INSERT | `validate_transaction_amount()` |
| `trg_validate_tx_type` | BEFORE INSERT/UPDATE | `validate_transaction_type()` |
| `trg_validate_transaction_fund_status` | BEFORE INSERT | `validate_transaction_fund_status()` |
| `trg_validate_transaction_has_aum` | BEFORE INSERT | `validate_transaction_has_aum()` |
| `trg_enforce_transaction_asset` | BEFORE INSERT/UPDATE | `enforce_transaction_asset_match()` |
| `trg_enforce_economic_date` | BEFORE INSERT | `enforce_economic_date()` |
| `trg_enforce_internal_visibility` | BEFORE INSERT | `enforce_internal_tx_visibility()` |
| `trg_recompute_position_on_tx` | AFTER INSERT/UPDATE/DELETE | `trigger_recompute_position()` |
| `trg_sync_aum_on_transaction` | AFTER INSERT | `sync_aum_on_transaction()` |
| `trg_sync_yield_to_events` | AFTER INSERT (YIELD type) | `sync_yield_to_investor_yield_events()` |
| `trg_cascade_void_from_transaction` | AFTER UPDATE (voided) | `cascade_void_from_transaction()` |
| `trg_update_last_activity_on_transaction` | AFTER INSERT | `update_investor_last_activity()` |
| `audit_transactions_v2_changes` | AFTER ALL | `log_data_edit()` |
| `delta_audit_transactions_v2` | AFTER ALL | `audit_delta_trigger()` |
| `trg_audit_transactions` | AFTER ALL | `audit_transaction_changes()` |
| `trg_transactions_v2_active_fund` | BEFORE INSERT/UPDATE | `check_fund_is_active()` |

---

## H) RLS Status

| Table | RLS Enabled |
|-------|-------------|
| transactions_v2 | ✓ |
| investor_positions | ✓ |
| withdrawal_requests | ✓ |
| profiles | ✓ |
| funds | ✓ |
| yield_distributions | ✓ |
| yield_allocations | ✓ |

---

## I) Confirmed Schema Facts

1. **investor_positions has COMPOSITE PK**: `(fund_id, investor_id)` — NOT a UUID id
2. **fund_daily_aum has UUID id**: Single-column PK, no composite
3. **transactions_v2 has void columns**: `is_voided`, `voided_at`, `voided_by`, `void_reason`
4. **Canonical audit log table**: `withdrawal_audit_logs` (plural)
5. **Compatibility view exists**: `withdrawal_audit_log` (singular) → SELECT * FROM withdrawal_audit_logs
6. **reference_id unique index exists**: Multiple indexes enforce idempotency
7. **trg_enforce_transaction_via_rpc trigger exists**: Blocks direct inserts
8. **transaction_bypass_attempts table exists**: Logs blocked attempts

---

## J) Current Status (P1 Operations Lockdown)

### Integrity Status: ALL CLEAR
| Check | Status |
|-------|--------|
| Crystallization Gaps | 0 |
| AUM Snapshot Health | 6 OK |
| Duplicate Profiles | 0 |
| Transaction Sources | Clean |
| Stale Positions | 0 |

### P0 Infrastructure Deployed
- `apply_transaction_with_crystallization` - Canonical RPC for all transactions
- `apply_adb_yield_distribution` - ADB-based fair yield allocation
- `batch_crystallize_fund` - Bulk crystallization operations
- `batch_initialize_fund_aum_service` - AUM initialization
- `merge_duplicate_profiles` - Safe profile merger
- `trg_enforce_transaction_via_rpc` - Blocks direct inserts

### P1 Infrastructure (To Be Added)
- `assert_integrity_or_raise` - Gating function for write operations
- `admin_integrity_runs` - Monitoring persistence table
- `admin_alerts` - Alert dispatch table
- Missing views to create: `v_ledger_reconciliation`, `v_position_transaction_variance`, `fund_aum_mismatch`, `v_yield_conservation_check`

---

## K) Local Database Schema Notes

**Local DB Differences from Production:**
- `fund_daily_aum.fund_id` is TEXT (requires cast: `fund_id = f.id::text`)
- `is_voided` columns may be nullable (use `COALESCE(is_voided, false) = false`)
- `is_active` columns may be nullable (use `COALESCE(is_active, true) = true`)

---

## Document Metadata
- **Updated**: 2026-01-16 (P1 Operations Lockdown)
- **Source**: Local Supabase (127.0.0.1:54322)
- **Previous**: Production Supabase (nkfimvovosdehmyyjubn)
