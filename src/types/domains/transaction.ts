/**
 * Transaction Domain Types
 * CANONICAL SOURCE - All transaction-related types should be imported from here
 *
 * Database Schema: transactions_v2 table
 */

import { Database } from "@/integrations/supabase/types";

// Get enum types from database - tx_type is the actual transactions_v2 column enum
export type TransactionType = Database["public"]["Enums"]["tx_type"];
type AssetCode = Database["public"]["Enums"]["asset_code"];

/**
 * Core transaction type - maps to transactions_v2 table
 * This is the canonical type for transaction data
 */
export interface Transaction {
  id: string;
  investor_id: string;
  fund_id: string | null;
  type: TransactionType;
  asset: string;
  amount: number;
  tx_date: string;
  notes: string | null;
  tx_hash: string | null;
  created_at: string;
  created_by: string | null;
  is_voided?: boolean;
  is_system_generated?: boolean;
  visibility_scope?: string | null;
  purpose?: string | null;
  reference_id?: string | null;
}

/**
 * Transaction with fund information joined
 */
export interface TransactionWithFund extends Transaction {
  fund?: {
    id: string;
    name: string;
    code: string;
    asset?: string;
  } | null;
}

/**
 * Transaction with investor/profile information
 */
export interface TransactionWithProfile extends Transaction {
  investor: {
    id: string;
    name: string;
    email: string;
  };
  profile?: {
    first_name: string | null;
    last_name: string | null;
  };
}

/**
 * Full transaction with all relationships
 */
export interface TransactionWithDetails extends TransactionWithFund {
  investor_name?: string;
  investor_email?: string;
  fund_name?: string;
  fund_code?: string;
  display_type?: string;
}

/**
 * Transaction for ledger views (investor-facing)
 */
export interface LedgerTransaction {
  id: string;
  tx_date: string;
  type: string;
  amount: number;
  purpose: string | null;
  reference_id: string | null;
  notes: string | null;
  asset: string;
  is_voided: boolean;
  tx_hash?: string | null;
  is_system_generated?: boolean;
  visibility_scope?: string | null;
  fund?: { name: string; asset: string } | null;
}

/**
 * Transaction for statement calculations
 */
export interface StatementTransaction {
  id: string;
  date: string;
  type: "deposit" | "withdrawal" | "interest" | "fee";
  amount: number;
  description: string;
  running_balance?: number;
}

/**
 * Transaction summary aggregates
 */
export interface TransactionSummary {
  total_deposits: number;
  total_withdrawals: number;
  total_fees: number;
  total_yield: number;
  net_flow: number;
  transaction_count: number;
  by_asset?: Record<
    string,
    {
      deposits: number;
      withdrawals: number;
      fees: number;
      yield: number;
    }
  >;
}

/**
 * Transaction filter criteria
 */
export interface TransactionFilter {
  type?: TransactionType | TransactionType[];
  asset_code?: AssetCode | AssetCode[];
  date_from?: string;
  date_to?: string;
  investor_id?: string;
  fund_id?: string;
  min_amount?: number;
  max_amount?: number;
  show_voided?: boolean;
  purpose?: string;
  limit?: number;
}

/**
 * Extended transaction type for UI that includes FIRST_INVESTMENT
 * FIRST_INVESTMENT is a UI-only type that gets mapped to DEPOSIT in the database
 */
export type UITransactionType = TransactionType | "FIRST_INVESTMENT";

/**
 * Create transaction parameters (for API/service layer)
 * Uses strict DB TransactionType
 */
export interface CreateTransactionParams {
  investor_id: string;
  fund_id: string;
  type: TransactionType;
  asset: string;
  amount: number;
  tx_date: string;
  reference_id?: string;
  tx_hash?: string;
  notes?: string;
  tx_subtype?: string;
}

/**
 * Create transaction parameters for UI forms
 * Allows FIRST_INVESTMENT which gets mapped to DEPOSIT
 */
export interface CreateTransactionUIParams {
  investor_id: string;
  fund_id: string;
  type: UITransactionType;
  asset: string;
  amount: number;
  tx_date: string;
  reference_id?: string;
  tx_hash?: string;
  notes?: string;
  tx_subtype?: string;
}

/**
 * Convert database transaction to application transaction
 * Handles different field naming conventions
 */
