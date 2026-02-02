/**
 * Transaction Form Data Hooks
 * React Query hooks for manual transaction form
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  transactionFormDataService,
  type TransactionFormInvestor,
  type TransactionFormFund,
  type BalanceCheckResult,
} from "@/services/admin/transactionFormDataService";

/**
 * Hook to fetch investors for transaction form
 */
export function useTransactionFormInvestors() {
  return useQuery<TransactionFormInvestor[]>({
    queryKey: QUERY_KEYS.adminTransactionFormInvestors,
    queryFn: transactionFormDataService.fetchInvestorsForTransactionForm,
  });
}

/**
 * Hook to fetch funds for transaction form
 */
export function useTransactionFormFunds() {
  return useQuery<TransactionFormFund[]>({
    queryKey: QUERY_KEYS.adminTransactionFormFunds,
    queryFn: transactionFormDataService.fetchFundsForTransactionForm,
  });
}

/**
 * Hook to check AUM existence
 */
export function useAumCheck(fundId: string | undefined, date: string | undefined) {
  return useQuery<boolean>({
    queryKey: QUERY_KEYS.adminAumCheck(fundId || "", date || ""),
    queryFn: () => transactionFormDataService.checkAumExists(fundId!, date!),
    enabled: !!fundId && !!date,
  });
}

/**
 * Hook to check investor balance
 */
export function useInvestorBalanceCheck(
  investorId: string | undefined,
  fundId: string | undefined
) {
  return useQuery<BalanceCheckResult>({
    queryKey: QUERY_KEYS.adminBalanceCheck(investorId || "", fundId || ""),
    queryFn: () => transactionFormDataService.checkInvestorBalance(investorId!, fundId!),
    enabled: !!investorId && !!fundId,
  });
}

// Re-export types
export type { TransactionFormInvestor, TransactionFormFund, BalanceCheckResult };
