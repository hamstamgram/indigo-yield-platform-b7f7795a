import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";

export interface Transaction {
  id: string;
  tx_date: string;
  type: string;
  amount: number;
  purpose: string | null;
  reference_id: string | null;
  notes: string | null;
  asset: string;
  is_voided: boolean;
  tx_hash?: string | null;
  is_system_generated?: boolean;
  fund?: { name: string; asset: string } | null;
}

interface LedgerFilters {
  txType?: string;
  txPurpose?: string;
  dateFrom?: string;
  dateTo?: string;
}

/**
 * Hook to fetch investor ledger transactions with React Query
 * Provides proper cache invalidation and consistent data across components
 */
export function useInvestorLedger(investorId: string, filters: LedgerFilters = {}) {
  const queryClient = useQueryClient();

  const queryKey = ["investor-ledger", investorId, filters];

  const query = useQuery<Transaction[], Error>({
    queryKey,
    queryFn: async () => {
      let query = supabase
        .from("transactions_v2")
        .select(`
          id,
          tx_date,
          type,
          amount,
          purpose,
          reference_id,
          notes,
          asset,
          is_voided,
          tx_hash,
          is_system_generated,
          fund:funds(name, asset)
        `)
        .eq("investor_id", investorId)
        .eq("is_voided", false)
        .order("tx_date", { ascending: false })
        .limit(100);

      // Apply filters
      if (filters.txType && filters.txType !== "all") {
        query = query.eq("type", filters.txType as any);
      }

      if (filters.txPurpose && filters.txPurpose !== "all") {
        query = query.eq("purpose", filters.txPurpose as "reporting" | "transaction");
      }

      if (filters.dateFrom) {
        query = query.gte("tx_date", filters.dateFrom);
      }

      if (filters.dateTo) {
        query = query.lte("tx_date", filters.dateTo);
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(`Failed to load transactions: ${error.message}`);
      }

      return (data || []) as Transaction[];
    },
    enabled: !!investorId,
    staleTime: 30000, // 30 seconds
  });

  /**
   * Invalidate all related queries after transaction changes
   * Includes both specific and general query keys for complete cache refresh
   */
  const invalidateAll = useCallback(() => {
    // Specific investor queries
    queryClient.invalidateQueries({ queryKey: ["investor-ledger", investorId] });
    queryClient.invalidateQueries({ queryKey: ["investor-positions", investorId] });
    queryClient.invalidateQueries({ queryKey: ["investor-transactions", investorId] });
    // General queries that may show this investor's data
    queryClient.invalidateQueries({ queryKey: ["investor-ledger"] });
    queryClient.invalidateQueries({ queryKey: ["investor-positions"] });
    queryClient.invalidateQueries({ queryKey: ["investor-transactions"] });
    queryClient.invalidateQueries({ queryKey: ["admin-transactions-history"] });
    queryClient.invalidateQueries({ queryKey: ["fund-aum"] });
    queryClient.invalidateQueries({ queryKey: ["fund-aum-unified"] });
  }, [queryClient, investorId]);

  return {
    ...query,
    transactions: query.data || [],
    invalidateAll,
  };
}
