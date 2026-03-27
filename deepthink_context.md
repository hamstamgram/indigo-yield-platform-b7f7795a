# Indigo Yield Platform - Deep Think Context

> Core financial and architectural logic extracted for external reasoning.
> Generated: 2026-03-27

---

# Section 1: Core Contracts

## `src/contracts/dbSchema.ts`

```typescript
/**
 * Database Schema Contracts
 * AUTO-GENERATED - DO NOT EDIT
 *
 * Provides table metadata for runtime validation and IDE support.
 * Regenerate with: npm run contracts:generate
 */

import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// TABLE METADATA
// =============================================================================

export const DB_TABLES = {
  admin_alerts: {
    name: "admin_alerts" as const,
    primaryKey: ["id"] as const,
    columns: [
      "acknowledged_at",
      "acknowledged_by",
      "alert_type",
      "created_at",
      "id",
      "message",
      "metadata",
      "notification_channel",
      "notification_sent_at",
      "related_run_id",
      "severity",
      "title",
    ] as const,
    rlsEnabled: true,
  },
  admin_integrity_runs: {
    name: "admin_integrity_runs" as const,
    primaryKey: ["id"] as const,
    columns: [
      "context",
      "created_by",
      "id",
      "run_at",
      "runtime_ms",
      "scope_fund_id",
      "scope_investor_id",
      "status",
      "triggered_by",
      "violations",
    ] as const,
    rlsEnabled: true,
  },
  assets: {
    name: "assets" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "decimal_places",
      "icon_url",
      "id",
      "is_active",
      "name",
      "symbol",
    ] as const,
    rlsEnabled: true,
  },
  audit_log: {
    name: "audit_log" as const,
    primaryKey: ["id"] as const,
    columns: [
      "action",
      "actor_user",
      "created_at",
      "entity",
      "entity_id",
      "id",
      "meta",
      "new_values",
      "old_values",
    ] as const,
    rlsEnabled: true,
  },
  data_edit_audit: {
    name: "data_edit_audit" as const,
    primaryKey: ["id"] as const,
    columns: [
      "changed_fields",
      "edit_source",
      "edited_at",
      "edited_by",
      "id",
      "import_id",
      "import_related",
      "new_data",
      "old_data",
      "operation",
      "record_id",
      "table_name",
      "voided_record",
    ] as const,
    rlsEnabled: true,
  },
  documents: {
    name: "documents" as const,
    primaryKey: ["id"] as const,
    columns: [
      "checksum",
      "created_at",
      "created_by",
      "created_by_profile_id",
      "fund_id",
      "id",
      "period_end",
      "period_start",
      "storage_path",
      "title",
      "type",
      "user_id",
      "user_profile_id",
    ] as const,
    rlsEnabled: true,
  },
  error_code_metadata: {
    name: "error_code_metadata" as const,
    primaryKey: null,
    columns: [
      "category",
      "created_at",
      "default_message",
      "error_code",
      "is_retryable",
      "severity",
      "ui_action",
      "user_action_hint",
    ] as const,
    rlsEnabled: true,
  },
  fee_allocations: {
    name: "fee_allocations" as const,
    primaryKey: ["id"] as const,
    columns: [
      "base_net_income",
      "created_at",
      "created_by",
      "credit_transaction_id",
      "debit_transaction_id",
      "distribution_id",
      "fee_amount",
      "fee_percentage",
      "fees_account_id",
      "fund_id",
      "id",
      "investor_id",
      "is_voided",
      "period_end",
      "period_start",
      "purpose",
      "voided_at",
      "voided_by",
      "voided_by_profile_id",
    ] as const,
    rlsEnabled: true,
  },
  fund_daily_aum: {
    name: "fund_daily_aum" as const,
    primaryKey: ["id"] as const,
    columns: [
      "as_of_date",
      "aum_date",
      "created_at",
      "created_by",
      "fund_id",
      "id",
      "is_month_end",
      "is_voided",
      "nav_per_share",
      "purpose",
      "source",
      "temporal_lock_bypass",
      "total_aum",
      "total_shares",
      "updated_at",
      "updated_by",
      "void_reason",
      "voided_at",
      "voided_by",
      "voided_by_profile_id",
    ] as const,
    rlsEnabled: true,
  },
  fund_yield_snapshots: {
    name: "fund_yield_snapshots" as const,
    primaryKey: ["id"] as const,
    columns: [
      "closing_aum",
      "created_at",
      "created_by",
      "days_in_period",
      "fund_id",
      "gross_yield_amount",
      "gross_yield_pct",
      "id",
      "opening_aum",
      "period_end",
      "period_start",
      "snapshot_date",
      "trigger_reference",
      "trigger_type",
    ] as const,
    rlsEnabled: true,
  },
  funds: {
    name: "funds" as const,
    primaryKey: ["id"] as const,
    columns: [
      "asset",
      "code",
      "cooling_off_hours",
      "created_at",
      "fund_class",
      "high_water_mark",
      "id",
      "inception_date",
      "large_withdrawal_threshold",
      "lock_period_days",
      "logo_url",
      "max_daily_yield_pct",
      "mgmt_fee_bps",
      "min_investment",
      "min_withdrawal_amount",
      "name",
      "perf_fee_bps",
      "status",
      "strategy",
      "updated_at",
    ] as const,
    rlsEnabled: true,
  },
  generated_statements: {
    name: "generated_statements" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "fund_names",
      "generated_by",
      "html_content",
      "id",
      "investor_id",
      "pdf_url",
      "period_id",
      "user_id",
    ] as const,
    rlsEnabled: true,
  },
  global_fee_settings: {
    name: "global_fee_settings" as const,
    primaryKey: null,
    columns: ["description", "setting_key", "updated_at", "updated_by", "value"] as const,
    rlsEnabled: true,
  },
  ib_allocations: {
    name: "ib_allocations" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "created_by",
      "distribution_id",
      "effective_date",
      "fund_id",
      "ib_fee_amount",
      "ib_investor_id",
      "ib_percentage",
      "id",
      "is_voided",
      "paid_at",
      "paid_by",
      "payout_batch_id",
      "payout_status",
      "period_end",
      "period_id",
      "period_start",
      "purpose",
      "source",
      "source_investor_id",
      "source_net_income",
      "voided_at",
      "voided_by",
      "voided_by_profile_id",
    ] as const,
    rlsEnabled: true,
  },
  ib_commission_ledger: {
    name: "ib_commission_ledger" as const,
    primaryKey: ["id"] as const,
    columns: [
      "asset",
      "created_at",
      "created_by",
      "effective_date",
      "fund_id",
      "gross_yield_amount",
      "ib_commission_amount",
      "ib_id",
      "ib_name",
      "ib_percentage",
      "id",
      "is_voided",
      "source_investor_id",
      "source_investor_name",
      "transaction_id",
      "void_reason",
      "voided_at",
      "voided_by",
      "yield_distribution_id",
    ] as const,
    rlsEnabled: true,
  },
  ib_commission_schedule: {
    name: "ib_commission_schedule" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "effective_date",
      "end_date",
      "fund_id",
      "ib_percentage",
      "id",
      "investor_id",
      "updated_at",
    ] as const,
    rlsEnabled: true,
  },
  investor_daily_balance: {
    name: "investor_daily_balance" as const,
    primaryKey: ["id"] as const,
    columns: [
      "balance_date",
      "created_at",
      "end_of_day_balance",
      "fund_id",
      "id",
      "investor_id",
    ] as const,
    rlsEnabled: true,
  },
  investor_emails: {
    name: "investor_emails" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "email",
      "id",
      "investor_id",
      "is_primary",
      "updated_at",
      "verified",
    ] as const,
    rlsEnabled: true,
  },
  investor_fee_schedule: {
    name: "investor_fee_schedule" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "effective_date",
      "end_date",
      "fee_pct",
      "fund_id",
      "id",
      "investor_id",
      "updated_at",
    ] as const,
    rlsEnabled: true,
  },
  investor_fund_performance: {
    name: "investor_fund_performance" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "fund_name",
      "id",
      "investor_id",
      "itd_additions",
      "itd_beginning_balance",
      "itd_ending_balance",
      "itd_net_income",
      "itd_rate_of_return",
      "itd_redemptions",
      "mtd_additions",
      "mtd_beginning_balance",
      "mtd_ending_balance",
      "mtd_net_income",
      "mtd_rate_of_return",
      "mtd_redemptions",
      "period_id",
      "purpose",
      "qtd_additions",
      "qtd_beginning_balance",
      "qtd_ending_balance",
      "qtd_net_income",
      "qtd_rate_of_return",
      "qtd_redemptions",
      "updated_at",
      "ytd_additions",
      "ytd_beginning_balance",
      "ytd_ending_balance",
      "ytd_net_income",
      "ytd_rate_of_return",
      "ytd_redemptions",
    ] as const,
    rlsEnabled: true,
  },
  investor_position_snapshots: {
    name: "investor_position_snapshots" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "current_value",
      "fund_id",
      "id",
      "investor_id",
      "snapshot_date",
      "snapshot_source",
    ] as const,
    rlsEnabled: true,
  },
  investor_positions: {
    name: "investor_positions" as const,
    primaryKey: null,
    columns: [
      "aum_percentage",
      "cost_basis",
      "cumulative_yield_earned",
      "current_value",
      "fund_class",
      "fund_id",
      "high_water_mark",
      "investor_id",
      "is_active",
      "last_transaction_date",
      "last_yield_crystallization_date",
      "lock_until_date",
      "mgmt_fees_paid",
      "perf_fees_paid",
      "realized_pnl",
      "shares",
      "unrealized_pnl",
      "updated_at",
    ] as const,
    rlsEnabled: true,
  },
  notifications: {
    name: "notifications" as const,
    primaryKey: ["id"] as const,
    columns: [
      "body",
      "created_at",
      "data_jsonb",
      "id",
      "priority",
      "read_at",
      "title",
      "type",
      "user_id",
    ] as const,
    rlsEnabled: true,
  },
  platform_fee_ledger: {
    name: "platform_fee_ledger" as const,
    primaryKey: ["id"] as const,
    columns: [
      "asset",
      "created_at",
      "created_by",
      "effective_date",
      "fee_amount",
      "fee_percentage",
      "fund_id",
      "gross_yield_amount",
      "id",
      "investor_id",
      "investor_name",
      "is_voided",
      "transaction_id",
      "void_reason",
      "voided_at",
      "voided_by",
      "yield_distribution_id",
    ] as const,
    rlsEnabled: true,
  },
  profiles: {
    name: "profiles" as const,
    primaryKey: ["id"] as const,
    columns: [
      "account_type",
      "avatar_url",
      "created_at",
      "email",
      "entity_type",
      "first_name",
      "ib_commission_source",
      "ib_parent_id",
      "id",
      "include_in_reporting",
      "is_admin",
      "is_system_account",
      "kyc_status",
      "last_activity_at",
      "last_name",
      "onboarding_date",
      "phone",
      "preferences",
      "role",
      "status",
      "totp_enabled",
      "totp_verified",
      "updated_at",
    ] as const,
    rlsEnabled: true,
  },
  qa_entity_manifest: {
    name: "qa_entity_manifest" as const,
    primaryKey: ["id"] as const,
    columns: ["created_at", "entity_id", "entity_label", "entity_type", "id", "run_tag"] as const,
    rlsEnabled: true,
  },
  rate_limit_config: {
    name: "rate_limit_config" as const,
    primaryKey: null,
    columns: [
      "action_type",
      "created_at",
      "description",
      "is_enabled",
      "max_actions",
      "updated_at",
      "window_minutes",
    ] as const,
    rlsEnabled: true,
  },
  report_schedules: {
    name: "report_schedules" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "created_by",
      "day_of_month",
      "day_of_week",
      "delivery_method",
      "description",
      "failure_count",
      "filters",
      "formats",
      "frequency",
      "id",
      "is_active",
      "last_run_at",
      "last_run_status",
      "name",
      "next_run_at",
      "parameters",
      "recipient_emails",
      "recipient_user_ids",
      "report_definition_id",
      "run_count",
      "time_of_day",
      "timezone",
      "updated_at",
    ] as const,
    rlsEnabled: true,
  },
  risk_alerts: {
    name: "risk_alerts" as const,
    primaryKey: ["id"] as const,
    columns: [
      "acknowledged",
      "acknowledged_at",
      "acknowledged_by",
      "actual_value",
      "alert_type",
      "created_at",
      "details",
      "expires_at",
      "fund_id",
      "id",
      "investor_id",
      "message",
      "resolution_notes",
      "resolved",
      "resolved_at",
      "resolved_by",
      "severity",
      "threshold_value",
    ] as const,
    rlsEnabled: true,
  },
  statement_email_delivery: {
    name: "statement_email_delivery" as const,
    primaryKey: ["id"] as const,
    columns: [
      "attempt_count",
      "bounce_type",
      "bounced_at",
      "channel",
      "clicked_at",
      "created_at",
      "created_by",
      "delivered_at",
      "delivery_mode",
      "error_code",
      "error_message",
      "failed_at",
      "id",
      "investor_id",
      "last_attempt_at",
      "locked_at",
      "locked_by",
      "metadata",
      "opened_at",
      "period_id",
      "provider",
      "provider_message_id",
      "recipient_email",
      "retry_count",
      "sent_at",
      "statement_id",
      "status",
      "subject",
      "updated_at",
      "user_id",
    ] as const,
    rlsEnabled: true,
  },
  statement_periods: {
    name: "statement_periods" as const,
    primaryKey: ["id"] as const,
    columns: [
      "created_at",
      "created_by",
      "finalized_at",
      "finalized_by",
      "id",
      "month",
      "notes",
      "period_end_date",
      "period_name",
      "status",
      "updated_at",
      "year",
    ] as const,
    rlsEnabled: true,
  },
  statements: {
    name: "statements" as const,
    primaryKey: ["id"] as const,
    columns: [
      "additions",
      "asset_code",
      "begin_balance",
      "created_at",
      "end_balance",
      "id",
      "investor_id",
      "investor_profile_id",
      "net_income",
      "period_month",
      "period_year",
      "rate_of_return_itd",
      "rate_of_return_mtd",
      "rate_of_return_qtd",
      "rate_of_return_ytd",
      "redemptions",
      "storage_path",
    ] as const,
    rlsEnabled: true,
  },
  support_tickets: {
    name: "support_tickets" as const,
    primaryKey: ["id"] as const,
    columns: [
      "assigned_admin_id",
      "attachments",
      "category",
      "created_at",
      "id",
      "messages_jsonb",
      "priority",
      "status",
      "subject",
      "updated_at",
      "user_id",
    ] as const,
    rlsEnabled: true,
  },
  system_config: {
    name: "system_config" as const,
    primaryKey: null,
    columns: ["description", "key", "updated_at", "updated_by", "value"] as const,
    rlsEnabled: true,
  },
  transactions_v2: {
    name: "transactions_v2" as const,
    primaryKey: ["id"] as const,
    columns: [
      "amount",
      "approved_at",
      "approved_by",
      "asset",
      "balance_after",
      "balance_before",
      "correction_id",
      "created_at",
      "created_by",
      "distribution_id",
      "fund_class",
      "fund_id",
      "id",
      "investor_id",
      "is_system_generated",
      "is_voided",
      "meta",
      "notes",
      "purpose",
      "reference_id",
      "source",
      "transfer_id",
      "tx_date",
      "tx_hash",
      "tx_subtype",
      "type",
      "value_date",
      "visibility_scope",
      "void_reason",
      "voided_at",
      "voided_by",
      "voided_by_profile_id",
    ] as const,
    rlsEnabled: true,
  },
  user_roles: {
    name: "user_roles" as const,
    primaryKey: ["id"] as const,
    columns: ["created_at", "id", "role", "user_id"] as const,
    rlsEnabled: true,
  },
  withdrawal_requests: {
    name: "withdrawal_requests" as const,
    primaryKey: ["id"] as const,
    columns: [
      "admin_notes",
      "approved_amount",
      "approved_at",
      "approved_by",
      "approved_shares",
      "cancellation_reason",
      "cancelled_at",
      "cancelled_by",
      "created_by",
      "earliest_processing_at",
      "fund_class",
      "fund_id",
      "id",
      "investor_id",
      "notes",
      "processed_amount",
      "processed_at",
      "rejected_at",
      "rejected_by",
      "rejection_reason",
      "request_date",
      "requested_amount",
      "requested_shares",
      "settlement_date",
      "status",
      "tx_hash",
      "updated_at",
      "version",
      "withdrawal_type",
    ] as const,
    rlsEnabled: true,
  },
  yield_allocations: {
    name: "yield_allocations" as const,
    primaryKey: ["id"] as const,
    columns: [
      "adb_share",
      "created_at",
      "distribution_id",
      "fee_amount",
      "fee_pct",
      "fee_transaction_id",
      "fund_id",
      "gross_amount",
      "ib_amount",
      "ib_pct",
      "ib_transaction_id",
      "id",
      "investor_id",
      "is_voided",
      "net_amount",
      "ownership_pct",
      "position_value_at_calc",
      "transaction_id",
    ] as const,
    rlsEnabled: true,
  },
  yield_distributions: {
    name: "yield_distributions" as const,
    primaryKey: ["id"] as const,
    columns: [
      "allocation_count",
      "aum_record_id",
      "calculation_method",
      "closing_aum",
      "consolidated_into_id",
      "created_at",
      "created_by",
      "distribution_type",
      "dust_amount",
      "dust_receiver_id",
      "effective_date",
      "fund_id",
      "gross_yield",
      "gross_yield_amount",
      "id",
      "investor_count",
      "is_month_end",
      "is_voided",
      "net_yield",
      "opening_aum",
      "parent_distribution_id",
      "period_end",
      "period_start",
      "previous_aum",
      "purpose",
      "reason",
      "recorded_aum",
      "reference_id",
      "snapshot_time",
      "status",
      "summary_json",
      "total_fee_amount",
      "total_fees",
      "total_ib",
      "total_ib_amount",
      "total_net_amount",
      "void_reason",
      "voided_at",
      "voided_by",
      "yield_date",
      "yield_percentage",
    ] as const,
    rlsEnabled: true,
  },
  yield_rate_sanity_config: {
    name: "yield_rate_sanity_config" as const,
    primaryKey: ["id"] as const,
    columns: [
      "alert_threshold_pct",
      "created_at",
      "fund_id",
      "id",
      "max_daily_yield_pct",
      "min_daily_yield_pct",
      "updated_at",
    ] as const,
    rlsEnabled: true,
  },
} as const;

export type TableName = keyof typeof DB_TABLES;

export type TableColumns<T extends TableName> = (typeof DB_TABLES)[T]["columns"][number];

export type TablePrimaryKey<T extends TableName> = (typeof DB_TABLES)[T]["primaryKey"];

// =============================================================================
// COMPOSITE PRIMARY KEY DETECTION
// =============================================================================

/** Tables with composite primary keys (no single "id" column) */
export const COMPOSITE_PK_TABLES = [
  "error_code_metadata",
  "global_fee_settings",
  "investor_positions",
  "rate_limit_config",
  "system_config",
] as const;

export type CompositePKTable = (typeof COMPOSITE_PK_TABLES)[number];

/** Check if a table has a composite PK (cannot use .select("id")) */
export function hasCompositePK(table: TableName): table is CompositePKTable {
  return (COMPOSITE_PK_TABLES as readonly string[]).includes(table);
}

/** Get primary key column names for a table */
export function getPrimaryKeyColumns(table: TableName): string[] {
  const meta = DB_TABLES[table];
  return meta.primaryKey ? [...meta.primaryKey] : [];
}

```

## `src/contracts/rpcSignatures.ts`

