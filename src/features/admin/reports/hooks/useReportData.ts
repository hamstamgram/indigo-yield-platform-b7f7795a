/**
 * Report Data Hooks
 *
 * React Query hooks for report generation and historical data management.
 * These hooks provide caching, loading states, and mutation capabilities.
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  reportService,
  type BulkGenerateOptions,
  type SendReportParams,
} from "@/services/admin/reportService";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { toast } from "sonner";

/**
 * Hook to fetch historical data summary statistics
 */
export function useHistoricalDataSummary() {
  const query = useQuery({
    queryKey: QUERY_KEYS.historicalDataSummary,
    queryFn: () => reportService.getHistoricalDataSummary(),
  });

  return {
    summary: query.data ?? {
      totalReports: 0,
      latestMonth: null,
      earliestMonth: null,
      investorCount: 0,
      assetCount: 0,
    },
    isLoading: query.isLoading,
    error: query.error,
    refetch: query.refetch,
  };
}

/**
 * Hook to fetch active investors for report generation
 */
export function useActiveInvestorsForReports() {
  const query = useQuery({
    queryKey: QUERY_KEYS.activeInvestors,
    queryFn: () => reportService.getActiveInvestors(),
  });

  return {
    investors: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook to fetch statement period by year and month
 */
export function useStatementPeriod(year: number, month: number) {
  const query = useQuery({
    queryKey: QUERY_KEYS.statementPeriodByDate(year, month),
    queryFn: () => reportService.getStatementPeriod(year, month),
    enabled: !!year && !!month,
  });

  return {
    period: query.data,
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Hook to fetch investor performance data for a specific period
 */
export function useInvestorReportData(investorId: string, periodId: string) {
  const query = useQuery({
    queryKey: QUERY_KEYS.investorReportData(investorId, periodId),
    queryFn: () => reportService.getInvestorPerformanceForPeriod(investorId, periodId),
    enabled: !!investorId && !!periodId,
  });

  return {
    performanceData: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
  };
}

/**
 * Mutation hook for generating historical templates
 */
export function useGenerateTemplates() {
  const queryClient = useQueryClient();

  const mutation = useMutation({
    mutationFn: (options: BulkGenerateOptions) => reportService.generateMissingTemplates(options),
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: QUERY_KEYS.historicalDataSummary });

      if (result.success) {
        toast.success(`Generated ${result.generated} historical report templates`);
      } else {
        toast.warning(
          `Generated ${result.generated} templates with ${result.errors.length} errors`
        );
      }
    },
    onError: (error: Error) => {
      toast.error("Failed to generate templates", {
        description: error.message,
      });
    },
  });

  return {
    generateTemplates: mutation.mutateAsync,
    isGenerating: mutation.isPending,
    result: mutation.data,
    error: mutation.error,
    reset: mutation.reset,
  };
}

/**
 * Mutation hook for sending investor report email
 */
export function useSendInvestorReport() {
  const mutation = useMutation({
    mutationFn: (params: SendReportParams) => reportService.sendInvestorReport(params),
    onSuccess: (_, variables) => {
      toast.success("Email Sent", {
        description: `Report sent to ${variables.to}`,
      });
    },
    onError: (error: Error) => {
      toast.error("Send Failed", {
        description: error.message,
      });
    },
  });

  return {
    sendReport: mutation.mutateAsync,
    isSending: mutation.isPending,
    error: mutation.error,
  };
}

/**
 * Hook to fetch data for PDF/Excel report generation
 */
export function useReportGenerationData(
  investorId: string,
  dateRange: { start: Date; end: Date } | null
) {
  const positionsQuery = useQuery({
    queryKey: QUERY_KEYS.reportPositions(investorId),
    queryFn: () => reportService.getInvestorPositions(investorId),
    enabled: !!investorId && !!dateRange,
  });

  const transactionsQuery = useQuery({
    queryKey: QUERY_KEYS.reportTransactions(
      investorId,
      dateRange?.start.toISOString(),
      dateRange?.end.toISOString()
    ),
    queryFn: () => reportService.getInvestorTransactions(investorId, dateRange!),
    enabled: !!investorId && !!dateRange,
  });

  const statementsQuery = useQuery({
    queryKey: QUERY_KEYS.reportStatements(
      investorId,
      dateRange?.start.toISOString(),
      dateRange?.end.toISOString()
    ),
    queryFn: () => reportService.getInvestorPerformanceStatements(investorId, dateRange!),
    enabled: !!investorId && !!dateRange,
  });

  return {
    positions: positionsQuery.data ?? [],
    transactions: transactionsQuery.data ?? [],
    statements: statementsQuery.data ?? [],
    isLoading: positionsQuery.isLoading || transactionsQuery.isLoading || statementsQuery.isLoading,
    error: positionsQuery.error || transactionsQuery.error || statementsQuery.error,
  };
}
