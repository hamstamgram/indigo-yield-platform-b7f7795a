/**
 * Unified Investors Hook
 * 
 * React Query hook for fetching enriched investor data for admin views
 */

import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import {
  adminInvestorService,
  assetService,
  getActiveFundsForList,
  getActiveInvestorPositions,
} from "@/services";
import type { AdminInvestorSummary } from "@/services/admin/adminService";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { AssetRef as Asset } from "@/types/asset";

interface Fund {
  id: string;
  code: string;
  name: string;
  asset: string;
}

export interface EnrichedInvestor extends AdminInvestorSummary {
  fundsHeldCount: number;
  lastActivityDate: string | null;
  pendingWithdrawals: number;
  lastReportPeriod: string | null;
  ibParentName: string | null;
  isSystemAccount?: boolean;
}

interface UnifiedInvestorsData {
  investors: AdminInvestorSummary[];
  enrichedInvestors: EnrichedInvestor[];
  assets: Asset[];
  funds: Fund[];
  investorPositions: Map<string, string[]>;
}

/**
 * Fetch all enrichment data for investors in batch
 */
async function enrichInvestors(
  investorsData: AdminInvestorSummary[],
  posMap: Map<string, string[]>
): Promise<EnrichedInvestor[]> {
  const investorIds = investorsData.map(inv => inv.id);
  
  // Batch fetch all enrichment data in parallel
  const [withdrawalsResult, activityResult, reportsResult, profilesResult] = await Promise.all([
    // Pending withdrawals
    supabase
      .from("withdrawal_requests")
      .select("investor_id")
      .in("investor_id", investorIds)
      .eq("status", "pending"),
    
    // Last activity dates
    supabase
      .from("profiles")
      .select("id, last_activity_at")
      .in("id", investorIds),
    
    // Last reports
    supabase
      .from("generated_statements")
      .select("investor_id, period_id, created_at")
      .in("investor_id", investorIds)
      .order("created_at", { ascending: false }),
    
    // IB parent info
    supabase
      .from("profiles")
      .select("id, ib_parent_id")
      .in("id", investorIds)
      .not("ib_parent_id", "is", null),
  ]);

  // Build withdrawal counts map
  const withdrawalCounts = new Map<string, number>();
  (withdrawalsResult.data || []).forEach(w => {
    withdrawalCounts.set(w.investor_id, (withdrawalCounts.get(w.investor_id) || 0) + 1);
  });

  // Build last activity map
  const lastActivityDates = new Map<string, string>();
  (activityResult.data || []).forEach(p => {
    if (p.last_activity_at) {
      lastActivityDates.set(p.id, p.last_activity_at);
    }
  });

  // Build last reports map
  const lastReports = new Map<string, string>();
  (reportsResult.data || []).forEach(r => {
    if (!lastReports.has(r.investor_id)) {
      lastReports.set(r.investor_id, r.period_id);
    }
  });

  // Build IB parent names map
  const ibParentIds = [...new Set((profilesResult.data || []).map(p => p.ib_parent_id).filter(Boolean))];
  const ibParentNames = new Map<string, string>();
  
  if (ibParentIds.length > 0) {
    const { data: parents } = await supabase
      .from("profiles")
      .select("id, first_name, last_name")
      .in("id", ibParentIds);

    (parents || []).forEach(p => {
      const name = [p.first_name, p.last_name].filter(Boolean).join(" ");
      ibParentNames.set(p.id, name);
    });
  }

  const investorIbParents = new Map<string, string>();
  (profilesResult.data || []).forEach(p => {
    if (p.ib_parent_id && ibParentNames.has(p.ib_parent_id)) {
      investorIbParents.set(p.id, ibParentNames.get(p.ib_parent_id)!);
    }
  });

  // Build enriched list
  return investorsData.map(inv => ({
    ...inv,
    fundsHeldCount: posMap.get(inv.id)?.length || 0,
    lastActivityDate: lastActivityDates.get(inv.id) || null,
    pendingWithdrawals: withdrawalCounts.get(inv.id) || 0,
    lastReportPeriod: lastReports.get(inv.id) || null,
    ibParentName: investorIbParents.get(inv.id) || null,
  }));
}

/**
 * Hook to fetch unified investor data with enrichment for admin views
 */
export function useUnifiedInvestors() {
  return useQuery<UnifiedInvestorsData>({
    queryKey: QUERY_KEYS.unifiedInvestors,
    queryFn: async () => {
      // Fetch base data in parallel
      const [investorsData, assetsData, fundsData, positionsData] = await Promise.all([
        adminInvestorService.getAllInvestorsWithSummary(),
        assetService.getAssets({ is_active: true }),
        getActiveFundsForList(),
        getActiveInvestorPositions(),
      ]);

      // Build investor positions map
      const posMap = new Map<string, string[]>();
      positionsData.forEach((p) => {
        const existing = posMap.get(p.investor_id) || [];
        if (!existing.includes(p.fund_id)) {
          existing.push(p.fund_id);
        }
        posMap.set(p.investor_id, existing);
      });

      // Transform assets
      const transformedAssets: Asset[] = assetsData.map((a) => ({
        id: a.asset_id ? parseInt(a.asset_id, 10) : 0,
        symbol: a.symbol,
        name: a.name,
      }));

      // Enrich investors
      const enrichedInvestors = await enrichInvestors(investorsData, posMap);

      return {
        investors: investorsData,
        enrichedInvestors,
        assets: transformedAssets,
        funds: fundsData,
        investorPositions: posMap,
      };
    },
    staleTime: 30000, // 30 seconds
  });
}

/**
 * Hook to deactivate an investor
 */
export { useUpdateInvestorStatus } from "../investor/useInvestorData";
