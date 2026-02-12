import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";
import { getCorsHeaders } from "../_shared/cors.ts";

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

  // When no beginning balance, use additions as denominator (same approach as ITD)
  if (beginningBalance <= 0) {
    if (additions > 0) {
      const rateOfReturn = (netIncome / additions) * 100;
      return { netIncome, rateOfReturn };
    }
    return { netIncome, rateOfReturn: 0 };
  }

  const rateOfReturn = (netIncome / beginningBalance) * 100;
  return { netIncome, rateOfReturn };
}

/** Returns the canonical number of decimal places for each asset */
function getAssetDecimals(asset: string): number {
  switch (asset.toUpperCase()) {
    case "BTC":
      return 8;
    case "ETH":
    case "SOL":
    case "XRP":
    case "XAUT":
      return 4;
    case "USDC":
    case "USDT":
    case "EURC":
    default:
      return 2;
  }
}

/** Round to N decimal places (avoids floating-point drift) */
function roundToDecimals(value: number, decimals: number): number {
  const factor = Math.pow(10, decimals);
  return Math.round(value * factor) / factor;
}

Deno.serve(async (req) => {
  const corsHeaders = getCorsHeaders(req.headers.get("origin"));

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
      return new Response(JSON.stringify({ error: "Authorization required" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Create a client with the user's token to verify their identity
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    // Get the authenticated user
    const {
      data: { user },
      error: userError,
    } = await userClient.auth.getUser();
    if (userError || !user) {
      console.error("Auth error:", userError);
      return new Response(JSON.stringify({ error: "Invalid or expired token" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Use service role client for admin check via profiles.is_admin
    // This is consistent with other admin functions and works for users with multiple roles
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const adminCheck = await checkAdminAccess(supabase, user.id);

    if (!adminCheck.isAdmin) {
      console.error(
        "Admin check failed:",
        adminCheck.error || "User is not admin",
        "User:",
        user.email,
        "ID:",
        user.id
      );
      return createAdminDeniedResponse(
        corsHeaders,
        "You must be an administrator to generate performance reports"
      );
    }

    console.log(`Admin ${adminCheck.email} generating performance data`);

    const { periodYear, periodMonth }: RequestBody = await req.json();

    if (!periodYear || !periodMonth) {
      return new Response(JSON.stringify({ error: "periodYear and periodMonth are required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    console.log(`Generating performance for ${periodYear}-${periodMonth}`);

    // Step 1: Get or create the statement period
    const periodResult = await supabase
      .from("statement_periods")
      .select("id")
      .eq("year", periodYear)
      .eq("month", periodMonth)
      .maybeSingle();

    if (periodResult.error) throw periodResult.error;
    let period = periodResult.data;

    if (!period) {
      // Create the period
      const periodEndDate = new Date(periodYear, periodMonth, 0); // Last day of month
      const periodName = new Intl.DateTimeFormat("en-US", {
        month: "long",
        year: "numeric",
      }).format(new Date(periodYear, periodMonth - 1));

      const { data: newPeriod, error: createError } = await supabase
        .from("statement_periods")
        .insert({
          year: periodYear,
          month: periodMonth,
          period_name: periodName,
          period_end_date: periodEndDate.toISOString().split("T")[0],
          status: "DRAFT",
        })
        .select("id")
        .single();

      if (createError) throw createError;
      period = newPeriod;
    }

    const periodId = period.id;
    console.log(`Using period ID: ${periodId}`);

    // Step 2: Resolve eligible investors (exclude non-investor account types)
    const { data: investorProfiles, error: investorProfilesError } = await supabase
      .from("profiles")
      .select("id, account_type, is_admin")
      .eq("is_admin", false);

    if (investorProfilesError) throw investorProfilesError;

    const investorIds = (investorProfiles || [])
      .filter((p: any) => !p.account_type || p.account_type === "investor")
      .map((p: any) => p.id);

    if (investorIds.length === 0) {
      return new Response(
        JSON.stringify({
          success: true,
          periodId,
          recordsCreated: 0,
          statementsGenerated: 0,
          message: "No eligible investors found for report generation",
        }),
        { headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Step 2b: Load active funds for asset mapping and filtering
    const { data: funds, error: fundsError } = await supabase
      .from("funds")
      .select("id, asset, status")
      .eq("status", "active");

    if (fundsError) throw fundsError;

    const fundAssetById = new Map((funds || []).map((f: any) => [f.id, f.asset] as const));
    const activeAssets = new Set((funds || []).map((f: any) => f.asset));

    // Step 2c: Positions are NOT fetched here. If an investor has a position,
    // they must have at least one transaction (deposit), so transactionGroups
    // will always contain their key. Using current positions as a balance
    // fallback is unsafe for historical periods (would inject current-time
    // values into past reports).

    // Step 3: Calculate date ranges
    const mtdStart = new Date(periodYear, periodMonth - 1, 1);
    const mtdEnd = new Date(periodYear, periodMonth, 0);

    // QTD: Start of current quarter
    const currentQuarter = Math.floor((periodMonth - 1) / 3);
    const qtdStart = new Date(periodYear, currentQuarter * 3, 1);

    // YTD: Start of year
    const ytdStart = new Date(periodYear, 0, 1);

    const periodEndDateStr = mtdEnd.toISOString().split("T")[0];

    // Step 4: Get transactions for calculations
    // Include ALL non-voided transactions for accurate statement calculations.
    // The purpose filter was causing deposits (which have no purpose or purpose='transaction')
    // to be invisible, misclassifying all position value as Net Income.
    // The sumByType helper already filters by transaction type (DEPOSIT, WITHDRAWAL, etc.)
    // so there's no risk of double-counting across different purposes.
    const { data: transactions, error: txError } = await supabase
      .from("transactions_v2")
      .select("investor_id, asset, amount, type, tx_date")
      .in("investor_id", investorIds)
      .in("asset", Array.from(activeAssets))
      .lte("tx_date", periodEndDateStr)
      .eq("is_voided", false) // Only include non-voided transactions
      .order("tx_date", { ascending: true });

    if (txError) throw txError;

    console.log(`Found ${transactions?.length || 0} transactions`);

    // Step 4b: Pull end-of-period snapshots (authoritative if available)
    const { data: snapshots, error: snapshotsError } = await supabase
      .from("investor_position_snapshots")
      .select("investor_id, fund_id, current_value")
      .in("investor_id", investorIds)
      .eq("snapshot_date", periodEndDateStr);

    if (snapshotsError) throw snapshotsError;

    const snapshotBalances = new Map<string, number>();
    for (const snap of snapshots || []) {
      const asset = fundAssetById.get((snap as any).fund_id);
      if (!asset) continue;
      snapshotBalances.set(
        `${(snap as any).investor_id}:${asset}`,
        Number((snap as any).current_value) || 0
      );
    }

    const transactionGroups = new Map<string, any[]>();
    for (const tx of transactions || []) {
      const key = `${(tx as any).investor_id}:${(tx as any).asset}`;
      if (!transactionGroups.has(key)) {
        transactionGroups.set(key, []);
      }
      transactionGroups.get(key)!.push(tx);
    }

    const allKeys = new Set<string>([...snapshotBalances.keys(), ...transactionGroups.keys()]);

    // Step 4c: Prior-period chain for beginning balance fallback
    // When sumBalanceUpTo returns 0 (e.g., deposit date = period start), use
    // prior month's ending balance from investor_fund_performance.
    const priorMonth = periodMonth === 1 ? 12 : periodMonth - 1;
    const priorYear = periodMonth === 1 ? periodYear - 1 : periodYear;

    const priorEndingBalances = new Map<string, number>();

    const { data: priorPeriod } = await supabase
      .from("statement_periods")
      .select("id")
      .eq("year", priorYear)
      .eq("month", priorMonth)
      .maybeSingle();

    if (priorPeriod) {
      const { data: priorPerf } = await supabase
        .from("investor_fund_performance")
        .select("investor_id, fund_name, mtd_ending_balance")
        .eq("period_id", priorPeriod.id)
        .eq("purpose", "reporting");

      for (const row of priorPerf || []) {
        const bal = Number((row as any).mtd_ending_balance) || 0;
        if (bal > 0) {
          priorEndingBalances.set(`${(row as any).investor_id}:${(row as any).fund_name}`, bal);
        }
      }
      console.log(
        `Loaded ${priorEndingBalances.size} prior-period ending balances from ${priorYear}-${priorMonth}`
      );
    }

    const performanceRecords: any[] = [];

    const inflowTypes = new Set([
      "DEPOSIT",
      "INTERNAL_CREDIT",
      "YIELD",
      "INTEREST",
      "FEE_CREDIT",
      "IB_CREDIT",
      "ADJUSTMENT",
      "DUST_SWEEP",
    ]);
    const outflowTypes = new Set(["WITHDRAWAL", "INTERNAL_WITHDRAWAL", "IB_DEBIT", "FEE"]);
    const additionTypes = new Set(["DEPOSIT", "INTERNAL_CREDIT"]);
    const redemptionTypes = new Set(["WITHDRAWAL", "INTERNAL_WITHDRAWAL"]);

    const sumBalanceUpTo = (txs: any[], beforeDate: Date): number => {
      return txs
        .filter((tx: any) => new Date(tx.tx_date) <= beforeDate)
        .reduce((sum: number, tx: any) => {
          const amount = Math.abs(Number(tx.amount));
          if (inflowTypes.has(tx.type)) return sum + amount;
          if (outflowTypes.has(tx.type)) return sum - amount;
          return sum;
        }, 0);
    };

    const sumByType = (txs: any[], startDate: Date, endDate: Date, types: Set<string>): number => {
      return txs
        .filter((tx: any) => {
          const txDate = new Date(tx.tx_date);
          return txDate > startDate && txDate <= endDate && types.has(tx.type);
        })
        .reduce((sum: number, tx: any) => sum + Math.abs(Number(tx.amount)), 0);
    };

    const sumBalanceThrough = (txs: any[], endDate: Date): number => {
      return txs
        .filter((tx: any) => new Date(tx.tx_date) <= endDate)
        .reduce((sum: number, tx: any) => {
          const amount = Math.abs(Number(tx.amount));
          if (inflowTypes.has(tx.type)) return sum + amount;
          if (outflowTypes.has(tx.type)) return sum - amount;
          return sum;
        }, 0);
    };

    // Calculate metrics for each investor + asset combination
    for (const key of allKeys) {
      const [investorId, fundAsset] = key.split(":");

      const investorTxs = transactionGroups.get(key) || [];

      // Skip investors with no transactions before period end and no snapshot
      // They had no position in this period (e.g., invested months later)
      if (investorTxs.length === 0 && !snapshotBalances.has(key)) {
        continue;
      }

      // Prefer snapshot balances at period end; fallback to transaction-derived balance
      let endingBalance = snapshotBalances.get(key);
      if (endingBalance === undefined) {
        endingBalance = investorTxs.length > 0 ? sumBalanceThrough(investorTxs, mtdEnd) : 0;
      }

      // ============= MTD CALCULATIONS =============
      let mtdBeginning = sumBalanceUpTo(investorTxs, mtdStart);
      // Fallback: if tx-derived beginning is 0, use prior period ending balance
      if (mtdBeginning === 0) {
        const priorBal = priorEndingBalances.get(key);
        if (priorBal && priorBal > 0) {
          mtdBeginning = priorBal;
        }
      }
      const mtdAdditions = sumByType(investorTxs, mtdStart, mtdEnd, additionTypes);
      const mtdRedemptions = sumByType(investorTxs, mtdStart, mtdEnd, redemptionTypes);

      // CORRECT FORMULA: net_income = ending - beginning - additions + redemptions
      const mtdMetrics = calculatePerformanceMetrics(
        endingBalance,
        mtdBeginning,
        mtdAdditions,
        mtdRedemptions
      );

      // ============= QTD CALCULATIONS =============
      const qtdBeginning = sumBalanceUpTo(investorTxs, qtdStart);
      const qtdAdditions = sumByType(investorTxs, qtdStart, mtdEnd, additionTypes);
      const qtdRedemptions = sumByType(investorTxs, qtdStart, mtdEnd, redemptionTypes);

      const qtdMetrics = calculatePerformanceMetrics(
        endingBalance,
        qtdBeginning,
        qtdAdditions,
        qtdRedemptions
      );

      // ============= YTD CALCULATIONS =============
      const ytdBeginning = sumBalanceUpTo(investorTxs, ytdStart);
      const ytdAdditions = sumByType(investorTxs, ytdStart, mtdEnd, additionTypes);
      const ytdRedemptions = sumByType(investorTxs, ytdStart, mtdEnd, redemptionTypes);

      const ytdMetrics = calculatePerformanceMetrics(
        endingBalance,
        ytdBeginning,
        ytdAdditions,
        ytdRedemptions
      );

      // ============= ITD CALCULATIONS =============
      // ITD beginning is always 0 (inception)
      const itdBeginning = 0;
      const itdAdditions = sumByType(investorTxs, new Date(0), mtdEnd, additionTypes);
      const itdRedemptions = sumByType(investorTxs, new Date(0), mtdEnd, redemptionTypes);

      const itdMetrics = calculatePerformanceMetrics(
        endingBalance,
        itdBeginning,
        itdAdditions,
        itdRedemptions
      );

      // Special case for ITD: use total principal as denominator since beginning is 0
      const totalPrincipal = itdAdditions - itdRedemptions;
      const itdRoR = totalPrincipal > 0 ? (itdMetrics.netIncome / totalPrincipal) * 100 : 0;

      // Use asset-specific decimal precision (BTC=8, ETH=4, stablecoins=2)
      const decimals = getAssetDecimals(fundAsset);
      const round = (v: number) => roundToDecimals(v, decimals);
      const rorRound = (v: number) => Math.round(v * 100) / 100; // RoR always 2dp

      // Round component values first, then DERIVE net_income from rounded values
      // to guarantee: beginning + additions - redemptions + net_income = ending
      const mtdBeginR = round(mtdBeginning);
      const mtdAddR = round(mtdAdditions);
      const mtdRedR = round(mtdRedemptions);
      const mtdEndR = round(endingBalance);
      const mtdNetR = round(mtdEndR - mtdBeginR - mtdAddR + mtdRedR);

      const qtdBeginR = round(qtdBeginning);
      const qtdAddR = round(qtdAdditions);
      const qtdRedR = round(qtdRedemptions);
      const qtdEndR = round(endingBalance);
      const qtdNetR = round(qtdEndR - qtdBeginR - qtdAddR + qtdRedR);

      const ytdBeginR = round(ytdBeginning);
      const ytdAddR = round(ytdAdditions);
      const ytdRedR = round(ytdRedemptions);
      const ytdEndR = round(endingBalance);
      const ytdNetR = round(ytdEndR - ytdBeginR - ytdAddR + ytdRedR);

      const itdBeginR = 0;
      const itdAddR = round(itdAdditions);
      const itdRedR = round(itdRedemptions);
      const itdEndR = round(endingBalance);
      const itdNetR = round(itdEndR - itdBeginR - itdAddR + itdRedR);

      performanceRecords.push({
        period_id: periodId,
        investor_id: investorId,
        fund_name: fundAsset,
        purpose: "reporting",
        // MTD
        mtd_beginning_balance: mtdBeginR,
        mtd_additions: mtdAddR,
        mtd_redemptions: mtdRedR,
        mtd_net_income: mtdNetR,
        mtd_ending_balance: mtdEndR,
        mtd_rate_of_return: rorRound(mtdMetrics.rateOfReturn),
        // QTD
        qtd_beginning_balance: qtdBeginR,
        qtd_additions: qtdAddR,
        qtd_redemptions: qtdRedR,
        qtd_net_income: qtdNetR,
        qtd_ending_balance: qtdEndR,
        qtd_rate_of_return: rorRound(qtdMetrics.rateOfReturn),
        // YTD
        ytd_beginning_balance: ytdBeginR,
        ytd_additions: ytdAddR,
        ytd_redemptions: ytdRedR,
        ytd_net_income: ytdNetR,
        ytd_ending_balance: ytdEndR,
        ytd_rate_of_return: rorRound(ytdMetrics.rateOfReturn),
        // ITD
        itd_beginning_balance: itdBeginR,
        itd_additions: itdAddR,
        itd_redemptions: itdRedR,
        itd_net_income: itdNetR,
        itd_ending_balance: itdEndR,
        itd_rate_of_return: rorRound(itdRoR),
      });
    }

    console.log(`Generated ${performanceRecords.length} performance records`);

    // Step 5: Upsert into investor_fund_performance using ON CONFLICT
    // This is atomic and safe for concurrent calls
    if (performanceRecords.length > 0) {
      const { error: upsertError } = await supabase
        .from("investor_fund_performance")
        .upsert(performanceRecords, {
          onConflict: "period_id,investor_id,fund_name,purpose", // Include purpose in conflict key
          ignoreDuplicates: false, // Update existing records
        });

      if (upsertError) {
        console.error("Upsert error:", upsertError);
        throw upsertError;
      }

      console.log(`Successfully upserted ${performanceRecords.length} records`);
    }

    // Step 6: Generate and upsert statements into generated_statements table
    // Group performance records by investor
    const investorPerformanceMap = new Map<string, any[]>();
    for (const record of performanceRecords) {
      if (!investorPerformanceMap.has(record.investor_id)) {
        investorPerformanceMap.set(record.investor_id, []);
      }
      investorPerformanceMap.get(record.investor_id)!.push(record);
    }

    // Get investor profiles for names
    const statementInvestorIds = Array.from(investorPerformanceMap.keys());
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, first_name, last_name, email")
      .in("id", statementInvestorIds);

    if (profilesError) {
      console.error("Failed to fetch profiles:", profilesError);
      throw profilesError;
    }

    const profileMap = new Map((profiles || []).map((p) => [p.id, p]));

    // Generate HTML for each investor and upsert to generated_statements
    const periodEndDate = new Date(periodYear, periodMonth, 0);
    const reportDate = formatReportDate(periodEndDate);

    let statementsGenerated = 0;

    for (const [investorId, records] of investorPerformanceMap.entries()) {
      const profile = profileMap.get(investorId);
      const investorName =
        profile?.first_name && profile?.last_name
          ? `${profile.first_name} ${profile.last_name}`
          : profile?.email || "Investor";

      // Build fund data for HTML generation
      const fundNames: string[] = [];
      const fundsHtml = records
        .map((record, index) => {
          fundNames.push(record.fund_name);
          const currency = record.fund_name.split(" ")[0]; // Extract currency from fund name

          return generateFundBlockHtml(record, currency, index > 0);
        })
        .join("");

      // Generate full HTML statement
      const htmlContent = generateStatementHtml(investorName, reportDate, fundsHtml);

      // Upsert into generated_statements
      const { error: statementError } = await supabase.from("generated_statements").upsert(
        {
          investor_id: investorId,
          user_id: investorId,
          period_id: periodId,
          fund_names: fundNames,
          html_content: htmlContent,
          generated_by: user.id,
        },
        {
          onConflict: "investor_id,period_id",
          ignoreDuplicates: false,
        }
      );

      if (statementError) {
        console.error(`Failed to upsert statement for investor ${investorId}:`, statementError);
        // Continue with other investors
      } else {
        statementsGenerated++;
      }
    }

    console.log(`Generated ${statementsGenerated} statements`);

    return new Response(
      JSON.stringify({
        success: true,
        periodId,
        recordsCreated: performanceRecords.length,
        statementsGenerated,
        message: `Generated ${performanceRecords.length} performance records and ${statementsGenerated} statements for ${periodYear}-${String(periodMonth).padStart(2, "0")}`,
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

// Helper functions for HTML generation

const FUND_ICONS: Record<string, string> = {
  "BTC YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/8Pf2dtBl6QjlVu34Pcqvyr6rUU6MWwYdN9qTrClW.png",
  "ETH YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/iuulK6xRS80ItnV4gq2VY7voxoWe7AMvPA5roO16.png",
  "USDC YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/770YUbYlWXFXPpolUS1wssuUGIeH7zHpt1mQbDah.png",
  "USDT YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/2p3Y0l5lox8EefjCx7U7Qgfkrb9cxW3L8mGpaORi.png",
  "SOL YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/14fmAPi88WAnAwH4XhoObK1J1HwiTSvItLhIRFSQ.png",
  "EURC YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/kwV87oiC7c4dnG6zkl95MnV5yafAxWlFbQgjmaIm.png",
  "XAUT YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/eX8YQ2JiQtWXocPigWGSwju5WPTsGq01eOKmTx5p.png",
  "XRP YIELD FUND":
    "https://storage.mlcdn.com/account_image/855106/mlmOJ9qsJ3LDZaVyWnIqhffzzem0vIts6bourbHO.png",
};

const LOGO_URL =
  "https://storage.mlcdn.com/account_image/855106/5D1naaoOoLlct3mSzZSkkv7ELCCCG4kr7W9CJwSy.jpg";

const SOCIAL_ICONS = {
  linkedin:
    "https://storage.mlcdn.com/account_image/855106/ojd93cnCVRi5L51cI3iT2FVQKwbwUdZYyjU5UBly.png",
  instagram:
    "https://storage.mlcdn.com/account_image/855106/SkcRzdNBhSZKcJsfsRWfUUqcdl09N5aF7Oprsjhl.png",
  twitter:
    "https://storage.mlcdn.com/account_image/855106/gecQtGTjUytuBi3PJXEx9dvCYHKL0KpLipsB0FbU.png",
};

/** Format a number for display; returns "-" when value is zero (for additions/redemptions) */
function formatActivity(value: number, decimals: number): string {
  if (value === 0) return "-";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Format a number with sign prefix: "+1.2345" for positive, "(1.2345)" for negative, "-" for zero */
function formatSignedNumber(value: number, decimals: number): string {
  if (value === 0) return "-";
  if (value < 0) {
    return `(${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })})`;
  }
  return `+${value.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })}`;
}

/** Format percentage with sign: "+0.43%", "(0.43%)", or "-" for zero */
function formatSignedPercent(value: number): string {
  if (value === 0) return "-";
  if (value < 0) {
    return `(${Math.abs(value).toFixed(2)}%)`;
  }
  return `+${value.toFixed(2)}%`;
}

/** Format a balance number (always show digits, no sign prefix) */
function formatBalance(value: number, decimals: number): string {
  if (value === 0) return "-";
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

/** Get ordinal suffix for a day number */
function getOrdinalSuffix(day: number): string {
  if (day >= 11 && day <= 13) return "th";
  switch (day % 10) {
    case 1:
      return "st";
    case 2:
      return "nd";
    case 3:
      return "rd";
    default:
      return "th";
  }
}

/** Format date as "December 31st, 2025" */
function formatReportDate(date: Date): string {
  const month = new Intl.DateTimeFormat("en-US", { month: "long" }).format(date);
  const day = date.getDate();
  const year = date.getFullYear();
  return `${month} ${day}${getOrdinalSuffix(day)}, ${year}`;
}

/** Color for net income / rate of return values */
function getValueColor(value: number): string {
  if (value > 0) return "#16a34a";
  if (value < 0) return "#dc2626";
  return "#1e293b";
}

function generateFundBlockHtml(record: any, currency: string, hasSpacer: boolean): string {
  const fundName = `${currency} YIELD FUND`;
  const iconUrl = FUND_ICONS[fundName] || FUND_ICONS["USDC YIELD FUND"];
  const spacer = hasSpacer ? '<tr><td style="height:20px;"></td></tr>' : "";
  const decimals = getAssetDecimals(currency);

  const row = (
    label: string,
    mtd: string,
    qtd: string,
    ytd: string,
    itd: string,
    opts: { bold?: boolean; color?: string; borderTop?: boolean } = {}
  ) => {
    const weight = opts.bold ? "font-weight:700;" : "";
    const color = opts.color || "#1e293b";
    const topBorder = opts.borderTop ? "border-top:2px solid #e2e8f0;" : "";
    return `<tr>
      <td style="padding:12px 12px;font-size:14px;color:#475569;${weight}border-bottom:1px solid #f1f5f9;${topBorder}">${label}</td>
      <td style="padding:12px 8px;text-align:right;font-size:14px;color:${color};${weight}border-bottom:1px solid #f1f5f9;${topBorder}">${mtd}</td>
      <td style="padding:12px 8px;text-align:right;font-size:14px;color:${color};${weight}border-bottom:1px solid #f1f5f9;${topBorder}">${qtd}</td>
      <td style="padding:12px 8px;text-align:right;font-size:14px;color:${color};${weight}border-bottom:1px solid #f1f5f9;${topBorder}">${ytd}</td>
      <td style="padding:12px 8px;text-align:right;font-size:14px;color:${color};${weight}border-bottom:1px solid #f1f5f9;${topBorder}">${itd}</td>
    </tr>`;
  };

  return `${spacer}
    <tr>
      <td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e2e8f0;" bgcolor="#ffffff">
          <tr>
            <td style="padding:20px;background-color:#ffffff;" bgcolor="#ffffff">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="40" valign="middle">
                    <img src="${iconUrl}" alt="${fundName}" width="32" height="32" style="display:block;border:0;">
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <h2 style="margin:0;font-size:18px;font-weight:600;color:#1e293b;">${fundName}</h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 20px 20px;background-color:#ffffff;" bgcolor="#ffffff">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr>
                  <th scope="col" style="padding:10px 12px;text-align:left;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;border-bottom:2px solid #e2e8f0;">Capital Account Summary</th>
                  <th scope="col" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;border-bottom:2px solid #e2e8f0;">MTD (${currency})</th>
                  <th scope="col" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;border-bottom:2px solid #e2e8f0;">QTD (${currency})</th>
                  <th scope="col" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;border-bottom:2px solid #e2e8f0;">YTD (${currency})</th>
                  <th scope="col" style="padding:10px 8px;text-align:right;font-size:12px;color:#64748b;text-transform:uppercase;font-weight:600;border-bottom:2px solid #e2e8f0;">ITD (${currency})</th>
                </tr>
                ${row(
                  "Beginning Balance",
                  formatBalance(record.mtd_beginning_balance, decimals),
                  formatBalance(record.qtd_beginning_balance, decimals),
                  formatBalance(record.ytd_beginning_balance, decimals),
                  formatBalance(record.itd_beginning_balance, decimals)
                )}
                ${row(
                  "Additions",
                  formatActivity(record.mtd_additions, decimals),
                  formatActivity(record.qtd_additions, decimals),
                  formatActivity(record.ytd_additions, decimals),
                  formatActivity(record.itd_additions, decimals)
                )}
                ${row(
                  "Redemptions",
                  formatActivity(record.mtd_redemptions, decimals),
                  formatActivity(record.qtd_redemptions, decimals),
                  formatActivity(record.ytd_redemptions, decimals),
                  formatActivity(record.itd_redemptions, decimals)
                )}
                <tr>
                  <td style="padding:12px 12px;font-size:14px;color:#475569;font-weight:700;border-bottom:1px solid #f1f5f9;">Net Income</td>
                  <td style="padding:12px 8px;text-align:right;font-size:14px;color:${getValueColor(record.mtd_net_income)};font-weight:700;border-bottom:1px solid #f1f5f9;">${formatSignedNumber(record.mtd_net_income, decimals)}</td>
                  <td style="padding:12px 8px;text-align:right;font-size:14px;color:${getValueColor(record.qtd_net_income)};font-weight:700;border-bottom:1px solid #f1f5f9;">${formatSignedNumber(record.qtd_net_income, decimals)}</td>
                  <td style="padding:12px 8px;text-align:right;font-size:14px;color:${getValueColor(record.ytd_net_income)};font-weight:700;border-bottom:1px solid #f1f5f9;">${formatSignedNumber(record.ytd_net_income, decimals)}</td>
                  <td style="padding:12px 8px;text-align:right;font-size:14px;color:${getValueColor(record.itd_net_income)};font-weight:700;border-bottom:1px solid #f1f5f9;">${formatSignedNumber(record.itd_net_income, decimals)}</td>
                </tr>
                ${row(
                  "Ending Balance",
                  formatBalance(record.mtd_ending_balance, decimals),
                  formatBalance(record.qtd_ending_balance, decimals),
                  formatBalance(record.ytd_ending_balance, decimals),
                  formatBalance(record.itd_ending_balance, decimals),
                  { bold: true, borderTop: true }
                )}
                <tr>
                  <td style="padding:12px 12px;font-size:14px;color:#475569;font-weight:600;">Rate of Return</td>
                  <td style="padding:12px 8px;text-align:right;font-size:14px;color:${getValueColor(record.mtd_rate_of_return)};font-weight:600;">${formatSignedPercent(record.mtd_rate_of_return)}</td>
                  <td style="padding:12px 8px;text-align:right;font-size:14px;color:${getValueColor(record.qtd_rate_of_return)};font-weight:600;">${formatSignedPercent(record.qtd_rate_of_return)}</td>
                  <td style="padding:12px 8px;text-align:right;font-size:14px;color:${getValueColor(record.ytd_rate_of_return)};font-weight:600;">${formatSignedPercent(record.ytd_rate_of_return)}</td>
                  <td style="padding:12px 8px;text-align:right;font-size:14px;color:${getValueColor(record.itd_rate_of_return)};font-weight:600;">${formatSignedPercent(record.itd_rate_of_return)}</td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>`;
}

function generateStatementHtml(
  investorName: string,
  reportDate: string,
  fundsHtml: string
): string {
  const currentYear = new Date().getFullYear();

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${investorName} - Monthly Report - ${reportDate}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
  <style>
    @media only screen and (max-width: 480px) {
      .email-container { width: 100% !important; padding: 12px !important; }
      .fund-block { border-radius: 8px !important; }
      .fund-block td { font-size: 11px !important; padding: 8px 4px !important; }
      .fund-header h2 { font-size: 15px !important; }
      .fund-icon { width: 24px !important; height: 24px !important; }
      .header-title { font-size: 20px !important; }
      .investor-name { font-size: 16px !important; }
      .period-text { font-size: 12px !important; }
    }
  </style>
</head>
<body style="margin:0;padding:0;background-color:#ffffff;font-family:'Montserrat',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;" bgcolor="#ffffff">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table class="email-container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="640" style="max-width:640px;">
          <!-- Brand Header -->
          <tr>
            <td style="background-color:#ffffff;padding:24px 24px 20px 24px;border-bottom:2px solid #e2e8f0;" bgcolor="#ffffff">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <img src="${LOGO_URL}" alt="Indigo" height="48" style="display:block;border:0;height:48px;width:auto;">
                  </td>
                  <td valign="middle" align="right">
                    <h1 class="header-title" style="margin:0;font-size:24px;line-height:1.2;color:#0f172a;font-weight:700;">Monthly Report</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Investor Header -->
          <tr>
            <td style="background-color:#ffffff;padding:24px 24px 16px 24px;" bgcolor="#ffffff">
              <h2 class="investor-name" style="margin:0 0 6px 0;font-size:20px;font-weight:600;color:#1e293b;">${investorName}</h2>
              <p class="period-text" style="margin:0;font-size:14px;line-height:1.5;color:#64748b;">
                For the period ending <strong style="color:#334155;">${reportDate}</strong>
              </p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:0 24px 24px 24px;background-color:#ffffff;" bgcolor="#ffffff">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                ${fundsHtml}
              </table>
            </td>
          </tr>
          <!-- Spacer -->
          <tr>
            <td style="height:24px;"></td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding:0 24px;border-top:1px solid #e2e8f0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;padding:20px 0 16px 0;">
                    <a href="https://linkedin.com" style="display:inline-block;margin-right:12px;">
                      <img src="${SOCIAL_ICONS.linkedin}" alt="LinkedIn" width="24" height="24" style="border:0;">
                    </a>
                    <a href="https://instagram.com" style="display:inline-block;margin-right:12px;">
                      <img src="${SOCIAL_ICONS.instagram}" alt="Instagram" width="24" height="24" style="border:0;">
                    </a>
                    <a href="https://twitter.com" style="display:inline-block;">
                      <img src="${SOCIAL_ICONS.twitter}" alt="Twitter" width="24" height="24" style="border:0;">
                    </a>
                  </td>
                </tr>
                <tr>
                  <td style="text-align:center;font-size:11px;color:#94a3b8;line-height:1.6;padding-bottom:20px;">
                    <p style="margin:0 0 8px 0;">This document is for informational purposes only and does not constitute an offer to sell or a solicitation of an offer to buy any securities. Past performance is not indicative of future results.</p>
                    <p style="margin:0;">&copy; ${currentYear} Indigo Fund. All rights reserved.</p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}
