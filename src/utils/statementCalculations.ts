import { profileService } from "@/services/shared";
import { fundService } from "@/services/admin";
import { transactionsV2Service } from "@/services/investor";
import { StatementTransaction } from "@/types/domains/transaction";
import { getMonthEndDate } from "@/utils/dateUtils";
import { logError } from "@/lib/logger";
import { parseFinancial } from "@/utils/financial";
import Decimal from "decimal.js";
import { supabase } from "@/integrations/supabase/client";

// Re-export StatementTransaction as the canonical type for statement views
export type { StatementTransaction } from "@/types/domains/transaction";

export interface StatementData {
  investor_id: string;
  investor_name: string;
  investor_email: string;
  period_year: number;
  period_month: number;
  period_start: Date;
  period_end: Date;
  assets: AssetStatement[];
  summary: {
    begin_balance: number;
    additions: number;
    redemptions: number;
    net_income: number;
    fees: number;
    end_balance: number;
    rate_of_return_mtd: number;
    rate_of_return_qtd: number;
    rate_of_return_ytd: number;
    rate_of_return_itd: number;
  };
}

export interface AssetStatement {
  asset_id: number | string;
  asset_code: string;
  asset_name: string;
  begin_balance: number;
  deposits: number;
  withdrawals: number;
  interest: number;
  fees: number;
  end_balance: number;
  transactions: StatementTransaction[];
}

/**
 * Calculate Rate of Return using the correct formula:
 * net_income = ending_balance - beginning_balance - additions + redemptions
 * rate_of_return = net_income / beginning_balance (or 0 if beginning_balance is 0)
 *
 * This properly accounts for mid-month additions/withdrawals
 */
export function calculateRateOfReturn(
  beginningBalance: number,
  endingBalance: number,
  additions: number,
  redemptions: number
): { netIncome: number; rateOfReturn: number } {
  // CORRECT formula per December 20 requirements:
  // net_income = ending_balance - beginning_balance - additions + redemptions
  const netIncome = endingBalance - beginningBalance - additions + redemptions;

  // If beginning balance is 0, return 0% to avoid NaN/Infinity
  if (beginningBalance <= 0) {
    return { netIncome, rateOfReturn: 0 };
  }

  const rateOfReturn = (netIncome / beginningBalance) * 100;

  return { netIncome, rateOfReturn };
}

/**
 * Get reporting cutoff timestamps per asset for a given period.
 * Returns a map of asset_code -> created_at timestamp from the yield_distribution
 * that was used for reporting. Deposits/withdrawals created AFTER this timestamp
 * should be excluded from that period's report.
 */
async function getReportingCutoffs(
  periodYear: number,
  periodMonth: number
): Promise<Map<string, string>> {
  const cutoffMap = new Map<string, string>();

  // Use .match() to avoid deep type instantiation from chained .eq() calls
  const { data: distributions } = await supabase
    .from("yield_distributions")
    .select("id, created_at, fund_id")
    .match({ is_voided: false, period_year: periodYear, period_month: periodMonth });

  if (distributions && distributions.length > 0) {
    const fundIds = [...new Set(distributions.map((d: any) => d.fund_id))];

    const { data: fundsData } = await supabase
      .from("funds")
      .select("id, asset")
      .in("id", fundIds as string[]);

    const fundAssetMap = new Map(
      (fundsData ?? []).map((f: any) => [f.id, f.asset] as [string, string])
    );

    for (const dist of distributions) {
      const asset = fundAssetMap.get((dist as any).fund_id);
      if (asset && dist.created_at) {
        cutoffMap.set(asset, dist.created_at);
      }
    }
  }

  return cutoffMap;
}

/**
 * Deduplicate yield-related transactions by distribution_id.
 * When both 'transaction' and 'reporting' purpose records exist for the same
 * distribution_id, keep only the 'reporting' one (used for investor statements).
 * Non-yield transactions and yields without a distribution_id pass through unchanged.
 */
function deduplicateYieldTransactions(
  transactions: import("@/features/investor/transactions/services/transactionsV2Service").TransactionRecord[],
  yieldTypes: Set<string>
): import("@/features/investor/transactions/services/transactionsV2Service").TransactionRecord[] {
  // Group yield transactions by distribution_id
  const byDistId = new Map<string, typeof transactions>();
  const result: typeof transactions = [];

  for (const tx of transactions) {
    if (!yieldTypes.has(tx.type) || !tx.distribution_id) {
      result.push(tx);
      continue;
    }
    const group = byDistId.get(tx.distribution_id) || [];
    group.push(tx);
    byDistId.set(tx.distribution_id, group);
  }

  // For each distribution_id group, prefer 'reporting' over 'transaction'
  for (const [, group] of byDistId) {
    const hasReporting = group.some((tx) => tx.purpose === "reporting");
    if (hasReporting) {
      // Keep only reporting-purpose transactions from this group
      for (const tx of group) {
        if (tx.purpose === "reporting") {
          result.push(tx);
        }
      }
    } else {
      // No reporting records — keep all (fallback)
      for (const tx of group) {
        result.push(tx);
      }
    }
  }

  // Re-sort by tx_date ascending (groups may have been appended out of order)
  result.sort((a, b) => a.tx_date.localeCompare(b.tx_date));
  return result;
}

