import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

// Asset summary type with per-asset yield information
interface AssetSummary {
  symbol: string;
  name: string;
  balance: number;
  principal: number;
  totalEarned: number;
  currentRate: number;
  dailyYield: number;
  totalYield: number;
  yieldPercentage: number;
}

// Asset name mapping
const ASSET_NAMES: Record<string, string> = {
  BTC: "Bitcoin",
  ETH: "Ethereum",
  SOL: "Solana",
  USDT: "Stablecoin Fund",
  USDC: "Tokenized Gold",
  EURC: "Euro Coin",
};

export const useAssetData = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [assetSummaries, setAssetSummaries] = useState<AssetSummary[]>([]);
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
          .from("positions")
          .select("*")
          .eq("investor_id", user.id);

        if (positionsError) {
          console.error("Error fetching positions:", positionsError);
          throw positionsError;
        }

        // Fetch latest daily rates (most recent date)
        const { data: dailyRates, error: ratesError } = await supabase
          // @ts-expect-error - daily_rates table exists in migration but types need regeneration from DB
          .from("daily_rates")
          .select("*")
          .order("rate_date", { ascending: false })
          .limit(1)
          .single();

        if (ratesError && ratesError.code !== "PGRST116") {
          // PGRST116 = no rows returned (acceptable if no rates yet)
          console.error("Error fetching daily rates:", ratesError);
          throw ratesError;
        }

        // Calculate asset summaries with per-asset yield
        const summaries: AssetSummary[] = (positions || []).map((position) => {
          const symbol = position.asset_code;
          const balance = position.current_balance;
          const principal = position.principal;
          const totalEarned = position.total_earned;

          // Get current rate for this asset
          let currentRate = 0;
          if (dailyRates) {
            // Cast to any since daily_rates table exists in migration but types need regeneration from DB
            const rates = dailyRates as any;
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
              case "USDC":
                currentRate = Number(rates.usdc_rate);
                break;
              case "EURC":
                currentRate = Number(rates.eurc_rate);
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
            name: ASSET_NAMES[symbol] || symbol,
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
            tables: ["positions", "daily_rates"],
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
// All data comes from Supabase: positions table + daily_rates table
