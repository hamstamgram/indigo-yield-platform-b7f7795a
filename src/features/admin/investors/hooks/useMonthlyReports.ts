/**
 * Monthly Reports Hooks
 * React Query hooks for investor monthly report operations
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  getInvestorMonthlyReports,
  createMonthlyReportTemplate,
  updateMonthlyReportField,
} from "@/services/admin";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";

/** Monthly report from investor_fund_performance with joined period */
export interface MonthlyReport {
  id: string;
  investor_id: string;
  period_id: string;
  fund_name: string;
  mtd_beginning_balance: number | null;
  mtd_additions: number | null;
  mtd_redemptions: number | null;
  mtd_net_income: number | null;
  mtd_ending_balance: number | null;
  mtd_rate_of_return: number | null;
  period: { period_end_date: string } | null;
}

/**
 * Hook to fetch investor monthly reports
 */
export function useInvestorMonthlyReports(investorId: string) {
  return useQuery<MonthlyReport[]>({
    queryKey: QUERY_KEYS.investorMonthlyReports(investorId),
    queryFn: () => getInvestorMonthlyReports(investorId),
    enabled: !!investorId,
  });
}

/**
 * Hook to create monthly report template
 */
export function useCreateMonthlyTemplate() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      investorId,
      year,
      month,
      assetCode = "USDT",
    }: {
      investorId: string;
      year: number;
      month: number;
      assetCode?: string;
    }) => {
      return createMonthlyReportTemplate(investorId, year, month, assetCode);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorMonthlyReports(variables.investorId),
      });
      toast.success("Monthly template generated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to generate monthly template");
    },
  });
}

/**
 * Hook to update monthly report field
 */
export function useUpdateMonthlyReportField() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      reportId,
      field,
      value,
    }: {
      reportId: string;
      field: string;
      value: number;
      investorId: string; // For cache invalidation
    }) => {
      return updateMonthlyReportField(reportId, field, value);
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({
        queryKey: QUERY_KEYS.investorMonthlyReports(variables.investorId),
      });
      toast.success("Value updated successfully");
    },
    onError: (error: Error) => {
      toast.error(error.message || "Failed to update value");
    },
  });
}