```typescript
/**
 * RPC Function Signatures
 * AUTO-GENERATED - DO NOT EDIT
 *
 * Provides compile-time and runtime verification of RPC calls.
 * Regenerate with: npm run contracts:generate
 */

import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// RPC FUNCTION REGISTRY
// =============================================================================

type RPCFunctions = Database["public"]["Functions"];
export type RPCFunctionName = keyof RPCFunctions;

/** All registered RPC function names */
export const RPC_FUNCTIONS = [
  "_resolve_investor_fee_pct",
  "_resolve_investor_ib_pct",
  "_v5_check_distribution_uniqueness",
  "acquire_delivery_batch",
  "acquire_position_lock",
  "acquire_withdrawal_lock",
  "acquire_yield_lock",
  "add_fund_to_investor",
  "adjust_investor_position",
  "apply_daily_yield_with_validation",
  "apply_transaction_with_crystallization",
  "apply_segmented_yield_distribution_v5",
  "approve_and_complete_withdrawal",
  "approve_withdrawal",
  "assert_integrity_or_raise",
  "backfill_balance_chain_fix",
  "batch_reconcile_all_positions",
  "build_error_response",
  "build_success_response",
  "calc_avg_daily_balance",
  "calculate_position_at_date_fix",
  "can_access_investor",
  "can_access_notification",
  "can_insert_notification",
  "can_withdraw",
  "cancel_delivery",
  "cancel_withdrawal_by_admin",
  "cancel_withdrawal_by_investor",
  "check_all_funds_transaction_aum",
  "check_and_fix_aum_integrity",
  "check_aum_exists_for_date",
  "check_aum_position_health",
  "check_aum_reconciliation",
  "check_duplicate_ib_allocations",
  "check_duplicate_transaction_refs",
  "check_is_admin",
  "check_platform_data_integrity",
  "check_transaction_sources",
  "cleanup_dormant_positions",
  "complete_withdrawal",
  "compute_jsonb_delta",
  "compute_position_from_ledger",
  "compute_profile_role",
  "create_daily_position_snapshot",
  "create_integrity_alert",
  "create_withdrawal_request",
  "crystallize_month_end",
  "current_user_is_admin_or_owner",
  "delete_transaction",
  "delete_withdrawal",
  "dispatch_report_delivery_run",
  "edit_transaction",
  "ensure_admin",
  "export_investor_data",
  "finalize_month_yield",
  "finalize_statement_period",
  "fix_yield_distribution_investor_count",
  "force_delete_investor",
  "generate_document_path",
  "generate_statement_path",
  "get_active_funds_summary",
  "get_admin_stats",
  "get_admin_name",
  "get_all_dust_tolerances",
  "get_aum_position_reconciliation",
  "get_available_balance",
  "get_delivery_stats",
  "get_dust_tolerance_for_fund",
  "get_fund_aum_as_of",
  "get_fund_base_asset",
  "get_fund_composition",
  "get_fund_net_flows",
  "get_fund_positions_sum",
  "get_fund_summary",
  "get_funds_aum_snapshot",
  "get_funds_daily_flows",
  "get_funds_with_aum",
  "get_health_trend",
  "get_ib_parent_candidates",
  "get_ib_referral_count",
  "get_ib_referral_detail",
  "get_ib_referrals",
  "get_all_investors_summary",
  "get_investor_cumulative_yield",
  "get_investor_fee_pct",
  "get_investor_ib_pct",
  "get_investor_reports_v2",
  "get_investor_yield_summary",
  "get_latest_health_status",
  "get_monthly_platform_aum",
  "get_period_delivery_stats",
  "get_platform_flow_metrics",
  "get_platform_stats",
  "get_position_reconciliation",
  "get_reporting_eligible_investors",
  "get_schema_dump",
  "get_statement_period_summary",
  "get_statement_signed_url",
  "get_system_mode",
  "get_transaction_aum",
  "get_user_admin_status",
  "get_void_aum_impact",
  "get_void_transaction_impact",
  "get_void_yield_impact",
  "has_role",
  "has_super_admin_role",
  "initialize_all_hwm_values",
  "initialize_crystallization_dates",
  "initialize_fund_aum_from_positions",
  "initialize_null_crystallization_dates",
  "insert_yield_transaction",
  "internal_route_to_fees",
  "is_admin",
  "is_admin_for_jwt",
  "is_admin_safe",
  "is_canonical_rpc",
  "is_crystallization_current",
  "is_import_enabled",
  "is_period_locked",
  "is_super_admin",
  "is_within_edit_window",
  "is_yield_period_closed",
  "get_paged_audit_logs",
  "get_paged_notifications",
  "get_paged_investor_summaries",
  "log_audit_event",
  "log_financial_operation",
  "log_ledger_mismatches",
  "log_security_event",
  "log_withdrawal_action",
  "mark_delivery_result",
  "mark_sent_manually",
  "merge_duplicate_profiles",
  "nightly_aum_reconciliation",
  "parse_platform_error",
  "populate_investor_fund_performance",
  "preview_crystallization",
  "preview_daily_yield_to_fund_v3",
  "preview_merge_duplicate_profiles",
  "preview_segmented_yield_distribution_v5",
  "process_yield_distribution",
  "process_yield_distribution_with_dust",
  "purge_fund_hard",
  "qa_admin_id",
  "qa_fees_account_id",
  "qa_fund_id",
  "qa_investor_id",
  "queue_statement_deliveries",
  "raise_platform_error",
  "rebuild_position_from_ledger",
  "recalculate_fund_aum_for_date",
  "recompute_investor_position",
  "recompute_investor_positions_for_investor",
  "reconcile_all_positions",
  "reject_withdrawal",
  "reopen_yield_period",
  "repair_all_positions",
  "requeue_stale_sending",
  "require_admin",
  "require_super_admin",
  "retry_delivery",
  "route_withdrawal_to_fees",
  "run_comprehensive_health_check",
  "run_daily_health_check",
  "run_integrity_check",
  "run_integrity_pack",
  "run_invariant_checks",
  "set_canonical_rpc",
  "start_processing_withdrawal",
  "system_health_check",
  "unvoid_transaction",
  "unvoid_transactions_bulk",
  "update_admin_role",
  "update_dust_tolerance",
  "update_fund_aum_baseline",
  "update_investor_aum_percentages",
  "update_transaction",
  "update_user_profile_secure",
  "update_withdrawal",
  "validate_aum_against_positions",
  "validate_aum_against_positions_at_date",
  "validate_aum_matches_positions",
  "validate_aum_matches_positions_strict",
  "validate_pre_yield_aum",
  "validate_transaction_aum_exists",
  "validate_withdrawal_transition",
  "validate_yield_distribution_prerequisites",
  "validate_yield_parameters",
  "validate_yield_rate_sanity",
  "validate_yield_temporal_lock",
  "verify_yield_distribution_balance",
  "void_and_reissue_full_exit",
  "void_and_reissue_transaction",
  "void_transaction",
  "void_transactions_bulk",
  "void_yield_distribution",
  "unvoid_yield_distribution",
] as const;

// =============================================================================
// RPC SIGNATURES METADATA
// =============================================================================

export const RPC_SIGNATURES = {
  _resolve_investor_fee_pct: {
    name: "_resolve_investor_fee_pct" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_effective_date", "p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  _resolve_investor_ib_pct: {
    name: "_resolve_investor_ib_pct" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_effective_date", "p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  _v5_check_distribution_uniqueness: {
    name: "_v5_check_distribution_uniqueness" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_period_end", "p_purpose"] as const,
    optionalParams: [] as const,
  },
  acquire_delivery_batch: {
    name: "acquire_delivery_batch" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_period_id"] as const,
    optionalParams: ["p_batch_size", "p_channel", "p_worker_id"] as const,
  },
  acquire_position_lock: {
    name: "acquire_position_lock" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  acquire_withdrawal_lock: {
    name: "acquire_withdrawal_lock" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_request_id"] as const,
    optionalParams: [] as const,
  },
  acquire_yield_lock: {
    name: "acquire_yield_lock" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_yield_date"] as const,
    optionalParams: [] as const,
  },
  add_fund_to_investor: {
    name: "add_fund_to_investor" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: ["p_cost_basis", "p_initial_shares"] as const,
  },
  adjust_investor_position: {
    name: "adjust_investor_position" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_amount", "p_fund_id", "p_investor_id", "p_reason"] as const,
    optionalParams: ["p_admin_id", "p_tx_date"] as const,
  },
  apply_daily_yield_with_validation: {
    name: "apply_daily_yield_with_validation" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_created_by", "p_fund_id", "p_gross_yield_pct", "p_yield_date"] as const,
    optionalParams: ["p_purpose", "p_skip_validation"] as const,
  },
  apply_transaction_with_crystallization: {
    name: "apply_transaction_with_crystallization" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [
      "p_admin_id",
      "p_amount",
      "p_fund_id",
      "p_investor_id",
      "p_reference_id",
      "p_tx_date",
      "p_tx_type",
    ] as const,
    optionalParams: ["p_notes", "p_purpose"] as const,
  },
  apply_segmented_yield_distribution_v5: {
    name: "apply_segmented_yield_distribution_v5" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_period_end", "p_recorded_aum"] as const,
    optionalParams: ["p_admin_id", "p_distribution_date", "p_purpose"] as const,
  },
  approve_and_complete_withdrawal: {
    name: "approve_and_complete_withdrawal" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_request_id"] as const,
    optionalParams: [
      "p_admin_notes",
      "p_is_full_exit",
      "p_processed_amount",
      "p_send_precision",
      "p_tx_hash",
    ] as const,
  },
  approve_withdrawal: {
    name: "approve_withdrawal" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_request_id"] as const,
    optionalParams: ["p_admin_notes", "p_approved_amount"] as const,
  },
  assert_integrity_or_raise: {
    name: "assert_integrity_or_raise" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_context", "p_scope_fund_id", "p_scope_investor_id"] as const,
  },
  backfill_balance_chain_fix: {
    name: "backfill_balance_chain_fix" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  batch_reconcile_all_positions: {
    name: "batch_reconcile_all_positions" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  build_error_response: {
    name: "build_error_response" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_error_code"] as const,
    optionalParams: ["p_details"] as const,
  },
  build_success_response: {
    name: "build_success_response" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_data", "p_message"] as const,
  },
  calc_avg_daily_balance: {
    name: "calc_avg_daily_balance" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id", "p_period_end", "p_period_start"] as const,
    optionalParams: [] as const,
  },
  calculate_position_at_date_fix: {
    name: "calculate_position_at_date_fix" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_as_of_date", "p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  can_access_investor: {
    name: "can_access_investor" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["investor_uuid"] as const,
    optionalParams: [] as const,
  },
  can_access_notification: {
    name: "can_access_notification" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["notification_id"] as const,
    optionalParams: [] as const,
  },
  can_insert_notification: {
    name: "can_insert_notification" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  can_withdraw: {
    name: "can_withdraw" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_amount", "p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  cancel_delivery: {
    name: "cancel_delivery" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_delivery_id"] as const,
    optionalParams: [] as const,
  },
  cancel_withdrawal_by_admin: {
    name: "cancel_withdrawal_by_admin" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_reason", "p_request_id"] as const,
    optionalParams: ["p_admin_notes"] as const,
  },
  cancel_withdrawal_by_investor: {
    name: "cancel_withdrawal_by_investor" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_investor_id", "p_request_id"] as const,
    optionalParams: ["p_reason"] as const,
  },
  check_all_funds_transaction_aum: {
    name: "check_all_funds_transaction_aum" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_tx_date"] as const,
    optionalParams: [] as const,
  },
  check_and_fix_aum_integrity: {
    name: "check_and_fix_aum_integrity" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_dry_run", "p_end_date", "p_fund_id", "p_start_date"] as const,
  },
  check_aum_exists_for_date: {
    name: "check_aum_exists_for_date" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_date", "p_fund_id"] as const,
    optionalParams: [] as const,
  },
  check_aum_position_health: {
    name: "check_aum_position_health" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  check_aum_reconciliation: {
    name: "check_aum_reconciliation" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_as_of_date", "p_fund_id"] as const,
    optionalParams: ["p_tolerance_pct"] as const,
  },
  check_duplicate_ib_allocations: {
    name: "check_duplicate_ib_allocations" as const,
    returnType: "number",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  check_duplicate_transaction_refs: {
    name: "check_duplicate_transaction_refs" as const,
    returnType: "number",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  check_is_admin: {
    name: "check_is_admin" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["user_id"] as const,
    optionalParams: [] as const,
  },
  check_platform_data_integrity: {
    name: "check_platform_data_integrity" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  check_transaction_sources: {
    name: "check_transaction_sources" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  cleanup_dormant_positions: {
    name: "cleanup_dormant_positions" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_dry_run"] as const,
  },
  complete_withdrawal: {
    name: "complete_withdrawal" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_closing_aum", "p_request_id"] as const,
    optionalParams: ["p_admin_notes", "p_event_ts", "p_transaction_hash"] as const,
  },
  compute_jsonb_delta: {
    name: "compute_jsonb_delta" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_new", "p_old"] as const,
    optionalParams: [] as const,
  },
  compute_position_from_ledger: {
    name: "compute_position_from_ledger" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: ["p_as_of"] as const,
  },
  compute_profile_role: {
    name: "compute_profile_role" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_account_type", "p_is_admin", "p_user_id"] as const,
    optionalParams: [] as const,
  },
  create_daily_position_snapshot: {
    name: "create_daily_position_snapshot" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_fund_id", "p_snapshot_date"] as const,
  },
  create_integrity_alert: {
    name: "create_integrity_alert" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_alert_type", "p_message", "p_severity", "p_title"] as const,
    optionalParams: ["p_metadata"] as const,
  },
  create_withdrawal_request: {
    name: "create_withdrawal_request" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_amount", "p_fund_id", "p_investor_id"] as const,
    optionalParams: ["p_notes", "p_type"] as const,
  },
  crystallize_month_end: {
    name: "crystallize_month_end" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_closing_aum", "p_fund_id", "p_month_end_date"] as const,
    optionalParams: [] as const,
  },
  current_user_is_admin_or_owner: {
    name: "current_user_is_admin_or_owner" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["check_user_id"] as const,
    optionalParams: [] as const,
  },
  delete_transaction: {
    name: "delete_transaction" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_confirmation", "p_transaction_id"] as const,
    optionalParams: [] as const,
  },
  delete_withdrawal: {
    name: "delete_withdrawal" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_reason", "p_withdrawal_id"] as const,
    optionalParams: ["p_hard_delete"] as const,
  },
  dispatch_report_delivery_run: {
    name: "dispatch_report_delivery_run" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_period_id"] as const,
    optionalParams: ["p_channel"] as const,
  },
  edit_transaction: {
    name: "edit_transaction" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_transaction_id"] as const,
    optionalParams: ["p_notes", "p_reference_id", "p_tx_date", "p_tx_hash"] as const,
  },
  ensure_admin: {
    name: "ensure_admin" as const,
    returnType: "undefined",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  export_investor_data: {
    name: "export_investor_data" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_user_id"] as const,
    optionalParams: [] as const,
  },
  finalize_month_yield: {
    name: "finalize_month_yield" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_fund_id", "p_period_month", "p_period_year"] as const,
    optionalParams: [] as const,
  },
  finalize_statement_period: {
    name: "finalize_statement_period" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_period_id"] as const,
    optionalParams: [] as const,
  },
  fix_yield_distribution_investor_count: {
    name: "fix_yield_distribution_investor_count" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_distribution_id"] as const,
    optionalParams: [] as const,
  },
  force_delete_investor: {
    name: "force_delete_investor" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  generate_document_path: {
    name: "generate_document_path" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["document_type", "filename", "user_id"] as const,
    optionalParams: [] as const,
  },
  generate_statement_path: {
    name: "generate_statement_path" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["month", "user_id", "year"] as const,
    optionalParams: ["fund_code"] as const,
  },
  get_active_funds_summary: {
    name: "get_active_funds_summary" as const,
    returnType: "any[];",
    returnsSet: true,
    securityDefiner: true,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_all_investors_summary: {
    name: "get_all_investors_summary" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: true,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_admin_stats: {
    name: "get_admin_stats" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: true,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_platform_flow_metrics: {
    name: "get_platform_flow_metrics" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: true,
    requiredParams: [] as const,
    optionalParams: ["p_days"] as const,
  },
  get_period_delivery_stats: {
    name: "get_period_delivery_stats" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: true,
    requiredParams: ["p_period_id"] as const,
    optionalParams: [] as const,
  },
  purge_fund_hard: {
    name: "purge_fund_hard" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: true,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: [] as const,
  },
  get_admin_name: {
    name: "get_admin_name" as const,
    returnType: "string",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["admin_id"] as const,
    optionalParams: [] as const,
  },
  get_all_dust_tolerances: {
    name: "get_all_dust_tolerances" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_aum_position_reconciliation: {
    name: "get_aum_position_reconciliation" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_date"] as const,
  },
  get_available_balance: {
    name: "get_available_balance" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  get_delivery_stats: {
    name: "get_delivery_stats" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_period_id"] as const,
    optionalParams: [] as const,
  },
  get_dust_tolerance_for_fund: {
    name: "get_dust_tolerance_for_fund" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: [] as const,
  },
  get_fund_aum_as_of: {
    name: "get_fund_aum_as_of" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_as_of_date", "p_fund_id"] as const,
    optionalParams: ["p_purpose"] as const,
  },
  get_fund_base_asset: {
    name: "get_fund_base_asset" as const,
    returnType: "string",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: [] as const,
  },
  get_fund_composition: {
    name: "get_fund_composition" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: ["p_date"] as const,
  },
  get_fund_net_flows: {
    name: "get_fund_net_flows" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_end_date", "p_fund_id", "p_start_date"] as const,
    optionalParams: [] as const,
  },
  get_fund_positions_sum: {
    name: "get_fund_positions_sum" as const,
    returnType: "number",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: [] as const,
  },
  get_fund_summary: {
    name: "get_fund_summary" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_funds_aum_snapshot: {
    name: "get_funds_aum_snapshot" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_as_of_date"] as const,
    optionalParams: ["p_purpose"] as const,
  },
  get_funds_daily_flows: {
    name: "get_funds_daily_flows" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: true,
    requiredParams: ["p_date"] as const,
    optionalParams: [] as const,
  },
  get_paged_audit_logs: {
    name: "get_paged_audit_logs" as const,
    returnType: "table" as const,
    returnsSet: true,
    securityDefiner: true,
    requiredParams: [] as const,
    optionalParams: ["p_limit", "p_offset", "p_entity", "p_action", "p_actor_id"] as const,
  },
  get_paged_notifications: {
    name: "get_paged_notifications" as const,
    returnType: "table" as const,
    returnsSet: true,
    securityDefiner: true,
    requiredParams: ["p_user_id"] as const,
    optionalParams: ["p_limit", "p_offset"] as const,
  },
  get_paged_investor_summaries: {
    name: "get_paged_investor_summaries" as const,
    returnType: "table" as const,
    returnsSet: true,
    securityDefiner: true,
    requiredParams: [] as const,
    optionalParams: ["p_limit", "p_offset", "p_status"] as const,
  },
  get_funds_with_aum: {
    name: "get_funds_with_aum" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_health_trend: {
    name: "get_health_trend" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_days"] as const,
  },
  get_ib_parent_candidates: {
    name: "get_ib_parent_candidates" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_exclude_id"] as const,
    optionalParams: [] as const,
  },
  get_ib_referral_count: {
    name: "get_ib_referral_count" as const,
    returnType: "number",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_ib_id"] as const,
    optionalParams: [] as const,
  },
  get_ib_referral_detail: {
    name: "get_ib_referral_detail" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_ib_id", "p_referral_id"] as const,
    optionalParams: [] as const,
  },
  get_ib_referrals: {
    name: "get_ib_referrals" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_ib_id"] as const,
    optionalParams: ["p_limit", "p_offset"] as const,
  },
  get_investor_cumulative_yield: {
    name: "get_investor_cumulative_yield" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_investor_id"] as const,
    optionalParams: [] as const,
  },
  get_investor_fee_pct: {
    name: "get_investor_fee_pct" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_effective_date", "p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  get_investor_ib_pct: {
    name: "get_investor_ib_pct" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: ["p_effective_date"] as const,
  },
  get_investor_reports_v2: {
    name: "get_investor_reports_v2" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_period_id"] as const,
    optionalParams: [] as const,
  },
  get_investor_yield_summary: {
    name: "get_investor_yield_summary" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_investor_id"] as const,
    optionalParams: ["p_month", "p_year"] as const,
  },
  get_latest_health_status: {
    name: "get_latest_health_status" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_monthly_platform_aum: {
    name: "get_monthly_platform_aum" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_platform_stats: {
    name: "get_platform_stats" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_position_reconciliation: {
    name: "get_position_reconciliation" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_as_of_date", "p_fund_id"] as const,
  },
  get_reporting_eligible_investors: {
    name: "get_reporting_eligible_investors" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_period_id"] as const,
    optionalParams: [] as const,
  },
  get_schema_dump: {
    name: "get_schema_dump" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_statement_period_summary: {
    name: "get_statement_period_summary" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_period_id"] as const,
    optionalParams: [] as const,
  },
  get_statement_signed_url: {
    name: "get_statement_signed_url" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_storage_path"] as const,
    optionalParams: ["p_expires_in"] as const,
  },
  get_system_mode: {
    name: "get_system_mode" as const,
    returnType: "string",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  get_transaction_aum: {
    name: "get_transaction_aum" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_tx_date"] as const,
    optionalParams: ["p_purpose"] as const,
  },
  get_user_admin_status: {
    name: "get_user_admin_status" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["user_id"] as const,
    optionalParams: [] as const,
  },
  get_void_aum_impact: {
    name: "get_void_aum_impact" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_record_id"] as const,
    optionalParams: [] as const,
  },
  get_void_transaction_impact: {
    name: "get_void_transaction_impact" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_transaction_id"] as const,
    optionalParams: [] as const,
  },
  get_void_yield_impact: {
    name: "get_void_yield_impact" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_distribution_id"] as const,
    optionalParams: [] as const,
  },
  has_role: {
    name: "has_role" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["_role", "_user_id"] as const,
    optionalParams: [] as const,
  },
  has_super_admin_role: {
    name: "has_super_admin_role" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_user_id"] as const,
    optionalParams: [] as const,
  },
  initialize_all_hwm_values: {
    name: "initialize_all_hwm_values" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  initialize_crystallization_dates: {
    name: "initialize_crystallization_dates" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_admin_id", "p_dry_run", "p_fund_id"] as const,
  },
  initialize_fund_aum_from_positions: {
    name: "initialize_fund_aum_from_positions" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: ["p_admin_id", "p_aum_date"] as const,
  },
  initialize_null_crystallization_dates: {
    name: "initialize_null_crystallization_dates" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  insert_yield_transaction: {
    name: "insert_yield_transaction" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [
      "p_admin_id",
      "p_amount",
      "p_fund_code",
      "p_investor_name",
      "p_month",
      "p_tx_date",
    ] as const,
    optionalParams: [] as const,
  },
  internal_route_to_fees: {
    name: "internal_route_to_fees" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [
      "p_admin_id",
      "p_amount",
      "p_effective_date",
      "p_from_investor_id",
      "p_fund_id",
      "p_reason",
    ] as const,
    optionalParams: ["p_transfer_id"] as const,
  },
  is_admin: {
    name: "is_admin" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_user_id"] as const,
    optionalParams: [] as const,
  },
  is_admin_for_jwt: {
    name: "is_admin_for_jwt" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  is_admin_safe: {
    name: "is_admin_safe" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  is_canonical_rpc: {
    name: "is_canonical_rpc" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  is_crystallization_current: {
    name: "is_crystallization_current" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: ["p_target_date"] as const,
  },
  is_import_enabled: {
    name: "is_import_enabled" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  is_period_locked: {
    name: "is_period_locked" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_date", "p_fund_id"] as const,
    optionalParams: [] as const,
  },
  is_super_admin: {
    name: "is_super_admin" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_user_id"] as const,
    optionalParams: [] as const,
  },
  is_within_edit_window: {
    name: "is_within_edit_window" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_created_at"] as const,
    optionalParams: [] as const,
  },
  is_yield_period_closed: {
    name: "is_yield_period_closed" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_month", "p_purpose", "p_year"] as const,
    optionalParams: [] as const,
  },
  log_audit_event: {
    name: "log_audit_event" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_action", "p_entity"] as const,
    optionalParams: ["p_entity_id", "p_meta", "p_new_values", "p_old_values"] as const,
  },
  log_financial_operation: {
    name: "log_financial_operation" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_action", "p_entity", "p_entity_id"] as const,
    optionalParams: ["p_meta", "p_new_values", "p_old_values"] as const,
  },
  log_ledger_mismatches: {
    name: "log_ledger_mismatches" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  log_security_event: {
    name: "log_security_event" as const,
    returnType: "string;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_event_type", "p_severity"] as const,
    optionalParams: ["p_details", "p_user_id"] as const,
  },
  log_withdrawal_action: {
    name: "log_withdrawal_action" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_action", "p_request_id"] as const,
    optionalParams: ["p_meta"] as const,
  },
  mark_delivery_result: {
    name: "mark_delivery_result" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_delivery_id", "p_success"] as const,
    optionalParams: ["p_error_code", "p_error_message", "p_provider_message_id"] as const,
  },
  mark_sent_manually: {
    name: "mark_sent_manually" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_delivery_id"] as const,
    optionalParams: ["p_note"] as const,
  },
  merge_duplicate_profiles: {
    name: "merge_duplicate_profiles" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_keep_id", "p_merge_id"] as const,
    optionalParams: ["p_admin_id"] as const,
  },
  nightly_aum_reconciliation: {
    name: "nightly_aum_reconciliation" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  parse_platform_error: {
    name: "parse_platform_error" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_error_message"] as const,
    optionalParams: [] as const,
  },
  populate_investor_fund_performance: {
    name: "populate_investor_fund_performance" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_investor_id"] as const,
  },
  preview_crystallization: {
    name: "preview_crystallization" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: ["p_new_total_aum", "p_target_date"] as const,
  },
  preview_daily_yield_to_fund_v3: {
    name: "preview_daily_yield_to_fund_v3" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_new_aum", "p_yield_date"] as const,
    optionalParams: ["p_purpose"] as const,
  },
  preview_merge_duplicate_profiles: {
    name: "preview_merge_duplicate_profiles" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_keep_profile_id", "p_merge_profile_id"] as const,
    optionalParams: [] as const,
  },
  preview_segmented_yield_distribution_v5: {
    name: "preview_segmented_yield_distribution_v5" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_period_end", "p_recorded_aum"] as const,
    optionalParams: ["p_purpose"] as const,
  },
  process_yield_distribution: {
    name: "process_yield_distribution" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_date", "p_fund_id", "p_gross_amount"] as const,
    optionalParams: ["p_admin_id"] as const,
  },
  process_yield_distribution_with_dust: {
    name: "process_yield_distribution_with_dust" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_date", "p_fund_id", "p_gross_amount"] as const,
    optionalParams: ["p_admin_id"] as const,
  },
  qa_admin_id: {
    name: "qa_admin_id" as const,
    returnType: "string",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  qa_fees_account_id: {
    name: "qa_fees_account_id" as const,
    returnType: "string",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  qa_fund_id: {
    name: "qa_fund_id" as const,
    returnType: "string",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_asset"] as const,
    optionalParams: [] as const,
  },
  qa_investor_id: {
    name: "qa_investor_id" as const,
    returnType: "string",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_key"] as const,
    optionalParams: [] as const,
  },
  queue_statement_deliveries: {
    name: "queue_statement_deliveries" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_period_id"] as const,
    optionalParams: ["p_channel", "p_fund_id", "p_investor_ids"] as const,
  },
  raise_platform_error: {
    name: "raise_platform_error" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_error_code"] as const,
    optionalParams: ["p_details"] as const,
  },
  rebuild_position_from_ledger: {
    name: "rebuild_position_from_ledger" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_fund_id", "p_investor_id", "p_reason"] as const,
    optionalParams: ["p_dry_run"] as const,
  },
  recalculate_fund_aum_for_date: {
    name: "recalculate_fund_aum_for_date" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_date", "p_fund_id"] as const,
    optionalParams: ["p_actor_id", "p_purpose"] as const,
  },
  recompute_investor_position: {
    name: "recompute_investor_position" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  recompute_investor_positions_for_investor: {
    name: "recompute_investor_positions_for_investor" as const,
    returnType: "undefined;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_investor_id"] as const,
    optionalParams: [] as const,
  },
  reconcile_all_positions: {
    name: "reconcile_all_positions" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_dry_run"] as const,
  },
  reject_withdrawal: {
    name: "reject_withdrawal" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_reason", "p_request_id"] as const,
    optionalParams: ["p_admin_notes"] as const,
  },
  reopen_yield_period: {
    name: "reopen_yield_period" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_month", "p_purpose", "p_reason", "p_year"] as const,
    optionalParams: [] as const,
  },
  repair_all_positions: {
    name: "repair_all_positions" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  requeue_stale_sending: {
    name: "requeue_stale_sending" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_period_id"] as const,
    optionalParams: ["p_minutes"] as const,
  },
  require_admin: {
    name: "require_admin" as const,
    returnType: "undefined",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_operation"] as const,
  },
  require_super_admin: {
    name: "require_super_admin" as const,
    returnType: "string",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_actor_id", "p_operation"] as const,
    optionalParams: [] as const,
  },
  retry_delivery: {
    name: "retry_delivery" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_delivery_id"] as const,
    optionalParams: [] as const,
  },
  route_withdrawal_to_fees: {
    name: "route_withdrawal_to_fees" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_actor_id", "p_request_id"] as const,
    optionalParams: ["p_reason"] as const,
  },
  run_comprehensive_health_check: {
    name: "run_comprehensive_health_check" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  run_daily_health_check: {
    name: "run_daily_health_check" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  run_integrity_check: {
    name: "run_integrity_check" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_scope_fund_id", "p_scope_investor_id"] as const,
  },
  run_integrity_pack: {
    name: "run_integrity_pack" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_scope_fund_id", "p_scope_investor_id"] as const,
  },
  run_invariant_checks: {
    name: "run_invariant_checks" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  set_canonical_rpc: {
    name: "set_canonical_rpc" as const,
    returnType: "undefined",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["enabled"] as const,
  },
  start_processing_withdrawal: {
    name: "start_processing_withdrawal" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_request_id"] as const,
    optionalParams: [
      "p_admin_notes",
      "p_processed_amount",
      "p_settlement_date",
      "p_tx_hash",
    ] as const,
  },
  system_health_check: {
    name: "system_health_check" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  unvoid_transaction: {
    name: "unvoid_transaction" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_reason", "p_transaction_id"] as const,
    optionalParams: [] as const,
  },
  unvoid_transactions_bulk: {
    name: "unvoid_transactions_bulk" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_reason", "p_transaction_ids"] as const,
    optionalParams: [] as const,
  },
  update_admin_role: {
    name: "update_admin_role" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_new_role", "p_target_user_id"] as const,
    optionalParams: [] as const,
  },
  update_dust_tolerance: {
    name: "update_dust_tolerance" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_asset", "p_tolerance"] as const,
    optionalParams: [] as const,
  },
  update_fund_aum_baseline: {
    name: "update_fund_aum_baseline" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_new_baseline"] as const,
    optionalParams: [] as const,
  },
  update_investor_aum_percentages: {
    name: "update_investor_aum_percentages" as const,
    returnType: "number;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: [] as const,
  },
  update_transaction: {
    name: "update_transaction" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_reason", "p_transaction_id", "p_updates"] as const,
    optionalParams: [] as const,
  },
  update_user_profile_secure: {
    name: "update_user_profile_secure" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_user_id"] as const,
    optionalParams: ["p_first_name", "p_last_name", "p_phone", "p_status"] as const,
  },
  update_withdrawal: {
    name: "update_withdrawal" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_withdrawal_id"] as const,
    optionalParams: ["p_notes", "p_reason", "p_requested_amount", "p_withdrawal_type"] as const,
  },
  validate_aum_against_positions: {
    name: "validate_aum_against_positions" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_aum_value", "p_fund_id"] as const,
    optionalParams: ["p_context", "p_max_deviation_pct"] as const,
  },
  validate_aum_against_positions_at_date: {
    name: "validate_aum_against_positions_at_date" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_aum_value", "p_event_date", "p_fund_id"] as const,
    optionalParams: ["p_context", "p_max_deviation_pct"] as const,
  },
  validate_aum_matches_positions: {
    name: "validate_aum_matches_positions" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: ["p_aum_date", "p_purpose", "p_tolerance_pct"] as const,
  },
  validate_aum_matches_positions_strict: {
    name: "validate_aum_matches_positions_strict" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: ["p_aum_date", "p_purpose"] as const,
  },
  validate_pre_yield_aum: {
    name: "validate_pre_yield_aum" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id"] as const,
    optionalParams: ["p_tolerance_percentage"] as const,
  },
  validate_transaction_aum_exists: {
    name: "validate_transaction_aum_exists" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_tx_date"] as const,
    optionalParams: ["p_purpose"] as const,
  },
  validate_withdrawal_transition: {
    name: "validate_withdrawal_transition" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_current_status", "p_new_status"] as const,
    optionalParams: [] as const,
  },
  validate_yield_distribution_prerequisites: {
    name: "validate_yield_distribution_prerequisites" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_gross_yield_pct", "p_yield_date"] as const,
    optionalParams: ["p_admin_id", "p_aum_tolerance_pct", "p_auto_sync", "p_purpose"] as const,
  },
  validate_yield_parameters: {
    name: "validate_yield_parameters" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_gross_yield_pct", "p_purpose", "p_yield_date"] as const,
    optionalParams: [] as const,
  },
  validate_yield_rate_sanity: {
    name: "validate_yield_rate_sanity" as const,
    returnType: "boolean;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_yield_pct"] as const,
    optionalParams: ["p_context", "p_fund_id"] as const,
  },
  validate_yield_temporal_lock: {
    name: "validate_yield_temporal_lock" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_purpose", "p_yield_date"] as const,
    optionalParams: [] as const,
  },
  verify_yield_distribution_balance: {
    name: "verify_yield_distribution_balance" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_date", "p_fund_id"] as const,
    optionalParams: ["p_purpose"] as const,
  },
  void_and_reissue_full_exit: {
    name: "void_and_reissue_full_exit" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: true,
    requiredParams: ["p_transaction_id", "p_new_amount", "p_admin_id", "p_reason"] as const,
    optionalParams: ["p_send_precision"] as const,
  },
  void_and_reissue_transaction: {
    name: "void_and_reissue_transaction" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_new_amount", "p_new_date", "p_original_tx_id"] as const,
    optionalParams: ["p_closing_aum", "p_new_notes", "p_new_tx_hash", "p_reason"] as const,
  },
  void_transaction: {
    name: "void_transaction" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_reason", "p_transaction_id"] as const,
    optionalParams: [] as const,
  },
  void_transactions_bulk: {
    name: "void_transactions_bulk" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_reason", "p_transaction_ids"] as const,
    optionalParams: [] as const,
  },
  void_yield_distribution: {
    name: "void_yield_distribution" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_distribution_id"] as const,
    optionalParams: ["p_reason", "p_void_crystals"] as const,
  },
  unvoid_yield_distribution: {
    name: "unvoid_yield_distribution" as const,
    returnType: "Json;",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_distribution_id", "p_reason"] as const,
    optionalParams: [] as const,
  },
} as const;

// =============================================================================
// TYPE HELPERS
// =============================================================================

/** Get required parameters for an RPC function */
export type RPCRequiredParams<T extends RPCFunctionName> = T extends keyof typeof RPC_SIGNATURES
  ? (typeof RPC_SIGNATURES)[T]["requiredParams"][number]
  : never;

/** Get optional parameters for an RPC function */
export type RPCOptionalParams<T extends RPCFunctionName> = T extends keyof typeof RPC_SIGNATURES
  ? (typeof RPC_SIGNATURES)[T]["optionalParams"][number]
  : never;

/** Validate that an RPC function exists */
export function isValidRPCFunction(name: string): name is RPCFunctionName {
  return (RPC_FUNCTIONS as readonly string[]).includes(name);
}

/** Get signature metadata for an RPC function */
export function getRPCSignature<T extends RPCFunctionName>(name: T) {
  if (!isValidRPCFunction(name)) {
    throw new Error(`Unknown RPC function: ${name}`);
  }
  return RPC_SIGNATURES[name as keyof typeof RPC_SIGNATURES];
}

// =============================================================================
// CANONICAL MUTATION RPCS
// =============================================================================
// These are the ONLY RPCs that should be used for mutations

export const CANONICAL_MUTATION_RPCS = {
  /** V6: All deposits/withdrawals go through the unified transaction RPC */
  DEPOSIT: "apply_investor_transaction",
  /** V6: All deposits/withdrawals go through the unified transaction RPC */
  WITHDRAWAL: "apply_investor_transaction",
  /** V6: Yield distribution */
  YIELD: "apply_segmented_yield_distribution_v5",
  /** V6: Voiding transactions */
  VOID: "void_transaction",
  /** V6: Voiding yield distributions */
  VOID_YIELD: "void_yield_distribution",
} as const;

```