export function mapDbTransactionToTransaction(dbTx: any): Transaction {
  return {
    id: dbTx.id,
    investor_id: dbTx.investor_id || dbTx.user_id,
    fund_id: dbTx.fund_id || null,
    type: dbTx.type as TransactionType,
    asset: dbTx.asset || dbTx.asset_code,
    amount: Number(dbTx.amount) || 0,
    tx_date: dbTx.tx_date || dbTx.created_at,
    notes: dbTx.notes || dbTx.note || null,
    tx_hash: dbTx.tx_hash || dbTx.transaction_hash || null,
    created_at: dbTx.created_at,
    created_by: dbTx.created_by || null,
    is_voided: dbTx.is_voided || false,
    is_system_generated: dbTx.is_system_generated || false,
    visibility_scope: dbTx.visibility_scope || null,
    purpose: dbTx.purpose || null,
    reference_id: dbTx.reference_id || null,
  };
}

/**
 * Type guard to check if transaction has profile data
 */
export function isTransactionWithProfile(
  tx: Transaction | TransactionWithProfile
): tx is TransactionWithProfile {
  return "investor" in tx;
}

/**
 * Type guard to check if transaction has fund data
 */
export function isTransactionWithFund(
  tx: Transaction | TransactionWithFund
): tx is TransactionWithFund {
  return "fund" in tx && tx.fund !== undefined;
}

/**
 * Get display name for transaction investor
 */
export function getTransactionInvestorName(tx: TransactionWithProfile): string {
  if (tx.profile?.first_name && tx.profile?.last_name) {
    return `${tx.profile.first_name} ${tx.profile.last_name}`;
  }
  return tx.investor.name || tx.investor.email;
}

/**
 * Format transaction type for display
 */
export function formatTransactionType(type: TransactionType | string): string {
  const typeMap: Record<string, string> = {
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    FEE: "Fee",
    INTEREST: "Interest",
    YIELD: "Yield",
    ADJUSTMENT: "Adjustment",
    FIRST_INVESTMENT: "First Investment",
  };
  return typeMap[type] || (typeof type === "string" ? type.charAt(0) + type.slice(1).toLowerCase() : String(type));
}

/**
 * Calculate net amount (positive for deposits/interest, negative for withdrawals/fees)
 */
export function getTransactionNetAmount(tx: Transaction): number {
  const amount = Number(tx.amount) || 0;
  const type = tx.type?.toUpperCase?.() || tx.type;
  if (type === "DEPOSIT" || type === "INTEREST" || type === "YIELD") {
    return amount;
  }
  if (type === "WITHDRAWAL" || type === "FEE") {
    return -amount;
  }
  return amount;
}

/**
 * Check if transaction is a credit (positive flow)
 */
export function isCredit(type: TransactionType | string): boolean {
  const t = typeof type === "string" ? type.toUpperCase() : String(type);
  return t === "DEPOSIT" || t === "INTEREST" || t === "YIELD";
}

/**
 * Check if transaction is a debit (negative flow)
 */
export function isDebit(type: TransactionType | string): boolean {
  const t = typeof type === "string" ? type.toUpperCase() : String(type);
  return t === "WITHDRAWAL" || t === "FEE";
}

// ============================================
// Admin Transaction History Types
// ============================================

/**
 * Filters for admin transaction history queries
 */
export interface AdminTransactionFilters {
  fundId?: string;
  type?: TransactionType;
  dateFrom?: string;
  dateTo?: string;
  showVoided?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * View model for transaction display in admin UI
 */
export interface TransactionViewModel {
  id: string;
  investorId: string;
  investorName: string;
  investorEmail: string;
  fundId: string | null;
  fundName: string;
  asset: string;
  type: TransactionType;
  displayType: string;
  amount: number;
  txDate: string;
  notes: string | null;
  txHash?: string | null;
  createdAt: string;
  createdBy: string | null;
  visibilityScope: string;
  isVoided: boolean;
  isSystemGenerated: boolean;
}

/**
 * Result from paginated transaction query
 */
export interface AdminTransactionResult {
  transactions: TransactionViewModel[];
  totalCount: number;
}

/**
 * Fund option for dropdowns
 */
export interface FundOption {
  id: string;
  code: string;
  name: string;
  asset: string;
}

/**
 * Parameters for updating a transaction
 */
export interface UpdateTransactionParams {
  transactionId: string;
  updates: {
    tx_date?: string;
    amount?: number;
    notes?: string;
    tx_hash?: string;
  };
  reason: string;
}

/**
 * Parameters for voiding a transaction
 */
export interface VoidTransactionParams {
  transactionId: string;
  reason: string;
}
