/**
 * RPC Function Signatures Contract
 * AUTO-GENERATED - DO NOT EDIT
 *
 * Provides metadata for all RPC functions including:
 * - Function categorization (read/write/system)
 * - Canonical mutation identification
 * - Parameter validation hints
 *
 * Regenerate with: npm run contracts:generate
 */

import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// RPC FUNCTION NAMES
// =============================================================================

/**
 * All RPC functions available in the database
 */
export const RPC_FUNCTIONS = [
  // Integrity & Health
  "run_integrity_check",
  "check_system_integrity",
  "run_comprehensive_health_check",
  "run_daily_health_check",
  "run_data_integrity_check",
  "system_health_check",
  "check_approval_integrity",
  "check_aum_reconciliation",
  "validate_aum_matches_positions",
  "validate_aum_matches_positions_strict",
  "verify_aum_purpose_usage",
  "verify_yield_distribution_balance",

  // Canonical Mutations - DEPOSITS/WITHDRAWALS
  "apply_deposit_with_crystallization",
  "apply_withdrawal_with_crystallization",
  "complete_withdrawal",
  "approve_withdrawal",
  "reject_withdrawal",
  "create_withdrawal_request",
  "cancel_withdrawal_by_admin",
  "route_withdrawal_to_fees",
  "start_processing_withdrawal",

  // Canonical Mutations - YIELD
  "apply_daily_yield_to_fund_v3",
  "preview_daily_yield_to_fund_v3",
  "apply_yield_correction_v2",
  "preview_yield_correction_v2",
  "crystallize_yield_before_flow",
  "crystallize_month_end",
  // P2-02 removed: crystallize_pending_movements (unused, superseded by crystallize_yield_before_flow)
  "void_yield_distribution",
  "void_investor_yield_events_for_distribution",

  // Canonical Mutations - TRANSACTIONS
  "admin_create_transaction",
  "admin_create_transactions_batch",
  "adjust_investor_position",
  "void_transaction",
  "void_transaction_with_approval",
  "void_and_reissue_transaction",
  "delete_transaction",
  "edit_transaction",
  "update_transaction",

  // Position Management
  "recompute_investor_position",
  "recompute_investor_positions_for_investor",
  "reconcile_investor_position",
  "reconcile_all_positions",
  "repair_all_positions",
  "cleanup_dormant_positions",

  // AUM Management
  "set_fund_daily_aum",
  "update_fund_daily_aum",
  "update_fund_daily_aum_with_recalc",
  "void_fund_daily_aum",
  "sync_aum_to_positions",
  "recalculate_fund_aum_for_date",
  "recalculate_all_aum",
  "ensure_preflow_aum",
  "upsert_fund_aum_after_yield",
  "check_and_fix_aum_integrity",
  "check_aum_exists_for_date",
  "get_fund_aum_as_of",
  "get_transaction_aum",
  "check_all_funds_transaction_aum",
  "cleanup_duplicate_preflow_aum",

  // Fund Operations
  "add_fund_to_investor",
  "batch_crystallize_fund",
  "update_fund_aum_baseline",
  "fund_period_return",
  "get_fund_base_asset",
  "get_fund_composition",
  "get_fund_nav_history",
  "get_fund_net_flows",
  "get_funds_with_aum",
  "update_investor_aum_percentages",

  // Investor Operations
  // NOTE: P1-04 removed dead RPCs: get_all_investors_with_details, get_all_non_admin_profiles,
  // get_profile_by_id, get_investor_portfolio_summary (never called from frontend)
  "get_investor_period_summary",
  "get_investor_position_as_of",
  "get_investor_positions_by_class",
  "get_investor_yield_events_in_range",
  "force_delete_investor",
  "can_access_investor",
  "get_available_balance",
  "can_withdraw",
  "preview_investor_balances",
  "get_position_at_date",
  "get_all_positions_at_date",
  "get_position_reconciliation",

  // Approval System
  "request_approval",
  "approve_request",
  "reject_request",
  "has_valid_approval",
  "get_pending_approval",
  "get_approval_threshold",
  "requires_dual_approval",
  "cleanup_expired_approvals",
  "request_staging_promotion_approval",
  "approve_staging_promotion",
  "reject_staging_promotion",
  "list_pending_staging_approvals",

  // Period & Statement Management
  "finalize_statement_period",
  "lock_accounting_period",
  "lock_period_with_approval",
  "lock_fund_period_snapshot",
  "unlock_fund_period_snapshot",
  "is_period_locked",
  "generate_fund_period_snapshot",
  "get_period_ownership",
  "get_statement_period_summary",
  "get_statement_signed_url",
  "create_daily_position_snapshot",
  "generate_statement_path",

  // Report & Delivery
  "dispatch_report_delivery_run",
  "queue_statement_deliveries",
  "acquire_delivery_batch",
  "mark_delivery_result",
  "mark_sent_manually",
  "cancel_delivery",
  "retry_delivery",
  "requeue_stale_sending",
  "get_delivery_stats",
  "get_report_statistics",
  "get_user_reports",
  "get_reporting_eligible_investors",

  // Reconciliation
  "generate_reconciliation_pack",
  "finalize_reconciliation_pack",
  "has_finalized_recon_pack",
  "reconcile_fund_period",
  "calculate_reconciliation_tolerance",
  "rebuild_investor_period_balances",

  // Staging & Import
  "validate_staging_batch",
  "validate_staging_row",
  "promote_staging_batch",
  "generate_staging_preview_report",
  "process_excel_import_with_classes",
  "lock_imports",
  "unlock_imports",
  "is_import_enabled",

  // Authentication & Security
  "is_admin",
  "is_admin_safe",
  "is_admin_for_jwt",
  "is_super_admin",
  "has_super_admin_role",
  "check_is_admin",
  "ensure_admin",
  "require_super_admin",
  "has_role",
  "get_user_admin_status",
  "current_user_is_admin_or_owner",
  "is_ib",
  "is_2fa_required",
  "is_valid_share_token",
  "encrypt_totp_secret",
  "decrypt_totp_secret",

  // MFA Management
  "request_mfa_reset",
  "approve_mfa_reset",
  "reject_mfa_reset",
  "mark_mfa_reset_executed",
  "can_execute_mfa_reset",

  // Admin & User Management
  "create_admin_invite",
  "validate_invite_code",
  "use_invite_code",
  "update_admin_role",
  "update_user_profile_secure",
  "merge_duplicate_profiles",
  // P1-04 removed: get_profile_by_id (never called from frontend)
  "get_admin_name",

  // Audit & Logging
  "log_audit_event",
  "log_financial_operation",
  "log_security_event",
  "log_access_event",
  "log_withdrawal_action",
  "log_ledger_mismatches",

  // Locking & Concurrency
  "acquire_position_lock",
  "acquire_withdrawal_lock",
  "acquire_yield_lock",

  // Rate Limiting
  "check_rate_limit",
  "check_rate_limit_with_config",

  // System Configuration
  "get_system_mode",
  "get_dust_tolerance_for_fund",
  "get_all_dust_tolerances",
  "update_dust_tolerance",

  // Validation
  "validate_yield_distribution_prerequisites",
  "validate_yield_parameters",
  "validate_yield_rate_sanity",
  "validate_yield_temporal_lock",
  "validate_transaction_aum_exists",
  "is_within_edit_window",

  // Utility Functions
  "build_error_response",
  "build_success_response",
  "raise_platform_error",
  "parse_platform_error",
  "compute_jsonb_delta",
  "compute_correction_input_hash",
  "generate_document_path",
  "_resolve_investor_fee_pct",

  // Yield Distribution Processing
  "process_yield_distribution",
  "process_yield_distribution_with_dust",
  "finalize_month_yield",
  // P2-02 removed: backfill_yield_summaries (never called from frontend)
  "refresh_yield_materialized_views",
  "get_yield_corrections",
  "rollback_yield_correction",
  "regenerate_reports_for_correction",

  // Impact Preview
  "get_void_transaction_impact",
  "get_void_yield_impact",

  // Health & Notifications
  "get_health_trend",
  "get_latest_health_status",
  "can_access_notification",
  "send_daily_rate_notifications",

  // Internal Operations
  "internal_route_to_fees",
  // P2-03 removed: handle_ledger_transaction (deprecated, raises exception)

  // Materialized Views
  "refresh_materialized_view_concurrently",

  // Duplicate Checks
  "check_duplicate_ib_allocations",
  "check_duplicate_transaction_refs",

  // Data Reset (Super Admin Only)
  "reset_all_data_keep_profiles",
  "reset_all_investor_positions",

  // Historical Data
  "get_historical_nav",
  "get_monthly_platform_aum",
  "get_existing_preflow_aum",

  // Test Functions
  "test_profiles_access",
] as const;

