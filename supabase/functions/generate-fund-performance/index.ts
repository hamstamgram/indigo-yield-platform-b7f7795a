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

    // Step 2c: Get current positions for asset discovery (not balance source)
    const { data: positions, error: positionsError } = await supabase
      .from("investor_positions")
      .select(
        `
        investor_id,
        fund_id,
        current_value,
        funds!inner (
          asset,
          status
        )
      `
      )
      .in("investor_id", investorIds)
      .gt("current_value", 0);

    if (positionsError) throw positionsError;

    // Filter only active funds
    const activePositions = (positions || []).filter((p: any) => p.funds?.status === "active");

    console.log(`Found ${activePositions.length} active positions`);

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

    const positionBalances = new Map<string, number>();
    for (const pos of activePositions) {
      const fundData = pos.funds as unknown as { asset: string; status: string };
      const key = `${pos.investor_id}:${fundData.asset}`;
      const currentValue = Number(pos.current_value) || 0;
      positionBalances.set(key, (positionBalances.get(key) || 0) + currentValue);
    }

    const transactionGroups = new Map<string, any[]>();
    for (const tx of transactions || []) {
      const key = `${(tx as any).investor_id}:${(tx as any).asset}`;
      if (!transactionGroups.has(key)) {
        transactionGroups.set(key, []);
      }
      transactionGroups.get(key)!.push(tx);
    }

    const allKeys = new Set<string>([
      ...snapshotBalances.keys(),
      ...positionBalances.keys(),
      ...transactionGroups.keys(),
    ]);

    const performanceRecords: any[] = [];

    const inflowTypes = new Set(["DEPOSIT", "INTERNAL_CREDIT", "YIELD"]);
    const outflowTypes = new Set(["WITHDRAWAL", "INTERNAL_WITHDRAWAL"]);
    const additionTypes = new Set(["DEPOSIT", "INTERNAL_CREDIT"]);
    const redemptionTypes = new Set(["WITHDRAWAL", "INTERNAL_WITHDRAWAL"]);

    const sumBalanceUpTo = (txs: any[], beforeDate: Date): number => {
      return txs
        .filter((tx: any) => new Date(tx.tx_date) < beforeDate)
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
          return txDate >= startDate && txDate <= endDate && types.has(tx.type);
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
        if (investorTxs.length > 0) {
          endingBalance = sumBalanceThrough(investorTxs, mtdEnd);
        } else {
          endingBalance = positionBalances.get(key) || 0;
        }
      }

      // ============= MTD CALCULATIONS =============
      const mtdBeginning = sumBalanceUpTo(investorTxs, mtdStart);
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
    const reportDate = new Intl.DateTimeFormat("en-US", {
      month: "long",
      day: "numeric",
      year: "numeric",
    }).format(periodEndDate);

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

