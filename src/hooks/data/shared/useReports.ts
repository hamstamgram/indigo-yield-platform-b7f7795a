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
  sendReportEmail,
  fetchHistoricalReports,
  deleteInvestorReport,
} from "@/services/admin";
import type { InvestorReportSummary, DeliveryStatus } from "@/services/admin/reportQueryService";

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
    queryKey: QUERY_KEYS.adminInvestorReports(selectedMonth),
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
    mutationFn: ({
      year,
      month,
      investorId,
    }: {
      year: number;
      month: number;
      investorId?: string;
    }) => generateFundPerformanceReports(year, month, investorId),
    onSuccess: (data) => {
      toast.success("Reports Generated", {
        description: data.message || `Generated ${data.recordsCreated} performance records`,
      });
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvestorReports() });
    },
    onError: (error: Error) => {
      toast.error("Generation Failed", { description: error.message });
    },
  });
}

/**
 * Hook to fetch latest performance for statement generator
 */
export function useLatestPerformance(investorId: string, assetCode: string) {
  return useQuery({
    queryKey: QUERY_KEYS.latestPerformance(investorId, assetCode),
    queryFn: () => fetchLatestPerformance(investorId, assetCode),
    enabled: !!investorId && !!assetCode,
  });
}

/**
 * Hook to fetch active investors for statements
 */
export function useActiveInvestorsForStatements() {
  return useQuery({
    queryKey: QUERY_KEYS.activeInvestorsStatements,
    queryFn: fetchActiveInvestorsForStatements,
  });
}

/**
 * Hook to send a report email
 */
export function useSendReportEmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investorId, periodId }: { investorId: string; periodId: string }) =>
      sendReportEmail(investorId, periodId),
    onSuccess: () => {
      toast.success("Email sent successfully");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvestorReports() });
    },
    onError: (error: Error) => {
      toast.error("Failed to send email", { description: error.message });
    },
  });
}

/**
 * Hook to delete an investor's report for a period
 */
export function useDeleteInvestorReport() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ investorId, periodId }: { investorId: string; periodId: string }) =>
      deleteInvestorReport(investorId, periodId),
    onSuccess: () => {
      toast.success("Report deleted successfully");
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.adminInvestorReports() });
    },
    onError: (error: Error) => {
      toast.error("Failed to delete report", { description: error.message });
    },
  });
}

/**
 * Hook to fetch historical reports
 */
export function useHistoricalReports(filters?: {
  month?: string;
  investorId?: string;
  fundName?: string;
  page?: number;
  pageSize?: number;
}) {
  return useQuery({
    queryKey: ["historical-reports", filters],
    queryFn: () => fetchHistoricalReports(filters),
  });
}
