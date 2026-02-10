/**
 * Transaction Domain Types
 * CANONICAL SOURCE - All transaction-related types should be imported from here
 *
 * Database Schema: transactions_v2 table
 */

import { Database } from "@/integrations/supabase/types";

// Get enum types from database - tx_type is the database enum type name
// The transactions_v2 table uses the 'type' column with values from the tx_type enum
export type TransactionType = Database["public"]["Enums"]["tx_type"];
type AssetCode = Database["public"]["Enums"]["asset_code"];

/** Database row type for transactions_v2 */
type DbTransaction = Database["public"]["Tables"]["transactions_v2"]["Row"];

/**
 * Core transaction type - maps to transactions_v2 table
 * This is the canonical type for transaction data
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface Transaction {
  id: string;
  investor_id: string;
  fund_id: string | null;
  type: TransactionType;
  asset: string;
  /** @precision NUMERIC(28,10) from database */
  amount: string;
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
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface LedgerTransaction {
  id: string;
  tx_date: string;
  type: string;
  /** @precision NUMERIC(28,10) from database */
  amount: string;
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
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface StatementTransaction {
  id: string;
  date: string;
  type: "deposit" | "withdrawal" | "interest" | "fee";
  /** @precision NUMERIC(28,10) from database */
  amount: string;
  description: string;
  /** @precision NUMERIC(28,10) from database */
  running_balance?: string;
}

/**
 * Transaction summary aggregates
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface TransactionSummary {
  /** @precision NUMERIC(28,10) from database */
  total_deposits: string;
  /** @precision NUMERIC(28,10) from database */
  total_withdrawals: string;
  /** @precision NUMERIC(28,10) from database */
  total_fees: string;
  /** @precision NUMERIC(28,10) from database */
  total_yield: string;
  /** @precision NUMERIC(28,10) from database */
  net_flow: string;
  transaction_count: number;
  by_asset?: Record<
    string,
    {
      /** @precision NUMERIC(28,10) from database */
      deposits: string;
      /** @precision NUMERIC(28,10) from database */
      withdrawals: string;
      /** @precision NUMERIC(28,10) from database */
      fees: string;
      /** @precision NUMERIC(28,10) from database */
      yield: string;
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
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface CreateTransactionParams {
  investor_id: string;
  fund_id: string;
  type: TransactionType;
  asset: string;
  /** @precision NUMERIC(28,10) from database */
  amount: string;
  tx_date: string;
  reference_id?: string;
  tx_hash?: string;
  notes?: string;
  tx_subtype?: string;
}

/**
 * Create transaction parameters for UI forms
 * Allows FIRST_INVESTMENT which gets mapped to DEPOSIT
 * Financial fields use string for NUMERIC(28,10) precision preservation
 */
export interface CreateTransactionUIParams {
  investor_id: string;
  fund_id: string;
  type: UITransactionType;
  asset: string;
  /** @precision NUMERIC(28,10) from database */
  amount: string;
  tx_date: string;
  /**
   * Authoritative AUM snapshot used for crystallize-before-flow accounting.
   * Required when `type` is DEPOSIT/WITHDRAWAL/FIRST_INVESTMENT.
   */
  closing_aum?: string;
  /**
   * Timestamp for the effective flow event (defaults to tx_date at 00:00Z).
   */
  event_ts?: string;
  reference_id?: string;
  tx_hash?: string;
  notes?: string;
  tx_subtype?: string;
}

/**
 * Partial database transaction type for mapping flexibility
 * Supports both direct DB rows and legacy field names
 */
type DbTransactionInput = Partial<DbTransaction> & {
  id: string;
  created_at: string;
  // Legacy field aliases
  user_id?: string;
  asset_code?: string;
  note?: string;
  transaction_hash?: string;
};

/**
 * Convert database transaction to application transaction
 * Handles different field naming conventions
 * Preserves string representation for financial precision
 */
export function mapDbTransactionToTransaction(dbTx: DbTransactionInput): Transaction {
  return {
    id: dbTx.id,
    investor_id: dbTx.investor_id || dbTx.user_id || "",
    fund_id: dbTx.fund_id || null,
    type: dbTx.type as TransactionType,
    asset: dbTx.asset || dbTx.asset_code || "",
    amount: String(dbTx.amount ?? "0"),
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
 * Display type mapping from tx_subtype to user-friendly labels
 * Used by both transaction.ts and adminTransactionHistoryService.ts
 */
export const SUBTYPE_DISPLAY_MAP: Record<string, string> = {
  first_investment: "First Investment",
  deposit: "Top-up",
  redemption: "Withdrawal",
  full_redemption: "Withdrawal All",
  fee_charge: "Fee",
  yield_credit: "Yield",
  adjustment: "Adjustment",
  fee_credit: "Fee Credit",
  ib_credit: "IB Credit",
};

/**
 * Format transaction type for display (basic type-only mapping)
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
    FEE_CREDIT: "Fee Credit",
    IB_CREDIT: "IB Credit",
  };
  return (
    typeMap[type] ||
    (typeof type === "string" ? type.charAt(0) + type.slice(1).toLowerCase() : String(type))
  );
}

/**
 * Get display type for a transaction based on subtype (preferred) or type (fallback)
 * This is the canonical function for determining user-facing transaction labels.
 */
export function getTransactionDisplayType(
  type: TransactionType | string,
  subtype?: string | null
): string {
  // Prefer subtype if available and mapped
  if (subtype && SUBTYPE_DISPLAY_MAP[subtype]) {
    return SUBTYPE_DISPLAY_MAP[subtype];
  }

  // Fallback to type-based mapping for legacy data
  const fallbackMap: Record<string, string> = {
    DEPOSIT: "Top-up",
    WITHDRAWAL: "Withdrawal",
    INTEREST: "Yield",
    YIELD: "Yield",
    FEE: "Fee",
    FEE_CREDIT: "Fee Credit",
    IB_CREDIT: "IB Credit",
    ADJUSTMENT: "Adjustment",
  };

  return fallbackMap[type] || formatTransactionType(type);
}

/**
 * Calculate net amount (positive for deposits/interest, negative for withdrawals/fees)
 * Returns string to preserve NUMERIC(28,10) precision - use Decimal.js for calculations
 */
export function getTransactionNetAmount(tx: Transaction): string {
  const amount = tx.amount || "0";
  const type = tx.type?.toUpperCase?.() || tx.type;
  if (
    type === "DEPOSIT" ||
    type === "INTEREST" ||
    type === "YIELD" ||
    type === "FEE_CREDIT" ||
    type === "IB_CREDIT"
  ) {
    return amount;
  }
  if (type === "WITHDRAWAL" || type === "FEE") {
    // Return negative by prepending minus if not already negative
    return amount.startsWith("-") ? amount : `-${amount}`;
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
  /** ISO datetime string for filtering on created_at (includes time) */
  datetimeFrom?: string;
  /** ISO datetime string for filtering on created_at (includes time) */
  datetimeTo?: string;
  showVoided?: boolean;
  page?: number;
  pageSize?: number;
}

/**
 * View model for transaction display in admin UI
 * Financial fields use string for NUMERIC(28,10) precision preservation
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
  /** @precision NUMERIC(28,10) from database */
  amount: string;
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
    /** @precision NUMERIC(28,10) - use string for precision */
    amount?: string;
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

/**
 * Parameters for unvoiding (restoring) a transaction
 */
export interface UnvoidTransactionParams {
  transactionId: string;
  reason: string;
}

/**
 * Parameters for bulk void operations (super_admin only)
 */
export interface BulkVoidTransactionParams {
  transactionIds: string[];
  reason: string;
}

/**
 * Parameters for bulk unvoid operations (super_admin only)
 */
export interface BulkUnvoidTransactionParams {
  transactionIds: string[];
  reason: string;
}

/**
 * Result of a bulk void/unvoid operation
 */
export interface BulkOperationResult {
  success: boolean;
  count: number;
  transactionIds: string[];
  warning?: string;
  error_code?: string;
  message?: string;
}

/**
 * Parameters for void and reissue operation (atomic correction)
 * This is the preferred method for correcting transactions while
 * maintaining ledger immutability.
 */
export interface VoidAndReissueParams {
  transactionId: string;
  newValues: {
    tx_date: string;
    /** @precision NUMERIC(28,10) - use string for precision */
    amount: string;
    notes?: string | null;
    tx_hash?: string | null;
  };
  /** Required closing AUM snapshot for the reissue date (native asset units) @precision NUMERIC(28,10) */
  closingAum: string;
  reason: string;
}

/**
 * Result of void and reissue operation
 */
export interface VoidAndReissueResult {
  success: boolean;
  voided_transaction_id: string;
  new_transaction_id: string;
  message?: string;
  voided_at?: string;
  new_transaction?: {
    id: string;
    /** @precision NUMERIC(28,10) - use string for precision */
    amount: string;
    tx_date: string;
  };
}
