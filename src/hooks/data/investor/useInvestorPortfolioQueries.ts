import { useQuery, useMutation } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { useAuth } from "@/services/auth";
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
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.investorDocuments,
    queryFn: async (): Promise<InvestorDocument[]> => {
      if (!user) return [];
      return getInvestorDocuments(user.id);
    },
    // Wait for auth to be ready before fetching
    enabled: !loading,
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
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: ["performance-history-grouped"],
    queryFn: async (): Promise<Record<string, PerformanceHistoryRecord[]>> => {
      if (!user) throw new Error("Not authenticated");
      return performanceService.getPerformanceHistoryGrouped(user.id);
    },
    // Wait for auth to be ready before fetching
    enabled: !!user && !loading,
  });
}

/**
 * Hook for fetching pending transactions (deposits + withdrawals)
 */
export function usePendingTransactions(searchTerm?: string) {
  const { user, loading } = useAuth();

  return useQuery({
    queryKey: QUERY_KEYS.pendingTransactions(searchTerm),
    queryFn: async (): Promise<PendingTransaction[]> => {
      if (!user) throw new Error("Not authenticated");
      return getPendingTransactions(user.id, searchTerm);
    },
    // Wait for auth to be ready before fetching
    enabled: !!user && !loading,
  });
}
