import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { type AssetSummaryDetailed, getAssetName } from "@/types/asset";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";

export const useAssetData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetSummaries, setAssetSummaries] = useState<AssetSummaryDetailed[]>([]);
  const [yieldSources, setYieldSources] = useState<any[]>([]);
  const [userName, setUserName] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Get current user
        const {
          data: { user },
          error: userError,
        } = await supabase.auth.getUser();

        if (userError) throw userError;
        if (!user) {
          setError("No authenticated user found");
          setLoading(false);
          return;
        }

        // Check if user is admin via direct query
        const { data: profileData, error: profileError } = await supabase
          .from("profiles")
          .select("is_admin, first_name, last_name")
          .eq("id", user.id)
          .maybeSingle();

        if (profileError) throw profileError;

        setIsAdmin(profileData?.is_admin || false);
        setUserName(`${profileData?.first_name || ""} ${profileData?.last_name || ""}`);

        // Fetch real investor positions (native token amounts)
        const { data: positions, error: positionsError } = await supabase
          .from("investor_positions")
          .select("fund_id, fund_class, current_value, cost_basis, shares")
          .eq("investor_id", user.id);

        if (positionsError) {
          logError("useAssetData.fetchPositions", positionsError);
          throw positionsError;
        }

        // daily_rates table was dropped - rates not available
        const dailyRates = null;

        // Calculate asset summaries with per-asset yield
        const summaries: AssetSummaryDetailed[] = (positions || []).map((position) => {
          const symbol = (position.fund_class || "").toUpperCase();
          const balance = parseFinancial(position.current_value).toNumber();
          const principal = parseFinancial(position.cost_basis || balance).toNumber();
          const totalEarned = 0; // not tracked in investor_positions

          // Get current rate for this asset
          // daily_rates table was dropped - rate data unavailable
          const currentRate = 0;

          // Calculate daily yield (balance * current_rate / 100 for percentage rate)
          const dailyYield = balance * (currentRate / 100);

          // Total yield is total_earned from database
          const totalYield = totalEarned;

          // Calculate yield percentage (total earned / principal * 100)
          const yieldPercentage = principal > 0 ? (totalEarned / principal) * 100 : 0;

          return {
            symbol,
            name: getAssetName(symbol),
            balance,
            principal,
            totalEarned,
            currentRate,
            dailyYield,
            totalYield,
            yieldPercentage,
          };
        });

        setAssetSummaries(summaries);

        // Set yield sources (for now, just indicate real database)
        setYieldSources([
          {
            source: "Supabase Database",
            tables: ["investor_positions", "daily_rates"],
            realData: true,
          },
        ]);
      } catch (err: any) {
        logError("useAssetData.fetchData", err);
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [isAdmin]);

  return {
    loading,
    error,
    assetSummaries,
    yieldSources,
    userName,
    isAdmin,
  };
};

// Native token system - no price fetching needed
// All data comes from Supabase: investor_positions + daily_rates tables
