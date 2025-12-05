/**
 * Supabase Edge Function: Calculate Performance
 * Calculates MTD, QTD, YTD, ITD metrics for investors
 */

import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const allowedOrigins = Deno.env.get("ALLOWED_ORIGINS")?.split(",") || [];

const corsHeaders = (origin: string | null) => ({
  "Access-Control-Allow-Origin":
    origin && allowedOrigins.includes(origin) ? origin : allowedOrigins[0] || "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-csrf-token",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
});

interface PerformanceRequest {
  investorId: string;
  asOfDate?: string;
}

interface PerformanceMetrics {
  mtd: PerformanceData;
  qtd: PerformanceData;
  ytd: PerformanceData;
  itd: PerformanceData;
}

interface PerformanceData {
  returnPercent: number;
  returnDollar: number;
  startValue: number;
  endValue: number;
  totalDeposits: number;
  totalWithdrawals: number;
  netDeposits: number;
  startDate: string;
  endDate: string;
}

serve(async (req) => {
  const origin = req.headers.get("origin");
  const headers = corsHeaders(origin);

  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers });
  }

  try {
    // CSRF token validation
    const csrfToken = req.headers.get("x-csrf-token");
    if (!csrfToken || csrfToken.length < 32) {
      return new Response(JSON.stringify({ error: "Invalid CSRF token" }), {
        status: 403,
        headers: { ...headers, "Content-Type": "application/json" },
      });
    }
    // Create Supabase client
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    // Verify authentication
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      throw new Error("Missing authorization header");
    }

    const {
      data: { user },
      error: authError,
    } = await supabaseClient.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      throw new Error("Unauthorized");
    }

    // Parse request
    const performanceRequest: PerformanceRequest = await req.json();

    console.log("Calculating performance for investor:", performanceRequest.investorId);

    // Verify access
    if (performanceRequest.investorId !== user.id) {
      const { data: profile } = await supabaseClient
        .from("profiles")
        .select("role")
        .eq("id", user.id)
        .single();

      if (profile?.role !== "admin") {
        throw new Error("Unauthorized to view performance for this investor");
      }
    }

    // Get as-of date (defaults to today)
    const asOfDate = performanceRequest.asOfDate
      ? new Date(performanceRequest.asOfDate)
      : new Date();

    // Calculate period dates
    const periods = calculatePeriodDates(asOfDate);

    // Get investor's first transaction date for ITD calculation
    const { data: firstTransaction } = await supabaseClient
      .from("transactions")
      .select("created_at")
      .eq("investor_id", performanceRequest.investorId)
      .order("created_at", { ascending: true })
      .limit(1)
      .single();

    if (!firstTransaction) {
      throw new Error("No transactions found for investor");
    }

    const inceptionDate = new Date(firstTransaction.created_at);

    // Calculate performance for each period
    const mtd = await calculatePeriodPerformance(
      supabaseClient,
      performanceRequest.investorId,
      periods.mtdStart,
      asOfDate
    );

    const qtd = await calculatePeriodPerformance(
      supabaseClient,
      performanceRequest.investorId,
      periods.qtdStart,
      asOfDate
    );

    const ytd = await calculatePeriodPerformance(
      supabaseClient,
      performanceRequest.investorId,
      periods.ytdStart,
      asOfDate
    );

    const itd = await calculatePeriodPerformance(
      supabaseClient,
      performanceRequest.investorId,
      inceptionDate,
      asOfDate
    );

    const metrics: PerformanceMetrics = {
      mtd,
      qtd,
      ytd,
      itd,
    };

    // Store calculated performance
    await storePerformanceMetrics(supabaseClient, performanceRequest.investorId, asOfDate, metrics);

    console.log("Performance calculated successfully:", {
      investorId: performanceRequest.investorId,
      mtdReturn: mtd.returnPercent,
      ytdReturn: ytd.returnPercent,
      itdReturn: itd.returnPercent,
    });

    return new Response(
      JSON.stringify({
        success: true,
        investorId: performanceRequest.investorId,
        asOfDate: asOfDate.toISOString(),
        metrics,
      }),
      {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (error) {
    console.error("Performance calculation failed:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        headers: { ...headers, "Content-Type": "application/json" },
        status: 400,
      }
    );
  }
});

/**
 * Calculate period start dates
 */
function calculatePeriodDates(asOfDate: Date): {
  mtdStart: Date;
  qtdStart: Date;
  ytdStart: Date;
} {
  const year = asOfDate.getFullYear();
  const month = asOfDate.getMonth();
  const quarter = Math.floor(month / 3);

  return {
    mtdStart: new Date(year, month, 1),
    qtdStart: new Date(year, quarter * 3, 1),
    ytdStart: new Date(year, 0, 1),
  };
}

/**
 * Calculate performance for a specific period
 */
