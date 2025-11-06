// @ts-nocheck
import { supabase } from '@/integrations/supabase/client';

// Simplified transaction interfaces for now
interface Transaction {
  id: string;
  [key: string]: any; // Flexible for now
}

interface TransactionInsert {
  [key: string]: any; // Flexible for now
}

export interface TransactionFilter {
  userId?: string;
  portfolioId?: string;
  assetId?: string;
  txnType?: string;
  startDate?: string;
  endDate?: string;
  limit?: number;
  offset?: number;
}

export interface TransactionSummary {
  totalCount: number;
  totalDeposits: number;
  totalWithdrawals: number;
  totalFees: number;
  recentTransactions: Transaction[];
}

/**
 * Simplified transaction API - focused on basic functionality for now
 * TODO: Enhance with proper typing in Phase 2
 */
export async function fetchTransactions(filter: TransactionFilter = {}): Promise<{
  data: any[];
  count: number;
}> {
  try {
    const { data, error, count } = await supabase
      .from('transactions_v2')
      .select('*', { count: 'exact' })
      .order('created_at', { ascending: false })
      .limit(filter.limit || 50);

    if (error) throw error;

    return {
      data: data || [],
      count: count || 0
    };
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return { data: [], count: 0 };
  }
}

// Simplified implementations for Phase 1 - will be enhanced in Phase 2
export async function fetchTransactionById(id: string): Promise<any> { return null; }
export async function createTransactionRecord(transaction: any): Promise<any> { return null; }
export async function updateTransactionRecord(id: string, updates: any): Promise<any> { return null; }
export async function deleteTransactionRecord(id: string): Promise<void> { }
export async function fetchTransactionSummary(userId: string): Promise<TransactionSummary> {
  return {
    totalCount: 0,
    totalDeposits: 0,
    totalWithdrawals: 0,
    totalFees: 0,
    recentTransactions: []
  };
}

/**
 * Error handling wrapper for transaction API calls
 */
export function withTransactionErrorHandling<T extends any[], R>(
  fn: (...args: T) => Promise<R>
) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error('Transaction API Error:', error);
      throw error;
    }
  };
}

// API object for easy consumption
const getTransactionHistory = async (userId: string, options: any = {}) => {
  try {
    const data = await fetchTransactions({ userId, ...options });
    return { data: data.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const createTransaction = async (userId: string, transactionData: any) => {
  try {
    const data = await createTransactionRecord(transactionData);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const updateTransaction = async (transactionId: string, updates: any) => {
  try {
    const data = await updateTransactionRecord(transactionId, updates);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const deleteTransaction = async (transactionId: string) => {
  try {
    await deleteTransactionRecord(transactionId);
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

const getTransactionById = async (transactionId: string) => {
  try {
    const data = await fetchTransactionById(transactionId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : 'Unknown error' };
  }
};

export const transactionApi = {
  getTransactionHistory,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionById
};

// Export wrapped functions for additional error handling
export const safeFetchTransactions = withTransactionErrorHandling(fetchTransactions);
export const safeFetchTransactionById = withTransactionErrorHandling(fetchTransactionById);
export const safeFetchTransactionSummary = withTransactionErrorHandling(fetchTransactionSummary);

export default transactionApi;