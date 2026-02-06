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
  "apply_adb_yield_distribution_v3",
  "apply_transaction_with_crystallization",
  "crystallize_yield_before_flow",
  "get_funds_with_aum",
  "is_admin",
  "preview_adb_yield_distribution_v3",
  "qa_admin_id",
  "qa_fees_account_id",
  "qa_fund_id",
  "qa_investor_id",
  "qa_seed_world",
  "recalculate_fund_aum_for_date",
  "recompute_investor_position",
  "validate_aum_against_positions",
  "validate_aum_against_positions_at_date",
  "void_yield_distribution",
] as const;

// =============================================================================
// RPC SIGNATURES METADATA
// =============================================================================

export const RPC_SIGNATURES = {
  apply_adb_yield_distribution_v3: {
    name: "apply_adb_yield_distribution_v3" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [
      "p_fund_id",
      "p_gross_yield_amount",
      "p_period_end",
      "p_period_start",
    ] as const,
    optionalParams: ["p_admin_id", "p_distribution_date", "p_purpose"] as const,
  },
  apply_transaction_with_crystallization: {
    name: "apply_transaction_with_crystallization" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [
      "p_amount",
      "p_fund_id",
      "p_investor_id",
      "p_reference_id",
      "p_tx_date",
      "p_tx_type",
    ] as const,
    optionalParams: ["p_admin_id", "p_new_total_aum", "p_notes", "p_purpose"] as const,
  },
  crystallize_yield_before_flow: {
    name: "crystallize_yield_before_flow" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [
      "p_admin_id",
      "p_closing_aum",
      "p_event_ts",
      "p_fund_id",
      "p_trigger_reference",
      "p_trigger_type",
    ] as const,
    optionalParams: ["p_purpose"] as const,
  },
  get_funds_with_aum: {
    name: "get_funds_with_aum" as const,
    returnType: "{",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  is_admin: {
    name: "is_admin" as const,
    returnType: "boolean",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: [] as const,
  },
  preview_adb_yield_distribution_v3: {
    name: "preview_adb_yield_distribution_v3" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [
      "p_fund_id",
      "p_gross_yield_amount",
      "p_period_end",
      "p_period_start",
    ] as const,
    optionalParams: ["p_purpose"] as const,
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
    requiredParams: ["p_name"] as const,
    optionalParams: [] as const,
  },
  qa_seed_world: {
    name: "qa_seed_world" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: [] as const,
    optionalParams: ["p_run_tag"] as const,
  },
  recalculate_fund_aum_for_date: {
    name: "recalculate_fund_aum_for_date" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_date", "p_fund_id"] as const,
    optionalParams: ["p_actor_id", "p_purpose"] as const,
  },
  recompute_investor_position: {
    name: "recompute_investor_position" as const,
    returnType: "undefined",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_fund_id", "p_investor_id"] as const,
    optionalParams: [] as const,
  },
  validate_aum_against_positions: {
    name: "validate_aum_against_positions" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_aum_value", "p_fund_id"] as const,
    optionalParams: ["p_context", "p_max_deviation_pct"] as const,
  },
  validate_aum_against_positions_at_date: {
    name: "validate_aum_against_positions_at_date" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_aum_value", "p_event_date", "p_fund_id"] as const,
    optionalParams: ["p_context", "p_max_deviation_pct"] as const,
  },
  void_yield_distribution: {
    name: "void_yield_distribution" as const,
    returnType: "Json",
    returnsSet: false,
    securityDefiner: false,
    requiredParams: ["p_admin_id", "p_distribution_id"] as const,
    optionalParams: ["p_reason"] as const,
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
  /** Canonical RPC for deposits (with crystallization) */
  DEPOSIT: "apply_deposit_with_crystallization",
  /** Canonical RPC for withdrawals (with crystallization) */
  WITHDRAWAL: "apply_withdrawal_with_crystallization",
  /** Canonical RPC for yield distribution */
  YIELD: "apply_daily_yield_to_fund_v3",
  /** Canonical RPC for voiding transactions */
  VOID: "void_transaction",
  /** Canonical RPC for admin transaction creation */
  ADMIN_TX: "admin_create_transaction",
} as const;
