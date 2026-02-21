/**
 * Unified Transaction Hooks
 * Consolidated logic for fetching, creating, and managing transactions.
 * Replaces: useTransactions.ts, useTransactionDetails.ts, useTransactionMutations.ts
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { createInvestorTransaction, transactionService } from "@/services/shared";
import { transactionsV2Service } from "@/services/investor";
import {
  getTransactionById,
  getTransactionWithRelated,
  getTransactionFormData,
  checkInvestorBalance,
} from "@/services/admin";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { Database } from "@/integrations/supabase/types";
import type {
  TransactionDetail,
  TransactionWithRelated,
  InvestorForTransaction,
  FundForTransaction,
  BalanceCheckResult,
  AumCheckResult,
} from "@/services/admin/transactionDetailsService";
import type { CreateTransactionUIParams } from "@/types/domains/transaction";

// Import TransactionWithFund from canonical source
import { TransactionWithFund } from "@/types/domains/transaction";

// ==================== Types ====================

export type {
  TransactionWithFund,
  TransactionDetail,
  TransactionWithRelated,
  InvestorForTransaction,
  FundForTransaction,
  BalanceCheckResult,
};

export interface TransactionFilters {
  investorId?: string;
  fundId?: string;
  type?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

interface LocalCreateTransactionParams {
  investorId: string;
  fundId: string;
  type: "FIRST_INVESTMENT" | "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  txDate: string;
  asset: string;
  closing_aum?: string | number;
  description?: string;
  txHash?: string;
}

// ==================== Queries ====================

/**
 * Fetch transactions with filters
 */
async function fetchTransactions(filters: TransactionFilters): Promise<TransactionWithFund[]> {
  let query = supabase
    .from("transactions_v2")
    .select(
      `
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
    `
    )
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
    fund: tx.funds as TransactionWithFund["fund"],
  }));
}

/**
 * Hook to fetch transactions with optional filters
 */
export function useTransactions(filters: TransactionFilters = {}) {
  return useQuery<TransactionWithFund[], Error>({
    queryKey: QUERY_KEYS.transactions(filters),
    queryFn: () => fetchTransactions(filters),
    enabled: !filters.investorId || !!filters.investorId,
  });
}

/**
 * Hook to fetch transactions for a specific investor
 */
export function useInvestorTransactions(investorId: string, limit?: number) {
  return useQuery<TransactionWithFund[], Error>({
    queryKey: QUERY_KEYS.investorTransactions(investorId, limit),
    queryFn: () => fetchTransactions({ investorId, limit }),
    enabled: !!investorId,
  });
}

/**
 * Hook to fetch a single transaction by ID
 */
export function useTransactionById(id: string | undefined) {
  return useQuery<TransactionDetail | null, Error>({
    queryKey: QUERY_KEYS.transactionsV2(id || ""),
    queryFn: () => {
      if (!id) throw new Error("No ID provided");
      return getTransactionById(id);
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch a transaction with related investor and fund data
 */
export function useTransactionWithRelated(id: string | undefined) {
  return useQuery<TransactionWithRelated | null, Error>({
    queryKey: [...QUERY_KEYS.transactionsV2(id || ""), "related"],
    queryFn: () => {
      if (!id) throw new Error("No ID provided");
      return getTransactionWithRelated(id);
    },
    enabled: !!id,
  });
}

/**
 * Hook to fetch investors and funds for transaction form
 */
export function useTransactionFormData() {
  return useQuery<
    {
      investors: InvestorForTransaction[];
      funds: FundForTransaction[];
    },
    Error
  >({
    queryKey: [...QUERY_KEYS.adminTransactionsHistory(), "form-data"],
    queryFn: getTransactionFormData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Get transaction summary for an investor
 */
export function useInvestorTransactionSummary(investorId: string | undefined) {
  return useQuery({
    queryKey: QUERY_KEYS.investorTransactionSummary(investorId || ""),
    queryFn: () => transactionsV2Service.getSummary(investorId!),
    enabled: !!investorId,
  });
}

// ==================== Validation Helpers ====================

/**
 * Hook to check investor balance for a specific fund
 */
export function useBalanceCheckForTransaction(
  investorId: string | undefined,
  fundId: string | undefined
) {
  return useQuery<BalanceCheckResult, Error>({
    queryKey: [...QUERY_KEYS.investorPositions(investorId || ""), fundId, "balance-check"],
    queryFn: () => {
      if (!investorId || !fundId) throw new Error("Investor and fund required");
      return checkInvestorBalance(investorId, fundId);
    },
    enabled: !!investorId && !!fundId,
  });
}

// Alias for backward compatibility
export const useInvestorBalance = useBalanceCheckForTransaction;

// ==================== Mutations ====================

/**
 * Hook to create a new transaction (Simple/Quick)
 */
export function useCreateTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: any) => {
      // Changed type to any as QuickTransactionParams is removed
      await transactionService.createQuickTransaction(params); // Assuming transactionService now handles this
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
 * Hook to create a new admin transaction (Full Control)
 */
export function useCreateAdminTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LocalCreateTransactionParams) => {
      const newTransaction = {
        investor_id: params.investorId,
        fund_id: params.fundId,
        type: params.type as CreateTransactionUIParams["type"],
        amount: String(params.amount),
        tx_date: params.txDate,
        closing_aum: params.closing_aum ? String(params.closing_aum) : undefined,
        asset: params.asset,
        notes: params.description,
        tx_hash: params.txHash,
      };

      const result = await createInvestorTransaction(newTransaction);

      if (!result.success) {
        throw new Error(result.error || "Failed to create transaction");
      }

      return result;
    },
    onSuccess: (_, params) => {
      invalidateAfterTransaction(queryClient, params.investorId, params.fundId);
      toast.success(
        `Successfully created ${params.type.toLowerCase().replace(/_/g, " ")} of ${params.amount} ${params.asset}.`
      );
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to create transaction");
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
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");

      await transactionsV2Service.voidTransaction(transactionId, reason);
    },
    onSuccess: () => {
      invalidateAfterTransaction(queryClient);
      toast.success("Transaction voided successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to void transaction: ${error.message}`);
    },
  });
}
