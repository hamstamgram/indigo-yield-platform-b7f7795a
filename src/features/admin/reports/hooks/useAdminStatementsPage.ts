/**
 * Admin Statements Page Hooks
 * React Query hooks for statement generation and management
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { profileService, statementsService, documentService } from "@/services/shared";
import { fetchActiveInvestorsForStatements, sendStatementEmail } from "@/services/admin";
import type { StatementData } from "@/lib/pdf/statementGenerator";
import { invalidateAfterStatementOp } from "@/utils/cacheInvalidation";
import { toast } from "sonner";
import { getMonthEndDate } from "@/utils/dateUtils";

const MONTHS = [
  { value: "1", label: "January" },
  { value: "2", label: "February" },
  { value: "3", label: "March" },
  { value: "4", label: "April" },
  { value: "5", label: "May" },
  { value: "6", label: "June" },
  { value: "7", label: "July" },
  { value: "8", label: "August" },
  { value: "9", label: "September" },
  { value: "10", label: "October" },
  { value: "11", label: "November" },
  { value: "12", label: "December" },
];

/**
 * Hook to fetch active investors for statement generation
 */
export function useActiveInvestorsForStatements() {
  return useQuery({
    queryKey: ["active-investors-statements"],
    queryFn: fetchActiveInvestorsForStatements,
  });
}

/**
 * Hook to fetch statement documents
 */
export function useStatementDocuments(limit: number = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.statementsAdmin,
    queryFn: () => documentService.getStatementDocuments(limit),
  });
}

/**
 * Hook to generate a statement PDF
 */
export function useGenerateStatement(onGeneratingChange?: (investorId: string | null) => void) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (params: { investorId: string; year: number; month: number }) => {
      onGeneratingChange?.(params.investorId);

      const reportMonth = `${params.year}-${params.month.toString().padStart(2, "0")}-01`;

      const profile = await profileService.getProfileById(params.investorId);
      const investorName = profile
        ? `${profile.first_name || ""} ${profile.last_name || ""}`.trim() || profile.email
        : "Unknown";

      const reports = await profileService.getMonthlyReports(params.investorId, reportMonth);

      if (!reports || reports.length === 0) {
        throw new Error("No reporting data found for this period. Please ensure yield has been distributed before generating a statement.");
      }

      const statementData = {
        investor: { name: investorName, id: params.investorId },
        period: {
          month: params.month,
          year: params.year,
          start_date: reportMonth,
          end_date: getMonthEndDate(params.year, params.month),
        },
        summary: {
          total_aum: reports?.reduce((sum, r) => sum + Number(r.closing_balance || 0), 0) || 0,
          total_pnl: reports?.reduce((sum, r) => sum + Number(r.yield_earned || 0), 0) || 0,
          total_fees: 0,
        },
        positions:
          reports?.map((r) => ({
            asset_code: r.asset_code,
            opening_balance: r.opening_balance,
            additions: r.additions,
            withdrawals: r.withdrawals,
            yield_earned: r.yield_earned,
            closing_balance: r.closing_balance,
          })) || [],
      };

      const mappedData = {
        investor: {
          name: statementData.investor.name,
          id: statementData.investor.id,
          accountNumber: statementData.investor.id.substring(0, 8).toUpperCase(),
        },
        period: {
          month: statementData.period.month,
          year: statementData.period.year,
          start: statementData.period.start_date,
          end: statementData.period.end_date,
        },
        summary: {
          total_aum: statementData.summary.total_aum,
          total_pnl: statementData.summary.total_pnl,
          total_fees: statementData.summary.total_fees,
        },
        positions: statementData.positions,
      };

      const pdfContent = await generatePDF(mappedData);

      const fileName = `statement-${params.year}-${params.month.toString().padStart(2, "0")}.pdf`;
      const storagePath = `${params.investorId}/${fileName}`;

      await statementsService.uploadStatementPDF(storagePath, pdfContent);

      const monthLabel = MONTHS.find((m) => m.value === params.month.toString())?.label;
      await documentService.createStatementDocument({
        user_id: params.investorId,
        title: `Statement - ${monthLabel} ${params.year}`,
        storage_path: storagePath,
        period_start: `${params.year}-${params.month.toString().padStart(2, "0")}-01`,
        period_end: getMonthEndDate(params.year, params.month),
      });

      return { statementData };
    },
    onSuccess: (_, variables) => {
      toast.success("Statement generated successfully");
      invalidateAfterStatementOp(queryClient, undefined, variables.investorId);
      onGeneratingChange?.(null);
    },
    onError: (error: Error) => {
      toast.error(`Failed to generate statement: ${error.message}`);
      onGeneratingChange?.(null);
    },
  });
}

interface SendStatementParams {
  investorId: string;
  statementId: string;
  email: string;
  investorName: string;
  period: string;
}

/**
 * Hook to send statement email notification
 */
export function useSendStatementEmail() {
  return useMutation({
    mutationFn: (params: SendStatementParams) => sendStatementEmail(params),
    onSuccess: () => {
      toast.success("Statement notification sent successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to send notification: ${error.message}`);
    },
  });
}
