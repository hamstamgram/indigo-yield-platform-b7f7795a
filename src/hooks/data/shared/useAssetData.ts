import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Database } from "@/integrations/supabase/types";
import { type AssetSummaryDetailed, getAssetName } from "@/types/asset";

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
          console.error("Error fetching positions:", positionsError);
          throw positionsError;
        }

        // Fetch latest daily rates (most recent date)
        const { data: dailyRates, error: ratesError } = await supabase
          .from("daily_rates")
          .select("*")
          .order("rate_date", { ascending: false })
          .limit(1)
          .maybeSingle();

        if (ratesError && ratesError.code !== "PGRST116") {
          // PGRST116 = no rows returned (acceptable if no rates yet)
          console.error("Error fetching daily rates:", ratesError);
          throw ratesError;
        }

        // Calculate asset summaries with per-asset yield
        const summaries: AssetSummaryDetailed[] = (positions || []).map((position) => {
          const symbol = (position.fund_class || "").toUpperCase();
          const balance = Number(position.current_value || 0);
          const principal = Number(position.cost_basis || balance);
          const totalEarned = 0; // not tracked in investor_positions

          // Get current rate for this asset
          let currentRate = 0;
          if (dailyRates) {
            const rates: Database["public"]["Tables"]["daily_rates"]["Row"] = dailyRates;
            switch (symbol) {
              case "BTC":
                currentRate = Number(rates.btc_rate);
                break;
              case "ETH":
                currentRate = Number(rates.eth_rate);
                break;
              case "SOL":
                currentRate = Number(rates.sol_rate);
                break;
              case "USDT":
                currentRate = Number(rates.usdt_rate);
                break;
              case "EURC":
                currentRate = Number(rates.eurc_rate);
                break;
              case "XAUT":
                currentRate = Number(rates.xaut_rate || 0);
                break;
              case "XRP":
                currentRate = Number(rates.xrp_rate || 0);
                break;
            }
          }

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
        console.error("Error in fetchData:", err);
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
