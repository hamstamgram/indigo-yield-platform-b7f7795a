/**
 * React Query hooks for admin transaction history
 */

import { useQuery } from "@tanstack/react-query";
import { adminTransactionHistoryService } from "@/features/admin/transactions/services/adminTransactionHistoryService";
import { QUERY_KEYS } from "@/constants/queryKeys";
import type { AdminTransactionFilters, FundOption } from "@/types/domains/transaction";

/**
 * Fetch active funds for filter dropdowns (admin context)
 */
export function useAdminActiveFunds() {
  return useQuery({
    queryKey: QUERY_KEYS.adminFundsActive,
    queryFn: () => adminTransactionHistoryService.fetchActiveFunds(),
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
}

/**
 * Fetch paginated transactions with filters
 */
export function useAdminTransactions(filters: AdminTransactionFilters, funds: FundOption[]) {
  return useQuery({
    queryKey: QUERY_KEYS.adminTransactionsHistory({
      selectedFund: filters.fundId || "all",
      selectedType: filters.type || "all",
      dateFrom: filters.dateFrom || "",
      dateTo: filters.dateTo || "",
      datetimeFrom: filters.datetimeFrom || "",
      datetimeTo: filters.datetimeTo || "",
      page: filters.page || 0,
      showVoided: filters.showVoided || false,
    }),
    queryFn: () => adminTransactionHistoryService.fetchTransactions(filters, funds),
    // Always run query - let server handle filtering based on fundId
    enabled: true,
  });
}
