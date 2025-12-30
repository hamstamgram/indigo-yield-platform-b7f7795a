import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  getInvestorDocuments,
  downloadDocument,
  getPendingTransactions,
  performanceService,
  type InvestorDocument,
  type PendingTransaction,
  type PerformanceHistoryRecord,
} from "@/services";

/**
 * Hook for fetching investor documents
 */
export function useInvestorDocuments() {
  return useQuery({
    queryKey: QUERY_KEYS.investorDocuments,
    queryFn: async (): Promise<InvestorDocument[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      return getInvestorDocuments(user.id);
    },
  });
}

/**
 * Hook for downloading a document
 */
export function useDocumentDownload() {
  return useMutation({
    mutationFn: async (doc: { storage_path: string; title: string }) => {
      const blob = await downloadDocument(doc.storage_path);
      return { blob, title: doc.title };
    },
    onSuccess: ({ blob, title }) => {
      // Trigger browser download
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = title;
      document.body.appendChild(a);
      a.click();
      URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },
  });
}

/**
 * Hook for fetching performance history grouped by asset
 */
export function usePerformanceHistory() {
  return useQuery({
    queryKey: ["performance-history-grouped"],
    queryFn: async (): Promise<Record<string, PerformanceHistoryRecord[]>> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return performanceService.getPerformanceHistoryGrouped(user.id);
    },
  });
}

/**
 * Hook for fetching pending transactions (deposits + withdrawals)
 */
export function usePendingTransactions(searchTerm?: string) {
  return useQuery({
    queryKey: QUERY_KEYS.pendingTransactions(searchTerm),
    queryFn: async (): Promise<PendingTransaction[]> => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("Not authenticated");
      return getPendingTransactions(user.id, searchTerm);
    },
  });
}