# Section 2: Financial Math Utilities

## `src/utils/financial.ts`

```typescript
/**
 * Financial Utilities with Decimal.js
 *
 * CRITICAL: All financial calculations MUST use Decimal.js
 * JavaScript native numbers use floating-point arithmetic which causes
 * precision errors in financial calculations.
 *
 * Example of the problem:
 * 0.1 + 0.2 = 0.30000000000000004 (JavaScript)
 * 0.1 + 0.2 = 0.3 (Decimal.js)
 *
 * Install: npm install decimal.js
 */

import Decimal from "decimal.js";
import { logWarn } from "@/lib/logger";

// Configure Decimal.js for financial calculations
Decimal.set({
  precision: 20, // 20 significant digits
  rounding: Decimal.ROUND_HALF_UP, // Standard rounding (0.5 rounds up)
  toExpNeg: -7, // Don't use exponential notation for small numbers
  toExpPos: 21, // Don't use exponential notation for large numbers
  minE: -9e15, // Min exponent
  maxE: 9e15, // Max exponent
});

/**
 * Convert any number/string to Decimal
 * Always use this before performing calculations
 */
export function toDecimal(value: string | number | Decimal): Decimal {
  if (value instanceof Decimal) {
    return value;
  }
  return new Decimal(value);
}

/**
 * Format cryptocurrency amount
 * @param value - The amount to format
 * @param decimals - Number of decimal places (default: 8 for crypto)
 * @param symbol - Token symbol (e.g., 'BTC')
 */
export function formatCrypto(
  value: string | number | Decimal,
  decimals: number = 8,
  symbol?: string
): string {
  const decimal = toDecimal(value);
  const formatted = decimal.toFixed(decimals);
  return symbol ? `${formatted} ${symbol}` : formatted;
}

/**
 * Format percentage
 * @param value - The percentage value (e.g., 0.05 for 5%)
 * @param decimals - Number of decimal places (default: 2)
 */
export function formatPercentage(value: string | number | Decimal, decimals: number = 2): string {
  const decimal = toDecimal(value).times(100);
  return `${decimal.toFixed(decimals)}%`;
}

/**
 * Calculate yield/interest
 * Formula: Principal × Rate × (Days / 365)
 *
 * @param principal - Initial investment amount
 * @param rate - Annual interest rate (decimal, e.g., 0.05 for 5%)
 * @param days - Number of days
 */
export function calculateYield(
  principal: string | number | Decimal,
  rate: string | number | Decimal,
  days: number
): Decimal {
  const principalDecimal = toDecimal(principal);
  const rateDecimal = toDecimal(rate);
  const daysPerYear = toDecimal(365);

  // Yield = Principal × Rate × (Days / 365)
  return principalDecimal.times(rateDecimal).times(days).dividedBy(daysPerYear);
}

/**
 * Calculate compound interest
 * Formula: Principal × (1 + Rate/n)^(n×time) - Principal
 *
 * @param principal - Initial investment amount
 * @param rate - Annual interest rate (decimal)
 * @param years - Time period in years
 * @param compoundingFrequency - Times compounded per year (default: 365 for daily)
 */
export function calculateCompoundInterest(
  principal: string | number | Decimal,
  rate: string | number | Decimal,
  years: number,
  compoundingFrequency: number = 365
): Decimal {
  const p = toDecimal(principal);
  const r = toDecimal(rate);
  const n = toDecimal(compoundingFrequency);
  const t = toDecimal(years);

  // A = P(1 + r/n)^(nt)
  const ratePerPeriod = r.dividedBy(n);
  const exponent = n.times(t);
  const base = toDecimal(1).plus(ratePerPeriod);

  const finalAmount = p.times(base.pow(exponent));
  const interest = finalAmount.minus(p);

  return interest;
}

/**
 * Calculate fee amount
 * @param amount - Base amount
 * @param feePercentage - Fee percentage (e.g., 0.25 for 0.25%)
 */
export function calculateFee(
  amount: string | number | Decimal,
  feePercentage: string | number | Decimal
): Decimal {
  const amountDecimal = toDecimal(amount);
  const feeDecimal = toDecimal(feePercentage);

  // Fee = Amount × (FeePercentage / 100)
  return amountDecimal.times(feeDecimal).dividedBy(100);
}

/**
 * Calculate amount after fee deduction
 * @param amount - Gross amount
 * @param feePercentage - Fee percentage
 */
export function calculateNetAmount(
  amount: string | number | Decimal,
  feePercentage: string | number | Decimal
): Decimal {
  const amountDecimal = toDecimal(amount);
  const fee = calculateFee(amountDecimal, feePercentage);
  return amountDecimal.minus(fee);
}

/**
 * Calculate percentage change
 * @param oldValue - Previous value
 * @param newValue - Current value
 */
export function calculatePercentageChange(
  oldValue: string | number | Decimal,
  newValue: string | number | Decimal
): Decimal {
  const old = toDecimal(oldValue);
  const current = toDecimal(newValue);

  if (old.isZero()) {
    return toDecimal(0); // Avoid division by zero
  }

  // Change = ((New - Old) / Old) × 100
  return current.minus(old).dividedBy(old).times(100);
}

/**
 * Calculate profit/loss
 * @param cost - Initial cost
 * @param current - Current value
 */
export function calculateProfitLoss(
  cost: string | number | Decimal,
  current: string | number | Decimal
): {
  amount: Decimal;
  percentage: Decimal;
  isProfit: boolean;
} {
  const costDecimal = toDecimal(cost);
  const currentDecimal = toDecimal(current);

  const amount = currentDecimal.minus(costDecimal);
  const percentage = calculatePercentageChange(costDecimal, currentDecimal);

  return {
    amount,
    percentage,
    isProfit: amount.greaterThanOrEqualTo(0),
  };
}

/**
 * Calculate average (mean)
 * @param values - Array of values
 */
export function calculateAverage(values: Array<string | number | Decimal>): Decimal {
  if (values.length === 0) {
    return toDecimal(0);
  }

  let sum = toDecimal(0);
  for (const value of values) {
    sum = sum.plus(toDecimal(value));
  }

  return sum.dividedBy(values.length);
}

/**
 * Calculate weighted average
 * @param values - Array of {value, weight}
 */
export function calculateWeightedAverage(
  values: Array<{ value: string | number; weight: string | number }>
): Decimal {
  if (values.length === 0) {
    return toDecimal(0);
  }

  let weightedSum = toDecimal(0);
  let totalWeight = toDecimal(0);

  for (const item of values) {
    const value = toDecimal(item.value);
    const weight = toDecimal(item.weight);

    weightedSum = weightedSum.plus(value.times(weight));
    totalWeight = totalWeight.plus(weight);
  }

  if (totalWeight.isZero()) {
    return toDecimal(0);
  }

  return weightedSum.dividedBy(totalWeight);
}

/**
 * Check if value is within range (inclusive)
 * @param value - Value to check
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function isInRange(
  value: string | number | Decimal,
  min: string | number | Decimal,
  max: string | number | Decimal
): boolean {
  const valueDecimal = toDecimal(value);
  const minDecimal = toDecimal(min);
  const maxDecimal = toDecimal(max);

  return (
    valueDecimal.greaterThanOrEqualTo(minDecimal) && valueDecimal.lessThanOrEqualTo(maxDecimal)
  );
}

/**
 * Clamp value within range
 * @param value - Value to clamp
 * @param min - Minimum value
 * @param max - Maximum value
 */
export function clamp(
  value: string | number | Decimal,
  min: string | number | Decimal,
  max: string | number | Decimal
): Decimal {
  const valueDecimal = toDecimal(value);
  const minDecimal = toDecimal(min);
  const maxDecimal = toDecimal(max);

  if (valueDecimal.lessThan(minDecimal)) {
    return minDecimal;
  }
  if (valueDecimal.greaterThan(maxDecimal)) {
    return maxDecimal;
  }
  return valueDecimal;
}

/**
 * Convert to database format (string with 8 decimals)
 * @param value - Value to convert
 */
export function toDbFormat(value: string | number | Decimal): string {
  return toDecimal(value).toFixed(8);
}

/**
 * Parse from database format
 * @param value - Database value (string)
 */
export function fromDbFormat(value: string | null | undefined): Decimal {
  if (!value) {
    return toDecimal(0);
  }
  return toDecimal(value);
}

/**
 * Validate amount is positive
 * @param value - Value to validate
 * @throws Error if value is not positive
 */
export function validatePositiveAmount(
  value: string | number | Decimal,
  fieldName: string = "Amount"
): Decimal {
  const decimal = toDecimal(value);

  if (decimal.lessThanOrEqualTo(0)) {
    throw new Error(`${fieldName} must be positive`);
  }

  return decimal;
}

/**
 * Validate amount is non-negative
 * @param value - Value to validate
 * @throws Error if value is negative
 */
export function validateNonNegativeAmount(
  value: string | number | Decimal,
  fieldName: string = "Amount"
): Decimal {
  const decimal = toDecimal(value);

  if (decimal.lessThan(0)) {
    throw new Error(`${fieldName} cannot be negative`);
  }

  return decimal;
}

/**
 * Validate percentage is between 0 and 100
 * @param value - Percentage value
 * @throws Error if value is out of range
 */
export function validatePercentage(
  value: string | number | Decimal,
  fieldName: string = "Percentage"
): Decimal {
  const decimal = toDecimal(value);

  if (decimal.lessThan(0) || decimal.greaterThan(100)) {
    throw new Error(`${fieldName} must be between 0 and 100`);
  }

  return decimal;
}

// Export Decimal for direct use if needed
export { Decimal };

// ============ String Financial Type Helpers ============
// These helpers support the string-based financial types used in domain types
// to preserve NUMERIC(28,10) precision from the database

/**
 * Type alias for string-based financial values
 * Used to preserve NUMERIC(28,10) precision from PostgreSQL
 */
export type FinancialString = string;

/**
 * Parse any financial value to Decimal for calculations
 * Safely handles null, undefined, string, and number inputs
 */
export function parseFinancial(value: string | number | null | undefined): Decimal {
  if (value === null || value === undefined || value === "") {
    return new Decimal(0);
  }
  try {
    return new Decimal(String(value));
  } catch {
    logWarn("financial.parseFinancial", {
      reason: "Invalid value, defaulting to 0",
      value: String(value),
    });
    return new Decimal(0);
  }
}

/**
 * Convert a calculated value back to string for storage/display
 * Preserves up to 10 decimal places (matching NUMERIC(28,10))
 */
export function toFinancialString(value: Decimal | number | string): FinancialString {
  return new Decimal(String(value)).toFixed(10);
}

/**
 * Sum multiple financial values safely
 * Returns string to preserve precision
 */
export function sumFinancials(values: (string | number | null | undefined)[]): FinancialString {
  return values.reduce((acc, v) => acc.plus(parseFinancial(v)), new Decimal(0)).toFixed(10);
}

/**
 * Compare two financial values
 * Returns: -1 if a < b, 0 if a === b, 1 if a > b
 */
export function compareFinancials(
  a: string | number | null | undefined,
  b: string | number | null | undefined
): -1 | 0 | 1 {
  const decA = parseFinancial(a);
  const decB = parseFinancial(b);
  return decA.comparedTo(decB) as -1 | 0 | 1;
}

/**
 * Check if a financial value is greater than or equal to a threshold
 */
export function isFinancialGte(
  value: string | number | null | undefined,
  threshold: string | number
): boolean {
  return parseFinancial(value).gte(parseFinancial(threshold));
}

/**
 * Check if a financial value is less than a threshold
 */
export function isFinancialLt(
  value: string | number | null | undefined,
  threshold: string | number
): boolean {
  return parseFinancial(value).lt(parseFinancial(threshold));
}

/**
 * Check if a financial value is zero or effectively zero
 */
export function isFinancialZero(value: string | number | null | undefined): boolean {
  return parseFinancial(value).isZero();
}

/**
 * Format a financial string for display (removes trailing zeros)
 * Use this for UI display, not for storage
 */
export function formatFinancialDisplay(
  value: string | number | null | undefined,
  maxDecimals: number = 8
): string {
  const dec = parseFinancial(value);
  // Use toFixed then remove trailing zeros
  const fixed = dec.toFixed(maxDecimals);
  return fixed.replace(/\.?0+$/, "") || "0";
}

/**
 * Token-Only Formatting Guidelines
 * ================================
 *
 * This codebase uses token-denominated accounting. All values are displayed
 * in native token units (BTC, ETH, USDT, etc.), NOT converted to fiat currencies.
 *
 * CORRECT USAGE:
 * - formatCrypto(1.5, 8, 'BTC')  → "1.50000000 BTC"
 * - formatCrypto(100, 2, 'USDT') → "100.00 USDT"
 *
 * All investor-facing code MUST use formatCrypto() or getAssetConfig()
 * to ensure proper token display without fiat conversion.
 */

```

## `src/utils/numeric.ts`

```typescript
/**
 * Numeric Utilities
 * Core utilities for converting between string (database precision) and number (UI calculations)
 * 
 * Domain types use `string` for NUMERIC(28,10) precision preservation from the database.
 * UI components often need `number` for arithmetic, comparisons, and formatting.
 */

/**
 * Convert a string or number to number for UI calculations
 * Safe for use with database NUMERIC fields that come as strings
 * @alias toNum - shorter alias for convenience
 */
export function toNumber(value: string | number | null | undefined): number {
  if (value === null || value === undefined || value === "") return 0;
  if (typeof value === "number") return isNaN(value) ? 0 : value;
  const parsed = parseFloat(value);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Shorter alias for toNumber
 */
export const toNum = toNumber;

/**
 * Convert a value to string for database storage
 * Preserves precision for NUMERIC fields
 */
export function toNumericString(value: string | number | null | undefined): string {
  if (value === null || value === undefined || value === "") return "0";
  return String(value);
}

/**
 * Check if a numeric value (string or number) is greater than a threshold
 */
export function isGreaterThan(value: string | number | null | undefined, threshold: number): boolean {
  return toNumber(value) > threshold;
}

/**
 * Check if a numeric value (string or number) is greater than or equal to a threshold
 */
export function isGreaterThanOrEqual(value: string | number | null | undefined, threshold: number): boolean {
  return toNumber(value) >= threshold;
}

/**
 * Check if a numeric value (string or number) is less than a threshold
 */
export function isLessThan(value: string | number | null | undefined, threshold: number): boolean {
  return toNumber(value) < threshold;
}

/**
 * Check if a numeric value (string or number) is less than or equal to a threshold
 */
export function isLessThanOrEqual(value: string | number | null | undefined, threshold: number): boolean {
  return toNumber(value) <= threshold;
}

/**
 * Format a numeric value for display with locale formatting
 */
export function formatNumericValue(
  value: string | number | null | undefined,
  options: Intl.NumberFormatOptions = {}
): string {
  const num = toNumber(value);
  return new Intl.NumberFormat("en-US", {
    minimumFractionDigits: options.minimumFractionDigits ?? 2,
    maximumFractionDigits: options.maximumFractionDigits ?? 6,
    ...options,
  }).format(num);
}

/**
 * Get the sign prefix for a numeric value
 */
export function getSignPrefix(value: string | number | null | undefined): string {
  const num = toNumber(value);
  return num > 0 ? "+" : num < 0 ? "" : "";
}

/**
 * Calculate percentage: (value / base) * 100
 * Returns 0 if base is 0 to avoid division by zero
 */
export function calculatePercentage(value: string | number, base: string | number): number {
  const numBase = toNumber(base);
  if (numBase === 0) return 0;
  return (toNumber(value) / numBase) * 100;
}

/**
 * Subtract two numeric values: a - b
 */
export function subtract(a: string | number, b: string | number): number {
  return toNumber(a) - toNumber(b);
}

/**
 * Add two numeric values: a + b
 */
export function add(a: string | number, b: string | number): number {
  return toNumber(a) + toNumber(b);
}

/**
 * Multiply two numeric values: a * b
 */
export function multiply(a: string | number, b: string | number): number {
  return toNumber(a) * toNumber(b);
}

/**
 * Divide two numeric values: a / b
 * Returns 0 if b is 0
 */
export function divide(a: string | number, b: string | number): number {
  const numB = toNumber(b);
  if (numB === 0) return 0;
  return toNumber(a) / numB;
}

```

## `src/utils/yieldMath.ts`

```typescript
import { Decimal, sumFinancials, parseFinancial, toFinancialString } from "./financial";

/**
 * Validates and reconciles yield distribution math.
 * Rule: Gross Yield = Net Yield + IB Fees + INDIGO Fees
 */
export function reconcileYieldMath(params: {
  netYield: string | number;
  ibFees: string | number;
  indigoFees: string | number;
}): { grossYield: string; isValid: boolean } {
  const net = parseFinancial(params.netYield);
  const ib = parseFinancial(params.ibFees);
  const indigo = parseFinancial(params.indigoFees);

  const calculatedGross = net.plus(ib).plus(indigo);

  return {
    grossYield: toFinancialString(calculatedGross),
    isValid: true, // In the UI, we usually force the sum to match
  };
}

/**
 * Calculates Ending Balance for a ledger row or position.
 * Rule: Ending Balance = Previous Balance + Amount
 * Note: Historically, the ledger is a running log, so "Ending Balance" at any row
 * is the sum of all transactions for that fund up to that point.
 */
export function calculateEndingBalance(
  previousBalance: string | number,
  transactionAmount: string | number
): string {
  return toFinancialString(parseFinancial(previousBalance).plus(parseFinancial(transactionAmount)));
}

```

## `src/utils/statementCalculations.ts`

