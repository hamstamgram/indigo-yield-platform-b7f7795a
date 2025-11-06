// @ts-nocheck
/**
 * Transaction Domain Types
 * Clean abstractions for transaction-related entities
 */

import { Database } from '@/integrations/supabase/types';

// Base types from database
type DbTransaction = Database['public']['Tables']['transactions_v2']['Row'];
type TransactionType = Database['public']['Enums']['transaction_type'];
type TransactionStatus = Database['public']['Enums']['transaction_status'];
type AssetCode = Database['public']['Enums']['asset_code'];

// Application-level transaction types
export interface Transaction {
  id: string;
  user_id: string;
  type: TransactionType;
  asset_code: AssetCode;
  amount: number;
  status: TransactionStatus;
  note: string | null;
  tx_hash: string | null;
  created_at: string;
  confirmed_at: string | null;
  created_by: string | null;
}

export interface TransactionWithProfile extends Transaction {
  profile: {
    first_name: string | null;
    last_name: string | null;
    email: string;
  };
}

export interface TransactionSummary {
  total_deposits: number;
  total_withdrawals: number;
  total_fees: number;
  net_flow: number;
  transaction_count: number;
}

export type TransactionFilter = {
  type?: TransactionType;
  status?: TransactionStatus;
  asset_code?: AssetCode;
  date_from?: string;
  date_to?: string;
  user_id?: string;
};

// Convert database transaction to application transaction
export function mapDbTransactionToTransaction(dbTx: DbTransaction): Transaction {
  return {
    id: dbTx.id,
    user_id: dbTx.user_id,
    type: dbTx.type,
    asset_code: dbTx.asset_code,
    amount: dbTx.amount,
    status: dbTx.status,
    note: dbTx.note,
    tx_hash: dbTx.tx_hash,
    created_at: dbTx.created_at,
    confirmed_at: dbTx.confirmed_at,
    created_by: dbTx.created_by,
  };
}
