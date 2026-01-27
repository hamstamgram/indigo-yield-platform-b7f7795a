import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { QUERY_KEYS } from "@/constants/queryKeys";

export interface UserAsset {
  symbol: string;
  name: string;
}

/**
 * Hook to fetch the current user's asset positions
 * Returns unique assets from investor_fund_performance table,
 * with fallback to investor_positions for new investors without performance records
 */
export const useUserAssets = () => {
  return useQuery<UserAsset[]>({
    queryKey: QUERY_KEYS.userAssets,
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return [];

      const assetNames: Record<string, string> = {
        BTC: "BTC Yield Fund",
        ETH: "ETH Yield Fund",
        SOL: "SOL Yield Fund",
        USDT: "USDT Yield Fund",
        XRP: "XRP Yield Fund",
      };

      // First try investor_fund_performance (has yield history)
      const { data: reports, error: reportsError } = await supabase
        .from("investor_fund_performance")
        .select("fund_name")
        .eq("investor_id", user.id);

      if (!reportsError && reports && reports.length > 0) {
        const uniqueAssetCodes = Array.from(new Set((reports as any[]).map((r) => r.fund_name)));
        return uniqueAssetCodes.map((code) => ({
          symbol: String(code).toLowerCase(),
          name: assetNames[code] || code,
        }));
      }

      // Fallback: Query investor_positions directly for new investors
      const { data: positions, error: positionsError } = await supabase
        .from("investor_positions")
        .select("fund:funds(code, asset)")
        .eq("investor_id", user.id)
        .eq("is_active", true)
        .neq("current_value", 0);

      if (positionsError || !positions) {
        return [];
      }

      const uniqueAssets = Array.from(
        new Set(positions.map((p: any) => p.fund?.asset).filter(Boolean))
      );

      return uniqueAssets.map((asset) => ({
        symbol: String(asset).toLowerCase(),
        name: assetNames[asset as string] || asset,
      }));
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