export type RPCFunctionName = (typeof RPC_FUNCTIONS)[number];

// =============================================================================
// CANONICAL MUTATION RPCs
// =============================================================================

/**
 * Canonical mutations that MUST be used instead of direct table writes.
 * Direct inserts/updates to these tables are FORBIDDEN.
 */
export const CANONICAL_MUTATION_RPCS = {
  // Deposits/Withdrawals - Use these instead of direct transactions_v2 inserts
  DEPOSIT: "apply_deposit_with_crystallization",
  WITHDRAWAL: "apply_withdrawal_with_crystallization",

  // Yield - Use these instead of direct yield_distributions inserts
  YIELD_APPLY: "apply_daily_yield_to_fund_v3",
  YIELD_PREVIEW: "preview_daily_yield_to_fund_v3",
  YIELD_CORRECTION: "apply_yield_correction_v2",

  // Transaction Mutations
  TX_CREATE: "admin_create_transaction",
  TX_BATCH: "admin_create_transactions_batch",
  TX_VOID: "void_transaction",
  TX_EDIT: "edit_transaction",

  // AUM - Use these instead of direct fund_daily_aum inserts
  AUM_SET: "set_fund_daily_aum",
  AUM_UPDATE: "update_fund_daily_aum",
  AUM_VOID: "void_fund_daily_aum",

  // Position Adjustments
  POSITION_ADJUST: "adjust_investor_position",
  POSITION_RECONCILE: "reconcile_investor_position",

  // Crystallization
  CRYSTALLIZE_YIELD: "crystallize_yield_before_flow",
  CRYSTALLIZE_MONTH_END: "crystallize_month_end",
} as const;

