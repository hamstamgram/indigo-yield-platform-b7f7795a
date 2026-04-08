# Trigger Inventory

> Generated: 2026-02-01
> Total: 52 unique triggers across 19 tables (169 trigger-event rows)

This is a reference-only document. No triggers should be modified without thorough impact analysis.

---

## audit_log (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| protect_audit_log_immutable | BEFORE | UPDATE | protect_audit_log_immutable_fields() | Prevents modification of immutable audit log fields |

## documents (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| trg_documents_sync_profile_ids | BEFORE | INSERT, UPDATE | sync_documents_profile_ids() | Syncs profile ID references on document records |

## fee_allocations (2 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| protect_fee_allocations_immutable | BEFORE | UPDATE | protect_allocation_immutable_fields() | Prevents modification of immutable fields after creation |
| trg_fee_allocations_sync_voided_by | BEFORE | INSERT, UPDATE | sync_fee_allocations_voided_by_profile() | Syncs voided_by_profile_id from auth user |

## fund_aum_events (3 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| trg_enforce_canonical_aum_event | BEFORE | INSERT, UPDATE, DELETE | enforce_canonical_aum_event_mutation() | Prevents direct DML; requires mutations via canonical RPCs |
| trg_fund_aum_events_sync_voided_by | BEFORE | INSERT, UPDATE | sync_fund_aum_events_voided_by_profile() | Syncs voided_by_profile_id from auth user |
| trg_validate_manual_aum_event | BEFORE | INSERT | validate_manual_aum_event() | Validates manual AUM event data |

## fund_daily_aum (4 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| trg_enforce_canonical_daily_aum | BEFORE | INSERT, UPDATE, DELETE | enforce_canonical_daily_aum_mutation() | Prevents direct DML; requires mutations via canonical RPCs |
| trg_fund_daily_aum_sync_voided_by | BEFORE | INSERT, UPDATE | sync_fund_daily_aum_voided_by_profile() | Syncs voided_by_profile_id from auth user |
| trg_prevent_auto_aum | BEFORE | INSERT | prevent_auto_aum_creation() | Prevents automated AUM record creation |
| trg_validate_manual_aum | AFTER | INSERT | validate_manual_aum_entry() | Validates manual AUM entries after insert |

## funds (2 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| audit_funds_changes | AFTER | INSERT, UPDATE, DELETE | log_data_edit() | General audit logging of data changes |
| update_funds_updated_at | BEFORE | UPDATE | update_updated_at() | Auto-updates updated_at timestamp |

## generated_statements (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| trg_update_last_activity_on_statement | AFTER | INSERT | update_last_activity_on_statement() | Updates investor last activity timestamp on statement generation |

## ib_allocations (3 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| ib_allocation_payout_audit | AFTER | UPDATE | audit_ib_allocation_payout() | Audit logging of IB allocation payout changes |
| protect_ib_allocations_immutable | BEFORE | UPDATE | protect_allocation_immutable_fields() | Prevents modification of immutable fields after creation |
| trg_ib_allocations_sync_voided_by | BEFORE | INSERT, UPDATE | sync_ib_allocations_voided_by_profile() | Syncs voided_by_profile_id from auth user |

## ib_commission_ledger (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| trg_ib_commission_ledger_sync_allocations | AFTER | INSERT | sync_ib_allocations_from_commission_ledger() | Creates IB allocation records from commission ledger entries |

## investor_fee_schedule (2 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| audit_investor_fee_schedule_trigger | AFTER | INSERT, UPDATE, DELETE | audit_fee_schedule_changes() | Audit logging of fee schedule changes |
| trg_auto_close_previous_fee_schedule | AFTER | INSERT | auto_close_previous_fee_schedule() | Auto-closes previous fee schedule when new one is created |

## investor_fund_performance (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| audit_investor_fund_performance_trigger | AFTER | INSERT, UPDATE, DELETE | audit_investor_fund_performance_changes() | Audit logging of investor fund performance changes |