```typescript
import { profileService } from "@/services/shared";
import { fundService } from "@/services/admin";
import { transactionsV2Service } from "@/services/investor";
import { StatementTransaction } from "@/types/domains/transaction";
import { getMonthEndDate } from "@/utils/dateUtils";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";
import Decimal from "decimal.js";
import { supabase } from "@/integrations/supabase/client";

// Re-export StatementTransaction as the canonical type for statement views
export type { StatementTransaction } from "@/types/domains/transaction";

export interface StatementData {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  period_year: number;
  period_month: number;
  period_start: Date;
  period_end: Date;
  assets: AssetStatement[];
  summary: {
    begin_balance: number;
    additions: number;
    redemptions: number;
    net_income: number;
    fees: number;
    end_balance: number;
    rate_of_return_mtd: number;
    rate_of_return_qtd: number;
    rate_of_return_ytd: number;
    rate_of_return_itd: number;
  };
}

export interface AssetStatement {
  asset_id: number | string;
  asset_code: string;
  asset_name: string;
  begin_balance: number;
  deposits: number;
  withdrawals: number;
  interest: number;
  fees: number;
  end_balance: number;
  transactions: StatementTransaction[];
}

/**
 * Calculate Rate of Return using the correct formula:
 * net_income = ending_balance - beginning_balance - additions + redemptions
 * rate_of_return = net_income / beginning_balance (or 0 if beginning_balance is 0)
 *
 * This properly accounts for mid-month additions/withdrawals
 */
export function calculateRateOfReturn(
  beginningBalance: number,
  endingBalance: number,
  additions: number,
  redemptions: number
): { netIncome: number; rateOfReturn: number } {
  // CORRECT formula per December 20 requirements:
  // net_income = ending_balance - beginning_balance - additions + redemptions
  const netIncome = endingBalance - beginningBalance - additions + redemptions;

  // If beginning balance is 0, return 0% to avoid NaN/Infinity
  if (beginningBalance <= 0) {
    return { netIncome, rateOfReturn: 0 };
  }

  const rateOfReturn = (netIncome / beginningBalance) * 100;

  return { netIncome, rateOfReturn };
}

/**
 * Get reporting cutoff timestamps per asset for a given period.
 * Returns a map of asset_code -> created_at timestamp from the yield_distribution
 * that was used for reporting. Deposits/withdrawals created AFTER this timestamp
 * should be excluded from that period's report.
 */
async function getReportingCutoffs(
  periodYear: number,
  periodMonth: number
): Promise<Map<string, string>> {
  const cutoffMap = new Map<string, string>();

  // Use .match() to avoid deep type instantiation from chained .eq() calls
  const { data: distributions } = await supabase
    .from("yield_distributions")
    .select("id, created_at, fund_id")
    .match({ is_voided: false, period_year: periodYear, period_month: periodMonth });

  if (distributions && distributions.length > 0) {
    const fundIds = [...new Set(distributions.map((d: any) => d.fund_id))];

    const { data: fundsData } = await supabase
      .from("funds")
      .select("id, asset")
      .in("id", fundIds as string[]);

    const fundAssetMap = new Map(
      (fundsData ?? []).map((f: any) => [f.id, f.asset] as [string, string])
    );

    for (const dist of distributions) {
      const asset = fundAssetMap.get((dist as any).fund_id);
      if (asset && dist.created_at) {
        cutoffMap.set(asset, dist.created_at);
      }
    }
  }

  return cutoffMap;
}

/**
 * Deduplicate yield-related transactions by distribution_id.
 * When both 'transaction' and 'reporting' purpose records exist for the same
 * distribution_id, keep only the 'reporting' one (used for investor statements).
 * Non-yield transactions and yields without a distribution_id pass through unchanged.
 */
function deduplicateYieldTransactions(
  transactions: import("@/features/investor/transactions/services/transactionsV2Service").TransactionRecord[],
  yieldTypes: Set<string>
): import("@/features/investor/transactions/services/transactionsV2Service").TransactionRecord[] {
  // Group yield transactions by distribution_id
  const byDistId = new Map<string, typeof transactions>();
  const result: typeof transactions = [];

  for (const tx of transactions) {
    if (!yieldTypes.has(tx.type) || !tx.distribution_id) {
      result.push(tx);
      continue;
    }
    const group = byDistId.get(tx.distribution_id) || [];
    group.push(tx);
    byDistId.set(tx.distribution_id, group);
  }

  // For each distribution_id group, prefer 'reporting' over 'transaction'
  for (const [, group] of byDistId) {
    const hasReporting = group.some((tx) => tx.purpose === "reporting");
    if (hasReporting) {
      // Keep only reporting-purpose transactions from this group
      for (const tx of group) {
        if (tx.purpose === "reporting") {
          result.push(tx);
        }
      }
    } else {
      // No reporting records — keep all (fallback)
      for (const tx of group) {
        result.push(tx);
      }
    }
  }

  // Re-sort by tx_date ascending (groups may have been appended out of order)
  result.sort((a, b) => a.tx_date.localeCompare(b.tx_date));
  return result;
}

export async function computeStatement(
  investor_id: string,
  period_year: number,
  period_month: number
): Promise<StatementData | null> {
  try {
    // Get investor profile using profileService
    const investor = await profileService.getProfileById(investor_id);

    if (!investor) {
      logError("statementCalculations.computeStatement", new Error("Investor profile not found"), {
        investor_id,
      });
      return null;
    }

    const investorName =
      `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || investor.email;

    // Calculate period dates
    const period_start = new Date(period_year, period_month - 1, 1);
    const period_end = new Date(period_year, period_month, 0, 23, 59, 59);
    const period_end_str = getMonthEndDate(period_year, period_month);

    // Fetch transactions and reporting cutoffs in parallel
    const [transactions, reportingCutoffs] = await Promise.all([
      transactionsV2Service.getByInvestorId(investor_id, {
        endDate: period_end_str,
      }),
      getReportingCutoffs(period_year, period_month),
    ]);

    // Reverse to get ascending order (service returns descending by default)
    transactions.reverse();

    // Deduplicate yield-related transactions by distribution_id.
    // When both 'transaction' and 'reporting' purpose yields exist for the same
    // distribution_id, keep only the 'reporting' one (used for statements).
    const YIELD_TYPES = new Set(["YIELD", "FEE_CREDIT", "IB_CREDIT"]);
    const deduped = deduplicateYieldTransactions(transactions, YIELD_TYPES);

    // Fetch funds information for asset mapping
    const funds = await fundService.getAllFunds();

    const fundMap = new Map(funds?.map((f) => [f.asset, f]));

    const assetsMap: Record<string, AssetStatement> = {};
    const summary = {
      begin_balance: 0,
      additions: 0,
      redemptions: 0,
      net_income: 0,
      fees: 0,
      end_balance: 0,
      rate_of_return_mtd: 0,
      rate_of_return_qtd: 0,
      rate_of_return_ytd: 0,
      rate_of_return_itd: 0,
    };

    // Decimal accumulators per asset -- avoids .toNumber() round-trips mid-pipeline
    const decAccum: Record<string, { begin: Decimal; deposits: Decimal; withdrawals: Decimal; interest: Decimal; fees: Decimal }> = {};

    // Process transactions (using deduplicated list)
    deduped.forEach((transaction) => {
      const assetCode = transaction.asset;

      // Skip post-reporting deposits/withdrawals:
      // If a reporting yield distribution exists for this asset+period,
      // exclude deposits/withdrawals created after the distribution's created_at
      const cutoff = reportingCutoffs.get(assetCode);
      if (
        cutoff &&
        (transaction.type === "DEPOSIT" || transaction.type === "WITHDRAWAL") &&
        (transaction as any).created_at > cutoff
      ) {
        return; // Skip this transaction — it was made after reporting
      }

      if (!assetsMap[assetCode]) {
        const fund = fundMap.get(assetCode) as any;
        assetsMap[assetCode] = {
          asset_id: fund ? fund.id : 0,
          asset_code: assetCode,
          asset_name: fund ? fund.name : assetCode,
          begin_balance: 0,
          deposits: 0,
          withdrawals: 0,
          interest: 0,
          fees: 0,
          end_balance: 0,
          transactions: [],
        };
      }

      const assetStat = assetsMap[assetCode];
      const txDate = new Date(transaction.tx_date);
      const amount = parseFinancial(transaction.amount);

      // Use Decimal accumulators to avoid .toNumber() mid-pipeline precision loss
      if (!decAccum[assetCode]) {
        decAccum[assetCode] = {
          begin: parseFinancial(0),
          deposits: parseFinancial(0),
          withdrawals: parseFinancial(0),
          interest: parseFinancial(0),
          fees: parseFinancial(0),
        };
      }
      const acc = decAccum[assetCode];

      // Identify if transaction is before this period (Beginning Balance)
      if (txDate < period_start) {
        if (transaction.type === "WITHDRAWAL" || transaction.type === "FEE") {
          acc.begin = acc.begin.minus(amount);
        } else {
          acc.begin = acc.begin.plus(amount);
        }
      } else {
        // Transaction is within this period
        let type: StatementTransaction["type"] = "deposit";
        if (transaction.type === "DEPOSIT") {
          acc.deposits = acc.deposits.plus(amount);
          type = "deposit";
        } else if (transaction.type === "WITHDRAWAL") {
          acc.withdrawals = acc.withdrawals.plus(amount);
          type = "withdrawal";
        } else if (
          transaction.type === "INTEREST" ||
          transaction.type === "YIELD" ||
          transaction.type === "FEE_CREDIT" ||
          transaction.type === "IB_CREDIT"
        ) {
          acc.interest = acc.interest.plus(amount);
          type = "interest";
        } else if (transaction.type === "FEE") {
          acc.fees = acc.fees.plus(amount);
          type = "fee";
        } else if (transaction.type === "ADJUSTMENT") {
          if (amount.gte(0)) {
            acc.deposits = acc.deposits.plus(amount);
          } else {
            acc.withdrawals = acc.withdrawals.plus(amount.abs());
          }
          type = "adjustment";
        }

        assetStat.transactions.push({
          id: transaction.id,
          date: transaction.tx_date,
          type,
          amount: amount.toFixed(10),
          description: transaction.notes || transaction.type,
        });
      }
    });

    // Flush Decimal accumulators to AssetStatement numbers (single conversion point)
    for (const [code, acc] of Object.entries(decAccum)) {
      const asset = assetsMap[code];
      if (!asset) continue;
      asset.begin_balance = acc.begin.toNumber();
      asset.deposits = acc.deposits.toNumber();
      asset.withdrawals = acc.withdrawals.toNumber();
      asset.interest = acc.interest.toNumber();
      asset.fees = acc.fees.toNumber();
      asset.end_balance = acc.begin
        .plus(acc.deposits)
        .minus(acc.withdrawals)
        .plus(acc.interest)
        .minus(acc.fees)
        .toNumber();
    }

    // Calculate summary from all assets using Decimal accumulators
    const assetKeys = Object.keys(assetsMap);
    if (assetKeys.length >= 1) {
      let totalBeginBalance = parseFinancial(0);
      let totalAdditions = parseFinancial(0);
      let totalRedemptions = parseFinancial(0);
      let totalFees = parseFinancial(0);
      let totalEndBalance = parseFinancial(0);

      for (const acc of Object.values(decAccum)) {
        totalBeginBalance = totalBeginBalance.plus(acc.begin);
        totalAdditions = totalAdditions.plus(acc.deposits);
        totalRedemptions = totalRedemptions.plus(acc.withdrawals);
        totalFees = totalFees.plus(acc.fees);
        totalEndBalance = totalEndBalance.plus(
          acc.begin.plus(acc.deposits).minus(acc.withdrawals).plus(acc.interest).minus(acc.fees)
        );
      }

      summary.begin_balance = totalBeginBalance.toNumber();
      summary.additions = totalAdditions.toNumber();
      summary.redemptions = totalRedemptions.toNumber();
      summary.fees = totalFees.toNumber();
      summary.end_balance = totalEndBalance.toNumber();

      // Calculate RoR using the CORRECT formula
      const { netIncome, rateOfReturn } = calculateRateOfReturn(
        totalBeginBalance.toNumber(),
        totalEndBalance.toNumber(),
        totalAdditions.toNumber(),
        totalRedemptions.toNumber()
      );

      summary.net_income = netIncome;
      summary.rate_of_return_mtd = rateOfReturn;
    }

    return {
      investor_id,
      investor_name: investorName,
      investor_email: investor.email,
      period_year,
      period_month,
      period_start,
      period_end,
      assets: Object.values(assetsMap),
      summary,
    };
  } catch (error) {
    logError("statementCalculations.computeStatement", error);
    return null;
  }
}

/**
 * Format amount in native tokens (not fiat currency)
 * @param amount - The token amount
 * @param asset - The asset symbol (BTC, ETH, USDT, SOL, XRP)
 * @param decimals - Number of decimal places (auto-determined by asset if not specified)
 */
export function formatTokenAmount(amount: number, asset?: string, decimals?: number): string {
  const assetDecimals = decimals ?? (asset === "BTC" ? 8 : asset === "ETH" ? 6 : 2);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: assetDecimals,
  }).format(amount);
  return asset ? `${formatted} ${asset}` : formatted;
}

export function formatPercent(value: number, decimals: number = 2): string {
  // Handle NaN/Infinity cases
  if (!Number.isFinite(value)) {
    return "0.00%";
  }
  return `${value.toFixed(decimals)}%`;
}

```

# Section 3: Yield Services

## `src/services/admin/yields/index.ts`

```typescript
/**
 * Yield Services - Sub-barrel
 * All yield-related admin services consolidated here
 */

// Distribution facade (re-exports from sub-services)
export * from "./yieldDistributionService";

// Crystallization
export {
  finalizeMonthYield,
  getYieldEventsForFund,
  getYieldEventsForInvestor,
  getAggregatedYieldForPeriod,
  getPendingYieldEventsCount,
  getInvestorCrystallizationEvents,
  type CrystallizationResult,
  type InvestorCrystallizationEvent,
  type FinalizationResult,
  type YieldEvent,
} from "./yieldCrystallizationService";

// Management (void, edit, details)
export {
  voidYieldRecord,
  voidYieldDistribution,
  updateYieldAum,
  getYieldDetails,
  canVoidYieldRecord,
  canEditYieldRecord,
  getYieldVoidImpact,
  type VoidYieldResult,
  type UpdateYieldResult,
  type VoidAumImpactResult,
  type YieldDetails,
} from "./yieldManagementService";

// Distributions page data
export {
  fetchYieldDistributionsPageData,
  type YieldDistributionsFilters,
  type DistributionRow,
  type AllocationRow,
  type FeeAllocationRow,
  type YieldEventRow,
  type InvestorProfile,
  type YieldDistributionsPageData,
} from "./yieldDistributionsPageService";

// AUM Consistency & Reconciliation
export {
  yieldAumService,
  type AumPurpose,
  type AumAsOfResult,
  type AumReconciliationResult,
} from "./yieldAumService";

```

## `src/services/admin/yields/yieldDistributionService.ts`

```typescript
/**
 * Yield Distribution Service
 *
 * REFACTORED: This file now re-exports from focused sub-services:
 * - yieldPreviewService.ts - Preview calculations
 * - yieldApplyService.ts - Apply distributions
 * - yieldHistoryService.ts - AUM history and fund data
 * - yieldReportsService.ts - Performance reports
 *
 * Import from this file for backwards compatibility.
 * For new code, import directly from the specific service.
 */

// Re-export types from canonical source
export type {
  YieldCalculationInput,
  YieldDistribution,
  IBCredit,
  YieldTotals,
  YieldCalculationResult,
  FundDailyAUM,
  YieldSnapshotInfo,
  YieldPurpose,
  YieldStatus,
} from "@/types/domains/yield";

// Preview service
export { previewYieldDistribution } from "./yieldPreviewService";

// Apply service
export { applyYieldDistribution } from "./yieldApplyService";

// History service
export {
  getFundAUMHistory,
  getLatestFundAUM,
  getCurrentFundAUM,
  saveDraftAUMEntry,
  getActiveFundsWithAUM,
  getFundInvestorCompositionWithYield,
  getStatementPeriodId,
  getInvestorPositionsWithFunds,
  checkExistingDistribution,
} from "./yieldHistoryService";

// Reports service
export {
  getInvestorPerformanceForPeriod,
  getInvestorFeeSchedule,
  getInvestorMonthlyReports,
  createMonthlyReportTemplate,
  updateMonthlyReportField,
} from "./yieldReportsService";

```

## `src/services/admin/yields/yieldApplyService.ts`

```typescript
/**
 * Yield Apply Service
 * Handles applying yield distributions using V5 segmented proportional allocation.
 *
 * CALCULATION METHOD: Segmented Proportional (V5)
 * - Each investor's allocation is proportional to their balance within each segment
 * - Crystallization events define segment boundaries (mid-period flows)
 * - Per-segment fee lookup via get_investor_fee_pct hierarchy
 * - IB commissions tracked in running balances between segments
 * - AUM-only input: gross yield derived from recorded_aum - opening positions
 */

import { supabase } from "@/integrations/supabase/client";
import { yieldNotifications } from "@/services/notifications";
import { finalizeMonthYield } from "./yieldCrystallizationService";
import { logWarn, logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";

import type {
  YieldCalculationInput,
  YieldDistribution,
  YieldTotals,
  YieldCalculationResult,
} from "@/types/domains/yield";

/**
 * Apply yield distribution using V5 segmented proportional allocation.
 * This permanently updates investor positions and creates transactions.
 *
 * The V5 method:
 * - Reads crystallization events to split the month into segments
 * - Allocates yield proportionally by balance within each segment
 * - Creates one aggregated YIELD tx per investor covering the full month
 * - Running balances track NET yield, fees, IB between segments
 */
export async function applyYieldDistribution(
  input: YieldCalculationInput,
  adminId: string,
  purpose: "reporting" | "transaction" = "transaction"
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM, distributionDate } = input;

  const periodEndDate = targetDate;
  const parsedAum = newTotalAUM != null ? parseFinancial(newTotalAUM) : null;
  if (!parsedAum || parsedAum.isNaN() || parsedAum.lte(0)) {
    throw new Error("Recorded AUM must be a positive number.");
  }

  // Call V5 apply RPC (segmented proportional allocation)
  // Use .toString() for financial precision - PostgreSQL NUMERIC handles string input correctly
  const effectiveDistDate = distributionDate ?? targetDate;
  const { data, error } = await callRPC("apply_segmented_yield_distribution_v5", {
    p_fund_id: fundId,
    p_period_end: formatDateForDB(periodEndDate),
    p_recorded_aum: parsedAum.toString() as unknown as number,
    p_admin_id: adminId,
    p_purpose: purpose,
    p_distribution_date: formatDateForDB(effectiveDistDate),
  });

  if (error) {
    logError("applyYieldDistribution.v5", error, {
      fundId,
      periodEnd: formatDateForDB(periodEndDate),
      purpose,
    });
    throw new Error(`Failed to apply yield: ${error.message}`);
  }

  // The RPC returns a JSONB object with all distribution details
  const rpcResult = data as unknown as Record<string, unknown>;
  if (!rpcResult || !rpcResult.distribution_id) {
    throw new Error("Apply failed: no distribution data returned");
  }

  const distributionId = rpcResult.distribution_id as string;

  // Map RPC response to a distData-compatible shape used throughout this function
  const distData = {
    opening_aum: String(rpcResult.opening_aum ?? 0),
    recorded_aum: String(rpcResult.recorded_aum ?? 0),
    gross_yield: String(rpcResult.gross_yield ?? 0),
    net_yield: String(rpcResult.net_yield ?? 0),
    total_fees: String(rpcResult.total_fees ?? 0),
    total_ib: String(rpcResult.total_ib ?? 0),
    total_fee_credit: "0",
    total_ib_credit: "0",
    investor_count: Number(rpcResult.allocation_count ?? 0),
    period_start: rpcResult.period_start as string,
    period_end: rpcResult.period_end as string,
    dust_amount: String(rpcResult.dust_amount ?? 0),
  };

  // Finalize yield visibility
  try {
    await finalizeMonthYield(fundId, targetDate.getFullYear(), targetDate.getMonth() + 1, adminId);
  } catch (finalizationError) {
    logWarn("applyYieldDistribution.finalization", { fundId, error: finalizationError });
  }

  // Send yield notifications to affected investors (non-blocking)
  const { data: fundInfo } = await supabase
    .from("funds")
    .select("name, asset, code")
    .eq("id", fundId)
    .maybeSingle();

  const { data: affectedInvestors } = await supabase
    .from("transactions_v2")
    .select("investor_id, amount")
    .eq("fund_id", fundId)
    .eq("tx_date", formatDateForDB(periodEndDate))
    .in("type", ["YIELD", "FEE_CREDIT", "IB_CREDIT"])
    .eq("is_voided", false);

  if (affectedInvestors?.length && fundInfo) {
    const openingAumDec = parseFinancial(distData.opening_aum);
    const grossYieldDec = parseFinancial(distData.gross_yield);
    const notificationDistributions = affectedInvestors.map((inv) => ({
      userId: inv.investor_id,
      distributionId: `yield:${fundId}:${formatDateForDB(periodEndDate)}:${inv.investor_id}`,
      fundId,
      fundName: fundInfo.name,
      amount: parseFinancial(inv.amount).toNumber(),
      asset: fundInfo.asset,
      yieldDate: formatDateForDB(periodEndDate),
      yieldPercentage: openingAumDec.gt(0)
        ? grossYieldDec.div(openingAumDec).times(100).toNumber()
        : undefined,
    }));

    yieldNotifications
      .onFundYieldDistributed(notificationDistributions)
      .catch((err) => logError("sendYieldNotifications", err, { fundId }));

    // Fire mobile push notifications (best-effort, non-blocking)
    const investorIds = [...new Set(affectedInvestors.map((i) => i.investor_id))];
    const openingAum = parseFinancial(distData.opening_aum);
    const grossYield = parseFinancial(distData.gross_yield);
    const yieldPct = openingAum.gt(0)
      ? `${grossYield.div(openingAum).times(100).toDecimalPlaces(2)}%`
      : undefined;
    const monthLabel = targetDate.toLocaleString("en-GB", { month: "long", year: "numeric" });

    supabase.functions
      .invoke("notify-yield-applied", {
        body: { investor_ids: investorIds, period_label: monthLabel, yield_pct: yieldPct },
      })
      .catch((err) => logError("notify-yield-applied.invoke", err, { fundId }));
  }

  const yieldDistributions: YieldDistribution[] = [];
  const totals: YieldTotals = {
    gross: String(distData.gross_yield ?? 0),
    fees: String(distData.total_fees ?? 0),
    ibFees: String(distData.total_ib ?? 0),
    net: String(distData.net_yield ?? 0),
    indigoCredit: String(distData.total_fees ?? 0),
  };

  return {
    success: true,
    fundId,
    fundCode: fundInfo?.code || "",
    fundAsset: fundInfo?.asset || "",
    yieldDate: targetDate,
    purpose,
    currentAUM: String(distData.opening_aum || 0),
    newAUM: String(distData.recorded_aum || parsedAum.toString()),
    grossYield: totals.gross,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage: "0",
    investorCount: Number(distData.investor_count ?? 0),
    distributions: yieldDistributions,
    ibCredits: [],
    indigoFeesCredit: totals.indigoCredit,
    existingConflicts: [],
    hasConflicts: false,
    totals,
    status: "applied",
    // V5 segmented fields
    periodStart: distData.period_start,
    periodEnd: distData.period_end,
    daysInPeriod: 0,
    dustAmount: String(distData.dust_amount ?? 0),
    calculationMethod: "segmented_v5",
    features: ["segmented_proportional"],
    conservationCheck: Boolean(rpcResult.conservation_check ?? true),
    segmentCount: undefined,
    openingAum: String(distData.opening_aum || 0),
    recordedAum: String(distData.recorded_aum || 0),
    crystalsInPeriod: 0,
  };
}

```

## `src/services/admin/yields/yieldPreviewService.ts`

```typescript
/**
 * Yield Preview Service
 * Handles yield distribution preview using V5 segmented proportional allocation.
 *
 * CALCULATION METHOD: Segmented Proportional (V5)
 * - Each investor's allocation is proportional to their balance within each segment
 * - Crystallization events define segment boundaries (mid-period flows)
 * - Per-segment fee lookup via get_investor_fee_pct hierarchy
 * - IB commissions tracked in running balances between segments
 * - AUM-only input: gross yield derived from recorded_aum - opening positions
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";

import type {
  YieldCalculationInput,
  YieldDistribution,
  IBCredit,
  YieldTotals,
  YieldCalculationResult,
  V5YieldRPCResult,
  V5AllocationItem,
} from "@/types/domains/yield";

// UUID validation regex
const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isValidUUID(value: string): boolean {
  return UUID_REGEX.test(value);
}

/**
 * Preview yield distribution using V6 Unified Flat Math.
 * This is a read-only operation that returns computed distributions.
 */
export async function previewYieldDistribution(
  input: YieldCalculationInput
): Promise<YieldCalculationResult> {
  const { fundId, targetDate, newTotalAUM, purpose = "reporting" } = input;

  // Validate fundId is a valid UUID
  if (!fundId || !isValidUUID(fundId)) {
    throw new Error(`Invalid fund ID format: "${fundId}". Expected a valid UUID.`);
  }

  const periodEndDate = targetDate;
  const parsedAum = newTotalAUM != null ? parseFinancial(newTotalAUM) : null;
  if (!parsedAum || parsedAum.isNaN() || parsedAum.lte(0)) {
    throw new Error("Recorded AUM must be a positive number.");
  }

  // Get fund info
  const fundResult = await supabase
    .from("funds")
    .select("code, asset, name")
    .eq("id", fundId)
    .maybeSingle();
  const fund = fundResult.data;

  // Call V5 preview RPC (now serving V6 unified flat math beneath the hood)
  // Use .toString() for financial precision - PostgreSQL NUMERIC handles string input correctly
  const { data, error } = await callRPC("preview_segmented_yield_distribution_v5", {
    p_fund_id: fundId,
    p_period_end: formatDateForDB(periodEndDate),
    p_recorded_aum: parsedAum.toString() as unknown as number,
    p_purpose: purpose,
  });

  if (error) {
    logError("yieldPreview.v5", error, {
      fundId,
      periodEnd: formatDateForDB(periodEndDate),
    });
    throw new Error(`Failed to preview yield: ${error.message}`);
  }

  const result = data as unknown as V5YieldRPCResult;

  if (!result || !result.success) {
    throw new Error(result?.error || "Preview failed: Invalid response from server");
  }

  // The production database might be running an older version of the V5 RPC which doesn't
  // return the investor balances in its JSON payload. We fetch them here to guarantee the UI works.
  const { data: positions } = await supabase
    .from("investor_positions")
    .select("investor_id, current_value")
    .eq("fund_id", fundId)
    .eq("is_active", true);

  const balanceMap = new Map<string, number>();
  if (positions) {
    positions.forEach((p) => {
      balanceMap.set(p.investor_id, parseFinancial(p.current_value).toNumber());
    });
  }

  // Build IB parent name lookup from allocations
  const ibParentNameMap = new Map<string, string>();
  for (const d of (result.allocations || []) as V5AllocationItem[]) {
    if (d.investor_id && d.investor_name) {
      ibParentNameMap.set(d.investor_id, d.investor_name);
    }
  }

  // Map distributions from V5 backend format
  const totalOpeningAum = parseFinancial(result.opening_aum || 0).toNumber();

  const distributions: YieldDistribution[] = (result.allocations || []).map(
    (d: V5AllocationItem) => {
      const liveBalance = balanceMap.get(d.investor_id) || 0;
      const ibParentName = d.ib_parent_id ? ibParentNameMap.get(d.ib_parent_id) || null : null;
      const investorBalance = parseFinancial((d as any).current_value || d.opening_balance || liveBalance).toNumber();
      const allocationPercentage =
        totalOpeningAum > 0
          ? parseFinancial(investorBalance)
              .div(parseFinancial(totalOpeningAum))
              .times(100)
              .toFixed(4)
          : "0";
      return {
        investorId: d.investor_id,
        investorName: d.investor_name,
        accountType: d.account_type,
        currentBalance: String((d as any).current_value || d.opening_balance || liveBalance),
        allocationPercentage,
        feePercentage: String(d.fee_pct || 0),
        grossYield: String(d.gross || 0),
        feeAmount: String(d.fee || 0),
        netYield: String(d.net || 0),
        newBalance: "0",
        positionDelta: String(d.net || 0),
        ibParentId: d.ib_parent_id,
        ibParentName: ibParentName ?? undefined,
        ibPercentage: String(d.ib_rate || 0),
        ibAmount: String(d.ib || 0),
        referenceId: "",
        wouldSkip: false,
        hasIb: Boolean(d.ib_parent_id && parseFinancial(d.ib_rate || 0).gt(0)),
        openingBalance: String((d as any).current_value || d.opening_balance || liveBalance),
        // Month-to-date aggregates
        mtdGross: d.mtd_gross !== undefined ? String(d.mtd_gross) : undefined,
        mtdFee: d.mtd_fee !== undefined ? String(d.mtd_fee) : undefined,
        mtdIb: d.mtd_ib !== undefined ? String(d.mtd_ib) : undefined,
        mtdNet: d.mtd_net !== undefined ? String(d.mtd_net) : undefined,
      };
    }
  );

  const ibCredits: IBCredit[] = [];

  // Compute true gross yield from AUM delta (recordedAum - openingAum)
  // This avoids showing the sum-of-allocations which excludes dust rounding
  const trueGrossYield = parseFinancial(result.recorded_aum || 0)
    .minus(parseFinancial(result.opening_aum || 0))
    .toString();

  const totals: YieldTotals = {
    gross: trueGrossYield,
    fees: String(result.total_fees || 0),
    ibFees: String(result.total_ib || 0),
    net: String(result.net_yield || 0),
    indigoCredit: String(result.total_fees || 0),
  };

  return {
    success: true,
    preview: true,
    fundId: result.fund_id || fundId,
    fundCode: result.fund_code || fund?.code || "",
    fundAsset: result.fund_asset || fund?.asset || "",
    yieldDate: targetDate,
    effectiveDate: formatDateForDB(periodEndDate),
    purpose,
    isMonthEnd: false,
    currentAUM: String(result.opening_aum || 0),
    newAUM: String(result.recorded_aum || parsedAum.toString()),
    grossYield: totals.gross,
    netYield: totals.net,
    totalFees: totals.fees,
    totalIbFees: totals.ibFees,
    yieldPercentage:
      result.opening_aum && parseFinancial(result.opening_aum).gt(0)
        ? parseFinancial(result.gross_yield || 0)
            .div(parseFinancial(result.opening_aum))
            .times(100)
            .toString()
        : "0",
    investorCount: parseInt(String(result.investor_count || distributions.length), 10),
    distributions,
    ibCredits,
    indigoFeesCredit: totals.indigoCredit,
    indigoFeesId: undefined,
    existingConflicts: [],
    hasConflicts: false,
    totals,
    status: "preview",
    // Base V6 unified fields
    periodStart: result.period_start,
    periodEnd: result.period_end,
    daysInPeriod: parseInt(String(result.days_in_period || 0), 10),
    dustAmount: String(result.dust_amount || 0),
    calculationMethod: "unified_v6",
    features: result.features || ["unified_flat_proportional"],
    conservationCheck: Boolean(result.conservation_check),
    openingAum: String(result.opening_aum || 0),
    recordedAum: String(result.recorded_aum || 0),
    crystalsInPeriod: 0,
  };
}

```

## `src/services/admin/yields/yieldCrystallizationService.ts`

```typescript
/**
 * Yield Crystallization Service
 * V6 ARCHITECTURE: Crystallization is abolished. AUM-to-AUM flat math drives all yield.
 * The `investor_yield_events` table has been dropped. All queries now sourced from `transactions_v2`.
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { formatDateForDB } from "@/utils/dateUtils";
import { parseFinancial } from "@/utils/financial";
import type {
  CrystallizationResult,
  FinalizationResult,
} from "@/types/domains/yieldCrystallization";

// CrystallizationResult and FinalizationResult imported from @/types/domains/yieldCrystallization
export type { CrystallizationResult, FinalizationResult };

export interface YieldEvent {
  id: string;
  investor_id: string;
  fund_id: string;
  event_date: string;
  trigger_type: string;
  trigger_transaction_id: string | null;
  fund_aum_before: string;
  fund_aum_after: string;
  investor_balance: string;
  investor_share_pct: string;
  fund_yield_pct: string;
  gross_yield_amount: string;
  fee_pct: string;
  fee_amount: string;
  net_yield_amount: string;
  ib_amount: string | null;
  period_start: string;
  period_end: string;
  days_in_period: number;
  made_visible_at: string | null;
  is_voided: boolean;
  created_at: string;
}

// YieldSnapshot interface removed — fund_yield_snapshots table was dropped in P1-03

/**
 * Finalize month yield - make yield events visible to investors
 */
