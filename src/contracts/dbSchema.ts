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
  investors: {
    name: "investors" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "email",
      "name",
      "phone",
      "status",
      "kyc_status",
      "kyc_verified_at",
      "created_at",
      "updated_at",
      "account_type",
      "wallet_address",
      "tax_id",
      "is_ib",
      "referral_code",
      "referred_by",
    ] as const,
    rlsEnabled: true,
  },
  funds: {
    name: "funds" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "name",
      "code",
      "asset",
      "status",
      "target_apy",
      "risk_level",
      "min_investment",
      "created_at",
      "updated_at",
      "description",
      "is_active",
    ] as const,
    rlsEnabled: true,
  },
  transactions_v2: {
    name: "transactions_v2" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "investor_id",
      "fund_id",
      "type",
      "tx_subtype",
      "asset",
      "amount",
      "tx_date",
      "notes",
      "tx_hash",
      "created_at",
      "created_by",
      "is_voided",
      "voided_at",
      "voided_by",
      "void_reason",
      "reversed_by_tx_id",
      "reverses_tx_id",
      "is_system_generated",
      "visibility_scope",
      "purpose",
      "reference_id",
      "yield_distribution_id",
      "position_delta",
      "new_balance",
    ] as const,
    rlsEnabled: true,
  },
  investor_positions: {
    name: "investor_positions" as const,
    primaryKey: ["investor_id", "fund_id"] as const, // COMPOSITE PK
    columns: [
      "investor_id",
      "fund_id",
      "current_value",
      "cost_basis",
      "units",
      "last_updated",
      "created_at",
      "updated_at",
    ] as const,
    rlsEnabled: true,
  },
  yield_distributions: {
    name: "yield_distributions" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "fund_id",
      "investor_id",
      "yield_date",
      "gross_yield",
      "fee_amount",
      "ib_fee_amount",
      "net_yield",
      "allocation_percentage",
      "created_at",
      "created_by",
      "is_voided",
      "voided_at",
      "voided_by",
      "void_reason",
      "reference_id",
      "pre_yield_balance",
      "post_yield_balance",
    ] as const,
    rlsEnabled: true,
  },
  fund_aum_events: {
    name: "fund_aum_events" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "fund_id",
      "event_ts",
      "event_type",
      "opening_aum",
      "closing_aum",
      "post_flow_aum",
      "flow_amount",
      "trigger_reference",
      "admin_id",
      "notes",
      "is_voided",
      "voided_at",
      "voided_by",
      "created_at",
    ] as const,
    rlsEnabled: true,
  },
  fund_daily_aum: {
    name: "fund_daily_aum" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "fund_id",
      "aum_date",
      "total_aum",
      "source",
      "notes",
      "created_at",
      "created_by",
    ] as const,
    rlsEnabled: true,
  },
  statement_periods: {
    name: "statement_periods" as const,
    primaryKey: ["id"] as const,
    columns: ["id", "year", "month", "start_date", "end_date", "status", "created_at"] as const,
    rlsEnabled: true,
  },
  fund_period_snapshots: {
    name: "fund_period_snapshots" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "fund_id",
      "period_id",
      "snapshot_date",
      "total_aum",
      "investor_count",
      "total_yield",
      "total_fees",
      "is_locked",
      "locked_at",
      "locked_by",
      "created_at",
    ] as const,
    rlsEnabled: true,
  },
  investor_fee_schedules: {
    name: "investor_fee_schedules" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "investor_id",
      "fund_id",
      "management_fee_bps",
      "performance_fee_bps",
      "ib_fee_bps",
      "effective_from",
      "effective_to",
      "created_at",
      "created_by",
    ] as const,
    rlsEnabled: true,
  },
  withdrawal_requests: {
    name: "withdrawal_requests" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "investor_id",
      "fund_id",
      "amount",
      "status",
      "requested_at",
      "processed_at",
      "processed_by",
      "notes",
      "wallet_address",
      "transaction_id",
      "created_at",
    ] as const,
    rlsEnabled: true,
  },
  ib_relationships: {
    name: "ib_relationships" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "ib_investor_id",
      "client_investor_id",
      "ib_percentage",
      "effective_from",
      "effective_to",
      "created_at",
      "created_by",
    ] as const,
    rlsEnabled: true,
  },
  profiles: {
    name: "profiles" as const,
    primaryKey: ["id"] as const,
    columns: [
      "id",
      "email",
      "first_name",
      "last_name",
      "phone",
      "role",
      "avatar_url",
      "created_at",
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
export const COMPOSITE_PK_TABLES = ["investor_positions"] as const;

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

// =============================================================================
// COLUMN TYPE HELPERS
// =============================================================================

/** Check if a column exists in a table */
export function columnExists(table: TableName, column: string): boolean {
  const meta = DB_TABLES[table];
  return (meta.columns as readonly string[]).includes(column);
}

/** Get all column names for a table */
export function getTableColumns(table: TableName): readonly string[] {
  return DB_TABLES[table].columns;
}

/** Tables that require idempotency keys */
export const IDEMPOTENT_TABLES = [
  "transactions_v2",
  "yield_distributions",
  "fund_aum_events",
] as const;

/** Check if a table requires idempotency handling */
export function requiresIdempotency(table: TableName): boolean {
  return (IDEMPOTENT_TABLES as readonly string[]).includes(table);
}
