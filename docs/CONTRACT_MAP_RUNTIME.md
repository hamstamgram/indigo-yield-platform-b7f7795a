CONTRACT MAP (Runtime-Verified)
Generated: 2026-01-30
Environment: production (https://indigo-yield-platform-v01.lovable.app)
Supabase project: nkfimvovosdehmyyjubn

Summary
- Frontend call surfaces: 60 tables/views, 34 RPCs, 1 edge function used in frontend code (send-email)
- Backend callable surfaces: 370 RPCs, 77 tables, 41 views, 31 edge functions

Frontend Call Surface (tables/views)
access_logs
admin_alerts
admin_approvals
admin_integrity_runs
admin_invites
assets
audit_log
branding-assets
daily_nav
daily_rates
documents
fee_allocations
fund_aum_events
fund_aum_mismatch
fund_daily_aum
funds
generated_reports
generated_statements
ib_allocation_consistency
ib_allocations
investor_emails
investor_fee_schedule
investor_fund_performance
investor_invites
investor_position_ledger_mismatch
investor_positions
investor_yield_events
notification_settings
notifications
platform_fee_ledger
price_alerts
profiles
report_access_logs
report_change_log
report_schedules
reports
statement_email_delivery
statement_periods
statements
support_tickets
system_config
transaction_bypass_attempts
transactions_v2
user_roles
user_sessions
user_totp_settings
v_approval_history
v_crystallization_dashboard
v_crystallization_gaps
v_ledger_reconciliation
v_orphaned_positions
v_pending_approvals
v_potential_duplicate_profiles
withdrawal_audit_logs
withdrawal_requests
yield_allocations
yield_distribution_conservation_check
yield_distributions
yield_edit_audit
yield_rates

Frontend Call Surface (RPC names)
adjust_investor_position
admin_create_transaction
apply_adb_yield_distribution_v3
apply_deposit_with_crystallization
apply_withdrawal_with_crystallization
approve_request
batch_crystallize_fund
crystallize_month_end
crystallize_yield_before_flow
ensure_preflow_aum
finalize_month_yield
finalize_reconciliation_pack
get_existing_preflow_aum
get_fund_aum_as_of
get_funds_with_aum
get_ib_parent_candidates
get_ib_referral_count
get_ib_referral_detail
get_ib_referrals
get_report_statistics
has_valid_approval
lock_period_with_approval
merge_duplicate_profiles
preview_adb_yield_distribution_v3
recompute_investor_position
reconcile_all_positions
reject_request
request_approval
requires_dual_approval
run_integrity_check
update_fund_daily_aum_with_recalc
void_fund_daily_aum
void_transaction_with_approval
void_yield_distribution

RPC Signatures (public schema, runtime-verified)
Name | Arguments | Return | Security Definer
adjust_investor_position | p_investor_id uuid, p_fund_id uuid, p_amount numeric, p_reason text, p_tx_date date, p_admin_id uuid | jsonb | true
adjust_investor_position | p_investor_id uuid, p_fund_id uuid, p_delta numeric, p_note text, p_admin_id uuid, p_tx_type text, p_tx_date date, p_reference_id text | TABLE(transaction_id uuid, old_balance numeric, new_balance numeric) | true
admin_create_transaction | p_investor_id uuid, p_fund_id uuid, p_type text, p_amount numeric, p_tx_date date, p_notes text, p_reference_id text, p_admin_id uuid | uuid | true
apply_adb_yield_distribution_v3 | p_fund_id uuid, p_period_start date, p_period_end date, p_gross_yield_amount numeric, p_admin_id uuid, p_purpose aum_purpose | jsonb | true
apply_deposit_with_crystallization | p_fund_id uuid, p_investor_id uuid, p_amount numeric, p_closing_aum numeric, p_effective_date date, p_admin_id uuid, p_notes text, p_purpose text | json | true
apply_withdrawal_with_crystallization | p_fund_id uuid, p_investor_id uuid, p_amount numeric, p_new_total_aum numeric, p_tx_date date, p_admin_id uuid, p_notes text, p_purpose text | json | true
approve_request | p_approval_id uuid, p_approver_id uuid, p_notes text | jsonb | true
batch_crystallize_fund | p_fund_id uuid, p_effective_date date, p_force_override boolean | void | true
batch_crystallize_fund | p_fund_id uuid, p_target_date date, p_new_total_aum numeric, p_admin_id uuid, p_dry_run boolean | jsonb | true
batch_crystallize_fund | p_fund_id uuid, p_target_date date, p_new_total_aum numeric, p_admin_id uuid, p_dry_run boolean, p_force_override boolean | jsonb | true
crystallize_month_end | p_fund_id uuid, p_month_end_date date, p_closing_aum numeric, p_admin_id uuid | jsonb | true
crystallize_yield_before_flow | p_fund_id uuid, p_closing_aum numeric, p_trigger_type text, p_trigger_reference text, p_event_ts timestamp with time zone, p_admin_id uuid, p_purpose aum_purpose | jsonb | true
ensure_preflow_aum | p_fund_id uuid, p_date date, p_purpose aum_purpose, p_total_aum numeric, p_admin_id uuid | jsonb | true
finalize_month_yield | p_fund_id uuid, p_period_year integer, p_period_month integer, p_admin_id uuid | jsonb | true
finalize_reconciliation_pack | p_pack_id uuid, p_admin_id uuid | jsonb | true
get_existing_preflow_aum | p_fund_id uuid, p_event_date date, p_purpose aum_purpose | TABLE(aum_event_id uuid, closing_aum numeric, event_ts timestamp with time zone) | true
get_fund_aum_as_of | p_fund_id uuid, p_as_of_date date, p_purpose aum_purpose | TABLE(fund_id uuid, fund_code text, as_of_date date, purpose aum_purpose, aum_value numeric, aum_source text, event_id uuid) | true
get_funds_with_aum | (none) | TABLE(fund_id uuid, fund_name text, fund_code text, asset text, fund_class text, status text, total_aum numeric, investor_count bigint) | true
get_ib_parent_candidates | p_exclude_id uuid | TABLE(id uuid, first_name text, last_name text, email_masked text) | true
get_ib_referral_count | p_ib_id uuid | integer | true
get_ib_referral_detail | p_ib_id uuid, p_referral_id uuid | TABLE(id uuid, first_name text, last_name text, email_masked text, status text, created_at timestamp with time zone, ib_parent_id uuid) | true
get_ib_referrals | p_ib_id uuid, p_limit integer, p_offset integer | TABLE(id uuid, first_name text, last_name text, email_masked text, ib_percentage numeric, status text, created_at timestamp with time zone) | true
get_report_statistics | p_period_start date, p_period_end date | TABLE(report_type text, total_generated bigint, success_count bigint, failure_count bigint, avg_processing_time_ms numeric, total_downloads bigint, last_generated_at timestamp with time zone) | true
has_valid_approval | p_entity_type text, p_entity_id uuid, p_action_type text | boolean | true
lock_period_with_approval | p_fund_id uuid, p_period_start date, p_period_end date, p_admin_id uuid, p_notes text | jsonb | true
merge_duplicate_profiles | p_keep_profile_id uuid, p_merge_profile_id uuid, p_admin_id uuid | jsonb | true
preview_adb_yield_distribution_v3 | p_fund_id uuid, p_period_start date, p_period_end date, p_gross_yield_amount numeric, p_purpose text | jsonb | true
recompute_investor_position | p_investor_id uuid, p_fund_id uuid | void | true
reconcile_all_positions | p_dry_run boolean | TABLE(investor_id uuid, fund_id uuid, investor_name text, fund_name text, old_value numeric, new_value numeric, old_shares numeric, new_shares numeric, action text) | true
reject_request | p_approval_id uuid, p_rejector_id uuid, p_rejection_reason text | jsonb | true
request_approval | p_action_type text, p_entity_type text, p_entity_id uuid, p_requester_id uuid, p_reason text, p_metadata jsonb, p_amount numeric, p_expiry_hours integer | jsonb | true
requires_dual_approval | p_operation text, p_amount numeric | boolean | true
run_integrity_check | p_scope_fund_id uuid, p_scope_investor_id uuid | jsonb | true
update_fund_daily_aum_with_recalc | p_record_id uuid, p_new_total_aum numeric, p_reason text, p_admin_id uuid | jsonb | true
void_fund_daily_aum | p_record_id uuid, p_reason text, p_admin_id uuid | jsonb | true
void_transaction_with_approval | p_transaction_id uuid, p_admin_id uuid, p_reason text | jsonb | true
void_yield_distribution | p_distribution_id uuid, p_admin_id uuid, p_reason text | json | true

Edge Functions (supabase/functions)
admin-user-management
bootstrap-system-users
ef_register_session
ef_send_notification
excel_export
excel_import
generate-fund-performance
generate-monthly-statements
generate-report
generate-tax-documents
integrity-monitor
investor-audit
mailersend-webhook
mfa-totp-disable
mfa-totp-initiate
mfa-totp-status
mfa-totp-verify
parity_check
process-report-delivery-queue
process-withdrawal
refresh-delivery-status
reset-positions
seed-master-users
send-admin-invite
send-email
send-investor-report
send-notification-email
send-report-mailersend
session-cleanup
set-user-password
status