/**
 * Tables that should ONLY be modified through canonical RPCs
 */
export const PROTECTED_TABLES = [
  "transactions_v2",
  "yield_distributions",
  "fund_aum_events",
  "fund_daily_aum",
  "investor_positions",
] as const;

export type ProtectedTable = (typeof PROTECTED_TABLES)[number];

// =============================================================================
// RPC CATEGORIES
// =============================================================================

/**
 * Read-only RPCs (no side effects, safe to retry)
 */
export const READ_ONLY_RPCS = [
  "run_integrity_check",
  "check_system_integrity",
  "run_comprehensive_health_check",
  "run_daily_health_check",
  "run_data_integrity_check",
  "system_health_check",
  "check_approval_integrity",
  "check_aum_reconciliation",
  "validate_aum_matches_positions",
  "validate_aum_matches_positions_strict",
  "verify_aum_purpose_usage",
  "verify_yield_distribution_balance",
  "preview_daily_yield_to_fund_v3",
  "preview_yield_correction_v2",
  "preview_investor_balances",
  "get_fund_aum_as_of",
  "get_transaction_aum",
  "get_fund_base_asset",
  "get_fund_composition",
  "get_fund_nav_history",
  "get_fund_net_flows",
  "get_funds_with_aum",
  "get_investor_period_summary",
  // P1-04 removed: get_investor_portfolio_summary, get_all_investors_with_details, get_all_non_admin_profiles
  "get_investor_position_as_of",
  "get_investor_positions_by_class",
  "get_investor_yield_events_in_range",
  "get_available_balance",
  "can_withdraw",
  "get_position_at_date",
  "get_all_positions_at_date",
  "get_position_reconciliation",
  "get_pending_approval",
  "get_approval_threshold",
  "requires_dual_approval",
  "has_valid_approval",
  "get_period_ownership",
  "get_statement_period_summary",
  "get_delivery_stats",
  "get_report_statistics",
  "get_user_reports",
  "get_reporting_eligible_investors",
  "has_finalized_recon_pack",
  "is_admin",
  "is_admin_safe",
  "is_admin_for_jwt",
  "is_super_admin",
  "has_super_admin_role",
  "check_is_admin",
  "has_role",
  "get_user_admin_status",
  "current_user_is_admin_or_owner",
  "is_ib",
  "is_2fa_required",
  "is_valid_share_token",
  "can_execute_mfa_reset",
  // P1-04 removed: get_profile_by_id
  "get_admin_name",
  "is_period_locked",
  "is_import_enabled",
  "get_void_transaction_impact",
  "get_void_yield_impact",
  "get_health_trend",
  "get_latest_health_status",
  "can_access_notification",
  "get_historical_nav",
  "get_monthly_platform_aum",
  "get_existing_preflow_aum",
  "get_system_mode",
  "get_dust_tolerance_for_fund",
  "get_all_dust_tolerances",
  "validate_yield_distribution_prerequisites",
  "validate_yield_parameters",
  "validate_yield_temporal_lock",
  "validate_transaction_aum_exists",
  "validate_invite_code",
  "is_within_edit_window",
  "check_aum_exists_for_date",
  "check_all_funds_transaction_aum",
  "calculate_reconciliation_tolerance",
  "_resolve_investor_fee_pct",
  "validate_staging_batch",
  "validate_staging_row",
  "generate_staging_preview_report",
  "list_pending_staging_approvals",
  "can_access_investor",
  "compute_correction_input_hash",
  "compute_jsonb_delta",
  "check_duplicate_ib_allocations",
  "check_duplicate_transaction_refs",
  "test_profiles_access",
] as const;