## investor_positions (16 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| audit_investor_positions_changes | AFTER | INSERT, UPDATE, DELETE | log_data_edit() | General audit logging of data changes |
| delta_audit_investor_positions | AFTER | INSERT, UPDATE, DELETE | audit_delta_trigger() | Delta-based audit logging (records field-level changes) |
| trg_alert_aum_position_mismatch | AFTER | UPDATE | alert_on_aum_position_mismatch() | Creates alert when AUM and position totals diverge |
| trg_auto_heal_aum | AFTER | INSERT, UPDATE | auto_heal_aum_drift() | Auto-heals AUM drift when positions change |
| trg_calculate_unrealized_pnl | BEFORE | INSERT, UPDATE | calculate_unrealized_pnl() | Calculates unrealized PnL on position changes |
| trg_check_concentration_risk | AFTER | INSERT, UPDATE | check_concentration_risk() | Alerts on concentration risk thresholds |
| trg_enforce_canonical_position | BEFORE | INSERT, UPDATE, DELETE | enforce_canonical_position_mutation() | Prevents direct DML; requires mutations via canonical RPCs |
| trg_enforce_canonical_position_write | BEFORE | INSERT, UPDATE | enforce_canonical_position_write() | Additional canonical write enforcement for positions |
| trg_ensure_crystallization_date | BEFORE | INSERT | ensure_crystallization_date() | Sets crystallization date on new positions |
| trg_investor_positions_active_fund | BEFORE | INSERT, UPDATE | check_fund_is_active() | Validates fund is active before position creation |
| trg_maintain_hwm | BEFORE | UPDATE | maintain_high_water_mark() | Maintains high water mark for performance fee calculation |
| trg_positions_auto_aum | AFTER | UPDATE | trg_auto_update_aum_fn() | Auto-updates fund AUM on position changes |
| trg_set_position_is_active | BEFORE | INSERT, UPDATE | set_position_is_active() | Sets is_active flag based on position amount |
| trg_sync_aum_after_position | AFTER | UPDATE | sync_fund_aum_after_position() | Syncs fund AUM after position update |
| trg_sync_aum_on_position | AFTER | INSERT, UPDATE, DELETE | sync_aum_on_position_change() | Syncs fund AUM on any position change |
| trg_validate_position_fund_status | BEFORE | INSERT | validate_position_fund_status() | Validates fund status before position creation |
| update_investor_positions_updated_at | BEFORE | UPDATE | update_updated_at() | Auto-updates updated_at timestamp |

## investor_yield_events (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| trg_enforce_yield_event_date | BEFORE | INSERT | enforce_yield_event_date() | Validates yield event date constraints |

## profiles (8 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| trg_block_test_profiles | BEFORE | INSERT | block_test_profiles() | Blocks creation of test profiles in production |
| trg_check_duplicate_profile | BEFORE | INSERT, UPDATE | check_duplicate_profile() | Prevents duplicate profile creation |
| trg_check_email_uniqueness | BEFORE | INSERT, UPDATE | check_email_uniqueness() | Enforces email uniqueness across profiles |
| trg_enforce_fees_account_zero_fee | BEFORE | INSERT, UPDATE | enforce_fees_account_zero_fee() | Ensures fees accounts have zero fee percentage |
| trg_sync_profile_role_from_profiles | BEFORE | INSERT, UPDATE | sync_profile_role_from_profiles() | Syncs computed role field on profile changes |
| trg_validate_fees_account | BEFORE | INSERT, UPDATE | validate_fees_account_fee_pct() | Validates fee percentage for fees accounts |
| trg_validate_ib_parent_role | BEFORE | INSERT, UPDATE | validate_ib_parent_has_role() | Validates IB parent has required role |
| update_profiles_updated_at | BEFORE | UPDATE | update_updated_at() | Auto-updates updated_at timestamp |

## report_schedules (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| set_report_schedules_updated_at | BEFORE | UPDATE | set_updated_at() | Auto-updates updated_at timestamp |

