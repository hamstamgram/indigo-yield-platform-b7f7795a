/**
 * Transaction Details Hooks
 * React Query hooks for fetching individual transactions and form data
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getTransactionById,
  getTransactionWithRelated,
  getTransactionFormData,
  checkInvestorBalance,
  checkAumExists,
  createAdminTransaction,
  saveDraftAUMEntry,
} from "@/services";
import type {
  TransactionDetail,
  TransactionWithRelated,
  InvestorForTransaction,
  FundForTransaction,
  BalanceCheckResult,
  AumCheckResult,
} from "@/services/admin/transactionDetailsService";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";

// ==================== Re-export types ====================

export type {
  TransactionDetail,
  TransactionWithRelated,
  InvestorForTransaction,
  FundForTransaction,
  BalanceCheckResult,
  AumCheckResult,
} from "@/services/admin/transactionDetailsService";

// ==================== Hooks ====================

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
  return useQuery<{
    investors: InvestorForTransaction[];
    funds: FundForTransaction[];
  }, Error>({
    queryKey: [...QUERY_KEYS.adminTransactionsHistory(), "form-data"],
    queryFn: getTransactionFormData,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Hook to check investor balance for a specific fund
 * Returns BalanceCheckResult with hasBalance flag and current value
 * @see useInvestorBalance in investor/useInvestorBalance.ts for raw balance value
 */
export function useBalanceCheckForTransaction(investorId: string | undefined, fundId: string | undefined) {
  return useQuery<BalanceCheckResult, Error>({
    queryKey: [...QUERY_KEYS.positions(investorId || ""), fundId, "balance-check"],
    queryFn: () => {
      if (!investorId || !fundId) throw new Error("Investor and fund required");
      return checkInvestorBalance(investorId, fundId);
    },
    enabled: !!investorId && !!fundId,
  });
}

// Backward compatibility alias - will be removed in future version
export const useInvestorBalance = useBalanceCheckForTransaction;

/**
 * Hook to check if AUM exists for a fund on a specific date
 */
export function useAumCheck(fundId: string | undefined, date: string | undefined) {
  return useQuery<AumCheckResult, Error>({
    queryKey: [...QUERY_KEYS.fundAumAll, fundId, date, "check"],
    queryFn: () => {
      if (!fundId || !date) throw new Error("Fund and date required");
      return checkAumExists(fundId, date);
    },
    enabled: !!fundId && !!date,
  });
}

// ==================== Mutation Types ====================

// Uses the canonical UI params type (allows FIRST_INVESTMENT)
import type { CreateTransactionUIParams } from "@/types/domains/transaction";

interface LocalCreateTransactionParams {
  investorId: string;
  fundId: string;
  type: "FIRST_INVESTMENT" | "DEPOSIT" | "WITHDRAWAL";
  amount: number;
  txDate: string;
  asset: string;
  description?: string;
  txHash?: string;
}

interface RecordAumParams {
  fundId: string;
  date: Date;
  aum: number;
  notes?: string;
}

// ==================== Mutation Hooks ====================

/**
 * Hook to create a new admin transaction
 */
export function useCreateAdminTransaction() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: LocalCreateTransactionParams) => {
      const result = await createAdminTransaction({
        investor_id: params.investorId,
        fund_id: params.fundId,
        type: params.type as CreateTransactionUIParams["type"],
        amount: params.amount,
        tx_date: params.txDate,
        asset: params.asset,
        notes: params.description,
        tx_hash: params.txHash,
      });

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
 * Hook to record AUM entry
 */
export function useRecordAum() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: RecordAumParams) => {
      const { data: userData } = await supabase.auth.getUser();
      await saveDraftAUMEntry(
        params.fundId,
        params.date,
        params.aum,
        params.notes || "Recorded for transaction creation",
        userData.user?.id
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.fundAumAll });
      toast.success("AUM recorded successfully");
    },
    onError: (error: Error) => {
      const errorMsg = error.message || "Failed to record AUM";
      toast.error(
        errorMsg.includes("Permission") 
          ? "Permission denied: Admin access required." 
          : errorMsg
      );
    },
  });
}