export async function finalizeMonthYield(
  fundId: string,
  year: number,
  month: number,
  adminId: string
): Promise<FinalizationResult> {
  const { data, error } = await callRPC("finalize_month_yield", {
    p_fund_id: fundId,
    p_period_year: year,
    p_period_month: month,
    p_admin_id: adminId,
  });

  if (error) {
    logError("finalizeMonthYield", error, { fundId, year, month });
    throw new Error(error.message);
  }

  return data as unknown as FinalizationResult;
}

/**
 * Get yield/fee ledger entries for a fund (admin view - from transactions_v2)
 */
export async function getYieldEventsForFund(
  fundId: string,
  options?: {
    startDate?: Date;
    endDate?: Date;
    includeVoided?: boolean;
  }
): Promise<YieldEvent[]> {
  let query = supabase
    .from("transactions_v2")
    .select("*")
    .eq("fund_id", fundId)
    .in("type", ["YIELD", "FEE"])
    .order("tx_date", { ascending: false });

  if (options?.startDate) {
    query = query.gte("tx_date", formatDateForDB(options.startDate));
  }
  if (options?.endDate) {
    query = query.lte("tx_date", formatDateForDB(options.endDate));
  }
  if (!options?.includeVoided) {
    query = query.eq("is_voided", false);
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as YieldEvent[];
}

/**
 * Get yield/fee ledger entries for an investor (admin view - from transactions_v2)
 */
export async function getYieldEventsForInvestor(
  investorId: string,
  options?: {
    fundId?: string;
    startDate?: Date;
    endDate?: Date;
    includeVoided?: boolean;
  }
): Promise<YieldEvent[]> {
  let query = supabase
    .from("transactions_v2")
    .select("*")
    .eq("investor_id", investorId)
    .in("type", ["YIELD", "FEE"])
    .order("tx_date", { ascending: false });

  if (!options?.includeVoided) {
    query = query.eq("is_voided", false);
  }
  if (options?.fundId) {
    query = query.eq("fund_id", options.fundId);
  }
  if (options?.startDate) {
    query = query.gte("tx_date", formatDateForDB(options.startDate));
  }
  if (options?.endDate) {
    query = query.lte("tx_date", formatDateForDB(options.endDate));
  }

  const { data, error } = await query;
  if (error) throw error;
  return (data || []) as unknown as YieldEvent[];
}

/**
 * Get aggregated yield/fee summary for a period, by investor (from transactions_v2)
 */
export async function getAggregatedYieldForPeriod(
  fundId: string,
  periodStart: Date,
  periodEnd: Date
): Promise<
  {
    investor_id: string;
    total_gross_yield: number;
    total_fees: number;
    total_net_yield: number;
    crystallization_count: number;
  }[]
> {
  const startStr = formatDateForDB(periodStart);
  const endStr = formatDateForDB(periodEnd);

  const { data, error } = await supabase
    .from("transactions_v2")
    .select("investor_id, type, amount")
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .in("type", ["YIELD", "FEE"])
    .gte("tx_date", startStr)
    .lte("tx_date", endStr);

  if (error) throw error;

  const aggregated = new Map<
    string,
    {
      investor_id: string;
      total_gross_yield: number;
      total_fees: number;
      total_net_yield: number;
      crystallization_count: number;
    }
  >();

  for (const row of data || []) {
    const amount = parseFinancial(row.amount).toNumber();
    const isYield = row.type === "YIELD";
    const isFee = row.type === "FEE";
    const existing = aggregated.get(row.investor_id);
    if (existing) {
      if (isYield)
        existing.total_gross_yield = parseFinancial(existing.total_gross_yield)
          .plus(amount)
          .toNumber();
      if (isFee)
        existing.total_fees = parseFinancial(existing.total_fees).plus(Math.abs(amount)).toNumber();
      existing.total_net_yield = parseFinancial(existing.total_net_yield).plus(amount).toNumber();
      existing.crystallization_count += 1;
    } else {
      aggregated.set(row.investor_id, {
        investor_id: row.investor_id,
        total_gross_yield: isYield ? amount : 0,
        total_fees: isFee ? Math.abs(amount) : 0,
        total_net_yield: amount,
        crystallization_count: 1,
      });
    }
  }

  return Array.from(aggregated.values());
}

/**
 * Per-investor crystallization event for yield preview sub-rows
 */
export interface InvestorCrystallizationEvent {
  investorId: string;
  eventDate: string;
  triggerType: string;
  grossYield: string;
  feeAmount: string;
  ibAmount: string;
  netYield: string;
}

const TRIGGER_LABELS: Record<string, string> = {
  deposit: "Deposit",
  withdrawal: "Withdrawal",
  transaction: "Flow",
};

/**
 * Get per-investor YIELD/FEE events for a fund in a date range (from transactions_v2).
 * Returns a Map<investorId, events[]>.
 * Replaces the former `getInvestorCrystallizationEvents` which used the dropped investor_yield_events.
 */
export async function getInvestorCrystallizationEvents(
  fundId: string,
  periodStart: string,
  periodEnd: string
): Promise<Map<string, InvestorCrystallizationEvent[]>> {
  const { data, error } = await supabase
    .from("transactions_v2")
    .select("investor_id, tx_date, type, amount, notes")
    .eq("fund_id", fundId)
    .gte("tx_date", periodStart)
    .lte("tx_date", periodEnd)
    .eq("is_voided", false)
    .in("type", ["YIELD", "FEE"])
    .order("tx_date", { ascending: true });

  if (error) {
    logError("getInvestorCrystallizationEvents", error, { fundId, periodStart, periodEnd });
    throw new Error(error.message);
  }

  const result = new Map<string, InvestorCrystallizationEvent[]>();

  for (const row of data || []) {
    const amount = parseFinancial(row.amount).toNumber();
    const isYield = row.type === "YIELD";
    const isFee = row.type === "FEE";
    const event: InvestorCrystallizationEvent = {
      investorId: row.investor_id,
      eventDate: row.tx_date,
      triggerType: row.type,
      grossYield: isYield ? String(amount) : "0",
      feeAmount: isFee ? String(Math.abs(amount)) : "0",
      ibAmount: "0",
      netYield: String(amount),
    };

    const existing = result.get(row.investor_id);
    if (existing) {
      existing.push(event);
    } else {
      result.set(row.investor_id, [event]);
    }
  }

  return result;
}

// getFundYieldSnapshots and YieldSnapshot removed in P1-03 (Unify AUM Snapshot Tables)

/**
 * Get pending (admin_only) yield events count for a fund in a period
 */
export async function getPendingYieldEventsCount(
  fundId: string,
  year: number,
  month: number
): Promise<{ count: number; totalYield: number }> {
  const periodStart = new Date(year, month - 1, 1);
  const periodEnd = new Date(year, month, 0);

  // Query non-voided daily (checkpoint) distributions in the period
  const { data, error } = await supabase
    .from("yield_distributions")
    .select("id, net_yield")
    .eq("fund_id", fundId)
    .eq("is_voided", false)
    .eq("distribution_type", "daily")
    .gte("period_start", formatDateForDB(periodStart))
    .lte("period_end", formatDateForDB(periodEnd));

  if (error) {
    logError("getPendingYieldEventsCount", error, { fundId, year, month });
    throw error;
  }

  const count = data?.length || 0;
  const totalYield =
    data
      ?.reduce((sum, row) => sum.plus(parseFinancial(row.net_yield)), parseFinancial(0))
      .toNumber() || 0;

  return { count, totalYield };
}

```

## `src/services/admin/yields/yieldHistoryService.ts`

```typescript
/**
 * Yield History Service
 * Handles AUM history and fund yield data retrieval
 * Split from yieldDistributionService for better maintainability
 */

import { supabase } from "@/integrations/supabase/client";
import { callRPC, callRPCNoArgs } from "@/lib/supabase/typedRPC";
import type { FundDailyAUM, YieldPurpose } from "@/types/domains/yield";
import { formatDateForDB, getTodayString, getMonthStartDate } from "@/utils/dateUtils";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";

/** Position with fund join result */
interface PositionWithFundJoin {
  fund_id: string;
  shares: number | null;
  current_value: number | null;
  funds: {
    name: string;
    asset: string;
    status: string;
  } | null;
}

// Use canonical formatDateForDB from dateUtils - see src/utils/dateUtils.ts for why
// toISOString().split("T")[0] is NOT timezone-safe

/**
 * Get historical AUM entries for a fund (DEPRECATED: Reads from dynamic RPC now)
 */
export async function getFundAUMHistory(
  fundId: string,
  startDate?: Date,
  endDate?: Date
): Promise<FundDailyAUM[]> {
  // Since we removed the snapshot table, this now returns an empty array or
  // can be refactored to call a historical generation RPC if required by UI.
  // For now, the dashboard flows are strictly built on the single `get_funds_aum_snapshot` for "Today".
  return [];
}

/**
 * Get the latest AUM entry for a fund
 */
export async function getLatestFundAUM(fundId: string): Promise<FundDailyAUM | null> {
  return null;
}

/**
 * Get current fund AUM calculated from investor positions
 */
export async function getCurrentFundAUM(fundId: string): Promise<{
  totalAUM: number;
  investorCount: number;
  lastUpdated: string | null;
}> {
  // Fetch positions with balance filter
  const { data: positions, error } = await supabase
    .from("investor_positions")
    .select("investor_id, current_value, updated_at")
    .eq("fund_id", fundId)
    .gt("current_value", 0)
    .limit(5000);

  if (error) {
    logError("yieldHistoryService.getCurrentFundAUM", error);
    throw new Error(`Failed to fetch current AUM: ${error.message}`);
  }

  // Fetch investor profiles to filter by account_type
  const investorIds = [...new Set((positions || []).map((p) => p.investor_id))];
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, account_type")
    .in("id", investorIds.length > 0 ? investorIds : ["none"]);

  const investorSet = new Set(
    (profiles || [])
      .filter(
        (p) =>
          p.account_type === "investor" ||
          p.account_type === "ib" ||
          p.account_type === "fees_account"
      )
      .map((p) => p.id)
  );

  // Filter to investor + IB accounts
  const investorPositions = (positions || []).filter((p) => investorSet.has(p.investor_id));

  const totalAUM = investorPositions
    .reduce((sum, p) => sum.plus(parseFinancial(p.current_value)), parseFinancial(0))
    .toNumber();

  const lastUpdated =
    investorPositions.reduce(
      (latest, p) => {
        if (!latest || (p.updated_at && p.updated_at > latest)) {
          return p.updated_at;
        }
        return latest;
      },
      null as string | null
    ) || null;

  return {
    totalAUM,
    investorCount: investorPositions.length,
    lastUpdated,
  };
}

/**
 * Save a draft AUM entry (without distributing yield)
 */
export async function saveDraftAUMEntry(
  fundId: string,
  recordDate: Date,
  closingAUM: number,
  notes?: string,
  adminId?: string
): Promise<FundDailyAUM> {
  // AUM tracking is now 100% implicitly defined by transactions.
  // There is no longer a concept of saving a "draft AUM entry" manually to a snapshot table.
  // We simply return a synthetic object to appease the interface without writing to deprecated tables.
  return {
    id: "synthetic-" + Date.now(),
    fund_id: fundId,
    aum_date: formatDateForDB(recordDate),
    as_of_date: formatDateForDB(recordDate),
    total_aum: closingAUM.toString(),
    purpose: "transaction",
    is_voided: false,
    created_at: new Date().toISOString(),
  } as unknown as FundDailyAUM;
}

/**
 * Get active funds with AUM and record counts
 * Optimized: batch queries instead of N+1
 * AUM includes all active position holders (investor + fees_account + ib).
 * Investor count remains investor-only for UI readability.
 */
/**
 * Get active funds with AUM and record counts
 * Uses server-side aggregation via get_active_funds_summary RPC
 */
export async function getActiveFundsWithAUM(): Promise<
  Array<{
    id: string;
    code: string;
    name: string;
    asset: string;
    total_aum: number;
    investor_count: number;
    aum_record_count: number;
  }>
> {
  const { data, error } = await callRPCNoArgs("get_active_funds_summary" as any);

  if (error) {
    logError("yieldHistoryService.getActiveFundsWithAUM", error);
    throw new Error(`Failed to fetch active funds summary: ${error.message}`);
  }

  return (data || []).map((f: any) => {
    // RIGOROUS MAPPING: Check both v5 (fund_id) and v6 (id) styles
    // The RPC returns {id, code, name, asset, total_aum, investor_count}
    const id = f.id || f.fund_id;
    const code = f.code || f.fund_code;
    const name = f.name || f.fund_name;
    const asset = f.asset || f.fund_asset;

    if (!id) {
      console.warn(
        `[yieldHistoryService] Missing ID for fund ${code || name || "unknown"}. Raw:`,
        f
      );
    }

    return {
      id,
      code,
      name,
      asset,
      total_aum: parseFinancial(f.total_aum || 0).toNumber(),
      investor_count: Number(f.investor_count || 0),
      aum_record_count: Number(f.aum_record_count || 0),
    };
  });
}

/**
 * Get investor composition for a fund with MTD yield
 * Uses server-side aggregation via get_fund_composition RPC
 * Includes all account types (investor, IB, fees_account) with balance > 0.
 */
export async function getFundInvestorCompositionWithYield(fundId: string): Promise<
  Array<{
    investor_id: string;
    investor_name: string;
    investor_email: string;
    current_value: number;
    ownership_pct: number;
    mtd_yield: number;
  }>
> {
  const { data, error } = await callRPC("get_fund_composition" as any, {
    p_fund_id: fundId,
  });

  if (error) {
    logError("yieldHistoryService.getFundInvestorCompositionWithYield", error);
    throw new Error(`Failed to fetch fund composition: ${error.message}`);
  }

  return (data || []).map((row: any) => ({
    investor_id: row.investor_id,
    investor_name: row.investor_name,
    investor_email: row.investor_email,
    current_value: Number(row.current_value),
    ownership_pct: Number(row.ownership_pct),
    mtd_yield: Number(row.mtd_yield),
  }));
}

/**
 * Get statement period ID for a given year and month
 */
export async function getStatementPeriodId(year: number, month: number): Promise<string | null> {
  const { data, error } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (error) {
    logError("yieldHistoryService.getStatementPeriodId", error);
    return null;
  }

  return data?.id || null;
}

/**
 * Get investor positions with fund details
 */
export async function getInvestorPositionsWithFunds(investorId: string): Promise<
  Array<{
    fund_id: string;
    fund_name: string;
    asset: string;
    current_value: number;
    shares: number;
  }>
> {
  const { data, error } = await supabase
    .from("investor_positions")
    .select(
      `
      fund_id,
      shares,
      current_value,
      funds!fk_investor_positions_fund(name, asset, status)
    `
    )
    .eq("investor_id", investorId)
    .limit(100);

  if (error) throw new Error(`Failed to fetch positions: ${error.message}`);

  return ((data || []) as PositionWithFundJoin[])
    .filter((p) => p.funds?.status === "active")
    .map((p) => ({
      fund_id: p.fund_id,
      fund_name: p.funds?.name || "Unknown",
      asset: p.funds?.asset || "USD",
      current_value: p.current_value || 0,
      shares: p.shares || 0,
    }));
}
/**
 * Check if a distribution already exists for a fund, date, and purpose
 */
export async function checkExistingDistribution(
  fundId: string,
  effectiveDate: Date,
  purpose: YieldPurpose
) {
  const effectiveDateStr = formatDateForDB(effectiveDate);
  if (!effectiveDateStr) {
    return { exists: false, id: null, date: null };
  }

  const { data, error } = await supabase
    .from("yield_distributions")
    .select("id")
    .eq("fund_id", fundId)
    .eq("period_end", effectiveDateStr)
    .eq("is_voided", false)
    .eq("purpose", purpose)
    .limit(1);

  if (error) {
    logError("yieldHistoryService.checkExistingDistribution", error, { fundId, effectiveDateStr });
    return { exists: false, id: null, date: effectiveDateStr };
  }

  const existingId = data?.[0]?.id ?? null;
  return { exists: Boolean(existingId), id: existingId, date: effectiveDateStr };
}

```

## `src/services/admin/yields/yieldManagementService.ts`

```typescript
/**
 * Yield Management Service
 * Provides void/edit operations for yield records with full audit trail
 */

import { supabase } from "@/integrations/supabase/client";
import { logError, logWarn } from "@/lib/logger";
import { callRPC } from "@/lib/supabase/typedRPC";
import { rpc } from "@/lib/rpc/index";

export interface VoidYieldResult {
  success: boolean;
  fund_id: string;
  aum_date: string;
  purpose: string;
  voided_at: string;
}

export interface UpdateYieldResult {
  success: boolean;
  record_id: string;
  old_aum: number;
  new_aum: number;
  updated_at: string;
}

/**
 * RPC result type for update_fund_daily_aum_with_recalc
 */
interface RecalcYieldRPCResult {
  success: boolean;
  error?: string;
  record_id?: string;
  old_aum?: number;
  new_aum?: number;
  updated_at?: string;
}

/**
 * RPC result type for get_void_aum_impact
 */
export interface VoidAumImpactResult {
  success: boolean;
  error?: string;
  record_id?: string;
  fund_id?: string;
  fund_name?: string;
  fund_asset?: string;
  aum_date?: string;
  total_aum?: number;
  purpose?: string;
  distributions_to_void?: number;
  transactions_to_void?: number;
  affected_investors?: Array<{
    investor_id: string;
    investor_name: string;
    current_position: number;
    yield_amount: number;
    fee_amount: number;
  }>;
  affected_investor_count?: number;
  total_yield_amount?: number;
  total_fee_amount?: number;
}

export interface YieldDetails {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_asset: string;
  aum_date: string;
  total_aum: number;
  purpose: string;
  is_month_end: boolean;
  source: string | null;
  is_voided: boolean;
  voided_at: string | null;
  voided_by: string | null;
  voided_by_name?: string;
  void_reason: string | null;
  created_at: string;
  created_by: string | null;
  created_by_name?: string;
  updated_at: string | null;
  updated_by: string | null;
  updated_by_name?: string;
}

/**
 * Void a yield record by AUM record ID
 * @deprecated fund_daily_aum table was dropped — this is now a no-op.
 */
export async function voidYieldRecord(
  _recordId: string,
  _reason: string
): Promise<VoidYieldResult> {
  throw new Error("voidYieldRecord is deprecated — use void_yield_distribution RPC instead");
}

/**
 * Void a yield distribution by distribution ID (cascade void with audit trail)
 * Use this when voiding a specific distribution from YieldDistributionsPage
 */
export async function voidYieldDistribution(
  distributionId: string,
  reason: string,
  voidCrystals: boolean = false
): Promise<{ success: boolean; voided_count?: number; voided_crystals?: number; error?: string }> {
  // Get current user
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    throw new Error("Not authenticated");
  }

  const { data, error } = await callRPC("void_yield_distribution", {
    p_distribution_id: distributionId,
    p_admin_id: user.id,
    p_reason: reason,
    p_void_crystals: voidCrystals,
  });

  if (error) {
    logError("yieldManagement.voidDistribution", error, { distributionId });
    throw new Error(error.message || "Failed to void yield distribution");
  }

  const result = data as Record<string, unknown>;
  const voidedCount = Number(result.voided_count ?? 0);
  const voidedCrystals = Number(result.voided_crystals ?? 0);

  if (voidedCount === 0) {
    logWarn("voidYieldDistribution.noCascade", {
      distributionId,
      message: "Yield voided but no allocations were cascaded — verify fee/ib allocations manually",
    });
  }

  return {
    success: Boolean(result.success),
    voided_count: voidedCount,
    voided_crystals: voidedCrystals,
    error: result.error as string | undefined,
  };
}

/**
 * Unvoid a yield distribution (cascade restore with audit trail)
 */
export async function unvoidYieldDistribution(
  distributionId: string,
  reason: string
): Promise<{ success: boolean; unvoided_transactions?: number; error?: string }> {
  throw new Error("unvoid_yield_distribution RPC has been removed.");
}

/**
 * Update a yield record's AUM with audit trail
 */
/**
 * Update a yield record's AUM with full cascade recalculation
 * @deprecated fund_daily_aum table was dropped — this is now a no-op.
 */
export async function updateYieldAum(
  _recordId: string,
  _newTotalAum: number,
  _reason: string
): Promise<UpdateYieldResult> {
  return { success: false } as any;
}

/**
 * Get detailed information about a yield record
 * @deprecated Querying yield_distributions instead for historical context.
 */
export async function getYieldDetails(recordId: string): Promise<YieldDetails | null> {
  const { data: record, error } = await supabase
    .from("yield_distributions")
    .select(
      "id, fund_id, aum_date:effective_date, total_aum:recorded_aum, is_month_end, is_voided, voided_at, void_reason, created_at, created_by"
    )
    .eq("id", recordId)
    .maybeSingle();

  if (error || !record) {
    return null;
  }

  // Get fund details
  const { data: fund } = await supabase
    .from("funds")
    .select("name, asset")
    .eq("id", (record as any).fund_id)
    .maybeSingle();

  return {
    id: record.id,
    fund_id: (record as any).fund_id,
    fund_name: fund?.name || "Unknown Fund",
    fund_asset: fund?.asset || "Unknown",
    aum_date: (record as any).aum_date,
    total_aum: (record as any).total_aum,
    purpose: "reporting",
    is_month_end: record.is_month_end || false,
    source: "yield_distribution",
    is_voided: record.is_voided || false,
    voided_at: record.voided_at,
    voided_by: null,
    void_reason: record.void_reason,
    created_at: record.created_at,
    created_by: record.created_by,
    updated_at: null,
    updated_by: null,
  };
}

/**
 * Check if a yield record can be voided
 * Returns { canVoid: boolean, reason?: string }
 */
export async function canVoidYieldRecord(
  recordId: string
): Promise<{ canVoid: boolean; reason?: string }> {
  const details = await getYieldDetails(recordId);

  if (!details) {
    return { canVoid: false, reason: "Record not found" };
  }

  if (details.is_voided) {
    return { canVoid: false, reason: "Record is already voided" };
  }

  // Additional checks could be added here (e.g., check if there are dependent corrections)

  return { canVoid: true };
}

/**
 * Check if a yield record can be edited
 */
export async function canEditYieldRecord(
  recordId: string
): Promise<{ canEdit: boolean; reason?: string }> {
  const details = await getYieldDetails(recordId);

  if (!details) {
    return { canEdit: false, reason: "Record not found" };
  }

  if (details.is_voided) {
    return { canEdit: false, reason: "Cannot edit a voided record" };
  }

  return { canEdit: true };
}

/**
 * Get void impact preview
 * @deprecated fund_daily_aum table was dropped — this is now a no-op.
 */
export async function getYieldVoidImpact(_recordId: string): Promise<VoidAumImpactResult> {
  return { success: false } as any;
}

```

## `src/services/admin/yields/yieldReportsService.ts`

```typescript
/**
 * Yield Reports Service
 * Handles investor performance reports and yield-related reporting
 * Split from yieldDistributionService for better maintainability
 */

import { supabase } from "@/integrations/supabase/client";
import { db } from "@/lib/db/index";
import { getMonthEndDate } from "@/utils/dateUtils";

/**
 * Get investor performance records for a specific period
 */
export async function getInvestorPerformanceForPeriod(
  investorId: string,
  periodId: string
): Promise<any[]> {
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select("*")
    .eq("investor_id", investorId)
    .eq("period_id", periodId);

  if (error) throw new Error(`Failed to fetch performance: ${error.message}`);
  return data || [];
}

/**
 * Get investor fee schedule
 */
export async function getInvestorFeeSchedule(investorId: string): Promise<
  Array<{
    id: string;
    fund_id: string | null;
    fee_pct: number;
    effective_date: string;
  }>
> {
  const { data, error } = await supabase
    .from("investor_fee_schedule")
    .select("id, fund_id, fee_pct, effective_date")
    .eq("investor_id", investorId)
    .order("effective_date", { ascending: false });

  if (error) throw new Error(`Failed to fetch fee schedule: ${error.message}`);
  return data || [];
}

/** Monthly report with joined period data */
interface MonthlyReportWithPeriod {
  id: string;
  investor_id: string;
  period_id: string;
  fund_name: string;
  mtd_beginning_balance: number | null;
  mtd_additions: number | null;
  mtd_redemptions: number | null;
  mtd_net_income: number | null;
  mtd_ending_balance: number | null;
  mtd_rate_of_return: number | null;
  period: { period_end_date: string } | null;
}

/**
 * Get investor monthly reports (from investor_fund_performance)
 */
export async function getInvestorMonthlyReports(
  investorId: string
): Promise<MonthlyReportWithPeriod[]> {
  // Note: Supabase JS v2 doesn't fully support order() on relation fields in TypeScript,
  // so we fetch and sort client-side for type safety
  const { data, error } = await supabase
    .from("investor_fund_performance")
    .select(
      `
      id,
      investor_id,
      period_id,
      fund_name,
      mtd_beginning_balance,
      mtd_additions,
      mtd_redemptions,
      mtd_net_income,
      mtd_ending_balance,
      mtd_rate_of_return,
      period:statement_periods (
        period_end_date
      )
    `
    )
    .eq("investor_id", investorId);

  if (error) throw new Error(`Failed to fetch monthly reports: ${error.message}`);

  // Client-side sort: by period_end_date DESC, then fund_name ASC
  const reports = (data || []) as unknown as MonthlyReportWithPeriod[];
  return reports.sort((a, b) => {
    const dateA = a.period?.period_end_date || "";
    const dateB = b.period?.period_end_date || "";
    if (dateB !== dateA) return dateB.localeCompare(dateA);
    return (a.fund_name || "").localeCompare(b.fund_name || "");
  });
}

/**
 * Create monthly report template for an investor
 */