## statement_email_delivery (2 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| trigger_delivery_updated_at | BEFORE | UPDATE | update_delivery_updated_at() | Auto-updates updated_at timestamp |
| trigger_log_delivery_status | AFTER | UPDATE | log_delivery_status_change() | Logs email delivery status changes |

## statements (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| trg_statements_sync_profile_id | BEFORE | INSERT, UPDATE | sync_statements_investor_profile_id() | Syncs investor profile ID on statement records |

## support_tickets (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| update_support_tickets_updated_at | BEFORE | UPDATE | update_updated_at() | Auto-updates updated_at timestamp |

## system_2fa_policy (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| update_2fa_policy_updated_at | BEFORE | UPDATE | update_updated_at() | Auto-updates updated_at timestamp |

## transactions_v2 (20 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| audit_transactions_v2_changes | AFTER | INSERT, UPDATE, DELETE | log_data_edit() | General audit logging of data changes |
| delta_audit_transactions_v2 | AFTER | INSERT, UPDATE, DELETE | audit_delta_trigger() | Delta-based audit logging (records field-level changes) |
| protect_transactions_immutable | BEFORE | UPDATE | protect_transaction_immutable_fields() | Prevents modification of immutable fields after creation |
| trg_audit_transactions | AFTER | INSERT, UPDATE, DELETE | audit_transaction_changes() | Domain-specific transaction audit logging |
| trg_cascade_void_from_transaction | AFTER | UPDATE | cascade_void_from_transaction() | Cascades void operations to related records |
| trg_enforce_canonical_transaction | BEFORE | INSERT, UPDATE, DELETE | enforce_canonical_transaction_mutation() | Prevents direct DML; requires mutations via canonical RPCs |
| trg_enforce_economic_date | BEFORE | INSERT | enforce_economic_date() | Enforces economic date constraints on transactions |
| trg_enforce_internal_visibility | BEFORE | INSERT | enforce_internal_tx_visibility() | Sets visibility for internal transactions |
| trg_enforce_transaction_asset | BEFORE | INSERT, UPDATE | enforce_transaction_asset_match() | Validates transaction asset matches fund asset |
| trg_enforce_transaction_via_rpc | BEFORE | INSERT | enforce_transaction_via_rpc() | Enforces transactions are created via RPC only |
| trg_enforce_yield_distribution_guard | BEFORE | INSERT, UPDATE | enforce_yield_distribution_guard() | Guards yield distribution transaction constraints |
| trg_recompute_on_void | AFTER | UPDATE | recompute_on_void() | Recomputes position when transaction is voided |
| trg_recompute_position_on_tx | AFTER | INSERT, UPDATE, DELETE | trigger_recompute_position() | Recomputes position after any transaction change |
| trg_sync_aum_on_transaction | AFTER | INSERT | sync_aum_on_transaction() | Syncs fund AUM when new transaction is created |
| trg_sync_yield_to_events | AFTER | INSERT | sync_yield_to_investor_yield_events() | Creates investor yield event from yield transaction |
| trg_transactions_v2_active_fund | BEFORE | INSERT, UPDATE | check_fund_is_active() | Validates fund is active before transaction |
| trg_transactions_v2_sync_voided_by | BEFORE | INSERT, UPDATE | sync_transactions_v2_voided_by_profile() | Syncs voided_by_profile_id from auth user |
| trg_update_last_activity_on_transaction | AFTER | INSERT | update_investor_last_activity() | Updates investor last activity timestamp |
| trg_validate_transaction_amount | BEFORE | INSERT | validate_transaction_amount() | Validates transaction amount is valid |
| trg_validate_transaction_fund_status | BEFORE | INSERT | validate_transaction_fund_status() | Validates fund status before transaction |
| trg_validate_transaction_has_aum | BEFORE | INSERT | validate_transaction_has_aum() | Validates AUM record exists for transaction date |
| trg_validate_tx_type | BEFORE | INSERT, UPDATE | validate_transaction_type() | Validates transaction type is valid |
| zz_trg_transactions_v2_immutability | BEFORE | UPDATE | enforce_transactions_v2_immutability() | Final immutability enforcement (zz_ prefix ensures last execution) |

