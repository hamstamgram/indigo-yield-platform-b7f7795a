import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  periodYear: number;
  periodMonth: number;
}

/**
 * CANONICAL FORMULA (Source of Truth):
 * net_income = ending_balance - beginning_balance - additions + redemptions
 * rate_of_return = net_income / beginning_balance (0 if beginning_balance <= 0)
 * 
 * Edge Cases:
 * - First investment mid-month: beginning_balance = 0, rate_of_return = 0
 * - Full exit mid-month: ending_balance = 0 (calculated correctly)
 * - Divide by zero: rate_of_return = 0 when beginning_balance <= 0
 */
function calculatePerformanceMetrics(
  endingBalance: number,
  beginningBalance: number,
  additions: number,
  redemptions: number
): { netIncome: number; rateOfReturn: number } {
  // CORRECT formula per audit requirements:
  const netIncome = endingBalance - beginningBalance - additions + redemptions;
  
  // Avoid divide by zero - return 0% if no beginning balance
  if (beginningBalance <= 0) {
    return { netIncome, rateOfReturn: 0 };
  }
  
  const rateOfReturn = (netIncome / beginningBalance) * 100;
  return { netIncome, rateOfReturn };
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
    
    // Extract authorization header to verify the caller
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      console.error("No authorization header provided");
      return new Response(
        JSON.stringify({ error: "Authorization required" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token to verify their identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const { data: { user }, error: userError } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(
        JSON.stringify({ error: "Invalid or expired token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Use service role client for admin check via profiles.is_admin
    // This is consistent with other admin functions and works for users with multiple roles
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    
    const adminCheck = await checkAdminAccess(supabase, user.id);
    
    if (!adminCheck.isAdmin) {
      console.error("Admin check failed:", adminCheck.error || "User is not admin", 
        "User:", user.email, "ID:", user.id);
      return createAdminDeniedResponse(corsHeaders, 
        "You must be an administrator to generate performance reports");
    }

    console.log(`Admin ${adminCheck.email} generating performance data`);

    const { periodYear, periodMonth }: RequestBody = await req.json();

    if (!periodYear || !periodMonth) {
      return new Response(
        JSON.stringify({ error: "periodYear and periodMonth are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Generating performance for ${periodYear}-${periodMonth}`);

    // Step 1: Get or create the statement period
    let { data: period, error: periodError } = await supabase
      .from("statement_periods")
      .select("id")
      .eq("year", periodYear)
      .eq("month", periodMonth)
      .maybeSingle();

    if (periodError) throw periodError;

    if (!period) {
      // Create the period
      const periodEndDate = new Date(periodYear, periodMonth, 0); // Last day of month
      const periodName = new Intl.DateTimeFormat("en-US", { month: "long", year: "numeric" })
        .format(new Date(periodYear, periodMonth - 1));

      const { data: newPeriod, error: createError } = await supabase
        .from("statement_periods")
        .insert({
          year: periodYear,
          month: periodMonth,
          period_name: periodName,
          period_end_date: periodEndDate.toISOString().split("T")[0],
          status: "OPEN",
        })
        .select("id")
        .single();

      if (createError) throw createError;
      period = newPeriod;
    }

    const periodId = period.id;
    console.log(`Using period ID: ${periodId}`);

    // Step 2: Get all investors with positions
    const { data: positions, error: positionsError } = await supabase
      .from("investor_positions")
      .select(`
        investor_id,
        fund_id,
        current_value,
        cost_basis,
        shares,
        funds!inner (
          asset,
          status
        )
      `)
      .gt("current_value", 0);

    if (positionsError) throw positionsError;

    // Filter only active funds
    const activePositions = (positions || []).filter(
      (p: any) => p.funds?.status === "active"
    );

    console.log(`Found ${activePositions.length} active positions`);

    // Step 3: Calculate date ranges
    const mtdStart = new Date(periodYear, periodMonth - 1, 1);
    const mtdEnd = new Date(periodYear, periodMonth, 0);
    
    // QTD: Start of current quarter
    const currentQuarter = Math.floor((periodMonth - 1) / 3);
    const qtdStart = new Date(periodYear, currentQuarter * 3, 1);
    
    // YTD: Start of year
    const ytdStart = new Date(periodYear, 0, 1);

    // Step 4: Get transactions for calculations
    // IMPORTANT: Only include 'reporting' purpose transactions for statement calculations
    // This ensures transaction-purpose yield entries don't appear in investor statements
    // FIX: Changed from .or("purpose.is.null,purpose.eq.reporting") to strictly filter reporting only
    // Legacy transactions without purpose should be migrated, not implicitly included
    const { data: transactions, error: txError } = await supabase
      .from("transactions_v2")
      .select("*")
      .lte("tx_date", mtdEnd.toISOString().split("T")[0])
      .eq("purpose", "reporting") // STRICT: Only reporting purpose transactions
      .order("tx_date", { ascending: true });

    if (txError) throw txError;

    console.log(`Found ${transactions?.length || 0} transactions`);

    // Group positions by investor + fund asset
    const performanceRecords: any[] = [];

    // Group positions by investor_id and fund asset
    const groupedPositions = new Map<string, any[]>();
    for (const pos of activePositions) {
      const key = `${pos.investor_id}:${pos.funds.asset}`;
      if (!groupedPositions.has(key)) {
        groupedPositions.set(key, []);
      }
      groupedPositions.get(key)!.push(pos);
    }

    // Calculate metrics for each investor + asset combination
    for (const [key, posGroup] of groupedPositions.entries()) {
      const [investorId, fundAsset] = key.split(":");
      
      // Current ending balance (sum of all positions for this asset)
      const currentBalance = posGroup.reduce((sum: number, p: any) => sum + Number(p.current_value), 0);
      
      // Get transactions for this investor + asset
      const investorTxs = (transactions || []).filter(
        (tx: any) => tx.investor_id === investorId && tx.asset === fundAsset
      );

      // Helper to calculate beginning balance from transactions before a date
      const calculateBeginningBalance = (txs: any[], beforeDate: Date): number => {
        return txs
          .filter((tx: any) => new Date(tx.tx_date) < beforeDate)
          .reduce((sum: number, tx: any) => {
            const amount = Number(tx.amount);
            if (["WITHDRAWAL", "FEE", "REDEMPTION"].includes(tx.type)) {
              return sum - Math.abs(amount);
            }
            return sum + amount;
          }, 0);
      };

      // Helper to sum transactions by type within a date range
      const sumByType = (txs: any[], startDate: Date, endDate: Date, types: string[]): number => {
        return txs
          .filter((tx: any) => {
            const txDate = new Date(tx.tx_date);
            return txDate >= startDate && txDate <= endDate && types.includes(tx.type);
          })
          .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);
      };

      // ============= MTD CALCULATIONS =============
      const mtdBeginning = calculateBeginningBalance(investorTxs, mtdStart);
      const mtdAdditions = sumByType(investorTxs, mtdStart, mtdEnd, ["DEPOSIT", "SUBSCRIPTION"]);
      const mtdRedemptions = sumByType(investorTxs, mtdStart, mtdEnd, ["WITHDRAWAL", "REDEMPTION"]);
      
      // CORRECT FORMULA: net_income = ending - beginning - additions + redemptions
      const mtdMetrics = calculatePerformanceMetrics(
        currentBalance,
        mtdBeginning,
        mtdAdditions,
        mtdRedemptions
      );

      // ============= QTD CALCULATIONS =============
      const qtdBeginning = calculateBeginningBalance(investorTxs, qtdStart);
      const qtdAdditions = sumByType(investorTxs, qtdStart, mtdEnd, ["DEPOSIT", "SUBSCRIPTION"]);
      const qtdRedemptions = sumByType(investorTxs, qtdStart, mtdEnd, ["WITHDRAWAL", "REDEMPTION"]);
      
      const qtdMetrics = calculatePerformanceMetrics(
        currentBalance,
        qtdBeginning,
        qtdAdditions,
        qtdRedemptions
      );

      // ============= YTD CALCULATIONS =============
      const ytdBeginning = calculateBeginningBalance(investorTxs, ytdStart);
      const ytdAdditions = sumByType(investorTxs, ytdStart, mtdEnd, ["DEPOSIT", "SUBSCRIPTION"]);
      const ytdRedemptions = sumByType(investorTxs, ytdStart, mtdEnd, ["WITHDRAWAL", "REDEMPTION"]);
      
      const ytdMetrics = calculatePerformanceMetrics(
        currentBalance,
        ytdBeginning,
        ytdAdditions,
        ytdRedemptions
      );

      // ============= ITD CALCULATIONS =============
      // ITD beginning is always 0 (inception)
      const itdBeginning = 0;
      const itdAdditions = sumByType(investorTxs, new Date(0), mtdEnd, ["DEPOSIT", "SUBSCRIPTION"]);
      const itdRedemptions = sumByType(investorTxs, new Date(0), mtdEnd, ["WITHDRAWAL", "REDEMPTION"]);
      
      const itdMetrics = calculatePerformanceMetrics(
        currentBalance,
        itdBeginning,
        itdAdditions,
        itdRedemptions
      );
      
      // Special case for ITD: use total principal as denominator since beginning is 0
      const totalPrincipal = itdAdditions - itdRedemptions;
      const itdRoR = totalPrincipal > 0 ? (itdMetrics.netIncome / totalPrincipal) * 100 : 0;

      performanceRecords.push({
        period_id: periodId,
        investor_id: investorId,
        fund_name: fundAsset,
        purpose: 'reporting', // Always 'reporting' for statement generation
        // MTD
        mtd_beginning_balance: Math.round(mtdBeginning * 100) / 100,
        mtd_additions: Math.round(mtdAdditions * 100) / 100,
        mtd_redemptions: Math.round(mtdRedemptions * 100) / 100,
        mtd_net_income: Math.round(mtdMetrics.netIncome * 100) / 100,
        mtd_ending_balance: Math.round(currentBalance * 100) / 100,
        mtd_rate_of_return: Math.round(mtdMetrics.rateOfReturn * 100) / 100,
        // QTD
        qtd_beginning_balance: Math.round(qtdBeginning * 100) / 100,
        qtd_additions: Math.round(qtdAdditions * 100) / 100,
        qtd_redemptions: Math.round(qtdRedemptions * 100) / 100,
        qtd_net_income: Math.round(qtdMetrics.netIncome * 100) / 100,
        qtd_ending_balance: Math.round(currentBalance * 100) / 100,
        qtd_rate_of_return: Math.round(qtdMetrics.rateOfReturn * 100) / 100,
        // YTD
        ytd_beginning_balance: Math.round(ytdBeginning * 100) / 100,
        ytd_additions: Math.round(ytdAdditions * 100) / 100,
        ytd_redemptions: Math.round(ytdRedemptions * 100) / 100,
        ytd_net_income: Math.round(ytdMetrics.netIncome * 100) / 100,
        ytd_ending_balance: Math.round(currentBalance * 100) / 100,
        ytd_rate_of_return: Math.round(ytdMetrics.rateOfReturn * 100) / 100,
        // ITD
        itd_beginning_balance: itdBeginning,
        itd_additions: Math.round(itdAdditions * 100) / 100,
        itd_redemptions: Math.round(itdRedemptions * 100) / 100,
        itd_net_income: Math.round(itdMetrics.netIncome * 100) / 100,
        itd_ending_balance: Math.round(currentBalance * 100) / 100,
        itd_rate_of_return: Math.round(itdRoR * 100) / 100,
      });
    }

    console.log(`Generated ${performanceRecords.length} performance records`);

    // Step 5: Upsert into investor_fund_performance using ON CONFLICT
    // This is atomic and safe for concurrent calls
    if (performanceRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from("investor_fund_performance")
        .upsert(performanceRecords, {
          onConflict: 'period_id,investor_id,fund_name,purpose', // Include purpose in conflict key
          ignoreDuplicates: false // Update existing records
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw upsertError;
      }
      
      console.log(`Successfully upserted ${performanceRecords.length} records`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        periodId,
        recordsCreated: performanceRecords.length,
        message: `Generated ${performanceRecords.length} performance records for ${periodYear}-${String(periodMonth).padStart(2, "0")}`,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error: any) {
    console.error("Error generating performance:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Failed to generate performance data" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