export async function computeStatement(
  investor_id: string,
  period_year: number,
  period_month: number
): Promise<StatementData | null> {
  try {
    // Get investor profile using profileService
    const investor = await profileService.getProfileById(investor_id);

    if (!investor) {
      logError("statementCalculations.computeStatement", new Error("Investor profile not found"), {
        investor_id,
      });
      return null;
    }

    const investorName =
      `${investor.first_name || ""} ${investor.last_name || ""}`.trim() || investor.email;

    // Calculate period dates
    const period_start = new Date(period_year, period_month - 1, 1);
    const period_end = new Date(period_year, period_month, 0, 23, 59, 59);
    const period_end_str = getMonthEndDate(period_year, period_month);

    // Fetch transactions and reporting cutoffs in parallel
    const [transactions, reportingCutoffs] = await Promise.all([
      transactionsV2Service.getByInvestorId(investor_id, {
        endDate: period_end_str,
      }),
      getReportingCutoffs(period_year, period_month),
    ]);

    // Reverse to get ascending order (service returns descending by default)
    transactions.reverse();

    // Deduplicate yield-related transactions by distribution_id.
    // When both 'transaction' and 'reporting' purpose yields exist for the same
    // distribution_id, keep only the 'reporting' one (used for statements).
    const YIELD_TYPES = new Set(["YIELD", "FEE_CREDIT", "IB_CREDIT"]);
    const deduped = deduplicateYieldTransactions(transactions, YIELD_TYPES);

    // Fetch funds information for asset mapping
    const funds = await fundService.getAllFunds();

    const fundMap = new Map(funds?.map((f) => [f.asset, f]));

    const assetsMap: Record<string, AssetStatement> = {};
    const summary = {
      begin_balance: 0,
      additions: 0,
      redemptions: 0,
      net_income: 0,
      fees: 0,
      end_balance: 0,
      rate_of_return_mtd: 0,
      rate_of_return_qtd: 0,
      rate_of_return_ytd: 0,
      rate_of_return_itd: 0,
    };

    // Decimal accumulators per asset -- avoids .toNumber() round-trips mid-pipeline
    const decAccum: Record<string, { begin: Decimal; deposits: Decimal; withdrawals: Decimal; interest: Decimal; fees: Decimal }> = {};

    // Process transactions (using deduplicated list)
    deduped.forEach((transaction) => {
      const assetCode = transaction.asset;

      // Skip post-reporting deposits/withdrawals:
      // If a reporting yield distribution exists for this asset+period,
      // exclude deposits/withdrawals created after the distribution's created_at
      const cutoff = reportingCutoffs.get(assetCode);
      if (
        cutoff &&
        (transaction.type === "DEPOSIT" || transaction.type === "WITHDRAWAL") &&
        (transaction as any).created_at > cutoff
      ) {
        return; // Skip this transaction — it was made after reporting
      }

      if (!assetsMap[assetCode]) {
        const fund = fundMap.get(assetCode) as any;
        assetsMap[assetCode] = {
          asset_id: fund ? fund.id : 0,
          asset_code: assetCode,
          asset_name: fund ? fund.name : assetCode,
          begin_balance: 0,
          deposits: 0,
          withdrawals: 0,
          interest: 0,
          fees: 0,
          end_balance: 0,
          transactions: [],
        };
      }

      const assetStat = assetsMap[assetCode];
      const txDate = new Date(transaction.tx_date);
      const amount = parseFinancial(transaction.amount);

      // Use Decimal accumulators to avoid .toNumber() mid-pipeline precision loss
      if (!decAccum[assetCode]) {
        decAccum[assetCode] = {
          begin: parseFinancial(0),
          deposits: parseFinancial(0),
          withdrawals: parseFinancial(0),
          interest: parseFinancial(0),
          fees: parseFinancial(0),
        };
      }
      const acc = decAccum[assetCode];

      // Identify if transaction is before this period (Beginning Balance)
      if (txDate < period_start) {
        if (transaction.type === "WITHDRAWAL" || transaction.type === "FEE") {
          acc.begin = acc.begin.minus(amount);
        } else {
          acc.begin = acc.begin.plus(amount);
        }
      } else {
        // Transaction is within this period
        let type: StatementTransaction["type"] = "deposit";
        if (transaction.type === "DEPOSIT") {
          acc.deposits = acc.deposits.plus(amount);
          type = "deposit";
        } else if (transaction.type === "WITHDRAWAL") {
          acc.withdrawals = acc.withdrawals.plus(amount);
          type = "withdrawal";
        } else if (
          transaction.type === "INTEREST" ||
          transaction.type === "YIELD" ||
          transaction.type === "FEE_CREDIT" ||
          transaction.type === "IB_CREDIT"
        ) {
          acc.interest = acc.interest.plus(amount);
          type = "interest";
        } else if (transaction.type === "FEE") {
          acc.fees = acc.fees.plus(amount);
          type = "fee";
        } else if (transaction.type === "ADJUSTMENT") {
          if (amount.gte(0)) {
            acc.deposits = acc.deposits.plus(amount);
          } else {
            acc.withdrawals = acc.withdrawals.plus(amount.abs());
          }
          type = "adjustment";
        }

        assetStat.transactions.push({
          id: transaction.id,
          date: transaction.tx_date,
          type,
          amount: amount.toFixed(10),
          description: transaction.notes || transaction.type,
        });
      }
    });

    // Flush Decimal accumulators to AssetStatement numbers (single conversion point)
    for (const [code, acc] of Object.entries(decAccum)) {
      const asset = assetsMap[code];
      if (!asset) continue;
      asset.begin_balance = acc.begin.toNumber();
      asset.deposits = acc.deposits.toNumber();
      asset.withdrawals = acc.withdrawals.toNumber();
      asset.interest = acc.interest.toNumber();
      asset.fees = acc.fees.toNumber();
      asset.end_balance = acc.begin
        .plus(acc.deposits)
        .minus(acc.withdrawals)
        .plus(acc.interest)
        .minus(acc.fees)
        .toNumber();
    }

    // Calculate summary from all assets using Decimal accumulators
    const assetKeys = Object.keys(assetsMap);
    if (assetKeys.length >= 1) {
      let totalBeginBalance = parseFinancial(0);
      let totalAdditions = parseFinancial(0);
      let totalRedemptions = parseFinancial(0);
      let totalFees = parseFinancial(0);
      let totalEndBalance = parseFinancial(0);

      for (const acc of Object.values(decAccum)) {
        totalBeginBalance = totalBeginBalance.plus(acc.begin);
        totalAdditions = totalAdditions.plus(acc.deposits);
        totalRedemptions = totalRedemptions.plus(acc.withdrawals);
        totalFees = totalFees.plus(acc.fees);
        totalEndBalance = totalEndBalance.plus(
          acc.begin.plus(acc.deposits).minus(acc.withdrawals).plus(acc.interest).minus(acc.fees)
        );
      }

      summary.begin_balance = totalBeginBalance.toNumber();
      summary.additions = totalAdditions.toNumber();
      summary.redemptions = totalRedemptions.toNumber();
      summary.fees = totalFees.toNumber();
      summary.end_balance = totalEndBalance.toNumber();

      // Calculate RoR using the CORRECT formula
      const { netIncome, rateOfReturn } = calculateRateOfReturn(
        totalBeginBalance.toNumber(),
        totalEndBalance.toNumber(),
        totalAdditions.toNumber(),
        totalRedemptions.toNumber()
      );

      summary.net_income = netIncome;
      summary.rate_of_return_mtd = rateOfReturn;
    }

    return {
      investor_id,
      investor_name: investorName,
      investor_email: investor.email,
      period_year,
      period_month,
      period_start,
      period_end,
      assets: Object.values(assetsMap),
      summary,
    };
  } catch (error) {
    logError("statementCalculations.computeStatement", error);
    return null;
  }
}

/**
 * Format amount in native tokens (not fiat currency)
 * @param amount - The token amount
 * @param asset - The asset symbol (BTC, ETH, USDT, SOL, XRP)
 * @param decimals - Number of decimal places (auto-determined by asset if not specified)
 */
export function formatTokenAmount(amount: number, asset?: string, decimals?: number): string {
  const assetDecimals = decimals ?? (asset === "BTC" ? 8 : asset === "ETH" ? 6 : 2);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: assetDecimals,
  }).format(amount);
  return asset ? `${formatted} ${asset}` : formatted;
}

export function formatPercent(value: number, decimals: number = 2): string {
  // Handle NaN/Infinity cases
  if (!Number.isFinite(value)) {
    return "0.00%";
  }
  return `${value.toFixed(decimals)}%`;
}
