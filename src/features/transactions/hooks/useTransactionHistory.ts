import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { transactionApi } from '@/services/api/transactionApi';

interface Transaction {
  id: string;
  type: 'buy' | 'sell' | 'dividend' | 'deposit' | 'withdrawal';
  symbol?: string;
  quantity?: number;
  price?: number;
  amount: number;
  fee?: number;
  date: string;
  status: 'completed' | 'pending' | 'failed';
  description?: string;
}

interface TransactionState {
  transactions: Transaction[];
  loading: boolean;
  error: string | null;
}

interface UseTransactionHistoryOptions {
  limit?: number;
  type?: Transaction['type'];
  symbol?: string;
  dateFrom?: string;
  dateTo?: string;
}

export function useTransactionHistory(options: UseTransactionHistoryOptions = {}) {
  const { user } = useAuth();
  const [state, setState] = useState<TransactionState>({
    transactions: [],
    loading: true,
    error: null
  });

  const fetchTransactions = async () => {
    if (!user) return;

    try {
      setState(prev => ({ ...prev, loading: true, error: null }));
      
      const result = await transactionApi.getTransactionHistory(user.id, {
        limit: options.limit,
        type: options.type,
        symbol: options.symbol,
        dateFrom: options.dateFrom,
        dateTo: options.dateTo
      });
      
      if (result.error) {
        throw new Error(result.error);
      }

      setState({
        transactions: result.data || [],
        loading: false,
        error: null
      });
    } catch (error) {
      setState({
        transactions: [],
        loading: false,
        error: error instanceof Error ? error.message : 'Failed to fetch transactions'
      });
    }
  };

  useEffect(() => {
    fetchTransactions();
  }, [user, options.limit, options.type, options.symbol, options.dateFrom, options.dateTo]);

  const addTransaction = async (transactionData: Omit<Transaction, 'id' | 'date' | 'status'>) => {
    if (!user) return { error: 'User not authenticated' };

    try {
      const result = await transactionApi.createTransaction(user.id, transactionData);
      
      if (result.error) {
        return { error: result.error };
      }

      // Refresh the list after successful addition
      await fetchTransactions();
      return { data: result.data };
    } catch (error) {
      return { 
        error: error instanceof Error ? error.message : 'Failed to add transaction' 
      };
    }
  };

  const refresh = () => {
    fetchTransactions();
  };

  return {
    ...state,
    addTransaction,
    refresh
  };
}