export async function createMonthlyReportTemplate(
  investorId: string,
  year: number,
  month: number,
  assetCode: string = "USDT"
): Promise<void> {
  const {
    data: { user },
  } = await supabase.auth.getUser();

  // Check if period exists
  let periodId: string;
  const { data: period } = await supabase
    .from("statement_periods")
    .select("id")
    .eq("year", year)
    .eq("month", month)
    .maybeSingle();

  if (period) {
    periodId = period.id;
  } else {
    // Create period if it doesn't exist
    const date = new Date(year, month - 1);
    const endDate = getMonthEndDate(year, month);
    const { data: newPeriod, error: createError } = await supabase
      .from("statement_periods")
      .insert({
        year,
        month,
        period_name: date.toLocaleString("default", { month: "long", year: "numeric" }),
        period_end_date: endDate,
        created_by: user?.id,
        status: "FINALIZED",
      })
      .select("id")
      .single();

    if (createError) throw new Error(`Failed to create period: ${createError.message}`);
    periodId = newPeriod.id;
  }

  // Insert performance record
  const result = await db.insert("investor_fund_performance", {
    investor_id: investorId,
    period_id: periodId,
    fund_name: assetCode,
    mtd_beginning_balance: 0,
    mtd_ending_balance: 0,
    mtd_additions: 0,
    mtd_redemptions: 0,
    mtd_net_income: 0,
  });

  if (result.error) throw new Error(`Failed to create template: ${result.error.userMessage}`);
}

/**
 * Update a monthly report field
 */
export async function updateMonthlyReportField(
  reportId: string,
  field: string,
  value: number
): Promise<void> {
  // Map legacy fields to V2 fields
  const fieldMap: Record<string, string> = {
    opening_balance: "mtd_beginning_balance",
    closing_balance: "mtd_ending_balance",
    additions: "mtd_additions",
    withdrawals: "mtd_redemptions",
    yield_earned: "mtd_net_income",
  };

  const v2Field = fieldMap[field] || field;

  const { error } = await supabase
    .from("investor_fund_performance")
    .update({ [v2Field]: value })
    .eq("id", reportId);

  if (error) throw new Error(`Failed to update report: ${error.message}`);
}

```

## `src/services/admin/yields/yieldDistributionsPageService.ts`

```typescript
/**
 * Yield Distributions Page Service
 * Encapsulates data fetching for the Yield Distributions admin page
 */

import { supabase } from "@/integrations/supabase/client";
import { logError } from "@/lib/logger";

export interface YieldDistributionsFilters {
  fundId: string; // "all" or a uuid
  month: string; // "YYYY-MM" or ""
  purpose: string; // "all" | "transaction" | "reporting"
  includeVoided?: boolean;
}

export type DistributionRow = {
  id: string;
  fund_id: string;
  yield_date: string | null;
  period_start: string | null;
  period_end: string | null;
  effective_date: string;
  purpose: "reporting" | "transaction";
  distribution_type: string | null;
  /** @precision NUMERIC - string preserves DB numeric(38,18) */
  gross_yield: number | string;
  /** @precision NUMERIC */
  total_fees: number | string | null;
  /** @precision NUMERIC */
  total_ib: number | string | null;
  /** @precision NUMERIC */
  total_fee_credit: number | string | null;
  /** @precision NUMERIC */
  net_yield: number | string | null;
  /** @precision NUMERIC */
  recorded_aum: number | string;
  allocation_count: number | null;
  created_at: string;
  is_voided: boolean | null;
  summary_json: unknown | null;
};

export type AllocationRow = {
  id: string;
  distribution_id: string;
  investor_id: string;
  /** @precision NUMERIC */
  gross_amount: number | string;
  /** @precision NUMERIC */
  fee_amount: number | string | null;
  /** @precision NUMERIC */
  ib_amount: number | string | null;
  /** @precision NUMERIC */
  fee_credit: number | string | null;
  /** @precision NUMERIC */
  net_amount: number | string;
  /** @precision NUMERIC */
  adb_share: number | string | null;
  /** @precision NUMERIC */
  ownership_pct: number | string | null;
  /** @precision NUMERIC */
  fee_pct: number | string | null;
  /** @precision NUMERIC */
  ib_pct: number | string | null;
  /** @precision NUMERIC */
  position_value_at_calc: number | string | null;
  ib_investor_name: string | null;
};

export type FeeAllocationRow = {
  id: string;
  distribution_id: string;
  investor_id: string;
  /** @precision NUMERIC */
  base_net_income: number | string;
  /** @precision NUMERIC */
  fee_amount: number | string;
  /** @precision NUMERIC */
  fee_percentage: number | string;
};

export type YieldEventRow = {
  id: string;
  investor_id: string;
  /** @precision NUMERIC */
  gross_yield_amount: number | string;
  /** @precision NUMERIC */
  fee_amount: number | string | null;
  /** @precision NUMERIC */
  fee_pct: number | string | null;
  /** @precision NUMERIC */
  net_yield_amount: number | string;
  /** @precision NUMERIC */
  investor_share_pct: number | string;
  /** @precision NUMERIC */
  investor_balance: number | string;
  trigger_type: string;
  period_start: string | null;
  period_end: string | null;
  /** @precision NUMERIC */
  fund_aum_before: number | string | null;
  /** @precision NUMERIC */
  fund_aum_after: number | string | null;
};

export type InvestorProfile = {
  id: string;
  first_name: string | null;
  last_name: string | null;
  email: string | null;
};

export interface YieldDistributionsPageData {
  distributions: DistributionRow[];
  allocationsByDistribution: Record<string, AllocationRow[]>;
  feeAllocationsByDistribution: Record<string, FeeAllocationRow[]>;
  yieldEventsByDistribution: Record<string, YieldEventRow[]>;
  investorMap: Record<string, InvestorProfile>;
}

export async function fetchYieldDistributionsPageData(
  filters: YieldDistributionsFilters
): Promise<YieldDistributionsPageData> {
  try {
    let query = supabase
      .from("yield_distributions")
      .select(
        `
        id,
        fund_id,
        yield_date,
        period_start,
        period_end,
        effective_date,
        purpose,
        distribution_type,
        gross_yield,
        total_fees,
        total_ib,
        total_fee_credit,
        net_yield,
        recorded_aum,
        allocation_count,
        created_at,
        is_voided,
        summary_json
      `
      )
      .order("effective_date", { ascending: false })
      .limit(120);

    if (!filters.includeVoided) {
      query = query.eq("is_voided", false);
    }

    if (filters.fundId !== "all") {
      query = query.eq("fund_id", filters.fundId);
    }

    if (filters.month) {
      const [year, month] = filters.month.split("-").map(Number);
      const startDate = `${filters.month}-01`;
      const nextMonth = new Date(year, month, 1);
      const endDate = `${nextMonth.getFullYear()}-${String(nextMonth.getMonth() + 1).padStart(2, "0")}-01`;
      query = query.gte("effective_date", startDate);
      query = query.lt("effective_date", endDate);
    }

    if (filters.purpose && filters.purpose !== "all") {
      query = query.eq("purpose", filters.purpose as "transaction" | "reporting");
    }

    const { data, error } = await query;
    if (error) throw error;
    const rows = (data || []) as DistributionRow[];

    const distributionIds = rows.map((row) => row.id);
    if (distributionIds.length === 0) {
      return {
        distributions: rows,
        allocationsByDistribution: {},
        feeAllocationsByDistribution: {},
        yieldEventsByDistribution: {},
        investorMap: {},
      };
    }

    const allInvestorIds = new Set<string>();

    // Fetch yield_allocations (primary breakdown)
    const { data: allocationRows, error: allocationError } = await supabase
      .from("yield_allocations")
      .select(
        `
        id,
        distribution_id,
        investor_id,
        gross_amount,
        fee_amount,
        ib_amount,
        fee_credit,
        net_amount,
        adb_share,
        ownership_pct,
        fee_pct,
        ib_pct,
        position_value_at_calc
      `
      )
      .in("distribution_id", distributionIds)
      .eq("is_voided", false);

    if (allocationError) throw allocationError;

    const rawAllocations = (allocationRows || []) as (Omit<AllocationRow, "ib_investor_name"> & {
      ib_investor_name?: string | null;
    })[];

    // Fetch IB allocations to enrich with IB person names
    const { data: ibAllocRows } = await supabase
      .from("ib_allocations")
      .select("distribution_id, source_investor_id, ib_investor_id")
      .in("distribution_id", distributionIds)
      .eq("is_voided", false);

    // Build map: (distribution_id, source_investor_id) -> ib_investor_id
    const ibMap = new Map<string, string>();
    const ibPersonIds = new Set<string>();
    (ibAllocRows || []).forEach((ib) => {
      const key = `${ib.distribution_id}:${ib.source_investor_id}`;
      ibMap.set(key, ib.ib_investor_id);
      ibPersonIds.add(ib.ib_investor_id);
    });

    // Fetch IB person profiles
    const ibProfileMap = new Map<string, string>();
    if (ibPersonIds.size > 0) {
      const { data: ibProfiles } = await supabase
        .from("profiles")
        .select("id, first_name, last_name")
        .in("id", Array.from(ibPersonIds));
      (ibProfiles || []).forEach((p) => {
        ibProfileMap.set(p.id, `${p.first_name || ""} ${p.last_name || ""}`.trim());
      });
    }

    // Enrich allocations with IB person name
    const allocations: AllocationRow[] = rawAllocations.map((a) => {
      const ibKey = `${a.distribution_id}:${a.investor_id}`;
      const ibInvestorId = ibMap.get(ibKey);
      return {
        ...a,
        ib_investor_name: ibInvestorId ? ibProfileMap.get(ibInvestorId) || null : null,
      };
    });

    const grouped: Record<string, AllocationRow[]> = {};
    allocations.forEach((allocation) => {
      if (!grouped[allocation.distribution_id]) {
        grouped[allocation.distribution_id] = [];
      }
      grouped[allocation.distribution_id].push(allocation);
    });

    // Fetch fee_allocations (fallback for distributions without yield_allocations)
    const distIdsWithoutAllocations = distributionIds.filter((id) => !grouped[id]?.length);
    const feeGrouped: Record<string, FeeAllocationRow[]> = {};

    if (distIdsWithoutAllocations.length > 0) {
      const { data: feeRows, error: feeError } = await supabase
        .from("fee_allocations")
        .select(`id, distribution_id, investor_id, base_net_income, fee_amount, fee_percentage`)
        .in("distribution_id", distIdsWithoutAllocations)
        .eq("is_voided", false);

      if (!feeError && feeRows) {
        (feeRows as FeeAllocationRow[]).forEach((row) => {
          if (!feeGrouped[row.distribution_id]) {
            feeGrouped[row.distribution_id] = [];
          }
          feeGrouped[row.distribution_id].push(row);
        });
      }
    }

    // Collect investor IDs from yield_allocations and fee_allocations
    allocations.forEach((a) => allInvestorIds.add(a.investor_id));
    Object.values(feeGrouped).forEach((feeRows) =>
      feeRows.forEach((r) => allInvestorIds.add(r.investor_id))
    );

    // NOTE: The third fallback (investor_yield_events) has been removed in V6.
    // yield_allocations is now the sole authoritative per-investor breakdown.
    const yieldEventsGrouped: Record<string, YieldEventRow[]> = {};

    if (allInvestorIds.size === 0) {
      return {
        distributions: rows,
        allocationsByDistribution: grouped,
        feeAllocationsByDistribution: feeGrouped,
        yieldEventsByDistribution: yieldEventsGrouped,
        investorMap: {},
      };
    }

    const { data: investors, error: investorError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", Array.from(allInvestorIds));

    if (investorError) throw investorError;

    const map: Record<string, InvestorProfile> = {};
    (investors || []).forEach((profile) => {
      map[profile.id] = profile as InvestorProfile;
    });

    return {
      distributions: rows,
      allocationsByDistribution: grouped,
      feeAllocationsByDistribution: feeGrouped,
      yieldEventsByDistribution: yieldEventsGrouped,
      investorMap: map,
    };
  } catch (error) {
    logError("fetchYieldDistributionsPageData", error);
    throw error;
  }
}

```

## `src/services/admin/yields/yieldAumService.ts`

```typescript
/**
 * Yield AUM Service
 * Central authority for AUM retrieval and reconciliation in yield flows.
 * Leverages enhanced backend RPCs for historical consistency.
 */

import { rpc } from "@/lib/rpc/index";
import { logError } from "@/lib/logger";

export type AumPurpose = "reporting" | "transaction";

export interface AumAsOfResult {
  fundId: string;
  fundCode: string;
  asOfDate: string;
  purpose: AumPurpose;
  aumValue: number;
  aumSource: "yield_distribution" | "positions_live" | "no_data";
  aumRecordId: string | null;
}

export interface AumReconciliationResult {
  success: boolean;
  error?: string;
  fund_id: string;
  fund_asset: string;
  as_of_date: string;
  aum_date: string | null;
  recorded_aum: number;
  positions_sum: number;
  discrepancy: number;
  discrepancy_pct: number;
  tolerance_pct: number;
  has_warning: boolean;
  message: string;
}

export const yieldAumService = {
  /**
   * Fetches the authoritative AUM for a fund as of a specific date.
   * Unlike previous implementations, this does NOT fall back to current AUM automatically
   * in the service layer; that decision is left to the UI with explicit warnings.
   */
  async getFundAumAsOf(
    fundId: string,
    asOfDate: string,
    purpose: AumPurpose = "reporting"
  ): Promise<AumAsOfResult | null> {
    try {
      const { data, error } = await rpc.call("get_fund_aum_as_of", {
        p_fund_id: fundId,
        p_as_of_date: asOfDate,
        p_purpose: purpose,
      });

      if (error) throw error;

      const row = data?.[0];
      if (!row || row.aum_source === "no_data" || row.aum_source === "no_fund") return null;

      return {
        fundId: row.fund_id,
        fundCode: row.fund_code,
        asOfDate: row.as_of_date,
        purpose: row.purpose as AumPurpose,
        aumValue: Number(row.aum_value || 0),
        aumSource:
          row.aum_source === "fund_daily_aum" ? "yield_distribution" : (row.aum_source as any),
        aumRecordId: (row as any).aum_record_id || null,
      };
    } catch (err) {
      logError("yieldAumService.getFundAumAsOf", err, { fundId, asOfDate, purpose });
      throw err;
    }
  },

  /**
   * Performs AUM reconciliation for a specific date (historical or current).
   */
  async checkReconciliation(
    fundId: string,
    asOfDate: string,
    tolerancePct: number = 0.01
  ): Promise<AumReconciliationResult> {
    try {
      const { data, error } = await rpc.call("check_aum_reconciliation", {
        p_fund_id: fundId,
        p_as_of_date: asOfDate,
        p_tolerance_pct: tolerancePct,
      });

      if (error) throw error;
      return data as unknown as AumReconciliationResult;
    } catch (err) {
      logError("yieldAumService.checkReconciliation", err, { fundId, asOfDate });
      throw err;
    }
  },
};

```

# Section 4: Withdrawal Services

## `src/features/investor/withdrawals/services/investorWithdrawalService.ts`

```typescript
/**
 * Investor Withdrawal Service
 * Handles withdrawal requests for investors
 * Split from investorDataService.ts for better modularity
 */

import { supabase } from "@/integrations/supabase/client";
import { rpc } from "@/lib/rpc/index";
import type { FundRelation } from "@/types/domains/relations";

// ============================================
// Types
// ============================================

export interface WithdrawalRequest {
  id: string;
  fund_id: string;
  fund_name: string;
  fund_class: string;
  asset: string;
  requested_amount: string;
  approved_amount?: string;
  processed_amount?: string;
  withdrawal_type: string;
  status: string;
  notes?: string | null;
  rejection_reason?: string | null;
  created_at: string;
  approved_at?: string | null;
  settlement_date?: string | null;
  tx_hash?: string | null;
}

// ============================================
// Withdrawal Functions
// ============================================

/**
 * Get investor's withdrawal requests
 */
export async function getWithdrawalRequests(): Promise<WithdrawalRequest[]> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) return [];

  const investorId = user.user.id;

  const { data, error } = await supabase
    .from("withdrawal_requests")
    .select(
      `
      *,
      funds!inner(name, asset, fund_class)
    `
    )
    .eq("investor_id", investorId)
    .order("created_at", { ascending: false });

  if (error) throw error;

  return (data || []).map((request) => {
    const fund = request.funds as unknown as FundRelation | null;
    return {
      id: request.id,
      fund_id: request.fund_id,
      fund_name: fund?.name || "Unknown",
      fund_class: fund?.fund_class || "Standard",
      asset: fund?.asset || "Unknown",
      requested_amount: String(request.requested_amount),
      approved_amount: request.approved_amount ? String(request.approved_amount) : undefined,
      processed_amount: request.processed_amount ? String(request.processed_amount) : undefined,
      withdrawal_type: request.withdrawal_type,
      status: request.status,
      notes: request.notes,
      rejection_reason: request.rejection_reason,
      created_at: request.request_date,
      approved_at: request.approved_at,
      settlement_date: request.settlement_date,
      tx_hash: request.tx_hash,
    };
  });
}

// NOTE: createWithdrawalRequest removed -- canonical implementation is
// investorPortfolioService.createWithdrawalRequest (used by useCreateWithdrawalRequest hook)

/**
 * Cancel a withdrawal request (if still pending)
 * Uses the RPC gateway to ensure state machine validation and audit logging
 */
export async function cancelWithdrawalRequest(requestId: string, reason?: string): Promise<void> {
  const { data: user } = await supabase.auth.getUser();
  if (!user.user) throw new Error("Not authenticated");

  // Only allow cancelling own pending withdrawals
  const { error } = await supabase
    .from("withdrawal_requests")
    .update({ status: "cancelled", notes: reason ?? "Cancelled by investor" } as any)
    .eq("id", requestId)
    .eq("investor_id", user.user.id)
    .eq("status", "pending" as any);

  if (error) throw error;
}

/**
 * Get available funds for investment
 */
export async function getAvailableFunds(): Promise<any[]> {
  const { data, error } = await supabase
    .from("funds")
    .select("*")
    .eq("status", "active")
    .order("name");

  if (error) throw error;
  return data || [];
}

```

# Section 5: RPC Gateway

## `src/lib/rpc/index.ts`

```typescript
import { isValidTxType, mapUITypeToDb } from "@/contracts/dbEnums";
import { normalizeError } from "./normalization";
import { validateParams } from "./validation";
import { call, callNoArgs, deposit, withdrawal, applyYield, previewYield } from "./client";

export const rpc = {
  /** Generic RPC call with full type safety */
  call,
  /** RPC call for functions with no arguments */
  callNoArgs,

  // Canonical mutation helpers
  /** Create deposit with crystallization */
  deposit,
  /** Create withdrawal with crystallization */
  withdrawal,
  /** Apply yield distribution */
  applyYield,
  /** Preview yield distribution */
  previewYield,

  // Utilities
  /** Map UI transaction type to DB type */
  mapUITypeToDb,
  /** Check if a value is a valid DB transaction type */
  isValidTxType,
};

// Re-export for convenience
export { normalizeError, validateParams };
export type { RPCResult, RPCError } from "./types";

```

## `src/lib/rpc/types.ts`

```typescript
import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// TYPES
// =============================================================================

export type RPCFunctions = Database["public"]["Functions"] & {
  get_funds_daily_flows: {
    Args: { p_date: string };
    Returns: unknown;
  };
  get_paged_audit_logs: {
    Args: {
      p_limit?: number;
      p_offset?: number;
      p_entity?: string;
      p_action?: string;
      p_actor_id?: string;
    };
    Returns: any[];
  };
  get_paged_notifications: {
    Args: {
      p_user_id: string;
      p_limit?: number;
      p_offset?: number;
    };
    Returns: any[];
  };
  get_paged_investor_summaries: {
    Args: {
      p_limit?: number;
      p_offset?: number;
      p_status?: string;
    };
    Returns: any[];
  };
  get_admin_stats: {
    Args: Record<string, never>;
    Returns: unknown;
  };
  get_platform_flow_metrics: {
    Args: { p_days?: number };
    Returns: unknown;
  };
  purge_fund_hard: {
    Args: { p_fund_id: string };
    Returns: unknown;
  };
  get_period_delivery_stats: {
    Args: { p_period_id: string };
    Returns: unknown;
  };
  get_all_investors_summary: {
    Args: Record<string, never>;
    Returns: unknown;
  };
};

export type RPCFunctionName = keyof RPCFunctions;

export interface RPCResult<T> {
  data: T | null;
  error: RPCError | null;
  success: boolean;
}

export interface RPCError {
  message: string;
  code: string;
  userMessage: string;
  originalError?: unknown;
}

```

# Section 6: Core SQL Migrations

## `supabase/migrations/20260324143540_d85fc7ca-815e-410c-ad04-d0164f8f562a.sql`

```sql
-- Platform Precision Upgrade: All functions to numeric(38,18)
-- + Position rebuild + BTC withdrawal date corrections

-- =============================================
-- PART 1: Upgrade all 12 functions
-- =============================================

-- 1. recompute_investor_position
CREATE OR REPLACE FUNCTION public.recompute_investor_position(p_investor_id uuid, p_fund_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value numeric(38,18);
  v_cost_basis numeric(38,18);
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      ELSE amount
    END
  ), 0) INTO v_current_value
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN ABS(amount)
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN -1 * ABS(amount)
      WHEN type = 'ADJUSTMENT' THEN amount
      ELSE 0
    END
  ), 0) INTO v_cost_basis
  FROM transactions_v2
  WHERE fund_id = p_fund_id
    AND investor_id = p_investor_id
    AND is_voided = false;

  IF v_cost_basis < 0 THEN
    v_cost_basis := 0;
  END IF;

  INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, is_active, updated_at)
  VALUES (p_investor_id, p_fund_id, v_current_value, v_cost_basis, 0, v_current_value > 0, now())
  ON CONFLICT (investor_id, fund_id)
  DO UPDATE SET
    current_value = EXCLUDED.current_value,
    cost_basis = EXCLUDED.cost_basis,
    is_active = EXCLUDED.is_active,
    updated_at = now();
END;
$function$;

-- 2. fn_ledger_drives_position
CREATE OR REPLACE FUNCTION public.fn_ledger_drives_position()
 RETURNS trigger
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_delta numeric(38,18);
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.is_voided THEN RETURN NEW; END IF;
    v_delta := NEW.amount;

    IF NEW.type = 'WITHDRAWAL' THEN
      v_delta := -1 * ABS(NEW.amount);
    END IF;

    INSERT INTO investor_positions (investor_id, fund_id, current_value, cost_basis, shares, fund_class, is_active, updated_at)
    VALUES (
      NEW.investor_id,
      NEW.fund_id,
      v_delta,
      CASE
        WHEN NEW.type = 'DEPOSIT' THEN ABS(NEW.amount)
        WHEN NEW.type IN ('ADJUSTMENT') AND NEW.amount > 0 THEN NEW.amount
        ELSE 0
      END,
      0,
      NEW.fund_class,
      true,
      now()
    )
    ON CONFLICT (investor_id, fund_id)
    DO UPDATE SET
      current_value = investor_positions.current_value + v_delta,
      cost_basis = CASE
        WHEN NEW.type = 'DEPOSIT' THEN investor_positions.cost_basis + ABS(NEW.amount)
        WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(investor_positions.cost_basis - ABS(NEW.amount), 0)
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN investor_positions.cost_basis + NEW.amount
        WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(investor_positions.cost_basis + NEW.amount, 0)
        ELSE investor_positions.cost_basis
      END,
      is_active = true,
      updated_at = now();

    RETURN NEW;

  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.is_voided = false AND NEW.is_voided = true THEN
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value - v_delta,
        cost_basis = CASE
          WHEN NEW.type = 'DEPOSIT' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'WITHDRAWAL' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN GREATEST(cost_basis - NEW.amount, 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN cost_basis + ABS(NEW.amount)
          ELSE cost_basis
        END,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;

    ELSIF OLD.is_voided = true AND NEW.is_voided = false THEN
      v_delta := NEW.amount;
      IF NEW.type = 'WITHDRAWAL' THEN
        v_delta := -1 * ABS(NEW.amount);
      END IF;

      UPDATE investor_positions
      SET
        current_value = current_value + v_delta,
        cost_basis = CASE
          WHEN NEW.type = 'DEPOSIT' THEN cost_basis + ABS(NEW.amount)
          WHEN NEW.type = 'WITHDRAWAL' THEN GREATEST(cost_basis - ABS(NEW.amount), 0)
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount > 0 THEN cost_basis + NEW.amount
          WHEN NEW.type = 'ADJUSTMENT' AND NEW.amount < 0 THEN GREATEST(cost_basis + NEW.amount, 0)
          ELSE cost_basis
        END,
        is_active = true,
        updated_at = now()
      WHERE investor_id = NEW.investor_id AND fund_id = NEW.fund_id;
    END IF;

    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$function$;

-- 3. can_withdraw
CREATE OR REPLACE FUNCTION public.can_withdraw(p_investor_id uuid, p_fund_id uuid, p_amount numeric)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_position record;
  v_reserved numeric(38,18) := 0;
  v_available numeric(38,18) := 0;
BEGIN
  SELECT * INTO v_position
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  IF v_position IS NULL THEN
    RETURN jsonb_build_object('can_withdraw', false, 'reason', 'No position found in this fund');
  END IF;

  SELECT COALESCE(SUM(requested_amount), 0)::numeric(38,18)
  INTO v_reserved
  FROM public.withdrawal_requests
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status IN ('pending', 'approved', 'processing');

  v_available := COALESCE(v_position.current_value, 0)::numeric(38,18) - COALESCE(v_reserved, 0)::numeric(38,18);

  IF p_amount::numeric(38,18) > v_available THEN
    RETURN jsonb_build_object(
      'can_withdraw', false,
      'reason', 'Insufficient available balance (reserved withdrawals pending)',
      'current_value', COALESCE(v_position.current_value, 0),
      'reserved', COALESCE(v_reserved, 0),
      'available', v_available,
      'requested_amount', p_amount
    );
  END IF;

  RETURN jsonb_build_object(
    'can_withdraw', true,
    'current_value', COALESCE(v_position.current_value, 0),
    'reserved', COALESCE(v_reserved, 0),
    'available', v_available
  );
END;
$function$;

-- 4. get_available_balance
CREATE OR REPLACE FUNCTION public.get_available_balance(p_investor_id uuid, p_fund_id uuid)
 RETURNS numeric
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_balance numeric(38,18);
  v_pending numeric(38,18);
BEGIN
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = p_investor_id AND fund_id = p_fund_id;

  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending
  FROM public.withdrawal_requests
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND status IN ('pending', 'approved', 'processing');

  RETURN GREATEST(COALESCE(v_balance, 0) - COALESCE(v_pending, 0), 0);
END;
$function$;

-- 5. get_platform_flow_metrics
CREATE OR REPLACE FUNCTION public.get_platform_flow_metrics(p_days integer DEFAULT 30)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_total_deposits numeric(38,18);
  v_total_withdrawals numeric(38,18);
BEGIN
  SELECT COALESCE(SUM(amount), 0) INTO v_total_deposits 
  FROM public.transactions_v2 
  WHERE type = 'DEPOSIT' AND is_voided = false AND tx_date >= NOW() - (p_days || ' days')::interval;

  SELECT COALESCE(SUM(amount), 0) INTO v_total_withdrawals 
  FROM public.transactions_v2 
  WHERE type = 'WITHDRAWAL' AND is_voided = false AND tx_date >= NOW() - (p_days || ' days')::interval;

  RETURN jsonb_build_object(
    'totalDeposits', v_total_deposits,
    'totalWithdrawals', v_total_withdrawals,
    'netFlow', v_total_deposits - v_total_withdrawals
  );
END;
$function$;

-- 6. validate_yield_parameters
CREATE OR REPLACE FUNCTION public.validate_yield_parameters(p_fund_id uuid, p_yield_date date, p_gross_yield_pct numeric, p_purpose text)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_fund_aum numeric(38,18);
  v_gross_yield numeric(38,18);
  v_errors jsonb := '[]'::jsonb;
  v_warnings jsonb := '[]'::jsonb;
BEGIN
  IF p_gross_yield_pct < 0 THEN
    v_warnings := v_warnings || jsonb_build_object(
      'code', 'NEGATIVE_YIELD',
      'message', 'Negative yield: ' || p_gross_yield_pct || '%. All balances will decrease proportionally. Fees = 0.'
    );
  END IF;

  IF p_gross_yield_pct > 50 THEN
    v_errors := v_errors || jsonb_build_object('code', 'YIELD_TOO_HIGH', 'message', 'Yield percentage exceeds 50% daily maximum');
  ELSIF p_gross_yield_pct > 10 THEN
    v_warnings := v_warnings || jsonb_build_object('code', 'HIGH_YIELD', 'message', 'Yield percentage above 10% - please verify');
  END IF;

  IF p_gross_yield_pct < -50 THEN
    v_errors := v_errors || jsonb_build_object('code', 'YIELD_TOO_LOW', 'message', 'Negative yield exceeds -50% - please verify');
  END IF;

  SELECT aum_value INTO v_fund_aum
  FROM get_funds_aum_snapshot(p_yield_date, p_purpose::aum_purpose)
  WHERE fund_id = p_fund_id;

  IF v_fund_aum IS NULL OR v_fund_aum = 0 THEN
    v_errors := v_errors || jsonb_build_object('code', 'ZERO_AUM', 'message', 'AUM is zero - cannot apply yield');
  END IF;

  IF v_fund_aum IS NOT NULL AND v_fund_aum > 0 THEN
    v_gross_yield := v_fund_aum * (p_gross_yield_pct / 100);
    IF v_gross_yield > 0 AND v_gross_yield < 0.01 THEN
      v_warnings := v_warnings || jsonb_build_object('code', 'SMALL_YIELD', 'message', 'Calculated yield is very small: ' || v_gross_yield::text);
    END IF;
  END IF;

  IF EXISTS (
    SELECT 1 FROM yield_distributions
    WHERE fund_id = p_fund_id AND effective_date = p_yield_date AND purpose = p_purpose AND status = 'applied'
  ) THEN
    v_errors := v_errors || jsonb_build_object('code', 'DUPLICATE', 'message', 'Yield already applied for this date');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM profiles WHERE account_type = 'fees_account') THEN
    v_errors := v_errors || jsonb_build_object('code', 'NO_FEES_ACCOUNT', 'message', 'INDIGO Fees account not found');
  END IF;

  RETURN jsonb_build_object(
    'valid', jsonb_array_length(v_errors) = 0,
    'errors', v_errors,
    'warnings', v_warnings,
    'calculated_yield', v_gross_yield,
    'aum', v_fund_aum
  );
