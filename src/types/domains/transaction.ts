/**
 * Transaction Domain Types
 * Clean abstractions for transaction-related entities
 *
 * Database Schema Note:
 * The codebase references 'transactions_v2' but this table may not exist in all environments.
 * This module provides type-safe abstractions that can work with various transaction schemas.
 */

import { Database } from "@/integrations/supabase/types";

// Get enum types from database
type TransactionType = Database["public"]["Enums"]["transaction_type"];
type AssetCode = Database["public"]["Enums"]["asset_code"];

/**
 * Application-level transaction type
 * Normalized interface regardless of underlying schema
 */
export interface Transaction {
  id: string;
  investor_id: string;
  type: TransactionType;
  asset_code: AssetCode;
  amount: number;
  notes: string | null;
  tx_hash: string | null;
  created_at: string;
  created_by: string | null;
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
 * Transaction summary aggregates
 */
export interface TransactionSummary {
  total_deposits: number;
  total_withdrawals: number;
  total_fees: number;
  total_yield: number;
  net_flow: number;
  transaction_count: number;
  by_asset: Record<
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
  min_amount?: number;
  max_amount?: number;
}

/**
 * Convert database transaction to application transaction
 * Handles different field naming conventions (investor_id vs user_id, notes vs note)
 */
export function mapDbTransactionToTransaction(dbTx: any): Transaction {
  return {
    id: dbTx.id,
    investor_id: dbTx.investor_id || dbTx.user_id,
    type: dbTx.type as TransactionType,
    asset_code: dbTx.asset_code,
    amount: Number(dbTx.amount) || 0,
    notes: dbTx.notes || dbTx.note || null,
    tx_hash: dbTx.tx_hash || dbTx.transaction_hash || null,
    created_at: dbTx.created_at,
    created_by: dbTx.created_by || null,
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
export function formatTransactionType(type: TransactionType): string {
  const typeMap: Record<string, string> = {
    DEPOSIT: "Deposit",
    WITHDRAWAL: "Withdrawal",
    FEE: "Fee",
    INTEREST: "Interest",
  };
  return typeMap[type] || type.charAt(0) + type.slice(1).toLowerCase();
}

/**
 * Calculate net amount (positive for deposits/interest, negative for withdrawals/fees)
 */
export function getTransactionNetAmount(tx: Transaction): number {
  const amount = Number(tx.amount) || 0;
  if (tx.type === "DEPOSIT" || tx.type === "INTEREST") {
    return amount;
  }
  if (tx.type === "WITHDRAWAL" || tx.type === "FEE") {
    return -amount;
  }
  return amount;
}