function formatNumber(value: number, decimals: number = 2): string {
  if (value < 0) {
    return `(${Math.abs(value).toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals })})`;
  }
  return value.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

function formatPercent(value: number): string {
  if (value < 0) {
    return `(${Math.abs(value).toFixed(2)}%)`;
  }
  return `${value.toFixed(2)}%`;
}

function getValueColor(value: number): string {
  return value < 0 ? "#dc2626" : "#16a34a";
}

function generateFundBlockHtml(record: any, currency: string, hasSpacer: boolean): string {
  const fundName = `${currency} YIELD FUND`;
  const iconUrl = FUND_ICONS[fundName] || FUND_ICONS["USDC YIELD FUND"];
  const spacer = hasSpacer ? '<tr><td style="height:16px;"></td></tr>' : "";
  const decimals = getAssetDecimals(currency);

  return `${spacer}
    <tr>
      <td>
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#ffffff;border-radius:10px;overflow:hidden;border:1px solid #e2e8f0;" bgcolor="#ffffff">
          <tr>
            <td style="padding:16px 20px;background-color:#ffffff;" bgcolor="#ffffff">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td width="36" valign="middle">
                    <img src="${iconUrl}" alt="${fundName}" width="28" height="28" style="display:block;border:0;">
                  </td>
                  <td valign="middle" style="padding-left:12px;">
                    <h2 style="margin:0;font-size:18px;font-weight:700;color:#1a202c;">${fundName}</h2>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="padding:0 20px 20px 20px;background-color:#ffffff;" bgcolor="#ffffff">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="border-collapse:collapse;">
                <tr style="background-color:#0f172a;">
                  <th scope="col" style="padding:10px 8px;text-align:left;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a">Capital Account Summary</th>
                  <th scope="col" style="padding:10px 8px;text-align:right;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a">MTD (${currency})</th>
                  <th scope="col" style="padding:10px 8px;text-align:right;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a">QTD (${currency})</th>
                  <th scope="col" style="padding:10px 8px;text-align:right;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a">YTD (${currency})</th>
                  <th scope="col" style="padding:10px 8px;text-align:right;font-size:11px;color:#ffffff;text-transform:uppercase;font-weight:700;border-bottom:1px solid #e2e8f0;background-color:#0f172a;" bgcolor="#0f172a">ITD (${currency})</th>
                </tr>
                <tr style="background-color:#f8fafc;">
                  <td style="padding:10px 8px;font-size:13px;color:#334155;background-color:#f8fafc;" bgcolor="#f8fafc">Beginning Balance</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.mtd_beginning_balance, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.qtd_beginning_balance, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.ytd_beginning_balance, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.itd_beginning_balance, decimals)}</td>
                </tr>
                <tr style="background-color:#ffffff;">
                  <td style="padding:10px 8px;font-size:13px;color:#334155;background-color:#ffffff;" bgcolor="#ffffff">Additions</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#ffffff;" bgcolor="#ffffff">${formatNumber(record.mtd_additions, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#ffffff;" bgcolor="#ffffff">${formatNumber(record.qtd_additions, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#ffffff;" bgcolor="#ffffff">${formatNumber(record.ytd_additions, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#ffffff;" bgcolor="#ffffff">${formatNumber(record.itd_additions, decimals)}</td>
                </tr>
                <tr style="background-color:#f8fafc;">
                  <td style="padding:10px 8px;font-size:13px;color:#334155;background-color:#f8fafc;" bgcolor="#f8fafc">Redemptions</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.mtd_redemptions, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.qtd_redemptions, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.ytd_redemptions, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.itd_redemptions, decimals)}</td>
                </tr>
                <tr style="background-color:#ffffff;">
                  <td style="padding:10px 8px;font-size:13px;color:#334155;background-color:#ffffff;" bgcolor="#ffffff">Net Income</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(record.mtd_net_income)};background-color:#ffffff;" bgcolor="#ffffff">${formatNumber(record.mtd_net_income, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(record.qtd_net_income)};background-color:#ffffff;" bgcolor="#ffffff">${formatNumber(record.qtd_net_income, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(record.ytd_net_income)};background-color:#ffffff;" bgcolor="#ffffff">${formatNumber(record.ytd_net_income, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(record.itd_net_income)};background-color:#ffffff;" bgcolor="#ffffff">${formatNumber(record.itd_net_income, decimals)}</td>
                </tr>
                <tr style="background-color:#f8fafc;border-top:1px solid #e2e8f0;">
                  <td style="padding:10px 8px;font-size:13px;color:#334155;font-weight:600;background-color:#f8fafc;" bgcolor="#f8fafc">Ending Balance</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;font-weight:600;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.mtd_ending_balance, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;font-weight:600;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.qtd_ending_balance, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;font-weight:600;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.ytd_ending_balance, decimals)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;color:#1e293b;font-weight:600;background-color:#f8fafc;" bgcolor="#f8fafc">${formatNumber(record.itd_ending_balance, decimals)}</td>
                </tr>
                <tr style="background-color:#e2e8f0;">
                  <td style="padding:10px 8px;font-size:13px;color:#334155;font-weight:600;background-color:#e2e8f0;" bgcolor="#e2e8f0">Rate of Return</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(record.mtd_rate_of_return)};background-color:#e2e8f0;" bgcolor="#e2e8f0">${formatPercent(record.mtd_rate_of_return)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(record.qtd_rate_of_return)};background-color:#e2e8f0;" bgcolor="#e2e8f0">${formatPercent(record.qtd_rate_of_return)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(record.ytd_rate_of_return)};background-color:#e2e8f0;" bgcolor="#e2e8f0">${formatPercent(record.ytd_rate_of_return)}</td>
                  <td style="padding:10px 8px;text-align:right;font-size:13px;font-weight:700;color:${getValueColor(record.itd_rate_of_return)};background-color:#e2e8f0;" bgcolor="#e2e8f0">${formatPercent(record.itd_rate_of_return)}</td>
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
  <title>${investorName} – Your Account Statement – ${reportDate}</title>
  <link href="https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700&display=swap" rel="stylesheet">
</head>
<body style="margin:0;padding:0;background-color:#f1f5f9;font-family:'Montserrat',Arial,sans-serif;">
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color:#f1f5f9;" bgcolor="#f1f5f9">
    <tr>
      <td align="center" style="padding:24px 12px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="max-width:600px;">
          <!-- Brand Header -->
          <tr>
            <td style="background-color:#edf0fe;padding:20px 24px;border-radius:10px 10px 0 0;" bgcolor="#edf0fe">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td valign="middle">
                    <img src="${LOGO_URL}" alt="Indigo Logo" height="24" style="display:block;border:0;height:24px;width:auto;">
                  </td>
                  <td valign="middle" align="right">
                    <h1 style="margin:0;font-size:22px;line-height:1.2;color:#0f172a;font-weight:700;">Your Account Statement</h1>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <!-- Investor Header -->
          <tr>
            <td style="background-color:#f8fafc;border-left:1px solid #e2e8f0;border-right:1px solid #e2e8f0;padding:20px 24px;" bgcolor="#f8fafc">
              <p style="margin:0 0 4px 0;font-size:16px;font-weight:600;color:#334155;">Investor: ${investorName}</p>
              <p style="margin:0;font-size:13px;line-height:1.5;color:#64748b;">
                Investor Statement for the Period Ended: <strong>${reportDate}</strong>
              </p>
            </td>
          </tr>
          <!-- Main Content -->
          <tr>
            <td style="padding:24px;background-color:#f8fafc;border-radius:0 0 10px 10px;border:1px solid #e2e8f0;border-top:0;" bgcolor="#f8fafc">
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
            <td style="padding:0 24px;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="text-align:center;padding-bottom:16px;">
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
                  <td style="text-align:center;font-size:12px;color:#64748b;line-height:1.5;">
                    <p style="margin:0 0 8px 0;">This report is confidential and intended solely for the named recipient.</p>
                    <p style="margin:0;">© ${currentYear} Indigo Fund. All rights reserved.</p>
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