async function calculatePeriodPerformance(
  supabase: any,
  investorId: string,
  startDate: Date,
  endDate: Date
): Promise<PerformanceData> {
  // Helper to get total balance for a specific date (or latest before it)
  const getTotalBalanceAtDate = async (targetDate: Date): Promise<number> => {
    // 1. Find the latest available date <= targetDate
    const { data: dateData } = await supabase
      .from("investor_daily_balances")
      .select("nav_date")
      .eq("investor_id", investorId)
      .lte("nav_date", targetDate.toISOString().split("T")[0])
      .order("nav_date", { ascending: false })
      .limit(1)
      .single();

    if (!dateData) return 0;

    // 2. Sum balances for that date
    const { data: balances } = await supabase
      .from("investor_daily_balances")
      .select("balance")
      .eq("investor_id", investorId)
      .eq("nav_date", dateData.nav_date);

    if (!balances) return 0;

    return balances.reduce((sum: number, row: any) => sum + Number(row.balance), 0);
  };

  const startValue = await getTotalBalanceAtDate(startDate);
  const endValue = await getTotalBalanceAtDate(endDate);

  // Get deposits and withdrawals during period
  // Note: 'created_at' is timestamp, so we compare ISO strings
  const { data: transactions } = await supabase
    .from("transactions")
    .select("amount, type")
    .eq("investor_id", investorId)
    .gte("created_at", startDate.toISOString())
    .lte("created_at", endDate.toISOString())
    .in("type", ["DEPOSIT", "WITHDRAWAL"]); // Adjusted to standard types if needed, usually uppercase

  const deposits =
    transactions
      ?.filter((t: any) => t.type === "DEPOSIT")
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;

  const withdrawals =
    transactions
      ?.filter((t: any) => t.type === "WITHDRAWAL")
      .reduce((sum: number, t: any) => sum + Number(t.amount), 0) || 0;

  const netDeposits = deposits - withdrawals;

  // Calculate return using Modified Dietz method
  const returnDollar = endValue - startValue - netDeposits;

  // Average capital: starting capital + (net deposits / 2)
  const avgCapital = startValue + netDeposits / 2;

  const returnPercent = avgCapital > 0 ? (returnDollar / avgCapital) * 100 : 0;

  return {
    returnPercent: parseFloat(returnPercent.toFixed(4)),
    returnDollar: parseFloat(returnDollar.toFixed(2)),
    startValue: parseFloat(startValue.toFixed(2)),
    endValue: parseFloat(endValue.toFixed(2)),
    totalDeposits: parseFloat(deposits.toFixed(2)),
    totalWithdrawals: parseFloat(withdrawals.toFixed(2)),
    netDeposits: parseFloat(netDeposits.toFixed(2)),
    startDate: startDate.toISOString(),
    endDate: endDate.toISOString(),
  };
}

/**
 * Store calculated performance metrics
 */
async function storePerformanceMetrics(
  supabase: any,
  investorId: string,
  asOfDate: Date,
  metrics: PerformanceMetrics
): Promise<void> {
  try {
    // Store in performance_history table
    await supabase.from("performance_history").upsert(
      {
        investor_id: investorId,
        as_of_date: asOfDate.toISOString().split("T")[0],
        mtd_return_pct: metrics.mtd.returnPercent,
        qtd_return_pct: metrics.qtd.returnPercent,
        ytd_return_pct: metrics.ytd.returnPercent,
        itd_return_pct: metrics.itd.returnPercent,
        mtd_return_dollar: metrics.mtd.returnDollar,
        qtd_return_dollar: metrics.qtd.returnDollar,
        ytd_return_dollar: metrics.ytd.returnDollar,
        itd_return_dollar: metrics.itd.returnDollar,
        total_value: metrics.mtd.endValue,
        updated_at: new Date().toISOString(),
      },
      {
        onConflict: "investor_id,as_of_date",
      }
    );

    console.log("Performance metrics stored successfully");
  } catch (error) {
    console.error("Failed to store performance metrics:", error);
    // Don't throw - this shouldn't block the response
  }
}

/**
 * Calculate time-weighted return (TWR)
 * More accurate for portfolios with significant cash flows
 */
function calculateTimeWeightedReturn(
  startValue: number,
  endValue: number,
  cashFlows: Array<{ date: Date; amount: number }>,
  startDate: Date,
  endDate: Date
): number {
  // Simplified TWR calculation
  // In production, this would:
  // 1. Break the period into sub-periods at each cash flow
  // 2. Calculate return for each sub-period
  // 3. Compound the sub-period returns

  if (startValue === 0) return 0;

  return (endValue / startValue - 1) * 100;
}

/**
 * Calculate money-weighted return (MWR) / Internal Rate of Return (IRR)
 * Accounts for the timing and size of investor contributions
 */
function calculateMoneyWeightedReturn(
  cashFlows: Array<{ date: Date; amount: number; type: "in" | "out" }>,
  startValue: number,
  endValue: number
): number {
  // Simplified MWR calculation
  // In production, this would use Newton-Raphson method to solve for IRR

  const totalCashIn = cashFlows
    .filter((cf) => cf.type === "in")
    .reduce((sum, cf) => sum + cf.amount, 0);

  const totalCashOut = cashFlows
    .filter((cf) => cf.type === "out")
    .reduce((sum, cf) => sum + cf.amount, 0);

  const netCash = totalCashIn - totalCashOut;
  const gain = endValue - startValue - netCash;

  const avgCapital = startValue + netCash / 2;

  return avgCapital > 0 ? (gain / avgCapital) * 100 : 0;
}