## user_roles (4 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| audit_user_roles_trigger | AFTER | INSERT, UPDATE, DELETE | audit_user_role_changes() | Audit logging of role changes |
| sync_admin_status_on_role_change | AFTER | INSERT, UPDATE, DELETE | sync_profile_is_admin() | Syncs is_admin flag on profile when roles change |
| trg_sync_profile_role_from_roles | AFTER | INSERT, UPDATE, DELETE | sync_profile_role_from_roles() | Syncs computed role field from roles table |
| trigger_sync_ib_account_type | AFTER | INSERT | sync_ib_account_type() | Syncs IB account type when role is assigned |

## user_totp_settings (1 trigger)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| update_totp_settings_updated_at | BEFORE | UPDATE | update_updated_at() | Auto-updates updated_at timestamp |

## withdrawal_requests (9 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| audit_withdrawal_requests_changes | AFTER | INSERT, UPDATE, DELETE | log_data_edit() | General audit logging of data changes |
| delta_audit_withdrawal_requests | AFTER | INSERT, UPDATE, DELETE | audit_delta_trigger() | Delta-based audit logging (records field-level changes) |
| trg_update_last_activity_on_withdrawal | AFTER | INSERT, UPDATE | update_investor_last_activity_withdrawal() | Updates investor last activity on withdrawal |
| trg_withdrawal_cancel_audit | AFTER | UPDATE | cleanup_withdrawal_audit_on_cancel() | Cleans up audit records when withdrawal is cancelled |
| trg_withdrawal_requests_version | BEFORE | UPDATE | increment_version() | Increments version for optimistic concurrency |
| trg_withdrawals_cancel_log | AFTER | UPDATE | log_cancel_on_status_change() | Logs cancellation when status changes |
| trg_withdrawals_create_log | AFTER | INSERT | log_withdrawal_creation() | Logs withdrawal request creation |
| trg_withdrawals_updated_at | BEFORE | UPDATE | set_updated_at() | Auto-updates updated_at timestamp |
| validate_withdrawal_request_trigger | BEFORE | INSERT | validate_withdrawal_request() | Validates withdrawal request data |

## yield_distributions (9 triggers)

| Trigger | Timing | Events | Function | Purpose |
|---------|--------|--------|----------|---------|
| delta_audit_yield_distributions | AFTER | INSERT, UPDATE, DELETE | audit_delta_trigger() | Delta-based audit logging (records field-level changes) |
| protect_yield_distributions_immutable | BEFORE | UPDATE | protect_audit_immutable_fields() | Prevents modification of immutable fields after creation |
| trg_alert_yield_conservation | AFTER | INSERT, UPDATE | alert_on_yield_conservation_violation() | Alerts when yield conservation law is violated |
| trg_cascade_void_to_allocations | AFTER | UPDATE | cascade_void_to_allocations() | Cascades void to fee/IB allocations |
| trg_cascade_void_to_yield_events | AFTER | UPDATE | cascade_void_to_yield_events() | Cascades void to investor yield events |
| trg_enforce_canonical_yield | BEFORE | INSERT, UPDATE, DELETE | enforce_canonical_yield_mutation() | Prevents direct DML; requires mutations via canonical RPCs |
| trg_sync_yield_date | BEFORE | INSERT, UPDATE | sync_yield_date() | Syncs yield_date from period_end |
| trg_sync_yield_distribution_legacy_totals | BEFORE | INSERT, UPDATE | sync_yield_distribution_legacy_totals() | Syncs legacy total columns from new fields |
| trg_validate_dust_tolerance | BEFORE | INSERT, UPDATE | validate_dust_tolerance() | Validates dust amount is within tolerance |