export type ReadOnlyRPC = (typeof READ_ONLY_RPCS)[number];

/**
 * Mutation RPCs (modify data, may need idempotency)
 */
export const MUTATION_RPCS = [
  "apply_deposit_with_crystallization",
  "apply_withdrawal_with_crystallization",
  "complete_withdrawal",
  "approve_withdrawal",
  "reject_withdrawal",
  "create_withdrawal_request",
  "cancel_withdrawal_by_admin",
  "route_withdrawal_to_fees",
  "start_processing_withdrawal",
  "apply_daily_yield_to_fund_v3",
  "apply_yield_correction_v2",
  "crystallize_yield_before_flow",
  "crystallize_month_end",
  // P2-02 removed: crystallize_pending_movements (unused)
  "void_yield_distribution",
  "void_investor_yield_events_for_distribution",
  "admin_create_transaction",
  "admin_create_transactions_batch",
  "adjust_investor_position",
  "void_transaction",
  "void_transaction_with_approval",
  "void_and_reissue_transaction",
  "delete_transaction",
  "edit_transaction",
  "update_transaction",
  "recompute_investor_position",
  "recompute_investor_positions_for_investor",
  "reconcile_investor_position",
  "reconcile_all_positions",
  "repair_all_positions",
  "cleanup_dormant_positions",
  "set_fund_daily_aum",
  "update_fund_daily_aum",
  "update_fund_daily_aum_with_recalc",
  "void_fund_daily_aum",
  "sync_aum_to_positions",
  "recalculate_fund_aum_for_date",
  "recalculate_all_aum",
  "ensure_preflow_aum",
  "upsert_fund_aum_after_yield",
  "check_and_fix_aum_integrity",
  "cleanup_duplicate_preflow_aum",
  "add_fund_to_investor",
  "batch_crystallize_fund",
  "update_fund_aum_baseline",
  "update_investor_aum_percentages",
  "force_delete_investor",
  "request_approval",
  "approve_request",
  "reject_request",
  "cleanup_expired_approvals",
  "request_staging_promotion_approval",
  "approve_staging_promotion",
  "reject_staging_promotion",
  "finalize_statement_period",
  "lock_accounting_period",
  "lock_period_with_approval",
  "lock_fund_period_snapshot",
  "unlock_fund_period_snapshot",
  "generate_fund_period_snapshot",
  "create_daily_position_snapshot",
  "dispatch_report_delivery_run",
  "queue_statement_deliveries",
  "acquire_delivery_batch",
  "mark_delivery_result",
  "mark_sent_manually",
  "cancel_delivery",
  "retry_delivery",
  "requeue_stale_sending",
  "generate_reconciliation_pack",
  "finalize_reconciliation_pack",
  "promote_staging_batch",
  "process_excel_import_with_classes",
  "lock_imports",
  "unlock_imports",
  "request_mfa_reset",
  "approve_mfa_reset",
  "reject_mfa_reset",
  "mark_mfa_reset_executed",
  "create_admin_invite",
  "use_invite_code",
  "update_admin_role",
  "update_user_profile_secure",
  "merge_duplicate_profiles",
  "log_audit_event",
  "log_financial_operation",
  "log_security_event",
  "log_access_event",
  "log_withdrawal_action",
  "log_ledger_mismatches",
  "acquire_position_lock",
  "acquire_withdrawal_lock",
  "acquire_yield_lock",
  "update_dust_tolerance",
  "process_yield_distribution",
  "process_yield_distribution_with_dust",
  "finalize_month_yield",
  "refresh_yield_materialized_views",
  "rollback_yield_correction",
  "regenerate_reports_for_correction",
  "send_daily_rate_notifications",
  "internal_route_to_fees",
  "refresh_materialized_view_concurrently",
  "reset_all_data_keep_profiles",
  "reset_all_investor_positions",
  "delete_withdrawal",
  "update_withdrawal",
  "reconcile_fund_period",
  "rebuild_investor_period_balances",
] as const;

