import { supabase } from "@/integrations/supabase/client";
import type { Database } from "@/integrations/supabase/types";

type Position = Database["public"]["Tables"]["positions"]["Row"];
type InvestorPosition = Database["public"]["Tables"]["investor_positions"]["Row"];

export interface PortfolioSummary {
  totalAUM: number;
  positions: Position[];
  dailyChange: number;
  monthlyChange: number;
  ytdChange: number;
}

export interface PortfolioPerformance {
  period: string;
  value: number;
  change: number;
  changePercent: number;
}

/**
 * Fetch user's portfolio positions
 */
export async function fetchUserPositions(userId: string): Promise<Position[]> {
  try {
    const { data, error } = await supabase
      .from("positions")
      .select("*")
      .eq("user_id", userId)
      .gt("current_balance", 0);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching user positions:", error);
    throw new Error("Failed to fetch portfolio positions");
  }
}

/**
 * Fetch investor positions (for admin use)
 */
export async function fetchInvestorPositions(investorId: string): Promise<InvestorPosition[]> {
  try {
    const { data, error } = await supabase
      .from("investor_positions")
      .select(
        `
        *,
        funds (
          name,
          code,
          fund_class
        )
      `
      )
      .eq("investor_id", investorId)
      .gt("current_value", 0);

    if (error) throw error;
    return data || [];
  } catch (error) {
    console.error("Error fetching investor positions:", error);
    throw new Error("Failed to fetch investor positions");
  }
}

/**
 * Fetch portfolio summary for a user
 */
export async function fetchPortfolioSummary(userId: string): Promise<PortfolioSummary> {
  try {
    const positions = await fetchUserPositions(userId);

    const totalAUM = positions.reduce((sum, pos) => sum + Number(pos.current_balance), 0);

    // TODO: Calculate actual performance metrics from historical data
    const dailyChange = 0;
    const monthlyChange = 0;
    const ytdChange = 0;

    return {
      totalAUM,
      positions,
      dailyChange,
      monthlyChange,
      ytdChange,
    };
  } catch (error) {
    console.error("Error fetching portfolio summary:", error);
    throw new Error("Failed to fetch portfolio summary");
  }
}

/**
 * Fetch portfolio performance history
 */
export async function fetchPortfolioPerformance(
  userId: string,
  period: "week" | "month" | "quarter" | "year" = "month"
): Promise<PortfolioPerformance[]> {
  try {
    // Calculate date range based on period
    const now = new Date();
    const startDate = new Date();

    switch (period) {
      case "week":
        startDate.setDate(now.getDate() - 7);
        break;
      case "month":
        startDate.setMonth(now.getMonth() - 1);
        break;
      case "quarter":
        startDate.setMonth(now.getMonth() - 3);
        break;
      case "year":
        startDate.setFullYear(now.getFullYear() - 1);
        break;
    }

    const { data, error } = await supabase
      .from("portfolio_history")
      .select("*")
      .eq("user_id", userId)
      .gte("date", startDate.toISOString().split("T")[0])
      .order("date", { ascending: true });

    if (error) throw error;

    // Transform data to performance format
    return (data || []).map((entry, index, array) => {
      const prevValue =
        index > 0 ? Number(array[index - 1].usd_value || 0) : Number(entry.usd_value || 0);
      const currentValue = Number(entry.usd_value || 0);
      const change = currentValue - prevValue;
      const changePercent = prevValue > 0 ? (change / prevValue) * 100 : 0;

      return {
        period: entry.date,
        value: currentValue,
        change,
        changePercent,
      };
    });
  } catch (error) {
    console.error("Error fetching portfolio performance:", error);
    throw new Error("Failed to fetch portfolio performance");
  }
}

/**
 * Error handling wrapper for portfolio API calls
 */
export function withPortfolioErrorHandling<T extends any[], R>(fn: (...args: T) => Promise<R>) {
  return async (...args: T): Promise<R> => {
    try {
      return await fn(...args);
    } catch (error) {
      console.error("Portfolio API Error:", error);
      throw error;
    }
  };
}

// API object for easy consumption
const getPortfolioSummary = async (userId: string) => {
  try {
    const data = await fetchPortfolioSummary(userId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const getPositions = async (userId: string) => {
  try {
    const data = await fetchUserPositions(userId);
    return { data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const getRecentTransactions = async (userId: string, limit: number = 10) => {
  try {
    // This is a placeholder - integrate with transaction API when available
    const data = await fetchTransactions({ userId, limit });
    return { data: data.data, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

const updatePosition = async (_positionId: string, _updates: any) => {
  try {
    // Placeholder implementation
    return { data: null, error: null };
  } catch (error) {
    return { data: null, error: error instanceof Error ? error.message : "Unknown error" };
  }
};

// Import required function
import { fetchTransactions } from "./transactionApi";

export const portfolioApi = {
  getPortfolioSummary,
  getPositions,
  getRecentTransactions,
  updatePosition,
};

// Export wrapped functions for additional error handling
export const safefetchUserPositions = withPortfolioErrorHandling(fetchUserPositions);
export const safeSearchPortfolioSummary = withPortfolioErrorHandling(fetchPortfolioSummary);
export const safeFetchPortfolioPerformance = withPortfolioErrorHandling(fetchPortfolioPerformance);

export default portfolioApi;
