/**
 * Asset Hooks
 * React Query hooks for asset data management
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { assetService } from "@/services";
import type { Asset } from "@/types/asset";

export interface AssetStats {
  total: number;
  active: number;
  inactive: number;
  by_kind: Record<string, number>;
}

export interface AssetFilters {
  search?: string;
}

/**
 * Hook to fetch asset statistics
 */
export function useAssetStats() {
  return useQuery<AssetStats>({
    queryKey: QUERY_KEYS.assetStats,
    queryFn: () => assetService.getAssetStats(),
  });
}

/**
 * Hook to fetch assets with optional filters
 */
export function useAssets(filters?: AssetFilters) {
  return useQuery<Asset[]>({
    queryKey: QUERY_KEYS.assets({ search: filters?.search }),
    queryFn: () => assetService.getAssets({ search: filters?.search }),
  });
}

/**
 * Hook to fetch asset prices
 */
export function useAssetPrices(assetId: string, limit = 50) {
  return useQuery({
    queryKey: QUERY_KEYS.assetPrices(assetId),
    queryFn: () => assetService.getAssetPrices(assetId, limit),
    enabled: !!assetId,
  });
}

/**
 * Hook to fetch latest price for an asset
 */
export function useLatestAssetPrice(assetId: string) {
  return useQuery({
    queryKey: QUERY_KEYS.latestPrice(assetId),
    queryFn: () => assetService.getLatestPrice(assetId),
    enabled: !!assetId,
  });
}

// Re-export types
export type { Asset };
