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
    queryKey: ["admin", "transactionForm", "investors"],
    queryFn: transactionFormDataService.fetchInvestorsForTransactionForm,
  });
}

/**
 * Hook to fetch funds for transaction form
 */
export function useTransactionFormFunds() {
  return useQuery<TransactionFormFund[]>({
    queryKey: ["admin", "transactionForm", "funds"],
    queryFn: transactionFormDataService.fetchFundsForTransactionForm,
  });
}

/**
 * Hook to check AUM existence
 */
export function useAumCheck(fundId: string | undefined, date: string | undefined) {
  return useQuery<boolean>({
    queryKey: ["admin", "aumCheck", fundId, date],
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
    queryKey: ["admin", "balanceCheck", investorId, fundId],
    queryFn: () => transactionFormDataService.checkInvestorBalance(investorId!, fundId!),
    enabled: !!investorId && !!fundId,
  });
}

// Re-export types
export type { TransactionFormInvestor, TransactionFormFund, BalanceCheckResult };
