/**
 * Transaction Data Hooks
 * Abstracts transaction operations from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { transactionsV2Service, transactionService } from "@/services";
import type { QuickTransactionParams } from "@/services/shared/transactionService";
import { toast } from "sonner";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { Database } from "@/integrations/supabase/types";

import type { TransactionWithFund } from "@/types/domains/transaction";

// Re-export for backwards compatibility
export type Transaction = TransactionWithFund;

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
    .eq("is_voided", false)
    .order("tx_date", { ascending: false });

  if (filters.investorId) {
    query = query.eq("investor_id", filters.investorId);
  }

  if (filters.fundId) {
    query = query.eq("fund_id", filters.fundId);
  }

  if (filters.type) {
    query = query.eq("type", filters.type as Database["public"]["Enums"]["tx_type"]);
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
    queryKey: QUERY_KEYS.transactions(filters),
    queryFn: () => fetchTransactions(filters),
    enabled: !filters.investorId || !!filters.investorId, // Always enabled unless investorId is explicitly required
  });
}

/**
 * Hook to fetch transactions for a specific investor
 */
export function useInvestorTransactions(investorId: string, limit?: number) {
  return useQuery<Transaction[], Error>({
    queryKey: QUERY_KEYS.investorTransactions(investorId, limit),
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
    mutationFn: async (params: QuickTransactionParams) => {
      await transactionService.createQuickTransaction(params);
      return { success: true };
    },
    onSuccess: (_, variables) => {
      invalidateAfterTransaction(queryClient, variables.investorId, variables.fundId);
      toast.success("Transaction created successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create transaction: ${error.message}`);
    },
  });
}

/**
 * Hook to void a transaction
 * Uses the void_transaction RPC which properly:
 * - Marks transaction as voided with reason and timestamp
 * - Recomputes investor position
 * - Writes audit log entry
 */
export function useVoidTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ transactionId, reason }: { transactionId: string; reason: string }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      // Use the service which calls the proper void_transaction RPC
      await transactionsV2Service.voidTransaction(transactionId, reason);
    },
    onSuccess: () => {
      // Invalidate all related caches including positions
      invalidateAfterTransaction(queryClient);
      toast.success("Transaction voided successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to void transaction: ${error.message}`);
    },
  });
}

/**
 * Get transaction summary for an investor (deposits, withdrawals, yield totals)
 */
export function useInvestorTransactionSummary(investorId: string | undefined) {
  return useQuery({
    queryKey: ["investor", "transactionSummary", investorId],
    queryFn: () => transactionsV2Service.getSummary(investorId!),
    enabled: !!investorId,
  });
}
