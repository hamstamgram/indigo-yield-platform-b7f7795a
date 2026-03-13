import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useCallback } from "react";
import { invalidateAfterTransaction } from "@/utils/cacheInvalidation";
import { LedgerTransaction } from "@/types/domains/transaction";
import type { Database } from "@/integrations/supabase/types";
import { logError, logDebug } from "@/lib/logger";

// Re-export LedgerTransaction as the canonical type for ledger views
export type { LedgerTransaction } from "@/types/domains/transaction";

interface LedgerFilters {
  txType?: string;
  txPurpose?: string;
  dateFrom?: string;
  dateTo?: string;
  showVoided?: boolean;
}

/**
 * Hook to fetch investor ledger transactions with React Query
 * Provides proper cache invalidation and consistent data across components
 */
export function useInvestorLedger(investorId: string, filters: LedgerFilters = {}) {
  const queryClient = useQueryClient();

  const queryKey = ["investor-ledger", investorId, filters];

  const query = useQuery<LedgerTransaction[], Error>({
    queryKey,
    queryFn: async () => {
      // Build query with optional voided filter
      let dbQuery = supabase
        .from("transactions_v2")
        .select(
          `
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
          visibility_scope,
          balance_after,
          balance_before,
          fund_id,
          fund:funds!fk_transactions_v2_fund(name, asset)
        `
        )
        .eq("investor_id", investorId)
        .order("tx_date", { ascending: false })
        .order("created_at", { ascending: false })
        .limit(100);

      // Only filter out voided if showVoided is not true
      if (!filters.showVoided) {
        dbQuery = dbQuery.eq("is_voided", false);
      }

      // Apply filters
      if (filters.txType && filters.txType !== "all") {
        dbQuery = dbQuery.eq("type", filters.txType as Database["public"]["Enums"]["tx_type"]);
      }

      if (filters.txPurpose && filters.txPurpose !== "all") {
        dbQuery = dbQuery.eq("purpose", filters.txPurpose as "reporting" | "transaction");
      }

      if (filters.dateFrom) {
        dbQuery = dbQuery.gte("tx_date", filters.dateFrom);
      }

      if (filters.dateTo) {
        dbQuery = dbQuery.lte("tx_date", filters.dateTo);
      }

      const { data, error } = await dbQuery;

      if (error) {
        logError("useInvestorLedger.query", error, { investorId, filters });
        throw new Error(`Failed to load transactions: ${error.message}`);
      }

      // Diagnostic logging for empty results
      if ((!data || data.length === 0) && process.env.NODE_ENV === "development") {
        logDebug("useInvestorLedger.emptyResult", {
          investorId,
          filters,
          showVoided: filters.showVoided ?? false,
        });
      }

      // Filter out DUST_SWEEP entries (internal routing, keep only one dust line per exit)
      const filtered = (data || []).filter((tx) => tx.type !== "DUST_SWEEP");

      // Map DB data to domain types, converting amount to string for precision
      // Using balance_after as the authoritative source for running_balance (Ending Balance)
      return filtered.map((tx) => ({
        ...tx,
        amount: String(tx.amount ?? "0"),
        running_balance: tx.balance_after != null ? String(tx.balance_after) : undefined,
      })) as LedgerTransaction[];
    },
    enabled: !!investorId,
    staleTime: 30000, // 30 seconds
  });

  /**
   * Invalidate all related queries after transaction changes
   * Uses centralized invalidation helper for consistency
   */
  const invalidateAll = useCallback(() => {
    invalidateAfterTransaction(queryClient, investorId);
  }, [queryClient, investorId]);

  /**
   * Force refetch that bypasses stale time
   * Use when user manually requests fresh data
   */
  const forceRefetch = useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey });
    return query.refetch();
  }, [queryClient, queryKey, query]);

  return {
    ...query,
    transactions: query.data || [],
    invalidateAll,
    forceRefetch,
  };
}
