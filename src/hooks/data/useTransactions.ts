/**
 * Transaction Data Hooks
 * Abstracts transaction operations from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { adminTransactionService, CreateTransactionParams } from "@/services/admin/adminTransactionService";
import { transactionsV2Service } from "@/services/shared";
import { toast } from "sonner";

export interface Transaction {
  id: string;
  investor_id: string;
  fund_id: string;
  type: string;
  amount: number;
  tx_date: string;
  notes: string | null;
  created_at: string;
  created_by: string | null;
  fund?: {
    id: string;
    name: string;
    code: string;
  } | null;
}

export interface TransactionFilters {
  investorId?: string;
  fundId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

/**
 * Fetch transactions with filters
 */
async function fetchTransactions(filters: TransactionFilters): Promise<Transaction[]> {
  let query = supabase
    .from("transactions_v2")
    .select(`
      id,
      investor_id,
      fund_id,
      type,
      amount,
      tx_date,
      notes,
      created_at,
      created_by,
      funds:fund_id (id, name, code)
    `)
    .order("tx_date", { ascending: false });

  if (filters.investorId) {
    query = query.eq("investor_id", filters.investorId);
  }

  if (filters.fundId) {
    query = query.eq("fund_id", filters.fundId);
  }

  if (filters.type) {
    query = query.eq("type", filters.type as any);
  }

  if (filters.dateFrom) {
    query = query.gte("tx_date", filters.dateFrom);
  }

  if (filters.dateTo) {
    query = query.lte("tx_date", filters.dateTo);
  }

  if (filters.limit) {
    query = query.limit(filters.limit);
  }

  const { data, error } = await query;

  if (error) throw error;
  
  return (data || []).map((tx: any) => ({
    ...tx,
    fund: tx.funds as Transaction["fund"]
  }));
}

/**
 * Hook to fetch transactions with optional filters
 */
export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<Transaction[], Error>({
    queryKey: ["transactions", filters],
    queryFn: () => fetchTransactions(filters),
    enabled: !filters.investorId || !!filters.investorId, // Always enabled unless investorId is explicitly required
  });
}

/**
 * Hook to fetch transactions for a specific investor
 */
export function useInvestorTransactions(investorId: string, limit?: number) {
  return useQuery<Transaction[], Error>({
    queryKey: ["investor-transactions", investorId, limit],
    queryFn: () => fetchTransactions({ investorId, limit }),
    enabled: !!investorId,
  });
}

/**
 * Hook to create a new transaction
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: CreateTransactionParams) => {
      return adminTransactionService.createTransaction(params);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["investor-transactions", variables.investorId] });
      queryClient.invalidateQueries({ queryKey: ["investor-positions", variables.investorId] });
      toast.success("Transaction created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create transaction: ${error.message}`);
    },
  });
}

/**
 * Hook to void a transaction
 */
export function useVoidTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await transactionsV2Service.voidTransaction(transactionId, reason);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
      queryClient.invalidateQueries({ queryKey: ["investor-transactions"] });
      toast.success("Transaction voided successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to void transaction: ${error.message}`);
    },
  });
}
