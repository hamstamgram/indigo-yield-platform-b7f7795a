/**
 * Database Enums - Additional Type Definitions
 * 
 * This file provides enum types that are NOT already exported by other domain files.
 * For types already exported elsewhere, import from those domain files instead:
 * 
 * - FundStatus → import from "./fund"
 * - TransactionType, TxType, TxSource → import from "./transaction"
 * - WithdrawalStatus, WithdrawalAction → import from "./requests" or "./withdrawal"
 * - NotificationType, NotificationPriority → import from "./notification"
 * - AccessEvent, ShareScope → import from "./session"
 * - AumPurpose, YieldDistributionStatus → import from "./yieldDistributionRecord"
 */

import type { Database } from "@/integrations/supabase/types";

// ============================================================================
// Enums NOT exported elsewhere - Safe to export from this file
// ============================================================================

/** Account types for investors/IBs */
export type AccountType = Database["public"]["Enums"]["account_type"];

/** Application roles */
export type AppRole = Database["public"]["Enums"]["app_role"];

/** Supported asset codes */
export type AssetCode = Database["public"]["Enums"]["asset_code"];

/** Benchmark types for performance comparison */
export type BenchmarkType = Database["public"]["Enums"]["benchmark_type"];

/** Document types */
export type DocumentType = Database["public"]["Enums"]["document_type"];

/** Fee types (management vs performance) */
export type FeeKind = Database["public"]["Enums"]["fee_kind"];

/** Legacy transaction status (use is_voided for v2) */
export type TransactionStatus = Database["public"]["Enums"]["transaction_status"];

/** Visibility scope for transactions */
export type VisibilityScope = Database["public"]["Enums"]["visibility_scope"];

// ============================================================================
// Enum Value Arrays (for dropdowns, validation, etc.)
// ============================================================================

import { Constants } from "@/integrations/supabase/types";

export const ACCOUNT_TYPE_VALUES = Constants.public.Enums.account_type;
export const APP_ROLE_VALUES = Constants.public.Enums.app_role;
export const ASSET_CODE_VALUES = Constants.public.Enums.asset_code;
export const BENCHMARK_TYPE_VALUES = Constants.public.Enums.benchmark_type;
export const DOCUMENT_TYPE_VALUES = Constants.public.Enums.document_type;
export const FEE_KIND_VALUES = Constants.public.Enums.fee_kind;
export const TRANSACTION_STATUS_VALUES = Constants.public.Enums.transaction_status;
export const VISIBILITY_SCOPE_VALUES = Constants.public.Enums.visibility_scope;

// Re-export commonly used value arrays (values are safe, types might conflict)
export const FUND_STATUS_VALUES = Constants.public.Enums.fund_status;
export const TX_TYPE_VALUES = Constants.public.Enums.tx_type;
export const TX_SOURCE_VALUES = Constants.public.Enums.tx_source;
export const WITHDRAWAL_STATUS_VALUES = Constants.public.Enums.withdrawal_status;
export const WITHDRAWAL_ACTION_VALUES = Constants.public.Enums.withdrawal_action;
export const AUM_PURPOSE_VALUES = Constants.public.Enums.aum_purpose;
export const YIELD_DISTRIBUTION_STATUS_VALUES = Constants.public.Enums.yield_distribution_status;
export const NOTIFICATION_TYPE_VALUES = Constants.public.Enums.notification_type;
export const NOTIFICATION_PRIORITY_VALUES = Constants.public.Enums.notification_priority;
export const ACCESS_EVENT_VALUES = Constants.public.Enums.access_event;
export const SHARE_SCOPE_VALUES = Constants.public.Enums.share_scope;