END;
$function$;

-- 7. adjust_investor_position
CREATE OR REPLACE FUNCTION public.adjust_investor_position(p_fund_id uuid, p_investor_id uuid, p_amount numeric, p_tx_date date, p_reason text, p_admin_id uuid DEFAULT NULL::uuid)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_actor uuid;
  v_fund_asset text;
  v_fund_class text;
  v_balance_before numeric(38,18);
  v_balance_after numeric(38,18);
  v_tx_id uuid;
BEGIN
  v_actor := COALESCE(p_admin_id, auth.uid());
  PERFORM pg_advisory_xact_lock(hashtext('position:' || p_investor_id::text), hashtext(p_fund_id::text));
  IF NOT public.is_admin() THEN RETURN jsonb_build_object('success', false, 'error', 'Admin access required'); END IF;
  SELECT asset, fund_class INTO v_fund_asset, v_fund_class FROM funds WHERE id = p_fund_id;
  IF v_fund_asset IS NULL THEN RETURN jsonb_build_object('success', false, 'error', 'Fund not found'); END IF;
  SELECT COALESCE(current_value, 0) INTO v_balance_before FROM investor_positions WHERE investor_id = p_investor_id AND fund_id = p_fund_id FOR UPDATE;
  v_balance_after := COALESCE(v_balance_before, 0) + p_amount;
  IF v_balance_after < 0 THEN RETURN jsonb_build_object('success', false, 'error', 'Adjustment would result in negative balance'); END IF;
  INSERT INTO transactions_v2 (fund_id, investor_id, type, amount, tx_date, asset, fund_class, notes, created_by, is_voided, balance_before, balance_after, source, visibility_scope)
  VALUES (p_fund_id, p_investor_id, 'ADJUSTMENT', p_amount, p_tx_date, v_fund_asset, v_fund_class, p_reason, v_actor, false, v_balance_before, v_balance_after, 'manual_admin', 'investor_visible')
  RETURNING id INTO v_tx_id;
  RETURN jsonb_build_object('success', true, 'transaction_id', v_tx_id, 'balance_after', v_balance_after);
END;
$function$;

-- 8. approve_and_complete_withdrawal
CREATE OR REPLACE FUNCTION public.approve_and_complete_withdrawal(p_request_id uuid, p_processed_amount numeric DEFAULT NULL::numeric, p_tx_hash text DEFAULT NULL::text, p_admin_notes text DEFAULT NULL::text, p_is_full_exit boolean DEFAULT false, p_send_precision integer DEFAULT 3)
 RETURNS jsonb
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_admin_id uuid;
  v_request record;
  v_fund record;
  v_final_amount numeric(38,18);
  v_balance numeric(38,18);
  v_pending_sum numeric(38,18);
  v_tx_id uuid;
  v_reference_id text;
  v_dust numeric(38,18);
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_crystal_result jsonb;
  v_closing_aum numeric(38,18);
  v_tx_date date;
BEGIN
  -- Require admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin access required';
  END IF;
  v_admin_id := auth.uid();

  -- Advisory lock to prevent concurrent operations on same withdrawal
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  -- Fetch and lock the withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND: Withdrawal request % not found', p_request_id;
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'INVALID_STATE: Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  -- Use settlement_date from the withdrawal request, fallback to CURRENT_DATE
  v_tx_date := COALESCE(v_request.settlement_date, CURRENT_DATE);

  -- Get fund details for asset column
  SELECT * INTO v_fund
  FROM public.funds
  WHERE id = v_request.fund_id;

  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'FUND_NOT_FOUND: Fund % not found', v_request.fund_id;
  END IF;

  -- If full exit, auto-crystallize yield first
  IF p_is_full_exit THEN
    BEGIN
      SELECT COALESCE(SUM(ip.current_value), 0) INTO v_closing_aum
      FROM investor_positions ip
      WHERE ip.fund_id = v_request.fund_id AND ip.is_active = true;

      SELECT public.crystallize_yield_before_flow(
        v_request.fund_id,
        v_closing_aum,
        'withdrawal',
        'full-exit:' || p_request_id::text,
        NOW(),
        v_admin_id
      ) INTO v_crystal_result;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Check investor balance (re-read after potential crystallization)
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Investor has no active position in this fund';
  END IF;

  -- Determine final amount
  IF p_is_full_exit THEN
    IF p_processed_amount IS NOT NULL AND p_processed_amount > 0 THEN
      v_final_amount := p_processed_amount;
    ELSE
      v_final_amount := TRUNC(v_balance, p_send_precision);
    END IF;
    v_dust := v_balance - v_final_amount;

    IF v_final_amount > v_balance THEN
      v_final_amount := v_balance;
      v_dust := 0;
    END IF;

    IF v_final_amount <= 0 THEN
      v_dust := v_balance;
      v_final_amount := 0;
    END IF;
  ELSE
    v_final_amount := COALESCE(p_processed_amount, v_request.requested_amount);
    v_dust := 0;
  END IF;

  IF v_final_amount <= 0 AND v_dust <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: No amount to process';
  END IF;

  IF NOT p_is_full_exit AND v_final_amount > v_request.requested_amount THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Processed amount cannot exceed requested amount';
  END IF;

  -- Check for other pending withdrawals (exclude current request)
  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending_sum
  FROM public.withdrawal_requests
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND status IN ('approved', 'processing')
    AND id <> p_request_id;

  IF NOT p_is_full_exit AND v_final_amount > (v_balance - v_pending_sum) THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Amount % exceeds available balance % (position: %, other pending: %)',
      v_final_amount, (v_balance - v_pending_sum), v_balance, v_pending_sum;
  END IF;

  -- Generate deterministic reference ID
  v_reference_id := 'WDR-' || v_request.investor_id || '-' || to_char(v_tx_date, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);

  -- Bypass canonical mutation trigger for direct insert
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Create WITHDRAWAL transaction in ledger (only if send amount > 0)
  IF v_final_amount > 0 THEN
    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source,
      tx_hash
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'WITHDRAWAL',
      -ABS(v_final_amount),
      v_tx_date,
      v_fund.asset,
      v_reference_id,
      COALESCE(p_admin_notes, 'Withdrawal approved and completed'),
      v_admin_id,
      false,
      'investor_visible',
      'rpc_canonical',
      p_tx_hash
    ) RETURNING id INTO v_tx_id;
  END IF;

  -- If full exit with dust, create DUST_SWEEP transactions
  IF p_is_full_exit AND v_dust > 0 THEN
    SELECT id INTO v_fees_account_id
    FROM public.profiles
    WHERE account_type = 'fees_account'
    LIMIT 1;

    IF v_fees_account_id IS NULL THEN
      RAISE EXCEPTION 'FEES_ACCOUNT_NOT_FOUND: No fees_account profile exists';
    END IF;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_request.investor_id,
      'DUST_SWEEP',
      -ABS(v_dust),
      v_tx_date,
      v_fund.asset,
      'dust-sweep-' || p_request_id::text,
      'Full exit dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_tx_id;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id,
      v_fees_account_id,
      'DUST_SWEEP',
      ABS(v_dust),
      v_tx_date,
      v_fund.asset,
      'dust-credit-' || p_request_id::text,
      'Dust received from full exit of ' || v_request.investor_id::text,
      v_admin_id,
      false,
      'admin_only',
      'rpc_canonical'
    ) RETURNING id INTO v_dust_credit_tx_id;

    UPDATE public.investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_request.investor_id
      AND fund_id = v_request.fund_id;
  END IF;

  -- Update withdrawal request to completed
  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    approved_amount = v_final_amount,
    approved_by = v_admin_id,
    approved_at = NOW(),
    processed_amount = v_final_amount,
    processed_at = NOW(),
    tx_hash = p_tx_hash,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  -- Audit logging
  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'tx_hash', p_tx_hash,
      'transaction_id', v_tx_id,
      'reference_id', v_reference_id,
      'completed_by', v_admin_id,
      'flow', CASE WHEN p_is_full_exit THEN 'full_exit_dust_sweep' ELSE 'approve_and_complete' END,
      'dust_amount', v_dust,
      'dust_tx_id', v_dust_tx_id,
      'dust_credit_tx_id', v_dust_credit_tx_id,
      'full_exit', p_is_full_exit,
      'send_precision', p_send_precision,
      'settlement_date', v_tx_date
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'reference_id', v_reference_id,
    'processed_amount', v_final_amount,
    'dust_amount', v_dust,
    'dust_tx_id', v_dust_tx_id,
    'full_exit', p_is_full_exit,
    'settlement_date', v_tx_date
  );
END;
$function$;

-- 9. internal_route_to_fees
CREATE OR REPLACE FUNCTION public.internal_route_to_fees(p_from_investor_id uuid, p_fund_id uuid, p_amount numeric, p_effective_date date, p_reason text, p_admin_id uuid, p_transfer_id uuid DEFAULT NULL::uuid)
 RETURNS TABLE(transfer_id uuid, debit_tx_id uuid, credit_tx_id uuid, success boolean, message text)
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_transfer_id uuid := COALESCE(p_transfer_id, gen_random_uuid());
  v_debit_tx_id uuid;
  v_credit_tx_id uuid;
  v_fund record;
  v_fees_account_id uuid;
BEGIN
  IF NOT public.is_admin(p_admin_id) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Admin access required';
    RETURN;
  END IF;

  IF p_amount IS NULL OR p_amount <= 0 THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Amount must be positive';
    RETURN;
  END IF;

  IF check_historical_lock(p_fund_id, p_effective_date) THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'FIRST PRINCIPLES VIOLATION: Cannot route funds on ' || p_effective_date || ' because a subsequent Yield Distribution is locked on the ledger.';
    RETURN;
  END IF;

  SELECT * INTO v_fund FROM public.funds WHERE id = p_fund_id;
  IF NOT FOUND THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Fund not found for ID: ' || COALESCE(p_fund_id::text, 'NULL');
    RETURN;
  END IF;

  SELECT id INTO v_fees_account_id
  FROM public.profiles
  WHERE account_type = 'fees_account'::public.account_type
  ORDER BY created_at ASC
  LIMIT 1;

  IF v_fees_account_id IS NULL THEN
    RETURN QUERY SELECT NULL::uuid, NULL::uuid, NULL::uuid, false, 'Fees account not configured (profiles.account_type=fees_account)';
    RETURN;
  END IF;

  SELECT
    (SELECT id FROM public.transactions_v2 WHERE public.transactions_v2.transfer_id = v_transfer_id AND is_voided = false AND type = 'INTERNAL_WITHDRAWAL'::public.tx_type LIMIT 1),
    (SELECT id FROM public.transactions_v2 WHERE public.transactions_v2.transfer_id = v_transfer_id AND is_voided = false AND type = 'INTERNAL_CREDIT'::public.tx_type LIMIT 1)
  INTO v_debit_tx_id, v_credit_tx_id;

  IF v_debit_tx_id IS NOT NULL OR v_credit_tx_id IS NOT NULL THEN
    RETURN QUERY SELECT v_transfer_id, v_debit_tx_id, v_credit_tx_id, true, 'Transfer already processed';
    RETURN;
  END IF;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    transfer_id, notes, created_by, is_system_generated
  )
  VALUES (
    p_from_investor_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    (-ABS(p_amount))::numeric(38,18),
    'INTERNAL_WITHDRAWAL'::public.tx_type,
    p_effective_date,
    p_effective_date,
    'internal_routing'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    v_transfer_id,
    p_reason,
    p_admin_id,
    true
  )
  RETURNING id INTO v_debit_tx_id;

  INSERT INTO public.transactions_v2 (
    investor_id, fund_id, asset, fund_class, amount, type,
    tx_date, value_date, source, purpose, visibility_scope,
    transfer_id, notes, created_by, is_system_generated
  )
  VALUES (
    v_fees_account_id,
    p_fund_id,
    v_fund.asset,
    v_fund.fund_class,
    ABS(p_amount)::numeric(38,18),
    'INTERNAL_CREDIT'::public.tx_type,
    p_effective_date,
    p_effective_date,
    'internal_routing'::public.tx_source,
    'transaction'::public.aum_purpose,
    'admin_only'::public.visibility_scope,
    v_transfer_id,
    p_reason,
    p_admin_id,
    true
  )
  RETURNING id INTO v_credit_tx_id;

  RETURN QUERY SELECT v_transfer_id, v_debit_tx_id, v_credit_tx_id, true, 'Internal transfer completed successfully';
END;
$function$;

-- 10. reconcile_investor_position_internal
CREATE OR REPLACE FUNCTION public.reconcile_investor_position_internal(p_fund_id uuid, p_investor_id uuid)
 RETURNS void
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_current_value numeric(38,18);
  v_cost_basis numeric(38,18);
  v_realized_pnl numeric(38,18);
BEGIN
  SELECT COALESCE(SUM(amount), 0)
  INTO v_current_value
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  SELECT COALESCE(SUM(
    CASE
      WHEN type IN ('DEPOSIT', 'INTERNAL_CREDIT') THEN amount
      WHEN type IN ('WITHDRAWAL', 'INTERNAL_WITHDRAWAL') THEN amount
      ELSE 0
    END
  ), 0)
  INTO v_cost_basis
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false);

  v_cost_basis := GREATEST(v_cost_basis, 0);

  SELECT COALESCE(SUM(amount), 0)
  INTO v_realized_pnl
  FROM transactions_v2
  WHERE investor_id = p_investor_id
    AND fund_id = p_fund_id
    AND (is_voided IS NULL OR is_voided = false)
    AND type IN ('YIELD', 'IB_CREDIT', 'INTEREST', 'FEE_CREDIT');

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  INSERT INTO investor_positions (
    investor_id, fund_id, cost_basis, current_value, shares, realized_pnl,
    is_active, updated_at
  ) VALUES (
    p_investor_id, p_fund_id, v_cost_basis, v_current_value, v_current_value, v_realized_pnl,
    (v_current_value > 0),
    now()
  ) ON CONFLICT (investor_id, fund_id) DO UPDATE SET
    cost_basis = EXCLUDED.cost_basis,
    current_value = EXCLUDED.current_value,
    shares = EXCLUDED.shares,
    realized_pnl = EXCLUDED.realized_pnl,
    is_active = (EXCLUDED.current_value > 0),
    updated_at = now();
END;
$function$;

-- 11. route_withdrawal_to_fees
CREATE OR REPLACE FUNCTION public.route_withdrawal_to_fees(p_request_id uuid, p_actor_id uuid, p_reason text DEFAULT NULL::text)
 RETURNS boolean
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_withdrawal withdrawal_requests%ROWTYPE;
  v_fees_investor_id uuid;
  v_internal_withdrawal_id uuid;
  v_internal_credit_id uuid;
  v_amount numeric(38,18);
  v_fund_id uuid;
  v_asset text;
BEGIN
  IF p_actor_id IS NULL THEN
    RAISE EXCEPTION 'AUTHENTICATION_REQUIRED: Actor ID must be provided';
  END IF;
  IF NOT public.has_super_admin_role(p_actor_id) THEN
    RAISE EXCEPTION 'Superadmin required for route_withdrawal_to_fees';
  END IF;

  SELECT * INTO v_withdrawal
  FROM withdrawal_requests WHERE id = p_request_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Withdrawal request not found: %', p_request_id;
  END IF;

  IF v_withdrawal.status NOT IN ('approved', 'processing') THEN
    RAISE EXCEPTION 'Withdrawal must be approved or processing. Current: %', v_withdrawal.status;
  END IF;

  SELECT id INTO v_fees_investor_id
  FROM profiles
  WHERE account_type = 'fees_account' AND is_system_account = true
  LIMIT 1;
  IF v_fees_investor_id IS NULL THEN
    RAISE EXCEPTION 'INDIGO FEES account not found.';
  END IF;

  v_amount := COALESCE(v_withdrawal.processed_amount, v_withdrawal.approved_amount, v_withdrawal.requested_amount);
  v_fund_id := v_withdrawal.fund_id;
  SELECT asset INTO v_asset FROM funds WHERE id = v_fund_id;
  IF v_asset IS NULL THEN
    RAISE EXCEPTION 'Fund not found: %', v_fund_id;
  END IF;

  PERFORM set_config('app.canonical_rpc', 'true', true);
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset,
    tx_date, value_date, notes, created_by,
    source, visibility_scope, is_system_generated
  ) VALUES (
    v_withdrawal.investor_id, v_fund_id,
    'INTERNAL_WITHDRAWAL'::tx_type, -1 * v_amount, v_asset,
    CURRENT_DATE, CURRENT_DATE,
    COALESCE(p_reason, 'Routed to INDIGO FEES'),
    p_actor_id, 'rpc_canonical'::tx_source,
    'admin_only'::visibility_scope, true
  ) RETURNING id INTO v_internal_withdrawal_id;

  INSERT INTO transactions_v2 (
    investor_id, fund_id, type, amount, asset,
    tx_date, value_date, notes, created_by,
    source, visibility_scope, is_system_generated
  ) VALUES (
    v_fees_investor_id, v_fund_id,
    'INTERNAL_CREDIT'::tx_type, v_amount, v_asset,
    CURRENT_DATE, CURRENT_DATE,
    COALESCE(p_reason, 'Received from withdrawal routing'),
    p_actor_id, 'rpc_canonical'::tx_source,
    'admin_only'::visibility_scope, true
  ) RETURNING id INTO v_internal_credit_id;

  UPDATE withdrawal_requests
  SET 
    status = 'completed',
    processed_at = NOW(),
    processed_amount = v_amount,
    admin_notes = COALESCE(admin_notes || E'\n', '') || 'Routed to INDIGO FEES: ' || COALESCE(p_reason, 'No reason provided')
  WHERE id = p_request_id;

  INSERT INTO audit_log (
    actor_user, action, entity, entity_id, meta
  ) VALUES (
    p_actor_id,
    'route_to_fees',
    'withdrawal_requests',
    p_request_id,
    jsonb_build_object(
      'withdrawal_id', p_request_id,
      'investor_id', v_withdrawal.investor_id,
      'fees_investor_id', v_fees_investor_id,
      'amount', v_amount,
      'asset', v_asset,
      'internal_withdrawal_id', v_internal_withdrawal_id,
      'internal_credit_id', v_internal_credit_id,
      'reason', p_reason
    )
  );

  RETURN true;
END;
$function$;

-- 12. void_and_reissue_full_exit
CREATE OR REPLACE FUNCTION public.void_and_reissue_full_exit(p_transaction_id uuid, p_new_amount numeric, p_admin_id uuid, p_reason text, p_send_precision integer DEFAULT 3, p_new_date date DEFAULT NULL::date)
 RETURNS json
 LANGUAGE plpgsql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
