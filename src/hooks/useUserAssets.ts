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
      // Get current user
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser();

      if (userError || !user) {
        return [];
      }

      // Get investor_id from profiles -> investors
      const { data: investorData, error: investorError } = await supabase
        .from("investors")
        .select("id")
        .eq("profile_id", user.id)
        .maybeSingle();

      if (investorError || !investorData) {
        return [];
      }

      // Get unique assets from monthly reports
      const { data: reports, error: reportsError } = await supabase
        .from("investor_monthly_reports")
        .select("asset_code")
        .eq("investor_id", investorData.id)
        .order("asset_code", { ascending: true });

      if (reportsError || !reports) {
        return [];
      }

      // Get unique asset codes
      const uniqueAssetCodes = Array.from(new Set(reports.map((r) => r.asset_code)));

      // Map asset codes to user-friendly names
      const assetNames: Record<string, string> = {
        BTC: "Bitcoin",
        ETH: "Ethereum",
        SOL: "Solana",
        USDT: "Tether",
        USDC: "USD Coin",
        EURC: "Euro Coin",
      };

      return uniqueAssetCodes.map((code) => ({
        symbol: code.toLowerCase(),
        name: assetNames[code] || code,
      }));
    },
    staleTime: 5 * 60 * 1000, // Cache for 5 minutes
  });
};
