/**
 * Reports Data Hooks
 * React Query hooks for report operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  fetchInvestorPerformanceReports,
  fetchPerformanceReportById,
  fetchAdminInvestorReports,
  generateFundPerformanceReports,
  fetchLatestPerformance,
  fetchActiveInvestorsForStatements,
  type InvestorReportSummary,
  type PerformanceReportDetail,
} from "@/services/admin/reportQueryService";
import { format, parseISO } from "date-fns";

/**
 * Hook to fetch investor performance reports (investor-side)
 */
export function useInvestorPerformanceReports(searchTerm?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.investorFundPerformance(searchTerm || ""),
    queryFn: () => fetchInvestorPerformanceReports(searchTerm),
  });
}

/**
 * Hook to fetch a single performance report by ID
 */
export function usePerformanceReportDetail(id: string) {
  return useQuery({
    queryKey: QUERY_KEYS.investorFundPerformanceDetail(id),
    queryFn: () => fetchPerformanceReportById(id),
    enabled: !!id,
  });
}

/**
 * Hook to fetch admin investor reports for a month
 */
export function useAdminInvestorReports(selectedMonth: string) {
  return useQuery<{ reports: InvestorReportSummary[]; periodId: string }>({
    queryKey: ["admin-investor-reports", selectedMonth],
    queryFn: () => fetchAdminInvestorReports(selectedMonth),
    enabled: !!selectedMonth,
  });
}

/**
 * Hook to generate fund performance reports
 */
export function useGenerateFundPerformance() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ year, month }: { year: number; month: number }) =>
      generateFundPerformanceReports(year, month),
    onSuccess: (data) => {
      toast.success("Reports Generated", {
        description: data.message || `Generated ${data.recordsCreated} performance records`,
      });
      queryClient.invalidateQueries({ queryKey: ["admin-investor-reports"] });
    },
    onError: (error: any) => {
      const errorStr = error?.message || error?.toString() || "";
      
      let errorTitle = "Generation Failed";
      let errorMessage = "Failed to generate performance data";
      
      if (errorStr.includes("403") || errorStr.includes("Admin access required") || errorStr.includes("ADMIN_REQUIRED")) {
        errorTitle = "Access Denied";
        errorMessage = "You don't have administrator permissions to generate reports.";
      } else if (errorStr.includes("401") || errorStr.includes("Authorization") || errorStr.includes("token")) {
        errorTitle = "Session Expired";
        errorMessage = "Your session has expired. Please refresh the page and try again.";
      } else if (errorStr.includes("non-2xx") || errorStr.includes("FunctionsHttpError")) {
        errorTitle = "Service Error";
        errorMessage = "The report generation service encountered an error.";
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorTitle, { description: errorMessage });
    },
  });
}

/**
 * Hook to fetch latest performance for statement generator
 */
export function useLatestPerformance(investorId: string, assetCode: string) {
  return useQuery({
    queryKey: ["latest-performance", investorId, assetCode],
    queryFn: () => fetchLatestPerformance(investorId, assetCode),
    enabled: !!investorId && !!assetCode,
  });
}

/**
 * Hook to fetch active investors for statements
 */
export function useActiveInvestorsForStatements() {
  return useQuery({
    queryKey: ["active-investors-statements"],
    queryFn: fetchActiveInvestorsForStatements,
  });
}

/**
 * Hook to generate statement (uses mutation for the statement generation)
 */
export function useGenerateStatement(
  onSuccess?: () => void
) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: {
      investorId: string;
      assetCode: string;
    }) => {
      const data = await fetchLatestPerformance(params.investorId, params.assetCode);
      if (!data) throw new Error("No performance data found for this investor/asset/period.");
      return data;
    },
    onSuccess: () => {
      onSuccess?.();
    },
    onError: (error: Error) => {
      toast.error("Failed to generate statement", { description: error.message });
    },
  });
}