DECLARE
  v_is_admin boolean;
  v_orig RECORD;
  v_request RECORD;
  v_void_result jsonb;
  v_approve_result jsonb;
  v_request_id uuid;
  v_new_request_id uuid;
  v_balance numeric(38,18);
  v_dust numeric(38,18);
  v_fees_account_id uuid;
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fund RECORD;
  v_effective_date date;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  SELECT is_admin INTO v_is_admin FROM profiles WHERE id = p_admin_id;
  IF NOT COALESCE(v_is_admin, false) THEN
    RAISE EXCEPTION 'Admin privileges required';
  END IF;

  SELECT * INTO v_orig FROM transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN RAISE EXCEPTION 'Transaction not found: %', p_transaction_id; END IF;
  IF v_orig.is_voided THEN RAISE EXCEPTION 'Transaction is already voided'; END IF;
  IF v_orig.type <> 'WITHDRAWAL' THEN RAISE EXCEPTION 'Only WITHDRAWAL transactions supported'; END IF;
  IF p_reason IS NULL OR LENGTH(TRIM(p_reason)) < 10 THEN RAISE EXCEPTION 'Reason must be at least 10 chars'; END IF;

  v_effective_date := COALESCE(p_new_date, v_orig.tx_date);

  PERFORM pg_advisory_xact_lock(hashtext(v_orig.investor_id::text || v_orig.fund_id::text));

  SELECT * INTO v_fund FROM funds WHERE id = v_orig.fund_id;

  SELECT * INTO v_request
  FROM withdrawal_requests
  WHERE investor_id = v_orig.investor_id
    AND fund_id = v_orig.fund_id
    AND status = 'completed'
    AND ABS(EXTRACT(EPOCH FROM (request_date - v_orig.created_at))) < 86400
  ORDER BY request_date DESC LIMIT 1;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'No linked withdrawal_request found. Use simple void-and-reissue.';
  END IF;
  v_request_id := v_request.id;

  v_void_result := void_transaction(p_transaction_id, p_admin_id, 'Full-exit V&R: ' || p_reason);
  IF NOT COALESCE((v_void_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to void original transaction';
  END IF;

  UPDATE investor_positions
  SET is_active = true, updated_at = NOW()
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  UPDATE withdrawal_requests
  SET status = 'cancelled',
      cancellation_reason = 'V&R full-exit correction: ' || TRIM(p_reason),
      cancelled_by = p_admin_id,
      cancelled_at = NOW(),
      updated_at = NOW(),
      version = COALESCE(version, 0) + 1
  WHERE id = v_request_id;

  v_new_request_id := gen_random_uuid();
  INSERT INTO withdrawal_requests (
    id, fund_id, fund_class, investor_id, requested_amount, withdrawal_type,
    status, settlement_date, notes, created_by, updated_at
  ) VALUES (
    v_new_request_id,
    v_request.fund_id,
    v_request.fund_class,
    v_request.investor_id,
    ABS(p_new_amount),
    'full',
    'pending',
    v_effective_date,
    'V&R correction of ' || v_request_id::text || ': ' || TRIM(p_reason),
    p_admin_id,
    NOW()
  );

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  v_approve_result := approve_and_complete_withdrawal(
    p_request_id := v_new_request_id,
    p_processed_amount := ABS(p_new_amount),
    p_tx_hash := NULL,
    p_admin_notes := 'V&R correction: ' || TRIM(p_reason),
    p_is_full_exit := false,
    p_send_precision := p_send_precision
  );

  IF NOT COALESCE((v_approve_result->>'success')::boolean, false) THEN
    RAISE EXCEPTION 'Failed to re-process withdrawal';
  END IF;

  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM investor_positions
  WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;

  v_dust := v_balance;

  IF v_dust > 0 THEN
    SELECT id INTO v_fees_account_id FROM profiles WHERE account_type = 'fees_account' LIMIT 1;

    IF v_fees_account_id IS NOT NULL THEN
      PERFORM set_config('indigo.canonical_rpc', 'true', true);

      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, is_voided, visibility_scope, source
      ) VALUES (
        v_orig.fund_id, v_orig.investor_id, 'DUST_SWEEP', -ABS(v_dust),
        v_effective_date, v_fund.asset,
        'dust-sweep-' || v_new_request_id::text,
        'V&R dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
        p_admin_id, false, 'admin_only', 'rpc_canonical'
      ) RETURNING id INTO v_dust_tx_id;

      INSERT INTO transactions_v2 (
        fund_id, investor_id, type, amount, tx_date, asset,
        reference_id, notes, created_by, is_voided, visibility_scope, source
      ) VALUES (
        v_orig.fund_id, v_fees_account_id, 'DUST_SWEEP', ABS(v_dust),
        v_effective_date, v_fund.asset,
        'dust-credit-' || v_new_request_id::text,
        'Dust received from V&R of ' || v_orig.investor_id::text,
        p_admin_id, false, 'admin_only', 'rpc_canonical'
      ) RETURNING id INTO v_dust_credit_tx_id;

      UPDATE investor_positions
      SET is_active = false, updated_at = NOW()
      WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;
    END IF;
  ELSE
    UPDATE investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_orig.investor_id AND fund_id = v_orig.fund_id;
  END IF;

  INSERT INTO audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES (
    'VOID_AND_REISSUE_FULL_EXIT', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('original_tx_id', p_transaction_id, 'original_amount', v_orig.amount,
      'old_request_id', v_request_id, 'original_date', v_orig.tx_date),
    jsonb_build_object('new_request_id', v_new_request_id, 'new_amount', p_new_amount,
      'new_date', v_effective_date, 'dust_amount', v_dust),
    jsonb_build_object('source', 'void_and_reissue_full_exit_rpc_v4', 'reason', TRIM(p_reason))
  );

  RETURN json_build_object(
    'success', true,
    'voided_tx_id', p_transaction_id,
    'new_tx_id', v_approve_result->>'transaction_id',
    'old_request_id', v_request_id,
    'new_request_id', v_new_request_id,
    'new_processed_amount', ABS(p_new_amount),
    'new_date', v_effective_date,
    'dust_amount', v_dust,
    'message', 'Full-exit withdrawal corrected'
  );
END;
$function$;

-- =============================================
-- PART 2: Rebuild all positions from ledger
-- =============================================
DO $$ 
DECLARE 
  r RECORD; 
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  FOR r IN SELECT DISTINCT investor_id, fund_id FROM transactions_v2 WHERE is_voided = false
  LOOP
    PERFORM recompute_investor_position(r.investor_id, r.fund_id);
  END LOOP;
END $$;

-- =============================================
-- PART 3: Fix BTC withdrawal_requests dates
-- =============================================

-- 964dec83: ledger tx_date = 2024-11-09
UPDATE withdrawal_requests SET
  request_date = '2024-11-09'::timestamptz,
  approved_at = '2024-11-09'::timestamptz,
  processed_at = '2024-11-09'::timestamptz
WHERE id = '964dec83-d675-4539-85ae-67decc425ce4';

-- f78d35be: ledger tx_date = 2024-12-14
UPDATE withdrawal_requests SET
  request_date = '2024-12-14'::timestamptz,
  approved_at = '2024-12-14'::timestamptz,
  processed_at = '2024-12-14'::timestamptz
WHERE id = 'f78d35be-7ddb-4b90-85a7-d8964f19b26a';

-- bc37d3f9: ledger tx_date = 2024-12-15
UPDATE withdrawal_requests SET
  request_date = '2024-12-15'::timestamptz,
  approved_at = '2024-12-15'::timestamptz,
  processed_at = '2024-12-15'::timestamptz
WHERE id = 'bc37d3f9-d306-46d8-81c3-7eac5abd12f5';

-- 7dcf819b: ledger tx_date = 2024-12-15
UPDATE withdrawal_requests SET
  request_date = '2024-12-15'::timestamptz,
  approved_at = '2024-12-15'::timestamptz,
  processed_at = '2024-12-15'::timestamptz
WHERE id = '7dcf819b-6d13-46b0-a0da-84f80ff05655';

-- ed3a039d: ledger tx_date = 2024-12-15
UPDATE withdrawal_requests SET
  request_date = '2024-12-15'::timestamptz,
  approved_at = '2024-12-15'::timestamptz,
  processed_at = '2024-12-15'::timestamptz
WHERE id = 'ed3a039d-0334-4c19-b025-eac0fdcbe6be';
```

## `supabase/migrations/20260327112754_926f81ab-8e4c-4e9d-8b1a-09eac2477bf5.sql`

```sql
-- Fix void_transaction dust cascade: match BOTH frontend and backend reference patterns
-- AND heal ALL fund AUM snapshots globally

-- Step 1: Replace void_transaction with hardened dust cascade
CREATE OR REPLACE FUNCTION public.void_transaction(
  p_transaction_id uuid,
  p_admin_id uuid,
  p_reason text
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tx RECORD;
  v_daily_aum_voided int := 0;
  v_fee_allocations_voided int := 0;
  v_ib_ledger_voided int := 0;
  v_platform_fee_voided int := 0;
  v_yield_events_voided int := 0;
  v_dust_sweeps_voided int := 0;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtext('void_tx'), hashtext(p_transaction_id::text));
  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  IF NOT is_admin() THEN
    RAISE EXCEPTION 'Unauthorized: admin role required';
  END IF;
  IF NOT public.check_is_admin(p_admin_id) THEN
    RAISE EXCEPTION 'Unauthorized: admin privileges required for user %', p_admin_id;
  END IF;

  SELECT * INTO v_tx FROM public.transactions_v2 WHERE id = p_transaction_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Transaction not found: %', p_transaction_id;
  END IF;
  IF v_tx.is_voided THEN
    RAISE EXCEPTION 'Transaction already voided: %', p_transaction_id;
  END IF;

  UPDATE public.transactions_v2
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      voided_by_profile_id = p_admin_id, void_reason = p_reason
  WHERE id = p_transaction_id;

  PERFORM set_config('indigo.canonical_rpc', 'true', true);
  PERFORM set_config('app.canonical_rpc', 'true', true);

  -- CASCADE: fund_daily_aum
  UPDATE public.fund_daily_aum
  SET is_voided = true
  WHERE fund_id = v_tx.fund_id AND is_voided = false AND aum_date = v_tx.tx_date
    AND source IN ('tx_sync', 'tx_position_sync', 'auto_heal_sync', 'trigger:position_sync');
  GET DIAGNOSTICS v_daily_aum_voided = ROW_COUNT;

  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_tx.fund_id, v_tx.tx_date);
  EXCEPTION WHEN OTHERS THEN
    RAISE WARNING 'AUM refresh failed for fund % date %: %', v_tx.fund_id, v_tx.tx_date, SQLERRM;
  END;

  -- CASCADE: fee_allocations
  UPDATE public.fee_allocations
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id, voided_by_profile_id = p_admin_id
  WHERE (credit_transaction_id = p_transaction_id OR debit_transaction_id = p_transaction_id)
    AND is_voided = false;
  GET DIAGNOSTICS v_fee_allocations_voided = ROW_COUNT;

  -- CASCADE: ib_commission_ledger
  UPDATE public.ib_commission_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_ib_ledger_voided = ROW_COUNT;

  -- CASCADE: platform_fee_ledger
  UPDATE public.platform_fee_ledger
  SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
      void_reason = 'Cascade void: tx ' || p_transaction_id::text
  WHERE transaction_id = p_transaction_id AND is_voided = false;
  GET DIAGNOSTICS v_platform_fee_voided = ROW_COUNT;

  -- CASCADE: investor_yield_events (guarded)
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE public.investor_yield_events
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id
    WHERE (trigger_transaction_id = p_transaction_id OR reference_id = v_tx.reference_id)
      AND is_voided = false;
    GET DIAGNOSTICS v_yield_events_voided = ROW_COUNT;
  END IF;

  -- CASCADE: DUST transactions (BOTH frontend and backend patterns)
  -- Frontend creates: type=DUST_SWEEP, reference_id LIKE 'dust-sweep-%' / 'dust-credit-%'
  -- Backend (complete_withdrawal) creates: type=DUST_SWEEP ref='DUST_SWEEP_OUT:*', type=DUST ref='DUST_RECV:*'
  IF v_tx.type = 'WITHDRAWAL' THEN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);
    PERFORM set_config('app.canonical_rpc', 'true', true);

    UPDATE public.transactions_v2
    SET is_voided = true, voided_at = now(), voided_by = p_admin_id,
        voided_by_profile_id = p_admin_id,
        void_reason = 'Cascade void: dust for withdrawal ' || p_transaction_id::text
    WHERE type IN ('DUST_SWEEP', 'DUST')
      AND fund_id = v_tx.fund_id
      AND tx_date = v_tx.tx_date
      AND is_voided = false
      AND (
        -- Frontend pattern (useTransactionSubmit)
        reference_id LIKE 'dust-sweep-%' OR reference_id LIKE 'dust-credit-%'
        -- Backend pattern (complete_withdrawal / approve_and_complete_withdrawal)
        OR reference_id LIKE 'DUST_SWEEP_OUT:%' OR reference_id LIKE 'DUST_RECV:%'
      )
      AND (
        investor_id = v_tx.investor_id
        OR reference_id LIKE 'dust-credit-%'
        OR reference_id LIKE 'DUST_RECV:%'
      );
    GET DIAGNOSTICS v_dust_sweeps_voided = ROW_COUNT;
  END IF;

  INSERT INTO public.audit_log (action, entity, entity_id, actor_user, old_values, new_values, meta)
  VALUES ('VOID', 'transactions_v2', p_transaction_id::text, p_admin_id,
    jsonb_build_object('is_voided', false, 'type', v_tx.type, 'amount', v_tx.amount),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason, 'voided_at', now(),
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'dust_sweeps_voided', v_dust_sweeps_voided),
    jsonb_build_object('source', 'void_transaction_rpc'));

  RETURN jsonb_build_object(
    'success', true,
    'message', 'Transaction voided successfully',
    'transaction_id', p_transaction_id,
    'cascade_summary', jsonb_build_object(
      'daily_aum_voided', v_daily_aum_voided,
      'fee_allocations_voided', v_fee_allocations_voided,
      'ib_ledger_voided', v_ib_ledger_voided,
      'platform_fee_voided', v_platform_fee_voided,
      'yield_events_voided', v_yield_events_voided,
      'dust_sweeps_voided', v_dust_sweeps_voided
    )
  );
END;
$$;

-- Step 2: Global AUM snapshot heal for ALL active funds
DO $$
DECLARE
  v_row RECORD;
  v_result jsonb;
  v_count int := 0;
BEGIN
  FOR v_row IN
    SELECT DISTINCT f.id as fund_id, d.aum_date
    FROM funds f
    JOIN fund_daily_aum d ON d.fund_id = f.id AND d.is_voided = false
    WHERE f.status = 'active'
    ORDER BY d.aum_date
  LOOP
    v_result := recalculate_fund_aum_for_date(v_row.fund_id, v_row.aum_date);
    v_count := v_count + 1;
  END LOOP;
  RAISE NOTICE 'Healed % AUM snapshots across all active funds', v_count;
END;
$$;
```

## `supabase/migrations/20260327113803_09bc0975-f7f5-4c0f-a3a9-dc4486bd9ed1.sql`

```sql
-- =============================================================================
-- 360 AUDIT REMEDIATION: P0 + P1 + P2 fixes
-- =============================================================================

-- =============================================================================
-- 1. P0: Fix void_yield_distribution - IF EXISTS guards for dropped tables,
--    add position recomputation, add IB_CREDIT fallback void
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."void_yield_distribution"(
  "p_distribution_id" "uuid",
  "p_admin_id" "uuid",
  "p_reason" "text" DEFAULT 'Administrative void'::"text",
  "p_void_crystals" boolean DEFAULT false
) RETURNS json
LANGUAGE "plpgsql" SECURITY DEFINER
SET "search_path" TO 'public'
AS $$
DECLARE
  v_dist RECORD;
  v_voided_txs int := 0;
  v_voided_allocs int := 0;
  v_voided_crystals int := 0;
  v_crystal RECORD;
  v_tx RECORD;
  v_affected_investor RECORD;
BEGIN
  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  -- Advisory lock to prevent concurrent void of the same distribution
  PERFORM pg_advisory_xact_lock(hashtext('void_yd:' || p_distribution_id::text));

  SELECT * INTO v_dist FROM yield_distributions WHERE id = p_distribution_id;
  IF v_dist IS NULL THEN RAISE EXCEPTION 'Distribution not found: %', p_distribution_id; END IF;
  IF v_dist.is_voided THEN RETURN json_build_object('success', true, 'message', 'Already voided'); END IF;

  IF p_void_crystals THEN
    FOR v_crystal IN SELECT id, effective_date FROM yield_distributions WHERE consolidated_into_id = p_distribution_id AND NOT is_voided
    LOOP
      -- P0 FIX: Guard against dropped investor_yield_events table
      IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
        UPDATE investor_yield_events SET is_voided = true
        WHERE reference_id LIKE 'YLD:' || v_dist.fund_id || ':' || v_crystal.effective_date::text || ':%'
          AND is_voided = false;
      END IF;
      -- P0 FIX: fund_aum_events view was dropped -- skip entirely

      UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id,
        void_reason = 'Cascade void from distribution ' || p_distribution_id::text,
        consolidated_into_id = NULL
      WHERE id = v_crystal.id;
      v_voided_crystals := v_voided_crystals + 1;
    END LOOP;
  ELSE
    UPDATE yield_distributions SET consolidated_into_id = NULL WHERE consolidated_into_id = p_distribution_id AND NOT is_voided;
  END IF;

  -- Void YIELD transactions
  FOR v_tx IN SELECT id, investor_id, amount FROM transactions_v2
    WHERE (reference_id LIKE 'yield_adb_' || p_distribution_id::text || '_%'
        OR reference_id LIKE 'yield_v5_' || p_distribution_id::text || '_%')
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void FEE_CREDIT transactions
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (reference_id = 'fee_credit_' || p_distribution_id::text
        OR reference_id = 'fee_credit_v5_' || p_distribution_id::text)
      AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  -- Void IB_CREDIT transactions (pattern match + fallback by distribution_id)
  FOR v_tx IN SELECT id FROM transactions_v2
    WHERE (
      reference_id LIKE 'ib_credit_' || p_distribution_id::text || '_%'
      OR reference_id LIKE 'ib_credit_v5_' || p_distribution_id::text || '_%'
      -- P1 FIX: Fallback catch-all for IB_CREDIT by distribution_id
      OR (distribution_id = p_distribution_id AND type = 'IB_CREDIT')
    )
    AND NOT is_voided
  LOOP
    UPDATE transactions_v2 SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id WHERE id = v_tx.id;
    v_voided_txs := v_voided_txs + 1;
  END LOOP;

  UPDATE platform_fee_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_commission_ledger SET is_voided = true WHERE yield_distribution_id = p_distribution_id AND NOT is_voided;
  UPDATE ib_allocations SET is_voided = true WHERE distribution_id = p_distribution_id AND NOT is_voided;

  UPDATE yield_distributions SET is_voided = true, voided_at = NOW(), voided_by = p_admin_id, void_reason = p_reason WHERE id = p_distribution_id;

  -- P0 FIX: Guard against dropped investor_yield_events table
  IF EXISTS (SELECT FROM pg_tables WHERE schemaname = 'public' AND tablename = 'investor_yield_events') THEN
    UPDATE investor_yield_events SET is_voided = true
    WHERE trigger_transaction_id IN (SELECT id FROM transactions_v2 WHERE distribution_id = p_distribution_id AND is_voided = true)
      AND NOT is_voided;
  END IF;

  -- P2 FIX: Recompute positions for all affected investors
  FOR v_affected_investor IN
    SELECT DISTINCT investor_id FROM transactions_v2
    WHERE distribution_id = p_distribution_id
      AND investor_id IS NOT NULL
  LOOP
    PERFORM recompute_investor_position(v_affected_investor.investor_id, v_dist.fund_id);
  END LOOP;

  -- Recompute AUM for the distribution's effective date
  BEGIN
    PERFORM recalculate_fund_aum_for_date(v_dist.fund_id, v_dist.effective_date);
  EXCEPTION WHEN OTHERS THEN
    -- Non-fatal: AUM refresh is best-effort
    NULL;
  END;

  INSERT INTO audit_log (actor_user, action, entity, entity_id, old_values, new_values, meta) VALUES (
    p_admin_id, 'YIELD_DISTRIBUTION_VOIDED', 'yield_distributions', p_distribution_id::text,
    jsonb_build_object('status', v_dist.status, 'gross_yield', v_dist.gross_yield),
    jsonb_build_object('is_voided', true, 'void_reason', p_reason),
    jsonb_build_object('voided_txs', v_voided_txs, 'voided_crystals', v_voided_crystals, 'void_crystals_requested', p_void_crystals, 'fund_id', v_dist.fund_id)
  );

  RETURN json_build_object('success', true, 'distribution_id', p_distribution_id, 'voided_transactions', v_voided_txs, 'voided_crystals', v_voided_crystals);
END;
$$;

-- =============================================================================
-- 2. P1: Upgrade approve_and_complete_withdrawal precision to numeric(38,18)
-- =============================================================================
CREATE OR REPLACE FUNCTION "public"."approve_and_complete_withdrawal"("p_request_id" "uuid", "p_processed_amount" numeric DEFAULT NULL::numeric, "p_tx_hash" "text" DEFAULT NULL::"text", "p_admin_notes" "text" DEFAULT NULL::"text", "p_is_full_exit" boolean DEFAULT false, "p_send_precision" integer DEFAULT 3) RETURNS "jsonb"
    LANGUAGE "plpgsql" SECURITY DEFINER
    SET "search_path" TO 'public'
    AS $$
DECLARE
  v_admin_id uuid;
  v_request record;
  v_fund record;
  v_final_amount numeric(38,18);
  v_balance numeric(38,18);
  v_pending_sum numeric(38,18);
  v_tx_id uuid;
  v_reference_id text;
  v_dust numeric(38,18);
  v_dust_tx_id uuid;
  v_dust_credit_tx_id uuid;
  v_fees_account_id uuid;
  v_crystal_result jsonb;
  v_closing_aum numeric(38,18);
  v_tx_date date;
BEGIN
  -- Require admin
  IF NOT public.is_admin() THEN
    RAISE EXCEPTION 'UNAUTHORIZED: Admin access required';
  END IF;
  v_admin_id := auth.uid();

  -- Advisory lock to prevent concurrent operations on same withdrawal
  PERFORM pg_advisory_xact_lock(hashtext('withdrawal:' || p_request_id::text));

  -- Fetch and lock the withdrawal request
  SELECT * INTO v_request
  FROM public.withdrawal_requests
  WHERE id = p_request_id
  FOR UPDATE;

  IF v_request IS NULL THEN
    RAISE EXCEPTION 'WITHDRAWAL_NOT_FOUND: Withdrawal request % not found', p_request_id;
  END IF;

  IF v_request.status <> 'pending' THEN
    RAISE EXCEPTION 'INVALID_STATE: Can only approve pending requests. Current status: %', v_request.status;
  END IF;

  -- Use settlement_date from the withdrawal request, fallback to CURRENT_DATE
  v_tx_date := COALESCE(v_request.settlement_date, CURRENT_DATE);

  -- Get fund details for asset column
  SELECT * INTO v_fund
  FROM public.funds
  WHERE id = v_request.fund_id;

  IF v_fund IS NULL THEN
    RAISE EXCEPTION 'FUND_NOT_FOUND: Fund % not found', v_request.fund_id;
  END IF;

  -- If full exit, auto-crystallize yield first
  IF p_is_full_exit THEN
    BEGIN
      SELECT COALESCE(SUM(ip.current_value), 0) INTO v_closing_aum
      FROM investor_positions ip
      WHERE ip.fund_id = v_request.fund_id AND ip.is_active = true;

      SELECT public.crystallize_yield_before_flow(
        v_request.fund_id,
        v_closing_aum,
        'withdrawal',
        'full-exit:' || p_request_id::text,
        NOW(),
        v_admin_id
      ) INTO v_crystal_result;
    EXCEPTION WHEN OTHERS THEN
      NULL;
    END;
  END IF;

  -- Check investor balance (re-read after potential crystallization)
  SELECT COALESCE(current_value, 0) INTO v_balance
  FROM public.investor_positions
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id;

  IF v_balance IS NULL OR v_balance <= 0 THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Investor has no active position in this fund';
  END IF;

  -- Determine final amount
  IF p_is_full_exit THEN
    IF p_processed_amount IS NOT NULL AND p_processed_amount > 0 THEN
      v_final_amount := p_processed_amount;
    ELSE
      v_final_amount := TRUNC(v_balance, p_send_precision);
    END IF;
    v_dust := v_balance - v_final_amount;

    IF v_final_amount > v_balance THEN
      v_final_amount := v_balance;
      v_dust := 0;
    END IF;

    IF v_final_amount <= 0 THEN
      v_dust := v_balance;
      v_final_amount := 0;
    END IF;
  ELSE
    v_final_amount := COALESCE(p_processed_amount, v_request.requested_amount);
    v_dust := 0;
  END IF;

  IF v_final_amount <= 0 AND v_dust <= 0 THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: No amount to process';
  END IF;

  IF NOT p_is_full_exit AND v_final_amount > v_request.requested_amount THEN
    RAISE EXCEPTION 'INVALID_AMOUNT: Processed amount cannot exceed requested amount';
  END IF;

  SELECT COALESCE(SUM(requested_amount), 0) INTO v_pending_sum
  FROM public.withdrawal_requests
  WHERE investor_id = v_request.investor_id
    AND fund_id = v_request.fund_id
    AND status IN ('approved', 'processing')
    AND id <> p_request_id;

  IF NOT p_is_full_exit AND v_final_amount > (v_balance - v_pending_sum) THEN
    RAISE EXCEPTION 'INSUFFICIENT_BALANCE: Amount % exceeds available balance % (position: %, other pending: %)',
      v_final_amount, (v_balance - v_pending_sum), v_balance, v_pending_sum;
  END IF;

  v_reference_id := 'WDR-' || v_request.investor_id || '-' || to_char(v_tx_date, 'YYYYMMDD') || '-' || substr(md5(random()::text), 1, 8);

  PERFORM set_config('indigo.canonical_rpc', 'true', true);

  IF v_final_amount > 0 THEN
    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source,
      tx_hash
    ) VALUES (
      v_request.fund_id, v_request.investor_id, 'WITHDRAWAL',
      -ABS(v_final_amount), v_tx_date, v_fund.asset,
      v_reference_id, COALESCE(p_admin_notes, 'Withdrawal approved and completed'),
      v_admin_id, false, 'investor_visible', 'rpc_canonical', p_tx_hash
    ) RETURNING id INTO v_tx_id;
  END IF;

  IF p_is_full_exit AND v_dust > 0 THEN
    SELECT id INTO v_fees_account_id
    FROM public.profiles
    WHERE account_type = 'fees_account'
    LIMIT 1;

    IF v_fees_account_id IS NULL THEN
      RAISE EXCEPTION 'FEES_ACCOUNT_NOT_FOUND: No fees_account profile exists';
    END IF;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id, v_request.investor_id, 'DUST_SWEEP',
      -ABS(v_dust), v_tx_date, v_fund.asset,
      'dust-sweep-' || p_request_id::text,
      'Full exit dust routed to INDIGO Fees (' || v_dust::text || ' ' || v_fund.asset || ')',
      v_admin_id, false, 'admin_only', 'rpc_canonical'
    ) RETURNING id INTO v_dust_tx_id;

    INSERT INTO public.transactions_v2 (
      fund_id, investor_id, type, amount, tx_date, asset,
      reference_id, notes, created_by, is_voided, visibility_scope, source
    ) VALUES (
      v_request.fund_id, v_fees_account_id, 'DUST_SWEEP',
      ABS(v_dust), v_tx_date, v_fund.asset,
      'dust-credit-' || p_request_id::text,
      'Dust received from full exit of ' || v_request.investor_id::text,
      v_admin_id, false, 'admin_only', 'rpc_canonical'
    ) RETURNING id INTO v_dust_credit_tx_id;

    UPDATE public.investor_positions
    SET is_active = false, updated_at = NOW()
    WHERE investor_id = v_request.investor_id
      AND fund_id = v_request.fund_id;
  END IF;

  UPDATE public.withdrawal_requests
  SET
    status = 'completed',
    approved_amount = v_final_amount,
    approved_by = v_admin_id,
    approved_at = NOW(),
    processed_amount = v_final_amount,
    processed_at = NOW(),
    tx_hash = p_tx_hash,
    admin_notes = COALESCE(p_admin_notes, admin_notes),
    updated_at = NOW(),
    version = COALESCE(version, 0) + 1
  WHERE id = p_request_id;

  PERFORM public.log_withdrawal_action(
    p_request_id,
    'complete',
    jsonb_build_object(
      'processed_amount', v_final_amount,
      'requested_amount', v_request.requested_amount,
      'tx_hash', p_tx_hash,
      'transaction_id', v_tx_id,
      'reference_id', v_reference_id,
      'completed_by', v_admin_id,
      'flow', CASE WHEN p_is_full_exit THEN 'full_exit_dust_sweep' ELSE 'approve_and_complete' END,
      'dust_amount', v_dust,
      'dust_tx_id', v_dust_tx_id,
      'dust_credit_tx_id', v_dust_credit_tx_id,
      'full_exit', p_is_full_exit,
      'send_precision', p_send_precision,
      'settlement_date', v_tx_date
    )
  );

  RETURN jsonb_build_object(
    'success', true,
    'transaction_id', v_tx_id,
    'reference_id', v_reference_id,
    'processed_amount', v_final_amount,
    'dust_amount', v_dust,
    'dust_tx_id', v_dust_tx_id,
    'full_exit', p_is_full_exit,
    'settlement_date', v_tx_date
  );
END;
$$;

-- =============================================================================
-- 3. P2: Add advisory lock to recalculate_fund_aum_for_date
-- =============================================================================
CREATE OR REPLACE FUNCTION public.recalculate_fund_aum_for_date(
    p_fund_id uuid,
    p_target_date date
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO 'public'
AS $function$
DECLARE
    v_position_sum numeric;
    v_rows_affected int;
BEGIN
    PERFORM set_config('indigo.canonical_rpc', 'true', true);

    -- P2 FIX: Advisory lock to prevent concurrent AUM recalculation for same fund+date
    PERFORM pg_advisory_xact_lock(hashtext('aum:' || p_fund_id::text || ':' || p_target_date::text));

    SELECT COALESCE(SUM(current_value), 0)
    INTO v_position_sum
    FROM investor_positions
    WHERE fund_id = p_fund_id AND is_active = true;

    INSERT INTO fund_daily_aum (fund_id, aum_date, total_aum, purpose, source, created_by, is_month_end)
    VALUES (
        p_fund_id,
        p_target_date,
        v_position_sum,
        'transaction'::aum_purpose,
        'position_recompute',
        auth.uid(),
        (extract(day from (p_target_date + interval '1 day')) = 1)
    )
    ON CONFLICT (fund_id, aum_date, purpose)
    WHERE NOT is_voided
    DO UPDATE SET
        total_aum = EXCLUDED.total_aum,
        source = 'position_recompute',
        updated_at = now();

    GET DIAGNOSTICS v_rows_affected = ROW_COUNT;

    RETURN json_build_object(
        'success', true,
        'fund_id', p_fund_id,
        'target_date', p_target_date,
        'computed_aum', v_position_sum,
        'rows_affected', v_rows_affected
    );
END;
$function$;
```
