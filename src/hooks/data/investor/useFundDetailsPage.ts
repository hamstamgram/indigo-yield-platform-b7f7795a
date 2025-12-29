/**
 * Fund Details Page Hooks
 * React Query hooks for investor fund details
 */

import { useQuery } from "@tanstack/react-query";
import { QUERY_KEYS } from "@/constants/queryKeys";
import { getAssetLogo, getAssetName } from "@/utils/assets";

export interface AssetMeta {
  name: string;
  logo: string;
  description: string;
}

/**
 * Hook to fetch asset metadata
 */
export function useAssetMeta(assetCode: string) {
  return useQuery<AssetMeta>({
    queryKey: QUERY_KEYS.assetMeta(assetCode),
    queryFn: async () => ({
      name: getAssetName(assetCode),
      logo: getAssetLogo(assetCode),
      description: `The ${assetCode} Yield Fund generates yield through...`,
    }),
    enabled: !!assetCode,
  });
}
