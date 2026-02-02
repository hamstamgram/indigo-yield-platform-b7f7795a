/**
 * Statement Data Hooks
 * Abstracts statement generation and management from components
 */

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { invalidateAfterStatementOp } from "@/utils/cacheInvalidation";

export interface GeneratedStatement {
  id: string;
  investor_id: string;
  user_id: string;
  period_id: string;
  fund_names: string[];
  html_content: string;
  pdf_url: string | null;
  created_at: string;
  generated_by: string;
  investor?: {
    id: string;
    email: string;
    first_name: string | null;
    last_name: string | null;
  } | null;
  period?: {
    id: string;
    year: number;
    month: number;
    period_name: string;
    period_end_date: string;
  } | null;
}

export interface StatementPeriod {
  id: string;
  year: number;
  month: number;
  period_name: string;
  period_end_date: string;
  status: string | null;
  created_at: string;
}

export interface StatementFilters {
  investorId?: string;
  periodId?: string;
  dateFrom?: string;
  dateTo?: string;
  limit?: number;
}

/**
 * Hook to fetch statement periods
 */
export function useStatementPeriods() {
  return useQuery<StatementPeriod[], Error>({
    queryKey: QUERY_KEYS.statementPeriods,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("statement_periods")
        .select("id, year, month, period_name, period_end_date, status, created_at")
        .order("period_end_date", { ascending: false });

      if (error) throw error;
      return data || [];
    },
  });
}

/**
 * Hook to fetch generated statements
 */
export function useGeneratedStatements(filters: StatementFilters = {}) {
  return useQuery<GeneratedStatement[], Error>({
    queryKey: QUERY_KEYS.generatedStatements(filters as Record<string, unknown>),
    queryFn: async () => {
      let query = supabase
        .from("generated_statements")
        .select(
          `
          id,
          investor_id,
          user_id,
          period_id,
          fund_names,
          html_content,
          pdf_url,
          created_at,
          generated_by,
          investor:profiles!generated_statements_investor_id_fkey (
            id, email, first_name, last_name
          ),
          period:statement_periods!generated_statements_period_id_fkey (
            id, year, month, period_name, period_end_date
          )
        `
        )
        .order("created_at", { ascending: false });

      if (filters.investorId) {
        query = query.eq("investor_id", filters.investorId);
      }

      if (filters.periodId) {
        query = query.eq("period_id", filters.periodId);
      }

      if (filters.limit) {
        query = query.limit(filters.limit);
      }

      const { data, error } = await query;

      if (error) throw error;

      return (data || []).map((stmt: any) => ({
        ...stmt,
        investor: stmt.investor as GeneratedStatement["investor"],
        period: stmt.period as GeneratedStatement["period"],
      }));
    },
  });
}

/**
 * Hook to fetch statements for a specific investor
 */
export function useInvestorStatements(investorId: string, limit?: number) {
  return useQuery<GeneratedStatement[], Error>({
    queryKey: QUERY_KEYS.investorStatements(investorId, limit),
    queryFn: async () => {
      let query = supabase
        .from("generated_statements")
        .select(
          `
          id,
          investor_id,
          user_id,
          period_id,
          fund_names,
          html_content,
          pdf_url,
          created_at,
          generated_by
        `
        )
        .eq("investor_id", investorId)
        .order("created_at", { ascending: false });

      if (limit) {
        query = query.limit(limit);
      }

      const { data, error } = await query;
      if (error) throw error;
      return data || [];
    },
    enabled: !!investorId,
  });
}

/**
 * Hook to delete a generated statement
 */
export function useDeleteStatement() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (statementId: string) => {
      const { error } = await supabase.from("generated_statements").delete().eq("id", statementId);

      if (error) throw error;
    },
    onSuccess: () => {
      invalidateAfterStatementOp(queryClient);
      toast.success("Statement deleted successfully");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete statement: ${error.message}`);
    },
  });
}

/**
 * Hook to check if a period has statements
 */
export function usePeriodStatementCount(periodId: string) {
  return useQuery<number, Error>({
    queryKey: QUERY_KEYS.periodStatementCount(periodId),
    queryFn: async () => {
      const { count, error } = await supabase
        .from("generated_statements")
        .select("id", { count: "exact", head: true })
        .eq("period_id", periodId);

      if (error) throw error;
      return count || 0;
    },
    enabled: !!periodId,
  });
}
