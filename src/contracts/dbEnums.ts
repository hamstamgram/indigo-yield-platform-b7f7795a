/**
 * Database Enum Contracts
 * AUTO-GENERATED - DO NOT EDIT
 *
 * Regenerate with: npm run contracts:generate
 */

import { z } from "zod";
import type { Database } from "@/integrations/supabase/types";

// =============================================================================
// TYPE ALIGNMENT VERIFICATION
// =============================================================================
// These compile-time checks ensure our contracts match Supabase types

// =============================================================================
// TX_TYPE ENUM
// =============================================================================

export const TX_TYPE_VALUES = [
  "DEPOSIT",
  "WITHDRAWAL",
  "INTEREST",
  "FEE",
  "ADJUSTMENT",
  "FEE_CREDIT",
  "IB_CREDIT",
  "YIELD",
  "INTERNAL_WITHDRAWAL",
  "INTERNAL_CREDIT",
  "IB_DEBIT",
] as const;

export type TxType = (typeof TX_TYPE_VALUES)[number];
export const TxTypeSchema = z.enum(TX_TYPE_VALUES);

/** Check if a value is a valid DB transaction type */
export function isValidTxType(value: unknown): value is TxType {
  return TX_TYPE_VALUES.includes(value as TxType);
}

// =============================================================================
// AUM_PURPOSE ENUM
// =============================================================================

export const AUM_PURPOSE_VALUES = ["reporting", "transaction"] as const;

export type AumPurpose = (typeof AUM_PURPOSE_VALUES)[number];
export const AumPurposeSchema = z.enum(AUM_PURPOSE_VALUES);

// =============================================================================
// DOCUMENT_TYPE ENUM
// =============================================================================

export const DOCUMENT_TYPE_VALUES = ["statement", "notice", "terms", "tax", "other"] as const;

export type DocumentType = (typeof DOCUMENT_TYPE_VALUES)[number];
export const DocumentTypeSchema = z.enum(DOCUMENT_TYPE_VALUES);

// =============================================================================
// DELIVERY_CHANNEL ENUM
// =============================================================================

export const DELIVERY_CHANNEL_VALUES = ["email", "app", "sms"] as const;

export type DeliveryChannel = (typeof DELIVERY_CHANNEL_VALUES)[number];
export const DeliveryChannelSchema = z.enum(DELIVERY_CHANNEL_VALUES);

// =============================================================================
// WITHDRAWAL_STATUS ENUM
// =============================================================================

export const WITHDRAWAL_STATUS_VALUES = [
  "pending",
  "approved",
  "processing",
  "completed",
  "rejected",
  "cancelled",
] as const;

export type WithdrawalStatus = (typeof WITHDRAWAL_STATUS_VALUES)[number];
export const WithdrawalStatusSchema = z.enum(WITHDRAWAL_STATUS_VALUES);

// =============================================================================
// YIELD_DISTRIBUTION_STATUS ENUM
// =============================================================================

export const YIELD_DISTRIBUTION_STATUS_VALUES = [
  "draft",
  "applied",
  "voided",
  "previewed",
  "corrected",
  "rolled_back",
] as const;

export type YieldDistributionStatus = (typeof YIELD_DISTRIBUTION_STATUS_VALUES)[number];
export const YieldDistributionStatusSchema = z.enum(YIELD_DISTRIBUTION_STATUS_VALUES);

// =============================================================================
// TX_SOURCE ENUM
// =============================================================================

export const TX_SOURCE_VALUES = [
  "manual_admin",
  "yield_distribution",
  "fee_allocation",
  "ib_allocation",
  "system_bootstrap",
  "investor_wizard",
  "internal_routing",
  "yield_correction",
  "withdrawal_completion",
  "rpc_canonical",
  "crystallization",
  "system",
  "migration",
] as const;

export type TxSource = (typeof TX_SOURCE_VALUES)[number];
export const TxSourceSchema = z.enum(TX_SOURCE_VALUES);

// =============================================================================
// FUND_STATUS ENUM
// =============================================================================

export const FUND_STATUS_VALUES = [
  "active",
  "inactive",
  "suspended",
  "deprecated",
  "pending",
] as const;

export type FundStatus = (typeof FUND_STATUS_VALUES)[number];
export const FundStatusSchema = z.enum(FUND_STATUS_VALUES);

// =============================================================================
// APP_ROLE ENUM
// =============================================================================

export const APP_ROLE_VALUES = [
  "super_admin",
  "admin",
  "moderator",
  "ib",
  "user",
  "investor",
] as const;

export type AppRole = (typeof APP_ROLE_VALUES)[number];
export const AppRoleSchema = z.enum(APP_ROLE_VALUES);

// =============================================================================
// UI TYPE MAPPING (FIRST_INVESTMENT -> DEPOSIT)
// =============================================================================

/**
 * UI may display "First Investment" but DB stores it as DEPOSIT.
 * This maps UI types to the canonical DB types.
 */
export function mapUITypeToDb(uiType: string): TxType {
  if (uiType === "FIRST_INVESTMENT") {
    return "DEPOSIT";
  }
  if (isValidTxType(uiType)) {
    return uiType;
  }
  throw new Error(`Unknown UI transaction type: ${uiType}`);
}

// =============================================================================
// TYPE ALIGNMENT VERIFICATION (compile-time)
// =============================================================================
// These ensure our contracts match the generated Supabase types

type SupabaseTxType = Database["public"]["Enums"]["tx_type"];
type SupabaseAumPurpose = Database["public"]["Enums"]["aum_purpose"];
type SupabaseDocumentType = Database["public"]["Enums"]["document_type"];

// Compile-time checks: these will fail if enums drift
type _AssertTxType = TxType extends SupabaseTxType ? true : false;
type _AssertAumPurpose = AumPurpose extends SupabaseAumPurpose ? true : false;
type _AssertDocumentType = DocumentType extends SupabaseDocumentType ? true : false;

// Force usage to prevent "declared but never used" warnings
const _typeChecks: [_AssertTxType, _AssertAumPurpose, _AssertDocumentType] = [true, true, true];
void _typeChecks;
