/**
 * Investor Enrichment
 * Complex enrichment logic for unified investor data.
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import {
  adminInvestorService,
  investorDetailService,
  type AdminInvestorSummary,
} from "@/services/admin";
import { assetService, profileService } from "@/services/shared";
import { getActiveFundsForList, getActiveInvestorPositions } from "@/services/investor";
import { AssetRef as Asset } from "@/types/asset";

// ==================== Types ====================

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

export interface UnifiedInvestorsData {
  investors: AdminInvestorSummary[];
  enrichedInvestors: EnrichedInvestor[];
  assets: Asset[];
  funds: Fund[];
  investorPositions: Map<string, string[]>;
}

// ==================== Helper ====================

// Helper: Enrich investors (Private) - uses service layer for all queries
async function enrichInvestorsHelper(
  investorsData: AdminInvestorSummary[],
  posMap: Map<string, string[]>
): Promise<EnrichedInvestor[]> {
  const investorIds = investorsData.map((inv) => inv.id);

  // Batch fetch all enrichment data in parallel via services
  const [withdrawalCounts, lastActivityDates, lastReports, investorIbParents] = await Promise.all([
    investorDetailService.getPendingWithdrawalCountsBatch(investorIds),
    profileService.getLastActivityBatch(investorIds),
    investorDetailService.getLastReportPeriodsBatch(investorIds),
    profileService.getIBParentsBatch(investorIds),
  ]);

  return investorsData.map((inv) => ({
    ...inv,
    fundsHeldCount: posMap.get(inv.id)?.length || 0,
    lastActivityDate: lastActivityDates.get(inv.id) || null,
    pendingWithdrawals: withdrawalCounts.get(inv.id) || 0,
    lastReportPeriod: lastReports.get(inv.id) || null,
    ibParentName: investorIbParents.get(inv.id) || null,
  }));
}

// ==================== Hook ====================

/**
 * Hook to fetch unified investor data with enrichment for admin views
 */
export function useUnifiedInvestors() {
  return useQuery<UnifiedInvestorsData>({
    queryKey: QUERY_KEYS.unifiedInvestors,
    queryFn: async () => {
      const [investorsData, assetsData, fundsData, positionsData] = await Promise.all([
        adminInvestorService.getAllInvestorsWithSummary(),
        assetService.getAssets({ is_active: true }),
        getActiveFundsForList(),
        getActiveInvestorPositions(),
      ]);

      const posMap = new Map<string, string[]>();
      positionsData.forEach((p) => {
        const existing = posMap.get(p.investor_id) || [];
        if (!existing.includes(p.fund_id)) {
          existing.push(p.fund_id);
        }
        posMap.set(p.investor_id, existing);
      });

      const transformedAssets: Asset[] = assetsData.map((a) => ({
        id: a.asset_id ? parseInt(a.asset_id, 10) : 0,
        symbol: a.symbol,
        name: a.name,
      }));

      const enrichedInvestors = await enrichInvestorsHelper(investorsData, posMap);

      return {
        investors: investorsData,
        enrichedInvestors,
        assets: transformedAssets,
        funds: fundsData,
        investorPositions: posMap,
      };
    },
    staleTime: 30000,
  });
}