export type MutationRPC = (typeof MUTATION_RPCS)[number];

// =============================================================================
// IDEMPOTENCY REQUIREMENTS
// =============================================================================

/**
 * RPCs that require a reference_id for idempotency
 */
export const IDEMPOTENT_RPCS = [
  "apply_deposit_with_crystallization",
  "apply_withdrawal_with_crystallization",
  "apply_daily_yield_to_fund_v3",
  "admin_create_transaction",
  "admin_create_transactions_batch",
  "crystallize_yield_before_flow",
] as const;

export type IdempotentRPC = (typeof IDEMPOTENT_RPCS)[number];

// =============================================================================
// HELPER FUNCTIONS
// =============================================================================

/**
 * Check if an RPC is read-only (safe to retry)
 */
export function isReadOnlyRPC(fn: string): fn is ReadOnlyRPC {
  return (READ_ONLY_RPCS as readonly string[]).includes(fn);
}

/**
 * Check if an RPC is a mutation (may modify data)
 */
export function isMutationRPC(fn: string): fn is MutationRPC {
  return (MUTATION_RPCS as readonly string[]).includes(fn);
}

/**
 * Check if an RPC requires idempotency key
 */
export function requiresIdempotency(fn: string): fn is IdempotentRPC {
  return (IDEMPOTENT_RPCS as readonly string[]).includes(fn);
}

/**
 * Check if a table should only be modified via canonical RPCs
 */
export function isProtectedTable(table: string): table is ProtectedTable {
  return (PROTECTED_TABLES as readonly string[]).includes(table);
}

/**
 * Get the canonical RPC for a mutation operation
 */
export function getCanonicalRPC(operation: keyof typeof CANONICAL_MUTATION_RPCS): string {
  return CANONICAL_MUTATION_RPCS[operation];
}

// =============================================================================
// TYPE HELPERS
// =============================================================================

type RPCFunctions = Database["public"]["Functions"];

/**
 * Get the Args type for an RPC function
 */
export type RPCArgs<T extends keyof RPCFunctions> = RPCFunctions[T] extends {
  Args: infer A;
}
  ? A
  : never;

/**
 * Get the Returns type for an RPC function
 */
export type RPCReturns<T extends keyof RPCFunctions> = RPCFunctions[T] extends {
  Returns: infer R;
}
  ? R
  : never;

// =============================================================================
// VALIDATION
// =============================================================================

/**
 * Validate that an RPC function name is known
 */
export function isValidRPCFunction(fn: string): fn is RPCFunctionName {
  return (RPC_FUNCTIONS as readonly string[]).includes(fn);
}
