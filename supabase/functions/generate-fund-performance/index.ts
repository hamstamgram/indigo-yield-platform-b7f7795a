import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import Decimal from "https://esm.sh/decimal.js@10.4.3";
import { checkAdminAccess, createAdminDeniedResponse } from "../_shared/admin-check.ts";
import { getCorsHeaders } from "../_shared/cors.ts";
import {
  generateMonthlyReportHtml,
  generateFundBlockHtml as generateFundBlockHtmlV2,
  extractAssetFromFundName,
} from "../_shared/monthly-report-template-v2.ts";

// Configure Decimal.js for financial precision
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

interface RequestBody {
  periodYear: number;
  periodMonth: number;
  investorId?: string;
}

/** Parse a value from the database into a Decimal. Handles string, number, null, undefined. */
function toDecimal(value: unknown): Decimal {
  if (value === null || value === undefined || value === "") return new Decimal(0);
  try {
    return new Decimal(String(value));
  } catch {
    return new Decimal(0);
  }
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
  endingBalance: Decimal,
  beginningBalance: Decimal,
  additions: Decimal,
  redemptions: Decimal
): { netIncome: Decimal; rateOfReturn: Decimal } {
  // CORRECT formula per audit requirements:
  const netIncome = endingBalance.minus(beginningBalance).minus(additions).plus(redemptions);

  // When no beginning balance, use additions as denominator (same approach as ITD)
  if (beginningBalance.lte(0)) {
    if (additions.gt(0)) {
      const rateOfReturn = netIncome.div(additions).times(100);
      return { netIncome, rateOfReturn };
    }
    return { netIncome, rateOfReturn: new Decimal(0) };
  }

  const rateOfReturn = netIncome.div(beginningBalance).times(100);
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

/** Round a Decimal to N decimal places using ROUND_HALF_UP */
function roundToDecimals(value: Decimal, decimals: number): number {
  return value.toDecimalPlaces(decimals, Decimal.ROUND_HALF_UP).toNumber();
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

    const { periodYear, periodMonth, investorId }: RequestBody = await req.json();

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
    const profilesQuery = supabase
      .from("profiles")
      .select("id, account_type, is_admin")
      .eq("is_admin", false);

    if (investorId) {
      profilesQuery.eq("id", investorId);
    }

    const { data: investorProfiles, error: investorProfilesError } = await profilesQuery;

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

    const snapshotBalances = new Map<string, Decimal>();
    for (const snap of snapshots || []) {
      const asset = fundAssetById.get((snap as any).fund_id);
      if (!asset) continue;
      snapshotBalances.set(
        `${(snap as any).investor_id}:${asset}`,
        toDecimal((snap as any).current_value)
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

    const priorEndingBalances = new Map<string, Decimal>();

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
        const bal = toDecimal((row as any).mtd_ending_balance);
        if (bal.gt(0)) {
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

    const sumBalanceUpTo = (txs: any[], beforeDate: Date): Decimal => {
      return txs
        .filter((tx: any) => new Date(tx.tx_date) <= beforeDate)
        .reduce((sum: Decimal, tx: any) => {
          const amount = toDecimal(tx.amount).abs();
          if (inflowTypes.has(tx.type)) return sum.plus(amount);
          if (outflowTypes.has(tx.type)) return sum.minus(amount);
          return sum;
        }, new Decimal(0));
    };

    // Strict "before" comparison for beginning balances: excludes transactions ON the date
    const sumBalanceBefore = (txs: any[], beforeDate: Date): Decimal => {
      return txs
        .filter((tx: any) => new Date(tx.tx_date) < beforeDate)
        .reduce((sum: Decimal, tx: any) => {
          const amount = toDecimal(tx.amount).abs();
          if (inflowTypes.has(tx.type)) return sum.plus(amount);
          if (outflowTypes.has(tx.type)) return sum.minus(amount);
          return sum;
        }, new Decimal(0));
    };

    const sumByType = (txs: any[], startDate: Date, endDate: Date, types: Set<string>): Decimal => {
      return txs
        .filter((tx: any) => {
          const txDate = new Date(tx.tx_date);
          return txDate > startDate && txDate <= endDate && types.has(tx.type);
        })
        .reduce((sum: Decimal, tx: any) => sum.plus(toDecimal(tx.amount).abs()), new Decimal(0));
    };

    const sumBalanceThrough = (txs: any[], endDate: Date): Decimal => {
      return txs
        .filter((tx: any) => new Date(tx.tx_date) <= endDate)
        .reduce((sum: Decimal, tx: any) => {
          const amount = toDecimal(tx.amount).abs();
          if (inflowTypes.has(tx.type)) return sum.plus(amount);
          if (outflowTypes.has(tx.type)) return sum.minus(amount);
          return sum;
        }, new Decimal(0));
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

      // Guard: skip investors whose first transaction is AFTER the period end
      // This prevents ghost reports (e.g., Sam Johnson getting September report
      // when he first invested in November)
      if (investorTxs.length > 0) {
        const firstTxDate = new Date(investorTxs[0].tx_date); // txs are ordered by tx_date asc
        if (firstTxDate > mtdEnd) {
          continue;
        }
      }

      // Prefer snapshot balances at period end; fallback to transaction-derived balance
      const endingBalance: Decimal =
        snapshotBalances.get(key) ??
        (investorTxs.length > 0 ? sumBalanceThrough(investorTxs, mtdEnd) : new Decimal(0));

      // ============= MTD CALCULATIONS =============
      // Use strict "before" for beginning balance: transactions ON the first day of the month
      // are additions, not part of the beginning balance
      let mtdBeginning = sumBalanceBefore(investorTxs, mtdStart);
      // Fallback: if tx-derived beginning is 0, use prior period ending balance
      if (mtdBeginning.isZero()) {
        const priorBal = priorEndingBalances.get(key);
        if (priorBal && priorBal.gt(0)) {
          mtdBeginning = priorBal;
        }
      }
      const mtdAdditions = sumByType(investorTxs, mtdStart, mtdEnd, additionTypes);
      const mtdRedemptions = sumByType(investorTxs, mtdStart, mtdEnd, redemptionTypes);

      // Guard: skip investors with zero activity AND zero balance
      // (This is the definitive fix for ghost reports like Sam Johnson)
      const epsilon = new Decimal("1e-10");
      if (
        mtdBeginning.abs().lt(epsilon) &&
        mtdAdditions.abs().lt(epsilon) &&
        mtdRedemptions.abs().lt(epsilon) &&
        endingBalance.abs().lt(epsilon)
      ) {
        continue;
      }

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
      const itdBeginning = new Decimal(0);
      const itdAdditions = sumByType(investorTxs, new Date(0), mtdEnd, additionTypes);
      const itdRedemptions = sumByType(investorTxs, new Date(0), mtdEnd, redemptionTypes);

      const itdMetrics = calculatePerformanceMetrics(
        endingBalance,
        itdBeginning,
        itdAdditions,
        itdRedemptions
      );

      // Special case for ITD: use total principal as denominator since beginning is 0
      const totalPrincipal = itdAdditions.minus(itdRedemptions);
      const itdRoR = totalPrincipal.gt(0)
        ? itdMetrics.netIncome.div(totalPrincipal).times(100)
        : new Decimal(0);

      // Use asset-specific decimal precision (BTC=8, ETH=4, stablecoins=2)
      const decimals = getAssetDecimals(fundAsset);
      const round = (v: Decimal) => roundToDecimals(v, decimals);
      const rorRound = (v: Decimal) => roundToDecimals(v, 2); // RoR always 2dp

      // Round component values first, then DERIVE net_income from rounded values
      // to guarantee: beginning + additions - redemptions + net_income = ending
      const mtdBeginR = round(mtdBeginning);
      const mtdAddR = round(mtdAdditions);
      const mtdRedR = round(mtdRedemptions);
      const mtdEndR = round(endingBalance);
      const mtdNetR = round(new Decimal(mtdEndR).minus(mtdBeginR).minus(mtdAddR).plus(mtdRedR));

      const qtdBeginR = round(qtdBeginning);
      const qtdAddR = round(qtdAdditions);
      const qtdRedR = round(qtdRedemptions);
      const qtdEndR = round(endingBalance);
      const qtdNetR = round(new Decimal(qtdEndR).minus(qtdBeginR).minus(qtdAddR).plus(qtdRedR));

      const ytdBeginR = round(ytdBeginning);
      const ytdAddR = round(ytdAdditions);
      const ytdRedR = round(ytdRedemptions);
      const ytdEndR = round(endingBalance);
      const ytdNetR = round(new Decimal(ytdEndR).minus(ytdBeginR).minus(ytdAddR).plus(ytdRedR));

      const itdBeginR = 0;
      const itdAddR = round(itdAdditions);
      const itdRedR = round(itdRedemptions);
      const itdEndR = round(endingBalance);
      const itdNetR = round(new Decimal(itdEndR).minus(itdBeginR).minus(itdAddR).plus(itdRedR));

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

    // Step 4b: Clean up stale records from prior runs (skip for single-investor mode)
    if (!investorId) {
      const generatedKeys = new Set(
        performanceRecords.map((r: any) => `${r.investor_id}:${r.fund_name}`)
      );

      const { data: existingRecords } = await supabase
        .from("investor_fund_performance")
        .select("id, investor_id, fund_name")
        .eq("period_id", periodId)
        .eq("purpose", "reporting");

      const staleIds = (existingRecords || [])
        .filter((r: any) => !generatedKeys.has(`${r.investor_id}:${r.fund_name}`))
        .map((r: any) => r.id);

      if (staleIds.length > 0) {
        const { error: cleanupError } = await supabase
          .from("investor_fund_performance")
          .delete()
          .in("id", staleIds);

        if (cleanupError) {
          console.error("Stale record cleanup error:", cleanupError);
        } else {
          console.log(`Cleaned up ${staleIds.length} stale performance records`);
        }
      }
    }

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

      // Build fund blocks using V2 template
      const fundNames: string[] = [];
      const fundBlocks = records.map((record) => {
        fundNames.push(record.fund_name);
        const asset = extractAssetFromFundName(record.fund_name);

        return generateFundBlockHtmlV2({
          fundName: record.fund_name,
          asset,
          mtdBeginning: record.mtd_beginning_balance,
          qtdBeginning: record.qtd_beginning_balance,
          ytdBeginning: record.ytd_beginning_balance,
          itdBeginning: record.itd_beginning_balance,
          mtdAdditions: record.mtd_additions,
          qtdAdditions: record.qtd_additions,
          ytdAdditions: record.ytd_additions,
          itdAdditions: record.itd_additions,
          mtdRedemptions: record.mtd_redemptions,
          qtdRedemptions: record.qtd_redemptions,
          ytdRedemptions: record.ytd_redemptions,
          itdRedemptions: record.itd_redemptions,
          mtdNetIncome: record.mtd_net_income,
          qtdNetIncome: record.qtd_net_income,
          ytdNetIncome: record.ytd_net_income,
          itdNetIncome: record.itd_net_income,
          mtdEnding: record.mtd_ending_balance,
          qtdEnding: record.qtd_ending_balance,
          ytdEnding: record.ytd_ending_balance,
          itdEnding: record.itd_ending_balance,
          mtdRor: record.mtd_rate_of_return,
          qtdRor: record.qtd_rate_of_return,
          ytdRor: record.ytd_rate_of_return,
          itdRor: record.itd_rate_of_return,
        });
      });

      // Generate full HTML statement using V2 template
      const htmlContent = generateMonthlyReportHtml({
        investorName,
        periodEndedLong: reportDate,
        fundBlocks,
      });

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

// Helper functions for report date formatting

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
