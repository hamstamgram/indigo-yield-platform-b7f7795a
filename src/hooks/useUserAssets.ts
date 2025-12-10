import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface UserAsset {
  symbol: string;
  name: string;
}

/**
 * Hook to fetch the current user's asset positions
 * Returns unique assets from investor_monthly_reports table
 */
export const useUserAssets = () => {
  return useQuery<UserAsset[]>({
    queryKey: ["user-assets"],
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) return [];

      const { data: reports, error } = await supabase
        .from("investor_fund_performance")
        .select("fund_name")
        .eq("investor_id", user.id);

      if (error || !reports) {
        return [];
      }

      const uniqueAssetCodes = Array.from(new Set((reports as any[]).map((r) => r.fund_name)));
      const assetNames: Record<string, string> = {
        BTC: "BTC Yield Fund",
        ETH: "ETH Yield Fund",
        SOL: "SOL Yield Fund",
        USDT: "USDT Yield Fund",
        XRP: "XRP Yield Fund",
      };

      return uniqueAssetCodes.map((code) => ({
        symbol: String(code).toLowerCase(),
        name: assetNames[code] || code,
      }));
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
