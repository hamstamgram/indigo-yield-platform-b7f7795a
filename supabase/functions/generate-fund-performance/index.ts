import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
  periodYear: number;
  periodMonth: number;
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

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
    const { data: transactions, error: txError } = await supabase
      .from("transactions_v2")
      .select("*")
      .lte("tx_date", mtdEnd.toISOString().split("T")[0])
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

      // Calculate MTD metrics
      const mtdTxs = investorTxs.filter((tx: any) => {
        const txDate = new Date(tx.tx_date);
        return txDate >= mtdStart && txDate <= mtdEnd;
      });

      const mtdAdditions = mtdTxs
        .filter((tx: any) => ["DEPOSIT", "SUBSCRIPTION"].includes(tx.type))
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      const mtdRedemptions = mtdTxs
        .filter((tx: any) => ["WITHDRAWAL", "REDEMPTION"].includes(tx.type))
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

      const mtdInterest = mtdTxs
        .filter((tx: any) => tx.type === "INTEREST")
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      const mtdFees = mtdTxs
        .filter((tx: any) => tx.type === "FEE")
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

      // MTD beginning balance = current - additions + redemptions - interest + fees
      const mtdBeginning = currentBalance - mtdAdditions + mtdRedemptions - mtdInterest + mtdFees;
      const mtdNetIncome = mtdInterest - mtdFees;
      const mtdRoR = mtdBeginning > 0 ? (mtdNetIncome / mtdBeginning) * 100 : 0;

      // Calculate QTD metrics
      const qtdTxs = investorTxs.filter((tx: any) => {
        const txDate = new Date(tx.tx_date);
        return txDate >= qtdStart && txDate <= mtdEnd;
      });

      const qtdAdditions = qtdTxs
        .filter((tx: any) => ["DEPOSIT", "SUBSCRIPTION"].includes(tx.type))
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      const qtdRedemptions = qtdTxs
        .filter((tx: any) => ["WITHDRAWAL", "REDEMPTION"].includes(tx.type))
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

      const qtdInterest = qtdTxs
        .filter((tx: any) => tx.type === "INTEREST")
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      const qtdFees = qtdTxs
        .filter((tx: any) => tx.type === "FEE")
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

      const qtdBeginning = currentBalance - qtdAdditions + qtdRedemptions - qtdInterest + qtdFees;
      const qtdNetIncome = qtdInterest - qtdFees;
      const qtdRoR = qtdBeginning > 0 ? (qtdNetIncome / qtdBeginning) * 100 : 0;

      // Calculate YTD metrics
      const ytdTxs = investorTxs.filter((tx: any) => {
        const txDate = new Date(tx.tx_date);
        return txDate >= ytdStart && txDate <= mtdEnd;
      });

      const ytdAdditions = ytdTxs
        .filter((tx: any) => ["DEPOSIT", "SUBSCRIPTION"].includes(tx.type))
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      const ytdRedemptions = ytdTxs
        .filter((tx: any) => ["WITHDRAWAL", "REDEMPTION"].includes(tx.type))
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

      const ytdInterest = ytdTxs
        .filter((tx: any) => tx.type === "INTEREST")
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      const ytdFees = ytdTxs
        .filter((tx: any) => tx.type === "FEE")
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

      const ytdBeginning = currentBalance - ytdAdditions + ytdRedemptions - ytdInterest + ytdFees;
      const ytdNetIncome = ytdInterest - ytdFees;
      const ytdRoR = ytdBeginning > 0 ? (ytdNetIncome / ytdBeginning) * 100 : 0;

      // Calculate ITD (Inception to Date) metrics - all transactions
      const itdAdditions = investorTxs
        .filter((tx: any) => ["DEPOSIT", "SUBSCRIPTION"].includes(tx.type))
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      const itdRedemptions = investorTxs
        .filter((tx: any) => ["WITHDRAWAL", "REDEMPTION"].includes(tx.type))
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

      const itdInterest = investorTxs
        .filter((tx: any) => tx.type === "INTEREST")
        .reduce((sum: number, tx: any) => sum + Number(tx.amount), 0);

      const itdFees = investorTxs
        .filter((tx: any) => tx.type === "FEE")
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);

      // ITD beginning is essentially 0 (inception)
      const itdBeginning = 0;
      const itdNetIncome = itdInterest - itdFees;
      // ITD RoR = net income / total principal invested
      const totalPrincipal = itdAdditions - itdRedemptions;
      const itdRoR = totalPrincipal > 0 ? (itdNetIncome / totalPrincipal) * 100 : 0;

      performanceRecords.push({
        period_id: periodId,
        investor_id: investorId,
        fund_name: fundAsset,
        // MTD
        mtd_beginning_balance: Math.round(mtdBeginning * 100) / 100,
        mtd_additions: Math.round(mtdAdditions * 100) / 100,
        mtd_redemptions: Math.round(mtdRedemptions * 100) / 100,
        mtd_net_income: Math.round(mtdNetIncome * 100) / 100,
        mtd_ending_balance: Math.round(currentBalance * 100) / 100,
        mtd_rate_of_return: Math.round(mtdRoR * 100) / 100,
        // QTD
        qtd_beginning_balance: Math.round(qtdBeginning * 100) / 100,
        qtd_additions: Math.round(qtdAdditions * 100) / 100,
        qtd_redemptions: Math.round(qtdRedemptions * 100) / 100,
        qtd_net_income: Math.round(qtdNetIncome * 100) / 100,
        qtd_ending_balance: Math.round(currentBalance * 100) / 100,
        qtd_rate_of_return: Math.round(qtdRoR * 100) / 100,
        // YTD
        ytd_beginning_balance: Math.round(ytdBeginning * 100) / 100,
        ytd_additions: Math.round(ytdAdditions * 100) / 100,
        ytd_redemptions: Math.round(ytdRedemptions * 100) / 100,
        ytd_net_income: Math.round(ytdNetIncome * 100) / 100,
        ytd_ending_balance: Math.round(currentBalance * 100) / 100,
        ytd_rate_of_return: Math.round(ytdRoR * 100) / 100,
        // ITD
        itd_beginning_balance: itdBeginning,
        itd_additions: Math.round(itdAdditions * 100) / 100,
        itd_redemptions: Math.round(itdRedemptions * 100) / 100,
        itd_net_income: Math.round(itdNetIncome * 100) / 100,
        itd_ending_balance: Math.round(currentBalance * 100) / 100,
        itd_rate_of_return: Math.round(itdRoR * 100) / 100,
      });
    }

    console.log(`Generated ${performanceRecords.length} performance records`);

    // Step 5: Upsert into investor_fund_performance
    if (performanceRecords.length > 0) {
      // Delete existing records for this period first
      const { error: deleteError } = await supabase
        .from("investor_fund_performance")
        .delete()
        .eq("period_id", periodId);

      if (deleteError) {
        console.error("Delete error:", deleteError);
        // Continue anyway - may be empty
      }

      // Insert new records
      const { error: insertError } = await supabase
        .from("investor_fund_performance")
        .insert(performanceRecords);

      if (insertError) throw insertError;
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
